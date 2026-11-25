import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const calendarData = await readFile(new URL('../src/data/copticCalendarData.ts', import.meta.url), 'utf8');
const calendarTab = await readFile(new URL('../src/components/coptic/CopticCalendarTab.tsx', import.meta.url), 'utf8');

test('Coptic month ranges are calculated for the selected Anno Martyrum year', () => {
  assert.match(calendarData, /getCopticYearStartGregorianDate/);
  assert.match(calendarData, /getCopticMonthGregorianRange/);
  assert.match(calendarData, /monthNumber === 13 && copticYear % 4 === 3 \? 6 : monthNumber === 13 \? 5 : 30/);
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

test('feast list defaults to the closest upcoming observance with a calendar-order alternative', () => {
  assert.match(calendarTab, /useState<'upcoming' \| 'calendar'>\('upcoming'\)/);
  assert.match(calendarTab, /sortMode === 'upcoming'/);
  assert.match(calendarTab, /Closest first/);
  assert.match(calendarTab, /Calendar order/);
});

test('major and minor Egyptian Coptic Orthodox observances are represented', () => {
  for (const feastId of [
    'annunciation','circumcision','wedding_cana','presentation_temple','entry_egypt',
    'transfiguration','ascension','pentecost','covenant_thursday','good_friday',
    'thomas_sunday','jonah_feast','apostles_feast','st_mary_assumption','cross_feast_2','bright_saturday','st_george_feast','st_mary_nativity','st_mary_entry_temple','st_mary_dormition','st_mary_annunciation_nativity','st_mary_iron_dissolver','st_mary_zeitoun'
  ]) {
    assert.match(calendarData, new RegExp("id: '" + feastId + "'"));
  }
});

test('multi-day fasts show their full date range and Annunciation follows Holy Week observance rules', () => {
  assert.match(calendarData, /endDateThisYear/);
  assert.match(calendarData, /isCelebratedThisYear/);
  assert.match(calendarTab, /feastEndDate/);
  assert.match(calendarTab, /Not observed this year/);
});
