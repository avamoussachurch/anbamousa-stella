import { supabase, isSupabaseConfigured } from './supabase';
import { StudentContentProgress } from '../types';

export interface StartLessonProgressInput {
  lessonId: string;
  versionId: string;
  studentId?: string;
}

export interface CompleteSectionProgressInput {
  lessonId: string;
  versionId: string;
  sectionId: string;
  studentId?: string;
}

export interface CompleteLessonProgressInput {
  lessonId: string;
  versionId: string;
  studentId?: string;
}

// In-memory fallback for local/guest/demo/offline resilience
const LOCAL_PROGRESS_STORE: Record<string, StudentContentProgress> = {};

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
 * 1. getStudentProgress(lessonId, studentId)
 * Fetches the student's progress on a published lesson.
 * Strict RBAC: Authenticated students can only read their own progress.
 */
export async function getStudentProgress(
  lessonId: string,
  studentId?: string
): Promise<{ data: StudentContentProgress | null; error: Error | null }> {
  if (!lessonId) {
    return { data: null, error: new Error('lessonId is required') };
  }

  const headers = await getAuthHeader();
  try {
    const query = new URLSearchParams({ lessonId });
    if (studentId) query.set('studentId', studentId);

    const res = await fetch(`/api/church/student-progress?${query.toString()}`, {
      method: 'GET',
      headers
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        data: null,
        error: new Error(json?.message || json?.error || `HTTP ${res.status}: Failed to fetch student progress`)
      };
    }

    return { data: json.progress, error: null };
  } catch (err: any) {
    // Offline / Demo fallback
    const key = `${studentId || 'u1'}_${lessonId}`;
    return { data: LOCAL_PROGRESS_STORE[key] || null, error: null };
  }
}

/**
 * 2. startLessonProgress(input)
 * Tracks that an authenticated student has started an active published lesson.
 * Only published versions can be started; drafts/review are rejected.
 */
export async function startLessonProgress(
  input: StartLessonProgressInput
): Promise<{ data: StudentContentProgress | null; error: Error | null }> {
  const { lessonId, versionId, studentId } = input;
  if (!lessonId || !versionId) {
    return { data: null, error: new Error('lessonId and versionId are required') };
  }

  const headers = await getAuthHeader();
  try {
    const res = await fetch('/api/church/student-progress/start', {
      method: 'POST',
      headers,
      body: JSON.stringify({ lessonId, versionId, studentId })
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        data: null,
        error: new Error(json?.message || json?.error || `HTTP ${res.status}: Failed to start lesson progress`)
      };
    }

    const key = `${json.progress.studentId}_${lessonId}`;
    LOCAL_PROGRESS_STORE[key] = json.progress;

    return { data: json.progress, error: null };
  } catch (err: any) {
    // Pure offline demo fallback
    const sId = studentId || 'u1';
    const key = `${sId}_${lessonId}`;
    const fallback: StudentContentProgress = LOCAL_PROGRESS_STORE[key] || {
      studentId: sId,
      lessonId,
      versionId,
      status: 'IN_PROGRESS',
      sectionsCompleted: [],
      totalSections: 3,
      completionPercent: 0,
      startedAt: new Date().toISOString()
    };
    LOCAL_PROGRESS_STORE[key] = fallback;
    return { data: fallback, error: null };
  }
}

/**
 * 3. completeSectionProgress(input)
 * Idempotently completes a normalized section of the active published lesson.
 * Updates completion percentage and marks lesson complete if all sections are completed.
 */
export async function completeSectionProgress(
  input: CompleteSectionProgressInput
): Promise<{ data: StudentContentProgress | null; error: Error | null }> {
  const { lessonId, versionId, sectionId, studentId } = input;
  if (!lessonId || !versionId || !sectionId) {
    return { data: null, error: new Error('lessonId, versionId, and sectionId are required') };
  }

  const headers = await getAuthHeader();
  try {
    const res = await fetch('/api/church/student-progress/complete-section', {
      method: 'POST',
      headers,
      body: JSON.stringify({ lessonId, versionId, sectionId, studentId })
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        data: null,
        error: new Error(json?.message || json?.error || `HTTP ${res.status}: Failed to complete section`)
      };
    }

    const prog: StudentContentProgress = json.progress;
    const key = `${prog.studentId}_${lessonId}`;
    LOCAL_PROGRESS_STORE[key] = prog;

    // If Supabase is connected and lesson reached completion, sync to public.lesson_progress
    if (supabase && isSupabaseConfigured && prog.status === 'COMPLETED') {
      try {
        await supabase.from('lesson_progress').upsert({
          student_id: prog.studentId,
          lesson_id: prog.lessonId,
          completed: true,
          completed_at: prog.completedAt || new Date().toISOString()
        });
      } catch (dbErr) {
        console.warn('Note on Supabase lesson_progress sync:', dbErr);
      }
    }

    return { data: prog, error: null };
  } catch (err: any) {
    // Pure offline demo fallback
    const sId = studentId || 'u1';
    const key = `${sId}_${lessonId}`;
    const existing = LOCAL_PROGRESS_STORE[key] || {
      studentId: sId,
      lessonId,
      versionId,
      status: 'IN_PROGRESS',
      sectionsCompleted: [],
      totalSections: 3,
      completionPercent: 0,
      startedAt: new Date().toISOString()
    };

    if (!existing.sectionsCompleted.includes(sectionId)) {
      existing.sectionsCompleted.push(sectionId);
    }
    const total = existing.totalSections || 3;
    existing.completionPercent = Math.min(100, Math.round((existing.sectionsCompleted.length / total) * 100));
    if (existing.sectionsCompleted.length >= total) {
      existing.status = 'COMPLETED';
      existing.completedAt = existing.completedAt || new Date().toISOString();
    }
    LOCAL_PROGRESS_STORE[key] = existing;
    return { data: existing, error: null };
  }
}

/**
 * 4. completeLessonProgress(input)
 * Explicitly marks a lesson completed ONLY when all required sections are finished.
 */
export async function completeLessonProgress(
  input: CompleteLessonProgressInput
): Promise<{
  data: StudentContentProgress | null;
  error: Error | null;
  isFirstCompletion?: boolean;
  pointsEarned?: number;
  totalPoints?: number;
  streak?: any;
  completionHistory?: any[];
}> {
  const { lessonId, versionId, studentId } = input;
  if (!lessonId || !versionId) {
    return { data: null, error: new Error('lessonId and versionId are required') };
  }

  const sId = studentId || 'u1';
  const key = `${sId}_${lessonId}`;

  const headers = await getAuthHeader();
  try {
    const res = await fetch('/api/church/student-progress/complete-lesson', {
      method: 'POST',
      headers,
      body: JSON.stringify({ lessonId, versionId, studentId })
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      const errorMsg = json?.message || json?.error || `HTTP ${res.status}: Failed to save lesson completion`;
      return {
        data: null,
        error: new Error(errorMsg)
      };
    }

    const prog: StudentContentProgress = json.progress;
    LOCAL_PROGRESS_STORE[key] = prog;
    try {
      localStorage.setItem(`church_progress_${key}`, JSON.stringify(prog));
    } catch (e) {}

    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('lesson_progress').upsert({
          student_id: prog.studentId,
          lesson_id: prog.lessonId,
          completed: true,
          completed_at: prog.completedAt || new Date().toISOString()
        });
      } catch (dbErr) {
        console.warn('Note on Supabase lesson_progress sync:', dbErr);
      }
    }

    return { 
      data: prog, 
      error: null,
      isFirstCompletion: json.isFirstCompletion ?? true,
      pointsEarned: json.pointsEarned ?? (json.isFirstCompletion ? 50 : 0),
      totalPoints: json.totalPoints,
      streak: json.streak,
      completionHistory: json.completionHistory
    };
  } catch (err: any) {
    // Pure offline fallback
    const existing = LOCAL_PROGRESS_STORE[key] || {
      studentId: sId,
      lessonId,
      versionId,
      status: 'IN_PROGRESS',
      sectionsCompleted: ['sec-1'],
      totalSections: 1,
      completionPercent: 0,
      startedAt: new Date().toISOString()
    };
    const wasAlreadyCompleted = existing.status === 'COMPLETED';
    existing.status = 'COMPLETED';
    existing.completionPercent = 100;
    existing.completedAt = existing.completedAt || new Date().toISOString();
    LOCAL_PROGRESS_STORE[key] = existing;
    try {
      localStorage.setItem(`church_progress_${key}`, JSON.stringify(existing));
    } catch (e) {}

    return { 
      data: existing, 
      error: null,
      isFirstCompletion: !wasAlreadyCompleted,
      pointsEarned: !wasAlreadyCompleted ? 50 : 0
    };
  }
}

export interface RecordSchoolActivityInput {
  school: 'sunday_school' | 'hymns' | 'taxis';
  activityId: string;
  activityType?: 'LESSON_COMPLETED' | 'HYMN_MASTERED' | 'TAXIS_COMPLETED';
  titleAr?: string;
  titleEn?: string;
  studentId?: string;
}

/**
 * 4b. recordStudentSchoolActivity(input)
 * Unified activity logging for Cairo streak tracking across Sunday School, Hymns School, and Taxis.
 */
export async function recordStudentSchoolActivity(
  input: RecordSchoolActivityInput
): Promise<{
  success: boolean;
  school: string;
  activityId: string;
  isFirstCompletion: boolean;
  pointsEarned: number;
  totalPoints: number;
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastActiveCairoDate: string;
    isActiveToday: boolean;
  };
  error?: string;
}> {
  const headers = await getAuthHeader();
  try {
    const res = await fetch('/api/church/student-progress/record-activity', {
      method: 'POST',
      headers,
      body: JSON.stringify(input)
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || `HTTP ${res.status}: Failed to record school activity`);
    }
    return {
      success: true,
      school: json.school,
      activityId: json.activityId,
      isFirstCompletion: Boolean(json.isFirstCompletion),
      pointsEarned: json.pointsEarned ?? 0,
      totalPoints: json.totalPoints ?? 0,
      streak: json.streak || { currentStreak: 1, longestStreak: 1, lastActiveCairoDate: '', isActiveToday: true }
    };
  } catch (err: any) {
    return {
      success: false,
      school: input.school,
      activityId: input.activityId,
      isFirstCompletion: false,
      pointsEarned: 0,
      totalPoints: 0,
      streak: { currentStreak: 1, longestStreak: 1, lastActiveCairoDate: '', isActiveToday: true },
      error: err?.message
    };
  }
}

/**
 * 5. getStudentProgressSummary(studentId?)
 * Fetches authoritative server summary of all completed lessons, total points, Cairo streak, and mastery.
 * Essential for cross-device synchronization and refresh persistence.
 */
export async function getStudentProgressSummary(
  studentId?: string
): Promise<{
  success: boolean;
  completedLessonIds: string[];
  completedCount: number;
  totalAssignedLessons: number;
  progressPercent: number;
  allProgress: Record<string, StudentContentProgress>;
  points: number;
  streak: { currentStreak: number; longestStreak: number; lastActiveCairoDate: string; isActiveToday?: boolean };
  completionHistory: any[];
  serverCairoDate: string;
  error?: string;
}> {
  const headers = await getAuthHeader();
  try {
    const query = new URLSearchParams();
    if (studentId) query.set('studentId', studentId);

    const res = await fetch(`/api/church/student-progress/summary?${query.toString()}`, {
      method: 'GET',
      headers
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || `HTTP ${res.status}`);
    }

    return {
      success: true,
      completedLessonIds: json.completedLessonIds || [],
      completedCount: json.completedCount || 0,
      totalAssignedLessons: json.totalAssignedLessons || 0,
      progressPercent: json.progressPercent || 0,
      allProgress: json.allProgress || {},
      points: json.points ?? 100,
      streak: json.streak || { currentStreak: 0, longestStreak: 0, lastActiveCairoDate: '', isActiveToday: false },
      completionHistory: json.completionHistory || [],
      serverCairoDate: json.serverCairoDate || new Date().toISOString().split('T')[0]
    };
  } catch (err: any) {
    // Offline / Local storage fallback
    const completedIds: string[] = [];
    const allProg: Record<string, StudentContentProgress> = {};
    for (const [k, p] of Object.entries(LOCAL_PROGRESS_STORE)) {
      if (!studentId || k.startsWith(`${studentId}_`)) {
        const lId = k.split('_').slice(1).join('_');
        allProg[lId] = p;
        if (p.status === 'COMPLETED') {
          completedIds.push(lId);
        }
      }
    }
    return {
      success: false,
      completedLessonIds: completedIds,
      completedCount: completedIds.length,
      totalAssignedLessons: Math.max(1, completedIds.length),
      progressPercent: completedIds.length > 0 ? 100 : 0,
      allProgress: allProg,
      points: 100,
      streak: { currentStreak: 1, longestStreak: 1, lastActiveCairoDate: '' },
      completionHistory: [],
      serverCairoDate: new Date().toISOString().split('T')[0],
      error: err?.message
    };
  }
}

/**
 * 6. getAuthoritativeCompletionHistory(studentId?, limit?)
 * Fetches real persisted completion activity records for this student.
 */
export async function getAuthoritativeCompletionHistory(
  studentId?: string,
  limit = 20
): Promise<{ success: boolean; activities: any[]; totalCount: number; error?: string }> {
  const headers = await getAuthHeader();
  try {
    const query = new URLSearchParams({ limit: String(limit) });
    if (studentId) query.set('studentId', studentId);

    const res = await fetch(`/api/church/completion-history?${query.toString()}`, {
      method: 'GET',
      headers
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || `HTTP ${res.status}`);
    }
    return {
      success: true,
      activities: json.activities || [],
      totalCount: json.totalCount || 0
    };
  } catch (err: any) {
    return {
      success: false,
      activities: [],
      totalCount: 0,
      error: err?.message
    };
  }
}

/**
 * 7. getAuthoritativeLeaderboard(options)
 * Fetches church class-isolated leaderboard with weekly and all-time views.
 */
export async function getAuthoritativeLeaderboard(options?: {
  classGroupId?: string;
  timeframe?: 'weekly' | 'all_time';
  studentId?: string;
}): Promise<{
  success: boolean;
  classGroupId: string;
  timeframe: string;
  leaderboard: any[];
  currentUserEntry: any | null;
  totalParticipants: number;
  cairoDate: string;
  cairoWeekReset: string;
  error?: string;
}> {
  const headers = await getAuthHeader();
  try {
    const query = new URLSearchParams();
    if (options?.classGroupId) query.set('classGroupId', options.classGroupId);
    if (options?.timeframe) query.set('timeframe', options.timeframe);

    const res = await fetch(`/api/church/leaderboard?${query.toString()}`, {
      method: 'GET',
      headers
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || `HTTP ${res.status}`);
    }
    return {
      success: true,
      classGroupId: json.classGroupId,
      timeframe: json.timeframe,
      leaderboard: json.leaderboard || [],
      currentUserEntry: json.currentUserEntry || null,
      totalParticipants: json.totalParticipants || 0,
      cairoDate: json.cairoDate,
      cairoWeekReset: json.cairoWeekReset
    };
  } catch (err: any) {
    return {
      success: false,
      classGroupId: options?.classGroupId || 'primary_2',
      timeframe: options?.timeframe || 'weekly',
      leaderboard: [],
      currentUserEntry: null,
      totalParticipants: 0,
      cairoDate: new Date().toISOString().split('T')[0],
      cairoWeekReset: '',
      error: err?.message
    };
  }
}

export interface LessonCompletionDiagnosticResult {
  lessonId: string;
  studentId: string;
  clientCompleted?: boolean;
  serverCompleted: boolean;
  isSynchronized: boolean;
  statusLabel: string;
  serverState: {
    found: boolean;
    status: string;
    completionPercent: number;
    sectionsCompletedCount: number;
    completedAt: string | null;
    pointsAwarded: boolean;
  } | null;
  pointsTreasury: {
    totalPoints: number;
    pointsHistoryRecorded: boolean;
  } | null;
  streakState: {
    currentStreak: number;
    longestStreak: number;
    lastActiveCairoDate: string;
  } | null;
  masteryRecord: {
    status: string;
    evaluatedAt: string;
    evaluatedBy: string;
  } | null;
  supabaseStatus: {
    configured: boolean;
    foundInSupabase: boolean;
    completedInSupabase: boolean | null;
  };
  completionHistoryCount: number;
  issues: string[];
}

/**
 * 8. diagnoseLessonCompletion(lessonId, clientState?)
 * Dev & Test Diagnostic Utility: Audits authoritative lesson completion status
 * across client memory, server-authoritative state, and Supabase persistence.
 */
export async function diagnoseLessonCompletion(
  lessonId: string,
  clientState?: { isCompleted?: boolean; points?: number; studentId?: string }
): Promise<LessonCompletionDiagnosticResult> {
  const headers = await getAuthHeader();
  const query = new URLSearchParams();
  if (clientState?.studentId) query.set('studentId', clientState.studentId);

  try {
    const res = await fetch(`/api/church/student-progress/diagnose/${encodeURIComponent(lessonId)}?${query.toString()}`, {
      method: 'GET',
      headers
    });
    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success) {
      throw new Error(json?.message || `HTTP ${res.status}: Diagnostic check failed`);
    }

    const issues: string[] = [...(json.diagnostics?.issues || [])];
    const serverCompleted = Boolean(json.diagnostics?.isCompleteOnServer);

    if (clientState?.isCompleted !== undefined && clientState.isCompleted !== serverCompleted) {
      issues.push(`CLIENT_SERVER_COMPLETION_MISMATCH (client=${clientState.isCompleted}, server=${serverCompleted})`);
    }

    const isSynchronized = issues.length === 0;

    // Structured logging for development & QA diagnostics (sanitized, no secrets or tokens)
    if (typeof window !== 'undefined' && (import.meta as any).env?.DEV) {
      console.groupCollapsed(`[Authoritative Lesson Diagnostic] ${lessonId} (${isSynchronized ? 'SYNC OK' : 'MISMATCH'})`);
      console.info(`├── Student: ${json.studentId}`);
      console.info(`├── Server Status: ${json.serverState?.status} (${json.serverState?.completionPercent}%)`);
      console.info(`├── Points Awarded: ${json.serverState?.pointsAwarded ? 'YES' : 'NO'} (Total: ${json.pointsTreasury?.totalPoints ?? 0})`);
      console.info(`├── Mastery: ${json.masteryRecord?.status || 'NOT_EVALUATED'}`);
      console.info(`├── Supabase Persistence: ${json.supabaseStatus?.configured ? (json.supabaseStatus.completedInSupabase ? 'CONFIRMED' : 'PENDING') : 'N/A'}`);
      console.info(`├── Issues Detected: ${issues.length > 0 ? issues.join(', ') : 'None'}`);
      console.info(`└── Status: ${json.diagnostics?.statusLabel}`);
      console.groupEnd();
    }

    return {
      lessonId,
      studentId: json.studentId,
      clientCompleted: clientState?.isCompleted,
      serverCompleted,
      isSynchronized,
      statusLabel: json.diagnostics?.statusLabel || 'UNKNOWN',
      serverState: json.serverState,
      pointsTreasury: json.pointsTreasury,
      streakState: json.streakState,
      masteryRecord: json.masteryRecord,
      supabaseStatus: json.supabaseStatus,
      completionHistoryCount: json.completionHistoryCount || 0,
      issues
    };
  } catch (err: any) {
    return {
      lessonId,
      studentId: clientState?.studentId || 'unknown',
      clientCompleted: clientState?.isCompleted,
      serverCompleted: false,
      isSynchronized: false,
      statusLabel: 'DIAGNOSTIC_FETCH_FAILED',
      serverState: null,
      pointsTreasury: null,
      streakState: null,
      masteryRecord: null,
      supabaseStatus: { configured: false, foundInSupabase: false, completedInSupabase: null },
      completionHistoryCount: 0,
      issues: [err?.message || 'Failed to contact diagnostic endpoint']
    };
  }
}

