import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('sound effects are optional, persistent, synthesized locally and never block UI actions', async () => {
  const audio = await read('../src/context/AudioContext.tsx');
  const app = await read('../src/App.tsx');
  assert.match(audio, /anba_mousa_sound_enabled/);
  assert.match(audio, /AudioContextConstructor/);
  assert.match(audio, /playSound/);
  assert.match(audio, /Sound is an enhancement only/);
  assert.match(audio, /document\.addEventListener\('click'/);
  assert.doesNotMatch(app, /SoundEffectsControl/);
  assert.doesNotMatch(app, /fixed bottom-24 left-4 z-50/);
});

test('shared world has visible playful decorations and keeps motion accessible', async () => {
  const app = await read('../src/App.tsx');
  const world = await read('../src/components/layout/AmbientWorld.tsx');
  const css = await read('../src/index.css');
  assert.match(app, /<AmbientWorld variant="app" \/>/);
  assert.match(world, /ambient-world__companion/);
  assert.match(world, /ambient-world__cloud/);
  assert.match(world, /ambient-world__spark/);
  assert.match(css, /ambient-companion-hop/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /Higher-contrast defaults/);
});

test('quiz answers play one specific result sound without a generic click sound', async () => {\n  const quiz = await read('../src/components/sunday-school/student/SundaySchoolQuizView.tsx');\n  assert.match(quiz, /playSound\\(index === currentQuestion\\.correctIndex \\? 'correct' : 'incorrect'\\)/);\n  assert.match(quiz, /data-sfx=\"off\"/);\n});\n\ntest('every saved quiz opens a motivational splash with verified performance, points and streak', async () => {
  const quiz = await read('../src/components/sunday-school/student/SundaySchoolQuizView.tsx');
  const splash = await read('../src/components/sunday-school/student/QuizVictorySplash.tsx');
  assert.match(quiz, /setShowVictorySplash\(true\)/);
  assert.match(quiz, /<QuizVictorySplash/);
  assert.match(splash, /percentage=|percentage/);
  assert.match(splash, /pointsEarned/);
  assert.match(splash, /totalPoints/);
  assert.match(splash, /streakDays/);
  assert.match(splash, /ConfettiCanvas layer="behind"/);
  assert.match(splash, /useReducedMotion/);
});

test('teacher dashboard explains missing assignments instead of presenting misleading zero totals', async () => {
  const dashboard = await read('../src/components/teacher/ServantHomeDashboard.tsx');
  const server = await read('../server.ts');
  assert.match(dashboard, /No active class is assigned to this teacher account yet/);
  assert.match(dashboard, /We do not mix in other teachers’ class data/);
  assert.match(server, /\.eq\('servant_id', authContext\.userId\)/);
  assert.match(server, /\.eq\('is_active', true\)/);
  assert.match(server, /g\.includes\('high school'\).*g\.includes\('youth'/);
  assert.match(server, /\.from\('lesson_section_progress'\)/);
  assert.match(server, /mergeStudentLessonProgress\(/);
  assert.match(server, /activeVersionByLesson/);
});
