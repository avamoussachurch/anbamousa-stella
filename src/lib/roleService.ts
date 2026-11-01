import type { Role } from '../types';
import { getCompatibilityRole, hasRole, normalizeAssignedRoles } from './workspaces';
import { supabase } from './supabase';

export interface VerifiedClientAccount {
  id: string;
  roles: Role[];
  role: Role;
}

export async function fetchAssignedRoles(accessToken: string): Promise<Role[]> {
  const response = await fetch('/api/church/me/roles', {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Could not load assigned roles (HTTP ${response.status})`);
  const payload = await response.json();
  if (!Array.isArray(payload?.roles)) throw new Error('The server returned an invalid assigned-role response');
  const roles = normalizeAssignedRoles(payload.roles);
  if (roles.length !== payload.roles.length) throw new Error('The server returned an unsupported assigned role');
  return roles;
}

export async function getVerifiedClientAccount(): Promise<{ user: VerifiedClientAccount | null; error: Error | null }> {
  if (!supabase) return { user: null, error: new Error('Supabase client is not configured') };
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    return { user: null, error: new Error('Authentication required') };
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(session.access_token);
  if (authError || !user) return { user: null, error: new Error('Authentication required') };
  try {
    const roles = await fetchAssignedRoles(session.access_token);
    if (roles.length === 0) return { user: null, error: new Error('No active account roles are assigned') };
    return { user: { id: user.id, roles, role: getCompatibilityRole(roles) }, error: null };
  } catch (error: any) {
    return { user: null, error: new Error(error?.message || 'Could not verify assigned roles') };
  }
}

export async function getVerifiedServantAccount(
  authErrorMessage: string,
  permissionErrorMessage: string
): Promise<{ user: VerifiedClientAccount | null; error: Error | null }> {
  const result = await getVerifiedClientAccount();
  if (!result.user) {
    return { user: null, error: result.error || new Error(authErrorMessage) };
  }
  if (!hasRole(result.user, 'teacher') && !hasRole(result.user, 'admin')) {
    return { user: null, error: new Error(permissionErrorMessage) };
  }
  return result;
}
