import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path: string): Promise<string> {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('core entry and role dashboards contain Egyptian Arabic UI copy and retain English', async () => {
  const [login, student, teacher, parent, admin] = await Promise.all([
    source('../components/auth/LoginScreen.tsx'),
    source('../components/student/StudentAdventureHome.tsx'),
    source('../components/teacher/ServantHomeDashboard.tsx'),
    source('../components/parent/ParentHomeDashboard.tsx'),
    source('../components/admin/AdminWorkspace.tsx'),
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

test('localization QA dashboard does not present registry completeness as full-app coverage', async () => {
  const qa = await source('../components/design-system/TranslationQADashboard.tsx');
  assert.match(qa, /registry completeness only/);
  assert.match(qa, /مش معناها إن كل شاشات الموقع مترجمة بالكامل/);
  assert.doesNotMatch(qa, /100% trilingual coverage verification/);
});
