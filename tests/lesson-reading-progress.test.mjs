import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  calculateSectionProgress,
  canFinishLesson,
  toggleReadSection
} from '../src/lib/lessonReadingProgress.ts';
import {
  completeLessonProgress,
  completeSectionProgress
} from '../src/lib/studentProgressService.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('section read state can be toggled in either direction without duplicates', () => {
  assert.deepEqual(toggleReadSection([], 'section-1'), ['section-1']);
  assert.deepEqual(toggleReadSection(['section-1'], 'section-1'), []);
  assert.deepEqual(toggleReadSection(['section-1', 'section-2'], 'section-1'), ['section-2']);
});

test('section progress counts only required lesson sections', () => {
  assert.deepEqual(
    calculateSectionProgress(['section-1', 'section-2', 'section-3'], ['section-1', 'old-section']),
    { completedCount: 1, totalCount: 3, completionPercent: 33, allCompleted: false }
  );
  assert.equal(
    calculateSectionProgress(['section-1', 'section-2'], ['section-1', 'section-2']).allCompleted,
    true
  );
});

test('incomplete sections cannot finish; all required sections can, unless already completed', () => {
  const sections = ['section-1', 'section-2'];
  assert.equal(canFinishLesson(sections, ['section-1']), false);
  assert.equal(canFinishLesson(sections, sections), true);
  assert.equal(canFinishLesson(sections, sections, { status: 'COMPLETED' }), false);
  assert.equal(canFinishLesson([], []), false);
});

test('unread toggles are saved only after server confirmation', async () => {
  let requestBody;
  const progress = {
    studentId: 'student-1',
    lessonId: 'lesson-1',
    versionId: 'version-1',
    status: 'IN_PROGRESS',
    sectionsCompleted: [],
    totalSections: 1,
    completionPercent: 0
  };
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ success: true, progress }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };

  const result = await completeSectionProgress({
    studentId: progress.studentId,
    lessonId: progress.lessonId,
    versionId: progress.versionId,
    sectionId: 'section-1',
    isRead: false
  });

  assert.equal(requestBody.isRead, false);
  assert.equal(result.error, null);
  assert.deepEqual(result.data.sectionsCompleted, []);
});

test('a failed section save returns an error and no progress success', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    success: false,
    message: 'section write unavailable'
  }), {
    status: 503,
    headers: { 'content-type': 'application/json' }
  });

  const result = await completeSectionProgress({
    studentId: 'student-1',
    lessonId: 'lesson-2',
    versionId: 'version-2',
    sectionId: 'section-1',
    isRead: true
  });

  assert.equal(result.data, null);
  assert.match(result.error.message, /section write unavailable/);
});

test('repeated completion requests rely on server-confirmed idempotent rewards', async () => {
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return new Response(JSON.stringify({
      success: true,
      progress: {
        studentId: 'student-1',
        lessonId: 'lesson-3',
        status: 'COMPLETED',
        sectionsCompleted: ['section-1'],
        totalSections: 1,
        completionPercent: 100
      },
      isFirstCompletion: requestCount === 1,
      pointsEarned: requestCount === 1 ? 50 : 0,
      totalPoints: 150,
      streak: { currentStreak: 2, longestStreak: 4 }
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };

  const input = {
    studentId: 'student-1',
    lessonId: 'lesson-3',
    versionId: 'version-3'
  };
  const first = await completeLessonProgress(input);
  const repeated = await completeLessonProgress(input);

  assert.equal(first.error, null);
  assert.equal(first.pointsEarned, 50);
  assert.equal(repeated.error, null);
  assert.equal(repeated.pointsEarned, 0);
  assert.equal(repeated.totalPoints, 150);
  assert.equal(requestCount, 2);
});
