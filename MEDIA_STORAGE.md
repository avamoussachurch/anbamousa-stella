# Persistent media storage

New feed uploads and teacher curriculum uploads are sent to the trusted Express
server at `POST /api/upload-media`. The server authenticates and authorizes the
uploader before parsing the request, validates the file extension and signature,
then writes file bytes to Supabase Storage. It records a stable
`supabase-storage://<bucket>/<object-path>` reference and file metadata in
`public.media_objects`; permanent feed/source records keep that reference, never
a time-limited signed URL.

Feed media uses the public `stella-feed-media-v1` bucket, matching the existing
community feed visibility. The server returns a public preview URL for display.
Curriculum media uses the private `stella-curriculum-media-v1` bucket. A fresh
10-minute signed URL is issued by `GET /api/media-url` only after the server
checks the owner's/admin's access or verifies that the source belongs to a
published lesson. The URL is not stored. Do not make the curriculum bucket
public or grant browser access to its objects.

The legacy `/uploads/<filename>` reader and existing public sample files remain
supported. New uploads do not write to local disk. Existing files/records are
not deleted or rewritten automatically. When a host's local filesystem is
ephemeral, keep a backup and run `node scripts/migrate-local-media-to-supabase.cjs`
first in dry-run mode; use `--apply` only after verifying the listed rows, bucket
setup, and backups. The script updates only legacy `/uploads/` references in
`feed_posts.media_url` and `lesson_sources.file_url`, and leaves the original
files and all other records in place. It requires the additive migration in
`scripts/migrations/phase9_persistent_media.sql` to have been applied manually.

## Server configuration

Set these names only in the trusted server environment:

- `SUPABASE_URL` (or existing `VITE_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`)
- Optional bucket overrides: `SUPABASE_FEED_MEDIA_BUCKET`,
  `SUPABASE_CURRICULUM_MEDIA_BUCKET`

Never use a `VITE_` prefix for the service-role/secret key, commit its value, or
send it to browser code. Missing configuration and Storage/database failures
return explicit errors; they never fall back to `blob:` URLs or data URLs as a
successful upload.

## Database setup

The existing `feed_posts.media_url` and `lesson_sources.file_url` text columns
already support stable references, so no change to those tables is required.
`public.media_objects` and the two isolated buckets are new requirements.
Review and apply `scripts/migrations/phase9_persistent_media.sql` manually; it
does not migrate old uploads, change existing buckets, or delete data. Verify
the configured bucket names and visibility match the values above if overrides
are used.
