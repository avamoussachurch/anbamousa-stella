import type { StudentLearningReviewData } from '../../lib/classRosterService';

export interface ParentWeeklyLearningDay {
  key: string;
  label: string;
  completedLessons: number;
}

export function getParentFamilyState(
  loading: boolean,
  error: string | null,
  linkedChildrenCount: number
): 'loading' | 'error' | 'empty' | 'ready' {
  if (loading) return 'loading';
  if (error) return 'error';
  return linkedChildrenCount === 0 ? 'empty' : 'ready';
}

export function getParentWeeklyLearningDays(
  review: StudentLearningReviewData | null,
  now = new Date(),
  locale = 'en-EG'
): ParentWeeklyLearningDay[] | null {
  if (!review) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      label: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date),
      completedLessons: 0
    };
  });
  const dayByKey = new Map(days.map(day => [day.key, day]));

  review.lessons.forEach(lesson => {
    if (lesson.progressStatus !== 'COMPLETED' || !lesson.lastActivityAt) return;
    const completedAt = new Date(lesson.lastActivityAt);
    if (Number.isNaN(completedAt.getTime())) return;
    const key = `${completedAt.getFullYear()}-${String(completedAt.getMonth() + 1).padStart(2, '0')}-${String(completedAt.getDate()).padStart(2, '0')}`;
    const day = dayByKey.get(key);
    if (day) day.completedLessons += 1;
  });

  return days.map(({ key, label, completedLessons }) => ({ key, label, completedLessons }));
}

export function getParentChildReviewState(
  loading: boolean,
  error: string | null,
  review: StudentLearningReviewData | null
): 'loading' | 'error' | 'unavailable' | 'empty' | 'ready' {
  if (loading) return 'loading';
  if (error) return 'error';
  if (!review) return 'unavailable';
  return review.lessons.length === 0 ? 'empty' : 'ready';
}
