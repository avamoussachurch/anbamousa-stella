import { HymnsRosterMembership, HymnsEnrollmentRequestPayload, Language, User } from '../types';
import { CopticHymnItem, COPTIC_HYMNS_COLLECTION } from '../data/hymnsData';
import { filterItemsByHymnsTaxisLevel, parseHymnsTaxisLevel } from './hymnsTaxisLevel';
import { hasRole } from './workspaces';

import { getAuthenticatedApiHeaders } from './apiAuth';
import { isSupabaseConfigured } from './supabase';

function notifyHymnsUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('church:hymns_updated'));
  }
}

async function getAuthHeaders(): Promise<HeadersInit> {
  return getAuthenticatedApiHeaders();
}

/**
 * Fetch current student's approved Hymns School enrollment
 */
export async function getMyHymnsEnrollment(studentId?: string): Promise<{
  success: boolean;
  membership: HymnsRosterMembership | null;
  error?: string;
}> {
  try {
    const q = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
    const res = await fetch(`/api/church/hymns/my-enrollment${q}`, {
      headers: await getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true, membership: data.membership };
      }
      return { success: false, membership: null, error: data.message || data.error };
    }
    return { success: false, membership: null, error: `Could not load Hymns enrollment (HTTP ${res.status}).` };
  } catch (err) {
    return {
      success: false,
      membership: null,
      error: err instanceof Error ? err.message : 'Network error while loading Hymns enrollment.'
    };
  }
}

/**
 * Submit an enrollment request for a specific Hymns level
 */
export async function submitHymnsEnrollment(
  payload: HymnsEnrollmentRequestPayload,
  studentName?: string
): Promise<{ success: boolean; membership?: HymnsRosterMembership; error?: string }> {
  try {
    const res = await fetch('/api/church/hymns/enroll', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        ...payload,
        studentName
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, membership: data.membership };
    }
    return { success: false, error: data.message || data.error || 'Failed to submit application' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

/**
 * Fetch all pending and enrolled requests for servants to review
 */
export async function getHymnsRequests(): Promise<{
  success: boolean;
  requests: HymnsRosterMembership[];
}> {
  try {
    const res = await fetch('/api/church/hymns/requests', {
      headers: await getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.requests)) {
        return { success: true, requests: data.requests };
      }
    }
  } catch (err) {
    console.warn("Failed to fetch hymns requests:", err);
  }
  return { success: false, requests: [] };
}

/**
 * Servant reviews (approves, rejects, transfers, revokes) a student's enrollment
 */
export async function reviewHymnsEnrollment(
  membershipId: string,
  action: 'APPROVE' | 'REJECT' | 'TRANSFER' | 'REVOKE',
  options?: {
    targetLevel?: 1 | 2 | 3;
    targetRosterGroup?: string;
    notes?: string;
  }
): Promise<{ success: boolean; membership?: HymnsRosterMembership; error?: string }> {
  try {
    const res = await fetch('/api/church/hymns/review', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        membershipId,
        action,
        ...options
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, membership: data.membership };
    }
    return { success: false, error: data.message || data.error };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

/**
 * Fetch authorized hymns for student or all hymns for servants
 */
export async function getHymns(
  level?: number,
  season?: string,
  status?: string,
  viewer?: Pick<User, 'roles' | 'hymnsTaxisLevel'>
): Promise<{
  success: boolean;
  items: CopticHymnItem[];
  enrolledLevel?: number | null;
  isApproved?: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    if (hasRole(viewer, 'student')) {
      const assignedLevel = parseHymnsTaxisLevel(viewer!.hymnsTaxisLevel);
      if (assignedLevel === null) {
        return { success: false, items: [], error: 'Choose your shared Hymns and Taxis level to view lessons.' };
      }
      return {
        success: true,
        items: filterItemsByHymnsTaxisLevel(COPTIC_HYMNS_COLLECTION, assignedLevel)
          .filter(hymn => hymn.status === 'published' && (!season || season === 'all' || hymn.occasionTag === season))
      };
    }

    return {
      success: true,
      items: COPTIC_HYMNS_COLLECTION.filter(hymn =>
        (!level || hymn.level === level) &&
        (!season || season === 'all' || hymn.occasionTag === season) &&
        (!status || status === 'all' || hymn.status === status)
      ),
      enrolledLevel: 1,
      isApproved: true
    };
  }

  try {
    const q = new URLSearchParams();
    if (level) q.set('level', String(level));
    if (season && season !== 'all') q.set('season', season);
    if (status && status !== 'all') q.set('status', status);

    const res = await fetch(`/api/church/hymns?${q.toString()}`, {
      headers: await getAuthHeaders()
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return { success: false, items: [], error: data?.message || data?.error || `Could not load Hymns (HTTP ${res.status}).` };
    }
    const data = await res.json();
    if (data.success && Array.isArray(data.items)) {
      const items = hasRole(viewer, 'student')
        ? filterItemsByHymnsTaxisLevel(data.items, viewer!.hymnsTaxisLevel)
        : data.items;
      return {
        success: true,
        items,
        enrolledLevel: data.enrolledLevel,
        isApproved: data.isApproved
      };
    }
    return { success: false, items: [], error: data.message || data.error || 'Could not load Hymns.' };
  } catch (err) {
    return { success: false, items: [], error: err instanceof Error ? err.message : 'Network error while loading Hymns.' };
  }
}

/**
 * Fetch single hymn by ID
 */
export async function getHymnById(id: string): Promise<{
  success: boolean;
  hymn?: CopticHymnItem;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/church/hymns/${encodeURIComponent(id)}`, {
      headers: await getAuthHeaders()
    });
    const data = await res.json();
    if (res.ok && data.success) {
      notifyHymnsUpdated();
      return { success: true, hymn: data.hymn };
    }
    return { success: false, error: data.message || data.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Create/publish a new hymn
 */
export async function createHymn(
  hymnData: Partial<CopticHymnItem>
): Promise<{ success: boolean; hymn?: CopticHymnItem; error?: string }> {
  try {
    const res = await fetch('/api/church/hymns', {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(hymnData)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      notifyHymnsUpdated();
      return { success: true, hymn: data.hymn };
    }
    return { success: false, error: data.message || data.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update an existing hymn
 */
export async function updateHymn(
  id: string,
  hymnData: Partial<CopticHymnItem>
): Promise<{ success: boolean; hymn?: CopticHymnItem; error?: string }> {
  try {
    const res = await fetch(`/api/church/hymns/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(hymnData)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, hymn: data.hymn };
    }
    return { success: false, error: data.message || data.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Unpublish hymn
 */
export async function unpublishHymn(id: string): Promise<{ success: boolean; hymn?: CopticHymnItem; error?: string }> {
  try {
    const res = await fetch(`/api/church/hymns/${encodeURIComponent(id)}/unpublish`, {
      method: 'POST',
      headers: await getAuthHeaders()
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.message || data?.error || `Could not unpublish Hymn (HTTP ${res.status}).` };
    }
    notifyHymnsUpdated();
    return { success: true, hymn: data.hymn };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error while unpublishing Hymn.' };
  }
}

/**
 * Restore prior hymn version
 */
export async function restoreHymnVersion(
  id: string,
  targetVersion: number
): Promise<{ success: boolean; hymn?: CopticHymnItem; error?: string }> {
  try {
    const res = await fetch(`/api/church/hymns/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ targetVersion })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      notifyHymnsUpdated();
      return { success: true, hymn: data.hymn };
    }
    return { success: false, error: data.message || data.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
