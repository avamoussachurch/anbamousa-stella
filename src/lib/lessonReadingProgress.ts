import { StudentContentProgress } from '../types';

export function toggleReadSection(sectionsCompleted: string[], sectionId: string): string[] {
  return sectionsCompleted.includes(sectionId)
    ? sectionsCompleted.filter(id => id !== sectionId)
    : [...sectionsCompleted, sectionId];
}

export function calculateSectionProgress(
  sectionIds: string[],
  sectionsCompleted: string[]
): { completedCount: number; totalCount: number; completionPercent: number; allCompleted: boolean } {
  const completed = new Set(sectionsCompleted);
  const completedCount = sectionIds.filter(id => completed.has(id)).length;
  const totalCount = sectionIds.length;

  return {
    completedCount,
    totalCount,
    completionPercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    allCompleted: totalCount > 0 && completedCount === totalCount
  };
}

export function canFinishLesson(
  sectionIds: string[],
  sectionsCompleted: string[],
  progress?: StudentContentProgress
): boolean {
  if (progress?.status === 'COMPLETED' || sectionIds.length === 0) return false;
  return calculateSectionProgress(sectionIds, sectionsCompleted).allCompleted;
}
