import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  calculateQuizScore,
  getSavedQuizScore,
  moveQuizQuestion,
  resolveQuizSubmission,
  selectQuizAnswer
} from '../src/lib/studentQuizPresentation.ts';

test('answer selection changes only the active answer and respects submitted lock', () => {
  const answers = { questionA: 0 };
  const selected = selectQuizAnswer(answers, 'questionB', 2, false);

  assert.deepEqual(selected, { questionA: 0, questionB: 2 });
  assert.deepEqual(answers, { questionA: 0 });
  assert.equal(selectQuizAnswer(selected, 'questionB', 1, true), selected);
});

test('question navigation advances and remains within quiz bounds', () => {
  assert.equal(moveQuizQuestion(0, 4, -1), 0);
  assert.equal(moveQuizQuestion(1, 4, 1), 2);
  assert.equal(moveQuizQuestion(3, 4, 1), 3);
  assert.equal(moveQuizQuestion(0, 0, 1), 0);
});

test('score calculation preserves question correctness and percentage rounding', () => {
  const score = calculateQuizScore(
    [
      { id: 'q1', correctIndex: 2 },
      { id: 'q2', correctIndex: 0 },
      { id: 'q3', correctIndex: 1 }
    ],
    { q1: 2, q2: 3, q3: 1 }
  );
  assert.deepEqual(score, { correctCount: 2, totalQuestions: 3, percentage: 67 });
});

test('failed or unconfirmed submissions cannot resolve to a success result', () => {
  assert.deepEqual(
    resolveQuizSubmission({ success: false, error: 'Database unavailable' }, 'Save failed'),
    { error: 'Database unavailable' }
  );
  assert.deepEqual(
    resolveQuizSubmission({ success: true, data: null }, 'Save failed'),
    { error: 'Save failed' }
  );
});

test('result display uses only the saved server attempt score', () => {
  const attempt = {
    id: 'attempt-confirmed',
    studentId: 'student-1',
    lessonId: 'lesson-1',
    quizId: 'quiz-1',
    score: 2,
    totalScore: 3,
    percentage: 67,
    answers: []
  };
  assert.deepEqual(getSavedQuizScore(attempt), {
    correctCount: 2,
    totalQuestions: 3,
    percentage: 67
  });
  assert.equal(getSavedQuizScore(null), null);
});
