-- Read-only verification after phase8_shared_hymns_taxis_profile_level.sql.
-- Returns schema/permission status and aggregate counts only.

SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS force_rls,
  s.n_live_tup AS estimated_rows
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
LEFT JOIN pg_catalog.pg_stat_user_tables AS s ON s.relid = c.oid
WHERE n.nspname = 'public'
  AND c.relname IN (
    'profiles',
    'lesson_progress',
    'class_memberships',
    'quiz_attempts',
    'lesson_section_progress',
    'hymns_memberships'
  )
ORDER BY c.relname;

SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'hymns_taxis_level'
      AND data_type = 'integer'
  ) AS profile_level_column_ready,
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.profiles'::pg_catalog.regclass
      AND conname = 'profiles_hymns_taxis_level_valid'
      AND contype = 'c'
  ) AS profile_level_constraint_present,
  (
    SELECT convalidated
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.profiles'::pg_catalog.regclass
      AND conname = 'profiles_hymns_taxis_level_valid'
      AND contype = 'c'
  ) AS profile_level_constraint_validated,
  pg_catalog.has_column_privilege('authenticated', 'public.profiles', 'hymns_taxis_level', 'INSERT') AS authenticated_can_insert_level,
  pg_catalog.has_column_privilege('authenticated', 'public.profiles', 'hymns_taxis_level', 'UPDATE') AS authenticated_can_update_level,
  pg_catalog.has_column_privilege('service_role', 'public.profiles', 'hymns_taxis_level', 'UPDATE') AS service_role_can_update_level;

SELECT
  COUNT(*) FILTER (
    WHERE hymns_taxis_level IS NOT NULL
      AND hymns_taxis_level NOT IN (1, 2, 3)
  ) AS invalid_existing_level_count,
  COUNT(*) FILTER (
    WHERE role = 'student' AND hymns_taxis_level IS NULL
  ) AS students_needing_level_setup
FROM public.profiles;

SELECT
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger AS t
    WHERE t.tgrelid = 'auth.users'::pg_catalog.regclass
      AND t.tgname = 'on_auth_user_created_student_profile'
      AND NOT t.tgisinternal
      AND t.tgfoid = 'public.create_student_profile_for_auth_user()'::pg_catalog.regprocedure
      AND t.tgenabled <> 'D'
  ) AS signup_profile_trigger_ready,
  pg_catalog.has_function_privilege(
    'authenticated',
    'public.create_student_profile_for_auth_user()',
    'EXECUTE'
  ) AS authenticated_can_call_signup_trigger_function;

SELECT
  pg_catalog.to_regclass('public.quiz_attempts') IS NOT NULL AS quiz_attempts_table_exists,
  COALESCE((
    SELECT relrowsecurity
    FROM pg_catalog.pg_class
    WHERE oid = pg_catalog.to_regclass('public.quiz_attempts')
  ), false) AS quiz_attempts_rls_enabled,
  pg_catalog.to_regclass('public.uq_quiz_attempts_fingerprint') IS NOT NULL AS quiz_fingerprint_index_exists,
  pg_catalog.to_regclass('public.uq_quiz_attempts_idempotency_key') IS NOT NULL AS quiz_idempotency_index_exists,
  CASE WHEN pg_catalog.to_regclass('public.quiz_attempts') IS NULL THEN NULL
    ELSE pg_catalog.has_table_privilege('authenticated', 'public.quiz_attempts', 'INSERT')
  END AS authenticated_can_insert_quiz_attempt;

SELECT
  pg_catalog.to_regclass('public.lesson_section_progress') IS NOT NULL AS section_progress_table_exists,
  COALESCE((
    SELECT relrowsecurity
    FROM pg_catalog.pg_class
    WHERE oid = pg_catalog.to_regclass('public.lesson_section_progress')
  ), false) AS section_progress_rls_enabled,
  pg_catalog.to_regprocedure(
    'public.set_lesson_section_read(uuid,text,text,text,boolean,integer)'
  ) IS NOT NULL AS section_progress_rpc_exists,
  CASE WHEN pg_catalog.to_regprocedure(
    'public.set_lesson_section_read(uuid,text,text,text,boolean,integer)'
  ) IS NULL THEN false ELSE pg_catalog.has_function_privilege(
    'service_role',
    pg_catalog.to_regprocedure('public.set_lesson_section_read(uuid,text,text,text,boolean,integer)'),
    'EXECUTE'
  ) END AS service_role_can_call_section_progress_rpc,
  CASE WHEN pg_catalog.to_regprocedure(
    'public.set_lesson_section_read(uuid,text,text,text,boolean,integer)'
  ) IS NULL THEN false ELSE pg_catalog.has_function_privilege(
    'authenticated',
    pg_catalog.to_regprocedure('public.set_lesson_section_read(uuid,text,text,text,boolean,integer)'),
    'EXECUTE'
  ) END AS authenticated_can_call_section_progress_rpc;

SELECT
  pg_catalog.to_regprocedure(
    'public.record_lesson_completion(uuid,uuid,timestamp with time zone)'
  ) IS NOT NULL AS lesson_completion_rpc_exists,
  CASE WHEN pg_catalog.to_regprocedure(
    'public.record_lesson_completion(uuid,uuid,timestamp with time zone)'
  ) IS NULL THEN false ELSE pg_catalog.has_function_privilege(
    'service_role',
    pg_catalog.to_regprocedure('public.record_lesson_completion(uuid,uuid,timestamp with time zone)'),
    'EXECUTE'
  ) END AS service_role_can_call_lesson_completion_rpc,
  CASE WHEN pg_catalog.to_regprocedure(
    'public.record_lesson_completion(uuid,uuid,timestamp with time zone)'
  ) IS NULL THEN false ELSE pg_catalog.has_function_privilege(
    'authenticated',
    pg_catalog.to_regprocedure('public.record_lesson_completion(uuid,uuid,timestamp with time zone)'),
    'EXECUTE'
  ) END AS authenticated_can_call_lesson_completion_rpc;

SELECT
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'class_memberships'
      AND policyname = 'memberships_select'
      AND cmd = 'SELECT'
  ) AS class_membership_scoped_read_policy_present,
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class
    WHERE oid = pg_catalog.to_regclass('public.class_memberships')
      AND relrowsecurity
  ) AS class_memberships_rls_enabled,
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = pg_catalog.to_regclass('public.class_memberships')
      AND conname = 'uq_student_church_year'
      AND contype = 'u'
  ) AS one_membership_per_student_year_constraint_present;
