import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { getMyClass, getClassRoster } from '../src/lib/classRosterService.ts';
import { getPendingActivationRequests } from '../src/lib/onboardingService.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('authenticated class reads surface network failures instead of returning demo success', async () => {
  globalThis.fetch = async () => {
    throw new Error('network unavailable');
  };

  const myClass = await getMyClass(undefined, undefined, false);
  const roster = await getClassRoster(undefined, false);

  assert.equal(myClass.data, null);
  assert.match(myClass.error.message, /network unavailable/i);
  assert.equal(roster.data, null);
  assert.match(roster.error.message, /network unavailable/i);
});

test('activation request failures are not reported as an empty successful queue', async () => {
  globalThis.fetch = async () => {
    throw new Error('network unavailable');
  };

  const result = await getPendingActivationRequests();

  assert.equal(result.success, false);
  assert.deepEqual(result.requests, []);
  assert.match(result.error, /network unavailable/i);
});

test('explicit demo mode retains the offline class roster fallback', async () => {
  globalThis.fetch = async () => {
    throw new Error('offline demo');
  };

  const result = await getMyClass(undefined, undefined, true);

  assert.ok(result.data);
  assert.equal(result.error, null);
});
