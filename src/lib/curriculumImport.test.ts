import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isAuthorizedCurriculumImporter,
  isDuplicateImportTitle,
  markCurriculumImportDraft,
  runCurriculumImport,
  validateImportFile
} from './curriculumImport';

test('allows supported curriculum files and rejects unsupported, empty, oversized, and unsuitable Hymns files', () => {
  assert.equal(validateImportFile('sunday_school', { name: 'lesson.pptx', size: 1024 }), null);
  assert.equal(validateImportFile('taxis', { name: 'service.mp4', size: 2048 }), null);
  assert.match(validateImportFile('sunday_school', { name: 'archive.zip', size: 1024 }) || '', /غير مدعوم/);
  assert.match(validateImportFile('sunday_school', { name: 'empty.pdf', size: 0 }) || '', /فارغ/);
  assert.match(validateImportFile('sunday_school', { name: 'large.pdf', size: 100 * 1024 * 1024 + 1 }) || '', /100/);
  assert.match(validateImportFile('hymns', { name: 'hymn.mp4', size: 2048 }) || '', /الألحان/);
});

test('allows only authenticated teacher and admin users when Supabase is configured', () => {
  assert.equal(isAuthorizedCurriculumImporter({ role: 'teacher' }, false, true), true);
  assert.equal(isAuthorizedCurriculumImporter({ role: 'admin' }, false, true), true);
  assert.equal(isAuthorizedCurriculumImporter({ role: 'student' }, false, true), false);
  assert.equal(isAuthorizedCurriculumImporter({ role: 'teacher' }, true, true), false);
  assert.equal(isAuthorizedCurriculumImporter({ role: 'teacher' }, false, false), false);
});

test('detects existing-title and same-batch duplicates independent of whitespace and case', () => {
  const existingTitles = new Set(['درس المحبة']);
  assert.equal(isDuplicateImportTitle('  درس   المحبة ', existingTitles, []), true);
  assert.equal(isDuplicateImportTitle('درس جديد', existingTitles, ['درس جديد']), true);
  assert.equal(isDuplicateImportTitle('درس مختلف', existingTitles, ['درس جديد']), false);
});

test('forces Taxis import payloads to remain drafts', () => {
  const payload = markCurriculumImportDraft({ titleAr: 'اختبار', status: 'published' });
  assert.equal(payload.status, 'draft');
});

test('creates the draft before upload and reports success only after attachment succeeds', async () => {
  const steps: string[] = [];
  const result = await runCurriculumImport({}, {
    ensureDraft: async () => {
      steps.push('draft');
      return 'draft-id';
    },
    upload: async () => {
      steps.push('upload');
      return 'storage://private/item.pdf';
    },
    attach: async (recordId, mediaReference) => {
      assert.equal(recordId, 'draft-id');
      assert.equal(mediaReference, 'storage://private/item.pdf');
      steps.push('attach');
    }
  }, () => undefined);

  assert.deepEqual(steps, ['draft', 'upload', 'attach']);
  assert.equal(result.stage, 'success');
  assert.equal(result.checkpoint.recordId, 'draft-id');
});

test('retains checkpoints after partial failure and does not repeat completed steps on retry', async () => {
  const calls = { draft: 0, upload: 0, attach: 0 };
  const operations = {
    ensureDraft: async () => {
      calls.draft += 1;
      return 'draft-id';
    },
    upload: async () => {
      calls.upload += 1;
      return 'storage://private/item.pdf';
    },
    attach: async () => {
      calls.attach += 1;
      if (calls.attach === 1) throw new Error('Temporary database failure');
    }
  };

  const failed = await runCurriculumImport({}, operations, () => undefined);
  assert.equal(failed.stage, 'error');
  assert.match(failed.error || '', /Temporary database failure/);
  assert.equal(failed.checkpoint.mediaReference, 'storage://private/item.pdf');

  const retried = await runCurriculumImport(failed.checkpoint, operations, () => undefined);
  assert.equal(retried.stage, 'success');
  assert.deepEqual(calls, { draft: 1, upload: 1, attach: 2 });
});
