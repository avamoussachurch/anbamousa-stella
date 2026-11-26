import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Cairo-day active time is persisted and shown to parents', () => {
  const auth = read('../src/context/AuthContext.tsx');
  const database = read('../src/lib/supabaseDatabase.ts');
  const server = read('../server.ts');
  const parentHome = read('../src/components/parent/ParentHomeDashboard.tsx');
  assert.match(auth, /screen_time_today_seconds:\s*nextDailySeconds/);
  assert.match(auth, /screen_time_date:\s*cairoDate/);
  assert.match(database, /dbPayload\.screen_time_today_seconds\s*=\s*updates\.screen_time_today_seconds/);
  assert.match(database, /dbPayload\.screen_time_date\s*=\s*updates\.screen_time_date/);
  assert.match(server, /screen_time_today_seconds/);
  assert.match(parentHome, /formatActiveTime\(child\.screenTimeTodayMinutes/);
});

test('achievement seals use distinct item slugs and the live cosmetic preview', () => {
  const seals = read('../src/components/design-system/CopticAchievementSeal.tsx');
  const store = read('../src/components/profile/ProfileCustomizationStudio.tsx');
  const achievements = read('../src/components/achievements/AchievementRewardsStudio.tsx');
  assert.match(seals, /SYMBOL_BY_KEY/);
  for (const slug of ['present-heart','community-light','first-hymn','lesson-master','prayer-seven','quiz-champion','taxis-practitioner']) {
    assert.ok(seals.includes("'" + slug + "'"), 'Missing unique achievement artwork mapping: ' + slug);
  }
  assert.match(store, /profile_cosmetic_unlocks/);
  assert.match(store, /purchase_profile_cosmetic/);
  assert.match(store, /previewItemId/);
  assert.match(store, /ProfileFrameOverlay/);
  assert.match(store, /ProfileEffectOverlay/);
  assert.match(achievements, /CopticAchievementSeal/);
});
