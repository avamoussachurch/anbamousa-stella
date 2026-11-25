import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const migration = await readFile(new URL('../supabase/migrations/20261125183844_attainable_category_milestones.sql', import.meta.url), 'utf8');

test('category milestone thresholds do not exceed the badge inventory', () => {
  assert.match(migration, /category = 'service'/);
  for (const category of ['attendance','community','consistency','quizzes','prayer','taxis','hymns','learning']) {
    assert.match(migration, new RegExp("category (?:in \\([^)]*" + category + "|= '" + category + "')"));
  }
  assert.match(migration, /badge_count = 7 where category = 'learning' and badge_count = 10/);
  assert.match(migration, /badge_count = 5 where category = 'hymns' and badge_count = 10/);
});
