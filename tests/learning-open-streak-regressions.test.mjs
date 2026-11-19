import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const server = read('../server.ts');
const hymns = read('../src/components/hymns/HymnsSchoolTab.tsx');
const taxis = read('../src/components/taxis/CopticTaxisTab.tsx');
const lessonView = read('../src/components/student/LessonView.tsx');
const progress = read('../src/lib/studentProgressService.ts');

test('opening a published Sunday School lesson records a server-derived learning day', () => {
  const startRoute = server.slice(
    server.indexOf('app.post("/api/church/student-progress/start"'),
    server.indexOf('// 3. Complete Section Progress')
  );
  assert.match(startRoute, /resolveStudentProgressLesson\(targetStudentId, lessonId, versionId\)/);
  assert.match(startRoute, /persistStudentActivityDay\(targetStudentId, new Date\(\)\.toISOString\(\)\)/);
  assert.match(startRoute, /streakSyncError/);
  assert.match(lessonView, /startLessonProgress\(/);
  assert.match(lessonView, /streak\.currentStreak/);
});

test('opening a Hymn records CONTENT_OPENED without awarding completion points', () => {
  assert.match(hymns, /activityType: 'CONTENT_OPENED'/);
  const route = server.slice(
    server.indexOf('app.post("/api/church/student-progress/record-activity"'),
    server.indexOf('// 5. Get Student Progress Summary')
  );
  const opened = route.slice(route.indexOf("if (activityType === 'CONTENT_OPENED')"), route.indexOf('// Check if this specific activity was already completed'));
  assert.match(opened, /persistStudentActivityDay/);
  assert.match(opened, /pointsEarned: 0/);
  assert.doesNotMatch(opened, /pointsConfig|completionHistory/);
});

test('opening a Taxis item records CONTENT_OPENED and is separate from completion', () => {
  assert.match(taxis, /activityType: 'CONTENT_OPENED'/);
  assert.match(taxis, /const openTaxisItem = \(item: TaxisItem\)/);
  assert.match(taxis, /onClick=\{\(\) => openTaxisItem\(item\)\}/);
  assert.match(progress, /'CONTENT_OPENED'/);
});

test('opening a lesson does not grant completion points or mark it completed', () => {
  const startRoute = server.slice(
    server.indexOf('app.post("/api/church/student-progress/start"'),
    server.indexOf('// 3. Complete Section Progress')
  );
  assert.doesNotMatch(startRoute, /persistLessonCompletion|pointsAwarded: true/);
});
