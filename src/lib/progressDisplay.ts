import type { Role } from '../types';

export function shouldShowStudentProgress(input: {
  workspace: Role | undefined;
  activeTab: string | undefined;
  roles: readonly Role[];
  progressKnown: boolean | undefined;
}): boolean {
  return Boolean(
    input.workspace === 'student'
    && input.activeTab
    && !['home', 'points', 'profile'].includes(input.activeTab)
    && input.roles.includes('student')
    && input.progressKnown
  );
}
