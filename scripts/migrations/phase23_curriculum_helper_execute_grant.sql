-- Phase 23: Restore the minimum execute permission required by the
-- authenticated student class-change RLS policies.
--
-- This helper is IMMUTABLE and only maps a grade label to a class-group ID.
-- It is not SECURITY DEFINER and does not read or mutate protected data.
-- The Phase 19 blanket revoke removed EXECUTE from authenticated, causing
-- INSERT/UPDATE policies in Phase 22 to fail with 42501 permission denied.

REVOKE ALL ON FUNCTION public.curriculum_grade_class_group(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.curriculum_grade_class_group(TEXT) TO authenticated;
