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
  isRead?: boolean;
  studentId?: string;
}

export interface CompleteLessonProgressInput {
  lessonId: string;
  versionId: string;
  studentId?: string;
}

// In-memory fallback for local/guest/demo/offline resilience
type LocallyTrackedProgress = StudentContentProgress & { pendingSync?: boolean };
const LOCAL_PROGRESS_STORE: Record<string, LocallyTrackedProgress> = {};

async function getAuthHeader(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (isSupabaseConfigured && !supabase) {
    throw new Error('Supabase is configured but its client is unavailable.');
  }
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw new Error(error.message);
      const token = data?.session?.access_token;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      throw new Error(error instanceof Error ? `Could not verify the current session: ${error.message}` : 'Could not verify the current session.');
    }
  }
  if (isSupabaseConfigured && !headers.Authorization) {
    throw new Error('Your session has expired. Sign in again to synchronize progress.');
  }
  return headers;
}

function responseError(status: number, json: any, operation: string): Error {
  if (status === 401) return new Error('Your session has expired or is no longer authorized. Sign in again.');
  if (status === 403) return new Error(json?.message || `You are not authorized to ${operation}.`);
  return new Error(json?.message || json?.error || `HTTP ${status}: Failed to ${operation}`);
}

function storeServerProgress(progress: StudentContentProgress): LocallyTrackedProgress {
  const confirmed: LocallyTrackedProgress = { ...progress, pendingSync: false };
  const key = `${confirmed.studentId}_${confirmed.lessonId}`;
  LOCAL_PROGRESS_STORE[key] = confirmed;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`church_progress_${key}`, JSON.stringify(confirmed));
    } catch (error) {
      console.warn('Could not cache synchronized progress:', error);
    }
  }
  return confirmed;
}

function progressMatchesRequest(progress: any, lessonId: string, studentId?: string): progress is StudentContentProgress {
  return Boolean(
    progress?.studentId &&
    progress.lessonId === lessonId &&
    (!studentId || progress.studentId === studentId) &&
    Array.isArray(progress.sectionsCompleted)
  );
}

export function isStudentProgressSynced(progress: StudentContentProgress): boolean {
  const saved = LOCAL_PROGRESS_STORE[`${progress.studentId}_${progress.lessonId}`];
  if (!saved) return false;
  const savedSections = [...saved.sectionsCompleted].sort();
  const requestedSections = [...progress.sectionsCompleted].sort();
  return saved.status === progress.status &&
    saved.completionPercent === progress.completionPercent &&
    savedSections.length === requestedSections.length &&
    savedSections.every((section, index) => section === requestedSections[index]);
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

  try {
    const headers = await getAuthHeader();
    const query = new URLSearchParams({ lessonId });
    if (studentId) query.set('studentId', studentId);

    const res = await fetch(`/api/church/student-progress?${query.toString()}`, {
      method: 'GET',
      headers
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        data: LOCAL_PROGRESS_STORE[`${studentId || 'u1'}_${lessonId}`] || null,
        error: responseError(res.status, json, 'fetch student progress')
      };
    }

    return { data: json.progress, error: null };
  } catch (err: any) {
    // Keep an offline copy available while exposing the failed request to callers.
    const key = `${studentId || 'u1'}_${lessonId}`;
    return {
      data: LOCAL_PROGRESS_STORE[key] || null,
      error: err instanceof Error ? err : new Error('Could not fetch student progress.')
    };
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

  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/church/student-progress/start', {
      method: 'POST',
      headers,
      body: JSON.stringify({ lessonId, versionId, studentId })
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return { data: null, error: responseError(res.status, json, 'start lesson progress') };
    }

    if (!progressMatchesRequest(json.progress, lessonId, studentId)) {
      return { data: null, error: new Error('The server did not return persisted lesson progress.') };
    }
    const confirmed = storeServerProgress(json.progress);

    return { data: confirmed, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Could not start lesson progress.') };
  }
}

/**
 * 3. completeSectionProgress(input)
 * Persists the requested read state for a section of the active published lesson.
 */
export async function completeSectionProgress(
  input: CompleteSectionProgressInput
): Promise<{ data: StudentContentProgress | null; error: Error | null }> {
  const { lessonId, versionId, sectionId, studentId, isRead = true } = input;
  if (!lessonId || !versionId || !sectionId) {
    return { data: null, error: new Error('lessonId, versionId, and sectionId are required') };
  }

  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/church/student-progress/complete-section', {
      method: 'POST',
      headers,
      body: JSON.stringify({ lessonId, versionId, sectionId, isRead, studentId })
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return { data: null, error: responseError(res.status, json, 'save lesson section progress') };
    }

    if (!progressMatchesRequest(json.progress, lessonId, studentId)) {
      return { data: null, error: new Error('The server did not return persisted section progress.') };
    }
    const prog = storeServerProgress(json.progress);

    return { data: prog, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Could not save lesson section progress.') };
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

  try {
    const headers = await getAuthHeader();
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
        error: responseError(res.status, json, errorMsg)
      };
    }
    if (
      !progressMatchesRequest(json.progress, lessonId, studentId) ||
      json.progress.status !== 'COMPLETED' ||
      json.progress.completionPercent < 100
    ) {
      return { data: null, error: new Error('The server did not return persisted lesson completion.') };
    }
    if (
      !Number.isFinite(json.totalPoints) ||
      !Number.isFinite(json.pointsEarned) ||
      typeof json.isFirstCompletion !== 'boolean' ||
      !Number.isFinite(json.streak?.currentStreak) ||
      !Number.isFinite(json.streak?.longestStreak)
    ) {
      return {
        data: null,
        error: new Error('The server did not confirm persisted points and streak for this lesson completion.')
      };
    }

    const prog = storeServerProgress(json.progress);

    return { 
      data: prog, 
      error: null,
      isFirstCompletion: json.isFirstCompletion,
      pointsEarned: json.pointsEarned,
      totalPoints: json.totalPoints,
      streak: json.streak,
      completionHistory: json.completionHistory
    };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Could not persist lesson completion.') };
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
  try {
    const headers = await getAuthHeader();
    const res = await fetch('/api/church/student-progress/record-activity', {
      method: 'POST',
      headers,
      body: JSON.stringify(input)
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw responseError(res.status, json, 'record school activity');
    }
    if (
      !Number.isFinite(json.totalPoints) ||
      !Number.isFinite(json.streak?.currentStreak) ||
      !Number.isFinite(json.streak?.longestStreak)
    ) {
      throw new Error('The server did not confirm persisted points and streak for this activity.');
    }
    return {
      success: true,
      school: json.school,
      activityId: json.activityId,
      isFirstCompletion: Boolean(json.isFirstCompletion),
      pointsEarned: json.pointsEarned ?? 0,
      totalPoints: json.totalPoints,
      streak: json.streak
    };
  } catch (err: any) {
    return {
      success: false,
      school: input.school,
      activityId: input.activityId,
      isFirstCompletion: false,
      pointsEarned: 0,
      totalPoints: 0,
      streak: { currentStreak: 0, longestStreak: 0, lastActiveCairoDate: '', isActiveToday: false },
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
  try {
    const headers = await getAuthHeader();
    const query = new URLSearchParams();
    if (studentId) query.set('studentId', studentId);

    const res = await fetch(`/api/church/student-progress/summary?${query.toString()}`, {
      method: 'GET',
      headers
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw responseError(res.status, json, 'fetch student progress summary');
    }
    if (
      !Number.isFinite(json.points) ||
      !Number.isFinite(json.streak?.currentStreak) ||
      !Number.isFinite(json.streak?.longestStreak)
    ) {
      throw new Error('The server returned an incomplete authoritative progress summary.');
    }

    return {
      success: true,
      completedLessonIds: json.completedLessonIds || [],
      completedCount: json.completedCount || 0,
      totalAssignedLessons: json.totalAssignedLessons || 0,
      progressPercent: json.progressPercent || 0,
      allProgress: json.allProgress || {},
      points: json.points,
      streak: json.streak,
      completionHistory: json.completionHistory || [],
      serverCairoDate: json.serverCairoDate || new Date().toISOString().split('T')[0]
    };
  } catch (err: any) {
    // Offline / Local storage fallback
    const completedIds: string[] = [];
    const allProg: Record<string, StudentContentProgress> = {};

    // Check in-memory store
    for (const [k, p] of Object.entries(LOCAL_PROGRESS_STORE)) {
      if (!studentId || k.startsWith(`${studentId}_`)) {
        const lId = k.split('_').slice(1).join('_');
        allProg[lId] = p;
        if (p.status === 'COMPLETED' && !completedIds.includes(lId)) {
          completedIds.push(lId);
        }
      }
    }

    // Also check localStorage items for robust reload persistence
    if (typeof window !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('church_progress_')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const p = JSON.parse(raw);
              if (p && (!studentId || p.studentId === studentId)) {
                allProg[p.lessonId] = p;
                if (p.status === 'COMPLETED' && !completedIds.includes(p.lessonId)) {
                  completedIds.push(p.lessonId);
                }
              }
            }
          }
        }
      } catch (_) {}
    }
    return {
      success: false,
      completedLessonIds: completedIds,
      completedCount: completedIds.length,
      totalAssignedLessons: Math.max(1, completedIds.length),
      progressPercent: completedIds.length > 0 ? 100 : 0,
      allProgress: allProg,
      points: 0,
      streak: { currentStreak: 0, longestStreak: 0, lastActiveCairoDate: '' },
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
  try {
    const headers = await getAuthHeader();
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
  try {
    const headers = await getAuthHeader();
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
  const query = new URLSearchParams();
  if (clientState?.studentId) query.set('studentId', clientState.studentId);

  try {
    const headers = await getAuthHeader();
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
