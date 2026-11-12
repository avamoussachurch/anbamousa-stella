import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('admin Express Lesson insert is permitted only as an authenticated, self-approved version', async () => {
  const [migration, authoring] = await Promise.all([
    read('scripts/migrations/phase21_admin_approved_lesson_version_insert.sql'),
    read('src/lib/lessonAuthoringService.ts')
  ]);

  assert.match(migration, /ALTER TABLE public\.lesson_versions ENABLE ROW LEVEL SECURITY|relrowsecurity/);
  assert.match(migration, /created_by = \(SELECT auth\.uid\(\)\)/);
  assert.match(migration, /public\.can_review_curriculum_lesson\(lesson_id\)/);
  assert.match(migration, /status = 'AI_DRAFT'/);
  assert.match(migration, /status = 'APPROVED'[\s\S]*?public\.has_role\('admin'\)/);
  assert.match(migration, /approved_by::text = \(SELECT auth\.uid\(\)\)::text/);
  assert.match(migration, /approved_at IS NOT NULL/);
  assert.doesNotMatch(migration, /status = 'PUBLISHED'/);

  const expressStart = authoring.indexOf('export async function publishExpressLesson(');
  assert.notEqual(expressStart, -1);
  const expressFlow = authoring.slice(expressStart);
  assert.match(expressFlow, /status: isPublished \? 'APPROVED' : 'AI_DRAFT'/);
  assert.match(expressFlow, /approved_by: isPublished \? currentUserId : null/);
  assert.match(expressFlow, /approved_at: isPublished \? nowIso : null/);
  assert.match(expressFlow, /publishLessonVersion\(lessonId, versionId\)/);
});
