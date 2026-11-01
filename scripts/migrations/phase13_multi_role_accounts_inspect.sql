-- Read-only pre/post migration inspection for normalized multi-role accounts.
-- Returns schema metadata and role totals; does not expose profile identities.

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles',
    'profile_role_assignments',
    'role_promotion_requests',
    'role_change_audit'
  )
ORDER BY table_name, ordinal_position;

SELECT
  n.nspname AS schema_name,
  t.relname AS table_name,
  con.conname AS object_name,
  'constraint' AS object_type,
  pg_catalog.pg_get_constraintdef(con.oid, true) AS definition
FROM pg_catalog.pg_constraint AS con
JOIN pg_catalog.pg_class AS t ON t.oid = con.conrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname IN (
    'profiles',
    'profile_role_assignments',
    'role_promotion_requests',
    'role_change_audit'
  )
UNION ALL
SELECT schemaname, tablename, indexname, 'index', indexdef
FROM pg_catalog.pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'profile_role_assignments',
    'role_promotion_requests',
    'role_change_audit'
  )
ORDER BY schema_name, table_name, object_type, object_name;

SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profile_role_assignments',
    'role_promotion_requests',
    'role_change_audit'
  )
ORDER BY tablename, policyname;

SELECT
  p.proname AS function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  p.prosecdef AS security_definer,
  p.proconfig AS function_settings,
  pg_catalog.pg_get_userbyid(p.proowner) AS owner,
  pg_catalog.pg_get_functiondef(p.oid) AS definition
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'has_role',
    'grant_profile_role_internal',
    'create_role_assignment_for_new_profile',
    'guard_last_admin_profile_delete',
    'request_role_promotion',
    'manage_profile_role',
    'review_role_promotion_request',
    'provision_profile_role',
    'reject_role_audit_mutation'
  )
ORDER BY p.proname, identity_arguments;

SELECT
  p.role AS legacy_profile_role,
  count(*) AS profile_count,
  count(ra.user_id) FILTER (WHERE ra.revoked_at IS NULL) AS active_assignment_count
FROM public.profiles AS p
LEFT JOIN public.profile_role_assignments AS ra
  ON ra.user_id = p.id AND ra.role = p.role
GROUP BY p.role
ORDER BY p.role;

SELECT
  table_name,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'profile_role_assignments',
    'role_promotion_requests',
    'role_change_audit'
  )
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;
