import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const migration = await readFile(new URL('../supabase/migrations/20261125183844_attainable_category_milestones.sql', import.meta.url), 'utf8');
const communityMigration = await readFile(new URL('../supabase/migrations/20261125202000_gamify_community_and_profile_actions.sql', import.meta.url), 'utf8');

test('category milestone thresholds do not exceed the badge inventory', () => {
  assert.match(migration, /category = 'service'/);
  for (const category of ['attendance','community','consistency','quizzes','prayer','taxis','hymns','learning']) {
    assert.match(migration, new RegExp("category (?:in \\([^)]*" + category + "|= '" + category + "')"));
  }
  assert.match(migration, /badge_count = 7 where category = 'learning' and badge_count = 10/);
  assert.match(migration, /badge_count = 5 where category = 'hymns' and badge_count = 10/);
});

test('community milestones scale with the expanded ten-badge community category', () => {
  assert.match(communityMigration, /badge_count = 10, updated_at = now\(\)[\s\S]*category = 'community' and badge_count = 3/);
  assert.match(communityMigration, /badge_count = 6, updated_at = now\(\)[\s\S]*category = 'community' and badge_count = 2/);
  assert.match(communityMigration, /badge_count = 3, updated_at = now\(\)[\s\S]*category = 'community' and badge_count = 1/);
});
