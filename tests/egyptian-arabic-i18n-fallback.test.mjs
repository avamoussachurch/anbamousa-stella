import assert from 'node:assert/strict';
import test from 'node:test';
import { t } from '../src/localization/i18n.ts';

test('missing translations never expose raw keys in Arabic or English', () => {
  assert.equal(t('missing.test.translation', 'ar'), 'النص ده لسه مش مترجم');
  assert.equal(t('missing.test.translation', 'en'), 'Translation not available');
});

test('shared interface actions use Egyptian Arabic while English and Coptic remain available', () => {
  assert.equal(t('actions.close', 'ar'), 'اقفل');
  assert.equal(t('actions.search', 'ar'), 'دوّر...');
  assert.equal(t('actions.submit', 'ar'), 'ابعت');
  assert.equal(t('audio.play', 'ar'), 'شغّل');
  assert.equal(t('actions.close', 'en'), 'Close');
  assert.equal(t('actions.close', 'cop'), 'Ⲙⲁϣⲑⲁⲙ');
});
