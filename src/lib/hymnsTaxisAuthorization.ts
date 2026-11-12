export type HymnsTaxisRole = 'student' | 'teacher' | 'admin' | 'parent';

export function canReadHymnsTaxis(roles: readonly HymnsTaxisRole[]): boolean {
  return roles.some(role => role === 'student' || role === 'teacher' || role === 'admin');
}

export function canManageHymnsTaxis(roles: readonly HymnsTaxisRole[]): boolean {
  return roles.some(role => role === 'teacher' || role === 'admin');
}

export function canEditOwnedTaxisItem(
  roles: readonly HymnsTaxisRole[],
  isOwner: boolean
): boolean {
  return roles.includes('admin') || (roles.includes('teacher') && isOwner);
}

export function canReviewTaxisItem(
  roles: readonly HymnsTaxisRole[],
  isOwner: boolean
): boolean {
  return roles.includes('admin') || (roles.includes('teacher') && !isOwner);
}

export function canPublishOwnedTaxisItem(
  roles: readonly HymnsTaxisRole[],
  isOwner: boolean,
  grade: string | null | undefined
): boolean {
  if (roles.includes('admin')) return true;
  if (!roles.includes('teacher') || !isOwner) return false;
  const normalizedGrade = (grade || '').toLowerCase();
  return normalizedGrade.includes('head') || normalizedGrade.includes('priest');
}
