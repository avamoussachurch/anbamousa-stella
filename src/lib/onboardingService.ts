import { supabase, isSupabaseConfigured } from './supabase';
import { OnboardingActivationRequest, ClassGroupId } from '../types';
import { findClassGroupForGrade, getClassGroupForGrade } from './classGroups';

async function getAuthHeader(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        headers['Authorization'] = `Bearer ${data.session.access_token}`;
      }
    } catch (_) {}
  }
  return headers;
}

function adaptRequest(row: any): OnboardingActivationRequest {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    email: row.contact_email || undefined,
    phone: row.contact_phone || undefined,
    requestedClassGroupId: row.requested_class_group_id,
    requestedGrade: row.requested_grade,
    notes: row.notes || undefined,
    status: row.status,
    requestedAt: row.requested_at,
    assignedGrade: row.assigned_grade || undefined,
    reviewedBy: row.reviewed_by || undefined,
    reviewedAt: row.reviewed_at || undefined,
    reviewNotes: row.review_notes || undefined
  };
}

async function getActiveChurchYearId(): Promise<{ id: string | null; error: string | null }> {
  if (!supabase) return { id: null, error: 'Supabase client is not configured.' };
  const { data, error } = await supabase
    .from('church_years')
    .select('id')
    .eq('is_active', true)
    .maybeSingle();
  if (error) return { id: null, error: error.message };
  return { id: data?.id || null, error: data ? null : 'No active church year is configured.' };
}

export interface RequestActivationParams {
  studentId: string;
  studentName: string;
  email?: string;
  phone?: string;
  requestedClassGroupId: ClassGroupId;
  requestedGrade: string;
  notes?: string;
}

export interface ReviewActivationParams {
  requestId: string;
  action: 'APPROVE' | 'REJECT';
  assignedGrade?: string;
  reviewNotes?: string;
}

/**
 * Persist both first-time enrolment and later grade-change requests in Supabase.
 * The assigned servant reviews the request; the approval RPC atomically changes
 * the student's active class membership and profile grade.
 */
export async function requestAccountActivation(
  params: RequestActivationParams
): Promise<{ success: boolean; request?: OnboardingActivationRequest; error?: string }> {
  if (supabase && isSupabaseConfigured) {
    try {
      if (params.studentName.trim().length < 2 || params.studentName.trim().length > 100) {
        return { success: false, error: 'Student name must contain 2 to 100 characters.' };
      }
      if (params.notes && params.notes.length > 1000) {
        return { success: false, error: 'Notes must be 1000 characters or fewer.' };
      }
      if (findClassGroupForGrade(params.requestedGrade)?.id !== params.requestedClassGroupId) {
        return { success: false, error: 'The selected grade does not match its Sunday School class group.' };
      }
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (sessionError || !session?.user) {
        return { success: false, error: sessionError?.message || 'Sign in before requesting a class or grade change.' };
      }
      if (session.user.id !== params.studentId) {
        return { success: false, error: 'You can only submit a class request for your own account.' };
      }

      const year = await getActiveChurchYearId();
      if (year.error || !year.id) return { success: false, error: year.error || 'No active church year.' };

      const payload = {
        student_id: session.user.id,
        church_year_id: year.id,
        requested_class_group_id: params.requestedClassGroupId,
        requested_grade: params.requestedGrade.trim(),
        student_name: params.studentName.trim(),
        contact_email: params.email?.trim() || null,
        contact_phone: params.phone?.trim() || null,
        notes: params.notes?.trim() || null,
        status: 'PENDING_APPROVAL'
      };

      const { data: existing, error: existingError } = await supabase
        .from('student_class_change_requests')
        .select('id')
        .eq('student_id', session.user.id)
        .eq('church_year_id', year.id)
        .eq('status', 'PENDING_APPROVAL')
        .maybeSingle();
      if (existingError) return { success: false, error: existingError.message };

      const result = existing
        ? await supabase.from('student_class_change_requests').update(payload).eq('id', existing.id).select('*').single()
        : await supabase.from('student_class_change_requests').insert(payload).select('*').single();

      if (result.error || !result.data) {
        return { success: false, error: result.error?.message || 'Supabase did not confirm the class request.' };
      }
      return { success: true, request: adaptRequest(result.data) };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Could not save the class request.' };
    }
  }

  if (isSupabaseConfigured) {
    return { success: false, error: 'Online class requests are unavailable because the Supabase client is not configured.' };
  }

  const headers = await getAuthHeader();
  try {
    const res = await fetch('/api/church/onboarding/request', {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return { success: false, error: json?.message || json?.error || `HTTP ${res.status}: Failed to submit activation request` };
    }
    return { success: true, request: json.request };
  } catch (err: any) {
    const fallbackReq: OnboardingActivationRequest = {
      id: `req-offline-${Date.now()}`,
      studentId: params.studentId,
      studentName: params.studentName,
      email: params.email,
      phone: params.phone,
      requestedClassGroupId: params.requestedClassGroupId,
      requestedGrade: params.requestedGrade,
      notes: params.notes,
      status: 'PENDING_APPROVAL',
      requestedAt: new Date().toISOString()
    };
    try { localStorage.setItem('church_pending_activation', JSON.stringify(fallbackReq)); } catch (_) {}
    return { success: true, request: fallbackReq };
  }
}

/** Read the student's latest persisted request and active class membership. */
export async function getMyActivationStatus(
  studentId?: string
): Promise<{
  success: boolean;
  request?: OnboardingActivationRequest | null;
  isEnrolled?: boolean;
  studentClass?: any;
  error?: string;
}> {
  if (supabase && isSupabaseConfigured) {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (sessionError || !session?.user) return { success: false, error: sessionError?.message || 'Sign in to view class status.' };
      const targetId = studentId || session.user.id;
      if (targetId !== session.user.id) return { success: false, error: 'You can only view your own class status.' };

      const year = await getActiveChurchYearId();
      if (year.error || !year.id) return { success: false, error: year.error || 'No active church year.' };

      const [requestResult, membershipResult] = await Promise.all([
        supabase.from('student_class_change_requests').select('*')
          .eq('student_id', session.user.id).eq('church_year_id', year.id)
          .order('requested_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('class_memberships').select('exact_grade, class_instance_id, status')
          .eq('student_id', session.user.id).eq('church_year_id', year.id)
          .eq('status', 'active').maybeSingle()
      ]);
      if (requestResult.error || membershipResult.error) {
        return { success: false, error: requestResult.error?.message || membershipResult.error?.message };
      }
      const membership = membershipResult.data;
      const group = membership?.exact_grade ? getClassGroupForGrade(membership.exact_grade) : null;
      return {
        success: true,
        request: requestResult.data ? adaptRequest(requestResult.data) : null,
        isEnrolled: Boolean(membership),
        studentClass: membership ? {
          grade: membership.exact_grade,
          classGroupId: group?.id,
          classGroupName: group?.name.en
        } : null
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Could not load class status.' };
    }
  }

  if (isSupabaseConfigured) return { success: false, error: 'Online class status is unavailable because the Supabase client is not configured.' };
  const headers = await getAuthHeader();
  try {
    const query = new URLSearchParams();
    if (studentId) query.set('studentId', studentId);
    const res = await fetch(`/api/church/onboarding/my-status?${query.toString()}`, { method: 'GET', headers });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) return { success: false, error: json?.message || json?.error || `HTTP ${res.status}: Failed to fetch status` };
    return { success: true, request: json.request || null, isEnrolled: json.isEnrolled, studentClass: json.studentClass };
  } catch (_) {
    try {
      const cached = localStorage.getItem('church_pending_activation');
      if (cached) return { success: true, request: JSON.parse(cached), isEnrolled: false };
    } catch (_) {}
    return { success: true, request: null, isEnrolled: false };
  }
}

/** Teachers see only requests for classes to which they are actively assigned. */
export async function getPendingActivationRequests(
  classGroupId?: string
): Promise<{ success: boolean; requests: OnboardingActivationRequest[]; error?: string }> {
  if (supabase && isSupabaseConfigured) {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.user) {
        return { success: false, requests: [], error: sessionError?.message || 'Sign in to view class requests.' };
      }
      const year = await getActiveChurchYearId();
      if (year.error || !year.id) return { success: false, requests: [], error: year.error || 'No active church year.' };
      let query = supabase.from('student_class_change_requests').select('*')
        .eq('church_year_id', year.id).eq('status', 'PENDING_APPROVAL')
        .order('requested_at', { ascending: false });
      if (classGroupId) query = query.eq('requested_class_group_id', classGroupId);
      const { data, error } = await query;
      if (error) return { success: false, requests: [], error: error.message };
      return { success: true, requests: (data || []).map(adaptRequest) };
    } catch (err: any) {
      return { success: false, requests: [], error: err?.message || 'Could not load class requests.' };
    }
  }

  if (isSupabaseConfigured) return { success: false, requests: [], error: 'Online class requests are unavailable because the Supabase client is not configured.' };
  const headers = await getAuthHeader();
  try {
    const query = new URLSearchParams();
    if (classGroupId) query.set('classGroupId', classGroupId);
    const res = await fetch(`/api/church/onboarding/requests?${query.toString()}`, { method: 'GET', headers });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) return { success: false, requests: [], error: json?.message || json?.error || `HTTP ${res.status}: Failed to fetch requests` };
    return { success: true, requests: json.requests || [] };
  } catch (err: any) {
    return { success: false, requests: [], error: err instanceof Error ? err.message : 'Network error fetching activation requests' };
  }
}

/** Reviews a request and atomically applies approved grade/class changes in Supabase. */
export async function reviewActivationRequest(
  params: ReviewActivationParams
): Promise<{ success: boolean; request?: OnboardingActivationRequest; enrolledStudent?: any; error?: string }> {
  if (supabase && isSupabaseConfigured) {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.user) return { success: false, error: sessionError?.message || 'Sign in before reviewing a request.' };
      const { data: reviewResult, error: reviewError } = await supabase.rpc('review_student_class_change_request', {
        p_request_id: params.requestId,
        p_action: params.action,
        p_assigned_grade: params.assignedGrade || null,
        p_review_notes: params.reviewNotes || null
      });
      if (reviewError) return { success: false, error: reviewError.message };
      const { data: row, error: rowError } = await supabase
        .from('student_class_change_requests').select('*').eq('id', params.requestId).single();
      if (rowError || !row) return { success: false, error: rowError?.message || 'Review saved but request could not be reloaded.' };
      return {
        success: true,
        request: adaptRequest(row),
        enrolledStudent: reviewResult
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Could not review class request.' };
    }
  }

  if (isSupabaseConfigured) return { success: false, error: 'Online request review is unavailable because the Supabase client is not configured.' };
  const headers = await getAuthHeader();
  try {
    const res = await fetch('/api/church/onboarding/review', {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) return { success: false, error: json?.message || json?.error || `HTTP ${res.status}: Failed to review request` };
    return { success: true, request: json.request, enrolledStudent: json.enrolledStudent };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error reviewing request' };
  }
}
