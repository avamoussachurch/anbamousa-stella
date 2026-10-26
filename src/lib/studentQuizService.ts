import { supabase, isSupabaseConfigured } from './supabase';
import { QuizDraft, StudentQuizAttempt, QuizAnswer } from '../types';

export interface SubmitQuizAttemptInput {
  lessonId: string;
  versionId: string;
  quizId: string;
  answers: Array<{
    questionId: string;
    selectedOptionIndex?: number;
    selectedIndex?: number;
  }>;
  studentId?: string;
  // Optional client fields (server will compute authoritative deterministic scores)
  score?: number;
  totalScore?: number;
  percentage?: number;
  earnedPoints?: number;
  totalPointsPossible?: number;
  idempotencyKey?: string;
  attemptId?: string;
}

// In-memory fallback for guest/offline resilience
const LOCAL_QUIZ_ATTEMPTS: Record<string, StudentQuizAttempt[]> = {};

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
 * 1. getActiveLessonQuiz(lessonId)
 * Loads quiz questions belonging to the currently active PUBLISHED lesson version.
 * Rejects drafts, review versions, or non-active versions.
 */
export async function getActiveLessonQuiz(
  lessonId: string
): Promise<{ data: QuizDraft | null; error: Error | null }> {
  if (!lessonId) {
    return { data: null, error: new Error('lessonId is required') };
  }

  const headers = await getAuthHeader();
  try {
    const res = await fetch(`/api/church/student-quiz?lessonId=${encodeURIComponent(lessonId)}`, {
      method: 'GET',
      headers
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        data: null,
        error: new Error(json?.message || json?.error || `HTTP ${res.status}: Failed to fetch quiz`)
      };
    }

    return { data: json.quiz, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err?.message || 'Network error fetching quiz') };
  }
}

export interface SubmitQuizAttemptResult {
  data: StudentQuizAttempt | null;
  error: Error | null;
  isDuplicate?: boolean;
  isFirstCompletion?: boolean;
  pointsEarned?: number;
  totalPoints?: number;
  streak?: {
    currentStreak: number;
    longestStreak: number;
    streakGained: boolean;
    lastActiveCairoDate?: string;
  };
}

/**
 * 2. submitStudentQuizAttempt(input)
 * Submits student answers to the server.
 * The server computes deterministic score and percentage, ignoring any client-provided scores.
 */
export async function submitStudentQuizAttempt(
  input: SubmitQuizAttemptInput
): Promise<SubmitQuizAttemptResult> {
  const { lessonId, versionId, quizId, answers, studentId, idempotencyKey, attemptId } = input;
  if (!lessonId || !versionId || !quizId) {
    return { data: null, error: new Error('lessonId, versionId, and quizId are required') };
  }

  const headers = await getAuthHeader();
  try {
    const res = await fetch('/api/church/student-quiz/submit', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        lessonId,
        versionId,
        quizId,
        answers,
        studentId,
        idempotencyKey,
        attemptId
      })
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return {
        data: null,
        error: new Error(json?.message || json?.error || `HTTP ${res.status}: Failed to submit quiz attempt`)
      };
    }

    const attempt: StudentQuizAttempt = json.attempt;
    const key = `${attempt.studentId}_${lessonId}`;
    if (!LOCAL_QUIZ_ATTEMPTS[key]) {
      LOCAL_QUIZ_ATTEMPTS[key] = [];
    }
    const exists = LOCAL_QUIZ_ATTEMPTS[key].some(a => a.id === attempt.id);
    if (!exists) {
      LOCAL_QUIZ_ATTEMPTS[key].push(attempt);
    }
    try {
      localStorage.setItem(`church_quiz_attempts_${key}`, JSON.stringify(LOCAL_QUIZ_ATTEMPTS[key]));
      localStorage.setItem(`church_quiz_score_${key}`, String(attempt.percentage));
    } catch (e) {}

    // If Supabase is connected, sync quiz score to lesson_progress table without overriding section completion
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('lesson_progress').upsert({
          student_id: attempt.studentId,
          lesson_id: attempt.lessonId,
          quiz_score: attempt.percentage,
          completed_at: new Date().toISOString()
        });
      } catch (dbErr) {
        console.warn('Note on Supabase lesson_progress quiz score sync:', dbErr);
      }
    }

    return {
      data: attempt,
      error: null,
      isDuplicate: Boolean(json.isDuplicate),
      isFirstCompletion: Boolean(json.isFirstCompletion),
      pointsEarned: Number(json.pointsEarned ?? 0),
      totalPoints: Number(json.totalPoints ?? 0),
      streak: json.streak || {
        currentStreak: 0,
        longestStreak: 0,
        streakGained: false
      }
    };
  } catch (err: any) {
    return {
      data: null,
      error: new Error(err?.message || 'Network error submitting quiz attempt')
    };
  }
}

/**
 * 3. getStudentQuizAttempts(lessonId, studentId)
 * Fetches attempts for the authenticated student.
 */
export async function getStudentQuizAttempts(
  lessonId: string,
  studentId?: string
): Promise<{ data: StudentQuizAttempt[]; error: Error | null }> {
  if (!lessonId) {
    return { data: [], error: new Error('lessonId is required') };
  }

  const sId = studentId || 'u1';
  const key = `${sId}_${lessonId}`;

  const headers = await getAuthHeader();
  try {
    const query = new URLSearchParams({ lessonId });
    if (studentId) query.set('studentId', studentId);

    const res = await fetch(`/api/church/student-quiz/attempts?${query.toString()}`, {
      method: 'GET',
      headers
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      throw new Error(json?.message || json?.error || `HTTP ${res.status}: Failed to get quiz attempts`);
    }

    const attempts: StudentQuizAttempt[] = json.attempts || [];
    LOCAL_QUIZ_ATTEMPTS[key] = attempts;
    try {
      localStorage.setItem(`church_quiz_attempts_${key}`, JSON.stringify(attempts));
      if (attempts.length > 0) {
        const latest = attempts[attempts.length - 1];
        localStorage.setItem(`church_quiz_score_${key}`, String(latest.percentage));
      }
    } catch (e) {}

    return { data: attempts, error: null };
  } catch (err: any) {
    let cached: StudentQuizAttempt[] = [];
    try {
      const raw = localStorage.getItem(`church_quiz_attempts_${key}`);
      if (raw) cached = JSON.parse(raw);
    } catch (e) {}
    const attempts = cached.length > 0 ? cached : (LOCAL_QUIZ_ATTEMPTS[key] || []);
    return { data: attempts, error: null };
  }
}
