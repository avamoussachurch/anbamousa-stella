import type { Role } from '../../types';

export type AdminAccountStatus = 'active' | 'suspended' | 'invited' | 'unknown';
export type AdminAccountRoleFilter = Role | 'all';
export type AdminAccountStatusFilter = AdminAccountStatus | 'all';

interface FilterableAdminAccount {
  roles: Array<{ role: Role }>;
  status: AdminAccountStatus;
}

export function filterAdminAccounts<T extends FilterableAdminAccount>(
  accounts: readonly T[],
  role: AdminAccountRoleFilter,
  status: AdminAccountStatusFilter
): T[] {
  return accounts.filter(account =>
    (role === 'all' || account.roles.some(assignment => assignment.role === role)) &&
    (status === 'all' || account.status === status)
  );
}
