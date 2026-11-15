import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  shouldLoadCloudRewardPurchases,
  shouldPersistRewardRequestToCloud
} from './rewardPersistence';

test('guest reward activity never calls Supabase', () => {
  assert.equal(shouldPersistRewardRequestToCloud(true, true), false);
  assert.equal(shouldLoadCloudRewardPurchases(true, true, true), false);
});

test('authenticated reward activity uses Supabase when configured', () => {
  assert.equal(shouldPersistRewardRequestToCloud(false, true), true);
  assert.equal(shouldLoadCloudRewardPurchases(false, true, true), true);
});

test('reward history does not fetch outside the reward store or without Supabase', () => {
  assert.equal(shouldLoadCloudRewardPurchases(false, false, true), false);
  assert.equal(shouldLoadCloudRewardPurchases(false, true, false), false);
});
