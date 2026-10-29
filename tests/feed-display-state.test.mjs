import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/lib/feedDisplayState.ts', import.meta.url), 'utf8');
const compiled = ts.transpile(source, {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020
});
const feedDisplayState = new Function('exports', compiled + '; return exports;')({});
const getFeedDisplayState = feedDisplayState.getFeedDisplayState;

test('feed shows loading before fetched results arrive', () => {
  assert.equal(getFeedDisplayState(true, null, []), 'loading');
});

test('feed shows a friendly empty state after an empty successful result', () => {
  assert.equal(getFeedDisplayState(false, null, []), 'empty');
});

test('feed shows an error state after a failed request', () => {
  assert.equal(getFeedDisplayState(false, 'Network unavailable', []), 'error');
});

test('feed renders successfully fetched real posts', () => {
  assert.equal(getFeedDisplayState(false, null, [{ id: 'server-post-1' }]), 'posts');
});
