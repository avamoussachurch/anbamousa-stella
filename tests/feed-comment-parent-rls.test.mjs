import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('feed reply RLS correlates the parent comment to the new comment row', async () => {
  const migration = await read('../supabase/migrations/20261118175548_fix_feed_comment_parent_rls.sql');

  assert.match(migration, /FROM public\.feed_comments AS parent_comment/);
  assert.match(migration, /parent_comment\.id = feed_comments\.parent_id/);
  assert.match(migration, /parent_comment\.post_id = feed_comments\.post_id/);
  assert.match(migration, /parent_comment\.id <> feed_comments\.id/);
  assert.doesNotMatch(migration, /parent_comment\.id = parent_comment\.parent_id/);
  assert.doesNotMatch(migration, /parent_comment\.post_id = parent_comment\.post_id/);
});
