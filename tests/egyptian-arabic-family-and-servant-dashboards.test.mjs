import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('parent dashboard and family journey use friendly Egyptian Arabic', async () => {
  const [dashboard, home] = await Promise.all([
    read('../src/components/parent/ParentDashboard.tsx'),
    read('../src/components/parent/ParentHomeDashboard.tsx'),
  ]);

  assert.match(dashboard, /بنحمّل بيانات العيلة/);
  assert.match(dashboard, /لسه مفيش أطفال مرتبطين بحسابك/);
  assert.match(dashboard, /اربط حساب ابنك بكود التحقق/);
  assert.match(home, /كل كلمة تشجيع بتفرق/);
  assert.match(home, /دروس خلّصها واتسجلت الأسبوع ده/);
  assert.match(home, /شوف رحلة التعلّم/);
});

test('servant dashboard and account forms use conversational Arabic', async () => {
  const [servant, admin, parentForm, servantForm, shared] = await Promise.all([
    read('../src/components/teacher/ServantHomeDashboard.tsx'),
    read('../src/components/profile/AdminAccountProfile.tsx'),
    read('../src/components/profile/ParentProfileForm.tsx'),
    read('../src/components/profile/ServantProfileForm.tsx'),
    read('../src/components/profile/RoleProfileShared.tsx'),
  ]);

  assert.match(servant, /خدمتك بتفرق/);
  assert.match(servant, /الأرقام هتظهر لما المسؤول يربط حسابك/);
  assert.match(admin, /صلاحيات مسؤول النظام/);
  assert.match(parentForm, /اسمك بيظهر في مساحة العيلة/);
  assert.match(servantForm, /مش هتقدر تعدّلها من هنا/);
  assert.match(shared, /اسمك لازم يكون حرفين على الأقل/);
});
