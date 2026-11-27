import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('RLS policies cache auth.uid() and avoid overlapping write-all SELECT policies', async () => {
  const migration = await read('../supabase/migrations/20261127162734_optimize_rls_auth_initplan_and_policy_overlap.sql');

  assert.match(migration, /replace\(policy_row\.qual, 'auth\.uid\(\)', '\(select auth\.uid\(\)\)'\)/);
  assert.match(migration, /replace\(policy_row\.with_check, 'auth\.uid\(\)', '\(select auth\.uid\(\)\)'\)/);

  for (const table of ['church_event_rsvps', 'feed_post_class_targets', 'feed_post_grade_targets']) {
    assert.match(migration, new RegExp('drop policy if exists [a-z_]+ on public\\.' + table, 'i'));
    assert.match(migration, new RegExp('create policy ' + table + '_author_insert|create policy ' + table + '_insert_own', 'i'));
    assert.match(migration, new RegExp('create policy ' + table + '_author_update|create policy ' + table + '_update_own', 'i'));
    assert.match(migration, new RegExp('create policy ' + table + '_author_delete|create policy ' + table + '_delete_own', 'i'));
  }
});
