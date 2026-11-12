import { supabase } from './supabase';
import { fetchWithTimeout } from './fetchWithTimeout';
import { parseStorageReference } from './mediaStorageReference';

/**
 * Converts a stable private curriculum-media reference into a short-lived
 * signed URL. Ordinary HTTPS URLs are returned unchanged.
 */
export async function resolveCurriculumMediaUrl(value?: string | null): Promise<string> {
  if (!value) return '';
  const reference = parseStorageReference(value);
  if (!reference) return value;
  if (reference.bucket !== 'stella-curriculum-media-v1') {
    throw new Error('This is not a supported private curriculum-media reference.');
  }
  if (!supabase) throw new Error('Your authenticated session is unavailable.');

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    throw new Error('Sign in again to access this curriculum file.');
  }

  const query = new URLSearchParams({ reference: value });
  const response = await fetchWithTimeout(
    `/api/media-url?${query.toString()}`,
    { headers: { authorization: `Bearer ${session.access_token}` } },
    12000
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success || typeof payload.url !== 'string' || !payload.url.startsWith('https://')) {
    throw new Error(payload?.message || 'The private curriculum file could not be opened.');
  }
  return payload.url;
}
