-- Phase 36 verification: both legacy buckets must remain private and empty.
SELECT
  id,
  public,
  (SELECT count(*) FROM storage.objects o WHERE o.bucket_id = b.id) AS object_count,
  (public IS FALSE) AS is_private,
  NOT EXISTS (
    SELECT 1 FROM storage.objects o WHERE o.bucket_id = b.id
  ) AS is_empty
FROM storage.buckets b
WHERE id IN ('hymns-audio', 'lesson-worksheets')
ORDER BY id;
