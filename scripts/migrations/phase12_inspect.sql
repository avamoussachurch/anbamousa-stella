-- Read-only inspection for persistent media, feed attachments, curriculum
-- imports, and scheduled/bulk lesson publishing. No personal row data is read.
-- Run before choosing which existing migration, if any, is still required.

-- Table presence, RLS status, and planner row-count estimates.
WITH expected_tables(schema_name, table_name) AS (
  VALUES
    ('public', 'media_objects'),
    ('public', 'feed_posts'),
    ('public', 'feed_post_attachments'),
    ('public', 'lessons'),
    ('public', 'lesson_versions'),
    ('public', 'lesson_sections'),
    ('public', 'lesson_sources'),
    ('public', 'lesson_publication_jobs'),
    ('public', 'profiles'),
    ('public', 'hymns'),
    ('public', 'hymns_memberships'),
    ('public', 'coptic_taxis_items'),
    ('storage', 'buckets'),
    ('storage', 'objects')
)
SELECT
  e.schema_name,
  e.table_name,
  c.oid IS NOT NULL AS table_exists,
  COALESCE(c.relrowsecurity, false) AS rls_enabled,
  COALESCE(c.relforcerowsecurity, false) AS force_rls,
  s.n_live_tup AS estimated_rows
FROM expected_tables AS e
LEFT JOIN pg_catalog.pg_namespace AS n ON n.nspname = e.schema_name
LEFT JOIN pg_catalog.pg_class AS c
  ON c.relnamespace = n.oid
  AND c.relname = e.table_name
  AND c.relkind IN ('r', 'p')
LEFT JOIN pg_catalog.pg_stat_user_tables AS s ON s.relid = c.oid
ORDER BY e.schema_name, e.table_name;

-- Relevant columns, types, nullability, and defaults; no row values.
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'media_objects',
    'feed_posts',
    'feed_post_attachments',
    'lessons',
    'lesson_versions',
    'lesson_sections',
    'lesson_sources',
    'lesson_publication_jobs',
    'profiles',
    'hymns',
    'hymns_memberships',
    'coptic_taxis_items'
  )
ORDER BY table_name, ordinal_position;

-- Constraints and indexes on the touched/related tables.
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
    'media_objects', 'feed_posts', 'feed_post_attachments',
    'lessons', 'lesson_versions', 'lesson_sections', 'lesson_sources',
    'lesson_publication_jobs', 'profiles', 'hymns',
    'hymns_memberships', 'coptic_taxis_items'
  )
UNION ALL
SELECT
  schemaname,
  tablename,
  indexname,
  'index',
  indexdef
FROM pg_catalog.pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'media_objects', 'feed_posts', 'feed_post_attachments',
    'lessons', 'lesson_versions', 'lesson_sections', 'lesson_sources',
    'lesson_publication_jobs', 'profiles', 'hymns',
    'hymns_memberships', 'coptic_taxis_items'
  )
ORDER BY schema_name, table_name, object_type, object_name;

-- RLS policies on relevant application tables and Supabase Storage objects.
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
WHERE (schemaname = 'public' AND tablename IN (
    'media_objects', 'feed_posts', 'feed_post_attachments',
    'lessons', 'lesson_versions', 'lesson_sections', 'lesson_sources',
    'lesson_publication_jobs', 'profiles', 'hymns',
    'hymns_memberships', 'coptic_taxis_items'
  ))
  OR (schemaname = 'storage' AND tablename = 'objects')
ORDER BY schemaname, tablename, policyname;

-- Storage bucket configuration; object names and user data are not selected.
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id IN ('stella-feed-media-v1', 'stella-curriculum-media-v1')
ORDER BY id;

-- Relevant function definitions and SECURITY DEFINER status.
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  p.prosecdef AS security_definer,
  p.proconfig AS function_settings,
  pg_catalog.pg_get_functiondef(p.oid) AS definition
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'can_attach_owned_feed_media',
    'can_attach_owned_feed_media_reference',
    'enforce_feed_post_media_ownership',
    'publish_lesson_version',
    'publish_lesson_version_immediately',
    'schedule_lesson_publication',
    'reschedule_lesson_publication',
    'cancel_lesson_publication',
    'list_lesson_publications',
    'process_due_lesson_publications'
  )
ORDER BY p.proname, identity_arguments;

-- Table and function privileges relevant to the API's trust boundaries.
SELECT
  CASE WHEN pg_catalog.to_regclass('public.media_objects') IS NULL THEN false
    ELSE pg_catalog.has_table_privilege('anon', 'public.media_objects', 'SELECT')
  END AS anon_can_read_media_metadata,
  CASE WHEN pg_catalog.to_regclass('public.media_objects') IS NULL THEN false
    ELSE pg_catalog.has_table_privilege('authenticated', 'public.media_objects', 'SELECT')
  END AS authenticated_can_read_media_metadata,
  CASE WHEN pg_catalog.to_regclass('public.media_objects') IS NULL THEN false
    ELSE pg_catalog.has_table_privilege('service_role', 'public.media_objects', 'SELECT')
  END AS service_role_can_read_media_metadata,
  CASE WHEN pg_catalog.to_regclass('public.feed_post_attachments') IS NULL THEN false
    ELSE pg_catalog.has_table_privilege('authenticated', 'public.feed_post_attachments', 'SELECT')
  END AS authenticated_can_read_attachments,
  CASE WHEN pg_catalog.to_regclass('public.feed_post_attachments') IS NULL THEN false
    ELSE pg_catalog.has_table_privilege('authenticated', 'public.feed_post_attachments', 'INSERT')
  END AS authenticated_can_insert_attachments,
  CASE WHEN pg_catalog.to_regclass('public.feed_post_attachments') IS NULL THEN false
    ELSE pg_catalog.has_table_privilege('authenticated', 'public.feed_post_attachments', 'UPDATE')
  END AS authenticated_can_update_attachments,
  CASE WHEN pg_catalog.to_regclass('public.feed_post_attachments') IS NULL THEN false
    ELSE pg_catalog.has_table_privilege('authenticated', 'public.feed_post_attachments', 'DELETE')
  END AS authenticated_can_delete_attachments,
  CASE WHEN pg_catalog.to_regclass('public.lesson_publication_jobs') IS NULL THEN false
    ELSE pg_catalog.has_table_privilege('authenticated', 'public.lesson_publication_jobs', 'SELECT')
  END AS authenticated_can_read_publication_jobs,
  CASE WHEN pg_catalog.to_regclass('public.lesson_publication_jobs') IS NULL THEN false
    ELSE pg_catalog.has_table_privilege('service_role', 'public.lesson_publication_jobs', 'SELECT')
  END AS service_role_can_read_publication_jobs;

SELECT
  p.proname AS function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
  pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_can_execute
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'can_attach_owned_feed_media',
    'publish_lesson_version_immediately',
    'schedule_lesson_publication',
    'reschedule_lesson_publication',
    'cancel_lesson_publication',
    'list_lesson_publications',
    'process_due_lesson_publications'
  )
ORDER BY p.proname, identity_arguments;

-- Safe even when pg_cron is not installed. If cron_job_table_exists is true,
-- the optional query below can be run to inspect the configured job.
SELECT
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_extension WHERE extname = 'pg_cron'
  ) AS pg_cron_extension_installed,
  pg_catalog.to_regclass('cron.job') IS NOT NULL AS cron_job_table_exists,
  pg_catalog.to_regprocedure('cron.schedule(text,text,text)') IS NOT NULL AS cron_schedule_function_exists,
  pg_catalog.to_regprocedure('cron.unschedule(bigint)') IS NOT NULL AS cron_unschedule_function_exists;

-- Optional, only after the preceding query confirms cron_job_table_exists:
-- SELECT jobname, schedule, command, active
-- FROM cron.job
-- WHERE jobname = 'stella-due-lesson-publishing';
