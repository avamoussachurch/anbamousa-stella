-- Read-only live preflight for Phase 18 Hymns/Taxis persistence and Phase 19
-- curriculum access isolation. Run the entire file in Supabase SQL Editor.
--
-- Every executable statement below is SELECT-only. The script does not read
-- credential tables, auth tokens, or individual profile/member identifiers.
-- It does not apply either migration. Review every FAIL and REVIEW result.

-- 1. Migration history visibility. A missing history table is REVIEW, not
-- proof that a migration is absent: deployments may track it elsewhere.
SELECT
  CASE
    WHEN pg_catalog.to_regclass('supabase_migrations.schema_migrations') IS NULL
      THEN 'REVIEW'
    ELSE 'PASS'
  END AS result,
  'Migration history catalog' AS check_name,
  CASE
    WHEN pg_catalog.to_regclass('supabase_migrations.schema_migrations') IS NULL
      THEN 'supabase_migrations.schema_migrations is not visible; verify migration history through the Supabase project migration workflow.'
    ELSE 'Migration history table is visible; inspect the next result for recorded Phase 18/19 entries.'
  END AS details;

SELECT
  'REVIEW' AS result,
  'Recorded Phase 18/19 migration entries' AS check_name,
  CASE
    WHEN pg_catalog.to_regclass('supabase_migrations.schema_migrations') IS NULL
      THEN 'Not queryable from this script because the history table is absent or not visible.'
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'supabase_migrations'
        AND table_name = 'schema_migrations'
        AND column_name = 'version'
    ) AND EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'supabase_migrations'
        AND table_name = 'schema_migrations'
        AND column_name = 'name'
    ) THEN pg_catalog.query_to_xml(
      'SELECT version::text, name::text FROM supabase_migrations.schema_migrations WHERE version::text ILIKE ''%phase18%'' OR version::text ILIKE ''%phase19%'' OR name::text ILIKE ''%phase18%'' OR name::text ILIKE ''%phase19%'' ORDER BY version::text',
      false, true, ''
    )::text
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'supabase_migrations'
        AND table_name = 'schema_migrations'
        AND column_name = 'version'
    ) THEN pg_catalog.query_to_xml(
      'SELECT version::text FROM supabase_migrations.schema_migrations ORDER BY version::text DESC LIMIT 20',
      false,
      true,
      ''
    )::text
    ELSE 'History table is visible but has no version column; inspect its schema before interpreting migration state.'
  END AS details;

-- 2. Required objects. Phase 18 requires the two Phase 17 curriculum tables,
-- Phase 4 ownership function, Phase 13 assigned-role function, and the Phase
-- 7/8 profile-level fields. Phase 19 depends on Phases 3B, 4, 5, and 13.
WITH expected(object_name, object_kind, required_by, expected_signature) AS (
  VALUES
    ('public.profiles', 'table', 'Phase 18; Phases 7/8/13/17', NULL::text),
    ('public.hymns', 'table', 'Phase 18; Phase 17 curriculum prerequisites', NULL::text),
    ('public.coptic_taxis_items', 'table', 'Phase 18; Phase 17 curriculum prerequisites', NULL::text),
    ('public.lessons', 'table', 'Phase 19; Phase 4', NULL::text),
    ('public.lesson_versions', 'table', 'Phase 19; Phase 5', NULL::text),
    ('public.lesson_sections', 'table', 'Phase 19; Phase 5', NULL::text),
    ('public.lesson_sources', 'table', 'Phase 19; Phase 5', NULL::text),
    ('public.lesson_section_sources', 'table', 'Phase 19; Phase 5', NULL::text),
    ('public.profile_role_assignments', 'table', 'Phases 18/19; Phase 13', NULL::text),
    ('public.class_memberships', 'table', 'Phase 19; Phase 3B', NULL::text),
    ('public.class_instances', 'table', 'Phase 19; Phase 3B', NULL::text),
    ('public.church_years', 'table', 'Phase 19; Phase 3B', NULL::text),
    ('public.servant_class_assignments', 'table', 'Phase 19; Phase 3B', NULL::text),
    ('public.user_relationships', 'table', 'Phase 19 parent read path; Phase 4', NULL::text),
    ('public.has_role(text)', 'function', 'Phases 18/19; Phase 13', 'public.has_role(text)'),
    ('public.set_text_content_owner()', 'function', 'Phase 18 insert ownership; Phase 4/17', 'public.set_text_content_owner()'),
    ('public.activate_new_church_year(text,text,date,date)', 'function', 'Phase 17 assigned-role prerequisite; Phase 3B/11', 'public.activate_new_church_year(text,text,date,date)'),
    ('public.join_class_by_code(text)', 'function', 'Phase 17 assigned-role prerequisite; Phase 3B', 'public.join_class_by_code(text)'),
    ('public.provision_verified_family_relationship(uuid,uuid,text)', 'function', 'Phase 17 assigned-role prerequisite; Phase 4', 'public.provision_verified_family_relationship(uuid,uuid,text)'),
    ('public.record_lesson_completion(uuid,uuid,timestamp with time zone)', 'function', 'Phase 17 assigned-role prerequisite; Phase 6', 'public.record_lesson_completion(uuid,uuid,timestamp with time zone)'),
    ('public.lesson_publication_jobs', 'table', 'Phase 17 assigned-role prerequisite; Phase 11', NULL::text),
    ('public.publish_lesson_version_immediately(uuid,uuid,uuid)', 'function', 'Phase 17 assigned-role prerequisite; Phase 11', 'public.publish_lesson_version_immediately(uuid,uuid,uuid)'),
    ('public.schedule_lesson_publication(uuid,uuid,timestamp with time zone)', 'function', 'Phase 17 assigned-role prerequisite; Phase 11', 'public.schedule_lesson_publication(uuid,uuid,timestamp with time zone)'),
    ('public.reschedule_lesson_publication(uuid,timestamp with time zone)', 'function', 'Phase 17 assigned-role prerequisite; Phase 11', 'public.reschedule_lesson_publication(uuid,timestamp with time zone)'),
    ('public.cancel_lesson_publication(uuid)', 'function', 'Phase 17 assigned-role prerequisite; Phase 11', 'public.cancel_lesson_publication(uuid)'),
    ('public.list_lesson_publications()', 'function', 'Phase 17 assigned-role prerequisite; Phase 11', 'public.list_lesson_publications()'),
    ('public.process_due_lesson_publications()', 'function', 'Phase 17 assigned-role prerequisite; Phase 11', 'public.process_due_lesson_publications()')
),
checked AS (
  SELECT
    expected.*,
    CASE
      WHEN object_kind = 'table' THEN EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class AS c
        WHERE c.oid = pg_catalog.to_regclass(object_name)
          AND c.relkind IN ('r', 'p')
      )
      ELSE pg_catalog.to_regprocedure(expected_signature) IS NOT NULL
    END AS exists_now
  FROM expected
)
SELECT
  CASE WHEN exists_now THEN 'PASS' ELSE 'FAIL' END AS result,
  required_by,
  object_name AS required_object,
  object_kind,
  exists_now AS exists_now
FROM checked
ORDER BY required_by, object_name;

SELECT
  CASE WHEN r.oid IS NULL THEN 'FAIL' ELSE 'PASS' END AS result,
  expected.role_name,
  r.rolcanlogin AS can_login,
  r.rolsuper AS is_superuser,
  r.rolbypassrls AS bypasses_rls
FROM (VALUES ('anon'::text), ('authenticated'), ('service_role')) AS expected(role_name)
LEFT JOIN pg_catalog.pg_roles AS r ON r.rolname = expected.role_name
ORDER BY expected.role_name;

-- Phase 19 helper functions are created by that migration, not prerequisites.
SELECT
  'REVIEW' AS result,
  'Phase 19 migration-defined functions' AS check_name,
  'Expected definitions: public.curriculum_grade_class_group(text), public.can_review_curriculum_lesson(uuid), public.can_read_curriculum_lesson(uuid), public.can_read_curriculum_source(uuid). Their absence before applying Phase 19 is expected.' AS details;

-- 3. Required columns and live types. Phase 18's post-migration additions are
-- marked EXPECTED_AFTER_PHASE18. All other listed columns are prerequisites.
WITH expected(table_name, column_name, expected_type, expected_udt, required_by, timing) AS (
  VALUES
    ('profiles', 'id', 'uuid', 'uuid', 'Phase 18/19', 'PREREQUISITE'),
    ('profiles', 'grade', 'text', 'text', 'Phase 18/19; Phases 7/8', 'PREREQUISITE'),
    ('profiles', 'hymns_taxis_level', 'integer', 'int4', 'Phase 18; Phases 7/8', 'PREREQUISITE'),

    ('hymns', 'id', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('hymns', 'title_ar', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('hymns', 'title_en', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('hymns', 'title_coptic', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('hymns', 'season_ar', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('hymns', 'season_en', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('hymns', 'occasion_tag', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('hymns', 'difficulty', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('hymns', 'level', 'integer', 'int4', 'Phase 18; Phases 7/8/17', 'PREREQUISITE'),
    ('hymns', 'audio_url', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('hymns', 'duration_sec', 'integer', 'int4', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('hymns', 'hazat_explanation_ar', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('hymns', 'hazat_explanation_en', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('hymns', 'lines', 'jsonb', 'jsonb', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('hymns', 'status', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('hymns', 'version', 'integer', 'int4', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('hymns', 'created_by', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('hymns', 'created_at', 'timestamp with time zone', 'timestamptz', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('hymns', 'updated_at', 'timestamp with time zone', 'timestamptz', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('hymns', 'pdf_url', 'text', 'text', 'Phase 18', 'EXPECTED_AFTER_PHASE18'),
    ('hymns', 'sheet_music_url', 'text', 'text', 'Phase 18', 'EXPECTED_AFTER_PHASE18'),
    ('hymns', 'history', 'jsonb', 'jsonb', 'Phase 18', 'EXPECTED_AFTER_PHASE18'),
    ('hymns', 'published_at', 'timestamp with time zone', 'timestamptz', 'Phase 18', 'EXPECTED_AFTER_PHASE18'),

    ('coptic_taxis_items', 'id', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('coptic_taxis_items', 'title_ar', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('coptic_taxis_items', 'title_en', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('coptic_taxis_items', 'title_coptic', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('coptic_taxis_items', 'category', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('coptic_taxis_items', 'season', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('coptic_taxis_items', 'level', 'integer', 'int4', 'Phase 18; Phases 7/17', 'PREREQUISITE'),
    ('coptic_taxis_items', 'target_audience', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('coptic_taxis_items', 'status', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('coptic_taxis_items', 'sections', 'jsonb', 'jsonb', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('coptic_taxis_items', 'attachments', 'jsonb', 'jsonb', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('coptic_taxis_items', 'version', 'integer', 'int4', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('coptic_taxis_items', 'created_by', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('coptic_taxis_items', 'reviewed_by', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('coptic_taxis_items', 'published_by', 'text', 'text', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('coptic_taxis_items', 'created_at', 'timestamp with time zone', 'timestamptz', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('coptic_taxis_items', 'updated_at', 'timestamp with time zone', 'timestamptz', 'Phase 18; Phase 17', 'PREREQUISITE'),
    ('coptic_taxis_items', 'audience_detail', 'text', 'text', 'Phase 18', 'EXPECTED_AFTER_PHASE18'),
    ('coptic_taxis_items', 'summary_ar', 'text', 'text', 'Phase 18', 'EXPECTED_AFTER_PHASE18'),
    ('coptic_taxis_items', 'summary_en', 'text', 'text', 'Phase 18', 'EXPECTED_AFTER_PHASE18'),
    ('coptic_taxis_items', 'source_references', 'jsonb', 'jsonb', 'Phase 18', 'EXPECTED_AFTER_PHASE18'),
    ('coptic_taxis_items', 'history', 'jsonb', 'jsonb', 'Phase 18', 'EXPECTED_AFTER_PHASE18'),
    ('coptic_taxis_items', 'approved_by', 'text', 'text', 'Phase 18', 'EXPECTED_AFTER_PHASE18'),
    ('coptic_taxis_items', 'published_at', 'timestamp with time zone', 'timestamptz', 'Phase 18', 'EXPECTED_AFTER_PHASE18'),
    ('coptic_taxis_items', 'unpublished_by', 'text', 'text', 'Phase 18', 'EXPECTED_AFTER_PHASE18'),
    ('coptic_taxis_items', 'unpublished_at', 'timestamp with time zone', 'timestamptz', 'Phase 18', 'EXPECTED_AFTER_PHASE18'),

    ('lessons', 'id', 'uuid', 'uuid', 'Phase 19; Phase 4', 'PREREQUISITE'),
    ('lessons', 'created_by', 'uuid', 'uuid', 'Phase 19; Phase 4', 'PREREQUISITE'),
    ('lessons', 'grade_level', 'text', 'text', 'Phase 19; Phase 4', 'PREREQUISITE'),
    ('lessons', 'active_version_id', 'uuid', 'uuid', 'Phase 19; Phase 5', 'PREREQUISITE'),
    ('lessons', 'lesson_status', 'text', 'text', 'Phase 19; Phase 5', 'PREREQUISITE'),
    ('lessons', 'status', 'text', 'text', 'Phase 19; Phase 5', 'PREREQUISITE'),
    ('lesson_versions', 'id', 'uuid', 'uuid', 'Phase 19; Phase 5', 'PREREQUISITE'),
    ('lesson_versions', 'lesson_id', 'uuid', 'uuid', 'Phase 19; Phase 5', 'PREREQUISITE'),
    ('lesson_versions', 'status', 'text', 'text', 'Phase 19; Phase 5', 'PREREQUISITE'),
    ('lesson_sections', 'id', 'uuid', 'uuid', 'Phase 19; Phase 5', 'PREREQUISITE'),
    ('lesson_sections', 'lesson_version_id', 'uuid', 'uuid', 'Phase 19; Phase 5', 'PREREQUISITE'),
    ('lesson_sources', 'id', 'uuid', 'uuid', 'Phase 19; Phase 5', 'PREREQUISITE'),
    ('lesson_sources', 'lesson_id', 'uuid', 'uuid', 'Phase 19; Phase 5', 'PREREQUISITE'),
    ('lesson_section_sources', 'section_id', 'uuid', 'uuid', 'Phase 19; Phase 5', 'PREREQUISITE'),
    ('lesson_section_sources', 'source_id', 'uuid', 'uuid', 'Phase 19; Phase 5', 'PREREQUISITE'),
    ('profile_role_assignments', 'user_id', 'uuid', 'uuid', 'Phases 18/19; Phase 13', 'PREREQUISITE'),
    ('profile_role_assignments', 'role', 'text', 'text', 'Phases 18/19; Phase 13', 'PREREQUISITE'),
    ('profile_role_assignments', 'revoked_at', 'timestamp with time zone', 'timestamptz', 'Phases 18/19; Phase 13', 'PREREQUISITE'),
    ('class_memberships', 'student_id', 'uuid', 'uuid', 'Phase 19; Phase 3B', 'PREREQUISITE'),
    ('class_memberships', 'church_year_id', 'text', 'text', 'Phase 19; Phase 3B', 'PREREQUISITE'),
    ('class_memberships', 'class_instance_id', 'text', 'text', 'Phase 19; Phase 3B', 'PREREQUISITE'),
    ('class_memberships', 'exact_grade', 'text', 'text', 'Phase 19; Phase 3B', 'PREREQUISITE'),
    ('class_memberships', 'status', 'text', 'text', 'Phase 19; Phase 3B', 'PREREQUISITE'),
    ('class_instances', 'id', 'text', 'text', 'Phase 19; Phase 3B', 'PREREQUISITE'),
    ('class_instances', 'church_year_id', 'text', 'text', 'Phase 19; Phase 3B', 'PREREQUISITE'),
    ('class_instances', 'class_group_id', 'text', 'text', 'Phase 19; Phase 3B', 'PREREQUISITE'),
    ('church_years', 'id', 'text', 'text', 'Phase 19; Phase 3B', 'PREREQUISITE'),
    ('church_years', 'is_active', 'boolean', 'bool', 'Phase 19; Phase 3B', 'PREREQUISITE'),
    ('servant_class_assignments', 'servant_id', 'uuid', 'uuid', 'Phase 19; Phase 3B', 'PREREQUISITE'),
    ('servant_class_assignments', 'church_year_id', 'text', 'text', 'Phase 19; Phase 3B', 'PREREQUISITE'),
    ('servant_class_assignments', 'class_instance_id', 'text', 'text', 'Phase 19; Phase 3B', 'PREREQUISITE'),
    ('servant_class_assignments', 'is_active', 'boolean', 'bool', 'Phase 19; Phase 3B', 'PREREQUISITE'),
    ('user_relationships', 'parent_id', 'uuid', 'uuid', 'Phase 19; Phase 4', 'PREREQUISITE'),
    ('user_relationships', 'child_id', 'uuid', 'uuid', 'Phase 19; Phase 4', 'PREREQUISITE'),
    ('user_relationships', 'relationship_type', 'text', 'text', 'Phase 19; Phase 4', 'PREREQUISITE'),
    ('user_relationships', 'verified_at', 'timestamp with time zone', 'timestamptz', 'Phase 19; Phase 4', 'PREREQUISITE')
),
actual AS (
  SELECT
    e.*,
    c.data_type AS actual_type,
    c.udt_name AS actual_udt,
    c.is_nullable,
    c.column_default
  FROM expected AS e
  LEFT JOIN information_schema.columns AS c
    ON c.table_schema = 'public'
   AND c.table_name = e.table_name
   AND c.column_name = e.column_name
)
SELECT
  CASE
    WHEN actual_type IS NULL AND timing = 'EXPECTED_AFTER_PHASE18' THEN 'REVIEW'
    WHEN actual_type IS NULL THEN 'FAIL'
    WHEN actual_type = expected_type AND actual_udt = expected_udt THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  required_by,
  timing,
  'public.' || table_name || '.' || column_name AS required_column,
  expected_type || ' (' || expected_udt || ')' AS expected_type,
  CASE WHEN actual_type IS NULL THEN 'MISSING' ELSE actual_type || ' (' || actual_udt || ')' END AS actual_type,
  is_nullable,
  column_default
FROM actual
ORDER BY required_by, table_name, column_name;

-- Additional Phase 18 invariants: status columns are NOT NULL; the Phase 8
-- shared level constraint and Phase 17 Taxis level constraint should be valid.
SELECT
  CASE WHEN count(*) = 2 AND bool_and(is_nullable = 'NO') THEN 'PASS' ELSE 'FAIL' END AS result,
  'Phase 18 status nullability' AS check_name,
  pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'table', table_name,
      'column', column_name,
      'data_type', data_type,
      'is_nullable', is_nullable
    )
    ORDER BY table_name
  ) AS details
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('hymns', 'coptic_taxis_items')
  AND column_name = 'status';

SELECT
  CASE WHEN count(*) FILTER (WHERE convalidated) = 2 THEN 'PASS' ELSE 'REVIEW' END AS result,
  'Phase 7/8/17 level constraints' AS check_name,
  pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'table', n.nspname || '.' || c.relname,
      'constraint', con.conname,
      'validated', con.convalidated,
      'definition', pg_catalog.pg_get_constraintdef(con.oid)
    )
    ORDER BY c.relname, con.conname
  ) AS details
FROM (VALUES
  ('public', 'profiles', 'profiles_hymns_taxis_level_valid'),
  ('public', 'coptic_taxis_items', 'coptic_taxis_items_level_valid')
) AS expected(schema_name, table_name, constraint_name)
LEFT JOIN pg_catalog.pg_namespace AS n ON n.nspname = expected.schema_name
LEFT JOIN pg_catalog.pg_class AS c ON c.relnamespace = n.oid AND c.relname = expected.table_name
LEFT JOIN pg_catalog.pg_constraint AS con ON con.conrelid = c.oid AND con.conname = expected.constraint_name;

-- 4. Function signatures and selected definition checks. Function bodies are
-- not printed; boolean indicators are used instead.
SELECT
  CASE
    WHEN p.oid IS NOT NULL
      AND expected.signature = 'public.set_text_content_owner()'
      AND NOT (
        pg_catalog.pg_get_functiondef(p.oid) ~* 'NEW[.]created_by'
        AND pg_catalog.pg_get_functiondef(p.oid) ~* 'auth[.]uid'
      ) THEN 'FAIL'
    WHEN p.oid IS NOT NULL
      AND expected.signature = 'public.has_role(text)'
      AND NOT (
        p.prosecdef
        AND pg_catalog.pg_get_functiondef(p.oid) ~* 'profile_role_assignments'
        AND pg_catalog.pg_get_functiondef(p.oid) ~* 'revoked_at'
      ) THEN 'FAIL'
    WHEN p.oid IS NOT NULL AND expected.preexisting THEN 'PASS'
    WHEN p.oid IS NULL AND expected.preexisting THEN 'FAIL'
    ELSE 'REVIEW'
  END AS result,
  expected.required_by,
  CASE WHEN expected.preexisting THEN 'PREREQUISITE' ELSE 'MIGRATION_DEFINED' END AS timing,
  expected.signature AS required_signature,
  p.prokind AS kind,
  l.lanname AS language,
  p.prosecdef AS security_definer,
  CASE
    WHEN expected.signature = 'public.set_text_content_owner()' AND p.oid IS NOT NULL
      THEN (pg_catalog.pg_get_functiondef(p.oid) ~* 'NEW[.]created_by')
       AND (pg_catalog.pg_get_functiondef(p.oid) ~* 'auth[.]uid')
    WHEN expected.signature = 'public.has_role(text)' AND p.oid IS NOT NULL
      THEN (pg_catalog.pg_get_functiondef(p.oid) ~* 'profile_role_assignments')
       AND (pg_catalog.pg_get_functiondef(p.oid) ~* 'revoked_at')
    ELSE NULL
  END AS expected_definition_pattern_found
FROM (
  VALUES
    ('public.has_role(text)', 'Phase 18/19; Phase 13', true),
    ('public.set_text_content_owner()', 'Phase 18; Phase 4/17', true),
    ('public.guard_coptic_taxis_workflow_update()', 'Created by Phase 18; absence before application is expected', false),
    ('public.curriculum_grade_class_group(text)', 'Created by Phase 19; absence before application is expected', false),
    ('public.can_review_curriculum_lesson(uuid)', 'Created by Phase 19; absence before application is expected', false),
    ('public.can_read_curriculum_lesson(uuid)', 'Created by Phase 19; absence before application is expected', false),
    ('public.can_read_curriculum_source(uuid)', 'Created by Phase 19; absence before application is expected', false),
    ('public.activate_new_church_year(text,text,date,date)', 'Phase 17 assigned-role prerequisite; Phase 3B/11', true),
    ('public.join_class_by_code(text)', 'Phase 17 assigned-role prerequisite; Phase 3B', true),
    ('public.provision_verified_family_relationship(uuid,uuid,text)', 'Phase 17 assigned-role prerequisite; Phase 4', true),
    ('public.record_lesson_completion(uuid,uuid,timestamptz)', 'Phase 17 assigned-role prerequisite; Phase 6', true),
    ('public.publish_lesson_version_immediately(uuid,uuid,uuid)', 'Phase 17 assigned-role prerequisite; Phase 11', true),
    ('public.schedule_lesson_publication(uuid,uuid,timestamptz)', 'Phase 17 assigned-role prerequisite; Phase 11', true),
    ('public.reschedule_lesson_publication(uuid,timestamptz)', 'Phase 17 assigned-role prerequisite; Phase 11', true),
    ('public.cancel_lesson_publication(uuid)', 'Phase 17 assigned-role prerequisite; Phase 11', true),
    ('public.list_lesson_publications()', 'Phase 17 assigned-role prerequisite; Phase 11', true),
    ('public.process_due_lesson_publications()', 'Phase 17 assigned-role prerequisite; Phase 11', true)
) AS expected(signature, required_by, preexisting)
LEFT JOIN pg_catalog.pg_proc AS p
  ON p.oid = pg_catalog.to_regprocedure(expected.signature)
LEFT JOIN pg_catalog.pg_language AS l ON l.oid = p.prolang
ORDER BY expected.required_by, expected.signature;

-- 5. RLS status for every table touched by Phase 18/19 and the tables Phase 19
-- reads to authorize students, parents, and teachers.
WITH affected(table_name, required_by, rls_required) AS (
  VALUES
    ('hymns', 'Phase 18', true),
    ('coptic_taxis_items', 'Phase 18', true),
    ('lessons', 'Phase 19', true),
    ('lesson_versions', 'Phase 19', true),
    ('lesson_sections', 'Phase 19', true),
    ('lesson_sources', 'Phase 19', true),
    ('lesson_section_sources', 'Phase 19', true),
    ('profiles', 'Phase 18/19 authorization reads', false),
    ('profile_role_assignments', 'Phase 18/19 authorization reads', false),
    ('class_memberships', 'Phase 19 authorization reads', false),
    ('class_instances', 'Phase 19 authorization reads', false),
    ('church_years', 'Phase 19 authorization reads', false),
    ('servant_class_assignments', 'Phase 19 authorization reads', false),
    ('user_relationships', 'Phase 19 parent read path', false)
)
SELECT
  CASE
    WHEN c.oid IS NULL THEN 'FAIL'
    WHEN NOT affected.rls_required THEN 'REVIEW'
    WHEN c.relrowsecurity THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  affected.required_by,
  'public.' || affected.table_name AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS force_rls
FROM affected
LEFT JOIN pg_catalog.pg_class AS c
  ON c.oid = pg_catalog.to_regclass('public.' || affected.table_name)
ORDER BY affected.required_by, affected.table_name;

-- 6. Every existing policy on the seven content tables; expressions and role
-- names come from pg_policies. This exposes no row data.
SELECT
  CASE
    WHEN qual = 'true' OR with_check = 'true' THEN 'REVIEW'
    ELSE 'REVIEW'
  END AS result,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'hymns',
    'coptic_taxis_items',
    'lessons',
    'lesson_versions',
    'lesson_sections',
    'lesson_sources',
    'lesson_section_sources'
  )
ORDER BY tablename, policyname;

SELECT
  CASE WHEN count(*) = 0 THEN 'REVIEW' ELSE 'REVIEW' END AS result,
  'Policy inventory completeness' AS check_name,
  count(*) AS visible_policy_count,
  'No rows means no policies are visible to the SQL Editor role; confirm with a project owner before relying on an empty result.' AS details
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'hymns',
    'coptic_taxis_items',
    'lessons',
    'lesson_versions',
    'lesson_sections',
    'lesson_sources',
    'lesson_section_sources'
  );

-- 7. All triggers on the affected content tables plus explicit ownership and
-- Phase 18 workflow-trigger checks. Trigger definitions identify behavior;
-- status decodes PostgreSQL's enabled/disabled mode.
SELECT
  CASE WHEN t.tgname IS NULL THEN 'REVIEW' ELSE 'REVIEW' END AS result,
  n.nspname || '.' || c.relname AS table_name,
  t.tgname AS trigger_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'ENABLED_ORIGIN'
    WHEN 'A' THEN 'ENABLED_ALWAYS'
    WHEN 'R' THEN 'ENABLED_REPLICA_ONLY'
    WHEN 'D' THEN 'DISABLED'
    ELSE 'UNKNOWN'
  END AS enabled_status,
  p.oid::pg_catalog.regprocedure AS function_signature,
  pg_catalog.pg_get_triggerdef(t.oid, true) AS trigger_definition
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
LEFT JOIN pg_catalog.pg_trigger AS t ON t.tgrelid = c.oid AND NOT t.tgisinternal
LEFT JOIN pg_catalog.pg_proc AS p ON p.oid = t.tgfoid
WHERE n.nspname = 'public'
  AND c.relname IN (
    'hymns',
    'coptic_taxis_items',
    'lessons',
    'lesson_versions',
    'lesson_sections',
    'lesson_sources',
    'lesson_section_sources'
  )
ORDER BY c.relname, t.tgname;

WITH expected(table_name, trigger_name, expected_function, required_by, preexisting) AS (
  VALUES
    ('hymns', 'hymns_set_owner', 'public.set_text_content_owner()', 'Phase 18 insert ownership', true),
    ('coptic_taxis_items', 'coptic_taxis_items_set_owner', 'public.set_text_content_owner()', 'Phase 18 insert ownership', true),
    ('coptic_taxis_items', 'coptic_taxis_items_guard_workflow_update', 'public.guard_coptic_taxis_workflow_update()', 'Phase 18 workflow guard; created by Phase 18', false)
)
SELECT
  CASE
    WHEN t.oid IS NULL AND NOT expected.preexisting THEN 'REVIEW'
    WHEN t.oid IS NULL THEN 'FAIL'
    WHEN t.tgenabled IN ('O', 'A')
      AND p.oid = pg_catalog.to_regprocedure(expected.expected_function)
      AND (t.tgtype & 1) = 1
      AND (
        (expected.trigger_name <> 'coptic_taxis_items_guard_workflow_update' AND (t.tgtype & 7) = 7)
        OR
        (expected.trigger_name = 'coptic_taxis_items_guard_workflow_update' AND (t.tgtype & 19) = 19)
      )
      THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  expected.required_by,
  CASE WHEN expected.preexisting THEN 'PREREQUISITE' ELSE 'MIGRATION_DEFINED' END AS timing,
  'public.' || expected.table_name AS table_name,
  expected.trigger_name,
  expected.expected_function,
  CASE t.tgenabled
    WHEN 'O' THEN 'ENABLED_ORIGIN'
    WHEN 'A' THEN 'ENABLED_ALWAYS'
    WHEN 'R' THEN 'ENABLED_REPLICA_ONLY'
    WHEN 'D' THEN 'DISABLED'
    ELSE 'MISSING'
  END AS actual_enabled_status,
  p.oid::pg_catalog.regprocedure AS actual_function,
  CASE WHEN t.oid IS NULL THEN NULL ELSE pg_catalog.pg_get_triggerdef(t.oid, true) END AS definition
FROM expected
LEFT JOIN pg_catalog.pg_trigger AS t
  ON t.tgrelid = pg_catalog.to_regclass('public.' || expected.table_name)
 AND t.tgname = expected.trigger_name
 AND NOT t.tgisinternal
LEFT JOIN pg_catalog.pg_proc AS p ON p.oid = t.tgfoid
ORDER BY expected.table_name, expected.trigger_name;

-- 8. Direct table and column ACLs for PUBLIC, anon, authenticated, and
-- service_role, plus effective privilege checks (which include inherited role
-- membership). This is especially important for Phase 18 write revocations.
WITH affected(table_name) AS (
  VALUES
    ('hymns'),
    ('coptic_taxis_items'),
    ('lessons'),
    ('lesson_versions'),
    ('lesson_sections'),
    ('lesson_sources'),
    ('lesson_section_sources')
),
target_roles(role_name) AS (
  VALUES ('PUBLIC'::text), ('anon'), ('authenticated'), ('service_role')
)
SELECT
  'REVIEW' AS result,
  affected.table_name,
  role_name,
  privilege_type,
  is_grantable,
  'DIRECT ACL' AS privilege_source
FROM affected
CROSS JOIN LATERAL (
  SELECT
    CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(acl.grantee) END AS role_name,
    acl.privilege_type,
    acl.is_grantable
  FROM pg_catalog.pg_class AS c
  CROSS JOIN LATERAL pg_catalog.aclexplode(
    COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))
  ) AS acl
  WHERE c.oid = pg_catalog.to_regclass('public.' || affected.table_name)
) AS grants
WHERE role_name IN (SELECT target_roles.role_name FROM target_roles)
ORDER BY affected.table_name, role_name, privilege_type;

WITH affected(table_name) AS (
  VALUES
    ('hymns'),
    ('coptic_taxis_items'),
    ('lessons'),
    ('lesson_versions'),
    ('lesson_sections'),
    ('lesson_sources'),
    ('lesson_section_sources')
),
target_roles(role_name) AS (
  VALUES ('anon'::text), ('authenticated'), ('service_role')
),
privileges(privilege_type) AS (
  VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')
)
SELECT
  'REVIEW' AS result,
  affected.table_name,
  target_roles.role_name,
  privileges.privilege_type,
  CASE
    WHEN pg_catalog.to_regclass('public.' || affected.table_name) IS NOT NULL
      AND EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = target_roles.role_name)
      THEN pg_catalog.has_table_privilege(
        target_roles.role_name,
        'public.' || affected.table_name,
        privileges.privilege_type
      )
    ELSE false
  END AS effective_privilege_including_membership
FROM affected
CROSS JOIN target_roles
CROSS JOIN privileges
ORDER BY affected.table_name, target_roles.role_name, privileges.privilege_type;

SELECT
  'REVIEW' AS result,
  c.relname AS table_name,
  a.attname AS column_name,
  CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(acl.grantee) END AS grantee,
  acl.privilege_type,
  acl.is_grantable
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_attribute AS a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) AS acl
WHERE n.nspname = 'public'
  AND c.relname IN (
    'hymns',
    'coptic_taxis_items',
    'lessons',
    'lesson_versions',
    'lesson_sections',
    'lesson_sources',
    'lesson_section_sources'
  )
  AND (acl.grantee = 0 OR pg_catalog.pg_get_userbyid(acl.grantee) IN ('anon', 'authenticated', 'service_role'))
ORDER BY c.relname, a.attname, grantee, acl.privilege_type;

WITH affected(table_name) AS (
  VALUES
    ('hymns'),
    ('coptic_taxis_items'),
    ('lessons'),
    ('lesson_versions'),
    ('lesson_sections'),
    ('lesson_sources'),
    ('lesson_section_sources')
),
target_roles(role_name) AS (
  VALUES ('PUBLIC'::text), ('anon'), ('authenticated'), ('service_role')
),
table_acl AS (
  SELECT
    c.relname AS table_name,
    CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(acl.grantee) END AS role_name,
    pg_catalog.string_agg(acl.privilege_type, ', ' ORDER BY acl.privilege_type) AS privileges
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL pg_catalog.aclexplode(
    COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))
  ) AS acl
  WHERE n.nspname = 'public'
    AND c.relname IN (SELECT table_name FROM affected)
    AND (acl.grantee = 0 OR pg_catalog.pg_get_userbyid(acl.grantee) IN ('anon', 'authenticated', 'service_role'))
  GROUP BY c.relname, role_name
),
column_acl AS (
  SELECT
    c.relname AS table_name,
    CASE WHEN acl.grantee = 0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(acl.grantee) END AS role_name,
    count(*)::bigint AS column_privilege_count,
    pg_catalog.string_agg(a.attname || ':' || acl.privilege_type, ', ' ORDER BY a.attname, acl.privilege_type) AS privileges
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_attribute AS a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
  CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) AS acl
  WHERE n.nspname = 'public'
    AND c.relname IN (SELECT table_name FROM affected)
    AND (acl.grantee = 0 OR pg_catalog.pg_get_userbyid(acl.grantee) IN ('anon', 'authenticated', 'service_role'))
  GROUP BY c.relname, role_name
)
SELECT
  'REVIEW' AS result,
  affected.table_name,
  target_roles.role_name,
  COALESCE(table_acl.privileges, '(no direct table ACL entry)') AS direct_table_privileges,
  COALESCE(column_acl.column_privilege_count, 0) AS direct_column_privilege_count,
  COALESCE(column_acl.privileges, '(no direct column ACL entry)') AS direct_column_privileges
FROM affected
CROSS JOIN target_roles
LEFT JOIN table_acl
  ON table_acl.table_name = affected.table_name
 AND table_acl.role_name = target_roles.role_name
LEFT JOIN column_acl
  ON column_acl.table_name = affected.table_name
 AND column_acl.role_name = target_roles.role_name
ORDER BY affected.table_name, target_roles.role_name;

-- Phase 18 must leave no authenticated table-level INSERT/UPDATE/DELETE and
-- then grant only the column lists below. This output compares effective
-- authenticated write privileges with the migration's approved column lists.
WITH allowed(table_name, column_name, privilege_type) AS (
  VALUES
    ('hymns', 'id', 'INSERT'),
    ('hymns', 'title_ar', 'INSERT'), ('hymns', 'title_en', 'INSERT'), ('hymns', 'title_coptic', 'INSERT'),
    ('hymns', 'season_ar', 'INSERT'), ('hymns', 'season_en', 'INSERT'), ('hymns', 'occasion_tag', 'INSERT'),
    ('hymns', 'difficulty', 'INSERT'), ('hymns', 'level', 'INSERT'), ('hymns', 'audio_url', 'INSERT'),
    ('hymns', 'pdf_url', 'INSERT'), ('hymns', 'sheet_music_url', 'INSERT'), ('hymns', 'duration_sec', 'INSERT'),
    ('hymns', 'hazat_explanation_ar', 'INSERT'), ('hymns', 'hazat_explanation_en', 'INSERT'),
    ('hymns', 'lines', 'INSERT'), ('hymns', 'version', 'INSERT'), ('hymns', 'history', 'INSERT'),
    ('hymns', 'title_ar', 'UPDATE'), ('hymns', 'title_en', 'UPDATE'), ('hymns', 'title_coptic', 'UPDATE'),
    ('hymns', 'season_ar', 'UPDATE'), ('hymns', 'season_en', 'UPDATE'), ('hymns', 'occasion_tag', 'UPDATE'),
    ('hymns', 'difficulty', 'UPDATE'), ('hymns', 'level', 'UPDATE'), ('hymns', 'audio_url', 'UPDATE'),
    ('hymns', 'pdf_url', 'UPDATE'), ('hymns', 'sheet_music_url', 'UPDATE'), ('hymns', 'duration_sec', 'UPDATE'),
    ('hymns', 'hazat_explanation_ar', 'UPDATE'), ('hymns', 'hazat_explanation_en', 'UPDATE'),
    ('hymns', 'lines', 'UPDATE'), ('hymns', 'status', 'UPDATE'), ('hymns', 'version', 'UPDATE'),
    ('hymns', 'history', 'UPDATE'), ('hymns', 'published_at', 'UPDATE'), ('hymns', 'updated_at', 'UPDATE'),
    ('coptic_taxis_items', 'id', 'INSERT'),
    ('coptic_taxis_items', 'title_ar', 'INSERT'), ('coptic_taxis_items', 'title_en', 'INSERT'),
    ('coptic_taxis_items', 'title_coptic', 'INSERT'), ('coptic_taxis_items', 'category', 'INSERT'),
    ('coptic_taxis_items', 'season', 'INSERT'), ('coptic_taxis_items', 'level', 'INSERT'),
    ('coptic_taxis_items', 'target_audience', 'INSERT'), ('coptic_taxis_items', 'audience_detail', 'INSERT'),
    ('coptic_taxis_items', 'summary_ar', 'INSERT'), ('coptic_taxis_items', 'summary_en', 'INSERT'),
    ('coptic_taxis_items', 'sections', 'INSERT'), ('coptic_taxis_items', 'attachments', 'INSERT'),
    ('coptic_taxis_items', 'source_references', 'INSERT'), ('coptic_taxis_items', 'version', 'INSERT'),
    ('coptic_taxis_items', 'history', 'INSERT'),
    ('coptic_taxis_items', 'title_ar', 'UPDATE'), ('coptic_taxis_items', 'title_en', 'UPDATE'),
    ('coptic_taxis_items', 'title_coptic', 'UPDATE'), ('coptic_taxis_items', 'category', 'UPDATE'),
    ('coptic_taxis_items', 'season', 'UPDATE'), ('coptic_taxis_items', 'level', 'UPDATE'),
    ('coptic_taxis_items', 'target_audience', 'UPDATE'), ('coptic_taxis_items', 'audience_detail', 'UPDATE'),
    ('coptic_taxis_items', 'status', 'UPDATE'), ('coptic_taxis_items', 'sections', 'UPDATE'),
    ('coptic_taxis_items', 'attachments', 'UPDATE'), ('coptic_taxis_items', 'source_references', 'UPDATE'),
    ('coptic_taxis_items', 'summary_ar', 'UPDATE'), ('coptic_taxis_items', 'summary_en', 'UPDATE'),
    ('coptic_taxis_items', 'version', 'UPDATE'), ('coptic_taxis_items', 'history', 'UPDATE'),
    ('coptic_taxis_items', 'reviewed_by', 'UPDATE'), ('coptic_taxis_items', 'approved_by', 'UPDATE'),
    ('coptic_taxis_items', 'published_by', 'UPDATE'), ('coptic_taxis_items', 'published_at', 'UPDATE'),
    ('coptic_taxis_items', 'unpublished_by', 'UPDATE'), ('coptic_taxis_items', 'unpublished_at', 'UPDATE'),
    ('coptic_taxis_items', 'updated_at', 'UPDATE')
),
columns AS (
  SELECT
    c.relname AS table_name,
    a.attname AS column_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated')
      THEN pg_catalog.has_column_privilege('authenticated', c.oid, a.attnum, 'INSERT')
      ELSE false
    END AS can_insert,
    CASE WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated')
      THEN pg_catalog.has_column_privilege('authenticated', c.oid, a.attnum, 'UPDATE')
      ELSE false
    END AS can_update
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_attribute AS a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
  WHERE n.nspname = 'public'
    AND c.relname IN ('hymns', 'coptic_taxis_items')
)
SELECT
  CASE
    WHEN allowed.column_name IS NULL
      AND ((privilege_type = 'INSERT' AND columns.can_insert)
        OR (privilege_type = 'UPDATE' AND columns.can_update))
      THEN 'FAIL'
    WHEN allowed.column_name IS NOT NULL
      AND ((privilege_type = 'INSERT' AND columns.can_insert)
        OR (privilege_type = 'UPDATE' AND columns.can_update))
      THEN 'PASS'
    WHEN allowed.column_name IS NOT NULL THEN 'REVIEW'
    ELSE 'PASS'
  END AS result,
  columns.table_name,
  columns.column_name,
  columns.can_insert AS effective_authenticated_insert,
  columns.can_update AS effective_authenticated_update,
  CASE WHEN allowed.column_name IS NULL THEN 'NOT IN PHASE18 ALLOWLIST' ELSE 'PHASE18 ALLOWLIST' END AS allowlist_status
FROM columns
LEFT JOIN allowed
  ON allowed.table_name = columns.table_name
 AND allowed.column_name = columns.column_name
WHERE columns.can_insert OR columns.can_update OR allowed.column_name IS NOT NULL
ORDER BY columns.table_name, columns.column_name;

SELECT
  CASE
    WHEN pg_catalog.to_regclass('public.hymns') IS NULL
      OR pg_catalog.to_regclass('public.coptic_taxis_items') IS NULL THEN 'FAIL'
    WHEN NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN 'FAIL'
    WHEN pg_catalog.has_table_privilege('authenticated', 'public.hymns', 'INSERT')
      OR pg_catalog.has_table_privilege('authenticated', 'public.hymns', 'UPDATE')
      OR pg_catalog.has_table_privilege('authenticated', 'public.hymns', 'DELETE')
      OR pg_catalog.has_table_privilege('authenticated', 'public.coptic_taxis_items', 'INSERT')
      OR pg_catalog.has_table_privilege('authenticated', 'public.coptic_taxis_items', 'UPDATE')
      OR pg_catalog.has_table_privilege('authenticated', 'public.coptic_taxis_items', 'DELETE')
      THEN 'FAIL'
    ELSE 'PASS'
  END AS result,
  'Phase 18 authenticated table-level write privilege gate' AS check_name,
  'Expected: no effective table-level INSERT, UPDATE, or DELETE for authenticated; column-level allowlists are reviewed in the preceding result.' AS details;

-- 9. Phase 18 audience_detail compatibility. The table or column may be absent
-- before Phase 18, so use query_to_xml with dynamically supplied SELECT text.
WITH availability AS (
  SELECT
    pg_catalog.to_regclass('public.coptic_taxis_items') IS NOT NULL AS table_exists,
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'coptic_taxis_items'
        AND column_name = 'audience_detail'
    ) AS column_exists
),
payload AS (
  SELECT
    availability.*,
    CASE
      WHEN table_exists AND column_exists THEN pg_catalog.query_to_xml(
        'SELECT coalesce(sum(row_count), 0)::bigint AS incompatible_row_count, coalesce(string_agg(pg_catalog.format(''%L (%s rows)'', audience_detail, row_count), '', '' ORDER BY audience_detail), ''none'') AS incompatible_values FROM (SELECT audience_detail, count(*) AS row_count FROM public.coptic_taxis_items WHERE audience_detail IS NOT NULL AND audience_detail NOT IN (''preparatory'', ''clergy'') GROUP BY audience_detail) AS incompatible',
        false,
        true,
        ''
      )
      ELSE NULL
    END AS data_xml
  FROM availability
)
SELECT
  CASE
    WHEN NOT table_exists THEN 'FAIL'
    WHEN NOT column_exists THEN 'REVIEW'
    WHEN ((pg_catalog.xpath('/table/row/incompatible_row_count/text()', data_xml))[1]::text)::bigint = 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  'Phase 18 audience_detail constraint compatibility' AS check_name,
  table_exists,
  column_exists,
  CASE
    WHEN data_xml IS NULL THEN 'Not evaluated; Phase 18 adds the nullable column, but this run cannot inspect existing values.'
    ELSE data_xml::text
  END AS data_summary,
  'Only NULL, preparatory, and clergy are compatible with Phase 18; do not normalize or delete incompatible rows as part of this preflight.' AS expected_values
FROM payload;

-- 10. Active church-year, assignments, and normalized role-assignment schema.
WITH available AS (
  SELECT
    pg_catalog.to_regclass('public.church_years') IS NOT NULL
    AND pg_catalog.to_regclass('public.class_instances') IS NOT NULL
    AND pg_catalog.to_regclass('public.servant_class_assignments') IS NOT NULL AS tables_exist,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'church_years' AND column_name = 'is_active')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'church_years' AND column_name = 'id')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'class_instances' AND column_name = 'id')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'class_instances' AND column_name = 'church_year_id')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'class_instances' AND column_name = 'class_group_id')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'servant_class_assignments' AND column_name = 'id')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'servant_class_assignments' AND column_name = 'is_active')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'servant_class_assignments' AND column_name = 'church_year_id')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'servant_class_assignments' AND column_name = 'class_instance_id')
        AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'servant_class_assignments' AND column_name = 'servant_id')
        AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'class_memberships' AND column_name = 'class_instance_id')
        AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'class_memberships' AND column_name = 'church_year_id')
        AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'class_memberships' AND column_name = 'id')
        AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'class_memberships' AND column_name = 'status') AS columns_exist
),
summary AS (
  SELECT
    available.*,
    CASE WHEN tables_exist AND columns_exist THEN pg_catalog.query_to_xml(
      'SELECT (SELECT count(*)::bigint FROM public.church_years WHERE is_active) AS active_church_year_count, (SELECT coalesce(string_agg(id, '', '' ORDER BY id), ''none'') FROM public.church_years WHERE is_active) AS active_church_year_ids, coalesce((SELECT jsonb_agg(pg_catalog.jsonb_build_object(''class_group_id'', q.class_group_id, ''class_instance_count'', q.class_instance_count, ''active_teacher_assignment_count'', q.active_teacher_assignment_count, ''active_student_membership_count'', q.active_student_membership_count) ORDER BY q.class_group_id) FROM (SELECT ci.class_group_id, count(DISTINCT ci.id)::bigint AS class_instance_count, count(DISTINCT a.id) FILTER (WHERE a.is_active)::bigint AS active_teacher_assignment_count, count(DISTINCT m.id) FILTER (WHERE m.status = ''active'')::bigint AS active_student_membership_count FROM public.church_years cy LEFT JOIN public.class_instances ci ON ci.church_year_id = cy.id LEFT JOIN public.servant_class_assignments a ON a.class_instance_id = ci.id AND a.church_year_id = cy.id LEFT JOIN public.class_memberships m ON m.class_instance_id = ci.id AND m.church_year_id = cy.id WHERE cy.is_active GROUP BY ci.class_group_id) AS q), ''[]''::jsonb)::text AS active_class_group_summary',
      false, true, ''
    ) ELSE NULL END AS summary_xml
  FROM available
)
SELECT
  CASE
    WHEN NOT tables_exist OR NOT columns_exist THEN 'FAIL'
    WHEN summary_xml IS NULL THEN 'FAIL'
    WHEN ((pg_catalog.xpath('/table/row/active_church_year_count/text()', summary_xml))[1]::text)::integer = 1 THEN 'PASS'
    ELSE 'FAIL'
  END AS result,
  'Phase 19 active year and teacher assignments' AS check_name,
  tables_exist,
  columns_exist,
  CASE WHEN summary_xml IS NULL THEN 'Not queryable; inspect the required table/column inventory above.' ELSE summary_xml::text END AS nonidentifying_counts
FROM summary;

WITH availability AS (
  SELECT pg_catalog.to_regclass('public.profile_role_assignments') IS NOT NULL AS table_exists
),
role_summary AS (
  SELECT
    availability.table_exists,
    CASE WHEN table_exists
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profile_role_assignments' AND column_name = 'role')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profile_role_assignments' AND column_name = 'revoked_at')
      THEN pg_catalog.query_to_xml(
        'SELECT role, count(*) FILTER (WHERE revoked_at IS NULL)::bigint AS active_assignment_count, count(*) FILTER (WHERE revoked_at IS NOT NULL)::bigint AS revoked_assignment_count FROM public.profile_role_assignments GROUP BY role ORDER BY role',
        false, true, ''
      )
      ELSE NULL
    END AS summary_xml
  FROM availability
)
SELECT
  CASE WHEN NOT table_exists THEN 'FAIL' WHEN summary_xml IS NULL THEN 'FAIL' ELSE 'REVIEW' END AS result,
  'Phase 13 current role assignments' AS check_name,
  table_exists,
  CASE WHEN summary_xml IS NULL THEN 'Required role columns not visible.' ELSE summary_xml::text END AS counts_by_role,
  'No user IDs are selected. Confirm active rows use student/parent/teacher/admin and revoked_at IS NULL denotes current assignment.' AS interpretation
FROM role_summary;

-- 11. Curriculum UUID linkage and current row integrity. The XML queries only
-- execute when all referenced tables/columns exist; reported values are counts.
WITH available AS (
  SELECT
    pg_catalog.to_regclass('public.lessons') IS NOT NULL
    AND pg_catalog.to_regclass('public.lesson_versions') IS NOT NULL
    AND pg_catalog.to_regclass('public.lesson_sections') IS NOT NULL
    AND pg_catalog.to_regclass('public.lesson_sources') IS NOT NULL
    AND pg_catalog.to_regclass('public.lesson_section_sources') IS NOT NULL
      AS tables_exist,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'id' AND data_type = 'uuid')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'active_version_id' AND data_type = 'uuid')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'lesson_status')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'status')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_versions' AND column_name = 'id' AND data_type = 'uuid')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_versions' AND column_name = 'lesson_id' AND data_type = 'uuid')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_sections' AND column_name = 'id' AND data_type = 'uuid')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_sections' AND column_name = 'lesson_version_id' AND data_type = 'uuid')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_sources' AND column_name = 'id' AND data_type = 'uuid')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_sources' AND column_name = 'lesson_id' AND data_type = 'uuid')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_section_sources' AND column_name = 'section_id' AND data_type = 'uuid')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_section_sources' AND column_name = 'source_id' AND data_type = 'uuid')
      AS uuid_columns_valid
),
summary AS (
  SELECT
    available.*,
    CASE WHEN tables_exist AND uuid_columns_valid THEN pg_catalog.query_to_xml(
      'SELECT (SELECT count(*) FROM public.lessons l WHERE l.active_version_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.lesson_versions v WHERE v.id = l.active_version_id AND v.lesson_id = l.id)) AS invalid_active_version_links, (SELECT count(*) FROM public.lesson_versions v WHERE NOT EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = v.lesson_id)) AS orphan_versions, (SELECT count(*) FROM public.lesson_sections s WHERE NOT EXISTS (SELECT 1 FROM public.lesson_versions v WHERE v.id = s.lesson_version_id)) AS orphan_sections, (SELECT count(*) FROM public.lesson_sources s WHERE NOT EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = s.lesson_id)) AS orphan_sources, (SELECT count(*) FROM public.lesson_section_sources ss WHERE NOT EXISTS (SELECT 1 FROM public.lesson_sections s WHERE s.id = ss.section_id)) AS orphan_source_section_links, (SELECT count(*) FROM public.lesson_section_sources ss WHERE NOT EXISTS (SELECT 1 FROM public.lesson_sources s WHERE s.id = ss.source_id)) AS orphan_source_links, (SELECT count(*) FROM public.lesson_section_sources ss JOIN public.lesson_sections s ON s.id = ss.section_id JOIN public.lesson_versions v ON v.id = s.lesson_version_id JOIN public.lesson_sources src ON src.id = ss.source_id WHERE src.lesson_id <> v.lesson_id) AS cross_lesson_source_links, (SELECT count(*) FROM public.lessons l WHERE lower(coalesce(l.lesson_status, l.status, '''')) = ''published'' AND l.active_version_id IS NULL) AS published_lessons_without_active_version',
      false, true, ''
    ) ELSE NULL END AS summary_xml
  FROM available
)
SELECT
  CASE
    WHEN NOT tables_exist OR NOT uuid_columns_valid THEN 'FAIL'
    WHEN summary_xml::text ~ '<(invalid_active_version_links|orphan_versions|orphan_sections|orphan_sources|orphan_source_section_links|orphan_source_links|cross_lesson_source_links|published_lessons_without_active_version)>[1-9]' THEN 'FAIL'
    ELSE 'PASS'
  END AS result,
  'Phase 19 UUID and lesson/version/section relationships' AS check_name,
  tables_exist,
  uuid_columns_valid,
  CASE WHEN summary_xml IS NULL THEN 'Not evaluated; see required table/column inventory.' ELSE summary_xml::text END AS nonidentifying_counts,
  'Expected all counts to be zero. Verify active_version_id references a version belonging to that same lesson and source links do not cross lessons.' AS interpretation
FROM summary;

SELECT
  'REVIEW' AS result,
  'Phase 19 relationship constraints' AS check_name,
  pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'table', n.nspname || '.' || c.relname,
      'constraint', con.conname,
      'validated', con.convalidated,
      'definition', pg_catalog.pg_get_constraintdef(con.oid)
    )
    ORDER BY c.relname, con.conname
  ) AS visible_constraints
FROM pg_catalog.pg_constraint AS con
JOIN pg_catalog.pg_class AS c ON c.oid = con.conrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('lessons', 'lesson_versions', 'lesson_sections', 'lesson_sources', 'lesson_section_sources');

-- 12. Storage inspection is conditional because storage schema access varies by
-- project role. Bucket metadata is nonsecret. Review public buckets and all
-- storage.objects policies that could govern curriculum media.
SELECT
  'REVIEW' AS result,
  CASE
    WHEN pg_catalog.to_regclass('storage.buckets') IS NULL THEN 'storage.buckets is absent or not visible to this SQL Editor role.'
    ELSE 'Bucket privacy metadata; check public=true for curriculum/media buckets and confirm intended exposure.'
  END AS interpretation,
  CASE WHEN pg_catalog.to_regclass('storage.buckets') IS NULL THEN NULL ELSE
    pg_catalog.query_to_xml(
      'SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets ORDER BY name',
      false, true, ''
    )
  END AS bucket_metadata;

SELECT
  'REVIEW' AS result,
  'Storage object RLS policies' AS check_name,
  CASE
    WHEN pg_catalog.to_regclass('storage.objects') IS NULL
      THEN 'storage.objects is absent or not visible to this SQL Editor role.'
    ELSE 'Inspect every policy expression for curriculum bucket scope, authenticated/public reads, and upload/delete permissions.'
  END AS interpretation,
  CASE WHEN pg_catalog.to_regclass('storage.objects') IS NULL THEN NULL ELSE
    pg_catalog.query_to_xml(
      'SELECT policyname, permissive, roles, cmd, qual AS using_expression, with_check AS with_check_expression FROM pg_catalog.pg_policies WHERE schemaname = ''storage'' AND tablename = ''objects'' ORDER BY policyname',
      false, true, ''
    )
  END AS policy_inventory;

-- 13. Explicit review items that SQL catalog inspection cannot establish.
SELECT 'REVIEW' AS result, 'Migration execution state' AS check_name,
  'A migration-history row is not proof that the live schema matches the file. Compare the deployed database and migration records with the checked-in revisions.' AS details
UNION ALL
SELECT 'REVIEW', 'Phase 18/19 SQL behavior',
  'Catalog preflight cannot execute the planned trigger/RLS behavior as representative authenticated users. Test Taxis valid/invalid transitions, self-approval, ownership immutability, direct Supabase access, student cross-class isolation, parent-child reads, teacher assignment scope, and admin access after review.'
UNION ALL
SELECT 'REVIEW', 'Supabase Storage authorization',
  'SQL can inspect visible bucket metadata and storage.objects policies, but cannot prove object URL exposure, signed-URL handling, CDN/cache behavior, or external storage configuration.'
UNION ALL
SELECT 'REVIEW', 'Phase 19 grade mapping',
  'The curriculum_grade_class_group(text) mapping is defined by Phase 19. Validate its mapping against real nonidentifying grade/class-group combinations before applying.'
UNION ALL
SELECT 'REVIEW', 'Preflight execution privileges',
  'Empty catalog results can mean objects are absent or hidden from the SQL Editor role. Run as a project database owner or sufficiently privileged read-only role and investigate all REVIEW rows.';
