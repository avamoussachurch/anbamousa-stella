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

test('Hymns teacher studio uploads audio and PDF to private curriculum storage', () => {
  assert.match(hymnStudio, /uploadSourceMedia\(file\)/);
  assert.match(hymnStudio, /setAudioUrl\(result\.fileUrl\)/);
  assert.match(hymnStudio, /setPdfUrl\(result\.fileUrl\)/);
  assert.match(hymnStudio, /resolveCurriculumMediaUrl\(audioUrl\)/);
});

test('Taxis teacher studio uploads attachments and persists stable private references', () => {
  assert.match(taxisStudio, /uploadSourceMedia\(file\)/);
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

test('student and parent class RLS is limited to own or verified linked memberships', () => {
  assert.match(classRls, /student_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(classRls, /relationship\.verified_at IS NOT NULL/);
  assert.match(classRls, /membership\.status = 'active'/);
});

test('server stores private media metadata and authorizes Hymns/Taxis attachments by publication and audience', () => {
  assert.match(server, /CURRICULUM_MEDIA_BUCKET/);
  assert.match(server, /from\('media_objects'\)\.insert/);
  assert.match(server, /from\('hymns'\)[\s\S]{0,300}audio_url/);
  assert.match(server, /from\('coptic_taxis_items'\)[\s\S]{0,300}attachments/);
  assert.match(server, /item\.status !== 'published'/);
  assert.match(server, /item\.level !== studentLevel/);
});
