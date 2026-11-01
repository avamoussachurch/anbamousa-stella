-- Read-only verification after phase13_multi_role_accounts.sql.
-- Raises an exception for missing invariants; does not change database state.

DO $$
DECLARE
  v_missing_backfills BIGINT;
  v_active_admin_profiles BIGINT;
  v_active_admin_assignments BIGINT;
BEGIN
  IF pg_catalog.to_regclass('public.profile_role_assignments') IS NULL
     OR pg_catalog.to_regclass('public.role_promotion_requests') IS NULL
     OR pg_catalog.to_regclass('public.role_change_audit') IS NULL THEN
    RAISE EXCEPTION 'One or more multi-role foundation tables are missing.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
    WHERE oid = 'public.profile_role_assignments'::pg_catalog.regclass
      AND relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
    WHERE oid = 'public.role_promotion_requests'::pg_catalog.regclass
      AND relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
    WHERE oid = 'public.role_change_audit'::pg_catalog.regclass
      AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on every multi-role table.';
  END IF;

  SELECT count(*) INTO v_missing_backfills
  FROM public.profiles AS p
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.profile_role_assignments AS ra
    WHERE ra.user_id = p.id
      AND ra.role = p.role
      AND ra.revoked_at IS NULL
  );
  IF v_missing_backfills <> 0 THEN
    RAISE EXCEPTION 'Some profile roles are missing active role assignments: %', v_missing_backfills;
  END IF;

  SELECT count(*) INTO v_active_admin_profiles
  FROM public.profiles AS p
  WHERE p.role = 'admin';
  SELECT count(DISTINCT ra.user_id) INTO v_active_admin_assignments
  FROM public.profile_role_assignments AS ra
  WHERE ra.role = 'admin' AND ra.revoked_at IS NULL;
  IF v_active_admin_profiles > v_active_admin_assignments THEN
    RAISE EXCEPTION 'One or more legacy admin accounts were not preserved by backfill.';
  END IF;

  IF pg_catalog.has_table_privilege('authenticated', 'public.profile_role_assignments', 'INSERT')
     OR pg_catalog.has_table_privilege('authenticated', 'public.profile_role_assignments', 'UPDATE')
     OR pg_catalog.has_table_privilege('authenticated', 'public.profile_role_assignments', 'DELETE')
     OR pg_catalog.has_table_privilege('service_role', 'public.profile_role_assignments', 'INSERT')
     OR pg_catalog.has_table_privilege('service_role', 'public.profile_role_assignments', 'UPDATE')
     OR pg_catalog.has_table_privilege('service_role', 'public.profile_role_assignments', 'DELETE') THEN
    RAISE EXCEPTION 'Direct role-assignment table writes are still granted.';
  END IF;

  IF pg_catalog.has_table_privilege('authenticated', 'public.role_promotion_requests', 'INSERT')
     OR pg_catalog.has_table_privilege('authenticated', 'public.role_promotion_requests', 'UPDATE')
     OR pg_catalog.has_table_privilege('authenticated', 'public.role_promotion_requests', 'DELETE')
     OR pg_catalog.has_table_privilege('service_role', 'public.role_promotion_requests', 'INSERT')
     OR pg_catalog.has_table_privilege('service_role', 'public.role_promotion_requests', 'UPDATE')
     OR pg_catalog.has_table_privilege('service_role', 'public.role_promotion_requests', 'DELETE') THEN
    RAISE EXCEPTION 'Direct role-request table writes are still granted.';
  END IF;

  IF pg_catalog.has_table_privilege('authenticated', 'public.role_change_audit', 'INSERT')
     OR pg_catalog.has_table_privilege('authenticated', 'public.role_change_audit', 'UPDATE')
     OR pg_catalog.has_table_privilege('authenticated', 'public.role_change_audit', 'DELETE')
     OR pg_catalog.has_table_privilege('service_role', 'public.role_change_audit', 'INSERT')
     OR pg_catalog.has_table_privilege('service_role', 'public.role_change_audit', 'UPDATE')
     OR pg_catalog.has_table_privilege('service_role', 'public.role_change_audit', 'DELETE')
     OR pg_catalog.has_table_privilege('authenticated', 'public.role_change_audit', 'TRUNCATE')
     OR pg_catalog.has_table_privilege('service_role', 'public.role_change_audit', 'TRUNCATE') THEN
    RAISE EXCEPTION 'Direct role-audit mutation privileges are still granted.';
  END IF;

  IF pg_catalog.has_function_privilege(
       'authenticated',
       'public.manage_profile_role(uuid,text,text,uuid,text)',
       'EXECUTE'
     )
     OR pg_catalog.has_function_privilege(
       'authenticated',
       'public.review_role_promotion_request(uuid,uuid,boolean,text)',
       'EXECUTE'
     )
     OR NOT pg_catalog.has_function_privilege(
       'authenticated',
       'public.request_role_promotion(text,text)',
       'EXECUTE'
     )
     OR NOT pg_catalog.has_function_privilege(
       'service_role',
       'public.manage_profile_role(uuid,text,text,uuid,text)',
       'EXECUTE'
     )
     OR NOT pg_catalog.has_function_privilege(
       'service_role',
       'public.review_role_promotion_request(uuid,uuid,boolean,text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'Role request and trusted admin RPC grants are incorrect.';
  END IF;

  IF pg_catalog.has_function_privilege(
       'service_role',
       'public.grant_profile_role_internal(uuid,text,uuid,text,text,text,uuid)',
       'EXECUTE'
     )
     OR pg_catalog.has_function_privilege(
       'authenticated',
       'public.grant_profile_role_internal(uuid,text,uuid,text,text,text,uuid)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'Internal role assignment helper must not be directly executable.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.profiles'::pg_catalog.regclass
      AND tgname = 'create_role_assignment_for_new_profile'
      AND NOT tgisinternal
      AND tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'New profile role-assignment trigger is missing or disabled.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.role_change_audit'::pg_catalog.regclass
      AND tgname = 'role_change_audit_immutable'
      AND NOT tgisinternal
      AND tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'Append-only role audit trigger is missing or disabled.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.profiles'::pg_catalog.regclass
      AND tgname = 'guard_last_admin_profile_delete'
      AND NOT tgisinternal
      AND tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'Last-admin profile deletion guard is missing or disabled.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.role_promotion_requests
    WHERE requested_role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin role requests must be disallowed.';
  END IF;
END;
$$;

SELECT
  p.role AS legacy_primary_role,
  count(*) AS profiles,
  count(*) FILTER (
    WHERE EXISTS (
      SELECT 1
      FROM public.profile_role_assignments AS ra
      WHERE ra.user_id = p.id
        AND ra.role = p.role
        AND ra.revoked_at IS NULL
    )
  ) AS preserved_active_projection_count
FROM public.profiles AS p
GROUP BY p.role
ORDER BY p.role;

SELECT
  ra.role,
  count(DISTINCT ra.user_id) AS active_users
FROM public.profile_role_assignments AS ra
WHERE ra.revoked_at IS NULL
GROUP BY ra.role
ORDER BY ra.role;
