import type { Role } from '../types';
import { CANONICAL_GRADES } from './classGroups';

export type HymnsTaxisLevel = 1 | 2 | 3;

export function isValidSundaySchoolGrade(value: unknown): value is string {
  return typeof value === 'string' &&
    Object.values(CANONICAL_GRADES).some(grade => grade.code === value);
}

export function isValidHymnsTaxisRegistration(grade: unknown, level: unknown): boolean {
  return isValidSundaySchoolGrade(grade) && parseHymnsTaxisLevel(level) !== null;
}

export function parseHymnsTaxisLevel(value: unknown): HymnsTaxisLevel | null {
  const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return parsed === 1 || parsed === 2 || parsed === 3 ? parsed : null;
}

export function canInitializeHymnsTaxisLevel(
  role: Role | null | undefined,
  currentLevel: unknown,
  requestedLevel: unknown
): requestedLevel is HymnsTaxisLevel {
  return role === 'student' &&
    parseHymnsTaxisLevel(currentLevel) === null &&
    parseHymnsTaxisLevel(requestedLevel) !== null;
}

export function filterItemsByHymnsTaxisLevel<T extends { level?: number | null }>(
  items: T[],
  level: unknown
): T[] {
  const assignedLevel = parseHymnsTaxisLevel(level);
  if (assignedLevel === null) return [];
  return items.filter(item => item.level === assignedLevel);
}

export function filterTaxisItemsByLevel<T extends { level?: number | null }>(items: T[], level: unknown): T[] {
  return filterItemsByHymnsTaxisLevel(items, level);
}
