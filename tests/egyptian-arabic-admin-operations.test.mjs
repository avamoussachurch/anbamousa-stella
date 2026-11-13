import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('admin role and account operations use friendly Egyptian Arabic', async () => {
  const admin = await read('../src/components/admin/AdminWorkspace.tsx');
  assert.match(admin, /getAdminRoleLabel\(selectedRole, isArabic\)/);
  assert.match(admin, /التغيير هيتسجل في سجل المراجعة/);
  assert.match(admin, /هنبعت دعوة تسجيل/);
  assert.match(admin, /جلسة الدعم للعرض بس بدأت واتسجلت/);
  assert.match(admin, /اكتب رقم الحساب الأول/);
  assert.match(admin, /بيانات الحساب والأدوار الحالية اتحمّلت/);
});

test('teacher dashboard explains demo, offline, and unavailable states in Egyptian Arabic', async () => {
  const teacher = await read('../src/components/teacher/TeacherDashboard.tsx');
  assert.match(teacher, /الوضع الحالي تجريبي أو مش متصل/);
  assert.match(teacher, /مش قادرين نحدّث المنهج من الخادم/);
  assert.match(teacher, /تقارير تقدم التلاميذ والاختبارات مش متاحة/);
  assert.match(teacher, /الحضور والافتقاد مش متاحين للحسابات المتصلة/);
  assert.match(teacher, /راجع وسجّل التلاميذ/);
});
