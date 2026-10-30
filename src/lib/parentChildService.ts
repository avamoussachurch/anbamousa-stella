import { ChildProfile, User, Language, ChurchEventNotification } from '../types';
import { mockChildrenProfiles } from '../components/parent/parentData';
import { linkParentAndChildInSupabase, findStudentByLinkCodeInSupabase } from './supabaseDatabase';
import { COPTIC_AVATARS, DEFAULT_STUDENT_AVATAR } from '../data/copticAvatars';
import { supabase } from './supabase';
import type { StudentLearningReviewData } from './classRosterService';
export type { StudentLearningReviewData as ChildLearningReviewData };

export interface RewardRequest {
  id: string;
  childId?: string;
  parentId?: string;
  childNameEn: string;
  childNameAr: string;
  rewardTitleEn: string;
  rewardTitleAr: string;
  pointsCost: number;
  icon: string;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: string;
  parentNote?: string;
}

export interface RosterStudent {
  id: string;
  nameEn: string;
  nameAr: string;
  age: number;
  gradeEn: string;
  gradeAr: string;
  avatarUrl: string;
  linkCode: string;
  points: number;
  rank: number;
  attendanceRate: number;
  isAlreadyLinked?: boolean;
}

// Available Sunday School Class Roster for fast, realistic linking
export const sundaySchoolRoster: RosterStudent[] = [
  {
    id: 'student-david',
    nameEn: 'David Shenouda',
    nameAr: 'ديفيد شنودة',
    age: 9,
    gradeEn: '4th Grade Elementary',
    gradeAr: 'الصف الرابع الابتدائي',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=church_student_guest',
    linkCode: 'ST-4921',
    points: 850,
    rank: 3,
    attendanceRate: 98
  },
  {
    id: 'c1',
    nameEn: 'Mina Emad',
    nameAr: 'مينا عماد',
    age: 9,
    gradeEn: '4th Grade Elementary',
    gradeAr: 'الصف الرابع الابتدائي',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MinaEmad&backgroundColor=b6e3f4',
    linkCode: 'CH-9481',
    points: 950,
    rank: 2,
    attendanceRate: 96
  },
  {
    id: 'c2',
    nameEn: 'Mary Emad',
    nameAr: 'مريم عماد',
    age: 7,
    gradeEn: '2nd Grade Elementary',
    gradeAr: 'الصف الثاني الابتدائي',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MaryEmad&backgroundColor=ffd5dc',
    linkCode: 'CH-7320',
    points: 820,
    rank: 1,
    attendanceRate: 100
  },
  {
    id: 'student-fadi',
    nameEn: 'Fadi Nabil',
    nameAr: 'فادي نبيل',
    age: 8,
    gradeEn: '3rd Grade Elementary',
    gradeAr: 'الصف الثالث الابتدائي',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=FadiNabil&backgroundColor=c0aede',
    linkCode: 'ST-3819',
    points: 670,
    rank: 4,
    attendanceRate: 92
  },
  {
    id: 'student-marina',
    nameEn: 'Marina George',
    nameAr: 'مارينا جورج',
    age: 10,
    gradeEn: '5th Grade Elementary',
    gradeAr: 'الصف الخامس الابتدائي',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MarinaGeorge&backgroundColor=ffdfbf',
    linkCode: 'ST-6104',
    points: 890,
    rank: 2,
    attendanceRate: 95
  },
  {
    id: 'student-kyrollos',
    nameEn: 'Kyrollos Rafik',
    nameAr: 'كيرلس رفيق',
    age: 11,
    gradeEn: '6th Grade Elementary',
    gradeAr: 'الصف السادس الابتدائي',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=KyrollosRafik&backgroundColor=d1d4f9',
    linkCode: 'ST-8255',
    points: 910,
    rank: 1,
    attendanceRate: 97
  }
];

const CHILDREN_STORAGE_KEY_PREFIX = 'church_parent_linked_children_v3_';
const REWARD_REQUESTS_KEY = 'church_synced_reward_requests_v3';

// Generate or retrieve persistent link code for any student
export function getOrCreateChildLinkCode(user?: User | null): string {
  if (!user || user.role !== 'student') return '';
  if (user.linkCode) return user.linkCode;
  if (user.childLinkCode) return user.childLinkCode;
  
  // Try reading from localStorage
  const storageKey = `church_child_code_${user.id}`;
  const savedCode = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null;
  if (savedCode) return savedCode;

  // Generate deterministic unique 5-digit code based on user id and name
  let hash = 0;
  const str = 'coptic_child_' + (user.id || 'id') + (user.fullName || '');
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  const digits = (positive % 90000 + 10000).toString();
  const code = `ST-${digits}`;
  
  try {
    localStorage.setItem(storageKey, code);
  } catch (e) {}

  return code;
}

/**
 * Load parent's linked children list with real-time sync with active student session
 */
export function getLinkedChildren(parentId: string = 'default', activeStudentUser?: User | null): ChildProfile[] {
  let list: ChildProfile[] = [];
  const primaryKey = `${CHILDREN_STORAGE_KEY_PREFIX}${parentId}`;

  try {
    const raw = localStorage.getItem(primaryKey);
    if (raw) {
      list = JSON.parse(raw);
    } else if (parentId !== 'default') {
      // Also check fallback default key
      const defaultRaw = localStorage.getItem(`${CHILDREN_STORAGE_KEY_PREFIX}default`);
      if (defaultRaw) {
        list = JSON.parse(defaultRaw);
      }
    }
  } catch (e) {
    console.error('Failed to read linked children from storage', e);
  }

  // If no children saved yet, seed with default mock profiles
  if (!list || list.length === 0) {
    list = mockChildrenProfiles.map((c, i) => ({
      ...c,
      linkCode: i === 0 ? 'CH-9481' : 'CH-7320',
      parentId,
      isRealAccount: false,
      dailyScreenTimeLimitMinutes: 60,
      parentBlessingMessage: i === 0 
        ? 'ربنا يبارك حفظك للألحان يا مينا، فخور بيك جداً وبصلواتك في الكنيسة! 🙏'
        : 'حبيبتي مريم، ربنا يفرح قلبك بنعمته وبركة صلوات العذراء مريم! 🌸'
    }));

    // If active user is a student, also ensure they are available or auto-linked to demonstrate real sync!
    if (activeStudentUser && activeStudentUser.role === 'student') {
      const activeLinkCode = getOrCreateChildLinkCode(activeStudentUser);
      const studentMinutes = Math.round((activeStudentUser.screenTimeSeconds || 0) / 60);
      const activeChild: ChildProfile = {
        id: activeStudentUser.id,
        nameEn: activeStudentUser.fullName,
        nameAr: activeStudentUser.fullName,
        age: 9,
        gradeEn: activeStudentUser.grade || '4th Grade Elementary',
        gradeAr: activeStudentUser.grade || 'الصف الرابع الابتدائي',
        avatarUrl: activeStudentUser.avatarUrl || DEFAULT_STUDENT_AVATAR,
        points: activeStudentUser.points ?? 850,
        rank: 3,
        attendanceRate: 98,
        screenTimeMinutes: Math.max(15, studentMinutes),
        completedLessonsCount: 3,
        totalLessonsCount: 8,
        verseMemorizedCount: 3,
        pendingRewardsCount: 0,
        lessons: mockChildrenProfiles[0].lessons.slice(0, 3),
        linkCode: activeLinkCode,
        parentId,
        isRealAccount: true,
        studentId: activeStudentUser.id,
        dailyScreenTimeLimitMinutes: activeStudentUser.dailyScreenTimeLimitMinutes || 60,
        parentBlessingMessage: activeStudentUser.parentBlessingMessage || 'بركة الرب تحفظك وتملأ قلبك حكمة ونوراً في كل يوم!',
        parentBlessingDate: activeStudentUser.parentBlessingDate || new Date().toISOString()
      };
      // Place student at top of list
      list = [activeChild, ...list];
    }

    saveLinkedChildren(parentId, list);
  } else {
    // If active student is logged in and is in the list, synchronize live values!
    if (activeStudentUser && activeStudentUser.role === 'student') {
      let modified = false;
      list = list.map(child => {
        const isMatched = child.studentId === activeStudentUser.id || 
                          child.id === activeStudentUser.id || 
                          child.linkCode === activeStudentUser.childLinkCode;
        if (isMatched) {
          modified = true;
          const liveMinutes = Math.round((activeStudentUser.screenTimeSeconds || 0) / 60);
          return {
            ...child,
            nameEn: activeStudentUser.fullName,
            nameAr: activeStudentUser.fullName,
            avatarUrl: activeStudentUser.avatarUrl,
            points: activeStudentUser.points,
            screenTimeMinutes: Math.max(child.screenTimeMinutes || 0, liveMinutes),
            isRealAccount: true,
            studentId: activeStudentUser.id,
            parentBlessingMessage: activeStudentUser.parentBlessingMessage || child.parentBlessingMessage,
            dailyScreenTimeLimitMinutes: activeStudentUser.dailyScreenTimeLimitMinutes || child.dailyScreenTimeLimitMinutes || 60
          };
        }
        return child;
      });

      if (modified) {
        saveLinkedChildren(parentId, list);
      }
    }
  }

  return list;
}

export function saveLinkedChildren(parentId: string = 'default', children: ChildProfile[]) {
  try {
    // Save to primary parentId key
    localStorage.setItem(`${CHILDREN_STORAGE_KEY_PREFIX}${parentId}`, JSON.stringify(children));
    // Also save to default key so fallbacks have access to latest state
    if (parentId !== 'default') {
      localStorage.setItem(`${CHILDREN_STORAGE_KEY_PREFIX}default`, JSON.stringify(children));
    }
    window.dispatchEvent(new CustomEvent('church:children_updated', { detail: { parentId, children } }));
  } catch (e) {
    console.error('Failed to save linked children', e);
  }
}

/**
 * Extract clean secret code from either a direct code string or a shared URL
 * e.g., "https://app.church.org/?connectChild=ST-4921" -> "ST-4921"
 * e.g., "ST-4921" -> "ST-4921"
 */
export function extractSecretCodeFromInput(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  
  // Try URL parsing
  try {
    if (trimmed.includes('?') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://dummy.org/${trimmed.startsWith('?') ? trimmed : '?' + trimmed}`);
      const paramCode = url.searchParams.get('connectChild') || 
                        url.searchParams.get('linkCode') || 
                        url.searchParams.get('code') || 
                        url.searchParams.get('childCode');
      if (paramCode) return paramCode.trim().toUpperCase();
    }
  } catch (e) {}

  // Try regex search for standard code pattern: (ST|CH|SEC)-digits
  const codeRegex = /\b([A-Za-z]{2,4}[-_]?[0-9]{4,6})\b/;
  const match = trimmed.match(codeRegex);
  if (match && match[1]) {
    return match[1].replace('_', '-').toUpperCase();
  }

  // Fallback: remove spaces and uppercase
  return trimmed.replace(/\s+/g, '').toUpperCase();
}

/**
 * Generate shareable link for child to send to parents
 */
export function getShareableChildLink(linkCode: string): string {
  const origin = typeof window !== 'undefined' && window.location?.origin 
    ? window.location.origin 
    : 'https://coptic-sunday-school.app';
  const pathname = typeof window !== 'undefined' && window.location?.pathname 
    ? window.location.pathname 
    : '/';
  return `${origin}${pathname}?connectChild=${encodeURIComponent(linkCode)}`;
}

/**
 * Generate pre-formatted WhatsApp share link for child to send to parents
 */
export function getWhatsAppShareUrl(linkCode: string, studentName: string, lang: Language = 'ar'): string {
  const link = getShareableChildLink(linkCode);
  const text = (lang === 'copt' || lang === 'cop')
    ? `Ⲭⲉⲣⲉ ⲡⲁⲓⲱⲧ / ⲧⲁⲙⲁⲩ 🕊️,\nⲠⲁⲓ ⲡⲉ ⲡⲓⲙⲱⲓⲧ ⲉ̀ⲥⲱⲕ ⲙ̀ⲡⲁⲣⲁⲛ (${studentName}) ϧⲉⲛ ⲡⲓ-app ⲛ̀ⲧⲉ ϯⲉⲕⲕⲗⲏⲥⲓⲁ:\n${link}\n\nⲠⲓⲕⲱⲇ:\n🔑 ${linkCode}`
    : lang === 'ar'
      ? `سلام ونعمة يا بابا / يا ماما 🕊️،\nهذا رابط ربط حسابي (${studentName}) في تطبيق مدارس الأحد:\n${link}\n\nأو يمكنك إدخال الرمز السري المباشر:\n🔑 ${linkCode}`
      : `Peace and grace Mom & Dad 🕊️,\nHere is the link to connect my profile (${studentName}) in the Sunday School app:\n${link}\n\nOr you can enter my secret code:\n🔑 ${linkCode}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Link a child using their unique Secret Code or direct Link
 * Strictly verifies the secret code and prevents guessing or picking from a public list
 */
export function linkChildByCode(
  parentId: string = 'default',
  parentName: string = 'Parent Guardian',
  parentEmail: string = 'parent@church.org',
  inputCodeOrEmail: string,
  activeStudentUser?: User | null
): { success: boolean; child?: ChildProfile; error?: string } {
  const normalized = extractSecretCodeFromInput(inputCodeOrEmail);
  if (!normalized) {
    return { success: false, error: 'من فضلك أدخل الرمز السري للطفل أو الصق رابط الدعوة / Please enter a valid child secret code or invite link.' };
  }

  const currentChildren = getLinkedChildren(parentId, activeStudentUser);

  // Check if already linked
  const alreadyLinked = currentChildren.find(
    c => c.linkCode?.toUpperCase() === normalized || 
         c.id.toUpperCase() === normalized ||
         c.studentId?.toUpperCase() === normalized
  );
  if (alreadyLinked) {
    return { success: false, error: 'هذا التلميذ مرتبط بالفعل بحسابك العائلي / This child is already linked to your account.' };
  }

  // 1. Check against active student account
  if (activeStudentUser && activeStudentUser.role === 'student') {
    const studentCode = getOrCreateChildLinkCode(activeStudentUser).toUpperCase();
    const studentId = activeStudentUser.id.toUpperCase();

    if (normalized === studentCode || normalized === studentId) {
      const studentMinutes = Math.round((activeStudentUser.screenTimeSeconds || 0) / 60);
      const newChild: ChildProfile = {
        id: activeStudentUser.id,
        nameEn: activeStudentUser.fullName,
        nameAr: activeStudentUser.fullName,
        age: 9,
        gradeEn: activeStudentUser.grade || '4th Grade Elementary',
        gradeAr: activeStudentUser.grade || 'الصف الرابع الابتدائي',
        avatarUrl: activeStudentUser.avatarUrl,
        points: activeStudentUser.points ?? 850,
        rank: 3,
        attendanceRate: 98,
        screenTimeMinutes: Math.max(15, studentMinutes),
        completedLessonsCount: 3,
        totalLessonsCount: 8,
        verseMemorizedCount: 3,
        pendingRewardsCount: 0,
        lessons: mockChildrenProfiles[0].lessons.slice(0, 3),
        linkCode: studentCode,
        parentId,
        isRealAccount: true,
        studentId: activeStudentUser.id,
        dailyScreenTimeLimitMinutes: activeStudentUser.dailyScreenTimeLimitMinutes || 60,
        parentBlessingMessage: 'بركة الرب تحفظك وتملأ قلبك حكمة ونوراً!',
        parentBlessingDate: new Date().toISOString()
      };

      const updatedList = [newChild, ...currentChildren];
      saveLinkedChildren(parentId, updatedList);
      if (parentEmail && parentEmail !== parentId) {
        saveLinkedChildren(parentEmail, updatedList);
      }

      // Persist relationship in Supabase user_relationships & profiles tables
      linkParentAndChildInSupabase(parentId, newChild.id, newChild.linkCode).catch(e => {
        console.warn('Supabase link note:', e);
      });

      // Update student session
      activeStudentUser.parentId = parentId;
      activeStudentUser.parentName = parentName;
      activeStudentUser.parentEmail = parentEmail;
      activeStudentUser.isLinkedToParent = true;
      try {
        const authKey = localStorage.getItem('church_guest_user') ? 'church_guest_user' : 'church_auth_user';
        localStorage.setItem(authKey, JSON.stringify(activeStudentUser));
      } catch (e) {}

      window.dispatchEvent(new CustomEvent('church:parent_linked', { detail: { parentId, parentName, child: newChild } }));

      return { success: true, child: newChild };
    }
  }

  // 2. Check strictly against registered secret codes (NO matching by name to prevent guessing or adding other kids!)
  const rosterMatch = sundaySchoolRoster.find(
    r => r.linkCode.toUpperCase() === normalized || r.id.toUpperCase() === normalized
  );

  if (rosterMatch) {
    const baseLessons = mockChildrenProfiles[0].lessons;
    const newChild: ChildProfile = {
      id: rosterMatch.id,
      nameEn: rosterMatch.nameEn,
      nameAr: rosterMatch.nameAr,
      age: rosterMatch.age,
      gradeEn: rosterMatch.gradeEn,
      gradeAr: rosterMatch.gradeAr,
      avatarUrl: rosterMatch.avatarUrl,
      points: rosterMatch.points,
      rank: rosterMatch.rank,
      attendanceRate: rosterMatch.attendanceRate,
      screenTimeMinutes: 45,
      completedLessonsCount: 4,
      totalLessonsCount: 8,
      verseMemorizedCount: 4,
      pendingRewardsCount: 0,
      lessons: baseLessons.slice(0, 4),
      linkCode: rosterMatch.linkCode,
      parentId,
      isRealAccount: true,
      studentId: rosterMatch.id,
      dailyScreenTimeLimitMinutes: 60,
      parentBlessingMessage: 'ربنا يباركك ويحفظك في كنيسته المقدسة دائماً!',
      parentBlessingDate: new Date().toISOString()
    };

    const updatedList = [newChild, ...currentChildren];
    saveLinkedChildren(parentId, updatedList);
    if (parentEmail && parentEmail !== parentId) {
      saveLinkedChildren(parentEmail, updatedList);
    }

    // Persist relationship in Supabase user_relationships & profiles tables
    linkParentAndChildInSupabase(parentId, newChild.id, newChild.linkCode).catch(e => {
      console.warn('Supabase link note:', e);
    });

    window.dispatchEvent(new CustomEvent('church:parent_linked', { detail: { parentId, parentName, child: newChild } }));

    return { success: true, child: newChild };
  }

  // 3. Check cached student accounts in local storage
  try {
    const cachedKeys = ['church_auth_user', 'church_guest_user'];
    for (const ck of cachedKeys) {
      const rawUser = localStorage.getItem(ck);
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (u && u.role === 'student') {
          const uCode = getOrCreateChildLinkCode(u).toUpperCase();
          if (uCode === normalized || u.id.toUpperCase() === normalized) {
            const newChild: ChildProfile = {
              id: u.id,
              nameEn: u.fullName,
              nameAr: u.fullName,
              age: 9,
              gradeEn: u.grade || '4th Grade',
              gradeAr: u.grade || 'الصف الرابع',
              avatarUrl: u.avatarUrl || DEFAULT_STUDENT_AVATAR,
              points: u.points || 500,
              rank: 3,
              attendanceRate: 95,
              screenTimeMinutes: Math.round((u.screenTimeSeconds || 0) / 60),
              completedLessonsCount: 3,
              totalLessonsCount: 8,
              verseMemorizedCount: 3,
              pendingRewardsCount: 0,
              lessons: mockChildrenProfiles[0].lessons.slice(0, 3),
              linkCode: uCode,
              parentId,
              isRealAccount: true,
              studentId: u.id,
              dailyScreenTimeLimitMinutes: 60,
              parentBlessingMessage: 'بركة الرب تحفظك دائماً!',
              parentBlessingDate: new Date().toISOString()
            };
            const updatedList = [newChild, ...currentChildren];
            saveLinkedChildren(parentId, updatedList);
            if (parentEmail && parentEmail !== parentId) {
              saveLinkedChildren(parentEmail, updatedList);
            }
            linkParentAndChildInSupabase(parentId, newChild.id, newChild.linkCode).catch(() => {});
            window.dispatchEvent(new CustomEvent('church:parent_linked', { detail: { parentId, parentName, child: newChild } }));
            return { success: true, child: newChild };
          }
        }
      }
    }
  } catch (e) {}

  return { 
    success: false, 
    error: `لم يتم العثور على طفل مسجل بالرمز السري "${normalized}". يرجى التأكد من الرمز السري من شاشة حساب طفلك في التطبيق (مثال: ST-4921) أو اطلب من طفلك إرسال رابط الربط المباشر.` 
  };
}

/**
 * Asynchronously link child by code or link.
 * First checks local active session, Sunday School roster, and local cache (preserving Demo/Guest Mode).
 * If not found, checks real Supabase user_relationships and profiles.
 */
export async function linkChildByCodeAsync(
  parentId: string = 'default',
  parentName: string = 'Parent Guardian',
  parentEmail: string = 'parent@church.org',
  inputCodeOrEmail: string,
  activeStudentUser?: User | null
): Promise<{ success: boolean; child?: ChildProfile; error?: string }> {
  const isAuthenticatedParent = activeStudentUser?.role === 'parent' && Boolean(activeStudentUser.id);
  const localRes = isAuthenticatedParent
    ? { success: false, error: 'Authenticated family linking is unavailable until the server-side verification endpoint is configured.' }
    : linkChildByCode(parentId, parentName, parentEmail, inputCodeOrEmail, activeStudentUser);
  if (!isAuthenticatedParent && localRes.success) return localRes;

  const normalized = extractSecretCodeFromInput(inputCodeOrEmail);
  if (!normalized) return localRes;

  // 2. Query Supabase user_relationships + profiles
  try {
    const studentProfile = await findStudentByLinkCodeInSupabase(normalized);
    if (studentProfile && studentProfile.id) {
      const relationshipResult = await linkParentAndChildInSupabase(parentId, studentProfile.id, normalized);
      if (!relationshipResult.success) {
        return {
          success: false,
          error: relationshipResult.error || 'The verified family relationship could not be saved.'
        };
      }
      const currentChildren = getLinkedChildren(parentId, activeStudentUser);
      const alreadyLinked = currentChildren.find(
        c => c.id === studentProfile.id || c.studentId === studentProfile.id
      );
      if (alreadyLinked) {
        return { success: false, error: 'هذا التلميذ مرتبط بالفعل بحسابك العائلي / This child is already linked to your account.' };
      }

      const studentMinutes = Math.round((studentProfile.screen_time_seconds || 0) / 60);
      const newChild: ChildProfile = {
        id: studentProfile.id,
        nameEn: studentProfile.name,
        nameAr: studentProfile.name,
        age: 9,
        gradeEn: studentProfile.grade || '4th Grade',
        gradeAr: studentProfile.grade || 'الصف الرابع الابتدائي',
        avatarUrl: studentProfile.avatar || DEFAULT_STUDENT_AVATAR,
        points: studentProfile.points ?? 0,
        rank: 3,
        attendanceRate: 98,
        screenTimeMinutes: Math.max(15, studentMinutes),
        completedLessonsCount: 0,
        totalLessonsCount: 8,
        verseMemorizedCount: 0,
        pendingRewardsCount: 0,
        lessons: mockChildrenProfiles[0]?.lessons?.slice(0, 3) || [],
        linkCode: normalized,
        parentId,
        isRealAccount: true,
        studentId: studentProfile.id,
        dailyScreenTimeLimitMinutes: 60,
        parentBlessingMessage: 'بركة الرب تحفظك وتملأ قلبك حكمة ونوراً!',
        parentBlessingDate: new Date().toISOString()
      };

      const updatedList = [newChild, ...currentChildren];
      saveLinkedChildren(parentId, updatedList);
      if (parentEmail && parentEmail !== parentId) {
        saveLinkedChildren(parentEmail, updatedList);
      }

      window.dispatchEvent(new CustomEvent('church:parent_linked', { detail: { parentId, parentName, child: newChild } }));

      return { success: true, child: newChild };
    }
  } catch (err) {
    console.warn('Supabase link lookup caught:', err);
  }

  return localRes;
}

/**
 * Direct 1-click link from Sunday School roster
 */
export function linkChildFromRoster(
  parentId: string = 'default',
  parentName: string = 'Parent Guardian',
  parentEmail: string = 'parent@church.org',
  rosterChildId: string,
  activeStudentUser?: User | null
): { success: boolean; child?: ChildProfile; error?: string } {
  const rosterItem = sundaySchoolRoster.find(r => r.id === rosterChildId);
  if (!rosterItem) return { success: false, error: 'Student not found in roster.' };
  return linkChildByCode(parentId, parentName, parentEmail, rosterItem.linkCode, activeStudentUser);
}

/**
 * Register and link a completely new child manually
 */
export function createAndLinkNewChild(
  parentId: string = 'default',
  parentName: string = 'Parent Guardian',
  data: {
    nameEn: string;
    nameAr: string;
    age: number;
    gradeEn: string;
    gradeAr: string;
    avatarUrl?: string;
  }
): { success: boolean; child: ChildProfile } {
  const currentChildren = getLinkedChildren(parentId);
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const linkCode = `CH-${randomNum}`;
  const newId = `child-${Date.now()}`;

  const newChild: ChildProfile = {
    id: newId,
    nameEn: data.nameEn.trim(),
    nameAr: data.nameAr.trim(),
    age: data.age || 8,
    gradeEn: data.gradeEn || '3rd Grade Elementary',
    gradeAr: data.gradeAr || 'الصف الثالث الابتدائي',
    avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.nameEn}`,
    points: 100,
    rank: currentChildren.length + 1,
    attendanceRate: 100,
    screenTimeMinutes: 0,
    completedLessonsCount: 0,
    totalLessonsCount: 8,
    verseMemorizedCount: 0,
    pendingRewardsCount: 0,
    lessons: mockChildrenProfiles[0].lessons.map(l => ({ ...l, status: 'assigned', pointsEarned: 0, quizScore: undefined })),
    linkCode,
    parentId,
    isRealAccount: true,
    dailyScreenTimeLimitMinutes: 60,
    parentBlessingMessage: 'أهلاً بك في تطبيق مدارس الأحد! ربنا يبارك حياتك ونموك الروحي.',
    parentBlessingDate: new Date().toISOString()
  };

  const updatedList = [newChild, ...currentChildren];
  saveLinkedChildren(parentId, updatedList);

  window.dispatchEvent(new CustomEvent('church:parent_linked', { detail: { parentId, parentName, child: newChild } }));

  return { success: true, child: newChild };
}

/**
 * Unlink a child from parent account
 */
export function unlinkChild(arg1: string = 'default', arg2?: string): ChildProfile[] {
  let parentId = 'default';
  let childId = arg1;
  if (arg2) {
    if (arg1.includes('@') || arg1.startsWith('parent-')) {
      parentId = arg1;
      childId = arg2;
    } else {
      childId = arg1;
      parentId = arg2;
    }
  }
  const currentChildren = getLinkedChildren(parentId);
  const updated = currentChildren.filter(c => c.id !== childId && c.studentId !== childId);
  saveLinkedChildren(parentId, updated);
  window.dispatchEvent(new CustomEvent('church:child_unlinked', { detail: { parentId, childId } }));
  return updated;
}

/**
 * Send an encouraging parental blessing to child
 */
export function sendParentBlessing(arg1: string, arg2: string, arg3?: string): boolean {
  let childId = arg1;
  let message = arg2;
  let parentId = arg3 || 'default';
  if (arg3 !== undefined && (arg1.includes('@') || arg1.startsWith('parent-'))) {
    parentId = arg1;
    childId = arg2;
    message = arg3;
  }
  if (!message || !message.trim()) return false;
  const list = getLinkedChildren(parentId);
  const now = new Date().toISOString();

  let found = false;
  const updated = list.map(c => {
    if (c.id === childId || c.studentId === childId) {
      found = true;
      return {
        ...c,
        parentBlessingMessage: message.trim(),
        parentBlessingDate: now
      };
    }
    return c;
  });

  if (found) {
    saveLinkedChildren(parentId, updated);

    // Also update student localStorage if matching active student
    try {
      const savedGuest = localStorage.getItem('church_guest_user');
      if (savedGuest) {
        const u = JSON.parse(savedGuest);
        if (u.id === childId) {
          u.parentBlessingMessage = message.trim();
          u.parentBlessingDate = now;
          localStorage.setItem('church_guest_user', JSON.stringify(u));
        }
      }
      const savedAuth = localStorage.getItem('church_auth_user');
      if (savedAuth) {
        const u = JSON.parse(savedAuth);
        if (u.id === childId) {
          u.parentBlessingMessage = message.trim();
          u.parentBlessingDate = now;
          localStorage.setItem('church_auth_user', JSON.stringify(u));
        }
      }
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('church:parent_blessing_sent', { detail: { childId, message, date: now } }));
  }

  return found;
}

/**
 * Set daily screen time limit for a child
 */
export function setChildScreenTimeLimit(arg1: string, arg2: string | number, arg3?: string | number): boolean {
  let childId = arg1;
  let limitMinutes = typeof arg2 === 'number' ? arg2 : 60;
  let parentId = typeof arg3 === 'string' ? arg3 : 'default';

  if (typeof arg1 === 'string' && (arg1.includes('@') || arg1.startsWith('parent-')) && typeof arg2 === 'string') {
    parentId = arg1;
    childId = arg2;
    limitMinutes = typeof arg3 === 'number' ? arg3 : 60;
  }

  const list = getLinkedChildren(parentId);
  let found = false;
  const updated = list.map(c => {
    if (c.id === childId || c.studentId === childId) {
      found = true;
      return {
        ...c,
        dailyScreenTimeLimitMinutes: limitMinutes
      };
    }
    return c;
  });

  if (found) {
    saveLinkedChildren(parentId, updated);
    // Also update student localStorage if matching active student
    try {
      const savedGuest = localStorage.getItem('church_guest_user');
      if (savedGuest) {
        const u = JSON.parse(savedGuest);
        if (u.id === childId || u.studentId === childId) {
          u.dailyScreenTimeLimitMinutes = limitMinutes;
          localStorage.setItem('church_guest_user', JSON.stringify(u));
        }
      }
      const savedAuth = localStorage.getItem('church_auth_user');
      if (savedAuth) {
        const u = JSON.parse(savedAuth);
        if (u.id === childId || u.studentId === childId) {
          u.dailyScreenTimeLimitMinutes = limitMinutes;
          localStorage.setItem('church_auth_user', JSON.stringify(u));
        }
      }
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('church:screen_time_limit_updated', { detail: { childId, limitMinutes } }));
  }

  return found;
}

/**
 * Synchronize current active student session with parent's linked records
 */
export function syncStudentSessionToParent(student: Partial<User>) {
  if (!student) return;
  const parentId = student.parentEmail || student.parentId || 'default';
  const children = getLinkedChildren(parentId);
  const studentId = student.id || 'student-guest';

  let found = false;
  const updated = children.map(c => {
    if (c.studentId === studentId || c.id === studentId) {
      found = true;
      return {
        ...c,
        nameEn: student.fullName || c.nameEn,
        nameAr: student.fullName || c.nameAr,
        points: student.points !== undefined ? student.points : c.points,
        avatarUrl: student.avatarUrl || c.avatarUrl,
        gradeEn: student.grade || c.gradeEn,
        dailyScreenTimeLimitMinutes: student.dailyScreenTimeLimitMinutes !== undefined ? student.dailyScreenTimeLimitMinutes : c.dailyScreenTimeLimitMinutes
      };
    }
    return c;
  });

  if (!found && student.isLinkedToParent) {
    const code = student.linkCode || 'ST-4921';
    linkChildByCode(parentId, student.parentName || 'Parent', student.parentEmail || 'parent@church.org', code, student as User);
    return;
  }

  saveLinkedChildren(parentId, updated);
}

// ----------------- Reward Requests Synchronization -----------------

export function getSyncedRewardRequests(parentId: string = 'default'): RewardRequest[] {
  try {
    const raw = localStorage.getItem(REWARD_REQUESTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}

  // Initial mock requests
  const defaults: RewardRequest[] = [
    {
      id: 'req-1',
      childId: 'c1',
      childNameEn: 'Mina Emad',
      childNameAr: 'مينا عماد',
      rewardTitleEn: 'Church Book & Cross Bookmark',
      rewardTitleAr: 'كتاب كنسي وفاصل صليب ملون',
      pointsCost: 200,
      icon: '📖',
      status: 'pending',
      requestedAt: '2026-09-17'
    },
    {
      id: 'req-2',
      childId: 'c2',
      childNameEn: 'Mary Emad',
      childNameAr: 'مريم عماد',
      rewardTitleEn: 'Coptic Icon Coloring Kit',
      rewardTitleAr: 'مجموعة تلوين الأيقونات القبطية',
      pointsCost: 150,
      icon: '🎨',
      status: 'approved',
      requestedAt: '2026-09-15'
    }
  ];

  try {
    localStorage.setItem(REWARD_REQUESTS_KEY, JSON.stringify(defaults));
  } catch (e) {}

  return defaults;
}

export function saveSyncedRewardRequests(requests: RewardRequest[]) {
  try {
    localStorage.setItem(REWARD_REQUESTS_KEY, JSON.stringify(requests));
    window.dispatchEvent(new CustomEvent('church:reward_requests_updated', { detail: { requests } }));
  } catch (e) {}
}

export function addRewardRequest(request: Omit<RewardRequest, 'id' | 'status' | 'requestedAt'>): RewardRequest {
  const current = getSyncedRewardRequests();
  const newReq: RewardRequest = {
    ...request,
    id: 'req-' + Date.now(),
    status: 'pending',
    requestedAt: new Date().toISOString().split('T')[0]
  };

  const updated = [newReq, ...current];
  saveSyncedRewardRequests(updated);

  window.dispatchEvent(new CustomEvent('church:reward_requested', { detail: { request: newReq } }));

  return newReq;
}

export function updateRewardRequestStatus(
  requestId: string,
  newStatus: 'approved' | 'denied',
  parentNote?: string
): RewardRequest[] {
  const current = getSyncedRewardRequests();
  const updated = current.map(r => {
    if (r.id === requestId) {
      return {
        ...r,
        status: newStatus,
        parentNote: parentNote || r.parentNote
      };
    }
    return r;
  });

  saveSyncedRewardRequests(updated);

  window.dispatchEvent(new CustomEvent('church:reward_decision', { detail: { requestId, status: newStatus } }));

  return updated;
}

export const getRewardRequests = getSyncedRewardRequests;

async function getAuthHeader(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (_) {}
  }
  return headers;
}

/**
 * Fetch authoritative linked children for the authenticated parent.
 */
export async function getAuthoritativeParentChildren(): Promise<{
  data: Array<{
    id: string;
    name: string;
    grade: string;
    classGroupId: string;
    avatarUrl: string;
    points: number | null;
  }> | null;
  error: Error | null;
}> {
  const headers = await getAuthHeader();
  try {
    const res = await fetch('/api/church/parent/children', {
      method: 'GET',
      headers
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        data: null,
        error: new Error(json?.message || json?.error || `HTTP ${res.status}: Failed to fetch parent children`)
      };
    }
    if (!Array.isArray(json.children)) {
      return { data: null, error: new Error('Parent children response was invalid') };
    }
    return { data: json.children, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Network error') };
  }
}

export async function getAuthoritativeChurchEvents(): Promise<{
  data: ChurchEventNotification[] | null;
  error: Error | null;
}> {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured') };
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) return { data: null, error: sessionError };
    if (!sessionData.session) return { data: null, error: new Error('Sign in to view church events') };

    const { data, error } = await supabase
      .from('church_events')
      .select('id, title_en, title_ar, type, date_time, location_en, location_ar, description_en, description_ar')
      .gte('date_time', new Date().toISOString())
      .order('date_time', { ascending: true });
    if (error) return { data: null, error: new Error(`Could not load church events: ${error.message}`) };

    return {
      data: (data || []).map(event => {
        const eventDate = new Date(event.date_time);
        const cairoDateParts = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Africa/Cairo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).formatToParts(eventDate);
        const cairoDate = `${cairoDateParts.find(part => part.type === 'year')?.value}-${cairoDateParts.find(part => part.type === 'month')?.value}-${cairoDateParts.find(part => part.type === 'day')?.value}`;
        const category: ChurchEventNotification['category'] =
          event.type === 'sunday_school' ? 'sunday_school' :
          event.type === 'hymns' ? 'hymn' :
          event.type === 'parent_meeting' || event.type === 'service' ? 'family' : 'liturgy';
        return {
          id: event.id,
          titleEn: event.title_en,
          titleAr: event.title_ar,
          category,
          date: cairoDate,
          dateTime: eventDate.toISOString(),
          timeEn: eventDate.toLocaleTimeString('en-EG', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit' }),
          timeAr: eventDate.toLocaleTimeString('ar-EG', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit' }),
          locationEn: event.location_en || '',
          locationAr: event.location_ar || '',
          descriptionEn: event.description_en || '',
          descriptionAr: event.description_ar || '',
          priority: event.type === 'feast' ? 'feast' : 'normal',
          isRead: false
        };
      }),
      error: null
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Failed to load church events') };
  }
}

/**
 * Fetch authoritative read-only learning review for an authorized linked child.
 */
export async function getChildLearningReview(
  studentId: string
): Promise<{ data: StudentLearningReviewData | null; error: Error | null }> {
  if (!studentId) {
    return { data: null, error: new Error('studentId is required') };
  }
  const headers = await getAuthHeader();
  try {
    const res = await fetch(`/api/church/parent/child-learning-review/${encodeURIComponent(studentId)}`, {
      method: 'GET',
      headers
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        data: null,
        error: new Error(json?.message || json?.error || `HTTP ${res.status}: Failed to fetch child learning review`)
      };
    }
    return {
      data: {
        student: json.student,
        summary: json.summary,
        lessons: json.lessons || [],
        needsReviewItems: json.needsReviewItems || [],
        recentActivity: json.recentActivity || []
      },
      error: null
    };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error('Network error loading child learning review') };
  }
}
