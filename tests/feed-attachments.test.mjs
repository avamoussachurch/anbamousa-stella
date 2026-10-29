import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildFeedPostAttachmentRows,
  canAddFeedAttachments,
  getPostAttachments,
  isOwnedPublicFeedReference,
  mapFeedAttachmentRow,
  MAX_FEED_ATTACHMENTS,
  uploadFeedAttachmentFile
} from '../src/lib/feedAttachments.ts';

test('one attachment and multiple mixed media types can be represented', () => {
  const insertionRows = buildFeedPostAttachmentRows('post1', 'student-a', [
    { mediaType: 'image', mediaUrl: 'https://cdn.example/feed/student-a/photo.jpg', storageReference: 'supabase-storage://feed/student-a/photo.jpg', mimeType: 'image/jpeg' },
    { mediaType: 'video', mediaUrl: 'https://cdn.example/video.mp4', mediaProvider: 'external-stream' },
    { mediaType: 'audio', mediaUrl: 'https://cdn.example/feed/student-a/song.mp3', storageReference: 'supabase-storage://feed/student-a/song.mp3', mimeType: 'audio/mpeg' }
  ]);
  assert.equal(insertionRows.length, 3);
  assert.equal(insertionRows[0].owner_id, 'student-a');
  assert.equal(insertionRows[0].storage_bucket, 'feed');
  assert.equal(insertionRows[0].object_path, 'student-a/photo.jpg');
  assert.equal(insertionRows[1].external_url, 'https://cdn.example/video.mp4');

  const rows = [
    { id: 'a1', media_type: 'image', storage_bucket: 'feed', object_path: 'u1/photo.jpg', external_url: null, media_thumbnail: null, media_provider: null, original_filename: 'photo.jpg', byte_size: 120 },
    { id: 'a2', media_type: 'video', storage_bucket: null, object_path: null, external_url: 'https://media.example/video.mp4', media_thumbnail: null, media_provider: null, original_filename: null, byte_size: null },
    { id: 'a3', media_type: 'audio', storage_bucket: 'feed', object_path: 'u1/song.mp3', external_url: null, media_thumbnail: null, media_provider: null, original_filename: 'song.mp3', byte_size: 240 }
  ];
  const mapped = rows.map(row => mapFeedAttachmentRow(row, (bucket, path) => `https://cdn.example/${bucket}/${path}`));
  assert.equal(getPostAttachments({ id: 'post1', attachments: mapped }).length, 3);
  assert.deepEqual(mapped.map(attachment => attachment.mediaType), ['image', 'video', 'audio']);
  assert.equal(getPostAttachments({ id: 'post2', mediaType: 'image', mediaUrl: 'https://cdn.example/old.jpg' }).length, 1);
});

test('attachment limit allows exactly ten and rejects an eleventh', () => {
  assert.equal(MAX_FEED_ATTACHMENTS, 10);
  assert.equal(canAddFeedAttachments(0, 1), true);
  assert.equal(canAddFeedAttachments(7, 3), true);
  assert.equal(canAddFeedAttachments(10, 1), false);
  assert.equal(canAddFeedAttachments(8, 3), false);
});

test('feed media references are accepted only for the current owner', () => {
  const reference = 'supabase-storage://feed/student-a/photo.jpg';
  assert.equal(isOwnedPublicFeedReference(reference, 'student-a', 'student-a', 'feed'), true);
  assert.equal(isOwnedPublicFeedReference(reference, 'student-a', 'student-b', 'feed'), false);
  assert.equal(isOwnedPublicFeedReference(reference, 'student-a', 'student-a', 'private-curriculum'), false);
  assert.equal(isOwnedPublicFeedReference('https://cdn.example/private.jpg', 'student-a', 'student-a', 'feed'), false);
});

test('upload failures remain explicit and do not produce a ready attachment', async () => {
  const file = { name: 'photo.jpg', size: 12, type: 'image/jpeg' };
  const result = await uploadFeedAttachmentFile(file, 'student-a', async () => ({
    success: false,
    mediaType: 'image',
    error: 'Storage unavailable'
  }));
  assert.equal(result.data, null);
  assert.equal(result.error.message, 'Storage unavailable');
});

test('successful upload stores the stable reference separately from its preview URL', async () => {
  const file = { name: 'photo.jpg', size: 1234, type: 'image/jpeg' };
  const result = await uploadFeedAttachmentFile(file, 'student-a', async () => ({
    success: true,
    mediaType: 'image',
    mediaUrl: 'supabase-storage://feed/student-a/photo.jpg',
    previewUrl: 'https://cdn.example/feed/student-a/photo.jpg',
    provider: 'supabase-storage'
  }));
  assert.equal(result.error, null);
  assert.equal(result.data.mediaUrl, 'https://cdn.example/feed/student-a/photo.jpg');
  assert.equal(result.data.storageReference, 'supabase-storage://feed/student-a/photo.jpg');
  assert.equal(result.data.status, 'ready');
});

test('persisted attachments map to fresh display URLs after refresh', () => {
  const attachment = mapFeedAttachmentRow({
    id: 'saved-attachment',
    media_type: 'image',
    storage_bucket: 'feed',
    object_path: 'student-a/photo.jpg',
    external_url: null,
    media_thumbnail: null,
    media_provider: null,
    original_filename: 'photo.jpg',
    byte_size: 1234
  }, (bucket, path) => `https://cdn.example/${bucket}/${path}`);
  assert.equal(attachment.mediaUrl, 'https://cdn.example/feed/student-a/photo.jpg');
  assert.equal(attachment.originalFilename, 'photo.jpg');
});

test('database policy restricts storage attachments to the authenticated owner and public media', () => {
  const migration = readFileSync(new URL('../scripts/migrations/phase10_feed_post_attachments.sql', import.meta.url), 'utf8');
  assert.match(migration, /owner_id = auth\.uid\(\)/);
  assert.match(migration, /m\.owner_id = p_owner_id/);
  assert.match(migration, /m\.visibility = 'public'/);
  assert.match(migration, /m\.media_type IN \('image', 'video', 'audio'\)/);
  assert.match(migration, /external_url !~\* '\/object\/sign\/'/);
  assert.match(migration, /CREATE TRIGGER enforce_feed_post_media_ownership/);
  assert.match(migration, /can_attach_owned_feed_media_reference\(NEW\.media_url, auth\.uid\(\)\)/);
});
