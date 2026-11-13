import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('core role experiences include Egyptian Arabic while retaining English copy', async () => {
  const [login, student, teacher, parent, admin] = await Promise.all([
    read('../src/components/auth/LoginScreen.tsx'),
    read('../src/components/student/StudentAdventureHome.tsx'),
    read('../src/components/teacher/ServantHomeDashboard.tsx'),
    read('../src/components/parent/ParentHomeDashboard.tsx'),
    read('../src/components/admin/AdminWorkspace.tsx'),
  ]);

  assert.match(login, /مش قادرين نسجّل دخولك/);
  assert.match(login, /اعمل حساب جديد وانضم لمدارس الأحد/);
  assert.match(login, /Sign in to follow lessons & earn points/);
  assert.match(student, /خطوة ورا خطوة، اكتشف حكايات الإيمان/);
  assert.match(student, /بنحمّل المنشورات/);
  assert.match(student, /Your next chapter starts here/);
  assert.match(teacher, /بنحمّل بيانات الخدمة/);
  assert.match(teacher, /لسه مفيش فصل نشط متسجل على حسابك/);
  assert.match(teacher, /Sunday School service desk/);
  assert.match(parent, /مش قادرين نحمّل سجل التعلّم/);
  assert.match(parent, /مفيش طلبات محتاجة مراجعتك دلوقتي/);
  assert.match(parent, /FAMILY PORTAL/);
  assert.match(admin, /مركز إدارة مستقل/);
  assert.match(admin, /getAdminRoleLabel/);
  assert.match(admin, /Admin Control Center/);
});

test('localization QA clearly states its percentages cover registry entries, not the full app', async () => {
  const qa = await read('../src/components/design-system/TranslationQADashboard.tsx');
  assert.match(qa, /registry completeness only/);
  assert.match(qa, /مش معناها إن كل شاشات الموقع مترجمة بالكامل/);
  assert.doesNotMatch(qa, /100% trilingual coverage verification/);
});
