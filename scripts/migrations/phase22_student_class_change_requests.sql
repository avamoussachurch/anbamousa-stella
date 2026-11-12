-- Phase 22: Persist student activation and class/grade-change requests.
-- Requests are visible to the student and to servants assigned to the requested class.
-- Approval updates the authoritative class_memberships row and profile grade atomically.

CREATE TABLE IF NOT EXISTS public.student_class_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  church_year_id text NOT NULL REFERENCES public.church_years(id),
  requested_class_group_id text NOT NULL CHECK (
    requested_class_group_id IN ('angels', 'primary_1', 'primary_2', 'preparatory', 'secondary', 'university')
  ),
  requested_grade text NOT NULL,
  student_name text NOT NULL,
  contact_email text,
  contact_phone text,
  notes text,
  status text NOT NULL DEFAULT 'PENDING_APPROVAL'
    CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  assigned_grade text,
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  review_notes text
);

CREATE UNIQUE INDEX IF NOT EXISTS student_class_change_one_pending_per_year
  ON public.student_class_change_requests (student_id, church_year_id)
  WHERE status = 'PENDING_APPROVAL';

CREATE INDEX IF NOT EXISTS student_class_change_teacher_queue
  ON public.student_class_change_requests (church_year_id, requested_class_group_id, status, requested_at DESC);

ALTER TABLE public.student_class_change_requests ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.student_class_change_requests TO authenticated;
GRANT ALL ON public.student_class_change_requests TO service_role;

DROP POLICY IF EXISTS student_class_change_requests_select_authorized
  ON public.student_class_change_requests;
CREATE POLICY student_class_change_requests_select_authorized
  ON public.student_class_change_requests
  FOR SELECT TO authenticated
  USING (
    (student_id = (SELECT auth.uid()) AND public.has_role('student'))
    OR public.has_role('admin')
    OR (
      public.has_role('teacher')
      AND EXISTS (
        SELECT 1
        FROM public.servant_class_assignments sca
        JOIN public.class_instances ci
          ON ci.id = sca.class_instance_id
         AND ci.church_year_id = sca.church_year_id
        JOIN public.church_years cy
          ON cy.id = sca.church_year_id
        WHERE sca.servant_id = (SELECT auth.uid())
          AND sca.church_year_id = student_class_change_requests.church_year_id
          AND ci.class_group_id = student_class_change_requests.requested_class_group_id
          AND sca.is_active = true
          AND cy.is_active = true
      )
    )
  );

DROP POLICY IF EXISTS student_class_change_requests_insert_self
  ON public.student_class_change_requests;
CREATE POLICY student_class_change_requests_insert_self
  ON public.student_class_change_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND public.has_role('student')
    AND status = 'PENDING_APPROVAL'
    AND EXISTS (
      SELECT 1 FROM public.church_years cy
      WHERE cy.id = church_year_id AND cy.is_active = true
    )
    AND public.curriculum_grade_class_group(requested_grade) = requested_class_group_id
  );

DROP POLICY IF EXISTS student_class_change_requests_update_own_pending
  ON public.student_class_change_requests;
CREATE POLICY student_class_change_requests_update_own_pending
  ON public.student_class_change_requests
  FOR UPDATE TO authenticated
  USING (
    student_id = (SELECT auth.uid())
    AND public.has_role('student')
    AND status = 'PENDING_APPROVAL'
  )
  WITH CHECK (
    student_id = (SELECT auth.uid())
    AND public.has_role('student')
    AND status = 'PENDING_APPROVAL'
    AND public.curriculum_grade_class_group(requested_grade) = requested_class_group_id
  );

CREATE OR REPLACE FUNCTION public.review_student_class_change_request(
  p_request_id uuid,
  p_action text,
  p_assigned_grade text DEFAULT NULL,
  p_review_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_request public.student_class_change_requests%ROWTYPE;
  v_active_year_id text;
  v_class_instance_id text;
  v_grade text;
  v_grade_group text;
  v_membership_id text;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated: sign in before reviewing a class request.';
  END IF;

  IF p_action NOT IN ('APPROVE', 'REJECT') THEN
    RAISE EXCEPTION 'Invalid action. Use APPROVE or REJECT.';
  END IF;

  SELECT * INTO v_request
  FROM public.student_class_change_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Class change request not found.';
  END IF;

  IF v_request.status <> 'PENDING_APPROVAL' THEN
    RAISE EXCEPTION 'This class change request has already been reviewed.';
  END IF;

  SELECT cy.id INTO v_active_year_id
  FROM public.church_years cy
  WHERE cy.is_active = true;

  IF v_active_year_id IS NULL OR v_request.church_year_id <> v_active_year_id THEN
    RAISE EXCEPTION 'This request does not belong to the active church year.';
  END IF;

  SELECT ci.id INTO v_class_instance_id
  FROM public.class_instances ci
  WHERE ci.church_year_id = v_active_year_id
    AND ci.class_group_id = v_request.requested_class_group_id
  LIMIT 1;

  IF v_class_instance_id IS NULL THEN
    RAISE EXCEPTION 'The requested class does not exist in the active church year.';
  END IF;

  IF NOT public.has_role('admin') THEN
    IF NOT public.has_role('teacher') OR NOT EXISTS (
      SELECT 1
      FROM public.servant_class_assignments sca
      WHERE sca.servant_id = v_caller_id
        AND sca.class_instance_id = v_class_instance_id
        AND sca.church_year_id = v_active_year_id
        AND sca.is_active = true
    ) THEN
      RAISE EXCEPTION 'You are not assigned to the requested class.';
    END IF;
  END IF;

  IF p_action = 'REJECT' THEN
    UPDATE public.student_class_change_requests
    SET status = 'REJECTED',
        reviewed_by = v_caller_id,
        reviewed_at = pg_catalog.now(),
        review_notes = NULLIF(pg_catalog.btrim(COALESCE(p_review_notes, '')), '')
    WHERE id = p_request_id;

    RETURN pg_catalog.jsonb_build_object(
      'success', true,
      'requestId', p_request_id,
      'status', 'REJECTED'
    );
  END IF;

  v_grade := COALESCE(NULLIF(pg_catalog.btrim(COALESCE(p_assigned_grade, '')), ''), v_request.requested_grade);
  v_grade_group := public.curriculum_grade_class_group(v_grade);
  IF v_grade_group IS DISTINCT FROM v_request.requested_class_group_id THEN
    RAISE EXCEPTION 'Assigned grade does not match the requested class group.';
  END IF;

  SELECT cm.id INTO v_membership_id
  FROM public.class_memberships cm
  WHERE cm.church_year_id = v_active_year_id
    AND cm.student_id = v_request.student_id
  FOR UPDATE;

  IF v_membership_id IS NULL THEN
    v_membership_id := 'mem_' || pg_catalog.substr(v_request.student_id::text, 1, 8) || '_' || v_active_year_id;
    INSERT INTO public.class_memberships (
      id, church_year_id, class_instance_id, student_id, exact_grade, status, enrolled_by
    ) VALUES (
      v_membership_id, v_active_year_id, v_class_instance_id, v_request.student_id,
      v_grade, 'active', v_caller_id
    );
  ELSE
    UPDATE public.class_memberships
    SET class_instance_id = v_class_instance_id,
        exact_grade = v_grade,
        status = 'active',
        joined_at = pg_catalog.now(),
        left_at = NULL,
        removal_reason = NULL,
        enrolled_by = v_caller_id
    WHERE id = v_membership_id;
  END IF;

  UPDATE public.profiles
  SET grade = v_grade
  WHERE id = v_request.student_id;

  UPDATE public.student_class_change_requests
  SET status = 'APPROVED',
      assigned_grade = v_grade,
      reviewed_by = v_caller_id,
      reviewed_at = pg_catalog.now(),
      review_notes = NULLIF(pg_catalog.btrim(COALESCE(p_review_notes, '')), '')
  WHERE id = p_request_id;

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'requestId', p_request_id,
    'status', 'APPROVED',
    'assignedGrade', v_grade,
    'membershipId', v_membership_id,
    'classInstanceId', v_class_instance_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.review_student_class_change_request(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_student_class_change_request(uuid, text, text, text) TO authenticated;
