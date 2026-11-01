import { supabase } from './supabase';

export interface ServantAssignedClass {
  id: string;
  classGroupId: string;
  name: string;
  nameAr: string;
  churchYearName: string;
}

export async function getServantAssignedClasses(): Promise<{
  data: { classes: ServantAssignedClass[] } | null;
  error: Error | null;
}> {
  if (!supabase) return { data: null, error: new Error('Authenticated server access is unavailable.') };
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error(`Could not verify the current session: ${sessionError.message}`);
    if (!session?.access_token) throw new Error('Sign in to load assigned service classes.');

    const response = await fetch('/api/church/servant/profile-classes', {
      headers: { authorization: ['Bearer', session.access_token].join(' ') }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.message || payload?.error || `Could not load assigned classes (HTTP ${response.status}).`);
    }
    if (!Array.isArray(payload.classes)) throw new Error('The server returned an invalid assigned-classes response.');
    return { data: { classes: payload.classes as ServantAssignedClass[] }, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error('Could not load assigned classes.') };
  }
}
