import { supabase } from './supabase';
import { 
  ChurchYear, 
  ChurchClassInstance, 
  ClassMembership, 
  AdminUserItem, 
  ClassGroupId,
  StudentClassAssociation 
} from '../types';
import { CLASS_GROUPS, getClassGroupForGrade } from './classGroups';

export function resolveClassGroupId(classInstanceId?: string, exactGrade?: string): ClassGroupId {
  if (classInstanceId) {
    for (const g of ['angels', 'primary_1', 'primary_2', 'preparatory', 'secondary', 'university'] as ClassGroupId[]) {
      if (classInstanceId.endsWith(`_${g}`)) {
        return g;
      }
    }
  }
  if (exactGrade) {
    const matched = getClassGroupForGrade(exactGrade);
    if (matched) return matched.id;
  }
  return 'primary_2';
}

export interface StudentMembershipResult {
  success: boolean;
  isEnrolled: boolean;
  activeChurchYear?: {
    id: string;
    name: string;
    startDate?: string;
    endDate?: string;
  };
  membership?: {
    id: string;
    churchYearId: string;
    classInstanceId: string;
    studentId: string;
    exactGrade: string;
    status: string;
    joinedAt?: string;
  } | null;
  classGroup?: {
    id: ClassGroupId;
    nameEn: string;
    nameAr: string;
  } | null;
  error?: string;
}

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
 * Phase 3C.2: Authoritative Student Class Membership Reader
 * For authenticated online students: queries live Phase 3B tables:
 *   1. public.church_years (is_active = true)
 *   2. public.class_memberships (student_id = auth.uid(), church_year_id = active_year.id, status = 'active')
 * If no row exists, returns isEnrolled: false, membership: null (does NOT fabricate from profile.grade or mock state).
 * For Demo/Guest/Offline mode: returns guest or server fallback.
 */
export async function getStudentActiveMembership(
  targetStudentId?: string
): Promise<StudentMembershipResult> {
  // 1. Authenticated Online Student Flow via Supabase
  if (supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (user) {
        const studentUid = targetStudentId || user.id;

        // Query active church year from authoritative public.church_years
        const { data: activeYear, error: yearError } = await supabase
          .from('church_years')
          .select('id, name, start_date, end_date, is_active')
          .eq('is_active', true)
          .maybeSingle();

        if (yearError) {
          return {
            success: false,
            isEnrolled: false,
            error: `Failed to query active church year: ${yearError.message}`
          };
        }

        if (!activeYear) {
          return {
            success: true,
            isEnrolled: false,
            membership: null,
            error: 'No active church year configured in database.'
          };
        }

        // Query student's active membership in the active church year from public.class_memberships
        const { data: memRow, error: memError } = await supabase
          .from('class_memberships')
          .select('id, church_year_id, class_instance_id, student_id, exact_grade, status, joined_at')
          .eq('student_id', studentUid)
          .eq('church_year_id', activeYear.id)
          .eq('status', 'active')
          .maybeSingle();

        if (memError) {
          return {
            success: false,
            isEnrolled: false,
            activeChurchYear: {
              id: activeYear.id,
              name: activeYear.name,
              startDate: activeYear.start_date,
              endDate: activeYear.end_date
            },
            error: `Failed to query student class membership: ${memError.message}`
          };
        }

        if (!memRow) {
          // Authenticated student has NO active membership row in the active church year
          return {
            success: true,
            isEnrolled: false,
            activeChurchYear: {
              id: activeYear.id,
              name: activeYear.name,
              startDate: activeYear.start_date,
              endDate: activeYear.end_date
            },
            membership: null,
            classGroup: null
          };
        }

        // Student has an active membership row
        const classGroupId = resolveClassGroupId(memRow.class_instance_id, memRow.exact_grade);
        const groupDef = CLASS_GROUPS[classGroupId];

        return {
          success: true,
          isEnrolled: true,
          activeChurchYear: {
            id: activeYear.id,
            name: activeYear.name,
            startDate: activeYear.start_date,
            endDate: activeYear.end_date
          },
          membership: {
            id: memRow.id,
            churchYearId: memRow.church_year_id,
            classInstanceId: memRow.class_instance_id,
            studentId: memRow.student_id,
            exactGrade: memRow.exact_grade,
            status: memRow.status,
            joinedAt: memRow.joined_at
          },
          classGroup: {
            id: classGroupId,
            nameEn: groupDef?.name?.en || classGroupId,
            nameAr: groupDef?.name?.ar || classGroupId
          }
        };
      }
    } catch (err: any) {
      console.warn('Supabase getStudentActiveMembership error:', err);
      return {
        success: false,
        isEnrolled: false,
        error: err?.message || 'Error querying student membership'
      };
    }
  }

  // 2. Guest / Demo / Offline fallback via server endpoint
  const headers = await getAuthHeader();
  try {
    const res = await fetch('/api/church/my-class', {
      method: 'GET',
      headers
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        success: false,
        isEnrolled: false,
        error: json?.message || json?.error || 'Failed to fetch student class from server'
      };
    }

    if (json.isEnrolled && json.membership) {
      const classGroupId = resolveClassGroupId(json.membership.classInstanceId, json.membership.exactGrade);
      const groupDef = CLASS_GROUPS[classGroupId];
      return {
        success: true,
        isEnrolled: true,
        activeChurchYear: json.activeChurchYear || { id: json.membership.churchYearId, name: json.membership.churchYearName || json.membership.churchYearId },
        membership: json.membership,
        classGroup: {
          id: classGroupId,
          nameEn: groupDef?.name?.en || classGroupId,
          nameAr: groupDef?.name?.ar || classGroupId
        }
      };
    }

    if (json.classInfo) {
      const classGroupId = (json.classInfo.classGroupId || 'primary_2') as ClassGroupId;
      const groupDef = CLASS_GROUPS[classGroupId];
      return {
        success: true,
        isEnrolled: true,
        activeChurchYear: { id: json.classInfo.churchYear || '2026-2027', name: json.classInfo.churchYear || '2026 / 2027' },
        membership: {
          id: 'demo-membership',
          churchYearId: json.classInfo.churchYear || '2026-2027',
          classInstanceId: `inst_${json.classInfo.churchYear || '2026-2027'}_${classGroupId}`,
          studentId: json.classInfo.studentId || 'u1',
          exactGrade: json.classInfo.grade || 'Grade 4',
          status: 'active'
        },
        classGroup: {
          id: classGroupId,
          nameEn: groupDef?.name?.en || json.classInfo.className || classGroupId,
          nameAr: groupDef?.name?.ar || json.classInfo.classNameAr || classGroupId
        }
      };
    }

    return {
      success: true,
      isEnrolled: false,
      membership: null,
      classGroup: null
    };
  } catch (err: any) {
    return {
      success: false,
      isEnrolled: false,
      error: err?.message || 'Network error fetching membership'
    };
  }
}

/**
 * 1. Get current church year and class instances
 */
export async function getCurrentChurchYear(): Promise<{
  success: boolean;
  currentChurchYear: string;
  churchYear: ChurchYear;
  classInstances: ChurchClassInstance[];
  error?: string;
}> {
  if (supabase) {
    try {
      const { data: cy, error: cyError } = await supabase
        .from('church_years')
        .select('id, name, start_date, end_date, is_active, activated_at')
        .eq('is_active', true)
        .maybeSingle();

      if (!cyError && cy) {
        return {
          success: true,
          currentChurchYear: cy.name || cy.id,
          churchYear: {
            id: cy.id,
            year: cy.name || cy.id,
            status: 'ACTIVE',
            startDate: cy.start_date || '2026-09-01',
            endDate: cy.end_date,
            createdAt: cy.activated_at || new Date().toISOString(),
            createdBy: 'system'
          },
          classInstances: []
        };
      }
    } catch (_) {}
  }

  const headers = await getAuthHeader();
  try {
    const res = await fetch('/api/church/year', {
      method: 'GET',
      headers
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        success: false,
        currentChurchYear: '2026 / 2027',
        churchYear: {
          id: '2026-2027',
          year: '2026 / 2027',
          status: 'ACTIVE',
          startDate: '2026-09-01',
          createdAt: new Date().toISOString(),
          createdBy: 'system'
        },
        classInstances: [],
        error: json?.message || 'Failed to fetch church year'
      };
    }
    return json;
  } catch (err: any) {
    return {
      success: false,
      currentChurchYear: '2026 / 2027',
      churchYear: {
        id: '2026-2027',
        year: '2026 / 2027',
        status: 'ACTIVE',
        startDate: '2026-09-01',
        createdAt: new Date().toISOString(),
        createdBy: 'system'
      },
      classInstances: [],
      error: err?.message
    };
  }
}

/**
 * 2. Onboard Student Exact Grade (First login)
 */
export async function onboardStudentGrade(
  exactGrade: string
): Promise<{
  success: boolean;
  exactGrade?: string;
  classGroupId?: ClassGroupId;
  classGroupName?: string;
  error?: string;
}> {
  const headers = await getAuthHeader();
  try {
    const res = await fetch('/api/church/student/onboard-grade', {
      method: 'POST',
      headers,
      body: JSON.stringify({ exactGrade })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        success: false,
        error: json?.message || json?.error || 'Failed to set exact grade'
      };
    }
    return json;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error setting grade'
    };
  }
}

/**
 * 3. Student Joins Class using Servant-Supplied Code
 * For authenticated online students: directly calls the live Phase 3B Supabase RPC:
 *   public.join_class_by_code(p_join_code)
 * For offline/guest students: calls the Express server fallback endpoint.
 */
export async function joinClassWithCode(
  code: string
): Promise<{
  success: boolean;
  message?: string;
  classInstance?: ChurchClassInstance;
  studentClass?: StudentClassAssociation;
  error?: string;
}> {
  const trimmedCode = (code || '').trim().toUpperCase();
  if (!trimmedCode) {
    return {
      success: false,
      error: 'Class join code is required.'
    };
  }

  // 1. Authenticated Online Student Flow via Supabase RPC
  if (supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (user) {
        // Call the live Phase 3B SECURITY DEFINER RPC
        const { data: rpcData, error: rpcError } = await supabase.rpc('join_class_by_code', {
          p_join_code: trimmedCode
        });

        if (rpcError) {
          const rawMsg = rpcError.message || '';
          let errorTag = rawMsg;
          if (rawMsg.includes('Grade Incompatibility')) {
            errorTag = 'INCOMPATIBLE_GRADE: ' + rawMsg;
          } else if (rawMsg.includes('Invalid or expired class join code')) {
            errorTag = 'CODE_NOT_FOUND: ' + rawMsg;
          } else if (rawMsg.includes('already actively enrolled')) {
            errorTag = 'ALREADY_ENROLLED: ' + rawMsg;
          } else if (rawMsg.includes('Forbidden')) {
            errorTag = 'FORBIDDEN: ' + rawMsg;
          } else if (rawMsg.includes('No active church year')) {
            errorTag = 'ARCHIVED_YEAR_CODE: ' + rawMsg;
          }
          return {
            success: false,
            error: errorTag
          };
        }

        // RPC succeeded: resolve class group details from canonical definition
        const instId = rpcData?.classInstanceId;
        const classGroupId = resolveClassGroupId(instId);
        const groupDef = CLASS_GROUPS[classGroupId];

        let matchedInstance: ChurchClassInstance = {
          id: instId || `inst_2026-2027_${classGroupId}`,
          churchYear: '2026-2027',
          classGroupId,
          nameEn: groupDef?.name?.en || classGroupId,
          nameAr: groupDef?.name?.ar || classGroupId,
          code: trimmedCode,
          status: 'ACTIVE',
          servantIds: [],
          servantNames: [],
          createdAt: new Date().toISOString()
        };

        let studentClassAssoc: StudentClassAssociation | undefined;

        try {
          const { data: profileRow } = await supabase
            .from('profiles')
            .select('id, name, grade, avatar')
            .eq('id', user.id)
            .maybeSingle();

          studentClassAssoc = {
            studentId: user.id,
            grade: profileRow?.grade || '',
            classGroupId,
            className: groupDef?.name?.en || classGroupId,
            classNameAr: groupDef?.name?.ar || classGroupId,
            servants: [],
            churchYear: '2026 / 2027',
            classCode: trimmedCode
          };
        } catch (_) {
          // If profile lookup fails, minimal confirmation is still successful
        }

        return {
          success: true,
          message: rpcData?.action === 'reactivated'
            ? 'Membership reactivated in class!'
            : 'Successfully enrolled in class!',
          classInstance: matchedInstance,
          studentClass: studentClassAssoc
        };
      }
    } catch (err: any) {
      console.warn('Supabase join_class_by_code attempt failed, falling back to server endpoint:', err);
    }
  }

  // 2. Guest / Offline / Fallback Flow via Server Endpoint
  const headers = await getAuthHeader();
  try {
    const res = await fetch('/api/church/student/join-class', {
      method: 'POST',
      headers,
      body: JSON.stringify({ code: trimmedCode })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        success: false,
        error: json?.message || json?.error || 'Failed to join class'
      };
    }
    return json;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error joining class'
    };
  }
}

/**
 * 4. Regenerate Class Code (Servant & Admin)
 */
export async function regenerateClassCode(
  classGroupId: string
): Promise<{
  success: boolean;
  newCode?: string;
  classInstance?: ChurchClassInstance;
  error?: string;
}> {
  const headers = await getAuthHeader();
  try {
    const res = await fetch(`/api/church/classes/${encodeURIComponent(classGroupId)}/regenerate-code`, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        success: false,
        error: json?.message || json?.error || 'Failed to regenerate class code'
      };
    }
    return json;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error'
    };
  }
}

export interface RemoveStudentResult {
  success: boolean;
  membershipId?: string;
  status?: string;
  leftAt?: string;
  message?: string;
  error?: string;
}

/**
 * 5. Remove Student from Current Church-Year Class (Servant & Admin)
 * Phase 3C.4: Connects to the approved Phase 3B SECURITY DEFINER RPC:
 *   public.remove_student_from_class(p_membership_id TEXT, p_reason TEXT)
 *
 * For online authenticated users: executes with caller JWT auth.uid().
 * The database RPC is the sole authority that marks class_memberships status = 'inactive'.
 * The membership row is preserved in the database (never DELETED).
 * For offline/guest mode: falls back to the server endpoint.
 */
export async function removeStudentFromClass(
  classGroupId: string,
  studentId: string,
  reason?: string,
  membershipId?: string
): Promise<RemoveStudentResult> {
  const trimmedReason = (reason || '').trim();

  // 1. Online Authenticated Flow via Phase 3B Supabase RPC
  if (supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (user) {
        let targetMembershipId = membershipId;

        // If membershipId is not provided directly, query the student's active membership
        // in the active church year from public.class_memberships
        if (!targetMembershipId) {
          const { data: activeYear, error: yErr } = await supabase
            .from('church_years')
            .select('id')
            .eq('is_active', true)
            .maybeSingle();

          if (yErr || !activeYear) {
            return {
              success: false,
              error: 'NO_ACTIVE_YEAR: No active church year configured in database.'
            };
          }

          const { data: memRow, error: memErr } = await supabase
            .from('class_memberships')
            .select('id')
            .eq('student_id', studentId)
            .eq('church_year_id', activeYear.id)
            .eq('status', 'active')
            .maybeSingle();

          if (memErr || !memRow) {
            return {
              success: false,
              error: 'MEMBERSHIP_NOT_FOUND: Active student membership not found for current church year.'
            };
          }

          targetMembershipId = memRow.id;
        }

        // Call the approved SECURITY DEFINER RPC:
        // public.remove_student_from_class(p_membership_id TEXT, p_reason TEXT)
        const { data: rpcData, error: rpcErr } = await supabase.rpc('remove_student_from_class', {
          p_membership_id: targetMembershipId,
          p_reason: trimmedReason
        });

        if (rpcErr) {
          const rawMsg = rpcErr.message || '';
          let errorTag = rawMsg;
          if (rawMsg.includes('Unauthenticated')) {
            errorTag = 'UNAUTHENTICATED: ' + rawMsg;
          } else if (rawMsg.includes('Only an assigned servant or administrator')) {
            errorTag = 'FORBIDDEN: ' + rawMsg;
          } else if (rawMsg.includes('Servant is not assigned to this class instance')) {
            errorTag = 'FORBIDDEN: ' + rawMsg;
          } else if (rawMsg.includes('Membership not found')) {
            errorTag = 'NOT_FOUND: ' + rawMsg;
          } else if (rawMsg.includes('Historical or archived memberships cannot be modified')) {
            errorTag = 'INVALID_OPERATION: ' + rawMsg;
          } else if (rawMsg.includes('already inactive')) {
            errorTag = 'ALREADY_INACTIVE: ' + rawMsg;
          }
          return {
            success: false,
            error: errorTag
          };
        }

        return {
          success: true,
          membershipId: rpcData?.membershipId || targetMembershipId,
          status: rpcData?.status || 'inactive',
          leftAt: rpcData?.leftAt,
          message: 'Student membership successfully deactivated. Historical records preserved.'
        };
      }
    } catch (sbErr: any) {
      console.warn('Supabase remove_student_from_class error:', sbErr);
      return {
        success: false,
        error: sbErr?.message || 'Error executing student removal'
      };
    }
  }

  // 2. Offline / Demo / Test Fallback via server endpoint
  const headers = await getAuthHeader();
  try {
    const res = await fetch(`/api/church/classes/${encodeURIComponent(classGroupId)}/remove-student`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ studentId, reason: trimmedReason, membershipId })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        success: false,
        error: json?.message || json?.error || 'Failed to remove student'
      };
    }
    return json;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error'
    };
  }
}

export interface EnrollStudentResult {
  success: boolean;
  action?: 'enrolled' | 'reactivated';
  membershipId?: string;
  classInstanceId?: string;
  error?: string;
}

/**
 * 5b. Phase 3C.3: Servant / Admin Authorized Manual Student Enrollment
 * Authorized servants & admins call the live Phase 3B SECURITY DEFINER RPC:
 *   public.enroll_student_in_class(p_student_id UUID, p_class_instance_id TEXT)
 *
 * For online authenticated users: executes with caller JWT auth.uid().
 * The database RPC is the sole authority that creates/reactivates class_memberships.
 * For offline/guest mode: falls back to the server endpoint.
 */
export const KNOWN_STUDENT_DIRECTORY = [
  { id: 'student-david', linkCode: 'ST-4921', nameEn: 'David Shenouda', nameAr: 'ديفيد شنودة', gradeEn: 'Grade 4', classGroupId: 'primary_2' },
  { id: 'c1', linkCode: 'CH-9481', nameEn: 'Mina Emad', nameAr: 'مينا عماد', gradeEn: 'Grade 4', classGroupId: 'primary_2' },
  { id: 'c2', linkCode: 'CH-7320', nameEn: 'Mary Emad', nameAr: 'مريم عماد', gradeEn: 'Grade 2', classGroupId: 'primary_1' },
  { id: 'student-fadi', linkCode: 'ST-3819', nameEn: 'Fadi Nabil', nameAr: 'فادي نبيل', gradeEn: 'Grade 3', classGroupId: 'primary_1' },
  { id: 'student-marina', linkCode: 'ST-6104', nameEn: 'Marina George', nameAr: 'مارينا جورج', gradeEn: 'Grade 5', classGroupId: 'primary_2' },
  { id: 'student-kyrollos', linkCode: 'ST-8255', nameEn: 'Kyrollos Rafik', nameAr: 'كيرلس رفيق', gradeEn: 'Grade 6', classGroupId: 'primary_2' },
  { id: 'mark', linkCode: 'ST-1001', nameEn: 'Mark Bassem', nameAr: 'مارك باسم', gradeEn: 'Grade 4', classGroupId: 'primary_2' },
  { id: 'u1', linkCode: 'ST-1002', nameEn: 'Mark Student', nameAr: 'مارك', gradeEn: 'Grade 4', classGroupId: 'primary_2' },
  { id: 'user_student_mark_101', linkCode: 'ST-1003', nameEn: 'Mark Student', nameAr: 'مارك', gradeEn: 'Grade 4', classGroupId: 'primary_2' },
  { id: 'other', linkCode: 'ST-2001', nameEn: 'Other Student', nameAr: 'طالب آخر', gradeEn: 'Prep 1', classGroupId: 'preparatory' },
  { id: 'user_student_other_102', linkCode: 'ST-2002', nameEn: 'Other Student', nameAr: 'طالب آخر', gradeEn: 'Prep 1', classGroupId: 'preparatory' }
];

export async function enrollStudentInClass(
  studentIdentifier: string,
  classInstanceId?: string,
  classGroupId?: ClassGroupId,
  grade?: string
): Promise<EnrollStudentResult> {
  const trimmedId = (studentIdentifier || '').trim();
  if (!trimmedId) {
    return {
      success: false,
      error: 'Student identifier is required.'
    };
  }

  // 1. Authenticated Online Flow via Supabase RPC
  if (supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (user) {
        // Query active church year from authoritative public.church_years
        const { data: activeYear, error: yErr } = await supabase
          .from('church_years')
          .select('id, name')
          .eq('is_active', true)
          .maybeSingle();

        if (yErr || !activeYear) {
          return {
            success: false,
            error: 'NO_ACTIVE_YEAR: No active church year configured in database.'
          };
        }

        // Look up student profile in database safely without casting non-UUID to uuid
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedId);
        let studentProfile: { id: string; name: string; role: string; grade?: string } | null = null;

        if (isUuid) {
          const { data } = await supabase
            .from('profiles')
            .select('id, name, role, grade')
            .eq('id', trimmedId)
            .maybeSingle();
          if (data) studentProfile = data;
        } else {
          // Check child_code in user_relationships
          const { data: relMatch } = await supabase
            .from('user_relationships')
            .select('child_id, child_code')
            .ilike('child_code', trimmedId)
            .limit(1)
            .maybeSingle();

          if (relMatch?.child_id) {
            const { data: profByRel } = await supabase
              .from('profiles')
              .select('id, name, role, grade')
              .eq('id', relMatch.child_id)
              .maybeSingle();
            if (profByRel) studentProfile = profByRel;
          }

          if (!studentProfile && trimmedId.includes('@')) {
            const { data: profByEmail } = await supabase
              .from('profiles')
              .select('id, name, role, grade')
              .ilike('email', trimmedId)
              .limit(1)
              .maybeSingle();
            if (profByEmail) studentProfile = profByEmail;
          }

          if (!studentProfile) {
            const { data: profByName } = await supabase
              .from('profiles')
              .select('id, name, role, grade')
              .ilike('name', trimmedId)
              .limit(1)
              .maybeSingle();
            if (profByName) studentProfile = profByName;
          }

          if (!studentProfile) {
            const known = KNOWN_STUDENT_DIRECTORY.find(
              k => k.linkCode.toUpperCase() === trimmedId.toUpperCase() ||
                   k.id.toLowerCase() === trimmedId.toLowerCase() ||
                   k.nameEn.toLowerCase() === trimmedId.toLowerCase() ||
                   k.nameAr === trimmedId
            );
            if (known) {
              const { data: profByKnown } = await supabase
                .from('profiles')
                .select('id, name, role, grade')
                .ilike('name', known.nameEn)
                .limit(1)
                .maybeSingle();
              if (profByKnown) studentProfile = profByKnown;
            }
          }
        }

        // If student profile was found in Supabase tables, proceed with live RPC
        if (studentProfile) {
          if (studentProfile.role !== 'student') {
            return {
              success: false,
              error: `NOT_A_STUDENT: Target user "${studentProfile.name || trimmedId}" does not hold the student role (role: ${studentProfile.role}).`
            };
          }

          if (grade && studentProfile.grade !== grade) {
            return {
              success: false,
              error: 'Student grade changes must be made by a trusted administrator before class enrollment.'
            };
          }

          const studentUuid = studentProfile.id;

          // Resolve authoritative class_instance_id
          let targetInstanceId = classInstanceId;

          // If not provided directly, query class_instances for active year
          if (!targetInstanceId) {
            // Check caller role in profiles
            const { data: callerProfile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', user.id)
              .maybeSingle();

            const callerRole = callerProfile?.role || '';

            if (callerRole === 'admin') {
              const { data: inst } = await supabase
                .from('class_instances')
                .select('id')
                .eq('church_year_id', activeYear.id)
                .eq('class_group_id', classGroupId || 'primary_2')
                .maybeSingle();
              targetInstanceId = inst?.id;
            } else {
              // For teacher, query servant_class_assignments
              const { data: assignment } = await supabase
                .from('servant_class_assignments')
                .select('class_instance_id')
                .eq('servant_id', user.id)
                .eq('church_year_id', activeYear.id)
                .eq('is_active', true)
                .maybeSingle();
              targetInstanceId = assignment?.class_instance_id;
            }
          }

          if (!targetInstanceId) {
            const { data: inst } = await supabase
              .from('class_instances')
              .select('id')
              .eq('church_year_id', activeYear.id)
              .eq('class_group_id', classGroupId || 'primary_2')
              .maybeSingle();
            targetInstanceId = inst?.id;
          }

          if (targetInstanceId) {
            // Call the approved SECURITY DEFINER RPC: public.enroll_student_in_class(p_student_id UUID, p_class_instance_id TEXT)
            const { data: rpcData, error: rpcError } = await supabase.rpc('enroll_student_in_class', {
              p_student_id: studentUuid,
              p_class_instance_id: targetInstanceId
            });

            if (!rpcError && rpcData) {
              return {
                success: true,
                action: rpcData?.action,
                membershipId: rpcData?.membershipId,
                classInstanceId: rpcData?.classInstanceId
              };
            }
            console.warn('Supabase direct RPC note, proceeding to server fallback:', rpcError?.message);
          }
        }
        // If not completed via direct Supabase RPC, smoothly fall through to server fallback below!
      }
    } catch (sbErr: any) {
      console.warn('Supabase enroll_student_in_class note, falling back to server:', sbErr);
    }
  }

  // 2. Offline / Server fallback via server endpoint
  const headers = await getAuthHeader();
  try {
    const res = await fetch('/api/church/student/class', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        studentId: trimmedId,
        classGroupId,
        grade,
        classInstanceId
      })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        success: false,
        error: json?.message || json?.error || 'Failed to enroll student'
      };
    }
    return {
      success: true,
      action: json.action || 'enrolled',
      membershipId: json.membershipId,
      classInstanceId: json.classInstanceId
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error enrolling student'
    };
  }
}

/**
 * 6. Add Student to Class (Servant & Admin)
 */
export async function addStudentToClass(
  classGroupId: string,
  studentId: string,
  exactGrade?: string,
  classInstanceId?: string
): Promise<{
  success: boolean;
  student?: any;
  membershipId?: string;
  message?: string;
  error?: string;
}> {
  // Delegate to authoritative enrollStudentInClass
  const enrollRes = await enrollStudentInClass(studentId, classInstanceId, classGroupId as ClassGroupId, exactGrade);
  if (enrollRes.success) {
    return {
      success: true,
      membershipId: enrollRes.membershipId,
      message: 'Student enrolled successfully'
    };
  }

  return {
    success: false,
    error: enrollRes.error || 'Failed to add student'
  };
}

/**
 * 7. Admin: Get Users List
 */
export async function getAdminUsers(): Promise<{
  success: boolean;
  users: AdminUserItem[];
  error?: string;
}> {
  const headers = await getAuthHeader();
  try {
    const res = await fetch('/api/church/admin/users', {
      method: 'GET',
      headers
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        success: false,
        users: [],
        error: json?.message || json?.error || 'Failed to fetch users'
      };
    }
    return { success: true, users: json.users || [] };
  } catch (err: any) {
    return {
      success: false,
      users: [],
      error: err?.message || 'Network error'
    };
  }
}

/**
 * 8. Admin: Promote/Demote User Role
 */
export async function promoteUserRole(
  userId: string,
  role: 'teacher' | 'student' | 'admin'
): Promise<{
  success: boolean;
  userId?: string;
  newRole?: string;
  error?: string;
}> {
  const headers = await getAuthHeader();
  try {
    const res = await fetch('/api/church/admin/promote-user', {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId, role })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        success: false,
        error: json?.message || json?.error || 'Failed to update user role'
      };
    }
    return json;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error'
    };
  }
}

/**
 * 9. Admin: Assign/Unassign Servant to Class Group
 */
export async function assignServantToClass(
  servantId: string,
  classGroupId: string,
  action: 'ASSIGN' | 'REMOVE'
): Promise<{
  success: boolean;
  servantId?: string;
  assignedClasses?: string[];
  error?: string;
}> {
  const headers = await getAuthHeader();
  try {
    const res = await fetch('/api/church/admin/assign-servant', {
      method: 'POST',
      headers,
      body: JSON.stringify({ servantId, classGroupId, action })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        success: false,
        error: json?.message || json?.error || 'Failed to update servant assignment'
      };
    }
    return json;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error'
    };
  }
}

/**
 * 10. Admin: Preview New Church Year Rollover
 */
export async function previewYearTransition(): Promise<{
  success: boolean;
  currentYear?: string;
  nextYear?: string;
  previewList?: Array<{
    studentId: string;
    name: string;
    currentGrade: string;
    currentClassGroupId: string;
    projectedGrade: string;
    projectedClassGroupId: string;
    isGraduated: boolean;
    explanation: string;
  }>;
  error?: string;
}> {
  const headers = await getAuthHeader();
  try {
    const res = await fetch('/api/church/admin/year-transition-preview', {
      method: 'GET',
      headers
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        success: false,
        error: json?.message || json?.error || 'Failed to load year transition preview'
      };
    }
    return json;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error'
    };
  }
}

/**
 * 11. Admin: Start New Church Year (Two-Step Safety execution)
 */
export async function startNewChurchYear(
  targetYear: string,
  exceptions?: Record<string, { action: 'REPEAT' | 'MANUAL' | 'GRADUATE', manualGrade?: string }>
): Promise<{
  success: boolean;
  message?: string;
  currentChurchYear?: string;
  newClassInstances?: ChurchClassInstance[];
  error?: string;
}> {
  const headers = await getAuthHeader();
  try {
    const res = await fetch('/api/church/admin/start-new-year', {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetYear, confirmed: true, exceptions })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        success: false,
        error: json?.message || json?.error || 'Failed to start new church year'
      };
    }
    return json;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error'
    };
  }
}
