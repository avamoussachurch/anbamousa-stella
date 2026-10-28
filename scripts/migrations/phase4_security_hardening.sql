-- Phase 4: Supabase role and authoritative-data hardening.
-- Apply after supabase_schema.sql and all earlier scripts/migrations/*.sql files.
-- Do not put a service-role key in the browser or commit it to source control.

-- BEGIN PHASE 4 SECURITY HARDENING
BEGIN;

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'student';

ALTER TABLE public.user_relationships
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.is_church_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_church_servant_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.role IN ('teacher', 'admin')
  );
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
        AND (p.role IN ('teacher', 'admin') OR p.grade ILIKE '%deacon%' OR p.grade ILIKE '%servant%')
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
    OR EXISTS (
      SELECT 1
      FROM public.profiles AS caller
      JOIN public.class_memberships AS cm
        ON cm.student_id = p_student_id
       AND cm.status = 'active'
      JOIN public.servant_class_assignments AS sca
        ON sca.class_instance_id = cm.class_instance_id
       AND sca.church_year_id = cm.church_year_id
       AND sca.servant_id = caller.id
       AND sca.is_active = true
      JOIN public.church_years AS cy
        ON cy.id = cm.church_year_id
       AND cy.is_active = true
      WHERE caller.id = auth.uid()
        AND caller.role = 'teacher'
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
    OR EXISTS (
      SELECT 1
      FROM public.profiles AS target
      JOIN public.class_memberships AS cm
        ON cm.student_id = target.id
       AND cm.status = 'active'
      JOIN public.servant_class_assignments AS sca
        ON sca.class_instance_id = cm.class_instance_id
       AND sca.church_year_id = cm.church_year_id
       AND sca.servant_id = auth.uid()
       AND sca.is_active = true
      JOIN public.church_years AS cy
        ON cy.id = cm.church_year_id
       AND cy.is_active = true
      JOIN public.profiles AS caller
        ON caller.id = auth.uid()
       AND caller.role = 'teacher'
      WHERE target.id = p_profile_id
        AND target.role = 'student'
    );
$$;

CREATE OR REPLACE FUNCTION public.provision_profile_role(
  p_user_id UUID,
  p_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Role provisioning is restricted to the trusted server.'
      USING ERRCODE = '42501';
  END IF;

  IF p_role NOT IN ('student', 'teacher', 'parent', 'admin') THEN
    RAISE EXCEPTION 'Invalid profile role.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
  SET role = p_role
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.provision_verified_family_relationship(
  p_parent_id UUID,
  p_child_id UUID,
  p_relationship_type TEXT DEFAULT 'parent_child'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  v_parent_role TEXT;
  v_child_role TEXT;
  v_relationship_id UUID;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Family relationship provisioning is restricted to the trusted server.'
      USING ERRCODE = '42501';
  END IF;

  IF p_relationship_type NOT IN ('parent_child', 'guardian_student') THEN
    RAISE EXCEPTION 'Invalid family relationship type.' USING ERRCODE = '22023';
  END IF;

  SELECT role INTO v_parent_role
  FROM public.profiles
  WHERE id = p_parent_id;

  SELECT role INTO v_child_role
  FROM public.profiles
  WHERE id = p_child_id;

  IF v_parent_role <> 'parent' OR v_child_role <> 'student' THEN
    RAISE EXCEPTION 'A verified relationship requires a parent and a student profile.'
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
$$;

CREATE OR REPLACE FUNCTION public.record_lesson_completion(
  p_student_id UUID,
  p_lesson_id UUID,
  p_completed_at TIMESTAMPTZ
)
RETURNS TABLE (
  points_awarded INTEGER,
  total_points INTEGER,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  v_was_completed BOOLEAN;
  v_points_awarded INTEGER := 0;
  v_total_points INTEGER;
  v_completed_at TIMESTAMPTZ;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Lesson completion writes are restricted to the trusted server.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_student_id
      AND role = 'student'
  ) THEN
    RAISE EXCEPTION 'Target profile is not an authorized student.'
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
$$;

CREATE OR REPLACE FUNCTION public.create_student_profile_for_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(COALESCE(NEW.email, ''), '@', 1),
      'Student'
    ),
    COALESCE(NEW.email, NEW.phone, NEW.id::TEXT || '@no-email.invalid'),
    'student'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger AS t
    WHERE t.tgname = 'on_auth_user_created_student_profile'
      AND t.tgrelid = 'auth.users'::pg_catalog.regclass
      AND NOT t.tgisinternal
  ) THEN
    CREATE TRIGGER on_auth_user_created_student_profile
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.create_student_profile_for_auth_user();
  END IF;
END;
$$;

INSERT INTO public.profiles (id, name, email, role)
SELECT
  u.id,
  COALESCE(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(COALESCE(u.email, ''), '@', 1),
    'Student'
  ),
  COALESCE(u.email, u.phone, u.id::TEXT || '@no-email.invalid'),
  'student'
FROM auth.users AS u
LEFT JOIN public.profiles AS p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

REVOKE ALL ON FUNCTION public.is_church_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_church_servant_or_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_current_student_level() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_student_data(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_read_profile(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.provision_profile_role(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.provision_verified_family_relationship(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_lesson_completion(UUID, UUID, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_student_profile_for_auth_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_church_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_church_servant_or_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_student_level() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_student_data(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_profile(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.provision_profile_role(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.provision_verified_family_relationship(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_lesson_completion(UUID, UUID, TIMESTAMPTZ) TO service_role;

DO $$
DECLARE
  v_policy RECORD;
BEGIN
  FOR v_policy IN
    SELECT schemaname, tablename, policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles',
        'lesson_progress',
        'reward_requests',
        'user_relationships',
        'lessons',
        'hymns_memberships'
      )
  LOOP
    EXECUTE pg_catalog.format(
      'DROP POLICY %I ON %I.%I',
      v_policy.policyname,
      v_policy.schemaname,
      v_policy.tablename
    );
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile or parents can update children" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authorized" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_student_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_safe_self_fields" ON public.profiles;

CREATE POLICY "profiles_select_authorized"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.can_read_profile(id));

CREATE POLICY "profiles_insert_student_self"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND role = 'student');

CREATE POLICY "profiles_update_safe_self_fields"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_church_admin())
  WITH CHECK (id = auth.uid() OR public.is_church_admin());

REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id, name, email, role, grade, avatar, points, current_streak, longest_streak, parent_id, require_reward_approval, push_notifications_enabled, notify_lesson_completion, notify_event_reminders, screen_time_seconds, last_active, created_at)
  ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (id, name, email, role, grade, avatar, points, current_streak, longest_streak, parent_id, require_reward_approval, push_notifications_enabled, notify_lesson_completion, notify_event_reminders, screen_time_seconds, last_active, created_at)
  ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT INSERT (id, name, email, avatar)
  ON TABLE public.profiles TO authenticated;
GRANT UPDATE (name, avatar, require_reward_approval, push_notifications_enabled, notify_lesson_completion, notify_event_reminders, screen_time_seconds, last_active)
  ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

DROP POLICY IF EXISTS "Users and their parents can view progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Students can update their progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "lesson_progress_select_authorized" ON public.lesson_progress;
CREATE POLICY "lesson_progress_select_authorized"
  ON public.lesson_progress FOR SELECT TO authenticated
  USING (public.can_access_student_data(student_id));

REVOKE ALL PRIVILEGES ON TABLE public.lesson_progress FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.lesson_progress TO authenticated;
GRANT ALL ON TABLE public.lesson_progress TO service_role;

DROP POLICY IF EXISTS "Reward requests access policy" ON public.reward_requests;
DROP POLICY IF EXISTS "reward_requests_select_related" ON public.reward_requests;
DROP POLICY IF EXISTS "reward_requests_insert_student_pending" ON public.reward_requests;
DROP POLICY IF EXISTS "reward_requests_update_verified_parent_pending" ON public.reward_requests;

CREATE POLICY "reward_requests_select_related"
  ON public.reward_requests FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.is_church_admin()
    OR EXISTS (
      SELECT 1
      FROM public.user_relationships AS ur
      WHERE ur.parent_id = auth.uid()
        AND ur.child_id = reward_requests.student_id
        AND ur.relationship_type IN ('parent_child', 'guardian_student')
        AND ur.verified_at IS NOT NULL
    )
  );

CREATE POLICY "reward_requests_insert_student_pending"
  ON public.reward_requests FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND status = 'pending'
    AND cost_points > 0
    AND EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'student'
    )
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

CREATE POLICY "reward_requests_update_verified_parent_pending"
  ON public.reward_requests FOR UPDATE TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM public.user_relationships AS ur
      WHERE ur.parent_id = auth.uid()
        AND ur.child_id = reward_requests.student_id
        AND ur.relationship_type IN ('parent_child', 'guardian_student')
        AND ur.verified_at IS NOT NULL
    )
  )
  WITH CHECK (
    status IN ('approved', 'rejected')
    AND EXISTS (
      SELECT 1
      FROM public.user_relationships AS ur
      WHERE ur.parent_id = auth.uid()
        AND ur.child_id = reward_requests.student_id
        AND ur.relationship_type IN ('parent_child', 'guardian_student')
        AND ur.verified_at IS NOT NULL
    )
  );

REVOKE ALL PRIVILEGES ON TABLE public.reward_requests FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id, student_id, reward_id, reward_name_en, reward_name_ar, cost_points, status, parent_id, created_at, decided_at)
  ON TABLE public.reward_requests FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (id, student_id, reward_id, reward_name_en, reward_name_ar, cost_points, status, parent_id, created_at, decided_at)
  ON TABLE public.reward_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.reward_requests TO authenticated;
GRANT INSERT (student_id, reward_id, reward_name_en, reward_name_ar, cost_points, parent_id)
  ON TABLE public.reward_requests TO authenticated;
GRANT UPDATE (status) ON TABLE public.reward_requests TO authenticated;
GRANT ALL ON TABLE public.reward_requests TO service_role;

CREATE OR REPLACE FUNCTION public.stamp_reward_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.status <> 'pending' OR NEW.status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Only pending reward requests can be decided.'
      USING ERRCODE = '42501';
  END IF;
  NEW.decided_at := pg_catalog.now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reward_requests_stamp_decision ON public.reward_requests;
CREATE TRIGGER reward_requests_stamp_decision
  BEFORE UPDATE OF status ON public.reward_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_reward_decision();
REVOKE ALL ON FUNCTION public.stamp_reward_decision() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Users can view their own relationships" ON public.user_relationships;
DROP POLICY IF EXISTS "Parents can insert and manage child relationships" ON public.user_relationships;
DROP POLICY IF EXISTS "user_relationships_select_verified_related" ON public.user_relationships;
CREATE POLICY "user_relationships_select_verified_related"
  ON public.user_relationships FOR SELECT TO authenticated
  USING (
    verified_at IS NOT NULL
    AND (
      parent_id = auth.uid()
      OR child_id = auth.uid()
      OR public.is_church_admin()
    )
  );

REVOKE ALL PRIVILEGES ON TABLE public.user_relationships FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.user_relationships TO authenticated;
GRANT ALL ON TABLE public.user_relationships TO service_role;

DROP POLICY IF EXISTS "Teachers and admins can manage lessons" ON public.lessons;
CREATE POLICY "lessons_select_authenticated"
  ON public.lessons FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "lessons_insert_teacher" ON public.lessons;
DROP POLICY IF EXISTS "lessons_update_owner_or_admin" ON public.lessons;
DROP POLICY IF EXISTS "lessons_delete_owner_or_admin" ON public.lessons;
CREATE POLICY "lessons_insert_teacher"
  ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (public.is_church_servant_or_admin() AND created_by = auth.uid());
CREATE POLICY "lessons_update_owner_or_admin"
  ON public.lessons FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_church_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_church_admin());
CREATE POLICY "lessons_delete_owner_or_admin"
  ON public.lessons FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_church_admin());

CREATE OR REPLACE FUNCTION public.set_lesson_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lessons_set_owner ON public.lessons;
CREATE TRIGGER lessons_set_owner
  BEFORE INSERT ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.set_lesson_owner();

REVOKE ALL PRIVILEGES ON TABLE public.lessons FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id, title_en, title_ar, category, grade_level, summary_en, summary_ar, scripture_verse_en, scripture_verse_ar, verse_reference, audio_url, pdf_worksheet_url, points_reward, quiz_questions, created_by, created_at)
  ON TABLE public.lessons FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (id, title_en, title_ar, category, grade_level, summary_en, summary_ar, scripture_verse_en, scripture_verse_ar, verse_reference, audio_url, pdf_worksheet_url, points_reward, quiz_questions, created_by, created_at)
  ON TABLE public.lessons FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.lessons TO authenticated;
GRANT INSERT (title_en, title_ar, category, grade_level, summary_en, summary_ar, scripture_verse_en, scripture_verse_ar, verse_reference, audio_url, pdf_worksheet_url, quiz_questions)
  ON TABLE public.lessons TO authenticated;
GRANT UPDATE (title_en, title_ar, category, grade_level, summary_en, summary_ar, scripture_verse_en, scripture_verse_ar, verse_reference, audio_url, pdf_worksheet_url, quiz_questions)
  ON TABLE public.lessons TO authenticated;
GRANT DELETE ON TABLE public.lessons TO authenticated;
GRANT ALL ON TABLE public.lessons TO service_role;

DROP POLICY IF EXISTS "Students can submit own hymns enrollment" ON public.hymns_memberships;
DROP POLICY IF EXISTS "Servants and Admins can update hymns enrollment status" ON public.hymns_memberships;
DROP POLICY IF EXISTS "hymns_memberships_insert_student_pending" ON public.hymns_memberships;
CREATE POLICY "hymns_memberships_select_student"
  ON public.hymns_memberships FOR SELECT TO authenticated
  USING (student_id = auth.uid()::TEXT);
CREATE POLICY "hymns_memberships_select_staff"
  ON public.hymns_memberships FOR SELECT TO authenticated
  USING (public.is_church_servant_or_admin());
CREATE POLICY "hymns_memberships_insert_student_pending"
  ON public.hymns_memberships FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()::TEXT
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'student'
    )
  );
REVOKE ALL PRIVILEGES ON TABLE public.hymns_memberships FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id, student_id, student_name, level, roster_group, status, notes, reviewed_by, reviewed_at, created_at, updated_at)
  ON TABLE public.hymns_memberships FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.hymns_memberships TO authenticated;
GRANT INSERT (student_id, student_name, level, roster_group, notes)
  ON TABLE public.hymns_memberships TO authenticated;
GRANT ALL ON TABLE public.hymns_memberships TO service_role;

-- Clients may edit content drafts but cannot choose owner or change review/publish state.
CREATE OR REPLACE FUNCTION public.set_text_content_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid()::TEXT;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF pg_catalog.to_regclass('public.coptic_taxis') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.coptic_taxis ALTER COLUMN status SET DEFAULT ''draft''';
    EXECUTE 'DROP POLICY IF EXISTS "Servants insert taxis" ON public.coptic_taxis';
    EXECUTE 'DROP POLICY IF EXISTS "Servants update taxis" ON public.coptic_taxis';
    EXECUTE 'DROP POLICY IF EXISTS "Servants delete taxis" ON public.coptic_taxis';
    EXECUTE 'DROP POLICY IF EXISTS "taxis_insert_owned_draft" ON public.coptic_taxis';
    EXECUTE 'DROP POLICY IF EXISTS "taxis_update_owned_draft" ON public.coptic_taxis';
    EXECUTE 'DROP POLICY IF EXISTS "taxis_delete_owned_draft" ON public.coptic_taxis';
    EXECUTE $policy$
      CREATE POLICY "taxis_insert_owned_draft"
      ON public.coptic_taxis FOR INSERT TO authenticated
      WITH CHECK (public.is_church_servant_or_admin() AND status = 'draft' AND created_by = auth.uid()::TEXT)
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "taxis_update_owned_draft"
      ON public.coptic_taxis FOR UPDATE TO authenticated
      USING (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.is_church_admin()))
      WITH CHECK (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.is_church_admin()))
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "taxis_delete_owned_draft"
      ON public.coptic_taxis FOR DELETE TO authenticated
      USING (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.is_church_admin()))
    $policy$;
    EXECUTE 'DROP TRIGGER IF EXISTS coptic_taxis_set_owner ON public.coptic_taxis';
    EXECUTE 'CREATE TRIGGER coptic_taxis_set_owner BEFORE INSERT ON public.coptic_taxis FOR EACH ROW EXECUTE FUNCTION public.set_text_content_owner()';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.coptic_taxis FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT SELECT ON TABLE public.coptic_taxis TO anon, authenticated';
    EXECUTE 'GRANT INSERT (id, title_ar, title_en, title_copt, category, audience, summary_ar, summary_en, version, source_references, documents, sections) ON TABLE public.coptic_taxis TO authenticated';
    EXECUTE 'GRANT UPDATE (title_ar, title_en, title_copt, category, audience, summary_ar, summary_en, source_references, documents, sections) ON TABLE public.coptic_taxis TO authenticated';
    EXECUTE 'GRANT DELETE ON TABLE public.coptic_taxis TO authenticated';
    EXECUTE 'GRANT ALL ON TABLE public.coptic_taxis TO service_role';
  END IF;

  IF pg_catalog.to_regclass('public.hymns') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.hymns ALTER COLUMN status SET DEFAULT ''draft''';
    EXECUTE 'DROP POLICY IF EXISTS "Servants insert hymns" ON public.hymns';
    EXECUTE 'DROP POLICY IF EXISTS "Servants update hymns" ON public.hymns';
    EXECUTE 'DROP POLICY IF EXISTS "Servants delete hymns" ON public.hymns';
    EXECUTE 'DROP POLICY IF EXISTS "hymns_insert_owned_draft" ON public.hymns';
    EXECUTE 'DROP POLICY IF EXISTS "hymns_update_owned_draft" ON public.hymns';
    EXECUTE 'DROP POLICY IF EXISTS "hymns_delete_owned_draft" ON public.hymns';
    EXECUTE $policy$
      CREATE POLICY "hymns_insert_owned_draft"
      ON public.hymns FOR INSERT TO authenticated
      WITH CHECK (public.is_church_servant_or_admin() AND status = 'draft' AND created_by = auth.uid()::TEXT)
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "hymns_update_owned_draft"
      ON public.hymns FOR UPDATE TO authenticated
      USING (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.is_church_admin()))
      WITH CHECK (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.is_church_admin()))
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "hymns_delete_owned_draft"
      ON public.hymns FOR DELETE TO authenticated
      USING (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.is_church_admin()))
    $policy$;
    EXECUTE 'DROP TRIGGER IF EXISTS hymns_set_owner ON public.hymns';
    EXECUTE 'CREATE TRIGGER hymns_set_owner BEFORE INSERT ON public.hymns FOR EACH ROW EXECUTE FUNCTION public.set_text_content_owner()';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.hymns FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT SELECT ON TABLE public.hymns TO anon, authenticated';
    EXECUTE 'GRANT INSERT (id, title_ar, title_en, title_coptic, season_ar, season_en, occasion_tag, difficulty, level, audio_url, duration_sec, hazat_explanation_ar, hazat_explanation_en, lines, version) ON TABLE public.hymns TO authenticated';
    EXECUTE 'GRANT UPDATE (title_ar, title_en, title_coptic, season_ar, season_en, occasion_tag, difficulty, level, audio_url, duration_sec, hazat_explanation_ar, hazat_explanation_en, lines) ON TABLE public.hymns TO authenticated';
    EXECUTE 'GRANT DELETE ON TABLE public.hymns TO authenticated';
    EXECUTE 'GRANT ALL ON TABLE public.hymns TO service_role';
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Servants and Admins can manage taxis items" ON public.coptic_taxis_items;
DROP POLICY IF EXISTS "taxis_items_insert_owned_draft" ON public.coptic_taxis_items;
DROP POLICY IF EXISTS "taxis_items_update_owned_draft" ON public.coptic_taxis_items;
DROP POLICY IF EXISTS "taxis_items_delete_owned_draft" ON public.coptic_taxis_items;
CREATE POLICY "taxis_items_insert_owned_draft"
  ON public.coptic_taxis_items FOR INSERT TO authenticated
  WITH CHECK (public.is_church_servant_or_admin() AND status = 'draft' AND created_by = auth.uid()::TEXT);
CREATE POLICY "taxis_items_update_owned_draft"
  ON public.coptic_taxis_items FOR UPDATE TO authenticated
  USING (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.is_church_admin()))
  WITH CHECK (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.is_church_admin()));
CREATE POLICY "taxis_items_delete_owned_draft"
  ON public.coptic_taxis_items FOR DELETE TO authenticated
  USING (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.is_church_admin()));
DROP TRIGGER IF EXISTS coptic_taxis_items_set_owner ON public.coptic_taxis_items;
CREATE TRIGGER coptic_taxis_items_set_owner
  BEFORE INSERT ON public.coptic_taxis_items
  FOR EACH ROW EXECUTE FUNCTION public.set_text_content_owner();

REVOKE ALL PRIVILEGES ON TABLE public.coptic_taxis_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.coptic_taxis_items TO authenticated;
GRANT INSERT (id, title_ar, title_en, title_coptic, category, season, target_audience, sections, attachments, version)
  ON TABLE public.coptic_taxis_items TO authenticated;
GRANT UPDATE (title_ar, title_en, title_coptic, category, season, target_audience, sections, attachments)
  ON TABLE public.coptic_taxis_items TO authenticated;
GRANT DELETE ON TABLE public.coptic_taxis_items TO authenticated;
GRANT ALL ON TABLE public.coptic_taxis_items TO service_role;

-- These tables are introduced by later/optional migrations, so harden them when present.
DO $$
DECLARE
  v_function RECORD;
  v_policy RECORD;
BEGIN
  FOR v_policy IN
    SELECT schemaname, tablename, policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('quiz_attempts', 'lesson_versions')
  LOOP
    EXECUTE pg_catalog.format(
      'DROP POLICY %I ON %I.%I',
      v_policy.policyname,
      v_policy.schemaname,
      v_policy.tablename
    );
  END LOOP;

  IF pg_catalog.to_regclass('public.quiz_attempts') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.quiz_attempts FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT SELECT ON TABLE public.quiz_attempts TO authenticated';
    EXECUTE 'GRANT ALL ON TABLE public.quiz_attempts TO service_role';
    EXECUTE $policy$
      CREATE POLICY quiz_attempts_select_policy
      ON public.quiz_attempts
      FOR SELECT
      TO authenticated
      USING (
        student_id = auth.uid()::text
        OR EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
        OR EXISTS (
          SELECT 1
          FROM public.class_memberships AS cm
          JOIN public.servant_class_assignments AS sca
            ON sca.class_instance_id = cm.class_instance_id
           AND sca.church_year_id = cm.church_year_id
          JOIN public.church_years AS cy
            ON cy.id = sca.church_year_id
          WHERE cm.student_id::text = public.quiz_attempts.student_id
            AND sca.servant_id = auth.uid()
            AND sca.is_active = true
            AND cy.is_active = true
            AND cm.status = 'active'
        )
      )
    $policy$;
  END IF;

  IF pg_catalog.to_regclass('public.lesson_versions') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.lesson_versions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.lesson_versions FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT SELECT ON TABLE public.lesson_versions TO authenticated';
    EXECUTE 'GRANT ALL ON TABLE public.lesson_versions TO service_role';
  END IF;

  FOR v_function IN
    SELECT p.oid::pg_catalog.regprocedure AS signature
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname IN (
        'approve_lesson_version',
        'approve_version',
        'publish_lesson_version',
        'review_lesson_version',
        'set_lesson_version_status'
      )
  LOOP
    EXECUTE pg_catalog.format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      v_function.signature
    );
    EXECUTE pg_catalog.format(
      'GRANT EXECUTE ON FUNCTION %s TO service_role',
      v_function.signature
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.set_lesson_owner() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_text_content_owner() FROM PUBLIC, anon, authenticated;

COMMIT;
