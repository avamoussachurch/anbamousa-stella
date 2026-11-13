import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { findCanonicalGrade, findClassGroupForGrade } from '../src/lib/classGroups.ts';

test('published lesson grade ranges resolve through the canonical grade map', () => {
  assert.equal(findCanonicalGrade('5th-6th Grade')?.classGroupId, 'primary_2');
  assert.equal(findCanonicalGrade('Grade 6')?.classGroupId, 'primary_2');
  assert.equal(findCanonicalGrade('Grade 3')?.classGroupId, 'primary_1');
  assert.equal(findClassGroupForGrade('primary_1')?.id, 'primary_1');
  assert.equal(findClassGroupForGrade('primary_2')?.id, 'primary_2');
  assert.equal(findClassGroupForGrade('inst_2026-2027_primary_2')?.id, 'primary_2');
});

test('student progress backend uses canonical grade mapping and rejects cross-group ranges', async () => {
  const server = await readFile(new URL('../server.ts', import.meta.url), 'utf8');
  assert.match(server, /import \{ findCanonicalGrade, findClassGroupForGrade \} from ["']\.\/src\/lib\/classGroups["']/);
  assert.match(server, /const rangeMatch = grade\.match\(/);
  assert.match(server, /first\.classGroupId !== last\.classGroupId/);
  assert.match(server, /return findClassGroupForGrade\(grade\)\?\.id \|\| null/);
});
