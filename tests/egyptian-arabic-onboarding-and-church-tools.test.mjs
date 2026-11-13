import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('onboarding, secure family linking, and QR scanning use friendly Egyptian Arabic', async () => {
  const [onboarding, scanner, qrModal, parentJourney] = await Promise.all([
    read('../src/components/auth/StudentOnboardingModal.tsx'),
    read('../src/components/parent/QrCodeScanner.tsx'),
    read('../src/components/common/ChildQrCodeModal.tsx'),
    read('../src/components/parent/ParentLearningJourney.tsx'),
  ]);

  assert.match(onboarding, /أهلاً بيك في رحلة الأنبا موسى/);
  assert.match(onboarding, /طلبك مستني مراجعة الخادم/);
  assert.match(scanner, /المتصفح مش بيسمح باستخدام الكاميرا/);
  assert.match(scanner, /بنتأكد من حساب الطفل/);
  assert.match(qrModal, /خلّي ولي أمرك يوجّه كاميرا موبايله/);
  assert.match(qrModal, /كود مشفّر ومخصص لعيلتك بس/);
  assert.match(parentJourney, /ملخص من بيانات التعلّم المسجلة للطفل/);
});

test('church event and FAQ copy is conversational while preserving church terms', async () => {
  const [events, faq, links] = await Promise.all([
    read('../src/components/parent/ChurchEventNotifications.tsx'),
    read('../src/components/legal/FAQ.tsx'),
    read('../src/components/student/StudentFeatureLinks.tsx'),
  ]);

  assert.match(events, /مفيش فعاليات جاية متسجلة دلوقتي/);
  assert.match(events, /العيلة والخدمة/);
  assert.match(faq, /إزاي أكسب نقاط؟/);
  assert.match(faq, /القداس|الألحان|الكنيسة/);
  assert.match(links, /الصلاة الجاية/);
  assert.match(links, /العيد الجاي/);
});
