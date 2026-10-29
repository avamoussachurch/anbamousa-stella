import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { getCachedProfileFields } from '../src/context/AuthContext.tsx';
import {
  completeLessonProgress,
  completeSectionProgress,
  getStudentProgressSummary,
  isStudentProgressSynced
} from '../src/lib/studentProgressService.ts';
import { awardPoints } from '../src/lib/pointsService.ts';

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const originalLocalStorage = globalThis.localStorage;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  if (originalLocalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = originalLocalStorage;
});

test('cached profile fields cannot override points, streaks, role, or another user', () => {
  const cached = JSON.stringify({
    id: 'student-1',
    parentEmail: 'parent@example.org',
    points: 9999,
    currentStreak: 99,
    longestStreak: 100,
    role: 'admin'
  });

  assert.deepEqual(getCachedProfileFields(cached, 'student-1'), {
    parentEmail: 'parent@example.org',
    phone: undefined,
    grade: undefined,
    parentPin: undefined,
    screenTimeSeconds: undefined
  });
  assert.deepEqual(getCachedProfileFields(cached, 'student-2'), {});
});

test('server summary refresh accepts newer lower points and streak values', async () => {
  const summaries = [
    { success: true, points: 240, streak: { currentStreak: 12, longestStreak: 20 } },
    { success: true, points: 18, streak: { currentStreak: 2, longestStreak: 7 } }
  ];
  globalThis.fetch = async () => new Response(JSON.stringify(summaries.shift()), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });

  const refreshed = await getStudentProgressSummary('student-1');
  const relogged = await getStudentProgressSummary('student-1');

  assert.equal(refreshed.points, 240);
  assert.equal(refreshed.streak.currentStreak, 12);
  assert.equal(relogged.points, 18);
  assert.equal(relogged.streak.currentStreak, 2);
});

test('failed section and lesson writes return explicit errors without recording success', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, message: 'write rejected' }), {
    status: 500,
    headers: { 'content-type': 'application/json' }
  });

  const section = await completeSectionProgress({
    studentId: 'student-1',
    lessonId: 'lesson-1',
    versionId: 'version-1',
    sectionId: 'section-1'
  });
  const lesson = await completeLessonProgress({
    studentId: 'student-1',
    lessonId: 'lesson-2',
    versionId: 'version-2'
  });

  assert.equal(section.data, null);
  assert.match(section.error.message, /write rejected/);
  assert.equal(lesson.data, null);
  assert.match(lesson.error.message, /write rejected/);
  assert.equal(isStudentProgressSynced({
    studentId: 'student-1',
    lessonId: 'lesson-1',
    status: 'IN_PROGRESS',
    sectionsCompleted: ['section-1'],
    totalSections: 1,
    completionPercent: 100
  }), false);
});

test('expired server session is surfaced and does not produce an authoritative summary', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ message: 'expired' }), {
    status: 401,
    headers: { 'content-type': 'application/json' }
  });

  const summary = await getStudentProgressSummary('student-1');

  assert.equal(summary.success, false);
  assert.match(summary.error, /session has expired/i);
  assert.equal(summary.points, 0);
  assert.equal(summary.streak.currentStreak, 0);
});

test('successful section synchronization is cached as confirmed progress', async () => {
  const progress = {
    studentId: 'student-1',
    lessonId: 'lesson-3',
    versionId: 'version-3',
    status: 'IN_PROGRESS',
    sectionsCompleted: ['section-1'],
    totalSections: 3,
    completionPercent: 33
  };
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, progress }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });

  const result = await completeSectionProgress({
    studentId: progress.studentId,
    lessonId: progress.lessonId,
    versionId: progress.versionId,
    sectionId: 'section-1'
  });

  assert.equal(result.error, null);
  assert.equal(result.data.pendingSync, false);
  assert.equal(isStudentProgressSynced(result.data), true);
});

test('lesson completion is not reported as successful without server-confirmed points', async () => {
  const progress = {
    studentId: 'student-1',
    lessonId: 'lesson-4',
    status: 'COMPLETED',
    sectionsCompleted: ['section-1'],
    totalSections: 1,
    completionPercent: 100
  };
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, progress }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });

  const result = await completeLessonProgress({
    studentId: progress.studentId,
    lessonId: progress.lessonId,
    versionId: 'version-4'
  });

  assert.equal(result.data, null);
  assert.match(result.error.message, /did not confirm persisted points/i);
});

test('authenticated points cannot be granted by editing the local cache', () => {
  const storage = new Map([
    ['church_auth_user', JSON.stringify({ id: 'student-1', points: 10 })]
  ]);
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value)
  };
  globalThis.window = { dispatchEvent() {} };

  assert.throws(() => awardPoints('student-1', 500, 'unverified'), /server-verified activity/i);
  assert.equal(JSON.parse(storage.get('church_auth_user')).points, 10);
});
