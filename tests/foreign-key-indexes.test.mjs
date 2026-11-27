import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('all previously uncovered foreign-key columns have supporting indexes', async () => {
  const migration = await read('../supabase/migrations/20261127163130_index_uncovered_foreign_keys.sql');
  const indexes = [
    ['church_event_rsvps', 'user_id'],
    ['feed_post_bookmarks', 'post_id'],
    ['feed_post_class_targets', 'class_instance_id'],
    ['feed_post_poll_votes', 'user_id'],
    ['hymn_practice_submissions', 'reviewed_by'],
    ['profile_cosmetic_unlocks', 'cosmetic_id'],
    ['profile_follows', 'followed_id']
  ];

  for (const [table, column] of indexes) {
    assert.match(migration, new RegExp('create index if not exists [a-z_]+\\s+on public\\.' + table + ' \\(' + column + '\\)', 'i'));
  }
});
