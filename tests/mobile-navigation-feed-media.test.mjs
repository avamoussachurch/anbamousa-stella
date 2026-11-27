import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const app = read('../src/App.tsx');
const help = read('../src/components/layout/HelpFeedbackButton.tsx');
const notifications = read('../src/components/layout/NotificationPreferencesButton.tsx');
const feed = read('../src/components/student/FeedTab.tsx');
const video = read('../src/components/student/FeedVideoPlayer.tsx');
const nav = read('../src/components/layout/BottomNav.tsx');
const database = read('../src/lib/supabaseDatabase.ts');

test('help and notification dialogs fit the mobile visual viewport and home-indicator safe area', () => {
  for (const source of [help, notifications]) {
    assert.match(source, /max-h-\[calc\(100dvh-env\(safe-area-inset-top\)-env\(safe-area-inset-bottom\)-1rem\)\]/);
    assert.match(source, /pb-\[calc\(1\.25rem\+env\(safe-area-inset-bottom\)\)\]/);
    assert.match(source, /overscroll-contain/);
  }
});

test('mobile app content reserves room for the fixed bottom navigation and safe area', () => {
  assert.match(app, /pb-\[calc\(5rem\+env\(safe-area-inset-bottom\)\)\] lg:pb-8/);
  assert.match(nav, /app-bottom-nav fixed inset-x-0 bottom-0[\s\S]*pb-safe/);
});

test('browser Back restores previous workspace, tab, and lesson instead of exiting from the app root', () => {
  assert.match(app, /window\.addEventListener\('popstate', handlePopState\)/);
  assert.match(app, /window\.history\.pushState/);
  assert.match(app, /anbaMousaAppRoot/);
  assert.match(app, /anbaMousaAppGuard/);
  assert.match(app, /params\.get\('lesson'\)/);
  assert.match(app, /params\.set\('lesson', activeLessonId\)/);
  assert.match(app, /historyRouteRef\.current !== routeKey/);
});

test('uploaded feed videos use a responsive native player with fullscreen and no forced autoplay', () => {
  assert.match(feed, /import \{ FeedVideoPlayer \} from '\.\/FeedVideoPlayer'/);
  assert.match(feed, /<FeedVideoPlayer/);
  assert.match(video, /<video/);
  assert.match(video, /controls/);
  assert.match(video, /playsInline/);
  assert.match(video, /preload="metadata"/);
  assert.match(video, /requestFullscreen/);
  assert.match(video, /controls=\{false\}/);
  assert.match(video, /Volume2/);
  assert.match(video, /aspectRatio/);
  assert.match(video, /skip\(-5\)/);
  assert.match(video, /skip\(5\)/);
  const voice = readFileSync(new URL('../src/components/student/FeedVoiceMessage.tsx', import.meta.url), 'utf8');
  assert.match(voice, /Array\(48\)\.fill\(5\)/);
  assert.match(voice, /decodeAudioData/);
  assert.match(voice, /playbackRate/);
  assert.match(video, /video\.videoWidth/);
  assert.doesNotMatch(video, /autoPlay/);
});

test('feed voice recordings use the in-app audio player rather than browser-default audio controls', () => {
  assert.match(feed, /<FeedVoiceMessage/);
  const voice = read('../src/components/student/FeedVoiceMessage.tsx');
  assert.match(voice, /aria-label=.*Voice message waveform/);
  assert.match(voice, /<audio/);
  assert.doesNotMatch(voice, /controls=\{true\}|originalFilename/);
  assert.match(voice, /decodeAudioData/);
  assert.match(voice, /playbackRate/);
});

test('Vimeo links stay on the provider embed path instead of being passed to the native MP4 player', () => {
  const vimeo = database.slice(database.indexOf('// 3. Vimeo is a hosted player URL'), database.indexOf('// 4. Direct Audio'));
  assert.match(vimeo, /mediaType: 'embed'/);
  assert.match(vimeo, /player\.vimeo\.com\/video/);
});

test('feed voice waveform decoding is deferred until playback to avoid eager full-file downloads', () => {
  const voice = read('../src/components/student/FeedVoiceMessage.tsx');
  const initialEffect = voice.slice(voice.indexOf('useEffect(() => {'), voice.indexOf('  const loadWaveformOnDemand'));
  assert.doesNotMatch(initialEffect, /fetch\(src/);
  assert.match(voice, /const loadWaveformOnDemand = async/);
  assert.match(voice, /void loadWaveformOnDemand\(\)/);
  assert.match(voice, /waveformRequestedRef\.current/);
  assert.match(voice, /new AbortController\(\)/);
  assert.match(voice, /waveformAbortRef\.current\?\.abort\(\)/);
  assert.match(voice, /requestId !== waveformRequestIdRef\.current/);
});
