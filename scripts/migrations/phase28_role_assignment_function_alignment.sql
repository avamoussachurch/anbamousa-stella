-- Phase 28: remove remaining authorization dependence on the legacy single-role profiles.role field.

CREATE OR REPLACE FUNCTION public.can_access_student_data(p_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
  SELECT p_student_id = (SELECT auth.uid())
    OR public.is_church_admin()
    OR EXISTS (
      SELECT 1
      FROM public.user_relationships AS ur
      WHERE ur.parent_id = (SELECT auth.uid())
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
         AND sca.servant_id = (SELECT auth.uid())
         AND sca.is_active = true
        JOIN public.church_years AS cy
          ON cy.id = cm.church_year_id
         AND cy.is_active = true
        WHERE cm.student_id = p_student_id
          AND cm.status = 'active'
      )
    );
$function$;

CREATE OR REPLACE FUNCTION public.can_read_profile(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
  SELECT p_profile_id = (SELECT auth.uid())
    OR public.is_church_admin()
    OR EXISTS (
      SELECT 1
      FROM public.user_relationships AS ur
      WHERE ur.parent_id = (SELECT auth.uid())
        AND ur.child_id = p_profile_id
        AND ur.relationship_type IN ('parent_child', 'guardian_student')
        AND ur.verified_at IS NOT NULL
    )
    OR (
      public.has_role('teacher')
      AND EXISTS (
        SELECT 1
        FROM public.class_memberships AS cm
        JOIN public.profile_role_assignments AS target_role
          ON target_role.user_id = cm.student_id
         AND target_role.role = 'student'
         AND target_role.revoked_at IS NULL
        JOIN public.servant_class_assignments AS sca
          ON sca.class_instance_id = cm.class_instance_id
         AND sca.church_year_id = cm.church_year_id
         AND sca.servant_id = (SELECT auth.uid())
         AND sca.is_active = true
        JOIN public.church_years AS cy
          ON cy.id = cm.church_year_id
         AND cy.is_active = true
        WHERE cm.student_id = p_profile_id
          AND cm.status = 'active'
      )
    );
$function$;

CREATE OR REPLACE FUNCTION public.get_current_student_level()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
  SELECT COALESCE(
    (
      SELECT 3
      FROM public.profiles AS p
      WHERE p.id = (SELECT auth.uid())
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
      WHERE p.id = (SELECT auth.uid())
        AND (p.grade ILIKE '%prep%' OR p.grade ILIKE '%secondary%' OR p.grade ILIKE '%uni%')
    ),
    1
  );
$function$;

CREATE OR REPLACE FUNCTION public.provision_verified_family_relationship(
  p_parent_id uuid,
  p_child_id uuid,
  p_relationship_type text DEFAULT 'parent_child'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
DECLARE
  v_relationship_id uuid;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Family relationship provisioning is restricted to the trusted server.'
      USING ERRCODE = '42501';
  END IF;

  IF p_relationship_type NOT IN ('parent_child', 'guardian_student') THEN
    RAISE EXCEPTION 'Invalid family relationship type.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profile_role_assignments
    WHERE user_id = p_parent_id AND role = 'parent' AND revoked_at IS NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM public.profile_role_assignments
    WHERE user_id = p_child_id AND role = 'student' AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'A verified relationship requires active parent and student role assignments.'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_relationships (
    parent_id, child_id, relationship_type, verified_at
  )
  VALUES (
    p_parent_id, p_child_id, p_relationship_type, pg_catalog.now()
  )
  ON CONFLICT (parent_id, child_id)
  DO UPDATE SET
    relationship_type = EXCLUDED.relationship_type,
    verified_at = EXCLUDED.verified_at
  RETURNING id INTO v_relationship_id;

  RETURN v_relationship_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_lesson_completion(
  p_student_id uuid,
  p_lesson_id uuid,
  p_completed_at timestamp with time zone
)
RETURNS TABLE(points_awarded integer, total_points integer, completed_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
DECLARE
  v_was_completed boolean;
  v_points_awarded integer := 0;
  v_total_points integer;
  v_completed_at timestamptz;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Lesson completion writes are restricted to the trusted server.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profile_role_assignments
    WHERE user_id = p_student_id
      AND role = 'student'
      AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Target profile does not hold an active student role.'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.lesson_progress (student_id, lesson_id, completed, points_earned, completed_at)
  VALUES (p_student_id, p_lesson_id, false, 0, COALESCE(p_completed_at, pg_catalog.now()))
  ON CONFLICT (student_id, lesson_id) DO NOTHING;

  SELECT lp.completed, lp.completed_at
  INTO v_was_completed, v_completed_at
  FROM public.lesson_progress AS lp
  WHERE lp.student_id = p_student_id
    AND lp.lesson_id = p_lesson_id
  FOR UPDATE;

  IF NOT COALESCE(v_was_completed, false) THEN
    v_points_awarded := 50;
    v_completed_at := COALESCE(p_completed_at, pg_catalog.now());

    UPDATE public.lesson_progress
    SET completed = true,
        points_earned = v_points_awarded,
        completed_at = v_completed_at
    WHERE student_id = p_student_id
      AND lesson_id = p_lesson_id;

    UPDATE public.profiles
    SET points = COALESCE(points, 0) + v_points_awarded,
        last_active = v_completed_at
    WHERE id = p_student_id
    RETURNING points INTO v_total_points;
  ELSE
    SELECT COALESCE(p.points, 0)
    INTO v_total_points
    FROM public.profiles AS p
    WHERE p.id = p_student_id;
  END IF;

  RETURN QUERY SELECT v_points_awarded, v_total_points, v_completed_at;
END;
$function$;
