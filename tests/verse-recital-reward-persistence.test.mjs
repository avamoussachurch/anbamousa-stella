import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('verse recital rewards are persisted once per student per Cairo day by a trusted server function', async () => {
  const migration = await read('../supabase/migrations/20261127165428_verified_verse_recital_daily_rewards.sql');
  const server = await read('../server.ts');
  const start = server.indexOf('app.post("/api/verify-verse-recital"');
  const end = server.indexOf('// ==============================================================================\n// HYMNS SCHOOL', start);
  const route = server.slice(start, end);
  const client = await read('../src/components/student/VerseRecitalModal.tsx');

  assert.match(migration, /primary key \(student_id, activity_date\)/);
  assert.match(migration, /where student_id = p_student_id[\s\S]*and activity_date = p_activity_date[\s\S]*and passed = false/);
  assert.match(migration, /on conflict \(student_id, activity_date\) do nothing/);
  assert.match(migration, /set points = coalesce\(points, 0\) \+ v_points_awarded/);
  assert.match(migration, /grant execute on function public\.record_verse_recital_daily_result[\s\S]*to service_role/i);
  assert.match(migration, /revoke all on function public\.record_verse_recital_daily_result[\s\S]*from public, anon, authenticated/i);

  assert.match(route, /hasServerRole\(authContext, 'student'\)/);
  assert.match(route, /p_activity_date: getCairoDateString\(\)/);
  assert.match(route, /record_verse_recital_daily_result/);
  assert.match(route, /pointsAwarded = Number\(reward\?\.pointsAwarded \|\| 0\)/);

  assert.match(client, /formData\.append\('verseReference'/);
  assert.match(client, /syncAuthoritativeProgress\(/);
  assert.match(client, /evalData\.pointsAwarded = Number\(responseData\.pointsAwarded \|\| 0\)/);
  assert.doesNotMatch(client, /awardPoints/);
});
