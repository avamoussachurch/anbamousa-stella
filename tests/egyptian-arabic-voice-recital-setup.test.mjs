import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('student Scripture recital instructions and feedback use Egyptian Arabic', async () => {
  const recital = await read('../src/components/student/VerseRecitalModal.tsx');
  assert.match(recital, /اقرأ الآية واحفظها، وبعدها اضغط على الميكروفون/);
  assert.match(recital, /برافو يا بطل! نطقك لكلمات الآية كان واضح وجميل/);
  assert.match(recital, /🎉 حفظت الآية بإتقان!/);
  assert.match(recital, /كنت قريب جدًا! راجع الكلمات وجرّب تاني/);
  assert.match(recital, /سمّع الآية تاني/);
});

test('Supabase connection setup guidance uses clear Egyptian Arabic', async () => {
  const setup = await read('../src/components/auth/SupabaseConnectionTester.tsx');
  assert.match(setup, /اكتب رابط المشروع والمفتاح الأول/);
  assert.match(setup, /اتأكد إن قاعدة البيانات وتسجيل الدخول شغالين/);
  assert.match(setup, /احفظ واختبر الاتصال/);
  assert.match(setup, /إزاي تفعّل تسجيل الدخول بجوجل والإيميل/);
});
