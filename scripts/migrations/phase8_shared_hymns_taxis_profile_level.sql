-- Add the single persisted Hymns/Taxis level assignment used by both programs.
-- Run only after inspecting the current schema and applying Phase 4 hardening.
BEGIN;

DO $preflight$
BEGIN
  IF pg_catalog.to_regclass('public.profiles') IS NULL
     OR pg_catalog.to_regclass('auth.users') IS NULL THEN
    RAISE EXCEPTION 'Required profiles/auth.users tables are missing; install the base Supabase schema first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute AS a
    WHERE a.attrelid = 'public.profiles'::pg_catalog.regclass
      AND a.attname = 'grade'
      AND NOT a.attisdropped
  ) THEN
    RAISE EXCEPTION 'public.profiles.grade is missing; install the base Supabase schema first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS c
    WHERE c.oid = 'public.profiles'::pg_catalog.regclass
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Profiles RLS is not enabled; apply Phase 4 security hardening first.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute AS a
    WHERE a.attrelid = 'public.profiles'::pg_catalog.regclass
      AND a.attname = 'hymns_taxis_level'
      AND NOT a.attisdropped
      AND a.atttypid <> 'pg_catalog.int4'::pg_catalog.regtype
  ) THEN
    RAISE EXCEPTION 'public.profiles.hymns_taxis_level exists with a non-integer type; inspect it before proceeding.';
  END IF;

  IF pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'UPDATE') THEN
    RAISE EXCEPTION 'Authenticated users retain table-level UPDATE on profiles; apply and verify Phase 4 first.';
  END IF;
END;
$preflight$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hymns_taxis_level INTEGER;

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.profiles'::pg_catalog.regclass
      AND conname = 'profiles_hymns_taxis_level_valid'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_hymns_taxis_level_valid
      CHECK (hymns_taxis_level IS NULL OR hymns_taxis_level IN (1, 2, 3))
      NOT VALID;
  END IF;
END;
$constraint$;

DO $validate_constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE hymns_taxis_level IS NOT NULL
      AND hymns_taxis_level NOT IN (1, 2, 3)
  ) THEN
    ALTER TABLE public.profiles
      VALIDATE CONSTRAINT profiles_hymns_taxis_level_valid;
  END IF;
END;
$validate_constraint$;

-- Level setup is performed only by the authenticated server endpoint.
REVOKE INSERT (hymns_taxis_level), UPDATE (hymns_taxis_level)
  ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT UPDATE (hymns_taxis_level)
  ON TABLE public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.create_student_profile_for_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $function$
DECLARE
  v_grade TEXT := NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'grade'), '');
  v_level_text TEXT := NULLIF(pg_catalog.btrim(NEW.raw_user_meta_data ->> 'hymns_taxis_level'), '');
  v_level INTEGER := NULL;
  v_valid_grades CONSTANT TEXT[] := ARRAY[
    'KG1', 'KG2',
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
    'Prep 1', 'Prep 2', 'Prep 3',
    'Secondary 1', 'Secondary 2', 'Secondary 3',
    'University'
  ];
BEGIN
  IF v_grade IS NOT NULL OR v_level_text IS NOT NULL THEN
    IF v_grade IS NULL OR NOT (v_grade = ANY(v_valid_grades)) THEN
      RAISE EXCEPTION 'A valid Sunday School grade is required.';
    END IF;

    IF v_level_text IS NULL OR v_level_text !~ '^[1-3]$' THEN
      RAISE EXCEPTION 'A valid shared Hymns and Taxis level is required.';
    END IF;

    v_level := v_level_text::INTEGER;
  END IF;

  INSERT INTO public.profiles (id, name, email, role, grade, hymns_taxis_level)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      pg_catalog.split_part(COALESCE(NEW.email, ''), '@', 1),
      'Student'
    ),
    COALESCE(NEW.email, NEW.phone, NEW.id::TEXT || '@no-email.invalid'),
    'student',
    COALESCE(v_grade, '4th Grade'),
    v_level
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_student_profile_for_auth_user()
  FROM PUBLIC, anon, authenticated;

DO $trigger$
DECLARE
  v_trigger_function OID;
BEGIN
  SELECT tgfoid
  INTO v_trigger_function
  FROM pg_catalog.pg_trigger
  WHERE tgrelid = 'auth.users'::pg_catalog.regclass
    AND tgname = 'on_auth_user_created_student_profile'
    AND NOT tgisinternal;

  IF v_trigger_function IS NULL THEN
    CREATE TRIGGER on_auth_user_created_student_profile
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.create_student_profile_for_auth_user();
  ELSIF v_trigger_function <> 'public.create_student_profile_for_auth_user()'::pg_catalog.regprocedure::OID THEN
    RAISE EXCEPTION 'The existing auth profile trigger uses an unexpected function; inspect it before proceeding.';
  ELSIF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'auth.users'::pg_catalog.regclass
      AND tgname = 'on_auth_user_created_student_profile'
      AND tgenabled = 'D'
  ) THEN
    RAISE EXCEPTION 'The existing auth profile trigger is disabled; inspect it before proceeding.';
  END IF;
END;
$trigger$;

COMMIT;
