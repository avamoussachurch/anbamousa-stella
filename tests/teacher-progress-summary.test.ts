import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeStudentLessonProgress } from '../src/lib/teacherProgressSummary';

test('section reads count as a completed lesson when all sections in the active version are read', () => {
  const rows = mergeStudentLessonProgress(
    [],
    [{
      student_id: 'student-1',
      lesson_id: 'lesson-1',
      version_id: 'version-current',
      sections_completed: ['section-1', 'section-2'],
      total_sections: 2,
      updated_at: '2026-11-12T10:00:00.000Z'
    }],
    new Map([['lesson-1', 'version-current']])
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].completed, true);
  assert.equal(rows[0].completed_at, '2026-11-12T10:00:00.000Z');
});

test('legacy and section progress for the same student and lesson are counted once', () => {
  const rows = mergeStudentLessonProgress(
    [{
      student_id: 'student-1',
      lesson_id: 'lesson-1',
      completed: false,
      completed_at: null
    }],
    [{
      student_id: 'student-1',
      lesson_id: 'lesson-1',
      version_id: 'version-current',
      sections_completed: ['section-1'],
      total_sections: 1,
      updated_at: '2026-11-12T10:00:00.000Z'
    }],
    new Map([['lesson-1', 'version-current']])
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].completed, true);
});

test('partial section reading is progress but not a completed lesson', () => {
  const rows = mergeStudentLessonProgress(
    [],
    [{
      student_id: 'student-1',
      lesson_id: 'lesson-1',
      version_id: 'version-current',
      sections_completed: ['section-1'],
      total_sections: 3,
      updated_at: '2026-11-12T10:00:00.000Z'
    }],
    new Map([['lesson-1', 'version-current']])
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].completed, false);
  assert.equal(rows[0].completed_at, null);
});

test('section progress from an outdated lesson version is ignored', () => {
  const rows = mergeStudentLessonProgress(
    [],
    [{
      student_id: 'student-1',
      lesson_id: 'lesson-1',
      version_id: 'version-old',
      sections_completed: ['section-1'],
      total_sections: 1,
      updated_at: '2026-11-12T10:00:00.000Z'
    }],
    new Map([['lesson-1', 'version-current']])
  );

  assert.equal(rows.length, 0);
});
