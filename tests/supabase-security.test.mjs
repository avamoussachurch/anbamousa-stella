import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('clean-install schema and additive hardening migration contain the same security block', async () => {
  const marker = '-- BEGIN PHASE 4 SECURITY HARDENING';
  const multiRoleMarker = '-- Phase 13: normalized multi-role accounts and audited role changes.';
  const [schema, migration] = await Promise.all([
    read('supabase_schema.sql'),
    read('scripts/migrations/phase4_security_hardening.sql')
  ]);
  assert.notEqual(schema.indexOf(marker), -1);
  assert.notEqual(migration.indexOf(marker), -1);
  assert.equal(
    schema.slice(schema.indexOf(marker), schema.indexOf(multiRoleMarker)).replace(/\r\n/g, '\n').trimEnd(),
    migration.slice(migration.indexOf(marker)).replace(/\r\n/g, '\n').trimEnd()
  );
});

test('multi-role clean-install schema matches additive migration and enforces trusted role changes', async () => {
  const [schema, migration] = await Promise.all([
    read('supabase_schema.sql'),
    read('scripts/migrations/phase13_multi_role_accounts.sql')
  ]);
  const marker = '-- Phase 13: normalized multi-role accounts and audited role changes.';
  assert.notEqual(schema.indexOf(marker), -1);
  const phase14Marker = '-- Phase 14: append-only audit history for administrative and support actions.';
  assert.equal(
    schema.slice(schema.indexOf(marker), schema.indexOf(phase14Marker, schema.indexOf(marker))).replace(/\r\n/g, '\n').trimEnd(),
    migration.replace(/\r\n/g, '\n').trimEnd()
  );
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS profile_role_assignments_one_active_role/);
  assert.match(migration, /SELECT p\.id, p\.role, 'backfill'/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.role_promotion_requests/);
  assert.match(migration, /requested_role TEXT NOT NULL CHECK \(requested_role IN \('student', 'parent', 'teacher'\)\)/);
  assert.match(migration, /auth\.role\(\) IS DISTINCT FROM 'authenticated'/);
  assert.match(migration, /auth\.role\(\) IS DISTINCT FROM 'service_role'/);
  assert.match(migration, /v_request\.requester_id = p_actor_id/);
  assert.match(migration, /The last active admin role cannot be revoked/);
  assert.match(migration, /The last active admin account cannot be deleted/);
  assert.match(migration, /CREATE TRIGGER guard_last_admin_profile_delete/);
  assert.match(migration, /Administrators cannot change their own role assignments/);
  assert.match(migration, /CREATE TRIGGER role_change_audit_immutable/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.request_role_promotion\(TEXT, TEXT\) TO authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.manage_profile_role\(UUID, TEXT, TEXT, UUID, TEXT\) TO service_role/);
  assert.doesNotMatch(migration, /GRANT EXECUTE ON FUNCTION public\.grant_profile_role_internal/);
});

test('admin action audit schema is append-only, RLS protected, and matches clean install', async () => {
  const [schema, migration] = await Promise.all([
    read('supabase_schema.sql'),
    read('scripts/migrations/phase14_admin_action_audit.sql')
  ]);
  const marker = '-- Phase 14: append-only audit history for administrative and support actions.';
  assert.notEqual(schema.indexOf(marker), -1);
  const schemaBlock = schema.slice(schema.indexOf(marker) + marker.length).replace(/\r\n/g, '\n').trim();
  const migrationBlock = migration
    .slice(migration.indexOf('CREATE TABLE IF NOT EXISTS public.admin_action_audit'))
    .replace(/\nCOMMIT;\s*$/, '')
    .replace(/\r\n/g, '\n')
    .trim();
  assert.equal(schemaBlock, migrationBlock);
  assert.match(migration, /actor_id UUID NOT NULL/);
  assert.match(migration, /target_user_id UUID/);
  assert.match(migration, /operation TEXT NOT NULL/);
  assert.match(migration, /details JSONB NOT NULL/);
  assert.match(migration, /ALTER TABLE public\.admin_action_audit ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.admin_action_audit FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /CREATE TRIGGER admin_action_audit_immutable/);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON public\.admin_action_audit/);
});

test('admin class management RPCs authorize assigned roles and preserve roster history', async () => {
  const [schema, migration] = await Promise.all([
    read('supabase_schema.sql'),
    read('scripts/migrations/phase15_admin_class_role_authorization.sql')
  ]);
  for (const sql of [schema, migration]) {
    const enrollStart = sql.lastIndexOf('CREATE OR REPLACE FUNCTION public.enroll_student_in_class');
    const removeStart = sql.lastIndexOf('CREATE OR REPLACE FUNCTION public.remove_student_from_class');
    assert.notEqual(enrollStart, -1);
    assert.notEqual(removeStart, -1);
    const enroll = sql.slice(enrollStart, removeStart);
    const remove = sql.slice(removeStart, sql.indexOf('$$;', removeStart) + 3);
    assert.match(enroll, /profile_role_assignments/);
    assert.match(enroll, /ra\.role = 'admin'/);
    assert.match(enroll, /ra\.role = 'teacher'/);
    assert.match(enroll, /ra\.role = 'student'/);
    assert.doesNotMatch(enroll, /SELECT role INTO v_caller_role FROM public\.profiles/);
    assert.match(enroll, /v_class_group_id = 'primary_2'/);
    assert.match(remove, /profile_role_assignments/);
    assert.match(remove, /ra\.role = 'admin'/);
    assert.match(remove, /ra\.role = 'teacher'/);
    assert.doesNotMatch(remove, /SELECT role INTO v_caller_role FROM public\.profiles/);
    assert.match(remove, /SET status = 'inactive'/);
    assert.match(remove, /removal_reason/);
  }
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

test('scheduled publishing migration replaces legacy profile-role checks with assigned-role checks', async () => {
  const migration = await read('scripts/migrations/phase16_curriculum_operations_multi_role.sql');
  for (const functionName of [
    'publish_lesson_version_immediately',
    'schedule_lesson_publication',
    'reschedule_lesson_publication',
    'cancel_lesson_publication',
    'list_lesson_publications',
    'process_due_lesson_publications'
  ]) {
    assert.match(migration, new RegExp(`pg_get_functiondef\\([\\s\\S]*?${functionName}`));
  }
  assert.equal((migration.match(/public\.profile_role_assignments ra/g) || []).length, 12);
  assert.match(migration, /ra\.role = ''admin'' AND ra\.revoked_at IS NULL/);
  assert.match(migration, /ra\.role = ''teacher'' AND ra\.revoked_at IS NULL/);
  assert.match(migration, /IF v_definition = v_original THEN/);
  assert.match(migration, /Phase 11 and Phase 13/);
});

test('assigned-role authorization migration hardens database policies and preserves scoped access', async () => {
  const [migration, verification] = await Promise.all([
    read('scripts/migrations/phase17_assigned_role_authorization.sql'),
    read('scripts/migrations/phase17_assigned_role_authorization_verify.sql')
  ]);
  for (const helper of [
    'is_church_admin',
    'is_church_servant_or_admin',
    'get_current_student_level',
    'can_access_student_data',
    'can_read_profile'
  ]) {
    assert.match(migration, new RegExp(`FUNCTION public\\.${helper}`));
  }
  for (const legacyAuthorization of [
    'profiles\\.role',
    'p\\.role =',
    'p\\.role IN',
    'SELECT role INTO v_caller_role FROM public\\.profiles'
  ]) {
    assert.doesNotMatch(migration, new RegExp(legacyAuthorization));
  }
  assert.match(migration, /profile_role_assignments AS assigned_role/);
  assert.match(migration, /public\.has_role\('student'\)/);
  assert.match(migration, /public\.has_role\('teacher'\)/);
  assert.match(migration, /public\.has_role\('admin'\)/);
  assert.match(migration, /CREATE POLICY hymns_select_assigned_level/);
  assert.match(migration, /CREATE POLICY taxis_items_select_assigned_level/);
  assert.match(migration, /verified_at IS NOT NULL/);
  assert.match(migration, /sca\.is_active = true/);
  assert.match(migration, /cy\.is_active = true/);
  assert.match(migration, /cm\.status = 'active'/);
  assert.match(migration, /public\.has_role\('teacher'\)\s+AND EXISTS/);
  assert.match(migration, /Phase 17 could not identify/);
  assert.match(verification, /authorization functions no longer read profiles\.role/);
  assert.match(verification, /role assignment writes unavailable to browser roles/);
});

test('Phase 17 curriculum prerequisites exist in clean schema and preserve safe role-scoped access', async () => {
  const [schema, migration, phase17, inspect, verify] = await Promise.all([
    read('supabase_schema.sql'),
    read('scripts/migrations/phase17_curriculum_table_prerequisites.sql'),
    read('scripts/migrations/phase17_assigned_role_authorization.sql'),
    read('scripts/migrations/phase17_curriculum_table_prerequisites_inspect.sql'),
    read('scripts/migrations/phase17_curriculum_table_prerequisites_verify.sql')
  ]);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS public\.hymns/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS public\.coptic_taxis_items[\s\S]*?level INTEGER CHECK \(level IN \(1, 2, 3\)\)/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.hymns/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.coptic_taxis_items/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS level INTEGER/);
  assert.match(migration, /public\.has_role\('student'\)/);
  assert.match(migration, /public\.has_role\('teacher'\)/);
  assert.match(migration, /public\.has_role\('admin'\)/);
  assert.match(migration, /REVOKE ALL PRIVILEGES ON TABLE public\.hymns FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /REVOKE ALL PRIVILEGES ON TABLE public\.coptic_taxis_items FROM PUBLIC, anon, authenticated/);
  assert.match(phase17, /phase17_curriculum_table_prerequisites\.sql/);
  assert.match(phase17, /DROP POLICY IF EXISTS "Public read level 1 hymns"/);
  assert.match(phase17, /OR public\.has_role\('teacher'\)\s+OR public\.has_role\('admin'\)/);
  assert.match(inspect, /pg_catalog\.pg_policies/);
  assert.match(verify, /Both curriculum tables have RLS enabled/);
});

test('servant student preview cannot submit quizzes or award simulated points', async () => {
  const [preview, quiz] = await Promise.all([
    read('src/components/teacher/StudentExperiencePreview.tsx'),
    read('src/components/sunday-school/student/SundaySchoolQuizView.tsx')
  ]);
  assert.match(quiz, /if \(previewMode \|\| isSubmitting \|\| isSubmitted\) return/);
  assert.match(quiz, /disabled=\{previewMode \|\| isSubmitting\}/);
  assert.doesNotMatch(preview, /createLocalPreviewQuizAttempt|simulatedPoints|awardedPoints/);
  assert.match(preview, /Quiz submissions are disabled in preview mode/);
  assert.match(preview, /Student achievement records are not loaded or changed in preview mode/);
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
