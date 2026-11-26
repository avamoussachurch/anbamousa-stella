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

test('help and notification dialogs fit the mobile visual viewport and home-indicator safe area', () => {
  for (const source of [help, notifications]) {
    assert.match(source, /max-h-\[calc\(100dvh-env\(safe-area-inset-top\)-env\(safe-area-inset-bottom\)-1rem\)\]/);
    assert.match(source, /pb-\[calc\(1\.25rem\+env\(safe-area-inset-bottom\)\)\]/);
    assert.match(source, /overscroll-contain/);
  }
});

test('mobile app content reserves room for the fixed bottom navigation and safe area', () => {
  assert.match(app, /pb-\[calc\(5rem\+env\(safe-area-inset-bottom\)\)\] lg:pb-8/);
  assert.match(nav, /padding-bottom: max\(0\.5rem, env\(safe-area-inset-bottom, 0px\)\)/);
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
  assert.match(video, /video\.videoWidth/);
  assert.doesNotMatch(video, /autoPlay/);
});

test('feed voice recordings use the in-app audio player rather than browser-default audio controls', () => {
  assert.match(feed, /Listen without leaving the post/);
  assert.match(feed, /<UniversalAudioPlayer/);
  assert.match(feed, /accent="teal"/);
});
