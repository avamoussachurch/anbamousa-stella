import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const server = await readFile(new URL('../server.ts', import.meta.url), 'utf8');
const lessonsTab = await readFile(new URL('../src/components/student/LessonsTab.tsx', import.meta.url), 'utf8');
const homeTab = await readFile(new URL('../src/components/student/HomeTab.tsx', import.meta.url), 'utf8');
const roadmap = await readFile(new URL('../src/components/student/StudentRoadmapView.tsx', import.meta.url), 'utf8');
const studentHome = await readFile(new URL('../src/components/student/StudentAdventureHome.tsx', import.meta.url), 'utf8');

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

test('student roadmap has illustrated scenery, an animated active quest, and animated trail segments', () => {
  assert.match(roadmap, /roadmap-desert-sky/);
  assert.match(roadmap, /whileInView=\{\{ pathLength: 1 \}\}/);
  assert.match(roadmap, /border-amber-300\/70/);
  assert.match(roadmap, /DESERT_WAYPOINTS/);
});

test('student home keeps one learning trail and distinct points and streak leaderboard destinations', async () => {
  const pointsTab = await readFile(new URL('../src/components/student/PointsTab.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(studentHome, /MosesJourneyBadge|stella-home-progress-duplicate|stella-home-hero-progress/);
  assert.match(studentHome, /openPointsView\('leaderboard'\)/);
  assert.match(studentHome, /openPointsView\('streak'\)/);
  assert.match(pointsTab, /anba:points-view/);
  assert.match(pointsTab, /setView\(requested\)/);
});

test('student welcome hero is an illustrated Anba Mousa church courtyard with a lantern-lit path', () => {
  assert.match(studentHome, /Anba Mousa church courtyard/);
  assert.match(studentHome, /processional path/);
  assert.match(studentHome, /palm silhouettes/);
  assert.match(studentHome, /aria-hidden="true"/);
  assert.match(studentHome, /F5D98C/);
});
