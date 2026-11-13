import assert from 'node:assert/strict';
import test from 'node:test';
import { getLocalizedErrorMessage } from '../src/lib/localizedErrors';

test('Arabic backend errors are translated into safe, friendly Egyptian Arabic', () => {
  assert.equal(getLocalizedErrorMessage('Failed to fetch', 'ar'), 'الاتصال بالإنترنت مش مستقر. اتأكد من الاتصال وجرّب تاني.');
  assert.equal(getLocalizedErrorMessage('permission denied for table users', 'ar'), 'معندكش صلاحية تعمل الإجراء ده.');
  assert.equal(getLocalizedErrorMessage('JWT expired', 'ar'), 'جلسة تسجيل الدخول انتهت. سجّل دخولك تاني وجرّب.');
  assert.equal(getLocalizedErrorMessage('duplicate key value violates unique constraint', 'ar'), 'البيانات دي موجودة بالفعل.');
  assert.equal(getLocalizedErrorMessage('Invalid input value', 'ar'), 'راجع البيانات اللي دخلتها وجرّب تاني.');
});

test('already-Arabic messages are preserved and English errors remain unchanged', () => {
  assert.equal(getLocalizedErrorMessage('مفيش بيانات متاحة دلوقتي.', 'ar'), 'مفيش بيانات متاحة دلوقتي.');
  assert.equal(getLocalizedErrorMessage('Failed to fetch', 'en'), 'Failed to fetch');
});

test('unknown or missing backend errors do not expose raw infrastructure text in Arabic', () => {
  assert.equal(getLocalizedErrorMessage('Internal server exception at /srv/private/path', 'ar'), 'حصلت مشكلة وإحنا بننفّذ الطلب. جرّب تاني.');
  assert.equal(getLocalizedErrorMessage(null, 'ar'), 'حصلت مشكلة غير متوقعة. جرّب تاني.');
});
