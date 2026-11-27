import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('student Scripture recital instructions and feedback use Egyptian Arabic', async () => {
  const recital = await read('../src/components/student/VerseRecitalModal.tsx');
  assert.match(recital, /اقرأ الآية واحفظها، وبعدها اضغط على الميكروفون/);
  assert.match(recital, /التسميع ما اتراجعش لسه/);
  assert.match(recital, /🎉 حفظت الآية بإتقان!/);
  assert.match(recital, /كنت قريب جدًا! راجع الكلمات وجرّب تاني/);
  assert.match(recital, /سمّع تاني/);
});

test('Supabase connection setup guidance uses clear Egyptian Arabic', async () => {
  const setup = await read('../src/components/auth/SupabaseConnectionTester.tsx');
  assert.match(setup, /اكتب رابط المشروع والمفتاح الأول/);
  assert.match(setup, /اتأكد إن قاعدة البيانات وتسجيل الدخول شغالين/);
  assert.match(setup, /احفظ واختبر الاتصال/);
  assert.match(setup, /إزاي تفعّل تسجيل الدخول بجوجل والإيميل/);
});

test('verse recital verification failures never create a passing result or award points', async () => {
  const recital = await read('../src/components/student/VerseRecitalModal.tsx');
  const catchBlock = recital.slice(recital.indexOf('} catch (err: any) {', recital.indexOf('const evaluateRecital')), recital.indexOf('} finally {', recital.indexOf('const evaluateRecital')));

  assert.doesNotMatch(recital, /awardPoints/);
  assert.match(catchBlock, /passed: false/);
  assert.match(catchBlock, /pointsAwarded: 0/);
  assert.match(catchBlock, /verificationUnavailable: true/);
  assert.match(catchBlock, /setAudioError\(/);
  assert.match(catchBlock, /مش قادرين نتحقق من التسميع دلوقتي/);
  assert.doesNotMatch(catchBlock, /passed: true/);
  assert.match(recital, /evalData\.pointsAwarded = Number\(responseData\.pointsAwarded \|\| 0\)/);
  assert.match(recital, /result\.pointsAwarded > 0/);
  assert.match(recital, /result\.resultUnavailable \? \(lang === 'ar' \? 'النتيجة مش محفوظة' : 'Result not saved'\)/);
});

test('verse recital server never trusts model-generated point awards', async () => {
  const server = await read('../server.ts');
  const start = server.indexOf('app.post("/api/verify-verse-recital"');
  const end = server.indexOf('// ==============================================================================\n// HYMNS SCHOOL', start);
  const route = server.slice(start, end);

  assert.match(route, /pointsAwarded must always be 0/);
  assert.match(route, /Array\.isArray\(d\?\.matchedWords\)/);
  assert.match(route, /Array\.isArray\(d\?\.missedWords\)/);
  assert.match(route, /d\.accuracyPercentage >= 0 && d\.accuracyPercentage <= 100/);
  assert.match(route, /return res\.json\(\{ \.\.\.parsed\.data, pointsAwarded, totalPoints \}\)/);
  assert.match(route, /record_verse_recital_daily_result/);
  assert.match(route, /hasServerRole\(authContext, 'student'\)/);
});
