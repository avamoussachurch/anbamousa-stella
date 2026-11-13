import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');

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
