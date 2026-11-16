import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const migration = readFileSync(new URL('../../scripts/migrations/phase50_atomic_parent_reward_approval.sql', import.meta.url), 'utf8');
const server = readFileSync(new URL('../../server.ts', import.meta.url), 'utf8');

test('parent reward approval is atomic and requires a verified parent-child relationship', () => {
  assert.match(migration, /for update/i);
  assert.match(migration, /verified_at is not null/i);
  assert.match(migration, /points = coalesce\(points, 0\) - v_request\.cost_points/i);
  assert.match(migration, /coalesce\(points, 0\) >= v_request\.cost_points/i);
});

test('reward approval RPC is not callable by browser roles', () => {
  assert.match(migration, /revoke all on function public\.review_parent_reward_request[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.review_parent_reward_request[\s\S]*to service_role/i);
});

test('parent review route delegates to the atomic reward approval RPC', () => {
  const routeStart = server.indexOf('app.post("/api/church/parent/reward-requests/:requestId/review"');
  const routeEnd = server.indexOf('// 2. Get Child Learning Review for Parent', routeStart);
  assert.ok(routeStart >= 0 && routeEnd > routeStart);
  const route = server.slice(routeStart, routeEnd);
  assert.match(route, /rpc\('review_parent_reward_request'/);
  assert.match(route, /INSUFFICIENT_POINTS/);
});
