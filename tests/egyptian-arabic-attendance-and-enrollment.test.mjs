import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('teacher attendance and visitation screens use Egyptian Arabic', async () => {
  const attendance = await read('../src/components/teacher/AttendanceVisitationTracker.tsx');
  assert.match(attendance, /إجمالي التلاميذ/);
  assert.match(attendance, /حاضر النهارده/);
  assert.match(attendance, /غايب النهارده/);
  assert.match(attendance, /محتاج متابعة/);
  assert.match(attendance, /اتواصلنا معاه واطمنا عليه/);
});

test('hymns enrollment and manual lesson authoring use Egyptian Arabic', async () => {
  const [enrollment, studio] = await Promise.all([
    read('../src/components/teacher/publishing/HymnsEnrollmentManager.tsx'),
    read('../src/components/sunday-school/teacher/ManualLessonStudio.tsx'),
  ]);
  assert.match(enrollment, /حالة القبول اتحدّثت بنجاح/);
  assert.match(enrollment, /طلبات التلاميذ للانضمام لمدرسة الألحان/);
  assert.match(enrollment, /اقبل الطلب/);
  assert.match(studio, /إيه الفكرة الروحية الأساسية اللي بنتعلمها من الدرس؟/);
  assert.match(studio, /مسودة الدرس اتحفظت بنجاح!/);
  assert.match(studio, /مش قادرين نجهّز اقتراح دلوقتي/);
});
