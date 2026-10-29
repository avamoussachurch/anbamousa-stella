import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createStorageReference, parseStorageReference } from '../src/lib/mediaStorageReference';
import { parsePersistentMediaUploadResponse } from '../src/lib/mediaUploadResponse';

describe('persistent media references', () => {
  it('round-trips an object path without storing a signed URL', () => {
    const value = createStorageReference('stella-curriculum-media-v1', 'teacher-1/asset_01.pdf');
    assert.equal(value, 'supabase-storage://stella-curriculum-media-v1/teacher-1/asset_01.pdf');
    assert.deepEqual(parseStorageReference(value), {
      bucket: 'stella-curriculum-media-v1',
      objectPath: 'teacher-1/asset_01.pdf'
    });

    describe('persistent media upload confirmation', () => {
      it('only confirms a successful server response with stable and preview URLs', async () => {
        const result = await parsePersistentMediaUploadResponse({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            mediaUrl: 'supabase-storage://stella-feed-media-v1/abc/photo.png',
            previewUrl: 'https://storage.example/public/photo.png'
          })
        });
        assert.equal(result.success, true);
        assert.match(result.mediaUrl || '', /^supabase-storage:\/\//);
      });

      it('never shapes failed or incomplete server responses as success', async () => {
        const failed = await parsePersistentMediaUploadResponse({
          ok: false,
          status: 502,
          json: async () => ({ success: false, message: 'Storage unavailable' })
        });
        const incomplete = await parsePersistentMediaUploadResponse({
          ok: true,
          status: 200,
          json: async () => ({ success: true, mediaUrl: 'blob:temporary' })
        });
        assert.deepEqual(failed, { success: false, error: 'Storage unavailable' });
        assert.equal(incomplete.success, false);
        assert.equal(incomplete.error, 'The server did not confirm persistent media storage.');
      });
    });
  });

  it('rejects traversal, encoded separators, and malformed references', () => {
    assert.equal(parseStorageReference('supabase-storage://bucket/../private.pdf'), null);
    assert.equal(parseStorageReference('supabase-storage://bucket/a%2F..%2Fprivate.pdf'), null);
    assert.equal(parseStorageReference('supabase-storage://bucket//private.pdf'), null);
    assert.equal(parseStorageReference('https://host/storage/v1/object/sign/bucket/file?token=x'), null);
    assert.throws(() => createStorageReference('bucket', 'a/../private.pdf'));
  });
});
