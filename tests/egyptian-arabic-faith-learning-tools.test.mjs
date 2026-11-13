import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('Hymns and Coptic Taxis learning guidance uses friendly Egyptian Arabic', async () => {
  const [hymns, taxis] = await Promise.all([
    read('../src/components/hymns/HymnsSchoolTab.tsx'),
    read('../src/components/taxis/CopticTaxisTab.tsx'),
  ]);

  assert.match(hymns, /المستوى التاني/);
  assert.match(hymns, /سجّل إنك حفظت اللحن وأتقنته/);
  assert.match(hymns, /شغّل اللحن وردّد وراه/);
  assert.match(taxis, /كل الطقوس/);
  assert.match(taxis, /اختار طقس من القائمة عشان تشوف تفاصيله/);
  assert.match(taxis, /كمّل دراسة الترتيب الطقسي واكسب ٥٠ نقطة/);
});

test('family prayer, Scripture recital, and document viewer guidance is conversational', async () => {
  const [altar, recital, viewer, adventure] = await Promise.all([
    read('../src/components/student/FamilyAltarCard.tsx'),
    read('../src/components/student/VerseRecitalModal.tsx'),
    read('../src/components/sunday-school/viewers/InAppDocumentViewer.tsx'),
    read('../src/components/student/StudentAdventureHome.tsx'),
  ]);

  assert.match(altar, /أسئلة تتكلموا فيها كعيلة/);
  assert.match(altar, /حاجة نقدر نعملها في البيت/);
  assert.match(recital, /اتأكد إنك سامح للمتصفح يستخدم الميكروفون/);
  assert.match(recital, /برافو عليك يا بطل/);
  assert.match(viewer, /تقدر تشوف شرائح ومستندات الخادم/);
  assert.match(adventure, /مقفول، خلّص المحطة اللي قبله الأول/);
  assert.match(adventure, /معاينة ضيف · بيانات تجريبية/);
});
