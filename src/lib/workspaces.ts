import type { Role, User } from '../types';

export type Workspace = Role;

export const ASSIGNED_ROLES: readonly Role[] = ['student', 'parent', 'teacher', 'admin'];

export const WORKSPACE_TABS: Record<Workspace, readonly string[]> = {
  student: ['home', 'lessons', 'feed', 'calendar', 'hymns', 'taxis', 'agpeya', 'points', 'profile'],
  parent: ['home', 'children', 'journey', 'family', 'events', 'feed', 'profile'],
  teacher: ['home', 'studio', 'classManagement', 'attendance', 'mastery', 'lessons', 'sundaySchool', 'sources', 'preview', 'feed', 'communication', 'moderation', 'ai', 'profile'],
  admin: ['home', 'accounts', 'roles', 'families', 'classes', 'curriculum', 'security', 'support', 'role-requests', 'role-audit', 'profile'],
};

export function normalizeAssignedRoles(value: unknown): Role[] {
  if (!Array.isArray(value)) return [];
  return ASSIGNED_ROLES.filter(role => value.includes(role));
}

export function hasRole(user: Pick<User, 'roles'> | null | undefined, role: Role): boolean {
  return Boolean(user?.roles.includes(role));
}

export function canAccessWorkspace(roles: readonly Role[], workspace: string | null | undefined): workspace is Workspace {
  return ASSIGNED_ROLES.includes(workspace as Role) && roles.includes(workspace as Role);
}

export function canAccessWorkspaceTab(
  roles: readonly Role[],
  workspace: string | null | undefined,
  tab: string
): boolean {
  return canAccessWorkspace(roles, workspace) && WORKSPACE_TABS[workspace].includes(tab);
}

export function getDefaultWorkspace(roles: readonly Role[]): Workspace | null {
  const priority: Role[] = ['admin', 'teacher', 'parent', 'student'];
  return priority.find(role => roles.includes(role)) || null;
}

export function resolveWorkspace(roles: readonly Role[], requested: string | null | undefined): Workspace | null {
  if (canAccessWorkspace(roles, requested)) return requested;
  return getDefaultWorkspace(roles);
}

export function getCompatibilityRole(roles: readonly Role[]): Role {
  return getDefaultWorkspace(roles) || 'student';
}
