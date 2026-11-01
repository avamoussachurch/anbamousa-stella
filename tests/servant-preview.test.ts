import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { loadServantPreviewSchoolContent } from '../src/lib/servantPreview';

test('Servant preview curriculum uses published read-only Hymns and Taxis requests', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ path: string; search: string; method: string }> = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    requests.push({ path: url.pathname, search: url.search, method: init?.method || 'GET' });
    const items = url.pathname.endsWith('/hymns')
      ? [
          { id: 'hymn-level-1', level: 1, status: 'published' },
          { id: 'hymn-level-2', level: 2, status: 'published' },
          { id: 'hymn-draft', level: 1, status: 'draft' }
        ]
      : [
          { id: 'taxis-all-level-1', level: 1, audience: 'all', status: 'published' },
          { id: 'taxis-prep-level-1', level: 1, audience: 'preparatory', status: 'published' },
          { id: 'taxis-deacon-level-1', level: 1, audience: 'deacons', status: 'published' },
          { id: 'taxis-draft', level: 1, audience: 'all', status: 'draft' }
        ];
    return new Response(JSON.stringify({ success: true, items }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };

  try {
    const content = await loadServantPreviewSchoolContent(1, 'Grade 4');
    assert.deepEqual(content.hymns.map(item => item.id), ['hymn-level-1']);
    assert.deepEqual(content.taxis.map(item => item.id), ['taxis-all-level-1']);
    assert.deepEqual(requests.map(request => request.path).sort(), [
      '/api/church/hymns',
      '/api/church/taxis'
    ]);
    assert.ok(requests.every(request => request.method === 'GET'));
    assert.match(requests.find(request => request.path.endsWith('/hymns'))?.search || '', /level=1/);
    assert.match(requests.find(request => request.path.endsWith('/hymns'))?.search || '', /status=published/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Coptic Taxis preview filters by selected grade and level without writes', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    success: true,
    items: [
      { id: 'all-level-2', level: 2, audience: 'all', status: 'published' },
      { id: 'prep-level-2', level: 2, audience: 'preparatory', status: 'published' },
      { id: 'deacon-level-2', level: 2, audience: 'deacons', status: 'published' },
      { id: 'all-level-3', level: 3, audience: 'all', status: 'published' }
    ]
  }), { status: 200, headers: { 'content-type': 'application/json' } });

  try {
    const content = await loadServantPreviewSchoolContent(2, 'Prep 2');
    assert.deepEqual(content.taxis.map(item => item.id), ['all-level-2', 'prep-level-2', 'deacon-level-2']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('preview UI does not persist or simulate student progress, points, or achievements', async () => {
  const source = await readFile(new URL('../src/components/teacher/StudentExperiencePreview.tsx', import.meta.url), 'utf8');
  const quiz = await readFile(new URL('../src/components/sunday-school/student/SundaySchoolQuizView.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /localStorage|sessionStorage|submitStudentQuizAttempt|completeLessonProgress|recordStudentSchoolActivity|submitRewardRequest|awardPoints|createLocalPreviewQuizAttempt|simulatedPoints/);
  assert.match(source, /<SundaySchoolLessonView[\s\S]*?readOnly\s+previewMode/);
  assert.match(source, /<SundaySchoolQuizView[\s\S]*?previewMode/);
  assert.match(source, /onMarkSectionRead=\{async sectionId => updateReadSection\(sectionId\)\}/);
  assert.match(source, /Quiz submissions are disabled in preview mode/);
  assert.match(source, /Student achievement records are not loaded or changed in preview mode/);
  assert.match(quiz, /if \(previewMode \|\| isSubmitting \|\| isSubmitted\) return/);
  assert.match(quiz, /disabled=\{previewMode \|\| isSubmitting\}/);
});
