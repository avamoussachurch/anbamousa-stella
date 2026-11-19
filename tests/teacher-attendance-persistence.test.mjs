import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('attendance and visitation storage is server-only and protected by RLS', async () => {
  const migration = await read('../supabase/migrations/20261118173103_teacher_attendance_visitation_tracking.sql');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.class_attendance_sessions/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.class_attendance_records/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.class_visitation_logs/);
  assert.equal((migration.match(/ENABLE ROW LEVEL SECURITY/g) || []).length, 3);
  assert.match(migration, /REVOKE ALL ON TABLE public\.class_visitation_logs FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.class_attendance_records TO service_role/);
});

test('attendance APIs enforce teacher role, active class assignment, and active student membership', async () => {
  const server = await read('../server.ts');
  assert.match(server, /\/api\/church\/servant\/attendance/);
  assert.match(server, /\/api\/church\/servant\/visitations/);
  assert.match(server, /hasServerRole\(authContext, 'teacher'\)/);
  assert.match(server, /\.eq\('servant_id', authContext\.userId\)[\s\S]*?\.eq\('is_active', true\)/);
  assert.match(server, /\.eq\('status', 'active'\)/);
  assert.match(server, /STUDENT_NOT_IN_ASSIGNED_CLASS/);
});

test('authenticated teacher attendance UI uses server APIs rather than demo local storage', async () => {
  const dashboard = await read('../src/components/teacher/TeacherDashboard.tsx');
  const component = await read('../src/components/teacher/TeacherAttendanceWorkspace.tsx');
  const service = await read('../src/lib/teacherAttendanceService.ts');
  assert.match(dashboard, /currentUser\?\.uid/);
  assert.match(dashboard, /<TeacherAttendanceWorkspace lang=\{lang\} \/>/);
  assert.match(component, /getTeacherAttendance\(/);
  assert.match(component, /saveTeacherAttendance\(/);
  assert.match(component, /logTeacherVisitation\(/);
  assert.match(component, /No active class assignments/);
  assert.doesNotMatch(component, /localStorage/);
  assert.match(service, /Bearer \$\{session\.access_token\}/);
});
