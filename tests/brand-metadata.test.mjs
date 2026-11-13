import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const html = read('../index.html');
const vite = read('../vite.config.ts');
const metadata = JSON.parse(read('../metadata.json'));
const packageJson = JSON.parse(read('../package.json'));
const packageLock = JSON.parse(read('../package-lock.json'));
const topBar = read('../src/components/layout/TopBar.tsx');
const profile = read('../src/components/student/ProfileTab.tsx');
const slides = read('../src/components/sunday-school/viewers/SlideDeckViewer.tsx');

test('browser metadata uses the approved Anba Mousa brand and tagline', () => {
  assert.match(html, /<title>Anba Mousa — Growing in Faith, Learning in Love<\/title>/);
  assert.match(html, /<meta name="apple-mobile-web-app-title" content="Anba Mousa"/);
  assert.match(html, /<meta property="og:title" content="Anba Mousa"/);
  assert.match(html, /Growing in Faith, Learning in Love/);
  assert.doesNotMatch(html, /St\. Musa Coptic Sunday School Platform|StMusaApp/);
});

test('installed PWA manifest uses the approved Anba Mousa identity', () => {
  assert.match(vite, /name: 'Anba Mousa'/);
  assert.match(vite, /short_name: 'Anba Mousa'/);
  assert.match(vite, /Growing in Faith, Learning in Love/);
  assert.doesNotMatch(vite, /St\. Musa Church App|StMusaApp/);
});

test('app-facing brand labels are consistent', () => {
  assert.equal(metadata.name, 'Anba Mousa');
  assert.match(metadata.description, /Growing in Faith, Learning in Love/);
  assert.equal(packageJson.name, 'anba-mousa');
  assert.equal(packageLock.name, 'anba-mousa');
  assert.equal(packageLock.packages[''].name, 'anba-mousa');
  assert.match(topBar, /: 'Anba Mousa'/);
  assert.match(profile, /log out of your Anba Mousa account/);
  assert.match(slides, /Anba Mousa Sunday School • 4th Grade/);
});
