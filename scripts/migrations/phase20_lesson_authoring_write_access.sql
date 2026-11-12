-- Phase 20: restore authenticated lesson authoring writes without broadening row access.
-- This migration intentionally leaves publishing to the trusted publish RPC.
BEGIN;

DO $preflight$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.lessons'::regclass) THEN
    RAISE EXCEPTION 'RLS must remain enabled on public.lessons.';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.lesson_versions'::regclass) THEN
    RAISE EXCEPTION 'RLS must remain enabled on public.lesson_versions.';
  END IF;
  IF to_regprocedure('public.can_review_curriculum_lesson(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Required authorization helper public.can_review_curriculum_lesson(uuid) is missing.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lessons'
      AND policyname = 'lessons_insert_teacher'
      AND cmd = 'INSERT'
  ) THEN
    RAISE EXCEPTION 'Expected existing lessons_insert_teacher policy is missing; inspect curriculum authorization before proceeding.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lessons'
      AND policyname = 'lessons_update_owner_or_admin'
      AND cmd = 'UPDATE'
  ) THEN
    RAISE EXCEPTION 'Expected existing lessons_update_owner_or_admin policy is missing; inspect curriculum authorization before proceeding.';
  END IF;
END;
$preflight$;

-- Existing lesson RLS policies already enforce servant/admin creation and owner/admin updates.
-- Restore only the missing table privileges needed by the authenticated authoring client.
GRANT INSERT, UPDATE ON TABLE public.lessons TO authenticated;

-- Draft versions are created only by their authenticated author and only in AI_DRAFT state.
DROP POLICY IF EXISTS lesson_versions_insert_authorized_teacher ON public.lesson_versions;
CREATE POLICY lesson_versions_insert_authorized_teacher
  ON public.lesson_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND status = 'AI_DRAFT'
    AND public.can_review_curriculum_lesson(lesson_id)
  );

-- Authors can edit their own versions; administrators can administer versions.
-- Authenticated clients cannot set PUBLISHED; publication remains server/RPC controlled.
DROP POLICY IF EXISTS lesson_versions_update_authorized_teacher ON public.lesson_versions;
CREATE POLICY lesson_versions_update_authorized_teacher
  ON public.lesson_versions
  FOR UPDATE
  TO authenticated
  USING (
    status <> 'PUBLISHED'
    AND (
      created_by = (SELECT auth.uid())
      OR public.is_church_admin()
    )
    AND public.can_review_curriculum_lesson(lesson_id)
  )
  WITH CHECK (
    status <> 'PUBLISHED'
    AND (
      created_by = (SELECT auth.uid())
      OR public.is_church_admin()
    )
    AND public.can_review_curriculum_lesson(lesson_id)
  );

COMMIT;
