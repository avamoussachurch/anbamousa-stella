-- Read-only verification after phase4_security_hardening.sql.
-- Run as a Supabase SQL Editor administrator; this script makes no data changes.

SELECT id, email, role
FROM public.profiles
WHERE role IN ('admin', 'teacher', 'parent')
ORDER BY role, email;

DO $$
BEGIN
  IF has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.profiles', 'role', 'INSERT')
     OR has_column_privilege('authenticated', 'public.profiles', 'points', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.profiles', 'grade', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.profiles', 'parent_id', 'UPDATE') THEN
    RAISE EXCEPTION 'Authenticated users retain a privileged profiles column grant.';
  END IF;

  IF NOT has_column_privilege('authenticated', 'public.profiles', 'name', 'UPDATE') THEN
    RAISE EXCEPTION 'Expected safe self-service profile updates are not granted.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_insert_student_self'
      AND with_check ILIKE '%role%student%'
  ) THEN
    RAISE EXCEPTION 'Profile self-registration is not restricted to the student role.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'profiles'
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Profiles RLS is not enabled.';
  END IF;

  IF has_table_privilege('authenticated', 'public.lesson_progress', 'INSERT')
     OR has_table_privilege('authenticated', 'public.lesson_progress', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.lesson_progress', 'DELETE') THEN
    RAISE EXCEPTION 'Authenticated users can write authoritative lesson progress.';
  END IF;

  IF has_column_privilege('authenticated', 'public.reward_requests', 'status', 'INSERT')
     OR NOT has_column_privilege('authenticated', 'public.reward_requests', 'status', 'UPDATE') THEN
    RAISE EXCEPTION 'Reward request status grants do not match the pending/parent-decision model.';
  END IF;

  IF has_table_privilege('authenticated', 'public.user_relationships', 'INSERT')
     OR has_table_privilege('authenticated', 'public.user_relationships', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.user_relationships', 'DELETE') THEN
    RAISE EXCEPTION 'Authenticated users can forge family relationships.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute AS a
    JOIN pg_catalog.pg_class AS c ON c.oid = a.attrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'user_relationships'
      AND a.attname = 'verified_at'
      AND NOT a.attisdropped
  ) THEN
    RAISE EXCEPTION 'Family relationship verification marker is missing.';
  END IF;

  IF has_column_privilege('authenticated', 'public.lessons', 'created_by', 'INSERT')
     OR has_column_privilege('authenticated', 'public.lessons', 'created_by', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.lessons', 'points_reward', 'UPDATE') THEN
    RAISE EXCEPTION 'Authenticated users can forge lesson ownership or reward points.';
  END IF;

  IF has_column_privilege('authenticated', 'public.hymns', 'status', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.hymns', 'created_by', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.coptic_taxis', 'status', 'UPDATE')
     OR has_column_privilege('authenticated', 'public.coptic_taxis', 'created_by', 'UPDATE') THEN
    RAISE EXCEPTION 'Authenticated users can forge content approval state or ownership.';
  END IF;

  IF has_function_privilege('authenticated', 'public.provision_profile_role(uuid,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.provision_verified_family_relationship(uuid,uuid,text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.provision_profile_role(uuid,text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.provision_verified_family_relationship(uuid,uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Trusted provisioning function grants are incorrect.';
  END IF;

  IF has_function_privilege('authenticated', 'public.record_lesson_completion(uuid,uuid,timestamp with time zone)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.record_lesson_completion(uuid,uuid,timestamp with time zone)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Lesson completion must be callable only by the trusted server.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_relationships
    WHERE verified_at IS NOT NULL
      AND relationship_type NOT IN ('parent_child', 'guardian_student')
  ) THEN
    RAISE EXCEPTION 'Unexpected verified family relationship type exists.';
  END IF;

  IF pg_catalog.to_regclass('public.quiz_attempts') IS NOT NULL
     AND (
       has_table_privilege('authenticated', 'public.quiz_attempts', 'INSERT')
       OR has_table_privilege('authenticated', 'public.quiz_attempts', 'UPDATE')
       OR has_table_privilege('authenticated', 'public.quiz_attempts', 'DELETE')
     ) THEN
    RAISE EXCEPTION 'Authenticated users can write authoritative quiz attempts.';
  END IF;

  IF pg_catalog.to_regclass('public.quiz_attempts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_catalog.pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'quiz_attempts'
         AND policyname = 'quiz_attempts_select_policy'
         AND cmd = 'SELECT'
     ) THEN
    RAISE EXCEPTION 'Scoped quiz-attempt read policy is missing.';
  END IF;

  IF pg_catalog.to_regclass('public.lesson_versions') IS NOT NULL
     AND (
       has_table_privilege('authenticated', 'public.lesson_versions', 'INSERT')
       OR has_table_privilege('authenticated', 'public.lesson_versions', 'UPDATE')
       OR has_table_privilege('authenticated', 'public.lesson_versions', 'DELETE')
     ) THEN
    RAISE EXCEPTION 'Authenticated users can directly forge lesson version state.';
  END IF;

  IF pg_catalog.to_regclass('public.lesson_versions') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM pg_catalog.pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'lesson_versions'
     ) THEN
    RAISE EXCEPTION 'Lesson-version policies require explicit review before browser access is enabled.';
  END IF;

  IF EXISTS (
    SELECT 1
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
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ) THEN
    RAISE EXCEPTION 'Authenticated users can call a privileged lesson approval or publishing RPC.';
  END IF;
END;
$$;
