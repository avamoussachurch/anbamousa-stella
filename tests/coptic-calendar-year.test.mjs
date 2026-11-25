import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const calendarData = await readFile(new URL('../src/data/copticCalendarData.ts', import.meta.url), 'utf8');
const calendarTab = await readFile(new URL('../src/components/coptic/CopticCalendarTab.tsx', import.meta.url), 'utf8');

test('Coptic month ranges are calculated for the selected Anno Martyrum year', () => {
  assert.match(calendarData, /getCopticYearStartGregorianDate/);
  assert.match(calendarData, /getCopticMonthGregorianRange/);
  assert.match(calendarData, /monthNumber === 13 && copticYear % 4 === 3 \? 6 : 5/);
  assert.match(calendarTab, /getCopticMonthGregorianRange\(copticDate\.year, m\.number\)/);
  assert.match(calendarTab, /formatMonthDay\(range\.start\)/);
  assert.match(calendarTab, /formatMonthDay\(range\.end\)/);
});

test('movable Coptic feasts use the Orthodox Paschalion rather than fixed Gregorian dates', () => {
  assert.match(calendarData, /getOrthodoxEasterDate/);
  assert.match(calendarData, /date\.setDate\(date\.getDate\(\) - 69\)/);
  assert.match(calendarData, /date\.setDate\(date\.getDate\(\) - 55\)/);
  assert.match(calendarData, /date\.setDate\(date\.getDate\(\) - 7\)/);
  assert.match(calendarData, /date\.setDate\(date\.getDate\(\) \+ 50\)/);
});

test('feast list defaults to the closest upcoming observance with a Coptic-order alternative', () => {
  assert.match(calendarTab, /useState<'upcoming' \| 'coptic'>\('upcoming'\)/);
  assert.match(calendarTab, /sortMode === 'upcoming'/);
  assert.match(calendarTab, /Closest first/);
  assert.match(calendarTab, /Coptic order/);
});
