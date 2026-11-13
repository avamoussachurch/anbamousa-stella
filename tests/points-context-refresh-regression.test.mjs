import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const pointsContext = await readFile(
  new URL('../src/context/PointsContext.tsx', import.meta.url),
  'utf8'
);

test('authenticated leaderboard refresh ignores unrelated screen-time user object updates', () => {
  const callbackStart = pointsContext.indexOf('  const refreshScores = useCallback(() => {');
  const effectStart = pointsContext.indexOf('  useEffect(() => {\n    refreshScores();', callbackStart);
  assert.notEqual(callbackStart, -1, 'refreshScores callback exists');
  assert.notEqual(effectStart, -1, 'refreshScores subscription effect exists');

  const callback = pointsContext.slice(callbackStart, effectStart);
  assert.match(callback, /const leaderboardUser = useMemo\(\(\) => userData/);
  assert.match(callback, /\}, \[leaderboardUser, refreshUserId, isGuestUser, isStudentUser\]\);/);

  const callbackDependencies = callback.match(/\}, \[([^\]]+)\]\);/)?.[1] || '';
  assert.ok(callbackDependencies.length > 0, 'callback dependency list exists');
  assert.doesNotMatch(callbackDependencies, /\buserData\b/, 'whole user object must not trigger leaderboard refresh');

  const effectEnd = pointsContext.indexOf('\n  }, [refreshScores]);', effectStart);
  assert.notEqual(effectEnd, -1, 'subscription effect depends only on the stable refresh callback');
});
