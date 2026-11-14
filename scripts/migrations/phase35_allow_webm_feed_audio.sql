-- Browser MediaRecorder commonly emits audio/webm (Opus).
-- Keep this audio format explicitly allowed in the public community-feed bucket.
UPDATE storage.buckets
SET allowed_mime_types = (
  SELECT array_agg(DISTINCT mime_type ORDER BY mime_type)
  FROM unnest(COALESCE(allowed_mime_types, ARRAY[]::text[]) || ARRAY['audio/webm']) AS mime_type
)
WHERE id = 'stella-feed-media-v1'
  AND NOT ('audio/webm' = ANY(COALESCE(allowed_mime_types, ARRAY[]::text[])));
