import { supabase } from './supabase';
import { parseHymnsTaxisLevel, type HymnsTaxisLevel } from './hymnsTaxisLevel';

export async function initializeMyHymnsTaxisLevel(
  level: HymnsTaxisLevel
): Promise<{ success: boolean; level?: HymnsTaxisLevel; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (sessionError || !token) {
      return { success: false, error: 'Your session has expired. Please sign in again.' };
    }

    const response = await fetch('/api/church/hymns-taxis-level', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ level })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      return {
        success: false,
        error: payload?.message || payload?.error || `Could not save your level (HTTP ${response.status}).`
      };
    }

    const savedLevel = parseHymnsTaxisLevel(payload.level);
    if (savedLevel === null) {
      return { success: false, error: 'The server returned an invalid saved level.' };
    }
    return { success: true, level: savedLevel };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error while saving your level.'
    };
  }
}
