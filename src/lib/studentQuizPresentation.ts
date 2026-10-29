import { StudentQuizAttempt } from '../types';

export interface QuizQuestionForScore {
  id: string;
  correctIndex: number;
}

export interface QuizScore {
  correctCount: number;
  totalQuestions: number;
  percentage: number;
}

export interface QuizSubmissionResponse {
  success: boolean;
  data?: StudentQuizAttempt | null;
  error?: string;
}

export function selectQuizAnswer(
  currentAnswers: Record<string, number>,
  questionId: string,
  optionIndex: number,
  isLocked: boolean
): Record<string, number> {
  if (isLocked) return currentAnswers;
  return { ...currentAnswers, [questionId]: optionIndex };
}

export function moveQuizQuestion(currentIndex: number, questionCount: number, direction: -1 | 1): number {
  if (questionCount <= 0) return 0;
  return Math.max(0, Math.min(questionCount - 1, currentIndex + direction));
}

export function calculateQuizScore(
  questions: QuizQuestionForScore[],
  selectedAnswers: Record<string, number>
): QuizScore {
  const correctCount = questions.reduce(
    (count, question) => count + Number(selectedAnswers[question.id] === question.correctIndex),
    0
  );
  return {
    correctCount,
    totalQuestions: questions.length,
    percentage: questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0
  };
}

export function resolveQuizSubmission(
  result: QuizSubmissionResponse,
  fallbackError: string
): { attempt: StudentQuizAttempt } | { error: string } {
  const attempt = result.data;
  if (
    !result.success ||
    !attempt ||
    typeof attempt.id !== 'string' ||
    !attempt.id ||
    !Number.isFinite(attempt.score) ||
    !Number.isFinite(attempt.totalScore) ||
    attempt.totalScore <= 0 ||
    !Number.isFinite(attempt.percentage) ||
    attempt.percentage < 0 ||
    attempt.percentage > 100
  ) {
    return { error: result.error || fallbackError };
  }
  return { attempt };
}

export function getSavedQuizScore(attempt: StudentQuizAttempt | null): QuizScore | null {
  if (
    !attempt ||
    !Number.isFinite(attempt.score) ||
    !Number.isFinite(attempt.totalScore) ||
    attempt.totalScore <= 0 ||
    !Number.isFinite(attempt.percentage)
  ) {
    return null;
  }
  return {
    correctCount: attempt.score,
    totalQuestions: attempt.totalScore,
    percentage: attempt.percentage
  };
}
