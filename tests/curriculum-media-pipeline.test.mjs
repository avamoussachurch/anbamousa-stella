import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const server = read('../server.ts');
const hymnStudio = read('../src/components/teacher/publishing/HymnsPublishingStudio.tsx');
const taxisStudio = read('../src/components/teacher/publishing/TaxisPublishingStudio.tsx');
const hymnStudent = read('../src/components/hymns/HymnsSchoolTab.tsx');
const taxisStudent = read('../src/components/taxis/CopticTaxisTab.tsx');
const classRls = read('../scripts/migrations/phase27_student_parent_class_read_access.sql');
const roleAlignment = read('../scripts/migrations/phase28_role_assignment_function_alignment.sql');
const manualStudio = read('../src/components/sunday-school/teacher/ManualLessonStudio.tsx');
const sourceStudio = read('../src/components/sunday-school/teacher/SourceIngestionStudio.tsx');
const expressStudio = read('../src/components/teacher/ExpressLessonPublishModal.tsx');
const sundaySchoolAudio = read('../src/components/sunday-school/viewers/SundaySchoolAudioPlayer.tsx');
const documentViewer = read('../src/components/sunday-school/viewers/InAppDocumentViewer.tsx');
const lessonSourceRls = read('../scripts/migrations/phase31_read_lesson_sources_for_accessible_published_lessons.sql');

test('Hymns teacher studio uploads audio and PDF to private curriculum storage', () => {
  assert.match(hymnStudio, /uploadSourceMedia\(file(?:,\s*[^)]*)?\)/);
  assert.match(hymnStudio, /setAudioUrl\(result\.fileUrl\)/);
  assert.match(hymnStudio, /setPdfUrl\(result\.fileUrl\)/);
  assert.match(hymnStudio, /resolveCurriculumMediaUrl\(audioUrl\)/);
});

test('Taxis teacher studio uploads attachments and persists stable private references', () => {
  assert.match(taxisStudio, /uploadSourceMedia\(file(?:,\s*[^)]*)?\)/);
  assert.match(taxisStudio, /fileUrl: result\.fileUrl/);
  assert.match(taxisStudio, /setDocuments\(previous =>/);
});

test('student Hymns and Taxis views resolve private references before browser access', () => {
  assert.match(hymnStudent, /resolveCurriculumMediaUrl\(selectedHymn\.audioUrl\)/);
  assert.match(hymnStudent, /src=\{resolvedAudioUrl \|\| undefined\}/);
  assert.match(taxisStudent, /resolveCurriculumMediaUrl\(document\.fileUrl\)/);
  assert.match(taxisStudent, /href=\{resolvedDocumentUrls\[doc\.id\] \|\| undefined\}/);
});

test('media access preserves teacher multi-role access and denies unassigned accounts', () => {
  assert.match(server, /if \(isTeacher\) return true;/);
  assert.match(server, /return isParent && item\.status === 'published'/);
});

test('security-definer authorization helpers use active role assignments, not the legacy single role', () => {
  assert.match(roleAlignment, /public\.has_role\('teacher'\)/);
  assert.match(roleAlignment, /target_role\.role = 'student'/);
  assert.match(roleAlignment, /role = 'parent' AND revoked_at IS NULL/);
  assert.match(roleAlignment, /role = 'student' AND revoked_at IS NULL/);
  assert.doesNotMatch(roleAlignment, /caller\.role = 'teacher'/);
  assert.doesNotMatch(roleAlignment, /AND role = 'student'\s*\)/);
});

test('student and parent class RLS is limited to own or verified linked memberships', () => {
  assert.match(classRls, /student_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(classRls, /relationship\.verified_at IS NOT NULL/);
  assert.match(classRls, /membership\.status = 'active'/);
});

test('server stores private media metadata and authorizes Hymns/Taxis attachments by publication and audience', () => {
  assert.match(server, /CURRICULUM_MEDIA_BUCKET/);
  assert.match(server, /from\('media_objects'\)\.insert/);
  assert.match(server, /const hymnColumns = \['audio_url', 'pdf_url', 'sheet_music_url'\]/);
  assert.match(server, /from\('coptic_taxis_items'\)[\s\S]{0,300}attachments/);
  assert.match(server, /item\.status !== 'published'/);
  assert.match(server, /item\.level !== studentLevel/);
  assert.match(server, /safeType\.startsWith\('audio\/webm'\) \? 'audio\/webm' : 'video\/webm'/);
});

test('Sunday School teacher recording captures and uploads real microphone audio', () => {
  for (const studio of [manualStudio, expressStudio, sourceStudio]) {
    assert.match(studio, /navigator\.mediaDevices\?\.getUserMedia/);
    assert.match(studio, /new MediaRecorder/);
    assert.match(studio, /new Blob\(recordingChunksRef\.current/);
    assert.match(studio, /uploadSourceMedia\(file(?:,\s*[^)]*)?\)/);
    assert.doesNotMatch(studio, /cdn\.freesound\.org/);
  }
});

test('lesson source RLS allows sources only when the caller can read the published class lesson', () => {
  assert.match(lessonSourceRls, /RETURN public\.can_read_curriculum_lesson\(v_lesson_id\)/);
  assert.doesNotMatch(lessonSourceRls, /lesson_section_sources/);
});

test('PDF viewer uses the browser PDF renderer and provides a direct open fallback', () => {
  assert.match(documentViewer, /if \(isPdf\)[\s\S]{0,180}return documentUrl/);
  assert.match(documentViewer, /Open PDF in new tab/);
  assert.match(hymnStudent, /InAppDocumentViewer/);
  assert.match(taxisStudent, /InAppDocumentViewer/);
});

test('Sunday School audio player reports media loading and playback failures', () => {
  assert.match(sundaySchoolAudio, /audio\.addEventListener\('error'/);
  assert.match(sundaySchoolAudio, /setPlaybackError/);
});
