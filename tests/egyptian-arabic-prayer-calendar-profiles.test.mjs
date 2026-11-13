import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('Agpeya and Coptic calendar interface guidance uses Egyptian Arabic', async () => {
  const [agpeya, calendar] = await Promise.all([
    read('../src/components/agpeya/AgpeyaPrayerTab.tsx'),
    read('../src/components/coptic/CopticCalendarTab.tsx'),
  ]);

  assert.match(agpeya, /صلوات الأجبية ومتابعة صلاتك كل يوم/);
  assert.match(agpeya, /سجّل السواعي اللي صليتها النهارده/);
  assert.match(agpeya, /اكتب طلباتك لربنا/);
  assert.match(calendar, /العد التنازلي للأعياد والأصوام الجاية/);
  assert.match(calendar, /تابع فاضل قد إيه على الأعياد والأصوام/);
  assert.match(calendar, /تاريخ النهارده الميلادي/);
});

test('parent and servant account profiles use friendly Egyptian Arabic', async () => {
  const [parent, servant] = await Promise.all([
    read('../src/components/profile/ParentAccountProfile.tsx'),
    read('../src/components/profile/ServantAccountProfile.tsx'),
  ]);

  assert.match(parent, /شغّل أو اقفل تنبيهات التطبيق/);
  assert.match(parent, /الأولاد المرتبطين بالحساب/);
  assert.match(parent, /مفيش حسابات أولاد مرتبطة دلوقتي/);
  assert.match(servant, /الفصول اللي مسؤول عنها/);
  assert.match(servant, /مفيش فصول متسجلة على حسابك/);
});
