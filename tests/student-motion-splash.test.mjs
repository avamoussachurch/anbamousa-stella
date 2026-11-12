import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Anba Mousa initialization splash is branded, accessible, and motion-aware', async () => {
  const splash = await readFile(new URL('../src/components/layout/AnbaMousaSplashScreen.tsx', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(splash, /role="status"/);
  assert.match(splash, /aria-live="polite"/);
  assert.match(splash, /Growing in Faith, Learning in Love/);
  assert.match(splash, /useReducedMotion/);
  assert.match(app, /AnbaMousaSplashScreen lang/);
});

test('lesson reading progress uses reduced-motion-aware transitions', async () => {
  const lesson = await readFile(new URL('../src/components/sunday-school/student/SundaySchoolLessonView.tsx', import.meta.url), 'utf8');
  assert.match(lesson, /motion\/react/);
  assert.match(lesson, /useReducedMotion/);
  assert.match(lesson, /sectionProgress\.completionPercent/);
  assert.match(lesson, /<motion\.button/);
});
// Regression tests intentionally avoid timing-sensitive animation snapshots.
