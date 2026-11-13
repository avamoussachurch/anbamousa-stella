import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('shared navigation and splash screens use Egyptian Arabic copy', async () => {
  const [top, bottom, sidebar, splash, music] = await Promise.all([
    read('../src/components/layout/TopBar.tsx'),
    read('../src/components/layout/BottomNav.tsx'),
    read('../src/components/layout/WorkspaceSidebar.tsx'),
    read('../src/components/layout/AnbaMousaSplashScreen.tsx'),
    read('../src/components/layout/GlobalMusicPlayer.tsx'),
  ]);

  assert.match(top, /بدّل مساحة العمل/);
  assert.match(top, /مفيش إشعارات جديدة دلوقتي/);
  assert.match(bottom, /أقسام أكتر/);
  assert.match(sidebar, /افتح القائمة الجانبية/);
  assert.match(splash, /نكبر في الإيمان ونتعلّم بالمحبة/);
  assert.match(music, /مش قادرين نحمّل الألحان دلوقتي/);
});

test('student celebrations and teacher publishing controls use Egyptian Arabic', async () => {
  const [victory, leaderboard, publication, verse] = await Promise.all([
    read('../src/components/sunday-school/student/QuizVictorySplash.tsx'),
    read('../src/components/student/LeaderboardPodium.tsx'),
    read('../src/components/teacher/LessonPublicationManager.tsx'),
    read('../src/components/shared/BibleVerseCard.tsx'),
  ]);

  assert.match(victory, /جبت الدرجة النهائية/);
  assert.match(victory, /برافو عليك يا بطل/);
  assert.match(victory, /النقاط اللي كسبتها/);
  assert.match(leaderboard, /إنت 🌟/);
  assert.match(publication, /انشر الدروس المعتمدة دلوقتي/);
  assert.match(publication, /الخادم مأكّدش إلغاء الموعد/);
  assert.match(verse, /آية النهارده للحفظ والتأمل/);
});
