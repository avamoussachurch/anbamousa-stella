import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('student, teacher, and parent surfaces localize raw service errors', async () => {
  const [feed, lesson, teacher, parent, lessonEditor, hymns, taxis, preview, manualLesson, sourceIngestion, expressLesson, feedTab] = await Promise.all([
    read('../src/components/student/FeedTab.tsx'),
    read('../src/components/student/LessonView.tsx'),
    read('../src/components/teacher/TeacherDashboard.tsx'),
    read('../src/components/parent/ParentDashboard.tsx'),
    read('../src/components/teacher/LessonEditModal.tsx'),
    read('../src/components/hymns/HymnsSchoolTab.tsx'),
    read('../src/components/taxis/CopticTaxisTab.tsx'),
    read('../src/components/teacher/StudentExperiencePreview.tsx'),
    read('../src/components/sunday-school/teacher/ManualLessonStudio.tsx'),
    read('../src/components/sunday-school/teacher/SourceIngestionStudio.tsx'),
    read('../src/components/teacher/ExpressLessonPublishModal.tsx'),
    read('../src/components/student/FeedTab.tsx'),
  ]);

  for (const source of [feed, lesson, teacher, parent, lessonEditor, hymns, taxis, preview, manualLesson, sourceIngestion, expressLesson, feedTab]) {
    assert.match(source, /getLocalizedErrorMessage/);
  }
  assert.match(feed, /getLocalizedErrorMessage\(res\.error\.message, lang\)/);
  assert.match(lesson, /getLocalizedErrorMessage\(res\.error\.message, lang\)/);
  assert.match(teacher, /getLocalizedErrorMessage\(result\.error\.message, lang\)/);
  assert.match(parent, /getLocalizedErrorMessage\(result\.error\?\.message, lang\)/);
  assert.match(lessonEditor, /getLocalizedErrorMessage\(result\.error\.message, lang\)/);
  assert.match(hymns, /getLocalizedErrorMessage\(error, lang\)/);
  assert.doesNotMatch(hymns, /error instanceof Error \? error\.message/);
  assert.match(hymns, /selectedHymn\?\.audioUrl, lang/);
  assert.match(taxis, /selectedItem\?\.documents, lang/);
  assert.match(taxis, /getLocalizedErrorMessage\(error, lang\)/);
  assert.match(taxis, /\.catch\(error => \{[\s\S]*setLoadError\(getLocalizedErrorMessage\(error, lang\)\)[\s\S]*setLoading\(false\)/);
  assert.match(preview, /getLocalizedErrorMessage\(error, lang\)/);
  assert.match(manualLesson, /getLocalizedErrorMessage\(error, lang\)/);
  assert.match(sourceIngestion, /getLocalizedErrorMessage\(error, lang\)/);
  assert.match(expressLesson, /getLocalizedErrorMessage\(error, lang\)/);
  assert.match(feedTab, /getLocalizedErrorMessage\(result\.error\?\.message/);
  assert.match(feedTab, /getLocalizedErrorMessage\(error instanceof Error && error\.message/);
});
