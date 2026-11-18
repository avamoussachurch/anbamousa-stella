import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('new postgres-owned public functions are not executable by PUBLIC or anon by default', async () => {
  const migration = await read('../supabase/migrations/20261118181212_revoke_public_function_default_execute.sql');
  assert.match(migration, /ALTER DEFAULT PRIVILEGES\s+REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC/);
  assert.match(migration, /REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon/);
});
