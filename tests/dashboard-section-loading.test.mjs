import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const parent = readFileSync(new URL('../src/components/parent/ParentDashboard.tsx', import.meta.url), 'utf8');
const teacher = readFileSync(new URL('../src/components/teacher/TeacherDashboard.tsx', import.meta.url), 'utf8');

test('parent dashboard loads only data needed by the active section', () => {
  assert.match(parent, /const needsChildren = section === 'home' \|\| section === 'children' \|\| section === 'journey'/);
  assert.match(parent, /const needsEvents = section === 'home' \|\| section === 'events'/);
  assert.match(parent, /const needsAnnouncements = section === 'home' \|\| section === 'events'/);
  assert.match(parent, /const needsRewards = section === 'home' \|\| section === 'family'/);
  assert.match(parent, /if \(isParent && needsRewards\) void refreshRewards\(\)/);
});

test('teacher activation requests are not fetched on every tab switch', () => {
  assert.match(teacher, /if \(activeTab !== 'overview'\) return/);
  assert.match(teacher, /getPendingActivationRequests\(\)/);
});
