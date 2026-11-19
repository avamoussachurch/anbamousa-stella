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
