import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const feed = await readFile(new URL('../src/components/student/FeedTab.tsx', import.meta.url), 'utf8');
const directory = await readFile(new URL('../src/components/student/FeedPeopleDirectory.tsx', import.meta.url), 'utf8');

test('community feed provides private, persistent saved posts and a saved-only view', () => {
  assert.match(feed, /from\('feed_post_bookmarks'\)/);
  assert.match(feed, /handleToggleBookmark/);
  assert.match(feed, /handleSharePost/);
  assert.match(feed, /navigator\.share/);
  assert.match(feed, /case 'saved'/);
  assert.match(feed, /aria-pressed=\{bookmarkedPostIds\.has\(post\.id\)\}/);
});

test('community directory entry is visually prominent and has a clear icon and label', () => {
  assert.match(directory, /MessagesSquare/);
  assert.match(directory, /Community/);
  assert.match(directory, /Explore/);
  assert.match(directory, /bg-gradient-to-br from-\[#5865F2\]/);
});

test('community posts retain the existing poll, audience, moderation, and media experiences', () => {
  assert.match(feed, /pollEnabled/);
  assert.match(feed, /targetClassesEnabled/);
  assert.match(feed, /targetGradesEnabled/);
  assert.match(feed, /reportingPostId/);
  assert.match(feed, /uploadFeedMediaToSupabase/);
});
