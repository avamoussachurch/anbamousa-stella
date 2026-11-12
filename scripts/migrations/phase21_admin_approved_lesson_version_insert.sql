-- Phase 21: allow an authenticated administrator to create an immediately approved
-- lesson version while preserving the authenticated draft-only path for teachers.
-- Published state remains exclusively controlled by the trusted publication RPC.
BEGIN;

DO $preflight$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.lesson_versions'::regclass) THEN
    RAISE EXCEPTION 'RLS must remain enabled on public.lesson_versions.';
  END IF;
  IF to_regprocedure('public.can_review_curriculum_lesson(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Required authorization helper public.can_review_curriculum_lesson(uuid) is missing.';
  END IF;
  IF to_regprocedure('public.has_role(text)') IS NULL THEN
    RAISE EXCEPTION 'Required assigned-role helper public.has_role(text) is missing.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lesson_versions'
      AND policyname = 'lesson_versions_insert_authorized_teacher'
      AND cmd = 'INSERT'
  ) THEN
    RAISE EXCEPTION 'Expected lesson_versions_insert_authorized_teacher policy is missing; inspect current curriculum authorization before proceeding.';
  END IF;
END;
$preflight$;

DROP POLICY IF EXISTS lesson_versions_insert_authorized_teacher ON public.lesson_versions;

CREATE POLICY lesson_versions_insert_authorized_teacher
  ON public.lesson_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.can_review_curriculum_lesson(lesson_id)
    AND (
      status = 'AI_DRAFT'
      OR (
        status = 'APPROVED'
        AND public.has_role('admin')
        AND approved_by::text = (SELECT auth.uid())::text
        AND approved_at IS NOT NULL
      )
    )
  );

COMMIT;
