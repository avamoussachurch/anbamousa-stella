import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { hymnToDatabase, taxisToDatabase } from '../src/lib/hymnsTaxisPersistence';

const server = await readFile(new URL('../server.ts', import.meta.url), 'utf8');

test('Hymn persistence adapter maps creator ownership to the database column', () => {
  assert.deepEqual(hymnToDatabase({ createdBy: 'authenticated-user-id' }), {
    created_by: 'authenticated-user-id'
  });
});

test('Taxis persistence adapter maps creator ownership to the database column', () => {
  assert.deepEqual(taxisToDatabase({ createdBy: 'authenticated-user-id' }), {
    created_by: 'authenticated-user-id'
  });
});

test('Hymn creation uses the verified server identity rather than a client creator value', () => {
  const start = server.indexOf('const insert = hymnToDatabase({');
  const end = server.indexOf('\n      });', start);
  assert.notEqual(start, -1, 'database-backed Hymn creation exists');
  assert.notEqual(end, -1, 'Hymn insert payload is complete');
  const payload = server.slice(start, end);
  assert.match(payload, /createdBy:\s*authContext\.userId/);
});

test('Taxis creation uses the verified server identity rather than a client creator value', () => {
  const start = server.indexOf('const insert = taxisToDatabase({');
  const end = server.indexOf('\n      });', start);
  assert.notEqual(start, -1, 'database-backed Taxis creation exists');
  assert.notEqual(end, -1, 'Taxis insert payload is complete');
  const payload = server.slice(start, end);
  assert.match(payload, /createdBy:\s*authContext\.userId/);
});
