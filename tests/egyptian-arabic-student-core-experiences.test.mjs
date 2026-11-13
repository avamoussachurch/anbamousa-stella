import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('login and student lesson experiences use friendly Egyptian Arabic', async () => {
  const [login, lesson, lessons] = await Promise.all([
    read('../src/components/auth/LoginScreen.tsx'),
    read('../src/components/student/LessonView.tsx'),
    read('../src/components/student/LessonsTab.tsx'),
  ]);

  assert.match(login, /سجّل دخولك عشان تتابع دروسك وتكسب نقاط/);
  assert.match(login, /هتستخدم الموقع بصفتك إيه؟/);
  assert.match(lesson, /لازم تسجّل دخولك وتكون متصل بالإنترنت عشان نحفظ إنك خلّصت الدرس/);
  assert.match(lesson, /يلا ابدأ اختبار المراجعة/);
  assert.match(lessons, /الخدام بيجهّزوا منهج مدارس الأحد/);
  assert.match(lessons, /دوّر على محطة أو درس في رحلتك/);
});

test('student points and community feed actions use conversational Arabic', async () => {
  const [points, feed] = await Promise.all([
    read('../src/components/student/PointsTab.tsx'),
    read('../src/components/student/FeedTab.tsx'),
  ]);

  assert.match(points, /نقاطك مش كفاية عشان تطلب المكافأة دي/);
  assert.match(points, /طلب المكافأة اتبعت بنجاح/);
  assert.match(feed, /مش قادرين نسجّل التفاعل دلوقتي/);
  assert.match(feed, /مش قادرين نحفظ المشاركة دلوقتي/);
  assert.match(feed, /متأكد إنك عايز تحذف المنشور ده/);
});
