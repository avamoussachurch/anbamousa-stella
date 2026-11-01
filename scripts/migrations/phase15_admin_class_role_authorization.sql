-- Phase 15: authorize existing class management RPCs from assigned roles.
-- Apply after phase14_admin_action_audit.sql.
BEGIN;

CREATE OR REPLACE FUNCTION public.enroll_student_in_class(
  p_student_id UUID,
  p_class_instance_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN := false;
  v_is_teacher BOOLEAN := false;
  v_active_year_id TEXT;
  v_inst_year_id TEXT;
  v_class_group_id TEXT;
  v_student_grade TEXT;
  v_student_has_role BOOLEAN := false;
  v_is_authorized BOOLEAN := false;
  v_compatible BOOLEAN := false;
  v_existing_id TEXT;
  v_existing_status TEXT;
  v_mem_id TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated: Sign-in required.';
  END IF;

  SELECT
    pg_catalog.bool_or(ra.role = 'admin'),
    pg_catalog.bool_or(ra.role = 'teacher')
  INTO v_is_admin, v_is_teacher
  FROM public.profile_role_assignments AS ra
  WHERE ra.user_id = v_caller_id AND ra.revoked_at IS NULL;
  v_is_admin := COALESCE(v_is_admin, false);
  v_is_teacher := COALESCE(v_is_teacher, false);
  IF NOT v_is_admin AND NOT v_is_teacher THEN
    RAISE EXCEPTION 'Unauthorized: Only assigned servants or administrators can manually enroll students.';
  END IF;

  SELECT cy.id INTO v_active_year_id
  FROM public.church_years AS cy WHERE cy.is_active = true;
  IF v_active_year_id IS NULL THEN
    RAISE EXCEPTION 'No active church year configured.';
  END IF;

  SELECT ci.church_year_id, ci.class_group_id
  INTO v_inst_year_id, v_class_group_id
  FROM public.class_instances AS ci WHERE ci.id = p_class_instance_id;
  IF v_inst_year_id IS NULL OR v_inst_year_id <> v_active_year_id THEN
    RAISE EXCEPTION 'Invalid class instance: must belong to the active church year %.', v_active_year_id;
  END IF;

  IF v_is_admin THEN
    v_is_authorized := true;
  ELSIF v_is_teacher AND EXISTS (
    SELECT 1 FROM public.servant_class_assignments AS sca
    WHERE sca.servant_id = v_caller_id
      AND sca.class_instance_id = p_class_instance_id
      AND sca.is_active = true
      AND sca.church_year_id = v_active_year_id
  ) THEN
    v_is_authorized := true;
  END IF;
  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Unauthorized: Servant is not assigned to this class instance in the active church year.';
  END IF;

  SELECT p.grade INTO v_student_grade
  FROM public.profiles AS p WHERE p.id = p_student_id;
  SELECT EXISTS (
    SELECT 1 FROM public.profile_role_assignments AS ra
    WHERE ra.user_id = p_student_id
      AND ra.role = 'student'
      AND ra.revoked_at IS NULL
  ) INTO v_student_has_role;
  IF v_student_grade IS NULL OR NOT v_student_has_role THEN
    RAISE EXCEPTION 'Target user does not exist or does not hold the student role.';
  END IF;

  IF (v_class_group_id = 'angels' AND v_student_grade IN ('KG1', 'KG2')) OR
     (v_class_group_id = 'primary_1' AND v_student_grade IN ('Grade 1', 'Grade 2', 'Grade 3')) OR
     (v_class_group_id = 'primary_2' AND v_student_grade IN ('Grade 4', 'Grade 5', 'Grade 6')) OR
     (v_class_group_id = 'preparatory' AND v_student_grade IN ('Prep 1', 'Prep 2', 'Prep 3')) OR
     (v_class_group_id = 'secondary' AND v_student_grade IN ('Secondary 1', 'Secondary 2', 'Secondary 3')) OR
     (v_class_group_id = 'university' AND v_student_grade IN ('University', 'Youth')) THEN
    v_compatible := true;
  END IF;
  IF NOT v_compatible THEN
    RAISE EXCEPTION 'Grade Incompatibility: Student grade % is not compatible with class group %.', v_student_grade, v_class_group_id;
  END IF;

  SELECT cm.id, cm.status INTO v_existing_id, v_existing_status
  FROM public.class_memberships AS cm
  WHERE cm.church_year_id = v_active_year_id AND cm.student_id = p_student_id;
  IF v_existing_id IS NOT NULL THEN
    IF v_existing_status = 'active' THEN
      RAISE EXCEPTION 'Student already has an active class membership in this church year.';
    END IF;
    UPDATE public.class_memberships
    SET status = 'active',
        class_instance_id = p_class_instance_id,
        exact_grade = v_student_grade,
        joined_at = pg_catalog.timezone('utc'::text, pg_catalog.now()),
        left_at = NULL,
        removal_reason = NULL,
        enrolled_by = v_caller_id
    WHERE id = v_existing_id;
    RETURN pg_catalog.jsonb_build_object(
      'success', true, 'action', 'reactivated',
      'membershipId', v_existing_id, 'classInstanceId', p_class_instance_id
    );
  END IF;

  v_mem_id := 'mem_' || pg_catalog.substr(p_student_id::text, 1, 8) || '_' || v_active_year_id;
  INSERT INTO public.class_memberships (
    id, church_year_id, class_instance_id, student_id, exact_grade, status, enrolled_by
  ) VALUES (
    v_mem_id, v_active_year_id, p_class_instance_id, p_student_id, v_student_grade, 'active', v_caller_id
  );
  RETURN pg_catalog.jsonb_build_object(
    'success', true, 'action', 'enrolled',
    'membershipId', v_mem_id, 'classInstanceId', p_class_instance_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_student_from_class(
  p_membership_id TEXT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN := false;
  v_is_teacher BOOLEAN := false;
  v_active_year_id TEXT;
  v_mem_year_id TEXT;
  v_mem_instance_id TEXT;
  v_mem_status TEXT;
  v_is_authorized BOOLEAN := false;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated: Sign-in required.';
  END IF;

  SELECT
    pg_catalog.bool_or(ra.role = 'admin'),
    pg_catalog.bool_or(ra.role = 'teacher')
  INTO v_is_admin, v_is_teacher
  FROM public.profile_role_assignments AS ra
  WHERE ra.user_id = v_caller_id AND ra.revoked_at IS NULL;
  v_is_admin := COALESCE(v_is_admin, false);
  v_is_teacher := COALESCE(v_is_teacher, false);
  IF NOT v_is_admin AND NOT v_is_teacher THEN
    RAISE EXCEPTION 'Unauthorized: Only assigned servants or administrators can remove a student.';
  END IF;

  SELECT cy.id INTO v_active_year_id
  FROM public.church_years AS cy WHERE cy.is_active = true;
  IF v_active_year_id IS NULL THEN
    RAISE EXCEPTION 'No active church year configured.';
  END IF;

  SELECT cm.church_year_id, cm.class_instance_id, cm.status
  INTO v_mem_year_id, v_mem_instance_id, v_mem_status
  FROM public.class_memberships AS cm
  WHERE cm.id = p_membership_id
  FOR UPDATE;
  IF v_mem_instance_id IS NULL THEN
    RAISE EXCEPTION 'Membership not found.';
  END IF;
  IF v_mem_year_id <> v_active_year_id THEN
    RAISE EXCEPTION 'Invalid Operation: Historical or archived memberships cannot be modified.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.class_instances AS ci
    WHERE ci.id = v_mem_instance_id AND ci.church_year_id = v_active_year_id
  ) THEN
    RAISE EXCEPTION 'Data Integrity Violation: Target class instance does not belong to the active church year.';
  END IF;

  IF v_is_admin THEN
    v_is_authorized := true;
  ELSIF v_is_teacher AND EXISTS (
    SELECT 1 FROM public.servant_class_assignments AS sca
    WHERE sca.servant_id = v_caller_id
      AND sca.class_instance_id = v_mem_instance_id
      AND sca.church_year_id = v_active_year_id
      AND sca.is_active = true
  ) THEN
    v_is_authorized := true;
  END IF;
  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Unauthorized: Servant is not assigned to this class instance in the active church year.';
  END IF;
  IF v_mem_status = 'inactive' THEN
    RAISE EXCEPTION 'Student membership is already inactive.';
  END IF;

  UPDATE public.class_memberships
  SET status = 'inactive',
      left_at = pg_catalog.timezone('utc'::text, pg_catalog.now()),
      removal_reason = pg_catalog.trim(p_reason)
  WHERE id = p_membership_id;
  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'membershipId', p_membership_id,
    'status', 'inactive',
    'leftAt', pg_catalog.timezone('utc'::text, pg_catalog.now())
  );
END;
$$;

COMMIT;
