import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('servant home summary returns student progress only from the teacher active assigned class roster', async () => {
  const server = await read('../server.ts');
  assert.match(server, /hasServerRole\(authContext, 'teacher'\)/);
  assert.match(server, /\.eq\('servant_id', authContext\.userId\)/);
  assert.match(server, /\.eq\('is_active', true\)/);
  assert.match(server, /\.eq\('status', 'active'\)/);
  assert.match(server, /\.from\('profiles'\)[\s\S]*?\.in\('id', studentIds\)/);
  assert.match(server, /\.from\('quiz_attempts'\)[\s\S]*?\.in\('student_id', studentIds\)/);
  assert.match(server, /studentReports,/);
});

test('teacher progress report uses authoritative server data and handles loading, errors, and empty rosters', async () => {
  const dashboard = await read('../src/components/teacher/TeacherDashboard.tsx');
  const component = await read('../src/components/teacher/TeacherProgressReport.tsx');
  const service = await read('../src/lib/servantHomeService.ts');
  assert.match(dashboard, /<TeacherProgressReport lang=\{lang\} \/>/);
  assert.doesNotMatch(dashboard, /Progress and quiz reports are unavailable/);
  assert.match(component, /getServantHomeSummary\(\)/);
  assert.match(component, /role="alert"/);
  assert.match(component, /No students are enrolled in your active assigned classes/);
  assert.match(component, /Average quiz score/);
  assert.match(service, /studentReports/);
  assert.match(service, /students: payload\.studentReports/);
});
