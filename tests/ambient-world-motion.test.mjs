import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('ambient world is mounted in the authenticated shell shared by all roles', async () => {
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const world = await readFile(new URL('../src/components/layout/AmbientWorld.tsx', import.meta.url), 'utf8');
  assert.match(app, /<AmbientWorld variant="app" \/>/);
  assert.match(app, /<WorkspaceProvider value=\{activeWorkspace\}>[\s\S]*?<AmbientWorld variant="app" \/>/);
  assert.match(world, /ambient-world--\$\{variant\}/);
  assert.match(world, /aria-hidden="true"/);
});

test('login uses a cinematic entrance and the animated login atmosphere', async () => {
  const login = await readFile(new URL('../src/components/auth/LoginScreen.tsx', import.meta.url), 'utf8');
  assert.match(login, /<AmbientWorld variant="login" \/>/);
  assert.match(login, /useReducedMotion/);
  assert.match(login, /initial=\{reduceMotion \? false : \{ opacity: 0, y: 42, scale: 0\.94, rotateX: 7 \}\}/);
  assert.match(login, /repeat: Infinity/);
});

test('ambient motion respects reduced-motion preferences and avoids pointer interception', async () => {
  const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(css, /pointer-events: none/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /ambient-firefly/);
  assert.match(css, /ambient-lantern/);
});
