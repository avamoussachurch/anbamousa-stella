import { HymnsRosterMembership, HymnsEnrollmentRequestPayload, Language } from '../types';
import { CopticHymnItem, COPTIC_HYMNS_COLLECTION } from '../data/hymnsData';
import { filterItemsByHymnsTaxisLevel, parseHymnsTaxisLevel } from './hymnsTaxisLevel';

const TOKEN_KEY = 'church_auth_token';

function notifyHymnsUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('church:hymns_updated'));
  }
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

/**
 * Fetch current student's approved Hymns School enrollment
 */
export async function getMyHymnsEnrollment(studentId?: string): Promise<{
  success: boolean;
  membership: HymnsRosterMembership | null;
}> {
  try {
    const q = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
    const res = await fetch(`/api/church/hymns/my-enrollment${q}`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true, membership: data.membership };
      }
    }
  } catch (err) {
    console.warn("Failed to fetch my-enrollment from server:", err);
  }

  // Fallback to local storage for offline resilience
  try {
    const saved = localStorage.getItem('church_hymns_memberships');
    if (saved) {
      const list: HymnsRosterMembership[] = JSON.parse(saved);
      const idToFind = studentId || 'current_user';
      const found = list.find(m => m.studentId === idToFind && m.status !== 'revoked') || null;
      return { success: true, membership: found };
    }
  } catch (_) {}

  return { success: true, membership: null };
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
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders()
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
      headers: getAuthHeaders(),
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
  viewer?: { role: string; hymnsTaxisLevel?: number }
): Promise<{
  success: boolean;
  items: CopticHymnItem[];
  enrolledLevel?: number | null;
  isApproved?: boolean;
  error?: string;
}> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  try {
    const q = new URLSearchParams();
    if (level) q.set('level', String(level));
    if (season && season !== 'all') q.set('season', season);
    if (status && status !== 'all') q.set('status', status);

    const res = await fetch(`/api/church/hymns?${q.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok && token) {
      const data = await res.json().catch(() => null);
      return { success: false, items: [], error: data?.message || data?.error || `Could not load Hymns (HTTP ${res.status}).` };
    }
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        const items = viewer?.role === 'student'
          ? filterItemsByHymnsTaxisLevel(data.items, viewer.hymnsTaxisLevel)
          : data.items;
        return {
          success: true,
          items,
          enrolledLevel: data.enrolledLevel,
          isApproved: data.isApproved
        };
      }
      if (token) {
        return { success: false, items: [], error: data.message || data.error || 'Could not load Hymns.' };
      }
    }
  } catch (err) {
    if (token) {
      return { success: false, items: [], error: err instanceof Error ? err.message : 'Network error while loading Hymns.' };
    }
  }

  if (viewer?.role === 'student') {
    const assignedLevel = parseHymnsTaxisLevel(viewer.hymnsTaxisLevel);
    if (assignedLevel === null) {
      return { success: false, items: [], error: 'Choose your shared Hymns and Taxis level to view lessons.' };
    }
    return {
      success: true,
      items: filterItemsByHymnsTaxisLevel(COPTIC_HYMNS_COLLECTION, assignedLevel)
        .filter(hymn => hymn.status === 'published' && (!season || season === 'all' || hymn.occasionTag === season))
    };
  }

  // Only unauthenticated demo mode can use the bundled collection.
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
      headers: getAuthHeaders()
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
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
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
export async function unpublishHymn(id: string): Promise<{ success: boolean; hymn?: CopticHymnItem }> {
  try {
    const res = await fetch(`/api/church/hymns/${encodeURIComponent(id)}/unpublish`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (res.ok && data.success) notifyHymnsUpdated();
    return { success: Boolean(data.success), hymn: data.hymn };
  } catch (err) {
    return { success: false };
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
      headers: getAuthHeaders(),
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
