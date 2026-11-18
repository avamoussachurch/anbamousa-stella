import { supabase } from './supabase';

export type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent';
export type VisitationMethod = 'call' | 'visit' | 'whatsapp';

export interface TeacherAttendanceClass {
  id: string;
  classGroupId: string;
  name: string;
  nameAr: string;
}

export interface TeacherAttendanceStudent {
  id: string;
  name: string;
  grade: string;
  status: AttendanceStatus | null;
  consecutiveAbsences: number;
  lastAttendedDate: string | null;
  visitations: Array<{ id: string; date: string; type: VisitationMethod; notes: string }>;
}

export interface TeacherAttendanceData {
  churchYear: string | null;
  classes: TeacherAttendanceClass[];
  selectedClassId: string | null;
  date: string;
  sessionExists: boolean;
  savedAt: string | null;
  students: TeacherAttendanceStudent[];
}

async function authenticatedRequest<T>(url: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  if (!supabase) throw new Error('Secure account access is not configured.');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(`Could not verify your account: ${sessionError.message}`);
  if (!session?.access_token) throw new Error('Sign in with your teacher account to continue.');

  const response = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${session.access_token}`,
      ...(body ? { 'content-type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || payload?.error || `Request failed (HTTP ${response.status}).`);
  }
  return payload as T;
}

export async function getTeacherAttendance(date: string, classId?: string): Promise<TeacherAttendanceData> {
  const query = new URLSearchParams({ date });
  if (classId) query.set('classId', classId);
  const payload = await authenticatedRequest<TeacherAttendanceData & { success: boolean }>(
    `/api/church/servant/attendance?${query.toString()}`,
    'GET'
  );
  if (!Array.isArray(payload.classes) || !Array.isArray(payload.students)) {
    throw new Error('The server returned an incomplete attendance roster.');
  }
  return payload;
}

export async function saveTeacherAttendance(
  classInstanceId: string,
  date: string,
  records: Array<{ studentId: string; status: AttendanceStatus }>
): Promise<{ savedCount: number; savedAt: string }> {
  return authenticatedRequest('/api/church/servant/attendance', 'POST', { classInstanceId, date, records });
}

export async function logTeacherVisitation(input: {
  classInstanceId: string;
  studentId: string;
  date: string;
  method: VisitationMethod;
  notes: string;
}): Promise<{ visitation: { id: string; visit_date: string; method: VisitationMethod; notes: string } }> {
  return authenticatedRequest('/api/church/servant/visitations', 'POST', input);
}
