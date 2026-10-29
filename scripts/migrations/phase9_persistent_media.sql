-- Persistent media metadata and isolated Storage buckets.
-- Apply manually only after reviewing the current project. This migration is not
-- executed by the application and does not move or delete existing media.

CREATE TABLE IF NOT EXISTS public.media_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_bucket TEXT NOT NULL,
  object_path TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL,
  media_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  byte_size BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS media_objects_bucket_path_uidx
  ON public.media_objects (storage_bucket, object_path);
CREATE INDEX IF NOT EXISTS media_objects_owner_created_idx
  ON public.media_objects (owner_id, created_at DESC);

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.media_objects'::regclass
      AND conname = 'media_objects_visibility_check'
  ) THEN
    ALTER TABLE public.media_objects
      ADD CONSTRAINT media_objects_visibility_check
      CHECK (visibility IN ('public', 'private'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.media_objects'::regclass
      AND conname = 'media_objects_type_check'
  ) THEN
    ALTER TABLE public.media_objects
      ADD CONSTRAINT media_objects_type_check
      CHECK (media_type IN ('image', 'video', 'audio', 'document'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.media_objects'::regclass
      AND conname = 'media_objects_byte_size_check'
  ) THEN
    ALTER TABLE public.media_objects
      ADD CONSTRAINT media_objects_byte_size_check
      CHECK (byte_size >= 0);
  END IF;
END
$migration$;

ALTER TABLE public.media_objects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.media_objects FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.media_objects TO service_role;

-- These names are intentionally versioned/new so applying the migration cannot
-- change the visibility of pre-existing buckets or their objects.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'stella-feed-media-v1',
    'stella-feed-media-v1',
    true,
    104857600,
    ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/aac'
    ]
  ),
  (
    'stella-curriculum-media-v1',
    'stella-curriculum-media-v1',
    false,
    104857600,
    ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/aac',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword', 'application/vnd.ms-powerpoint'
    ]
  )
ON CONFLICT (id) DO NOTHING;
