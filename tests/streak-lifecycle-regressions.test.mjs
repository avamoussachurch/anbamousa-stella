import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { calculateCairoStreak, getCairoDateString, getPreviousCairoDay } from '../src/lib/cairoTime.ts';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('a lapsed current streak resets while the historical longest streak survives', () => {
  const today = getCairoDateString();
  const yesterday = getPreviousCairoDay(today);
  const twoDaysAgo = getPreviousCairoDay(yesterday);
  const threeDaysAgo = getPreviousCairoDay(twoDaysAgo);
  const fourDaysAgo = getPreviousCairoDay(threeDaysAgo);

  const result = calculateCairoStreak([fourDaysAgo, threeDaysAgo]);

  assert.equal(result.currentStreak, 0);
  assert.equal(result.longestStreak, 2);
  assert.equal(result.isActiveToday, false);
});

test('returning after a missed day starts a new current streak without erasing the record', () => {
  const today = getCairoDateString();
  const yesterday = getPreviousCairoDay(today);
  const twoDaysAgo = getPreviousCairoDay(yesterday);
  const threeDaysAgo = getPreviousCairoDay(twoDaysAgo);
  const fourDaysAgo = getPreviousCairoDay(threeDaysAgo);

  const result = calculateCairoStreak([fourDaysAgo, threeDaysAgo, today]);

  assert.equal(result.currentStreak, 1);
  assert.equal(result.longestStreak, 2);
  assert.equal(result.isActiveToday, true);
});

test('multiple qualifying activities on one Cairo day count as one streak day', () => {
  const today = getCairoDateString();
  const result = calculateCairoStreak([today, today, today]);

  assert.equal(result.currentStreak, 1);
  assert.equal(result.longestStreak, 1);
});

test('server summaries derive current streak from durable activity dates, not stale profile current_streak', async () => {
  const server = await read('../server.ts');

  assert.match(server, /from\('student_activity_days'\)/);
  assert.match(server, /const currentStreak = streak\.currentStreak;/);
  assert.match(server, /const longestStreak = Math\.max\([\s\S]*?profile\.longest_streak/);
  assert.doesNotMatch(server, /Math\.max\(streak\.currentStreak,[\s\S]{0,180}profile\.current_streak/);
  assert.match(server, /persistStudentActivityDay\(targetStudentId/);
  assert.match(server, /persistStudentActivityDay\(targetStudentId, newAttempt\.submittedAt\)/);
  assert.match(server, /loadPersistedStudentStreak\(targetStudentId\)/);
  assert.doesNotMatch(server, /Math\.max\(calc\.currentStreak, streakRecord\.currentStreak\)/);
});

test('the activity-day ledger is server-only and longest streak is monotonic', async () => {
  const migration = await read('../supabase/migrations/20261118162850_persist_student_activity_days_and_fix_streak_lifecycle.sql');

  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.student_activity_days FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT ALL ON TABLE public\.student_activity_days TO service_role/);
  assert.match(migration, /longest_streak = GREATEST\(COALESCE\(longest_streak, 0\), v_longest, v_current, 0\)/);
  assert.match(migration, /cron\.schedule/);

  const indexCleanup = await read('../supabase/migrations/20261118163623_drop_redundant_student_activity_days_date_index.sql');
  assert.match(indexCleanup, /DROP INDEX IF EXISTS public\.student_activity_days_activity_date_idx/);
});

test('guest streak state allows a zero current streak while retaining longest streak', async () => {
  const auth = await read('../src/context/AuthContext.tsx');
  const points = await read('../src/lib/pointsService.ts');

  assert.match(auth, /const nextCurrent = Math\.max\(0, currentStreak\)/);
  assert.match(auth, /Math\.max\(nextCurrent, userData\.longestStreak \?\? 0, longestStreak \?\? 0\)/);
  assert.match(points, /const userStreak = Math\.max\(0, currentUser\.currentStreak \?\? 0\)/);

  const lessonView = await read('../src/components/student/LessonView.tsx');
  assert.match(lessonView, /const serverCurrentStreak = res\.streak\?\.currentStreak;[\s\S]*?typeof serverCurrentStreak === 'number'[\s\S]*?Math\.max\(0, serverCurrentStreak\)/);
  assert.doesNotMatch(lessonView, /res\.streak\?\.currentStreak && res\.streak\.currentStreak > 0/);
});
