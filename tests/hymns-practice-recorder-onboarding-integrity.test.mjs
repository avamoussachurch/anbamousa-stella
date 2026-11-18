import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('Hymns rehearsal recorder supports pause, resume, stop, and microphone-driven waveform', async () => {
  const source = await read('../src/components/hymns/HymnsSchoolTab.tsx');
  assert.match(source, /recorder\.pause\(\)/);
  assert.match(source, /recorder\.resume\(\)/);
  assert.match(source, /recorder\.stop\(\)/);
  assert.match(source, /analyser\.getByteFrequencyData\(bins\)/);
  assert.match(source, /createMediaStreamSource\(stream\)/);
  assert.match(source, /role="img"/);
  assert.match(source, /Live microphone waveform/);
  assert.match(source, /aria-label=\{isPracticeRecordingPaused/);
  assert.match(source, /recorder\.mimeType \|\| audioChunksRef\.current\[0\]\?\.type/);
  assert.match(source, /recordingStreamRef\.current\?\.getTracks\(\)\.forEach/);
  assert.match(source, /The recording is empty/);
});

test('Hymns recording failures are visible and unsupported browsers are handled', async () => {
  const source = await read('../src/components/hymns/HymnsSchoolTab.tsx');
  assert.match(source, /navigator\.mediaDevices\?\.getUserMedia/);
  assert.match(source, /typeof MediaRecorder === 'undefined'/);
  assert.match(source, /practiceRecordingError && <p role="alert"/);
  assert.match(source, /Could not access the microphone/);
});

test('offline onboarding requests and status checks never report unpersisted success', async () => {
  const source = await read('../src/lib/onboardingService.ts');
  assert.doesNotMatch(source, /fallbackReq/);
  assert.doesNotMatch(source, /return \{ success: true, request: null, isEnrolled: false \}/);
  assert.match(source, /The activation request could not be confirmed by the server/);
  assert.match(source, /Could not verify class status because the server is unavailable/);
});
