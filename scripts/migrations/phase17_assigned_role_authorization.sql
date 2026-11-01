-- Phase 17: use normalized role assignments for database authorization.
-- Apply after Phase 13 and the Phase 11 curriculum publication functions.
-- This migration changes authorization checks only; it does not alter account,
-- student, class, relationship, progress, reward, or curriculum records.
BEGIN;

DO $preflight$
DECLARE
  v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF pg_catalog.to_regclass('public.profile_role_assignments') IS NULL THEN
    v_missing := pg_catalog.array_append(v_missing, 'public.profile_role_assignments (Phase 13)');
  END IF;
  IF pg_catalog.to_regprocedure('public.has_role(text)') IS NULL THEN
    v_missing := pg_catalog.array_append(v_missing, 'public.has_role(text) (Phase 13)');
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'hymns_taxis_level'
      AND data_type = 'integer'
  ) THEN
    v_missing := pg_catalog.array_append(v_missing, 'public.profiles.hymns_taxis_level (Phase 7 or 8)');
  END IF;
  IF pg_catalog.to_regprocedure('public.activate_new_church_year(text,text,date,date)') IS NULL
     OR pg_catalog.to_regprocedure('public.join_class_by_code(text)') IS NULL
     OR pg_catalog.to_regprocedure('public.provision_verified_family_relationship(uuid,uuid,text)') IS NULL
     OR pg_catalog.to_regprocedure('public.record_lesson_completion(uuid,uuid,timestamp with time zone)') IS NULL THEN
    v_missing := pg_catalog.array_append(v_missing, 'expected church-year, class, family, or lesson authorization functions');
  END IF;
  IF pg_catalog.to_regclass('public.lesson_publication_jobs') IS NULL THEN
    v_missing := pg_catalog.array_append(v_missing, 'public.lesson_publication_jobs (Phase 11)');
  END IF;
  IF pg_catalog.to_regclass('public.hymns') IS NULL THEN
    v_missing := pg_catalog.array_append(v_missing, 'public.hymns (scripts/migrations/phase17_curriculum_table_prerequisites.sql)');
  END IF;
  IF pg_catalog.to_regclass('public.coptic_taxis_items') IS NULL THEN
    v_missing := pg_catalog.array_append(v_missing, 'public.coptic_taxis_items (scripts/migrations/phase17_curriculum_table_prerequisites.sql)');
  END IF;
  IF pg_catalog.to_regclass('public.hymns') IS NOT NULL
     AND (
       NOT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'hymns' AND column_name = 'level' AND data_type = 'integer'
       )
       OR NOT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'hymns' AND column_name = 'status'
       )
     ) THEN
    v_missing := pg_catalog.array_append(v_missing, 'required public.hymns columns (inspect before applying the curriculum prerequisite script)');
  END IF;
  IF pg_catalog.to_regclass('public.coptic_taxis_items') IS NOT NULL
     AND (
       NOT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'coptic_taxis_items' AND column_name = 'level' AND data_type = 'integer'
       )
       OR NOT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'coptic_taxis_items' AND column_name = 'status'
       )
       OR NOT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'coptic_taxis_items' AND column_name = 'target_audience'
       )
     ) THEN
    v_missing := pg_catalog.array_append(v_missing, 'required public.coptic_taxis_items columns (inspect before applying the curriculum prerequisite script)');
  END IF;
  IF pg_catalog.to_regprocedure('public.publish_lesson_version_immediately(uuid,uuid,uuid)') IS NULL
     OR pg_catalog.to_regprocedure('public.schedule_lesson_publication(uuid,uuid,timestamp with time zone)') IS NULL
     OR pg_catalog.to_regprocedure('public.reschedule_lesson_publication(uuid,timestamp with time zone)') IS NULL
     OR pg_catalog.to_regprocedure('public.cancel_lesson_publication(uuid)') IS NULL
     OR pg_catalog.to_regprocedure('public.list_lesson_publications()') IS NULL
     OR pg_catalog.to_regprocedure('public.process_due_lesson_publications()') IS NULL THEN
    v_missing := pg_catalog.array_append(v_missing, 'Phase 11 scheduled-publication functions');
  END IF;
  IF pg_catalog.cardinality(v_missing) > 0 THEN
    RAISE EXCEPTION
      'Phase 17 prerequisites are missing: %. Inspect first and apply only the missing prerequisite migrations.',
      pg_catalog.array_to_string(v_missing, ', ');
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.is_church_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT public.has_role('admin');
$$;

CREATE OR REPLACE FUNCTION public.is_church_servant_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT public.has_role('teacher') OR public.has_role('admin');
$$;

CREATE OR REPLACE FUNCTION public.get_current_student_level()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT COALESCE(
    (
      SELECT 3
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND (
          public.has_role('teacher')
          OR public.has_role('admin')
          OR p.grade ILIKE '%deacon%'
          OR p.grade ILIKE '%servant%'
        )
    ),
    (
      SELECT 2
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND (p.grade ILIKE '%prep%' OR p.grade ILIKE '%secondary%' OR p.grade ILIKE '%uni%')
    ),
    1
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_student_data(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT p_student_id = auth.uid()
    OR public.is_church_admin()
    OR EXISTS (
      SELECT 1
      FROM public.user_relationships AS ur
      WHERE ur.parent_id = auth.uid()
        AND ur.child_id = p_student_id
        AND ur.relationship_type IN ('parent_child', 'guardian_student')
        AND ur.verified_at IS NOT NULL
    )
    OR (
      public.has_role('teacher')
      AND EXISTS (
        SELECT 1
        FROM public.class_memberships AS cm
        JOIN public.servant_class_assignments AS sca
          ON sca.class_instance_id = cm.class_instance_id
         AND sca.church_year_id = cm.church_year_id
         AND sca.servant_id = auth.uid()
         AND sca.is_active = true
        JOIN public.church_years AS cy
          ON cy.id = cm.church_year_id
         AND cy.is_active = true
        WHERE cm.student_id = p_student_id
          AND cm.status = 'active'
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_read_profile(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT p_profile_id = auth.uid()
    OR public.is_church_admin()
    OR EXISTS (
      SELECT 1
      FROM public.user_relationships AS ur
      WHERE ur.parent_id = auth.uid()
        AND ur.child_id = p_profile_id
        AND ur.relationship_type IN ('parent_child', 'guardian_student')
        AND ur.verified_at IS NOT NULL
    )
    OR (
      public.has_role('teacher')
      AND EXISTS (
        SELECT 1
        FROM public.class_memberships AS cm
        JOIN public.servant_class_assignments AS sca
          ON sca.class_instance_id = cm.class_instance_id
         AND sca.church_year_id = cm.church_year_id
         AND sca.servant_id = auth.uid()
         AND sca.is_active = true
        JOIN public.church_years AS cy
          ON cy.id = cm.church_year_id
         AND cy.is_active = true
        JOIN public.profile_role_assignments AS student_role
          ON student_role.user_id = cm.student_id
         AND student_role.role = 'student'
         AND student_role.revoked_at IS NULL
        WHERE cm.student_id = p_profile_id
          AND cm.status = 'active'
      )
    );
$$;

DO $function_authorization$
DECLARE
  v_definition TEXT;
  v_original TEXT;
BEGIN
  SELECT pg_catalog.pg_get_functiondef(
    'public.activate_new_church_year(text,text,date,date)'::pg_catalog.regprocedure
  ) INTO v_definition;
  v_original := v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    'SELECT[[:space:]]+role[[:space:]]+INTO[[:space:]]+v_caller_role[[:space:]]+FROM[[:space:]]+public\.profiles[[:space:]]+WHERE[[:space:]]+id[[:space:]]*=[[:space:]]*v_caller_id;',
    'SELECT CASE WHEN public.has_role(''admin'') THEN ''admin'' ELSE NULL END INTO v_caller_role;',
    'g'
  );
  IF v_definition = v_original THEN
    IF pg_catalog.strpos(v_original, 'public.has_role(''admin'')') = 0 THEN
      RAISE EXCEPTION 'Phase 17 could not identify the church-year administrator role check.';
    END IF;
  ELSE
    EXECUTE v_definition;
  END IF;

  SELECT pg_catalog.pg_get_functiondef(
    'public.join_class_by_code(text)'::pg_catalog.regprocedure
  ) INTO v_definition;
  v_original := v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    'SELECT[[:space:]]+role,[[:space:]]*grade[[:space:]]+INTO[[:space:]]+v_student_role,[[:space:]]*v_student_grade[[:space:]]+FROM[[:space:]]+public\.profiles[[:space:]]+WHERE[[:space:]]+id[[:space:]]*=[[:space:]]*v_student_id;',
    'SELECT CASE WHEN public.has_role(''student'') THEN ''student'' ELSE NULL END, grade INTO v_student_role, v_student_grade FROM public.profiles WHERE id = v_student_id;',
    'g'
  );
  IF v_definition = v_original THEN
    IF pg_catalog.strpos(v_original, 'public.has_role(''student'')') = 0 THEN
      RAISE EXCEPTION 'Phase 17 could not identify the class-join student role check.';
    END IF;
  ELSE
    EXECUTE v_definition;
  END IF;

  SELECT pg_catalog.pg_get_functiondef(
    'public.provision_verified_family_relationship(uuid,uuid,text)'::pg_catalog.regprocedure
  ) INTO v_definition;
  v_original := v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    'SELECT[[:space:]]+role[[:space:]]+INTO[[:space:]]+v_parent_role[[:space:]]+FROM[[:space:]]+public\.profiles[[:space:]]+WHERE[[:space:]]+id[[:space:]]*=[[:space:]]*p_parent_id;',
    'SELECT CASE WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = p_parent_id AND ra.role = ''parent'' AND ra.revoked_at IS NULL) THEN ''parent'' ELSE NULL END INTO v_parent_role;',
    'g'
  );
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    'SELECT[[:space:]]+role[[:space:]]+INTO[[:space:]]+v_child_role[[:space:]]+FROM[[:space:]]+public\.profiles[[:space:]]+WHERE[[:space:]]+id[[:space:]]*=[[:space:]]*p_child_id;',
    'SELECT CASE WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = p_child_id AND ra.role = ''student'' AND ra.revoked_at IS NULL) THEN ''student'' ELSE NULL END INTO v_child_role;',
    'g'
  );
  IF v_definition = v_original THEN
    IF pg_catalog.strpos(v_original, 'profile_role_assignments') = 0 THEN
      RAISE EXCEPTION 'Phase 17 could not identify the family relationship role checks.';
    END IF;
  ELSE
    EXECUTE v_definition;
  END IF;

  SELECT pg_catalog.pg_get_functiondef(
    'public.record_lesson_completion(uuid,uuid,timestamp with time zone)'::pg_catalog.regprocedure
  ) INTO v_definition;
  v_original := v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    'FROM[[:space:]]+public\.profiles[[:space:]]+WHERE[[:space:]]+id[[:space:]]*=[[:space:]]*p_student_id[[:space:]]+AND[[:space:]]+role[[:space:]]*=[[:space:]]*''student''',
    'FROM public.profile_role_assignments AS assigned_role WHERE assigned_role.user_id = p_student_id AND assigned_role.role = ''student'' AND assigned_role.revoked_at IS NULL',
    'g'
  );
  IF v_definition = v_original THEN
    IF pg_catalog.strpos(v_original, 'profile_role_assignments') = 0 THEN
      RAISE EXCEPTION 'Phase 17 could not identify the lesson-completion student role check.';
    END IF;
  ELSE
    EXECUTE v_definition;
  END IF;
END;
$function_authorization$;

DROP POLICY IF EXISTS "class_instances_authorized_select" ON public.class_instances;
CREATE POLICY "class_instances_authorized_select" ON public.class_instances
  FOR SELECT TO authenticated
  USING (
    (
      public.has_role('teacher')
      AND EXISTS (
      SELECT 1
      FROM public.servant_class_assignments AS sca
      JOIN public.church_years AS cy ON cy.id = sca.church_year_id
      WHERE sca.servant_id = auth.uid()
        AND sca.class_instance_id = public.class_instances.id
        AND sca.is_active = true
        AND cy.is_active = true
      )
    )
    OR public.has_role('admin')
  );

DROP POLICY IF EXISTS "servant_assignments_select" ON public.servant_class_assignments;
CREATE POLICY "servant_assignments_select" ON public.servant_class_assignments
  FOR SELECT TO authenticated
  USING (servant_id = auth.uid() OR public.has_role('admin'));

DROP POLICY IF EXISTS "servant_assignments_admin_manage" ON public.servant_class_assignments;
CREATE POLICY "servant_assignments_admin_manage" ON public.servant_class_assignments
  FOR ALL TO authenticated
  USING (public.has_role('admin'))
  WITH CHECK (
    public.has_role('admin')
    AND (
      EXISTS (
        SELECT 1
        FROM public.profile_role_assignments AS assigned_role
        WHERE assigned_role.user_id = servant_id
          AND assigned_role.role IN ('teacher', 'admin')
          AND assigned_role.revoked_at IS NULL
      )
    )
  );

DROP POLICY IF EXISTS "memberships_select" ON public.class_memberships;
CREATE POLICY "memberships_select" ON public.class_memberships
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR (
      public.has_role('teacher')
      AND EXISTS (
      SELECT 1
      FROM public.servant_class_assignments AS sca
      JOIN public.church_years AS cy ON cy.id = sca.church_year_id
      WHERE sca.servant_id = auth.uid()
        AND sca.class_instance_id = public.class_memberships.class_instance_id
        AND sca.is_active = true
        AND cy.is_active = true
      )
    )
    OR public.has_role('admin')
  );

DROP POLICY IF EXISTS "reward_requests_insert_student_pending" ON public.reward_requests;
CREATE POLICY "reward_requests_insert_student_pending"
  ON public.reward_requests FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND status = 'pending'
    AND cost_points > 0
    AND public.has_role('student')
    AND (
      parent_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.user_relationships AS ur
        WHERE ur.parent_id = reward_requests.parent_id
          AND ur.child_id = reward_requests.student_id
          AND ur.relationship_type IN ('parent_child', 'guardian_student')
          AND ur.verified_at IS NOT NULL
      )
    )
  );

DROP POLICY IF EXISTS "hymns_memberships_select_student" ON public.hymns_memberships;
CREATE POLICY "hymns_memberships_select_student"
  ON public.hymns_memberships FOR SELECT TO authenticated
  USING (student_id = auth.uid()::TEXT AND public.has_role('student'));

DROP POLICY IF EXISTS "hymns_memberships_insert_student_pending" ON public.hymns_memberships;
CREATE POLICY "hymns_memberships_insert_student_pending"
  ON public.hymns_memberships FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()::TEXT
    AND status = 'pending'
    AND public.has_role('student')
  );

DROP POLICY IF EXISTS hymns_select_assigned_level ON public.hymns;
DROP POLICY IF EXISTS "Servants read all hymns" ON public.hymns;
DROP POLICY IF EXISTS "Authors read own hymn drafts" ON public.hymns;
DROP POLICY IF EXISTS "Public read level 1 hymns" ON public.hymns;
DROP POLICY IF EXISTS "Students read approved level hymns" ON public.hymns;
CREATE POLICY hymns_select_assigned_level
  ON public.hymns FOR SELECT TO authenticated
  USING (
    (
      status = 'published'
      AND public.has_role('student')
      AND EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = auth.uid()
          AND p.hymns_taxis_level = public.hymns.level
      )
    )
    OR public.has_role('teacher')
    OR public.has_role('admin')
  );

DROP POLICY IF EXISTS taxis_items_select_assigned_level ON public.coptic_taxis_items;
DROP POLICY IF EXISTS "Anyone authenticated can view published taxis rituals" ON public.coptic_taxis_items;
DROP POLICY IF EXISTS "Servants and Admins can view draft and in-review taxis rituals" ON public.coptic_taxis_items;
DROP POLICY IF EXISTS "Servants and Admins can manage taxis items" ON public.coptic_taxis_items;
CREATE POLICY taxis_items_select_assigned_level
  ON public.coptic_taxis_items FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND level IS NOT NULL
    AND public.has_role('student')
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND p.hymns_taxis_level = public.coptic_taxis_items.level
        AND (
          public.coptic_taxis_items.target_audience IN ('ALL', 'CONGREGATION')
          OR (
            public.coptic_taxis_items.target_audience = 'DEACONS'
            AND p.hymns_taxis_level >= 2
          )
        )
    )
  );

DROP POLICY IF EXISTS "Servants and Admins can view draft and in-review taxis rituals" ON public.coptic_taxis_items;
CREATE POLICY "Servants and Admins can view draft and in-review taxis rituals"
  ON public.coptic_taxis_items FOR SELECT TO authenticated
  USING (public.is_church_servant_or_admin());

DO $quiz_policy$
BEGIN
  IF pg_catalog.to_regclass('public.quiz_attempts') IS NOT NULL THEN
    DROP POLICY IF EXISTS quiz_attempts_select_policy ON public.quiz_attempts;
    CREATE POLICY quiz_attempts_select_policy
      ON public.quiz_attempts FOR SELECT TO authenticated
      USING (
        student_id = auth.uid()::TEXT
        OR public.has_role('admin')
        OR (
          public.has_role('teacher')
          AND EXISTS (
          SELECT 1
          FROM public.class_memberships AS cm
          JOIN public.servant_class_assignments AS sca
            ON sca.class_instance_id = cm.class_instance_id
           AND sca.church_year_id = cm.church_year_id
          JOIN public.church_years AS cy ON cy.id = sca.church_year_id
          WHERE cm.student_id::TEXT = public.quiz_attempts.student_id
            AND sca.servant_id = auth.uid()
            AND sca.is_active = true
            AND cy.is_active = true
            AND cm.status = 'active'
          )
        )
      );
  END IF;
END;
$quiz_policy$;

DO $scheduled_publication_authorization$
DECLARE
  v_patch RECORD;
  v_definition TEXT;
  v_original TEXT;
BEGIN
  FOR v_patch IN
    SELECT *
    FROM (VALUES
      (
        'public.publish_lesson_version_immediately(uuid,uuid,uuid)',
        'SELECT[[:space:]]+p\.role[[:space:]]+INTO[[:space:]]+v_role[[:space:]]+FROM[[:space:]]+public\.profiles[[:space:]]+AS[[:space:]]+p[[:space:]]+WHERE[[:space:]]+p\.id[[:space:]]*=[[:space:]]*p_actor_id;',
        'SELECT CASE WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = p_actor_id AND ra.role = ''admin'' AND ra.revoked_at IS NULL) THEN ''admin'' WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = p_actor_id AND ra.role = ''teacher'' AND ra.revoked_at IS NULL) THEN ''teacher'' ELSE NULL END INTO v_role;',
        'immediate-publish'
      ),
      (
        'public.schedule_lesson_publication(uuid,uuid,timestamp with time zone)',
        'SELECT[[:space:]]+p\.role[[:space:]]+INTO[[:space:]]+v_role[[:space:]]+FROM[[:space:]]+public\.profiles[[:space:]]+AS[[:space:]]+p[[:space:]]+WHERE[[:space:]]+p\.id[[:space:]]*=[[:space:]]*v_actor;',
        'SELECT CASE WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = v_actor AND ra.role = ''admin'' AND ra.revoked_at IS NULL) THEN ''admin'' WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = v_actor AND ra.role = ''teacher'' AND ra.revoked_at IS NULL) THEN ''teacher'' ELSE NULL END INTO v_role;',
        'schedule'
      ),
      (
        'public.reschedule_lesson_publication(uuid,timestamp with time zone)',
        'SELECT[[:space:]]+p\.role[[:space:]]+INTO[[:space:]]+v_role[[:space:]]+FROM[[:space:]]+public\.profiles[[:space:]]+AS[[:space:]]+p[[:space:]]+WHERE[[:space:]]+p\.id[[:space:]]*=[[:space:]]*v_actor;',
        'SELECT CASE WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = v_actor AND ra.role = ''admin'' AND ra.revoked_at IS NULL) THEN ''admin'' WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = v_actor AND ra.role = ''teacher'' AND ra.revoked_at IS NULL) THEN ''teacher'' ELSE NULL END INTO v_role;',
        'reschedule'
      ),
      (
        'public.cancel_lesson_publication(uuid)',
        'SELECT[[:space:]]+p\.role[[:space:]]+INTO[[:space:]]+v_role[[:space:]]+FROM[[:space:]]+public\.profiles[[:space:]]+AS[[:space:]]+p[[:space:]]+WHERE[[:space:]]+p\.id[[:space:]]*=[[:space:]]*v_actor;',
        'SELECT CASE WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = v_actor AND ra.role = ''admin'' AND ra.revoked_at IS NULL) THEN ''admin'' WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = v_actor AND ra.role = ''teacher'' AND ra.revoked_at IS NULL) THEN ''teacher'' ELSE NULL END INTO v_role;',
        'cancel'
      ),
      (
        'public.list_lesson_publications()',
        'SELECT[[:space:]]+p\.role[[:space:]]+INTO[[:space:]]+v_role[[:space:]]+FROM[[:space:]]+public\.profiles[[:space:]]+AS[[:space:]]+p[[:space:]]+WHERE[[:space:]]+p\.id[[:space:]]*=[[:space:]]*v_actor;',
        'SELECT CASE WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = v_actor AND ra.role = ''admin'' AND ra.revoked_at IS NULL) THEN ''admin'' WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = v_actor AND ra.role = ''teacher'' AND ra.revoked_at IS NULL) THEN ''teacher'' ELSE NULL END INTO v_role;',
        'list'
      ),
      (
        'public.process_due_lesson_publications()',
        'SELECT[[:space:]]+p\.role[[:space:]]+INTO[[:space:]]+v_scheduler_role[[:space:]]+FROM[[:space:]]+public\.profiles[[:space:]]+AS[[:space:]]+p[[:space:]]+WHERE[[:space:]]+p\.id[[:space:]]*=[[:space:]]*v_job\.scheduled_by;',
        'SELECT CASE WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = v_job.scheduled_by AND ra.role = ''admin'' AND ra.revoked_at IS NULL) THEN ''admin'' WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = v_job.scheduled_by AND ra.role = ''teacher'' AND ra.revoked_at IS NULL) THEN ''teacher'' ELSE NULL END INTO v_scheduler_role;',
        'due-publication'
      )
    ) AS patches(signature, pattern, replacement, label)
  LOOP
    SELECT pg_catalog.pg_get_functiondef(v_patch.signature::pg_catalog.regprocedure)
      INTO v_definition;
    v_original := v_definition;
    v_definition := pg_catalog.regexp_replace(
      v_definition,
      v_patch.pattern,
      v_patch.replacement,
      'g'
    );
    IF v_definition = v_original THEN
      IF pg_catalog.strpos(v_original, 'profile_role_assignments') = 0 THEN
        RAISE EXCEPTION 'Phase 17 could not identify the scheduled-publication role check for %.', v_patch.label;
      END IF;
    ELSE
      EXECUTE v_definition;
    END IF;
  END LOOP;
END;
$scheduled_publication_authorization$;

COMMIT;
