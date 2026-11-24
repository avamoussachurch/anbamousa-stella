import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const pointsTab = readFileSync(new URL('./PointsTab.tsx', import.meta.url), 'utf8');
const achievementStudio = readFileSync(new URL('../achievements/AchievementRewardsStudio.tsx', import.meta.url), 'utf8');

test('Points Bazaar submits an approval request without deducting points up front', () => {
  assert.match(pointsTab, /submitRewardRequest\(/);
  assert.match(pointsTab, /awaiting parent approval/i);
  assert.doesNotMatch(pointsTab, /addPoints\(-cost\)/);
});

test('Points Bazaar does not create fake local reward approvals', () => {
  assert.doesNotMatch(pointsTab, /addRewardRequest\(/);
  assert.doesNotMatch(pointsTab, /saveRewardPurchaseLocal\(/);
});

test('Points Bazaar does not present the disabled Coming Soon overlay', () => {
  assert.doesNotMatch(pointsTab, /Coming Soon!!/);
  assert.match(achievementStudio, /Request reward/);
});
