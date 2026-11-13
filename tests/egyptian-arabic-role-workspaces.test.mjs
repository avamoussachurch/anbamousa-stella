import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('profile and family workspaces use friendly Egyptian Arabic', async () => {
  const [profile, parentSettings, childProgress, weekly, addChild] = await Promise.all([
    read('../src/components/student/ProfileTab.tsx'),
    read('../src/components/parent/ParentSettings.tsx'),
    read('../src/components/parent/ChildrenLessonsProgress.tsx'),
    read('../src/components/parent/WeeklyProgressView.tsx'),
    read('../src/components/parent/AddChildModal.tsx'),
  ]);

  assert.match(profile, /صفّك الدراسي مش مناسب للفصل ده/);
  assert.match(profile, /الكود السري اتنسخ/);
  assert.match(parentSettings, /استقبل تنبيه على جهازك لما أولادك يكمّلوا درس/);
  assert.match(parentSettings, /موافقتك مطلوبة كل مرة/);
  assert.match(childProgress, /بنحمّل سجل التعلّم/);
  assert.match(childProgress, /الدروس اللي خلصها/);
  assert.match(weekly, /لسه مفيش أولاد مرتبطين بالحساب/);
  assert.match(weekly, /مش بنعرض الحضور أو وقت المذاكرة/);
  assert.match(addChild, /الطفل ده مرتبط بحسابك بالفعل/);
  assert.match(addChild, /عشان نحمي الأولاد ونمنع ربط طفل بالغلط/);
});

test('teacher class and curriculum workflows use Egyptian Arabic', async () => {
  const [classes, sources, publishing, importing] = await Promise.all([
    read('../src/components/teacher/ServantClassManagement.tsx'),
    read('../src/components/teacher/ServantSourceManagement.tsx'),
    read('../src/components/teacher/publishing/TeacherPublishingHub.tsx'),
    read('../src/components/teacher/publishing/CurriculumImportCenter.tsx'),
  ]);

  assert.match(classes, /مش قادرين نحمّل طلبات الانضمام دلوقتي/);
  assert.match(classes, /مش معاك الصلاحية دي/);
  assert.match(sources, /بنحمّل مصادر وملفات المنهج/);
  assert.match(sources, /راجع ونظّم مصادر الدروس المعتمدة/);
  assert.match(publishing, /خطّط الدروس وجهّزها واربطها بفصولك/);
  assert.match(importing, /جلستك انتهت. سجّل دخولك تاني/);
});
