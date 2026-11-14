-- Phase 36: prevent future accidental public exposure through legacy media buckets.
-- The current upload path uses the private curriculum-media bucket. These legacy
-- buckets are empty; fail closed if that assumption changes before deployment.

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM storage.objects
    WHERE bucket_id IN ('hymns-audio', 'lesson-worksheets')
  ) THEN
    RAISE EXCEPTION
      'Legacy media buckets are not empty; review their objects before changing public visibility.';
  END IF;

  UPDATE storage.buckets
  SET public = false
  WHERE id IN ('hymns-audio', 'lesson-worksheets')
    AND public = true;
END
$migration$;
