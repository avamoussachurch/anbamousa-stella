import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { loadServantPreviewSchoolContent } from '../src/lib/servantPreview';

test('Servant preview curriculum uses published read-only Hymns and Taxis requests', async () => {
  const requests: string[] = [];
  const content = await loadServantPreviewSchoolContent(1, 'Grade 4', {
    getHymns: async (level, season, status) => {
      requests.push(`hymns:${level}:${season}:${status}`);
      return {
        success: true,
        items: [
          { id: 'hymn-level-1', level: 1, status: 'published' },
          { id: 'hymn-level-2', level: 2, status: 'published' },
          { id: 'hymn-draft', level: 1, status: 'draft' }
        ] as any
      };
    },
    getTaxisItems: async () => {
      requests.push('taxis');
      return {
        success: true,
        items: [
          { id: 'taxis-all-level-1', level: 1, audience: 'all', status: 'published' },
          { id: 'taxis-prep-level-1', level: 1, audience: 'preparatory', status: 'published' },
          { id: 'taxis-deacon-level-1', level: 1, audience: 'deacons', status: 'published' },
          { id: 'taxis-draft', level: 1, audience: 'all', status: 'draft' }
        ] as any
      };
    }
  });
  assert.deepEqual(content.hymns.map(item => item.id), ['hymn-level-1']);
  assert.deepEqual(content.taxis.map(item => item.id), ['taxis-all-level-1']);
  assert.deepEqual(requests.sort(), ['hymns:1:all:published', 'taxis']);
});

test('Coptic Taxis preview filters by selected grade and level without writes', async () => {
  const content = await loadServantPreviewSchoolContent(2, 'Prep 2', {
    getHymns: async () => ({ success: true, items: [] }),
    getTaxisItems: async () => ({
      success: true,
      items: [
      { id: 'all-level-2', level: 2, audience: 'all', status: 'published' },
      { id: 'prep-level-2', level: 2, audience: 'preparatory', status: 'published' },
      { id: 'deacon-level-2', level: 2, audience: 'deacons', status: 'published' },
      { id: 'all-level-3', level: 3, audience: 'all', status: 'published' }
      ] as any
    })
  });
  assert.deepEqual(content.taxis.map(item => item.id), ['all-level-2', 'prep-level-2', 'deacon-level-2']);
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
