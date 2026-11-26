UPDATE storage.buckets
SET allowed_mime_types = ARRAY['audio/webm','audio/mp4','audio/ogg','audio/mpeg','audio/wav']
WHERE id = 'hymn-practice-recordings';
