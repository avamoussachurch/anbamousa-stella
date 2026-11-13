import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = path => readFile(new URL(path, import.meta.url), 'utf8');

test('student home only shows a journey milestone after lesson completion', async () => {
  const home = await source('../src/components/student/HomeTab.tsx');
  const adventureHome = await source('../src/components/student/StudentAdventureHome.tsx');
  assert.match(home, /const completedLessons = studentLessons\.filter\(isLessonFinished\);/);
  assert.match(home, /completedLessons=\{completedLessons\}/);
  assert.match(adventureHome, /completedLessons\.length} of \$\{lessons\.length} lessons complete/);
  assert.doesNotMatch(home, /completedLessons = .*userData\?\.points/);
});

test('guest student surfaces label demo data as preview-only', async () => {
  const [home, adventureHome, profile] = await Promise.all([
    source('../src/components/student/HomeTab.tsx'),
    source('../src/components/student/StudentAdventureHome.tsx'),
    source('../src/components/student/ProfileTab.tsx')
  ]);
  assert.match(home, /isGuest=\{isGuest\}/);
  assert.match(adventureHome, /\{isGuest && \(/);
  assert.match(adventureHome, /Guest preview · demo data/);
  assert.match(adventureHome, /معاينة ضيف · بيانات تجريبية/);
  assert.match(adventureHome, /const displayName = isGuest\s*\?/);
  assert.match(profile, /\{isGuest && \(/);
  assert.match(profile, /Guest preview · demo data/);
  assert.match(profile, /معاينة ضيف · بيانات تجريبية/);
});

test('journey milestone reports completed lessons rather than estimated rewards', async () => {
  const visuals = await source('../src/components/student/JourneyOfMosesVisuals.tsx');
  const adventureHome = await source('../src/components/student/StudentAdventureHome.tsx');
  assert.match(visuals, /lessons completed/);
  assert.doesNotMatch(visuals, /blessing points/);
  assert.doesNotMatch(visuals, /pointsEarned = 50/);
  assert.match(adventureHome, /const isLocked = !isCompleted && !isCurrent;/);
  assert.match(adventureHome, /onNavigate\('lessons', isLocked \? undefined : lesson\.id\)/);
  assert.match(adventureHome, /Locked — finish the previous lesson/);
});

test('sample achievements remain confined to the guest demo account', async () => {
  const [profile, points] = await Promise.all([
    source('../src/components/student/ProfileTab.tsx'),
    source('../src/components/student/PointsTab.tsx')
  ]);
  assert.match(profile, /\{isGuest && \(/);
  assert.match(points, /\{isGuest && mockBadges\.map/);
  assert.match(points, /Verified achievements are not available/);
});
