-- Phase 19: isolate curriculum reads by role, active class, and publication state.
-- Apply after Phases 3B, 4, 5, and 13 (or later assigned-role equivalents).
BEGIN;

DO $preflight$
DECLARE
  v_missing TEXT[] := ARRAY[]::TEXT[];
  v_column RECORD;
BEGIN
  IF pg_catalog.to_regclass('public.lessons') IS NULL THEN
    v_missing := pg_catalog.array_append(v_missing, 'public.lessons (Phase 4)');
  END IF;
  IF pg_catalog.to_regclass('public.lesson_versions') IS NULL THEN
    v_missing := pg_catalog.array_append(v_missing, 'public.lesson_versions (Phase 5)');
  END IF;
  IF pg_catalog.to_regclass('public.lesson_sections') IS NULL THEN
    v_missing := pg_catalog.array_append(v_missing, 'public.lesson_sections (Phase 5)');
  END IF;
  IF pg_catalog.to_regclass('public.lesson_sources') IS NULL THEN
    v_missing := pg_catalog.array_append(v_missing, 'public.lesson_sources (Phase 5)');
  END IF;
  IF pg_catalog.to_regclass('public.lesson_section_sources') IS NULL THEN
    v_missing := pg_catalog.array_append(v_missing, 'public.lesson_section_sources (Phase 5)');
  END IF;
  IF pg_catalog.to_regclass('public.profile_role_assignments') IS NULL
     OR pg_catalog.to_regprocedure('public.has_role(text)') IS NULL THEN
    v_missing := pg_catalog.array_append(v_missing, 'public.profile_role_assignments and public.has_role(text) (Phase 13)');
  END IF;
  IF pg_catalog.to_regclass('public.class_memberships') IS NULL
     OR pg_catalog.to_regclass('public.class_instances') IS NULL
     OR pg_catalog.to_regclass('public.church_years') IS NULL
     OR pg_catalog.to_regclass('public.servant_class_assignments') IS NULL THEN
    v_missing := pg_catalog.array_append(v_missing, 'Phase 3B active class membership and assignment tables');
  END IF;
  IF pg_catalog.to_regclass('public.user_relationships') IS NULL THEN
    v_missing := pg_catalog.array_append(v_missing, 'public.user_relationships (Phase 4 family relationships)');
  END IF;

  FOR v_column IN
    SELECT required.table_name, required.column_name
    FROM (VALUES
      ('lessons', 'id'),
      ('lessons', 'created_by'),
      ('lessons', 'grade_level'),
      ('lessons', 'active_version_id'),
      ('lessons', 'lesson_status'),
      ('lessons', 'status'),
      ('lesson_versions', 'id'),
      ('lesson_versions', 'lesson_id'),
      ('lesson_versions', 'status'),
      ('lesson_sections', 'id'),
      ('lesson_sections', 'lesson_version_id'),
      ('lesson_sources', 'id'),
      ('lesson_sources', 'lesson_id'),
      ('lesson_section_sources', 'section_id'),
      ('lesson_section_sources', 'source_id'),
      ('class_memberships', 'student_id'),
      ('class_memberships', 'church_year_id'),
      ('class_memberships', 'class_instance_id'),
      ('class_memberships', 'exact_grade'),
      ('class_memberships', 'status'),
      ('class_instances', 'id'),
      ('class_instances', 'church_year_id'),
      ('class_instances', 'class_group_id'),
      ('church_years', 'id'),
      ('church_years', 'is_active'),
      ('servant_class_assignments', 'servant_id'),
      ('servant_class_assignments', 'church_year_id'),
      ('servant_class_assignments', 'class_instance_id'),
      ('servant_class_assignments', 'is_active'),
      ('user_relationships', 'parent_id'),
      ('user_relationships', 'child_id'),
      ('user_relationships', 'relationship_type'),
      ('user_relationships', 'verified_at'),
      ('profile_role_assignments', 'user_id'),
      ('profile_role_assignments', 'role'),
      ('profile_role_assignments', 'revoked_at')
    ) AS required(table_name, column_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.columns AS actual
      WHERE actual.table_schema = 'public'
        AND actual.table_name = required.table_name
        AND actual.column_name = required.column_name
    )
  LOOP
    v_missing := pg_catalog.array_append(
      v_missing,
      pg_catalog.format('public.%I.%I', v_column.table_name, v_column.column_name)
    );
  END LOOP;

  IF pg_catalog.cardinality(v_missing) > 0 THEN
    RAISE EXCEPTION 'Phase 19 curriculum access isolation prerequisites missing: %',
      pg_catalog.array_to_string(v_missing, ', ')
      USING ERRCODE = '55000';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'lessons', 'lesson_versions', 'lesson_sections',
        'lesson_sources', 'lesson_section_sources'
      )
      AND cmd = 'ALL'
      AND NOT (
        (tablename = 'lesson_sections' AND policyname = 'lesson_sections_write_policy')
        OR (tablename = 'lesson_sources' AND policyname = 'lesson_sources_write_policy')
        OR (
          tablename = 'lesson_section_sources'
          AND policyname = 'lesson_section_sources_write_policy'
        )
      )
  ) THEN
    RAISE EXCEPTION 'Unexpected FOR ALL policy found on curriculum tables. Inspect it before applying Phase 19.'
      USING ERRCODE = '55000';
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.curriculum_grade_class_group(p_grade_level TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_grade TEXT := pg_catalog.lower(pg_catalog.btrim(pg_catalog.coalesce(p_grade_level, '')));
  v_normalized TEXT;
  v_number_match TEXT[];
  v_grade_number INTEGER;
BEGIN
  IF v_grade = '' THEN
    RETURN NULL;
  END IF;

  v_normalized := pg_catalog.regexp_replace(v_grade, '[^a-z0-9]+', ' ', 'g');
  v_normalized := pg_catalog.btrim(v_normalized);

  IF pg_catalog.strpos(v_grade, 'kg') > 0
     OR pg_catalog.strpos(v_grade, 'kindergarten') > 0
     OR pg_catalog.strpos(v_grade, 'حضانة') > 0
     OR pg_catalog.strpos(v_grade, 'كي جي') > 0 THEN
    RETURN 'angels';
  END IF;
  IF pg_catalog.strpos(v_grade, 'university') > 0
     OR pg_catalog.strpos(v_grade, 'college') > 0
     OR pg_catalog.strpos(v_grade, 'youth') > 0
     OR pg_catalog.strpos(v_grade, 'جامع') > 0 THEN
    RETURN 'university';
  END IF;
  IF pg_catalog.strpos(v_grade, 'prep') > 0
     OR pg_catalog.strpos(v_grade, 'preparatory') > 0
     OR pg_catalog.strpos(v_grade, 'إعدادي') > 0
     OR pg_catalog.strpos(v_grade, 'اعدادي') > 0 THEN
    RETURN 'preparatory';
  END IF;
  IF pg_catalog.strpos(v_grade, 'secondary') > 0
     OR pg_catalog.strpos(v_grade, 'sec ') > 0
     OR pg_catalog.strpos(v_grade, 'ثانوي') > 0 THEN
    RETURN 'secondary';
  END IF;

  IF v_grade ~ '(^|[^a-z0-9])primary_2([^a-z0-9]|$)' THEN
    RETURN 'primary_2';
  END IF;
  IF v_normalized ~ '(^| )primary [1-3]( |$)' THEN
    RETURN 'primary_1';
  END IF;
  IF v_normalized ~ '(^| )primary [4-6]( |$)' THEN
    RETURN 'primary_2';
  END IF;

  v_number_match := pg_catalog.regexp_match(v_normalized, '(^|[^0-9])(1[0-2]|[1-9])([^0-9]|$)');
  IF v_number_match IS NOT NULL THEN
    v_grade_number := v_number_match[2]::INTEGER;
    IF v_grade_number BETWEEN 1 AND 3 THEN RETURN 'primary_1'; END IF;
    IF v_grade_number BETWEEN 4 AND 6 THEN RETURN 'primary_2'; END IF;
    IF v_grade_number BETWEEN 7 AND 9 THEN RETURN 'preparatory'; END IF;
    IF v_grade_number BETWEEN 10 AND 12 THEN RETURN 'secondary'; END IF;
  END IF;

  IF pg_catalog.strpos(v_grade, 'أولى ابتدائي') > 0
     OR pg_catalog.strpos(v_grade, 'اولى ابتدائي') > 0
     OR pg_catalog.strpos(v_grade, 'تانية ابتدائي') > 0
     OR pg_catalog.strpos(v_grade, 'ثانية ابتدائي') > 0
     OR pg_catalog.strpos(v_grade, 'تالتة ابتدائي') > 0
     OR pg_catalog.strpos(v_grade, 'ثالثة ابتدائي') > 0
     OR pg_catalog.strpos(v_grade, 'الصف الأول الابتدائي') > 0
     OR pg_catalog.strpos(v_grade, 'الصف الثاني الابتدائي') > 0
     OR pg_catalog.strpos(v_grade, 'الصف الثالث الابتدائي') > 0 THEN
    RETURN 'primary_1';
  END IF;
  IF pg_catalog.strpos(v_grade, 'رابعة ابتدائي') > 0
     OR pg_catalog.strpos(v_grade, 'خامسة ابتدائي') > 0
     OR pg_catalog.strpos(v_grade, 'سادسة ابتدائي') > 0
     OR pg_catalog.strpos(v_grade, 'الصف الرابع') > 0
     OR pg_catalog.strpos(v_grade, 'الصف الخامس') > 0
     OR pg_catalog.strpos(v_grade, 'الصف السادس') > 0 THEN
    RETURN 'primary_2';
  END IF;

  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_review_curriculum_lesson(
  p_lesson_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $function$
DECLARE
  v_lesson public.lessons%ROWTYPE;
  v_class_group TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  SELECT lesson.*
  INTO v_lesson
  FROM public.lessons AS lesson
  WHERE lesson.id = p_lesson_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF public.has_role('admin') THEN
    RETURN true;
  END IF;
  IF NOT public.has_role('teacher') THEN
    RETURN false;
  END IF;
  IF v_lesson.created_by = auth.uid() THEN
    RETURN true;
  END IF;

  v_class_group := public.curriculum_grade_class_group(v_lesson.grade_level);
  RETURN v_class_group IS NOT NULL AND EXISTS (
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

CREATE OR REPLACE FUNCTION public.can_read_curriculum_lesson(
  p_lesson_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $function$
DECLARE
  v_lesson public.lessons%ROWTYPE;
  v_class_group TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  SELECT lesson.*
  INTO v_lesson
  FROM public.lessons AS lesson
  WHERE lesson.id = p_lesson_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF public.can_review_curriculum_lesson(p_lesson_id) THEN
    RETURN true;
  END IF;

  v_class_group := public.curriculum_grade_class_group(v_lesson.grade_level);

  IF NOT (
    (public.has_role('student') AND EXISTS (
      SELECT 1
      FROM public.class_memberships AS membership
      JOIN public.class_instances AS class_instance
        ON class_instance.id = membership.class_instance_id
       AND class_instance.church_year_id = membership.church_year_id
      JOIN public.church_years AS church_year
        ON church_year.id = membership.church_year_id
      WHERE membership.student_id = auth.uid()
        AND membership.status = 'active'
        AND church_year.is_active = true
        AND v_class_group IS NOT NULL
        AND class_instance.class_group_id = v_class_group
    ))
    OR
    (public.has_role('parent') AND EXISTS (
      SELECT 1
      FROM public.user_relationships AS relationship
      JOIN public.profile_role_assignments AS child_role
        ON child_role.user_id = relationship.child_id
       AND child_role.role = 'student'
       AND child_role.revoked_at IS NULL
      JOIN public.class_memberships AS membership
        ON membership.student_id = relationship.child_id
       AND membership.status = 'active'
      JOIN public.class_instances AS class_instance
        ON class_instance.id = membership.class_instance_id
       AND class_instance.church_year_id = membership.church_year_id
      JOIN public.church_years AS church_year
        ON church_year.id = membership.church_year_id
      WHERE relationship.parent_id = auth.uid()
        AND relationship.relationship_type IN ('parent_child', 'guardian_student')
        AND relationship.verified_at IS NOT NULL
        AND church_year.is_active = true
        AND v_class_group IS NOT NULL
        AND class_instance.class_group_id = v_class_group
    ))
  ) THEN
    RETURN false;
  END IF;

  IF pg_catalog.lower(pg_catalog.coalesce(v_lesson.lesson_status, v_lesson.status, '')) <> 'published'
     OR v_lesson.active_version_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.lesson_versions AS active_version
    WHERE active_version.id = v_lesson.active_version_id
      AND active_version.lesson_id = p_lesson_id
      AND active_version.status = 'PUBLISHED'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_read_curriculum_source(
  p_source_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $function$
DECLARE
  v_lesson_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  SELECT source.lesson_id
  INTO v_lesson_id
  FROM public.lesson_sources AS source
  WHERE source.id = p_source_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF public.can_review_curriculum_lesson(v_lesson_id) THEN
    RETURN true;
  END IF;
  IF NOT public.can_read_curriculum_lesson(v_lesson_id) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.lesson_section_sources AS section_source
    JOIN public.lesson_sections AS section
      ON section.id = section_source.section_id
    JOIN public.lesson_versions AS lesson_version
      ON lesson_version.id = section.lesson_version_id
    JOIN public.lessons AS lesson
      ON lesson.id = lesson_version.lesson_id
    WHERE section_source.source_id = p_source_id
      AND lesson.id = v_lesson_id
      AND lesson.active_version_id = lesson_version.id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.curriculum_grade_class_group(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.curriculum_grade_class_group(TEXT) FROM authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_review_curriculum_lesson(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_read_curriculum_lesson(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_read_curriculum_source(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_review_curriculum_lesson(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_curriculum_lesson(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_curriculum_source(UUID) TO authenticated, service_role;

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_section_sources ENABLE ROW LEVEL SECURITY;

DO $replace_read_policies$
DECLARE
  v_policy RECORD;
BEGIN
  FOR v_policy IN
    SELECT tablename, policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'lessons', 'lesson_versions', 'lesson_sections',
        'lesson_sources', 'lesson_section_sources'
      )
      AND cmd IN ('SELECT', 'ALL')
  LOOP
    EXECUTE pg_catalog.format(
      'DROP POLICY %I ON public.%I',
      v_policy.policyname,
      v_policy.tablename
    );
  END LOOP;
END
$replace_read_policies$;

CREATE POLICY lessons_select_isolated
  ON public.lessons FOR SELECT TO authenticated
  USING (public.can_read_curriculum_lesson(id));

CREATE POLICY lesson_versions_select_isolated
  ON public.lesson_versions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lessons AS lesson
      WHERE lesson.id = lesson_versions.lesson_id
        AND public.can_read_curriculum_lesson(lesson.id)
        AND (
          public.can_review_curriculum_lesson(lesson.id)
          OR lesson.active_version_id = lesson_versions.id
        )
    )
  );

CREATE POLICY lesson_sections_select_isolated
  ON public.lesson_sections FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lesson_versions AS lesson_version
      JOIN public.lessons AS lesson
        ON lesson.id = lesson_version.lesson_id
      WHERE lesson_version.id = lesson_sections.lesson_version_id
        AND public.can_read_curriculum_lesson(lesson.id)
        AND (
          public.can_review_curriculum_lesson(lesson.id)
          OR lesson.active_version_id = lesson_version.id
        )
    )
  );

-- Phase 5's FOR ALL policies also acted as broad SELECT policies. Preserve
-- authoring writes only for current admins and teachers assigned to the lesson.
DROP POLICY IF EXISTS lesson_sections_write_policy ON public.lesson_sections;
DROP POLICY IF EXISTS lesson_sections_insert_teacher ON public.lesson_sections;
DROP POLICY IF EXISTS lesson_sections_update_teacher ON public.lesson_sections;
DROP POLICY IF EXISTS lesson_sections_delete_teacher ON public.lesson_sections;
DROP POLICY IF EXISTS lesson_sources_insert_teacher ON public.lesson_sources;
DROP POLICY IF EXISTS lesson_sources_update_teacher ON public.lesson_sources;
DROP POLICY IF EXISTS lesson_sources_delete_teacher ON public.lesson_sources;
DROP POLICY IF EXISTS lesson_section_sources_insert_teacher ON public.lesson_section_sources;
DROP POLICY IF EXISTS lesson_section_sources_update_teacher ON public.lesson_section_sources;
DROP POLICY IF EXISTS lesson_section_sources_delete_teacher ON public.lesson_section_sources;
CREATE POLICY lesson_sections_insert_teacher
  ON public.lesson_sections FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.lesson_versions AS lesson_version
      WHERE lesson_version.id = lesson_sections.lesson_version_id
        AND public.can_review_curriculum_lesson(lesson_version.lesson_id)
    )
  );
CREATE POLICY lesson_sections_update_teacher
  ON public.lesson_sections FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lesson_versions AS lesson_version
      WHERE lesson_version.id = lesson_sections.lesson_version_id
        AND public.can_review_curriculum_lesson(lesson_version.lesson_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.lesson_versions AS lesson_version
      WHERE lesson_version.id = lesson_sections.lesson_version_id
        AND public.can_review_curriculum_lesson(lesson_version.lesson_id)
    )
  );
CREATE POLICY lesson_sections_delete_teacher
  ON public.lesson_sections FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lesson_versions AS lesson_version
      WHERE lesson_version.id = lesson_sections.lesson_version_id
        AND public.can_review_curriculum_lesson(lesson_version.lesson_id)
    )
  );

CREATE POLICY lesson_sources_select_isolated
  ON public.lesson_sources FOR SELECT TO authenticated
  USING (public.can_read_curriculum_source(id));
CREATE POLICY lesson_sources_insert_teacher
  ON public.lesson_sources FOR INSERT TO authenticated
  WITH CHECK (public.can_review_curriculum_lesson(lesson_id));
CREATE POLICY lesson_sources_update_teacher
  ON public.lesson_sources FOR UPDATE TO authenticated
  USING (public.can_review_curriculum_lesson(lesson_id))
  WITH CHECK (public.can_review_curriculum_lesson(lesson_id));
CREATE POLICY lesson_sources_delete_teacher
  ON public.lesson_sources FOR DELETE TO authenticated
  USING (public.can_review_curriculum_lesson(lesson_id));

CREATE POLICY lesson_section_sources_select_isolated
  ON public.lesson_section_sources FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lesson_sections AS section
      JOIN public.lesson_versions AS lesson_version
        ON lesson_version.id = section.lesson_version_id
      JOIN public.lessons AS lesson
        ON lesson.id = lesson_version.lesson_id
      JOIN public.lesson_sources AS source
        ON source.id = lesson_section_sources.source_id
      WHERE section.id = lesson_section_sources.section_id
        AND public.can_read_curriculum_lesson(lesson.id)
        AND public.can_read_curriculum_lesson(source.lesson_id)
        AND (
          public.can_review_curriculum_lesson(lesson.id)
          OR lesson.active_version_id = lesson_version.id
        )
    )
  );
CREATE POLICY lesson_section_sources_insert_teacher
  ON public.lesson_section_sources FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.lesson_sections AS section
      JOIN public.lesson_versions AS lesson_version
        ON lesson_version.id = section.lesson_version_id
      JOIN public.lessons AS lesson
        ON lesson.id = lesson_version.lesson_id
      JOIN public.lesson_sources AS source
        ON source.id = lesson_section_sources.source_id
      WHERE section.id = lesson_section_sources.section_id
        AND public.can_review_curriculum_lesson(lesson.id)
        AND public.can_review_curriculum_lesson(source.lesson_id)
    )
  );
CREATE POLICY lesson_section_sources_update_teacher
  ON public.lesson_section_sources FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lesson_sections AS section
      JOIN public.lesson_versions AS lesson_version
        ON lesson_version.id = section.lesson_version_id
      JOIN public.lessons AS lesson
        ON lesson.id = lesson_version.lesson_id
      JOIN public.lesson_sources AS source
        ON source.id = lesson_section_sources.source_id
      WHERE section.id = lesson_section_sources.section_id
        AND public.can_review_curriculum_lesson(lesson.id)
        AND public.can_review_curriculum_lesson(source.lesson_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.lesson_sections AS section
      JOIN public.lesson_versions AS lesson_version
        ON lesson_version.id = section.lesson_version_id
      JOIN public.lessons AS lesson
        ON lesson.id = lesson_version.lesson_id
      JOIN public.lesson_sources AS source
        ON source.id = lesson_section_sources.source_id
      WHERE section.id = lesson_section_sources.section_id
        AND public.can_review_curriculum_lesson(lesson.id)
        AND public.can_review_curriculum_lesson(source.lesson_id)
    )
  );
CREATE POLICY lesson_section_sources_delete_teacher
  ON public.lesson_section_sources FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lesson_sections AS section
      JOIN public.lesson_versions AS lesson_version
        ON lesson_version.id = section.lesson_version_id
      JOIN public.lessons AS lesson
        ON lesson.id = lesson_version.lesson_id
      JOIN public.lesson_sources AS source
        ON source.id = lesson_section_sources.source_id
      WHERE section.id = lesson_section_sources.section_id
        AND public.can_review_curriculum_lesson(lesson.id)
        AND public.can_review_curriculum_lesson(source.lesson_id)
    )
  );

CREATE POLICY lessons_select_service_role
  ON public.lessons FOR SELECT TO service_role USING (true);
CREATE POLICY lesson_versions_select_service_role
  ON public.lesson_versions FOR SELECT TO service_role USING (true);
CREATE POLICY lesson_sections_select_service_role
  ON public.lesson_sections FOR SELECT TO service_role USING (true);
CREATE POLICY lesson_sources_select_service_role
  ON public.lesson_sources FOR SELECT TO service_role USING (true);
CREATE POLICY lesson_section_sources_select_service_role
  ON public.lesson_section_sources FOR SELECT TO service_role USING (true);

REVOKE SELECT ON TABLE
  public.lessons,
  public.lesson_versions,
  public.lesson_sections,
  public.lesson_sources,
  public.lesson_section_sources
FROM PUBLIC, anon;
GRANT SELECT ON TABLE
  public.lessons,
  public.lesson_versions,
  public.lesson_sections,
  public.lesson_sources,
  public.lesson_section_sources
TO authenticated, service_role;
GRANT ALL ON TABLE
  public.lessons,
  public.lesson_versions,
  public.lesson_sections,
  public.lesson_sources,
  public.lesson_section_sources
TO service_role;

COMMIT;
