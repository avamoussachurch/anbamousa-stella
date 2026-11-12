import { HymnsRosterMembership, HymnsEnrollmentRequestPayload, Language } from '../types';
import { getAuthenticatedApiHeaders } from './apiAuth';
import { isSupabaseConfigured } from './supabase';

export interface HymnsLevelDefinition {
  level: 1 | 2 | 3;
  nameAr: string;
  nameEn: string;
  subAr: string;
  subEn: string;
  descriptionAr: string;
  descriptionEn: string;
  rosterGroups: Array<{ id: string; nameAr: string; nameEn: string }>;
}

export const HYMNS_LEVEL_DEFINITIONS: HymnsLevelDefinition[] = [
  {
    level: 1,
    nameAr: 'المستوى الأول (تمهيدي ومبتدئين)',
    nameEn: 'Level 1: Novice & Elementary',
    subAr: 'مردات القداس الأساسية وبدايات التسبحة',
    subEn: 'Foundational Liturgical Responses & Praises',
    descriptionAr: 'مخصص للمرحلة الابتدائية والمبتدئين: لحن إبؤورو، خين إفران، وتين أو أوشت، مع إتقان الحروف القبطية والنطق السليم.',
    descriptionEn: 'Tailored for elementary students and beginners: Ep-Oro, Khen Efran, and Teno-Oosht with phonetic Coptic mastery.',
    rosterGroups: [
      { id: 'primary_choir', nameAr: 'خورس ابتدائي', nameEn: 'Elementary Choir' },
      { id: 'general_novice', nameAr: 'تمهيدي عام', nameEn: 'General Novice' }
    ]
  },
  {
    level: 2,
    nameAr: 'المستوى الثاني (متوسط وشمامسة)',
    nameEn: 'Level 2: Intermediate & Deacons',
    subAr: 'ألحان القداس الإلهي والصلوات الكيهكية',
    subEn: 'Liturgy of the Faithful & Kiahk Praises',
    descriptionAr: 'مخصص لشمامسة المرحلة الإعدادية والمتوسطين: لحن أجيوس، الهوس الثالث، وآصومن، مع تدريب الإيقاع بالدف والمثلث.',
    descriptionEn: 'Designed for preparatory deacons and youth: Agios, Third Canticle (Hos Erof), and Asomen with liturgical cymbals.',
    rosterGroups: [
      { id: 'deacons_prep', nameAr: 'شمامسة إعدادي', nameEn: 'Preparatory Deacons' },
      { id: 'youth_hymns', nameAr: 'خورس الشباب', nameEn: 'Youth Choir' }
    ]
  },
  {
    level: 3,
    nameAr: 'المستوى الثالث (متقدم والمناسبات الكبرى)',
    nameEn: 'Level 3: Advanced & Solemn Rites',
    subAr: 'ألحان الجمعة العظيمة والصوم الكبير والتسبحة',
    subEn: 'Great Lent, Pascha, and Good Friday Masterworks',
    descriptionAr: 'مخصص للشمامسة المتقدمين والمكرسين: لحن بيك إثرونوس، غولغوثا، وتي شوري، مع إتقان الهزات الطويلة والطقس الحزايني والفرايحي.',
    descriptionEn: 'Advanced deacons: Pek-Thronos, Golgotha, and Tai-Shouri featuring intricate hazat and liturgical solemnity.',
    rosterGroups: [
      { id: 'master_deacons', nameAr: 'شمامسة متقدمين', nameEn: 'Senior Deacons' },
      { id: 'tasbeha_fellowship', nameAr: 'رابطة المرتلين', nameEn: 'Cantors Fellowship' }
    ]
  }
];

const STORAGE_KEY = 'church_hymns_memberships';

function getStoredMemberships(): HymnsRosterMembership[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not read hymns memberships from localStorage:', e);
  }
  return [];
}

function saveStoredMemberships(list: HymnsRosterMembership[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('church_hymns_memberships_updated', { detail: list }));
  } catch (e) {
    console.warn('Could not save hymns memberships to localStorage:', e);
  }
}

/**
 * Get student's current Hymns School roster membership
 */
export async function getMyHymnsEnrollment(studentId?: string): Promise<{
  success: boolean;
  membership: HymnsRosterMembership | null;
  error?: string;
}> {
  // Try server API first
  try {
    const headers = await getAuthenticatedApiHeaders();
    const res = await fetch(`/api/church/hymns/my-enrollment${studentId ? `?studentId=${studentId}` : ''}`, {
      headers
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true, membership: data.membership };
      }
    }
    if (isSupabaseConfigured) return { success: false, membership: null, error: `Could not load Hymns enrollment (HTTP ${res.status}).` };
  } catch (error) {
    if (isSupabaseConfigured) {
      return { success: false, membership: null, error: error instanceof Error ? error.message : 'Could not load Hymns enrollment.' };
    }
  }

  // Fallback to local storage
  const list = getStoredMemberships();
  const idToFind = studentId || 'u1';
  const found = list.find(m => m.studentId === idToFind && m.status !== 'revoked') || null;
  return { success: true, membership: found };
}

/**
 * Student submits an enrollment application
 */
export async function submitHymnsEnrollment(
  payload: HymnsEnrollmentRequestPayload,
  studentId?: string,
  studentName?: string
): Promise<{ success: boolean; membership?: HymnsRosterMembership; error?: string }> {
  try {
    const headers = await getAuthenticatedApiHeaders();
    const res = await fetch('/api/church/hymns/enroll', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        level: payload.level,
        rosterGroup: payload.rosterGroup || 'general',
        notes: payload.notes || '',
        studentId
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.membership) {
        // Cache locally
        const current = getStoredMemberships().filter(m => m.id !== data.membership.id);
        saveStoredMemberships([data.membership, ...current]);
        return { success: true, membership: data.membership };
      } else {
        return { success: false, error: data.message || data.error };
      }
    }
  } catch (error) {
    if (isSupabaseConfigured) {
      return { success: false, error: error instanceof Error ? error.message : 'Could not submit Hymns enrollment.' };
    }
  }
  if (isSupabaseConfigured) return { success: false, error: 'Could not submit Hymns enrollment.' };

  // Offline/Demo fallback
  const fallbackId = studentId || 'u1';
  const fallbackName = studentName || 'Student';
  const existing = getStoredMemberships().find(m => m.studentId === fallbackId && m.status === 'pending');
  if (existing) {
    return { success: false, error: 'لديك طلب التحاق قيد المراجعة بالفعل لهذا المستوى!' };
  }

  const newMembership: HymnsRosterMembership = {
    id: `hm-${Date.now()}`,
    studentId: fallbackId,
    studentName: fallbackName,
    level: payload.level,
    rosterGroup: payload.rosterGroup || 'general',
    status: 'pending',
    requestedAt: new Date().toISOString(),
    notes: payload.notes
  };

  const current = getStoredMemberships();
  saveStoredMemberships([newMembership, ...current]);
  return { success: true, membership: newMembership };
}

/**
 * Fetch all roster applications for teachers and servants
 */
export async function getHymnsRosterRequests(level?: number): Promise<{
  success: boolean;
  requests: HymnsRosterMembership[];
  error?: string;
}> {
  try {
    const headers = await getAuthenticatedApiHeaders();
    const res = await fetch(`/api/church/hymns/roster-requests${level ? `?level=${level}` : ''}`, {
      headers
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.requests)) {
        return { success: true, requests: data.requests };
      }
    }
    if (isSupabaseConfigured) return { success: false, requests: [], error: `Could not load Hymns roster (HTTP ${res.status}).` };
  } catch (error) {
    if (isSupabaseConfigured) {
      return { success: false, requests: [], error: error instanceof Error ? error.message : 'Could not load Hymns roster.' };
    }
  }
  if (isSupabaseConfigured) return { success: false, requests: [], error: 'Could not load Hymns roster.' };

  const local = getStoredMemberships();
  const filtered = level ? local.filter(r => r.level === level) : local;
  return { success: true, requests: filtered };
}

/**
 * Servants manage enrollment: APPROVE, REJECT, TRANSFER, REVOKE
 */
export async function executeHymnsRosterAction(
  membershipId: string,
  action: 'APPROVE' | 'REJECT' | 'TRANSFER' | 'REVOKE',
  params?: {
    reviewedBy?: string;
    targetLevel?: 1 | 2 | 3;
    reason?: string;
  }
): Promise<{ success: boolean; membership?: HymnsRosterMembership; error?: string }> {
  try {
    const headers = await getAuthenticatedApiHeaders();
    const res = await fetch('/api/church/hymns/roster-action', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        membershipId,
        action,
        targetLevel: params?.targetLevel,
        reason: params?.reason
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true, membership: data.membership };
      } else {
        return { success: false, error: data.message || data.error };
      }
    }
  } catch (error) {
    if (isSupabaseConfigured) {
      return { success: false, error: error instanceof Error ? error.message : 'Could not update Hymns enrollment.' };
    }
  }
  if (isSupabaseConfigured) return { success: false, error: 'Could not update Hymns enrollment.' };

  // Local fallback
  const list = getStoredMemberships();
  const idx = list.findIndex(m => m.id === membershipId);
  if (idx < 0) return { success: false, error: 'Membership record not found' };

  const item = { ...list[idx] };
  const now = new Date().toISOString();
  item.reviewedAt = now;
  item.reviewedBy = params?.reviewedBy || 'Servant';

  if (action === 'APPROVE') {
    item.status = 'approved';
  } else if (action === 'REJECT') {
    item.status = 'rejected';
    item.rejectionReason = params?.reason || 'Level prerequisites not yet met';
  } else if (action === 'TRANSFER') {
    item.transferredFromLevel = item.level;
    item.level = params?.targetLevel || 1;
    item.status = 'approved';
    item.transferReason = params?.reason || 'Transferred to recommended level';
  } else if (action === 'REVOKE') {
    item.status = 'revoked';
    item.revocationReason = params?.reason || 'Enrollment revoked by servant';
  }

  list[idx] = item;
  saveStoredMemberships(list);
  return { success: true, membership: item };
}
