import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');

test('Hymn access and mastery use the shared profile level, not the disabled legacy roster', () => {
  assert.match(server, /assignedLevel === null \|\| hymn\.level !== assignedLevel/);
  assert.match(server, /Number\(hymnRow\.level\) !== assignedLevel/);
  assert.match(server, /Only a published hymn can be marked as mastered/);
  assert.doesNotMatch(server, /studentEnrollment\.status !== 'approved'/);
  assert.doesNotMatch(server, /enrollment\.status !== 'approved'/);
  assert.doesNotMatch(server, /Your deacon level enrollment does not allow this hymn/);
});
