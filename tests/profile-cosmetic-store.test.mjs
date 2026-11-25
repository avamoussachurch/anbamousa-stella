import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const studio = await readFile(new URL('../src/components/profile/ProfileCustomizationStudio.tsx', import.meta.url), 'utf8');
const directory = await readFile(new URL('../src/components/student/FeedPeopleDirectory.tsx', import.meta.url), 'utf8');

test('profile cosmetics use database inventory and secure purchase/equip RPCs', () => {
  assert.match(studio, /profile_cosmetic_catalog/);
  assert.match(studio, /profile_cosmetic_unlocks/);
  assert.match(studio, /purchase_profile_cosmetic/);
  assert.match(studio, /equip_profile_cosmetic/);
  assert.match(studio, /unequip_profile_cosmetic/);
  assert.match(studio, /equipped_cosmetics/);
});

test('public people directory reads the privacy-scoped v3 profile projection', () => {
  assert.match(directory, /get_profile_directory_v3/);
  assert.match(directory, /earned_badges/);
  assert.match(directory, /equipped_cosmetics/);
  assert.doesNotMatch(directory, /\.from\(['"]profiles['"]\)/);
});
