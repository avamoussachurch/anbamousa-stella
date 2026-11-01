import assert from 'node:assert/strict';
import test from 'node:test';
import { filterAdminAccounts } from './adminWorkspaceModel';

const accounts = [
  { id: 'student', roles: [{ role: 'student' as const }], status: 'active' as const },
  { id: 'parent-teacher', roles: [{ role: 'parent' as const }, { role: 'teacher' as const }], status: 'invited' as const },
  { id: 'suspended-admin', roles: [{ role: 'admin' as const }], status: 'suspended' as const },
];

test('admin account filters support role, status, and combined multi-role matches', () => {
  assert.deepEqual(filterAdminAccounts(accounts, 'teacher', 'all').map(account => account.id), ['parent-teacher']);
  assert.deepEqual(filterAdminAccounts(accounts, 'all', 'suspended').map(account => account.id), ['suspended-admin']);
  assert.deepEqual(filterAdminAccounts(accounts, 'parent', 'invited').map(account => account.id), ['parent-teacher']);
  assert.deepEqual(filterAdminAccounts(accounts, 'admin', 'active'), []);
  assert.deepEqual(filterAdminAccounts(accounts, 'all', 'all'), accounts);
});
