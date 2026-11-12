-- Phase 18: persist Hymns and Taxis metadata and permit scoped workflow updates.
-- Apply only after inspecting the deployed Phase 17 schemas and reviewing this
-- migration. All client writes remain subject to authenticated-user RLS.
BEGIN;

DO $preflight$
DECLARE
  v_missing TEXT;
  v_owner_function_definition TEXT;
BEGIN
  IF pg_catalog.to_regclass('public.hymns') IS NULL
     OR pg_catalog.to_regclass('public.coptic_taxis_items') IS NULL THEN
    RAISE EXCEPTION
      'Phase 18 requires public.hymns and public.coptic_taxis_items. Inspect and apply the approved Phase 17 prerequisites first.';
  END IF;
  IF pg_catalog.to_regprocedure('public.has_role(text)') IS NULL THEN
    RAISE EXCEPTION 'Phase 18 requires public.has_role(text).';
  END IF;
  IF pg_catalog.to_regprocedure('public.set_text_content_owner()') IS NULL THEN
    RAISE EXCEPTION 'Phase 18 requires public.set_text_content_owner().';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'hymns_taxis_level'
      AND data_type = 'integer'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'grade'
  ) THEN
    RAISE EXCEPTION 'Phase 18 requires profiles.hymns_taxis_level and profiles.grade.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'id'
  ) THEN
    RAISE EXCEPTION 'Phase 18 requires profiles.id.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('hymns', 'id', 'text'),
      ('hymns', 'created_by', 'text'),
      ('hymns', 'status', 'text'),
      ('hymns', 'level', 'integer'),
      ('coptic_taxis_items', 'id', 'text'),
      ('coptic_taxis_items', 'created_by', 'text'),
      ('coptic_taxis_items', 'status', 'text'),
      ('coptic_taxis_items', 'level', 'integer'),
      ('coptic_taxis_items', 'target_audience', 'text')
    ) AS expected(table_name, column_name, data_type)
    JOIN information_schema.columns AS actual
      ON actual.table_schema = 'public'
     AND actual.table_name = expected.table_name
     AND actual.column_name = expected.column_name
    WHERE actual.data_type <> expected.data_type
  ) THEN
    RAISE EXCEPTION
      'Phase 18 found incompatible ID, status, level, or audience column types. Inspect the deployed curriculum schema before proceeding.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('hymns', 'coptic_taxis_items')
      AND column_name = 'status'
      AND is_nullable <> 'NO'
  ) THEN
    RAISE EXCEPTION 'Phase 18 requires non-null status columns on both curriculum tables.';
  END IF;

  SELECT pg_catalog.string_agg(required.table_name || '.' || required.column_name, ', ')
    INTO v_missing
  FROM (VALUES
    ('hymns', 'id'),
    ('hymns', 'title_ar'),
    ('hymns', 'title_en'),
    ('hymns', 'title_coptic'),
    ('hymns', 'season_ar'),
    ('hymns', 'season_en'),
    ('hymns', 'occasion_tag'),
    ('hymns', 'difficulty'),
    ('hymns', 'level'),
    ('hymns', 'audio_url'),
    ('hymns', 'duration_sec'),
    ('hymns', 'hazat_explanation_ar'),
    ('hymns', 'hazat_explanation_en'),
    ('hymns', 'lines'),
    ('hymns', 'status'),
    ('hymns', 'version'),
    ('hymns', 'created_by'),
    ('hymns', 'created_at'),
    ('hymns', 'updated_at'),
    ('coptic_taxis_items', 'id'),
    ('coptic_taxis_items', 'title_ar'),
    ('coptic_taxis_items', 'title_en'),
    ('coptic_taxis_items', 'title_coptic'),
    ('coptic_taxis_items', 'category'),
    ('coptic_taxis_items', 'season'),
    ('coptic_taxis_items', 'level'),
    ('coptic_taxis_items', 'target_audience'),
    ('coptic_taxis_items', 'status'),
    ('coptic_taxis_items', 'sections'),
    ('coptic_taxis_items', 'attachments'),
    ('coptic_taxis_items', 'version'),
    ('coptic_taxis_items', 'created_by'),
    ('coptic_taxis_items', 'reviewed_by'),
    ('coptic_taxis_items', 'published_by'),
    ('coptic_taxis_items', 'created_at'),
    ('coptic_taxis_items', 'updated_at')
  ) AS required(table_name, column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns AS actual
    WHERE actual.table_schema = 'public'
      AND actual.table_name = required.table_name
      AND actual.column_name = required.column_name
  );
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Phase 18 requires the checked-in curriculum columns (%). Inspect the deployed schema first.', v_missing;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
    WHERE oid = 'public.hymns'::regclass AND relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
    WHERE oid = 'public.coptic_taxis_items'::regclass AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Phase 18 requires row-level security enabled on both curriculum tables.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.hymns'::regclass
      AND tgfoid = 'public.set_text_content_owner()'::regprocedure
      AND NOT tgisinternal
      AND tgenabled IN ('O', 'A')
      AND (tgtype & 7) = 7
      AND (tgtype & 24) = 0
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.coptic_taxis_items'::regclass
      AND tgfoid = 'public.set_text_content_owner()'::regprocedure
      AND NOT tgisinternal
      AND tgenabled IN ('O', 'A')
      AND (tgtype & 7) = 7
      AND (tgtype & 24) = 0
  ) THEN
    RAISE EXCEPTION 'Phase 18 requires enabled row-level BEFORE INSERT ownership triggers on both curriculum tables.';
  END IF;

  SELECT pg_catalog.pg_get_functiondef(
    'public.set_text_content_owner()'::regprocedure
  )
  INTO v_owner_function_definition;
  IF v_owner_function_definition !~* 'NEW[.]created_by'
     OR v_owner_function_definition !~* 'auth[.]uid' THEN
    RAISE EXCEPTION
      'Phase 18 requires set_text_content_owner() to assign created_by from auth.uid(); inspect the deployed function before proceeding.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.coptic_taxis_items'::regclass
      AND NOT tgisinternal
      AND tgenabled IN ('O', 'A')
      AND (tgtype & 2) = 2
      AND (tgtype & 1) = 1
      AND (tgtype & 16) = 16
      AND tgname <> 'coptic_taxis_items_guard_workflow_update'
  ) THEN
    RAISE EXCEPTION
      'Phase 18 found an unexpected active BEFORE UPDATE trigger on coptic_taxis_items. Inspect trigger ordering and behavior before proceeding.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger
    WHERE tgrelid IN ('public.hymns'::regclass, 'public.coptic_taxis_items'::regclass)
      AND NOT tgisinternal
      AND tgenabled IN ('O', 'A')
      AND (tgtype & 7) = 7
      AND tgfoid <> 'public.set_text_content_owner()'::regprocedure
  ) THEN
    RAISE EXCEPTION
      'Phase 18 found an unexpected active BEFORE INSERT trigger on a curriculum table. Inspect trigger ordering and behavior before proceeding.';
  END IF;
END;
$preflight$;

ALTER TABLE public.hymns ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE public.coptic_taxis_items ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.hymns
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS sheet_music_url TEXT,
  ADD COLUMN IF NOT EXISTS history JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

ALTER TABLE public.coptic_taxis_items
  ADD COLUMN IF NOT EXISTS audience_detail TEXT,
  ADD COLUMN IF NOT EXISTS summary_ar TEXT,
  ADD COLUMN IF NOT EXISTS summary_en TEXT,
  ADD COLUMN IF NOT EXISTS source_references JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS history JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unpublished_by TEXT,
  ADD COLUMN IF NOT EXISTS unpublished_at TIMESTAMPTZ;

DO $audience_detail_constraint$
DECLARE
  v_incompatible_values TEXT;
  v_existing_definition TEXT;
BEGIN
  SELECT pg_catalog.string_agg(
    pg_catalog.format('%L (%s rows)', audience_detail, row_count),
    ', ' ORDER BY audience_detail
  )
  INTO v_incompatible_values
  FROM (
    SELECT audience_detail, pg_catalog.count(*) AS row_count
    FROM public.coptic_taxis_items
    WHERE audience_detail IS NOT NULL
      AND audience_detail NOT IN ('preparatory', 'clergy')
    GROUP BY audience_detail
  ) AS incompatible;

  IF v_incompatible_values IS NOT NULL THEN
    RAISE EXCEPTION
      'Phase 18 cannot validate audience_detail. Inspect these existing values before proceeding: %',
      v_incompatible_values;
  END IF;

  SELECT pg_catalog.lower(pg_catalog.regexp_replace(
           pg_catalog.pg_get_expr(conbin, conrelid),
           '[[:space:]()]',
           '',
           'g'
         ))
  INTO v_existing_definition
  FROM pg_catalog.pg_constraint
  WHERE conrelid = 'public.coptic_taxis_items'::regclass
    AND conname = 'coptic_taxis_items_audience_detail_valid'
    AND contype = 'c';

  IF v_existing_definition IS NULL AND EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.coptic_taxis_items'::regclass
      AND conname = 'coptic_taxis_items_audience_detail_valid'
  ) THEN
    RAISE EXCEPTION
      'The existing audience_detail constraint name is occupied by a non-CHECK constraint; inspect it before proceeding.';
  END IF;

  IF v_existing_definition IS NOT NULL
     AND v_existing_definition <> 'audience_detailisnulloraudience_detail=any(array[''preparatory''::text,''clergy''::text])' THEN
    RAISE EXCEPTION
      'The existing audience_detail constraint has an unexpected definition (%); inspect it before proceeding.',
      v_existing_definition;
  END IF;

  IF v_existing_definition IS NULL THEN
    ALTER TABLE public.coptic_taxis_items
      ADD CONSTRAINT coptic_taxis_items_audience_detail_valid
      CHECK (audience_detail IS NULL OR audience_detail IN ('preparatory', 'clergy'))
      NOT VALID;
  END IF;
  ALTER TABLE public.coptic_taxis_items
    VALIDATE CONSTRAINT coptic_taxis_items_audience_detail_valid;
END;
$audience_detail_constraint$;

CREATE OR REPLACE FUNCTION public.guard_coptic_taxis_workflow_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_actor TEXT := auth.uid()::TEXT;
  v_grade TEXT;
  v_is_admin BOOLEAN := COALESCE(public.has_role('admin'), false);
  v_content_changed BOOLEAN;
  v_workflow_metadata_changed BOOLEAN;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'An authenticated user is required to update Taxis items.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT v_is_admin AND NOT COALESCE(public.has_role('teacher'), false) THEN
    RAISE EXCEPTION 'Only an authorized teacher or admin can update Taxis items.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Taxis item ownership cannot be changed after creation.'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.status NOT IN ('draft', 'unpublished', 'under_review', 'approved', 'published')
     OR NEW.status NOT IN ('draft', 'unpublished', 'under_review', 'approved', 'published') THEN
    RAISE EXCEPTION 'Taxis item status is outside the supported workflow.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT v_is_admin
     AND OLD.created_by IS DISTINCT FROM v_actor
     AND OLD.status NOT IN ('under_review', 'approved') THEN
    RAISE EXCEPTION 'Only the Taxis author or an admin can update this item.'
      USING ERRCODE = '42501';
  END IF;

  v_content_changed :=
    ROW(
      NEW.title_ar, NEW.title_en, NEW.title_coptic, NEW.category, NEW.season,
      NEW.level, NEW.target_audience, NEW.audience_detail, NEW.summary_ar,
      NEW.summary_en, NEW.sections, NEW.attachments, NEW.source_references
    ) IS DISTINCT FROM ROW(
      OLD.title_ar, OLD.title_en, OLD.title_coptic, OLD.category, OLD.season,
      OLD.level, OLD.target_audience, OLD.audience_detail, OLD.summary_ar,
      OLD.summary_en, OLD.sections, OLD.attachments, OLD.source_references
    );

  v_workflow_metadata_changed :=
    ROW(
      NEW.reviewed_by, NEW.approved_by, NEW.published_by, NEW.published_at,
      NEW.unpublished_by, NEW.unpublished_at
    ) IS DISTINCT FROM ROW(
      OLD.reviewed_by, OLD.approved_by, OLD.published_by, OLD.published_at,
      OLD.unpublished_by, OLD.unpublished_at
    );

  IF v_content_changed AND NOT (
    OLD.status IN ('draft', 'unpublished')
    AND NEW.status IN ('draft', 'unpublished')
  ) THEN
    RAISE EXCEPTION 'Taxis content can only be edited while draft or unpublished.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    IF v_workflow_metadata_changed AND NOT (
      OLD.status IN ('draft', 'unpublished')
      AND NEW.status = 'draft'
      AND NEW.reviewed_by IS NULL
      AND NEW.approved_by IS NULL
      AND NEW.published_by IS NULL
      AND NEW.published_at IS NULL
      AND NEW.unpublished_by IS NULL
      AND NEW.unpublished_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Taxis workflow metadata can only change through a valid workflow transition.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status IN ('draft', 'unpublished') AND NEW.status = 'under_review' THEN
    IF v_workflow_metadata_changed THEN
      RAISE EXCEPTION 'Submitting for review cannot set review or publishing metadata.'
        USING ERRCODE = '42501';
    END IF;
  ELSIF OLD.status = 'under_review' AND NEW.status = 'approved' THEN
    IF OLD.created_by = v_actor
       OR NEW.reviewed_by IS DISTINCT FROM v_actor
       OR NEW.approved_by IS DISTINCT FROM v_actor
       OR ROW(NEW.published_by, NEW.published_at, NEW.unpublished_by, NEW.unpublished_at)
          IS DISTINCT FROM ROW(OLD.published_by, OLD.published_at, OLD.unpublished_by, OLD.unpublished_at) THEN
      RAISE EXCEPTION 'A different teacher or an admin must approve this Taxis item.'
        USING ERRCODE = '42501';
    END IF;
  ELSIF OLD.status IN ('under_review', 'approved') AND NEW.status = 'draft' THEN
    IF (OLD.created_by = v_actor AND NOT v_is_admin)
       OR NEW.reviewed_by IS DISTINCT FROM v_actor
       OR NEW.approved_by IS NOT NULL
       OR ROW(NEW.published_by, NEW.published_at, NEW.unpublished_by, NEW.unpublished_at)
          IS DISTINCT FROM ROW(OLD.published_by, OLD.published_at, OLD.unpublished_by, OLD.unpublished_at) THEN
      RAISE EXCEPTION 'Returning a Taxis item for changes has invalid workflow metadata.'
        USING ERRCODE = '42501';
    END IF;
  ELSIF OLD.status = 'approved' AND NEW.status = 'published' THEN
    IF NEW.level IS NULL THEN
      RAISE EXCEPTION 'A curriculum level is required before publishing this Taxis item.'
        USING ERRCODE = '23514';
    END IF;
    IF NOT v_is_admin THEN
      SELECT p.grade INTO v_grade
      FROM public.profiles AS p
      WHERE p.id = auth.uid();
      IF lower(COALESCE(v_grade, '')) NOT LIKE '%head%'
         AND lower(COALESCE(v_grade, '')) NOT LIKE '%priest%' THEN
        RAISE EXCEPTION 'A head teacher or priest is required to publish this Taxis item.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
    IF NEW.published_by IS DISTINCT FROM v_actor
       OR NEW.published_at IS NULL
       OR ROW(NEW.reviewed_by, NEW.approved_by, NEW.unpublished_by, NEW.unpublished_at)
          IS DISTINCT FROM ROW(OLD.reviewed_by, OLD.approved_by, OLD.unpublished_by, OLD.unpublished_at) THEN
      RAISE EXCEPTION 'Publishing this Taxis item has invalid workflow metadata.'
        USING ERRCODE = '42501';
    END IF;
  ELSIF OLD.status = 'published' AND NEW.status = 'unpublished' THEN
    IF NOT v_is_admin THEN
      SELECT p.grade INTO v_grade
      FROM public.profiles AS p
      WHERE p.id = auth.uid();
      IF lower(COALESCE(v_grade, '')) NOT LIKE '%head%'
         AND lower(COALESCE(v_grade, '')) NOT LIKE '%priest%' THEN
        RAISE EXCEPTION 'A head teacher or priest is required to unpublish this Taxis item.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
    IF NEW.unpublished_by IS DISTINCT FROM v_actor
       OR NEW.unpublished_at IS NULL
       OR ROW(NEW.reviewed_by, NEW.approved_by, NEW.published_by, NEW.published_at)
          IS DISTINCT FROM ROW(OLD.reviewed_by, OLD.approved_by, OLD.published_by, OLD.published_at) THEN
      RAISE EXCEPTION 'Unpublishing this Taxis item has invalid workflow metadata.'
        USING ERRCODE = '42501';
    END IF;
  ELSIF OLD.status IN ('draft', 'unpublished') AND NEW.status = 'draft' THEN
    IF NEW.reviewed_by IS NOT NULL
       OR NEW.approved_by IS NOT NULL
       OR NEW.published_by IS NOT NULL
       OR NEW.published_at IS NOT NULL
       OR NEW.unpublished_by IS NOT NULL
       OR NEW.unpublished_at IS NOT NULL THEN
      RAISE EXCEPTION 'Restoring a Taxis draft must clear workflow metadata.'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid Taxis workflow transition from % to %.', OLD.status, NEW.status
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_coptic_taxis_workflow_update() FROM PUBLIC, anon, authenticated;

DO $write_privileges$
DECLARE
  v_table TEXT;
  v_column RECORD;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['hymns', 'coptic_taxis_items']
  LOOP
    EXECUTE pg_catalog.format(
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I FROM PUBLIC, anon, authenticated',
      v_table
    );

    FOR v_column IN
      SELECT a.attname
      FROM pg_catalog.pg_attribute AS a
      WHERE a.attrelid = pg_catalog.to_regclass('public.' || v_table)
        AND a.attnum > 0
        AND NOT a.attisdropped
    LOOP
      EXECUTE pg_catalog.format(
        'REVOKE INSERT (%1$I), UPDATE (%1$I) ON TABLE public.%2$I FROM PUBLIC, anon, authenticated',
        v_column.attname,
        v_table
      );
    END LOOP;
  END LOOP;
END;
$write_privileges$;

GRANT SELECT ON TABLE public.hymns, public.coptic_taxis_items TO authenticated;
GRANT ALL ON TABLE public.hymns, public.coptic_taxis_items TO service_role;

DROP POLICY IF EXISTS phase18_hymns_select ON public.hymns;
DROP POLICY IF EXISTS phase18_hymns_insert ON public.hymns;
DROP POLICY IF EXISTS phase18_hymns_update ON public.hymns;
DROP POLICY IF EXISTS phase18_hymns_delete ON public.hymns;
DROP POLICY IF EXISTS phase18_taxis_select ON public.coptic_taxis_items;
DROP POLICY IF EXISTS phase18_taxis_insert ON public.coptic_taxis_items;
DROP POLICY IF EXISTS phase18_taxis_update ON public.coptic_taxis_items;
DROP POLICY IF EXISTS phase18_taxis_delete ON public.coptic_taxis_items;

CREATE POLICY phase18_hymns_select
  ON public.hymns FOR SELECT TO authenticated
  USING (
    (
      status = 'published'
      AND public.has_role('student')
      AND EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = auth.uid()
          AND p.hymns_taxis_level = public.hymns.level
      )
    )
    OR public.has_role('teacher')
    OR public.has_role('admin')
  );
CREATE POLICY phase18_hymns_insert
  ON public.hymns FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role('teacher') OR public.has_role('admin'))
    AND status = 'draft'
    AND created_by = auth.uid()::TEXT
  );
CREATE POLICY phase18_hymns_update
  ON public.hymns FOR UPDATE TO authenticated
  USING (
    public.has_role('admin')
    OR (public.has_role('teacher') AND created_by = auth.uid()::TEXT)
  )
  WITH CHECK (
    public.has_role('admin')
    OR (public.has_role('teacher') AND created_by = auth.uid()::TEXT)
  );
CREATE POLICY phase18_hymns_delete
  ON public.hymns FOR DELETE TO authenticated
  USING (
    status = 'draft'
    AND (
      public.has_role('admin')
      OR (public.has_role('teacher') AND created_by = auth.uid()::TEXT)
    )
  );

CREATE POLICY phase18_taxis_select
  ON public.coptic_taxis_items FOR SELECT TO authenticated
  USING (
    (
      status = 'published'
      AND level IS NOT NULL
      AND public.has_role('student')
      AND EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = auth.uid()
          AND p.hymns_taxis_level = public.coptic_taxis_items.level
          AND (
            (
              public.coptic_taxis_items.target_audience IN ('ALL', 'CONGREGATION')
              AND (
                public.coptic_taxis_items.audience_detail IS DISTINCT FROM 'preparatory'
                OR p.grade ILIKE '%prep%'
              )
            )
            OR (
              public.coptic_taxis_items.target_audience = 'DEACONS'
              AND p.hymns_taxis_level >= 2
            )
          )
      )
    )
    OR public.has_role('teacher')
    OR public.has_role('admin')
  );
CREATE POLICY phase18_taxis_insert
  ON public.coptic_taxis_items FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role('teacher') OR public.has_role('admin'))
    AND status = 'draft'
    AND created_by = auth.uid()::TEXT
  );
CREATE POLICY phase18_taxis_update
  ON public.coptic_taxis_items FOR UPDATE TO authenticated
  USING (
    public.has_role('admin')
    OR (
      public.has_role('teacher')
      AND (
        created_by = auth.uid()::TEXT
        OR status IN ('under_review', 'approved')
      )
    )
  )
  WITH CHECK (
    public.has_role('admin')
    OR (
      public.has_role('teacher')
      AND (
        created_by = auth.uid()::TEXT
        OR status IN ('under_review', 'approved')
        OR (created_by <> auth.uid()::TEXT AND status = 'draft')
      )
    )
  );
CREATE POLICY phase18_taxis_delete
  ON public.coptic_taxis_items FOR DELETE TO authenticated
  USING (
    status = 'draft'
    AND (
      public.has_role('admin')
      OR (public.has_role('teacher') AND created_by = auth.uid()::TEXT)
    )
  );

DO $remove_legacy_policies$
DECLARE
  v_policy RECORD;
BEGIN
  FOR v_policy IN
    SELECT schemaname, tablename, policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('hymns', 'coptic_taxis_items')
      AND policyname NOT IN (
        'phase18_hymns_select',
        'phase18_hymns_insert',
        'phase18_hymns_update',
        'phase18_hymns_delete',
        'phase18_taxis_select',
        'phase18_taxis_insert',
        'phase18_taxis_update',
        'phase18_taxis_delete'
      )
  LOOP
    EXECUTE pg_catalog.format(
      'DROP POLICY %I ON %I.%I',
      v_policy.policyname,
      v_policy.schemaname,
      v_policy.tablename
    );
  END LOOP;
END;
$remove_legacy_policies$;

GRANT INSERT (
  id, title_ar, title_en, title_coptic, season_ar, season_en, occasion_tag,
  difficulty, level, audio_url, pdf_url, sheet_music_url, duration_sec,
  hazat_explanation_ar, hazat_explanation_en, lines, version, history
) ON TABLE public.hymns TO authenticated;
GRANT UPDATE (
  title_ar, title_en, title_coptic, season_ar, season_en, occasion_tag,
  difficulty, level, audio_url, pdf_url, sheet_music_url, duration_sec,
  hazat_explanation_ar, hazat_explanation_en, lines, status, version,
  history, published_at, updated_at
) ON TABLE public.hymns TO authenticated;
GRANT DELETE ON TABLE public.hymns TO authenticated;

GRANT INSERT (
  id, title_ar, title_en, title_coptic, category, season, level,
  target_audience, audience_detail, summary_ar, summary_en, sections,
  attachments, source_references, version, history
) ON TABLE public.coptic_taxis_items TO authenticated;
GRANT UPDATE (
  title_ar, title_en, title_coptic, category, season, level, target_audience,
  audience_detail, status, sections, attachments, source_references, summary_ar,
  summary_en, version, history, reviewed_by, approved_by, published_by,
  published_at, unpublished_by, unpublished_at, updated_at
) ON TABLE public.coptic_taxis_items TO authenticated;
GRANT DELETE ON TABLE public.coptic_taxis_items TO authenticated;

DROP TRIGGER IF EXISTS coptic_taxis_items_guard_workflow_update ON public.coptic_taxis_items;
CREATE TRIGGER coptic_taxis_items_guard_workflow_update
  BEFORE UPDATE ON public.coptic_taxis_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_coptic_taxis_workflow_update();

COMMIT;
