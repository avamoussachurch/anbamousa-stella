import assert from 'node:assert/strict';
import test from 'node:test';
import { LessonVersion } from '../types';
import {
  canManageLessonVersion,
  canModifyScheduledPublication,
  canPublishVersion,
  formatPublicationTime,
  getPublicationTimezone,
  isPublicationDue,
  parsePublicationLocalDateTime,
  publishLessonsInBulk,
  scheduleLessonsInBulk,
  validateFuturePublicationTime
} from './lessonPublishingService';

function version(status: LessonVersion['status'] = 'APPROVED'): LessonVersion {
  return {
    id: 'version-1',
    lessonId: 'lesson-1',
    versionNumber: 1,
    status,
    createdBy: 'teacher-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    approvedBy: 'reviewer-1',
    approvedAt: '2026-01-01T00:00:00.000Z',
    summaryEn: '',
    summaryAr: '',
    bigIdeaEn: '',
    bigIdeaAr: '',
    objectivesEn: [],
    objectivesAr: [],
    sections: []
  };
}

test('publishing permission is limited to an owning teacher or an administrator', () => {
  const approved = version();
  assert.equal(canManageLessonVersion('teacher', 'teacher-1', approved), true);
  assert.equal(canManageLessonVersion('teacher', 'teacher-2', approved), false);
  assert.equal(canManageLessonVersion('student', 'teacher-1', approved), false);
  assert.equal(canManageLessonVersion('admin', 'admin-1', approved), true);
  assert.equal(canManageLessonVersion('admin', null, approved), false);
});

test('only approved versions with approval metadata are publishable', () => {
  assert.equal(canPublishVersion(version(), 'lesson-1').canPublish, true);
  assert.equal(canPublishVersion(version('AI_DRAFT'), 'lesson-1').canPublish, false);
  assert.equal(canPublishVersion(version('SERVANT_REVIEW'), 'lesson-1').canPublish, false);
  assert.equal(canPublishVersion(version('REVISION_REQUESTED'), 'lesson-1').canPublish, false);
  assert.equal(canPublishVersion(version(), 'another-lesson').canPublish, false);
  assert.equal(canPublishVersion({ ...version(), approvedAt: undefined }, 'lesson-1').canPublish, false);
});

test('schedule time validation rejects invalid and past times and accepts a future instant', () => {
  const now = new Date('2026-10-29T12:00:00.000Z');
  assert.equal(validateFuturePublicationTime('', now), null);
  assert.equal(validateFuturePublicationTime('not-a-date', now), null);
  assert.equal(validateFuturePublicationTime('2026-10-29T11:59:59.000Z', now), null);
  assert.equal(
    validateFuturePublicationTime('2026-10-29T12:01:00.000Z', now)?.toISOString(),
    '2026-10-29T12:01:00.000Z'
  );
});

test('due publication is recognized by server-compatible UTC instant comparison', () => {
  const now = new Date('2026-10-29T12:05:00.000Z');
  assert.equal(isPublicationDue('2026-10-29T12:04:59.000Z', now), true);
  assert.equal(isPublicationDue('2026-10-29T12:05:00.000Z', now), true);
  assert.equal(isPublicationDue('2026-10-29T12:05:01.000Z', now), false);
  assert.equal(isPublicationDue('invalid', now), false);
});

test('only scheduled jobs may be cancelled or rescheduled', () => {
  assert.equal(canModifyScheduledPublication({ status: 'scheduled' }), true);
  assert.equal(canModifyScheduledPublication({ status: 'processing' }), false);
  assert.equal(canModifyScheduledPublication({ status: 'published' }), false);
  assert.equal(canModifyScheduledPublication({ status: 'failed' }), false);
  assert.equal(canModifyScheduledPublication({ status: 'cancelled' }), false);
  assert.equal(canModifyScheduledPublication(null), false);
});

test('bulk publishing returns a result for each item and preserves partial failures', async () => {
  const results = await publishLessonsInBulk([
    { lessonId: 'lesson-1', versionId: 'version-1' },
    { lessonId: 'lesson-2', versionId: 'version-2' }
  ], async lessonId => lessonId === 'lesson-1'
    ? {
        data: {
          lessonId,
          versionId: 'version-1',
          status: 'PUBLISHED',
          activeVersionId: 'version-1',
          lessonStatus: 'published',
          publishedAt: '2026-10-29T12:00:00.000Z'
        },
        error: null
      }
    : { data: null, error: new Error('Approval changed before publish') });

  assert.deepEqual(results.map(result => result.success), [true, false]);
  assert.equal(results[1].error, 'Approval changed before publish');
});

test('bulk scheduling reports each outcome, including thrown requests', async () => {
  const scheduledAt = new Date('2026-10-29T12:00:00.000Z');
  const results = await scheduleLessonsInBulk([
    { lessonId: 'lesson-1', versionId: 'version-1' },
    { lessonId: 'lesson-2', versionId: 'version-2' },
    { lessonId: 'lesson-3', versionId: 'version-3' }
  ], scheduledAt, async lessonId => {
    if (lessonId === 'lesson-1') {
      return {
        data: {
          id: 'job-1',
          lesson_id: lessonId,
          version_id: 'version-1',
          scheduled_at: scheduledAt.toISOString(),
          status: 'scheduled',
          error_message: null,
          created_at: scheduledAt.toISOString()
        },
        error: null
      };
    }
    if (lessonId === 'lesson-2') {
      return { data: null, error: new Error('Already scheduled') };
    }
    throw new Error('Network unavailable');
  });

  assert.deepEqual(results.map(result => result.success), [true, false, false]);
  assert.equal(results[1].error, 'Already scheduled');
  assert.equal(results[2].error, 'Network unavailable');
});

test('timezone display uses the configured timezone and falls back to Cairo', () => {
  assert.equal(getPublicationTimezone('Asia/Jerusalem'), 'Asia/Jerusalem');
  assert.equal(getPublicationTimezone('not-a-timezone'), 'Africa/Cairo');
  assert.equal(getPublicationTimezone(), 'Africa/Cairo');
  assert.match(formatPublicationTime('2026-10-29T12:00:00.000Z', 'Africa/Cairo', 'en'), /2026/);
});

test('local schedule input converts to the selected timezone and rejects malformed values', () => {
  assert.equal(
    parsePublicationLocalDateTime('2026-01-15T12:00', 'Africa/Cairo')?.toISOString(),
    '2026-01-15T10:00:00.000Z'
  );
  assert.equal(parsePublicationLocalDateTime('not-a-date', 'Africa/Cairo'), null);
});
