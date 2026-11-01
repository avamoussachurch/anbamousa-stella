import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { shouldShowStudentProgress } from './progressDisplay';

test('student progress indicators require a student workspace and loaded persisted values', () => {
  assert.equal(shouldShowStudentProgress({
    workspace: 'student',
    activeTab: 'lessons',
    roles: ['student'],
    progressKnown: true
  }), true);
  assert.equal(shouldShowStudentProgress({
    workspace: 'student',
    activeTab: 'lessons',
    roles: ['student'],
    progressKnown: false
  }), false);
});

test('student progress indicators stay hidden where progress is already prominent', () => {
  for (const activeTab of ['home', 'points', 'profile']) {
    assert.equal(shouldShowStudentProgress({
      workspace: 'student',
      activeTab,
      roles: ['student'],
      progressKnown: true
    }), false);
  }
});

test('parent and servant workspaces never present account values as student progress', () => {
  for (const workspace of ['parent', 'teacher'] as const) {
    assert.equal(shouldShowStudentProgress({
      workspace,
      activeTab: 'home',
      roles: [workspace, 'student'],
      progressKnown: true
    }), false);
  }
});

test('progress visibility is based on the authenticated profile values already loaded by auth', async () => {
  const [authContext, topBar] = await Promise.all([
    readFile(new URL('../context/AuthContext.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/layout/TopBar.tsx', import.meta.url), 'utf8')
  ]);
  assert.match(authContext, /progressKnown: !profileError && Number\.isFinite\(profile\?\.points\) && Number\.isFinite\(profile\?\.current_streak\)/);
  assert.match(authContext, /progressKnown: true/);
  assert.match(topBar, /shouldShowStudentProgress/);
});
