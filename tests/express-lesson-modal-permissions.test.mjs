import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = await readFile(new URL('../src/components/teacher/ExpressLessonPublishModal.tsx', import.meta.url), 'utf8');

test('Express Lesson modal calls hooks before its closed-state return', () => {
  const authHook = source.indexOf('const { userData, isGuest } = useAuth();');
  const closedReturn = source.indexOf('if (!isOpen) return null;');
  const jsxReturn = source.indexOf('\n  return (', closedReturn);

  assert.notEqual(authHook, -1);
  assert.notEqual(closedReturn, -1);
  assert.ok(authHook < closedReturn);
  assert.ok(closedReturn < jsxReturn);
});

test('Express Lesson direct publishing is limited to authenticated administrators', () => {
  assert.match(source, /const canDirectPublish = isOnlineAuth && hasRole\(userData, 'admin'\);/);
  assert.match(source, /if \(directlyPublish && !canDirectPublish\)/);
  assert.match(source, /\{canDirectPublish && \(/);
});
