import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const home = read('../src/components/student/HomeTab.tsx');
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
