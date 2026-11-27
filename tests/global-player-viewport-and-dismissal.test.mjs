import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('global player dismisses on outside interaction and keeps its controls viewport-aware', async () => {
  const player = await read('../src/components/layout/GlobalMusicPlayer.tsx');
  assert.match(player, /playerRootRef/);
  assert.match(player, /document\.addEventListener\('pointerdown', handleOutsidePointer\)/);
  assert.match(player, /document\.addEventListener\('keydown', handleEscape\)/);
  assert.match(player, /max-h-\[calc\(100dvh-2rem\)\]/);
  assert.match(player, /clampBubblePosition/);
  assert.match(player, /Coptic church cymbals/);
  assert.match(player, /setIsOpen\(false\)/);
});
