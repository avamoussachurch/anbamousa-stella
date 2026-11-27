import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('prayer streak is calculated independently from persisted Agpeya days', async () => {
  const database = await read('../src/lib/supabaseDatabase.ts');
  const agpeya = await read('../src/components/agpeya/AgpeyaPrayerTab.tsx');

  assert.match(database, /getPrayerStreakFromSupabase/);
  assert.match(database, /completedHours || hasPersonalPrayer/);
  assert.match(database, /calculateCairoStreak\(qualifyingDays\)/);
  assert.match(database, /const pageSize = 1000/);
  assert.match(database, /\.range\(offset, offset \+ pageSize - 1\)/);
  assert.match(database, /historyRows\.push\(\.\.\.rows\)/);
  assert.match(database, /if \(rows\.length < pageSize\) break/);
  assert.match(agpeya, /getPrayerStreakFromSupabase\(userData\.id\)/);
  assert.match(agpeya, /const \[streakDays, setStreakDays\] = useState<number>\(0\)/);
  assert.doesNotMatch(agpeya, /useState<number>\(4\)/);
});

test('Agpeya daily records use Cairo calendar dates, not UTC date slicing', async () => {
  const agpeya = await read('../src/components/agpeya/AgpeyaPrayerTab.tsx');

  assert.match(agpeya, /getCairoDateString/);
  assert.doesNotMatch(agpeya, /new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/);
});

test('prayer activity only qualifies from a completed hour or a non-empty saved personal prayer', async () => {
  const database = await read('../src/lib/supabaseDatabase.ts');

  assert.match(database, /Object\.values\(row\.completed_hours\)\.some\(Boolean\)/);
  assert.match(database, /row\.personal_prayer\.trim\(\)\.length > 0/);
  assert.match(database, /return completedHours \|\| hasPersonalPrayer/);
});

test('workspace transitions are perceptible without overriding reduced-motion preferences', async () => {
  const app = await read('../src/App.tsx');

  assert.match(app, /useReducedMotion/);
  assert.match(app, /y: \[tabTransitionTick % 2 === 0 \? 18 : -18, 0\]/);
  assert.match(app, /scale: \[0\.985, 1\]/);
  assert.match(app, /stiffness: 280, damping: 28/);
  assert.match(app, /reduceMotion\s*\?\s*\{ duration: 0 \}/);
});

test('Agpeya writes require Supabase confirmation before caching or awarding prayer points', async () => {
  const database = await read('../src/lib/supabaseDatabase.ts');
  const agpeya = await read('../src/components/agpeya/AgpeyaPrayerTab.tsx');
  const migration = await read('../supabase/migrations/20261119125625_create_secure_agpeya_prayers.sql');
  const writeGuard = await read('../supabase/migrations/20261119131043_limit_agpeya_writes_to_current_cairo_day.sql');

  assert.match(database, /if \(prayerErr\) \{\s*return \{ success: false/);
  assert.match(database, /if \(prayerErr\)[\s\S]*?cacheConfirmedRecord\(\);\s*return \{ success: true/);
  assert.match(database, /Supabase is configured but its client is unavailable/);
  assert.match(agpeya, /setCompletedHoursToday\(previousHours\)/);
  assert.match(agpeya, /isNowCompleted && userData && saveConfirmed/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /auth\.uid\(\)\) = user_id/);
  assert.doesNotMatch(migration, /to anon/i);
  assert.match(writeGuard, /Africa\/Cairo/);
  assert.match(writeGuard, /completed_hours - ARRAY\['prime','terce','sext','none','vespers','compline','midnight'\]/);
  assert.match(writeGuard, /jsonb_path_exists\(completed_hours/);
});
