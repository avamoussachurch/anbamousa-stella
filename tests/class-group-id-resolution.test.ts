import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  findClassGroupForGrade,
  getClassGroupForGrade
} from '../src/lib/classGroups';

describe('class-group identifier resolution', () => {
  it('resolves stable class-group IDs before interpreting embedded numbers as grades', () => {
    assert.equal(getClassGroupForGrade('primary_1').id, 'primary_1');
    assert.equal(getClassGroupForGrade('primary_2').id, 'primary_2');
  });

  it('resolves church-year class-instance IDs by their trailing class-group ID', () => {
    assert.equal(getClassGroupForGrade('inst_2026-2027_primary_1').id, 'primary_1');
    assert.equal(getClassGroupForGrade('inst_2026-2027_primary_2').id, 'primary_2');
    assert.equal(getClassGroupForGrade('inst_2026-2027_preparatory').id, 'preparatory');
  });

  it('preserves canonical grade mapping', () => {
    assert.equal(getClassGroupForGrade('Grade 2').id, 'primary_1');
    assert.equal(getClassGroupForGrade('Grade 5').id, 'primary_2');
    assert.equal(getClassGroupForGrade('Prep 2').id, 'preparatory');
  });

  it('keeps the safe resolver null for unknown values', () => {
    assert.equal(findClassGroupForGrade('not-a-real-class'), null);
    assert.equal(findClassGroupForGrade('primary_2')?.id, 'primary_2');
  });
});
