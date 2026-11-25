import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const server = await readFile(new URL('../server.ts', import.meta.url), 'utf8');
const lessonsTab = await readFile(new URL('../src/components/student/LessonsTab.tsx', import.meta.url), 'utf8');
const homeTab = await readFile(new URL('../src/components/student/HomeTab.tsx', import.meta.url), 'utf8');

test('admin class roster reads bypass legacy profiles.role RLS after server-side role verification', () => {
  assert.match(server, /const client = hasServerRole\(authContext, 'admin'\)\s*\? getTrustedRoleClient\(\)/);
  assert.match(server, /!requestedCode && hasServerRole\(authContext, 'admin'\) \? 'primary_2'/);
});

test('student lesson list waits for the authoritative online curriculum snapshot', () => {
  assert.match(lessonsTab, /if \(!isOnlineCurriculumReady \|\| isOnlineCurriculumFailed\) return \[\]/);
  assert.match(lessonsTab, /Loading your class curriculum/);
});

test('online Home lessons trust membership-scoped curriculum results instead of stale profile grades', () => {
  assert.match(homeTab, /if \(isOnlineAuth\) return true/);
});


test('student and teacher Lessons tab opens on the progression roadmap by default', () => {
  assert.match(lessonsTab, /const \[displayMode, setDisplayMode\] = useState<'roadmap' \| 'cards'>\('roadmap'\)/);
  assert.match(lessonsTab, /displayMode === 'roadmap' \?/);
  assert.match(lessonsTab, /Lesson Cards Grid/);
});

test('staff leaderboard selection is available and dual-role teachers use staff access before parent access', () => {
  const routeStart = server.indexOf('app.get("/api/church/leaderboard"');
  const routeEnd = server.indexOf('PHASE 2C.2: STUDENT QUIZZES', routeStart);
  const route = server.slice(routeStart, routeEnd);
  assert.ok(route.indexOf("hasServerRole(authContext, 'teacher')") < route.indexOf("hasServerRole(authContext, 'parent')"));
  assert.match(route, /availableClassGroupIds: permittedGroupIds/);
});
