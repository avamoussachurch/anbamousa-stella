-- Phase 26: remove anonymous RPC execution and use authoritative role assignments.

CREATE OR REPLACE FUNCTION public.activate_new_church_year(
  p_year_id text,
  p_name text,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_caller_id uuid;
  v_existing_active_id text;
  v_groups text[] := ARRAY['angels', 'primary_1', 'primary_2', 'preparatory', 'secondary', 'university'];
  v_names_en text[] := ARRAY['Angels', 'Primary 1–3', 'Primary 4–6', 'Preparatory', 'Secondary', 'University & Youth'];
  v_names_ar text[] := ARRAY['فصل الملايكة', 'فصل ابتدائي 1–3', 'فصل ابتدائي 4–6', 'فصل إعدادي', 'فصل ثانوي', 'فصل شباب جامعة'];
  v_group_id text;
  v_inst_id text;
  v_code text;
  v_created_instances int := 0;
  i int;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated: Sign-in required.';
  END IF;
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only an administrator can start a new church year.';
  END IF;

  LOCK TABLE public.church_years IN EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM public.church_years WHERE id = p_year_id) THEN
    RAISE EXCEPTION 'Conflict: Church year % already exists.', p_year_id;
  END IF;

  SELECT id INTO v_existing_active_id FROM public.church_years WHERE is_active = true;
  IF v_existing_active_id IS NOT NULL THEN
    UPDATE public.church_years
    SET is_active = false, archived_at = pg_catalog.timezone('utc'::text, pg_catalog.now())
    WHERE id = v_existing_active_id;
  END IF;

  INSERT INTO public.church_years (id, name, start_date, end_date, is_active, activated_at)
  VALUES (p_year_id, p_name, p_start_date, p_end_date, true, pg_catalog.timezone('utc'::text, pg_catalog.now()));

  FOR i IN 1..6 LOOP
    v_group_id := v_groups[i];
    v_inst_id := 'inst_' || p_year_id || '_' || v_group_id;
    LOOP
      v_code := public.generate_class_join_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.class_instances WHERE join_code = v_code);
    END LOOP;

    INSERT INTO public.class_instances (id, church_year_id, class_group_id, name_en, name_ar, join_code)
    VALUES (v_inst_id, p_year_id, v_group_id, v_names_en[i], v_names_ar[i], v_code);
    v_created_instances := v_created_instances + 1;
  END LOOP;

  IF v_created_instances <> 6 THEN
    RAISE EXCEPTION 'Activation Failed: Expected exactly 6 class instances, created %.', v_created_instances;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'activatedYear', p_year_id,
    'previousYearArchived', v_existing_active_id,
    'classInstancesCreated', v_created_instances
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_class_join_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  result text := 'MUSA-';
  v_uuid text;
  val int;
  i int;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role('teacher') OR public.has_role('admin')) THEN
    RAISE EXCEPTION 'Unauthorized: Only assigned teachers or administrators can generate class join codes.';
  END IF;

  v_uuid := pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '');
  FOR i IN 1..4 LOOP
    val := ('x' || pg_catalog.substr(v_uuid, (i - 1) * 2 + 1, 2))::bit(8)::int;
    result := result || pg_catalog.substr(chars, (val % pg_catalog.length(chars)) + 1, 1);
  END LOOP;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.join_class_by_code(p_join_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_student_id uuid;
  v_student_grade text;
  v_active_year_id text;
  v_instance_id text;
  v_class_group_id text;
  v_compatible boolean := false;
  v_existing_id text;
  v_existing_status text;
  v_mem_id text;
BEGIN
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated: Sign-in required.';
  END IF;
  IF NOT public.has_role('student') THEN
    RAISE EXCEPTION 'Forbidden: Only students can join a class via code.';
  END IF;

  SELECT grade INTO v_student_grade FROM public.profiles WHERE id = v_student_id;
  SELECT id INTO v_active_year_id FROM public.church_years WHERE is_active = true;
  IF v_active_year_id IS NULL THEN
    RAISE EXCEPTION 'No active church year configured.';
  END IF;

  SELECT id, class_group_id INTO v_instance_id, v_class_group_id
  FROM public.class_instances
  WHERE join_code = pg_catalog.upper(pg_catalog.trim(p_join_code))
    AND church_year_id = v_active_year_id;
  IF v_instance_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired class join code for the active church year.';
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
    RAISE EXCEPTION 'Grade Incompatibility: Student grade % cannot join class group %.', v_student_grade, v_class_group_id;
  END IF;

  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.class_memberships
  WHERE church_year_id = v_active_year_id AND student_id = v_student_id;

  IF v_existing_id IS NOT NULL THEN
    IF v_existing_status = 'active' THEN
      RAISE EXCEPTION 'Student is already actively enrolled in this church year.';
    END IF;
    UPDATE public.class_memberships
    SET status = 'active',
        class_instance_id = v_instance_id,
        exact_grade = v_student_grade,
        joined_at = pg_catalog.timezone('utc'::text, pg_catalog.now()),
        left_at = NULL,
        removal_reason = NULL,
        enrolled_by = v_student_id
    WHERE id = v_existing_id;
    RETURN pg_catalog.jsonb_build_object(
      'success', true, 'action', 'reactivated',
      'membershipId', v_existing_id, 'classInstanceId', v_instance_id
    );
  END IF;

  v_mem_id := 'mem_' || pg_catalog.substr(v_student_id::text, 1, 8) || '_' || v_active_year_id;
  INSERT INTO public.class_memberships (
    id, church_year_id, class_instance_id, student_id, exact_grade, status, enrolled_by
  ) VALUES (
    v_mem_id, v_active_year_id, v_instance_id, v_student_id, v_student_grade, 'active', v_student_id
  );
  RETURN pg_catalog.jsonb_build_object(
    'success', true, 'action', 'enrolled',
    'membershipId', v_mem_id, 'classInstanceId', v_instance_id
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.activate_new_church_year(text,text,date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_new_church_year(text,text,date,date) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.edit_feed_post(text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.edit_feed_post(text,text,text,text,text,text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.enroll_student_in_class(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enroll_student_in_class(uuid,text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.generate_class_join_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_class_join_code() TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.join_class_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_class_by_code(text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.moderate_feed_post_announcement(text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_feed_post_announcement(text,boolean) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.moderate_feed_post_pin(text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_feed_post_pin(text,boolean) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.remove_student_from_class(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_student_from_class(text,text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.review_student_class_change_request(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_student_class_change_request(uuid,text,text,text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.toggle_feed_reaction(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_feed_reaction(text,text,text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated, service_role;
