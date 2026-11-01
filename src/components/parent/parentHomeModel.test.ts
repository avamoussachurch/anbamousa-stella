import assert from 'node:assert/strict';
import test from 'node:test';
import type { StudentLearningReviewData } from '../../lib/classRosterService';
import { getParentChildReviewState, getParentFamilyState, getParentWeeklyLearningDays } from './parentHomeModel';

const now = new Date(2026, 9, 31, 12);

function reviewWithLessons(lessons: StudentLearningReviewData['lessons']): StudentLearningReviewData {
  return {
    student: { id: 'child-1', name: 'Child One', grade: 'Grade 4', classGroupId: 'primary_2', avatarUrl: '' },
    summary: { totalLessons: lessons.length, completedLessonsCount: 0, masteredCount: 0, developingCount: 0, needsReviewCount: 0, averageQuizScore: 0 },
    lessons,
    needsReviewItems: [],
    recentActivity: []
  };
}

function lesson(progressStatus: 'COMPLETED' | 'IN_PROGRESS', lastActivityAt: string | null) {
  return {
    lessonId: `${progressStatus}-${lastActivityAt}`,
    title: 'Lesson',
    category: 'Sunday School',
    versionId: '',
    progressStatus,
    completionPercent: progressStatus === 'COMPLETED' ? 100 : 0,
    sectionsCompleted: [],
    totalSections: 0,
    latestQuizScore: 0,
    latestQuizPercentage: 0,
    quizPassed: false,
    quizAttemptsCount: 0,
    masteryStatus: 'NOT_STARTED' as const,
    needsReview: false,
    lastActivityAt
  };
}

test('parent weekly chart counts only the selected child’s completed records in the last seven days', () => {
  const review = reviewWithLessons([
    lesson('COMPLETED', '2026-10-31T08:00:00'),
    lesson('COMPLETED', '2026-10-25T08:00:00'),
    lesson('COMPLETED', '2026-10-24T08:00:00'),
    lesson('IN_PROGRESS', '2026-10-31T09:00:00'),
    lesson('COMPLETED', null)
  ]);
  const days = getParentWeeklyLearningDays(review, now, 'en-US');
  assert.ok(days);
  assert.equal(days.length, 7);
  assert.equal(days.reduce((sum, day) => sum + day.completedLessons, 0), 2);
  assert.equal(days.at(-1)?.completedLessons, 1);
  assert.equal(days[0].completedLessons, 1);
});

test('parent Home distinguishes empty children, no records, loading, unavailable and failed reviews', () => {
  assert.equal(getParentFamilyState(true, null, 0), 'loading');
  assert.equal(getParentFamilyState(false, 'Request failed', 0), 'error');
  assert.equal(getParentFamilyState(false, null, 0), 'empty');
  assert.equal(getParentFamilyState(false, null, 2), 'ready');
  assert.equal(getParentChildReviewState(true, null, null), 'loading');
  assert.equal(getParentChildReviewState(false, 'Request failed', null), 'error');
  assert.equal(getParentChildReviewState(false, null, null), 'unavailable');
  assert.equal(getParentChildReviewState(false, null, reviewWithLessons([])), 'empty');
  assert.equal(getParentChildReviewState(false, null, reviewWithLessons([lesson('COMPLETED', '2026-10-31T08:00:00')])), 'ready');
});

test('multiple child reviews retain separate weekly activity summaries', () => {
  const firstChild = reviewWithLessons([
    lesson('COMPLETED', '2026-10-31T08:00:00'),
    lesson('COMPLETED', '2026-10-30T08:00:00')
  ]);
  const secondChild = reviewWithLessons([
    lesson('COMPLETED', '2026-10-29T08:00:00')
  ]);
  const firstCount = getParentWeeklyLearningDays(firstChild, now)?.reduce((sum, day) => sum + day.completedLessons, 0);
  const secondCount = getParentWeeklyLearningDays(secondChild, now)?.reduce((sum, day) => sum + day.completedLessons, 0);
  assert.equal(firstCount, 2);
  assert.equal(secondCount, 1);
});

test('weekly chart preserves a verified zero-activity week instead of marking it unavailable', () => {
  const days = getParentWeeklyLearningDays(reviewWithLessons([lesson('IN_PROGRESS', null)]), now);
  assert.equal(days?.length, 7);
  assert.equal(days?.every(day => day.completedLessons === 0), true);
});
