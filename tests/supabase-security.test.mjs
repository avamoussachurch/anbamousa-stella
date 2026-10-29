import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('clean-install schema and additive hardening migration contain the same security block', async () => {
  const marker = '-- BEGIN PHASE 4 SECURITY HARDENING';
  const [schema, migration] = await Promise.all([
    read('supabase_schema.sql'),
    read('scripts/migrations/phase4_security_hardening.sql')
  ]);
  assert.notEqual(schema.indexOf(marker), -1);
  assert.notEqual(migration.indexOf(marker), -1);
  assert.equal(
    schema.slice(schema.indexOf(marker)).trimEnd(),
    migration.slice(migration.indexOf(marker)).trimEnd()
  );
});

test('SQL hardening provisions elevated roles and family links only through service role', async () => {
  const migration = await read('scripts/migrations/phase4_security_hardening.sql');
  assert.match(migration, /auth\.role\(\)\s+IS DISTINCT FROM\s+'service_role'/);
  assert.match(migration, /role\s*=\s*'student'/);
  assert.match(migration, /verified_at\s+IS NOT NULL/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.provision_profile_role\(UUID, TEXT\) TO service_role/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.provision_profile_role\(UUID, TEXT\) FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /REVOKE ALL PRIVILEGES ON TABLE public\.lesson_progress FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT UPDATE \(status\) ON TABLE public\.reward_requests TO authenticated/);
  assert.match(migration, /verified_at IS NOT NULL/);
});

test('lesson publishing and grade changes cannot bypass trusted authorization', async () => {
  const [migration, checks, churchYearService] = await Promise.all([
    read('scripts/migrations/phase4_security_hardening.sql'),
    read('scripts/migrations/phase4_security_hardening_checks.sql'),
    read('src/lib/churchYearService.ts')
  ]);
  assert.match(migration, /'publish_lesson_version'/);
  assert.match(migration, /REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /CREATE POLICY quiz_attempts_select_policy/);
  assert.match(migration, /DROP POLICY %I ON %I\.%I/);
  assert.match(checks, /privileged lesson approval or publishing RPC/);
  assert.match(checks, /Lesson-version policies require explicit review/);
  assert.doesNotMatch(churchYearService, /\.from\('profiles'\)\s*\.update\(\{\s*grade/);
});

test('lesson progress and point persistence use only the trusted completion RPC', async () => {
  const [migration, checks, server, progressService, quizService, database, authContext] = await Promise.all([
    read('scripts/migrations/phase4_security_hardening.sql'),
    read('scripts/migrations/phase4_security_hardening_checks.sql'),
    read('server.ts'),
    read('src/lib/studentProgressService.ts'),
    read('src/lib/studentQuizService.ts'),
    read('src/lib/supabaseDatabase.ts'),
    read('src/context/AuthContext.tsx')
  ]);
  const completionRoute = server.slice(
    server.indexOf('async function persistLessonCompletion'),
    server.indexOf('// 4b. Record School Learning Activity')
  );
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.record_lesson_completion/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.record_lesson_completion\(UUID, UUID, TIMESTAMPTZ\) TO service_role/);
  assert.match(migration, /v_points_awarded := 50/);
  assert.match(checks, /record_lesson_completion\(uuid,uuid,timestamp with time zone\)/);
  assert.match(server, /trustedClient\.rpc\('record_lesson_completion'/);
  assert.match(server, /SUPABASE_SECRET_KEY \|\| process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(completionRoute, /\.from\('profiles'\)\.update\(\{[\s\S]{0,150}?points:/);
  assert.doesNotMatch(progressService, /\.from\('lesson_progress'\)\s*\.upsert/);
  assert.doesNotMatch(quizService, /\.from\('lesson_progress'\)\s*\.upsert/);
  assert.doesNotMatch(database, /\.from\('lesson_progress'\)\s*\.upsert/);
  assert.doesNotMatch(database, /\.from\('profiles'\)\s*\.update\(\{\s*points/);
  assert.match(authContext, /Points can only be changed by a server-verified lesson completion/);
});

test('client-facing privileged checks do not trust user-editable auth metadata', async () => {
  const files = [
    'src/context/AuthContext.tsx',
    'src/lib/supabaseAuth.ts',
    'src/lib/churchYearService.ts',
    'src/lib/evidenceMapService.ts',
    'src/lib/lessonAuthoringService.ts',
    'src/lib/lessonGenerationService.ts',
    'src/lib/lessonReviewService.ts',
    'src/lib/lessonSourceService.ts'
  ];
  for (const file of files) {
    assert.doesNotMatch(await read(file), /(?:user_metadata|app_metadata)\??\.role/);
  }
});

test('deterministic test tokens are never accepted in production', async () => {
  const server = await read('server.ts');
  assert.match(
    server,
    /process\.env\.NODE_ENV\s*!==\s*['"]production['"]\s*&&\s*\(token\.startsWith\(["']test_jwt_["']\)\s*\|\|\s*token\.startsWith\(["']test_token_["']\)\)/
  );
});

test('read-only SQL verification checks forbidden writes and trusted grants', async () => {
  const checks = await read('scripts/migrations/phase4_security_hardening_checks.sql');
  assert.match(checks, /profiles.*role.*UPDATE/s);
  assert.match(checks, /lesson_progress.*INSERT/s);
  assert.match(checks, /user_relationships.*INSERT/s);
  assert.match(checks, /provision_profile_role/);
});
