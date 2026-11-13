-- Phase 32: allow self-service parent and teacher account registration.
-- Signup may request student, parent, or teacher. Admin is never selectable here.
-- Teacher accounts receive no class membership/servant assignment; administrators
-- continue to manage those separately. Parent-child relationships remain verified.
BEGIN;

DO $preflight$
BEGIN
  IF pg_catalog.to_regclass('public.profile_role_assignments') IS NULL THEN
    RAISE EXCEPTION 'Phase 32 requires Phase 13 profile_role_assignments.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger AS t
    WHERE t.tgrelid = 'auth.users'::pg_catalog.regclass
      AND t.tgname = 'on_auth_user_created_student_profile'
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'Expected auth-user profile trigger is missing.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger AS t
    WHERE t.tgrelid = 'public.profiles'::pg_catalog.regclass
      AND t.tgname = 'create_role_assignment_for_new_profile'
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'Phase 13 role-assignment trigger is missing.';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.create_student_profile_for_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  v_requested_role TEXT;
BEGIN
  -- raw_user_meta_data is used only as a one-time signup choice. It is not used
  -- for subsequent authorization. Only the three public signup roles are allowed.
  v_requested_role := lower(
    pg_catalog.btrim(COALESCE(NEW.raw_user_meta_data ->> 'account_role', 'student'))
  );
  IF v_requested_role NOT IN ('student', 'parent', 'teacher') THEN
    v_requested_role := 'student';
  END IF;

  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
      NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'name'), ''),
      split_part(COALESCE(NEW.email, ''), '@', 1),
      'Member'
    ),
    COALESCE(NEW.email, NEW.phone, NEW.id::TEXT || '@no-email.invalid'),
    v_requested_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_student_profile_for_auth_user() FROM PUBLIC, anon, authenticated;
COMMIT;
