import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('online church-year lookup loads real class join codes from the active year', async () => {
  const service = await read('../src/lib/churchYearService.ts');

  assert.match(service, /\.from\('class_instances'\)/);
  assert.match(service, /\.select\('id, church_year_id, class_group_id, name_en, name_ar, join_code, created_at, updated_at'\)/);
  assert.match(service, /\.eq\('church_year_id', cy\.id\)/);
  assert.match(service, /code: instance\.join_code/);
  assert.match(service, /classInstances: \(instances \|\| \[\]\)\.map/);
  assert.doesNotMatch(service, /classInstances: \[\]\s*\n\s*};/);
});

test('student class-code entry normalizes codes and uses the authoritative enrollment RPC', async () => {
  const service = await read('../src/lib/churchYearService.ts');

  assert.match(service, /const trimmedCode = \(code \|\| ''\)\.trim\(\)\.toUpperCase\(\)/);
  assert.match(service, /supabase\.rpc\('join_class_by_code'/);
  assert.match(service, /p_join_code: trimmedCode/);
});
