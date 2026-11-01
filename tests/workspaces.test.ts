import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessWorkspace, canAccessWorkspaceTab, getDefaultWorkspace, resolveWorkspace, WORKSPACE_TABS } from '../src/lib/workspaces';
import { getPrimaryNavigationIds, getWorkspaceNavigation } from '../src/components/layout/workspaceNavigation';
import { getLanguageDirection } from '../src/lib/uiPreferences';

test('student-only account opens and is limited to the student workspace', () => {
  const roles = ['student'] as const;
  assert.equal(getDefaultWorkspace([...roles]), 'student');
  assert.equal(canAccessWorkspaceTab([...roles], 'student', 'lessons'), true);
  assert.equal(canAccessWorkspace([...roles], 'parent'), false);
});

test('parent-only account opens the family workspace without student actions', () => {
  const roles = ['parent'] as const;
  assert.equal(getDefaultWorkspace([...roles]), 'parent');
  assert.equal(canAccessWorkspaceTab([...roles], 'parent', 'family'), true);
  assert.equal(canAccessWorkspaceTab([...roles], 'parent', 'children'), true);
  assert.equal(canAccessWorkspaceTab([...roles], 'parent', 'journey'), true);
  assert.equal(canAccessWorkspaceTab([...roles], 'parent', 'events'), true);
  assert.equal(canAccessWorkspaceTab([...roles], 'parent', 'feed'), true);
  assert.equal(canAccessWorkspaceTab([...roles], 'student', 'lessons'), false);
  assert.deepEqual(WORKSPACE_TABS.parent, ['home', 'children', 'journey', 'family', 'events', 'feed', 'profile']);
});

test('servant-only account opens the servant workspace without student navigation', () => {
  const roles = ['teacher'] as const;
  assert.equal(getDefaultWorkspace([...roles]), 'teacher');
  assert.equal(canAccessWorkspaceTab([...roles], 'teacher', 'studio'), true);
  assert.equal(canAccessWorkspaceTab([...roles], 'teacher', 'lessons'), true);
  assert.equal(canAccessWorkspaceTab([...roles], 'teacher', 'feed'), true);
  assert.equal(canAccessWorkspaceTab([...roles], 'student', 'lessons'), false);
});

test('admin-only account opens the admin workspace', () => {
  const roles = ['admin'] as const;
  assert.equal(getDefaultWorkspace([...roles]), 'admin');
  assert.equal(canAccessWorkspaceTab([...roles], 'admin', 'role-requests'), true);
  assert.equal(canAccessWorkspaceTab([...roles], 'admin', 'accounts'), true);
  assert.equal(canAccessWorkspaceTab([...roles], 'admin', 'support'), true);
  assert.equal(canAccessWorkspaceTab([...roles], 'student', 'home'), false);
});

test('a direct Admin workspace URL is rejected when the assigned roles do not include admin', () => {
  const studentRoles = ['student'] as const;
  assert.equal(resolveWorkspace([...studentRoles], 'admin'), 'student');
  assert.equal(canAccessWorkspaceTab([...studentRoles], 'admin', 'accounts'), false);
  assert.equal(canAccessWorkspaceTab([...studentRoles], 'admin', 'security'), false);
});

test('multi-role account can explicitly select each assigned workspace', () => {
  const roles = ['student', 'parent', 'teacher'] as const;
  assert.equal(resolveWorkspace([...roles], 'parent'), 'parent');
  assert.equal(resolveWorkspace([...roles], 'teacher'), 'teacher');
  assert.equal(resolveWorkspace([...roles], 'student'), 'student');
});

test('admin privileges remain assigned while an admin switches to another granted workspace', () => {
  const roles = ['admin', 'student', 'parent'] as const;
  assert.equal(resolveWorkspace([...roles], 'student'), 'student');
  assert.equal(canAccessWorkspaceTab([...roles], 'admin', 'role-requests'), true);
  assert.equal(resolveWorkspace([...roles], 'parent'), 'parent');
});

test('invalid workspace and tab routes are rejected', () => {
  const roles = ['student', 'parent'] as const;
  assert.equal(resolveWorkspace([...roles], 'admin'), 'parent');
  assert.equal(canAccessWorkspaceTab([...roles], 'parent', 'lessons'), false);
  assert.equal(canAccessWorkspaceTab([...roles], 'student', 'family'), false);
});

test('refresh resolves the URL workspace against the current assigned roles', () => {
  const serverRoles = ['student', 'parent'] as const;
  const urlWorkspace = new URLSearchParams('?workspace=parent&tab=family').get('workspace');
  assert.equal(resolveWorkspace([...serverRoles], urlWorkspace), 'parent');
  assert.equal(canAccessWorkspaceTab([...serverRoles], 'parent', 'family'), true);
});

test('revoked workspace access falls back to another currently assigned workspace', () => {
  const refreshedRoles = ['student'] as const;
  assert.equal(resolveWorkspace([...refreshedRoles], 'parent'), 'student');
  assert.equal(canAccessWorkspaceTab([...refreshedRoles], 'parent', 'family'), false);
});

test('role-specific navigation contains no duplicate destinations and keeps mobile navigation concise', () => {
  for (const workspace of ['student', 'parent', 'teacher', 'admin'] as const) {
    const items = getWorkspaceNavigation(workspace, 'en');
    const ids = items.map(item => item.id);
    const mobilePrimary = getPrimaryNavigationIds(workspace);
    assert.equal(new Set(ids).size, ids.length, `${workspace} has duplicate destination IDs`);
    assert.ok(mobilePrimary.length <= 5, `${workspace} mobile primary navigation is too long`);
    assert.ok(mobilePrimary.every(id => ids.includes(id)), `${workspace} primary navigation references an unknown destination`);
  }
});

test('Feed is a visible primary destination for students, parents, and servants only', () => {
  for (const workspace of ['student', 'parent', 'teacher'] as const) {
    const items = getWorkspaceNavigation(workspace, 'en');
    assert.ok(items.some(item => item.id === 'feed' && item.label === 'Feed'));
    assert.ok(getPrimaryNavigationIds(workspace).includes('feed'));
    assert.equal(canAccessWorkspaceTab([workspace], workspace, 'feed'), true);
  }
  assert.equal(canAccessWorkspaceTab(['admin'], 'admin', 'feed'), false);
});

test('workspace navigation retains Arabic RTL and English LTR presentation', () => {
  assert.equal(getLanguageDirection('ar'), 'rtl');
  assert.equal(getLanguageDirection('en'), 'ltr');
  assert.equal(getWorkspaceNavigation('parent', 'ar').find(item => item.id === 'feed')?.label, 'المنشورات');
  assert.equal(getWorkspaceNavigation('parent', 'en').find(item => item.id === 'feed')?.label, 'Feed');
});

test('student More removes duplicated Hymns and Coptic Taxis links but their routes remain available', () => {
  const studentIds = getWorkspaceNavigation('student', 'en').map(item => item.id);
  assert.equal(studentIds.includes('hymns'), false);
  assert.equal(studentIds.includes('taxis'), false);
  assert.equal(studentIds.includes('agpeya'), false);
  assert.equal(studentIds.includes('calendar'), false);
  assert.equal(studentIds.filter(id => !getPrimaryNavigationIds('student').includes(id)).length, 0);
  assert.equal(WORKSPACE_TABS.student.includes('hymns'), true);
  assert.equal(WORKSPACE_TABS.student.includes('taxis'), true);
  assert.equal(WORKSPACE_TABS.student.includes('agpeya'), true);
  assert.equal(WORKSPACE_TABS.student.includes('calendar'), true);
  assert.equal(studentIds.includes('profile'), true);
  assert.equal(getPrimaryNavigationIds('student').includes('profile'), true);
});

test('parent and servant navigation do not expose another role workspace destinations', () => {
  const parentIds = getWorkspaceNavigation('parent', 'en').map(item => item.id);
  const servantIds = getWorkspaceNavigation('teacher', 'en').map(item => item.id);
  const studentIds = getWorkspaceNavigation('student', 'en').map(item => item.id);
  const adminIds = getWorkspaceNavigation('admin', 'en').map(item => item.id);
  assert.equal(parentIds.includes('lessons'), false);
  assert.equal(parentIds.includes('points'), false);
  assert.equal(servantIds.includes('points'), false);
  assert.equal(servantIds.includes('profile'), true);
  assert.equal(adminIds.includes('accounts'), true);
  assert.equal(adminIds.includes('support'), true);
  assert.equal(studentIds.includes('studio'), false);
});
