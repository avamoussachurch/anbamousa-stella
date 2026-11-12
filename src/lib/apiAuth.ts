import { supabase } from './supabase';

export async function getAuthenticatedApiToken(): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase authentication is not configured.');
  }

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(`Could not read the Supabase session: ${error.message}`);
  }
  if (!session?.access_token) {
    throw new Error('Your session expired. Sign in again.');
  }

  return session.access_token;
}

export async function getAuthenticatedApiHeaders(): Promise<HeadersInit> {
  const token = await getAuthenticatedApiToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}
