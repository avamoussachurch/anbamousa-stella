-- Read-only inspection for the Stella persistence schema. No personal rows are returned.

WITH targets(table_name) AS (
  VALUES
    ('profiles'),
    ('lesson_progress'),
    ('class_memberships'),
    ('quiz_attempts'),
    ('lesson_section_progress'),
    ('hymns_memberships'),
    ('hymns'),
    ('coptic_taxis_items')
)
SELECT
  t.table_name,
  c.oid IS NOT NULL AS exists,
  COALESCE(c.relrowsecurity, false) AS rls_enabled,
  COALESCE(c.relforcerowsecurity, false) AS force_rls,
  s.n_live_tup AS estimated_rows
FROM targets AS t
LEFT JOIN pg_catalog.pg_class AS c
  ON c.relnamespace = 'public'::pg_catalog.regnamespace
 AND c.relname = t.table_name
LEFT JOIN pg_catalog.pg_stat_user_tables AS s
  ON s.relid = c.oid
ORDER BY t.table_name;

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles',
    'lesson_progress',
    'class_memberships',
    'quiz_attempts',
    'lesson_section_progress',
    'hymns_memberships',
    'hymns',
    'coptic_taxis_items'
  )
ORDER BY table_name, ordinal_position;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'lesson_progress',
    'class_memberships',
    'quiz_attempts',
    'lesson_section_progress',
    'hymns_memberships',
    'hymns',
    'coptic_taxis_items'
  )
ORDER BY tablename, policyname;

SELECT
  c.relname AS table_name,
  r.role_name,
  pg_catalog.has_table_privilege(r.role_name::pg_catalog.name, c.oid, 'SELECT') AS can_select,
  pg_catalog.has_table_privilege(r.role_name::pg_catalog.name, c.oid, 'INSERT') AS can_insert,
  pg_catalog.has_table_privilege(r.role_name::pg_catalog.name, c.oid, 'UPDATE') AS can_update,
  pg_catalog.has_table_privilege(r.role_name::pg_catalog.name, c.oid, 'DELETE') AS can_delete
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
CROSS JOIN (VALUES ('anon'), ('authenticated'), ('service_role')) AS r(role_name)
WHERE n.nspname = 'public'
  AND c.relname IN (
    'profiles',
    'lesson_progress',
    'class_memberships',
    'quiz_attempts',
    'lesson_section_progress',
    'hymns_memberships',
    'hymns',
    'coptic_taxis_items'
  )
ORDER BY c.relname, r.role_name;

SELECT
  p.oid::pg_catalog.regprocedure::TEXT AS function_signature,
  p.prosecdef AS security_definer,
  pg_catalog.pg_get_functiondef(p.oid) AS function_definition,
  pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
  pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_can_execute
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'record_lesson_completion',
    'set_lesson_section_read',
    'create_student_profile_for_auth_user'
  )
ORDER BY function_signature;

SELECT
  tbl.relname AS table_name,
  idx.relname AS index_name,
  pg_catalog.pg_get_indexdef(idx.oid) AS index_definition
FROM pg_catalog.pg_class AS tbl
JOIN pg_catalog.pg_namespace AS ns ON ns.oid = tbl.relnamespace
JOIN pg_catalog.pg_index AS ix ON ix.indrelid = tbl.oid
JOIN pg_catalog.pg_class AS idx ON idx.oid = ix.indexrelid
WHERE ns.nspname = 'public'
  AND tbl.relname IN (
    'profiles',
    'lesson_progress',
    'class_memberships',
    'quiz_attempts',
    'lesson_section_progress',
    'hymns_memberships',
    'coptic_taxis_items'
  )
ORDER BY tbl.relname, idx.relname;

SELECT
  tbl.relname AS table_name,
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  pg_catalog.pg_get_constraintdef(con.oid) AS constraint_definition,
  con.convalidated AS validated
FROM pg_catalog.pg_constraint AS con
JOIN pg_catalog.pg_class AS tbl ON tbl.oid = con.conrelid
JOIN pg_catalog.pg_namespace AS ns ON ns.oid = tbl.relnamespace
WHERE ns.nspname = 'public'
  AND tbl.relname IN (
    'profiles',
    'lesson_progress',
    'class_memberships',
    'quiz_attempts',
    'lesson_section_progress',
    'hymns_memberships',
    'coptic_taxis_items'
  )
ORDER BY tbl.relname, con.conname;

SELECT
  p.oid::pg_catalog.regprocedure::TEXT AS function_signature,
  p.prosecdef AS security_definer,
  pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
  pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_can_execute
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'record_lesson_completion',
    'set_lesson_section_read',
    'create_student_profile_for_auth_user'
  )
ORDER BY function_signature;

SELECT
  t.tgname AS trigger_name,
  t.tgenabled AS enabled_state,
  t.tgfoid::pg_catalog.regprocedure::TEXT AS trigger_function,
  pg_catalog.pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_catalog.pg_trigger AS t
WHERE t.tgrelid = 'auth.users'::pg_catalog.regclass
  AND NOT t.tgisinternal
ORDER BY t.tgname;
