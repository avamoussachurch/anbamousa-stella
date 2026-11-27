import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('profile grade helper has a pinned catalog-only search path', async () => {
  const migration = await read('../supabase/migrations/20261127161019_pin_profile_grade_class_group_search_path.sql');
  assert.match(migration, /alter function public\.profile_grade_class_group\(text\) set search_path = pg_catalog/i);
  assert.doesNotMatch(migration, /security\s+definer/i);
});
