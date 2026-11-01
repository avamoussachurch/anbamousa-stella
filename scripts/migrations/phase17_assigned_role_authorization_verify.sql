-- Read-only verification for Phase 17. Run after the migration is reviewed/applied.
WITH inspected_functions AS (
  SELECT
    p.proname,
    pg_catalog.pg_get_functiondef(p.oid) AS definition
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'is_church_admin',
      'is_church_servant_or_admin',
      'get_current_student_level',
      'can_access_student_data',
      'can_read_profile',
      'activate_new_church_year',
      'join_class_by_code',
      'provision_verified_family_relationship',
      'record_lesson_completion',
      'publish_lesson_version_immediately',
      'schedule_lesson_publication',
      'reschedule_lesson_publication',
      'cancel_lesson_publication',
      'list_lesson_publications',
      'process_due_lesson_publications'
    )
),
inspected_policies AS (
  SELECT policyname, qual, with_check
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND policyname IN (
      'class_instances_authorized_select',
      'servant_assignments_select',
      'servant_assignments_admin_manage',
      'memberships_select',
      'reward_requests_insert_student_pending',
      'hymns_memberships_select_student',
      'hymns_memberships_insert_student_pending',
      'hymns_select_assigned_level',
      'taxis_items_select_assigned_level',
      'Servants and Admins can view draft and in-review taxis rituals',
      'quiz_attempts_select_policy'
    )
)
SELECT 'role assignment table exists' AS check_name,
       pg_catalog.to_regclass('public.profile_role_assignments') IS NOT NULL AS passed,
       pg_catalog.to_regclass('public.profile_role_assignments')::TEXT AS details
UNION ALL
SELECT 'authorization functions no longer read profiles.role',
       NOT EXISTS (
         SELECT 1
         FROM inspected_functions
         WHERE definition ~* 'public[.]profiles[^;]*([.]role|[[:space:]]role[[:space:]]*(=|in))'
       ),
       COALESCE(
         (SELECT pg_catalog.string_agg(proname, ', ') FROM inspected_functions
          WHERE definition ~* 'public[.]profiles[^;]*([.]role|[[:space:]]role[[:space:]]*(=|in))'),
         'No legacy projection checks found in inspected function definitions.'
       )
UNION ALL
SELECT 'authorization policies no longer read profiles.role',
       NOT EXISTS (
         SELECT 1
         FROM inspected_policies
         WHERE COALESCE(qual, '') || ' ' || COALESCE(with_check, '') ~* 'profiles[.]role|p[.]role[[:space:]]*='
       ),
       COALESCE(
         (SELECT pg_catalog.string_agg(policyname, ', ') FROM inspected_policies
          WHERE COALESCE(qual, '') || ' ' || COALESCE(with_check, '') ~* 'profiles[.]role|p[.]role[[:space:]]*='),
         'No legacy projection checks found in inspected policies.'
       )
UNION ALL
SELECT 'role assignment writes unavailable to browser roles',
       NOT pg_catalog.has_table_privilege('authenticated', 'public.profile_role_assignments', 'INSERT,UPDATE,DELETE')
       AND NOT pg_catalog.has_table_privilege('anon', 'public.profile_role_assignments', 'INSERT,UPDATE,DELETE'),
       'authenticated and anon must not have assignment write privileges.'
UNION ALL
SELECT 'required normalized-role policies exist',
       (SELECT pg_catalog.count(*) FROM inspected_policies) BETWEEN 10 AND 11,
       COALESCE((SELECT pg_catalog.string_agg(policyname, ', ' ORDER BY policyname) FROM inspected_policies),
                'No Phase 17 policies found.');
