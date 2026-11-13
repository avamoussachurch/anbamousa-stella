import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('student lesson resources, rewards, and family altar controls use Egyptian Arabic', async () => {
  const [lesson, viewer, reward, family, calendar] = await Promise.all([
    read('../src/components/sunday-school/student/SundaySchoolLessonView.tsx'),
    read('../src/components/sunday-school/viewers/InAppDocumentViewer.tsx'),
    read('../src/components/sunday-school/student/RewardCelebration.tsx'),
    read('../src/components/student/FamilyAltarCard.tsx'),
    read('../src/components/student/ChurchCalendar.tsx'),
  ]);

  assert.match(lesson, /مش قادرين نحمّل ملفات الدرس/);
  assert.match(lesson, /افتح العرض جوه التطبيق/);
  assert.match(viewer, /تقدر تشوف شرائح ومستندات الخادم/);
  assert.match(viewer, /مفيش شرائح مرفقة للدرس ده/);
  assert.match(reward, /برافو عليك! كملت المهمة بنجاح!/);
  assert.match(family, /صلّينا مع بعض كعيلة/);
  assert.match(family, /أسئلة تتكلموا فيها كعيلة/);
  assert.match(calendar, /فاضل/);
});

test('parent, servant, and admin profile forms use Egyptian Arabic', async () => {
  const [parent, servant, admin] = await Promise.all([
    read('../src/components/profile/ParentProfileForm.tsx'),
    read('../src/components/profile/ServantProfileForm.tsx'),
    read('../src/components/profile/AdminAccountProfile.tsx'),
  ]);

  assert.match(parent, /اسمك بيظهر في مساحة العيلة/);
  assert.match(parent, /الإيميل بيتدار من خدمة تسجيل الدخول/);
  assert.match(servant, /الفصول والتكليفات بتظهر من السجل المعتمد/);
  assert.match(admin, /الخادم بيتأكد من صلاحية كل إجراء إداري/);
  assert.match(admin, /راجع الأدوار تاني/);
});
