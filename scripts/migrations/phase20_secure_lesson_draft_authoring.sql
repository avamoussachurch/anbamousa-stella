-- Phase 20: restore secure authenticated authoring writes for Sunday School drafts.
-- This migration intentionally grants only the table operations used by the authoring
-- service; RLS remains the authorization boundary for every row.
BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.lessons') IS NULL
     OR to_regclass('public.lesson_versions') IS NULL
     OR to_regclass('public.servant_class_assignments') IS NULL
     OR to_regclass('public.class_instances') IS NULL
     OR to_regclass('public.church_years') IS NULL
     OR to_regprocedure('public.curriculum_grade_class_group(text)') IS NULL
     OR to_regprocedure('public.has_role(text)') IS NULL THEN
    RAISE EXCEPTION 'Phase 20 prerequisites are missing; no authoring permissions were changed.';
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.can_author_curriculum_grade(p_grade_level TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $function$
DECLARE
  v_class_group TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF public.has_role('admin') THEN
    RETURN true;
  END IF;
  IF NOT public.has_role('teacher') THEN
    RETURN false;
  END IF;

  v_class_group := public.curriculum_grade_class_group(p_grade_level);
  IF v_class_group IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.servant_class_assignments AS assignment
    JOIN public.class_instances AS class_instance
      ON class_instance.id = assignment.class_instance_id
     AND class_instance.church_year_id = assignment.church_year_id
    JOIN public.church_years AS church_year
      ON church_year.id = assignment.church_year_id
    WHERE assignment.servant_id = auth.uid()
      AND assignment.is_active = true
      AND church_year.is_active = true
      AND class_instance.class_group_id = v_class_group
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_author_curriculum_lesson(p_lesson_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons AS lesson
    WHERE lesson.id = p_lesson_id
      AND public.can_author_curriculum_grade(lesson.grade_level)
  );
$function$;

REVOKE ALL ON FUNCTION public.can_author_curriculum_grade(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_author_curriculum_lesson(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_author_curriculum_grade(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_author_curriculum_lesson(UUID) TO authenticated, service_role;

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lessons_insert_teacher ON public.lessons;
DROP POLICY IF EXISTS lessons_update_owner_or_admin ON public.lessons;
DROP POLICY IF EXISTS lessons_delete_owner_or_admin ON public.lessons;
DROP POLICY IF EXISTS lesson_versions_insert_author ON public.lesson_versions;
DROP POLICY IF EXISTS lesson_versions_update_author ON public.lesson_versions;
DROP POLICY IF EXISTS lesson_versions_delete_author ON public.lesson_versions;

CREATE POLICY lessons_insert_teacher
  ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.can_author_curriculum_grade(grade_level)
    AND COALESCE(lesson_status, status, 'draft') = 'draft'
    AND active_version_id IS NULL
  );

CREATE POLICY lessons_update_owner_or_admin
  ON public.lessons FOR UPDATE TO authenticated
  USING (
    public.can_author_curriculum_lesson(id)
    AND (created_by = auth.uid() OR public.has_role('admin'))
  )
  WITH CHECK (
    public.can_author_curriculum_lesson(id)
    AND (created_by = auth.uid() OR public.has_role('admin'))
    AND COALESCE(lesson_status, status, 'draft') <> 'published'
  );

CREATE POLICY lessons_delete_owner_or_admin
  ON public.lessons FOR DELETE TO authenticated
  USING (
    public.can_author_curriculum_lesson(id)
    AND (created_by = auth.uid() OR public.has_role('admin'))
    AND COALESCE(lesson_status, status, 'draft') = 'draft'
    AND active_version_id IS NULL
  );

CREATE POLICY lesson_versions_insert_author
  ON public.lesson_versions FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND status = 'AI_DRAFT'
    AND public.can_author_curriculum_lesson(lesson_id)
  );

CREATE POLICY lesson_versions_update_author
  ON public.lesson_versions FOR UPDATE TO authenticated
  USING (
    public.can_author_curriculum_lesson(lesson_id)
    AND (created_by = auth.uid() OR public.has_role('admin'))
    AND status IN ('AI_DRAFT', 'SERVANT_REVIEW', 'REVISION_REQUESTED')
  )
  WITH CHECK (
    public.can_author_curriculum_lesson(lesson_id)
    AND (created_by = auth.uid() OR public.has_role('admin'))
    AND status IN ('AI_DRAFT', 'SERVANT_REVIEW', 'REVISION_REQUESTED')
  );

CREATE POLICY lesson_versions_delete_author
  ON public.lesson_versions FOR DELETE TO authenticated
  USING (
    public.can_author_curriculum_lesson(lesson_id)
    AND (created_by = auth.uid() OR public.has_role('admin'))
    AND status = 'AI_DRAFT'
  );

GRANT INSERT, UPDATE, DELETE ON TABLE public.lessons TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.lesson_versions TO authenticated;

COMMIT;
