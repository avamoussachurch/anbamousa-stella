import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const home = read('../src/components/student/HomeTab.tsx');
const lessonsContext = read('../src/context/LessonsContext.tsx');
const authoringService = read('../src/lib/lessonAuthoringService.ts');
const auth = read('../src/context/AuthContext.tsx');
const timeout = read('../src/lib/fetchWithTimeout.ts');
const hymnsService = read('../src/lib/hymnsService.ts');
const taxisService = read('../src/lib/taxisService.ts');
const lessonPublishing = read('../src/lib/lessonPublishingService.ts');
const hymnsStudio = read('../src/components/teacher/publishing/HymnsPublishingStudio.tsx');
const taxisStudio = read('../src/components/teacher/publishing/TaxisPublishingStudio.tsx');

test('HomeTab does not create a progress-summary feedback loop', () => {
  assert.doesNotMatch(home, /refreshProgressSummary/);
});

test('screen-time updates do not force a whole-app render every second', () => {
  assert.match(auth, /const nextSecs = currentSecs \+ 10;/);
  assert.match(auth, /\}, 10000\);/);
});

test('HTTP requests have a finite timeout and always clear the timer', () => {
  assert.match(timeout, /new AbortController\(\)/);
  assert.match(timeout, /controller\.abort\(\)/);
  assert.match(timeout, /clearTimeout\(timeoutId\)/);
  assert.match(timeout, /response\.clone\(\)\.arrayBuffer\(\)/);
});

test('all three publishing services use bounded HTTP requests', () => {
  for (const source of [hymnsService, taxisService, lessonPublishing]) {
    assert.match(source, /fetchWithTimeout\(/);
    assert.doesNotMatch(source, /await fetch\(/);
  }
});

test('Hymns save, unpublish, and restore always release the saving state', () => {
  for (const [start, end] of [
    ['const handleSave = async', 'const handleUnpublish = async'],
    ['const handleUnpublish = async', 'const handleRestore = async'],
    ['const handleRestore = async', '// Audio Playback in Studio']
  ]) {
    const block = hymnsStudio.slice(hymnsStudio.indexOf(start), hymnsStudio.indexOf(end));
    assert.match(block, /finally\s*\{[\s\S]*?setIsSaving\(false\)/);
  }
});

test('Taxis save and workflow actions always release the saving state', () => {
  for (const [start, end] of [
    ['const handleSaveDraft = async', '// Workflow Action'],
    ["const handleAction = async (action:", '\n  return (']
  ]) {
    const block = taxisStudio.slice(taxisStudio.indexOf(start), taxisStudio.indexOf(end));
    assert.match(block, /finally\s*\{[\s\S]*?setIsSaving\(false\)/);
  }
});

test('curriculum loading avoids duplicate progress-summary requests and serial per-lesson fetches', () => {
  const loaderStart = lessonsContext.indexOf('const loadOnlineCurriculum');
  const loaderEnd = lessonsContext.indexOf('useEffect(() => {\n    loadOnlineCurriculum();', loaderStart);
  const loader = lessonsContext.slice(loaderStart, loaderEnd);
  assert.doesNotMatch(loader, /getStudentProgressSummary/);
  assert.match(loader, /Promise\.all\(batch\.map/);
  assert.match(lessonsContext, /activeWorkspace !== 'student'/);
  assert.match(authoringService, /Promise\.all\(lessonsForUser\.slice/);
});

test('publishing returns before its background curriculum refresh completes', () => {
  assert.match(lessonsContext, /void loadOnlineCurriculum\(\)\.catch/);
  assert.doesNotMatch(lessonsContext, /await loadOnlineCurriculum\(\);/);
});

test('refreshes preserve already-loaded lessons while revalidating', () => {
  assert.match(lessonsContext, /!workspaceChanged && current === userData\.id \? current : null/);
  assert.match(home, /curriculumReadyForUser \? lessons : \[\]/);
});

test('curriculum cache is not reused across workspace changes', () => {
  assert.match(lessonsContext, /curriculumWorkspaceRef\.current !== activeWorkspace/);
  assert.match(lessonsContext, /!workspaceChanged && current === userData\.id/);
});

test('bulk and scheduled Sunday School publishing always release the working state', () => {
  const manager = read('../src/components/teacher/LessonPublicationManager.tsx');
  for (const [start, end] of [
    ['const handlePublish = async', 'const handleSchedule = async'],
    ['const handleSchedule = async', 'const handleCancel = async'],
    ['const handleCancel = async', 'const handleReschedule = async'],
    ['const handleReschedule = async', 'const parsedScheduleTime']
  ]) {
    const block = manager.slice(manager.indexOf(start), manager.indexOf(end));
    assert.match(block, /finally\s*\{[\s\S]*?setWorking\(false\)/);
  }
});

test('student Hymns tab never flashes the local demo collection before Supabase responds', () => {
  const hymnStudent = read('../src/components/hymns/HymnsSchoolTab.tsx');
  assert.match(hymnStudent, /useState<CopticHymnItem\[]>\(\[\]\)/);
  assert.match(hymnStudent, /const \[isHymnsLoading, setIsHymnsLoading\] = useState\(true\)/);
  assert.match(hymnStudent, /isHymnsLoading \? \([\s\S]*?Loading hymns/);
  assert.match(hymnStudent, /serverSelection = res\.items\.find\([\s\S]*?\) \|\| res\.items\[0\]/);
  assert.doesNotMatch(hymnStudent, /COPTIC_HYMNS_COLLECTION/);
  assert.match(hymnStudent, /useState<CopticHymnItem \| null>\(null\)/);
  assert.match(hymnStudent, /\.catch\(error => \{/);
});
