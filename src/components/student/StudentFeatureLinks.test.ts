import assert from 'node:assert/strict';
import test from 'node:test';
import { AGPEYA_HOURS } from '../../data/agpeyaData';
import { COPTIC_FEASTS } from '../../data/copticCalendarData';
import { getNextAgpeyaHour, getNextCopticFeast } from './StudentFeatureLinks';

test('Home Agpeya entry point resolves the next canonical hour from existing schedule data', () => {
  const now = new Date(2025, 0, 1, 10, 30);
  assert.equal(getNextAgpeyaHour(now).id, 'sext');
  assert.equal(getNextAgpeyaHour(new Date(2025, 0, 1, 22, 45)).id, 'midnight');
  assert.ok(AGPEYA_HOURS.some(hour => hour.id === getNextAgpeyaHour(now).id));
});

test('Home calendar entry point identifies the nearest upcoming feast from calendar data', () => {
  const now = new Date(2025, 0, 1, 12);
  const result = getNextCopticFeast(now);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  assert.ok(COPTIC_FEASTS.some(feast => feast.id === result.feast.id));
  assert.ok(result.date >= today);
  assert.equal(result.date.getFullYear(), now.getFullYear());
});
