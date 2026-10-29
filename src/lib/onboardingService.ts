import { supabase } from './supabase';
import { OnboardingActivationRequest, ClassGroupId } from '../types';

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
 * 1. Submit a student account activation and class join request
 */
export async function requestAccountActivation(
  params: RequestActivationParams
): Promise<{ success: boolean; request?: OnboardingActivationRequest; error?: string }> {
  const headers = await getAuthHeader();
  try {
    const res = await fetch('/api/church/onboarding/request', {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        success: false,
        error: json?.message || json?.error || `HTTP ${res.status}: Failed to submit activation request`
      };
    }

    return {
      success: true,
      request: json.request
    };
  } catch (err: any) {
    // Offline / Demo fallback
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
    try {
      localStorage.setItem('church_pending_activation', JSON.stringify(fallbackReq));
    } catch (_) {}
    return {
      success: true,
      request: fallbackReq
    };
  }
}

/**
 * 2. Get current student's activation request status
 */
export async function getMyActivationStatus(
  studentId?: string
): Promise<{
  success: boolean;
  request?: OnboardingActivationRequest | null;
  isEnrolled?: boolean;
  studentClass?: any;
  error?: string;
}> {
  const headers = await getAuthHeader();
  try {
    const query = new URLSearchParams();
    if (studentId) query.set('studentId', studentId);

    const res = await fetch(`/api/church/onboarding/my-status?${query.toString()}`, {
      method: 'GET',
      headers
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        success: false,
        error: json?.message || json?.error || `HTTP ${res.status}: Failed to fetch status`
      };
    }

    return {
      success: true,
      request: json.request || null,
      isEnrolled: json.isEnrolled,
      studentClass: json.studentClass
    };
  } catch (err: any) {
    // Offline / local cache check
    try {
      const cached = localStorage.getItem('church_pending_activation');
      if (cached) {
        return {
          success: true,
          request: JSON.parse(cached),
          isEnrolled: false
        };
      }
    } catch (_) {}
    return { success: true, request: null, isEnrolled: false };
  }
}

/**
 * 3. Fetch pending activation requests (Servants & Admins only)
 */
export async function getPendingActivationRequests(
  classGroupId?: string
): Promise<{
  success: boolean;
  requests: OnboardingActivationRequest[];
  error?: string;
}> {
  const headers = await getAuthHeader();
  try {
    const query = new URLSearchParams();
    if (classGroupId) query.set('classGroupId', classGroupId);

    const res = await fetch(`/api/church/onboarding/requests?${query.toString()}`, {
      method: 'GET',
      headers
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        success: false,
        requests: [],
        error: json?.message || json?.error || `HTTP ${res.status}: Failed to fetch requests`
      };
    }

    return {
      success: true,
      requests: json.requests || []
    };
  } catch (err: any) {
    return {
      success: false,
      requests: [],
      error: err instanceof Error ? err.message : 'Network error fetching activation requests'
    };
  }
}

/**
 * 4. Servant/Admin reviews (approves or rejects) a student's request
 */
export async function reviewActivationRequest(
  params: ReviewActivationParams
): Promise<{
  success: boolean;
  request?: OnboardingActivationRequest;
  enrolledStudent?: any;
  error?: string;
}> {
  const headers = await getAuthHeader();
  try {
    const res = await fetch('/api/church/onboarding/review', {
      method: 'POST',
      headers,
      body: JSON.stringify(params)
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        success: false,
        error: json?.message || json?.error || `HTTP ${res.status}: Failed to review request`
      };
    }

    return {
      success: true,
      request: json.request,
      enrolledStudent: json.enrolledStudent
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error reviewing activation request'
    };
  }
}
