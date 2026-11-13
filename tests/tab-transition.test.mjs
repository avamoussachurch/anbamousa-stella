import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('workspace tab navigation uses a short transform/opacity transition', () => {
  assert.match(app, /import \{ motion, useReducedMotion \} from 'motion\/react'/);
  assert.match(app, /duration: reduceMotion \? 0 : 0\.2/);
  assert.match(app, /opacity: \[0\.94, 1\]/);
  assert.match(app, /y: \[tabTransitionTick % 2 === 0 \? 7 : -7, 0\]/);
});

test('tab transitions respect reduced-motion preferences', () => {
  assert.match(app, /const reduceMotion = useReducedMotion\(\)/);
  assert.match(app, /animate=\{reduceMotion\s*\? \{ opacity: 1, y: 0 \ }/);
});

test('student tab instances remain cached instead of remounting on every transition', () => {
  assert.match(app, /Array\.from\(visitedStudentTabs\)/);
  assert.match(app, /hidden=\{activeLessonId !== null \|\| tab !== activeTab\}/);
  assert.doesNotMatch(app, /key=\{\x60\$\{activeWorkspace\}.*activeTab/);
});
