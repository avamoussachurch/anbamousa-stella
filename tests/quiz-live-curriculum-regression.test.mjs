import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const phase23 = readFileSync(new URL('../scripts/migrations/phase23_curriculum_helper_execute_grant.sql', import.meta.url), 'utf8');

test('production quiz submission resolves the active lesson and quiz from Supabase', () => {
  const routeStart = server.indexOf('app.post("/api/church/student-quiz/submit"');
  const routeEnd = server.indexOf('app.get("/api/church/student-quiz/attempts"', routeStart);
  const route = server.slice(routeStart, routeEnd);
  assert.ok(routeStart >= 0 && routeEnd > routeStart, 'quiz submit route exists');
  assert.match(route, /getTrustedServiceClient/);
  assert.match(route, /\.from\('lessons'\)/);
  assert.match(route, /\.from\('lesson_versions'\)/);
  assert.match(route, /quiz_draft/);
  assert.match(route, /active_version_id/);
  assert.match(route, /checkStudentLessonAccessWithDatabase/);
});

test('live quiz class authorization uses authoritative Supabase class memberships', () => {
  assert.match(server, /async function checkStudentLessonAccessWithDatabase/);
  assert.match(server, /\.from\('class_memberships'\)/);
  assert.match(server, /\.from\('class_instances'\)/);
});

test('grade class-group helper is executable by authenticated users but not anon', () => {
  assert.match(phase23, /REVOKE ALL ON FUNCTION public\.curriculum_grade_class_group\(TEXT\) FROM PUBLIC, anon/i);
  assert.match(phase23, /GRANT EXECUTE ON FUNCTION public\.curriculum_grade_class_group\(TEXT\) TO authenticated/i);
});
