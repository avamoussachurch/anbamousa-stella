-- Read-only post-migration verification for Phases 9-12.
-- Returns schema/configuration and privilege status only, not personal data.

-- Persistent media metadata and bucket invariants.
SELECT
  pg_catalog.to_regclass('public.media_objects') IS NOT NULL AS media_objects_table_exists,
  COALESCE((
    SELECT relrowsecurity
    FROM pg_catalog.pg_class
    WHERE oid = pg_catalog.to_regclass('public.media_objects')
  ), false) AS media_objects_rls_enabled,
  pg_catalog.to_regclass('public.media_objects_bucket_path_uidx') IS NOT NULL AS media_reference_unique_index_exists,
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = pg_catalog.to_regclass('public.media_objects')
      AND conname = 'media_objects_visibility_check'
  ) AS media_visibility_constraint_exists,
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = pg_catalog.to_regclass('public.media_objects')
      AND conname = 'media_objects_type_check'
  ) AS media_type_constraint_exists,
  CASE WHEN pg_catalog.to_regclass('public.media_objects') IS NULL THEN false
    ELSE pg_catalog.has_table_privilege('anon', 'public.media_objects', 'SELECT')
  END AS anon_can_read_media_metadata,
  CASE WHEN pg_catalog.to_regclass('public.media_objects') IS NULL THEN false
    ELSE pg_catalog.has_table_privilege('authenticated', 'public.media_objects', 'SELECT')
  END AS authenticated_can_read_media_metadata,
  CASE WHEN pg_catalog.to_regclass('public.media_objects') IS NULL THEN false
    ELSE pg_catalog.has_table_privilege('service_role', 'public.media_objects', 'SELECT')
  END AS service_role_can_read_media_metadata,
  EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'stella-feed-media-v1' AND public IS TRUE
  ) AS feed_bucket_is_public,
  EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'stella-curriculum-media-v1' AND public IS FALSE
  ) AS curriculum_bucket_is_private,
  EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'stella-feed-media-v1'
      AND file_size_limit <= 104857600
      AND allowed_mime_types IS NOT NULL
      AND cardinality(allowed_mime_types) > 0
      AND NOT ('*/*' = ANY(allowed_mime_types))
  ) AS feed_bucket_size_limit_within_100_mib,
  EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'stella-curriculum-media-v1'
      AND file_size_limit <= 104857600
      AND allowed_mime_types IS NOT NULL
      AND cardinality(allowed_mime_types) > 0
      AND NOT ('*/*' = ANY(allowed_mime_types))
  ) AS curriculum_bucket_size_limit_within_100_mib;

-- Review all Storage object policies; the application uses the trusted server
-- and service role, so no client policy should grant direct access to private
-- curriculum objects.
SELECT
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- Multi-attachment limits, access, and legacy-column ownership enforcement.
SELECT
  pg_catalog.to_regclass('public.feed_post_attachments') IS NOT NULL AS attachment_table_exists,
  COALESCE((
    SELECT relrowsecurity
    FROM pg_catalog.pg_class
    WHERE oid = pg_catalog.to_regclass('public.feed_post_attachments')
  ), false) AS attachment_rls_enabled,
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = pg_catalog.to_regclass('public.feed_post_attachments')
      AND conname = 'feed_post_attachments_post_position_unique'
  ) AS one_attachment_per_position_constraint_exists,
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = pg_catalog.to_regclass('public.feed_post_attachments')
      AND conname = 'feed_post_attachments_storage_target_check'
  ) AS attachment_storage_or_external_target_constraint_exists,
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = pg_catalog.to_regclass('public.feed_post_attachments')
      AND conname = 'feed_post_attachments_position_check'
  ) AS attachment_count_limit_constraint_exists,
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'feed_post_attachments'
      AND policyname = 'Authors attach their own feed media'
      AND cmd = 'INSERT'
  ) AS owned_media_insert_policy_exists,
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = pg_catalog.to_regclass('public.feed_posts')
      AND tgname = 'enforce_feed_post_media_ownership'
      AND NOT tgisinternal
      AND tgenabled <> 'D'
  ) AS legacy_media_ownership_trigger_enabled,
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
  END AS authenticated_can_delete_attachments;

-- Scheduled publishing state, direct route lookup grant, RPC grants, and cron.
SELECT
  pg_catalog.to_regclass('public.lesson_publication_jobs') IS NOT NULL AS publication_jobs_table_exists,
  COALESCE((
    SELECT relrowsecurity
    FROM pg_catalog.pg_class
    WHERE oid = pg_catalog.to_regclass('public.lesson_publication_jobs')
  ), false) AS publication_jobs_rls_enabled,
  pg_catalog.to_regclass('public.lesson_publication_jobs_one_active_per_lesson') IS NOT NULL AS one_active_job_index_exists,
  pg_catalog.to_regclass('public.lesson_publication_jobs_due_idx') IS NOT NULL AS due_publication_index_exists,
  CASE WHEN pg_catalog.to_regclass('public.lesson_publication_jobs') IS NULL THEN false
    ELSE pg_catalog.has_table_privilege('authenticated', 'public.lesson_publication_jobs', 'SELECT')
  END AS authenticated_can_read_jobs_directly,
  CASE WHEN pg_catalog.to_regclass('public.lesson_publication_jobs') IS NULL THEN false
    ELSE pg_catalog.has_table_privilege('service_role', 'public.lesson_publication_jobs', 'SELECT')
  END AS service_role_can_read_jobs,
  pg_catalog.to_regprocedure('public.schedule_lesson_publication(uuid,uuid,timestamp with time zone)') IS NOT NULL AS schedule_rpc_exists,
  CASE WHEN pg_catalog.to_regprocedure('public.schedule_lesson_publication(uuid,uuid,timestamp with time zone)') IS NULL THEN false
    ELSE pg_catalog.has_function_privilege('authenticated', pg_catalog.to_regprocedure('public.schedule_lesson_publication(uuid,uuid,timestamp with time zone)'), 'EXECUTE')
  END AS authenticated_can_schedule,
  pg_catalog.to_regprocedure('public.publish_lesson_version_immediately(uuid,uuid,uuid)') IS NOT NULL AS immediate_publish_rpc_exists,
  CASE WHEN pg_catalog.to_regprocedure('public.publish_lesson_version_immediately(uuid,uuid,uuid)') IS NULL THEN false
    ELSE pg_catalog.has_function_privilege('service_role', pg_catalog.to_regprocedure('public.publish_lesson_version_immediately(uuid,uuid,uuid)'), 'EXECUTE')
  END AS service_role_can_publish_immediately,
  pg_catalog.to_regprocedure('public.process_due_lesson_publications()') IS NOT NULL AS due_processor_rpc_exists,
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_extension WHERE extname = 'pg_cron'
  ) AS pg_cron_extension_installed;

-- Safe even when pg_cron is not installed. If cron_job_table_exists is true,
-- use the optional query below to verify the scheduled job.
SELECT
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_extension WHERE extname = 'pg_cron'
  ) AS pg_cron_extension_installed,
  pg_catalog.to_regclass('cron.job') IS NOT NULL AS cron_job_table_exists,
  pg_catalog.to_regprocedure('cron.schedule(text,text,text)') IS NOT NULL AS cron_schedule_function_exists;

-- Optional, only after the preceding query confirms cron_job_table_exists:
-- SELECT
--   jobname,
--   schedule,
--   active,
--   command = 'SELECT public.process_due_lesson_publications();' AS command_matches_expected_processor
-- FROM cron.job
-- WHERE jobname = 'stella-due-lesson-publishing';

-- The importer uses existing lesson/version/section/source schema for Sunday
-- School. Hymns/Taxis import is currently persisted by server-side JSON state,
-- not by these Supabase tables; these results only confirm existing table/level
-- schema and do not imply those API records are synchronized to SQL.
SELECT
  pg_catalog.to_regclass('public.lessons') IS NOT NULL AS lessons_table_exists,
  pg_catalog.to_regclass('public.lesson_versions') IS NOT NULL AS lesson_versions_table_exists,
  pg_catalog.to_regclass('public.lesson_sections') IS NOT NULL AS lesson_sections_table_exists,
  pg_catalog.to_regclass('public.lesson_sources') IS NOT NULL AS lesson_sources_table_exists,
  pg_catalog.to_regclass('public.hymns') IS NOT NULL AS hymns_table_exists,
  pg_catalog.to_regclass('public.hymns_memberships') IS NOT NULL AS hymns_memberships_table_exists,
  pg_catalog.to_regclass('public.coptic_taxis_items') IS NOT NULL AS taxis_items_table_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hymns'
      AND column_name = 'level'
  ) AS hymns_level_column_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'coptic_taxis_items'
      AND column_name = 'level'
  ) AS taxis_level_column_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'hymns_taxis_level'
  ) AS shared_profile_level_column_exists;

-- Optional legacy-reference counts. Run only for tables confirmed present in
-- the earlier results; these are intentionally separate so this verification
-- script remains usable while a database is missing an earlier phase.
-- SELECT 'feed_posts.media_url' AS reference_location, COUNT(*) AS legacy_upload_reference_count
-- FROM public.feed_posts WHERE media_url LIKE '%/uploads/%';
-- SELECT 'lesson_sources.file_url' AS reference_location, COUNT(*) AS legacy_upload_reference_count
-- FROM public.lesson_sources WHERE file_url LIKE '%/uploads/%';
-- SELECT 'feed_post_attachments.external_url' AS reference_location, COUNT(*) AS legacy_upload_reference_count
-- FROM public.feed_post_attachments WHERE external_url LIKE '%/uploads/%';
