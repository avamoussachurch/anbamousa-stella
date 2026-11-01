import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = path => readFile(new URL(path, import.meta.url), 'utf8');

test('servant tabs use compact titles and do not duplicate sidebar navigation', async () => {
  const teacher = await source('../src/components/teacher/TeacherDashboard.tsx');
  assert.match(teacher, /activeTab !== 'overview' && \(\s*<header/);
  assert.match(teacher, /teacherTabTitles\[activeTab\]/);
  assert.doesNotMatch(teacher, /studioNavigation|Servant Studio sections|CURRICULUM & TEACHING WORKSPACE/);
});

test('the full parent welcome remains on overview and secondary tabs use compact context', async () => {
  const [parent, home] = await Promise.all([
    source('../src/components/parent/ParentDashboard.tsx'),
    source('../src/components/parent/ParentHomeDashboard.tsx')
  ]);
  assert.match(parent, /section !== 'home' && \(\s*<header/);
  assert.match(parent, /sectionTitles\[section\]/);
  assert.doesNotMatch(parent, /Welcome, \$\{parentName\}|تابع أولادك وبياناتهم المسجلة من مكان واحد/);
  assert.match(home, /Welcome, \$\{parentName\}/);
});
