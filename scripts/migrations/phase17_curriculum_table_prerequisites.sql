-- Phase 17 curriculum table prerequisites.
-- Apply after Phases 4 and 13, and before phase17_assigned_role_authorization.sql.
-- Creates only missing tables; existing curriculum records are not copied,
-- replaced, or otherwise modified.
BEGIN;

DO $preflight$
BEGIN
  IF pg_catalog.to_regprocedure('public.has_role(text)') IS NULL THEN
    RAISE EXCEPTION 'Phase 13 is required before creating Phase 17 curriculum prerequisites.';
  END IF;
  IF pg_catalog.to_regprocedure('public.set_text_content_owner()') IS NULL THEN
    RAISE EXCEPTION 'Phase 4 is required before creating Phase 17 curriculum prerequisites.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'hymns_taxis_level'
      AND data_type = 'integer'
  ) THEN
    RAISE EXCEPTION 'Phase 7 or 8 is required before creating Phase 17 curriculum prerequisites.';
  END IF;
END;
$preflight$;

CREATE TABLE IF NOT EXISTS public.hymns (
  id TEXT PRIMARY KEY,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_coptic TEXT NOT NULL,
  season_ar TEXT NOT NULL,
  season_en TEXT NOT NULL,
  occasion_tag TEXT NOT NULL CHECK (occasion_tag IN ('annual', 'kiahk', 'lent', 'pascha', 'resurrection', 'st_mary')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'advanced')),
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
  audio_url TEXT,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  hazat_explanation_ar TEXT,
  hazat_explanation_en TEXT,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.coptic_taxis_items (
  id TEXT PRIMARY KEY,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_coptic TEXT,
  category TEXT NOT NULL CHECK (category IN ('LITURGY', 'SACRAMENT', 'FEAST', 'FASTING', 'DEACON_SERVICE', 'CLERICAL', 'PRAYER_CANON')),
  season TEXT NOT NULL,
  level INTEGER CHECK (level IN (1, 2, 3)),
  target_audience TEXT NOT NULL CHECK (target_audience IN ('ALL', 'DEACONS', 'SERVANTS', 'CONGREGATION')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'published', 'unpublished', 'archived')),
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  reviewed_by TEXT,
  published_by TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Older installations may already have the Taxis table from the clean schema
-- or Phase 7. Add only its nullable level field; existing rows remain intact.
ALTER TABLE public.coptic_taxis_items
  ADD COLUMN IF NOT EXISTS level INTEGER;

DO $schema_check$
DECLARE
  v_missing TEXT;
BEGIN
  SELECT pg_catalog.string_agg(required.column_name, ', ' ORDER BY required.column_name)
    INTO v_missing
  FROM (VALUES
    ('hymns', 'id'),
    ('hymns', 'level'),
    ('hymns', 'status'),
    ('coptic_taxis_items', 'id'),
    ('coptic_taxis_items', 'level'),
    ('coptic_taxis_items', 'status'),
    ('coptic_taxis_items', 'target_audience')
  ) AS required(table_name, column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns AS actual
    WHERE actual.table_schema = 'public'
      AND actual.table_name = required.table_name
      AND actual.column_name = required.column_name
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION
      'Existing curriculum table schema is incomplete (%). Inspect it before applying Phase 17.',
      v_missing;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('hymns', 'coptic_taxis_items')
      AND column_name = 'level'
      AND data_type <> 'integer'
  ) THEN
    RAISE EXCEPTION 'A curriculum level column is not integer typed. Inspect it before applying Phase 17.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.hymns
    WHERE level NOT IN (1, 2, 3)
  ) THEN
    RAISE EXCEPTION 'public.hymns contains unsupported level values. Inspect them before applying Phase 17.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.coptic_taxis_items
    WHERE level IS NOT NULL AND level NOT IN (1, 2, 3)
  ) THEN
    RAISE EXCEPTION 'public.coptic_taxis_items contains unsupported level values. Inspect them before applying Phase 17.';
  END IF;
END;
$schema_check$;

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.coptic_taxis_items'::regclass
      AND conname = 'coptic_taxis_items_level_valid'
  ) THEN
    ALTER TABLE public.coptic_taxis_items
      ADD CONSTRAINT coptic_taxis_items_level_valid
      CHECK (level IS NULL OR level IN (1, 2, 3)) NOT VALID;
  END IF;
  ALTER TABLE public.coptic_taxis_items
    VALIDATE CONSTRAINT coptic_taxis_items_level_valid;
END;
$constraints$;

CREATE INDEX IF NOT EXISTS idx_hymns_level ON public.hymns(level);
CREATE INDEX IF NOT EXISTS idx_hymns_status ON public.hymns(status);
CREATE INDEX IF NOT EXISTS idx_coptic_taxis_items_level ON public.coptic_taxis_items(level);
CREATE INDEX IF NOT EXISTS idx_coptic_taxis_items_status ON public.coptic_taxis_items(status);

ALTER TABLE public.hymns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coptic_taxis_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Servants read all hymns" ON public.hymns;
DROP POLICY IF EXISTS "Authors read own hymn drafts" ON public.hymns;
DROP POLICY IF EXISTS "Public read level 1 hymns" ON public.hymns;
DROP POLICY IF EXISTS "Students read approved level hymns" ON public.hymns;
DROP POLICY IF EXISTS hymns_select_assigned_level ON public.hymns;
CREATE POLICY hymns_select_assigned_level
  ON public.hymns FOR SELECT TO authenticated
  USING (
    (status = 'published'
      AND public.has_role('student')
      AND EXISTS (
        SELECT 1 FROM public.profiles AS p
        WHERE p.id = auth.uid()
          AND p.hymns_taxis_level = public.hymns.level
      ))
    OR public.has_role('teacher')
    OR public.has_role('admin')
  );
DROP POLICY IF EXISTS hymns_insert_owned_draft ON public.hymns;
CREATE POLICY hymns_insert_owned_draft
  ON public.hymns FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('teacher')
    AND status = 'draft'
    AND created_by = auth.uid()::TEXT
  );
DROP POLICY IF EXISTS hymns_update_owned_draft ON public.hymns;
CREATE POLICY hymns_update_owned_draft
  ON public.hymns FOR UPDATE TO authenticated
  USING (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.has_role('admin')))
  WITH CHECK (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.has_role('admin')));
DROP POLICY IF EXISTS hymns_delete_owned_draft ON public.hymns;
CREATE POLICY hymns_delete_owned_draft
  ON public.hymns FOR DELETE TO authenticated
  USING (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.has_role('admin')));

DROP POLICY IF EXISTS "Anyone authenticated can view published taxis rituals" ON public.coptic_taxis_items;
DROP POLICY IF EXISTS "Servants and Admins can view draft and in-review taxis rituals" ON public.coptic_taxis_items;
DROP POLICY IF EXISTS "Servants and Admins can manage taxis items" ON public.coptic_taxis_items;
DROP POLICY IF EXISTS taxis_items_select_assigned_level ON public.coptic_taxis_items;
CREATE POLICY taxis_items_select_assigned_level
  ON public.coptic_taxis_items FOR SELECT TO authenticated
  USING (
    (
      status = 'published'
      AND level IS NOT NULL
      AND public.has_role('student')
      AND EXISTS (
        SELECT 1 FROM public.profiles AS p
        WHERE p.id = auth.uid()
          AND p.hymns_taxis_level = public.coptic_taxis_items.level
          AND (
            public.coptic_taxis_items.target_audience IN ('ALL', 'CONGREGATION')
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
DROP POLICY IF EXISTS taxis_items_insert_owned_draft ON public.coptic_taxis_items;
CREATE POLICY taxis_items_insert_owned_draft
  ON public.coptic_taxis_items FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('teacher')
    AND status = 'draft'
    AND created_by = auth.uid()::TEXT
  );
DROP POLICY IF EXISTS taxis_items_update_owned_draft ON public.coptic_taxis_items;
CREATE POLICY taxis_items_update_owned_draft
  ON public.coptic_taxis_items FOR UPDATE TO authenticated
  USING (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.has_role('admin')))
  WITH CHECK (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.has_role('admin')));
DROP POLICY IF EXISTS taxis_items_delete_owned_draft ON public.coptic_taxis_items;
CREATE POLICY taxis_items_delete_owned_draft
  ON public.coptic_taxis_items FOR DELETE TO authenticated
  USING (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.has_role('admin')));

DROP TRIGGER IF EXISTS hymns_set_owner ON public.hymns;
CREATE TRIGGER hymns_set_owner
  BEFORE INSERT ON public.hymns
  FOR EACH ROW EXECUTE FUNCTION public.set_text_content_owner();
DROP TRIGGER IF EXISTS coptic_taxis_items_set_owner ON public.coptic_taxis_items;
CREATE TRIGGER coptic_taxis_items_set_owner
  BEFORE INSERT ON public.coptic_taxis_items
  FOR EACH ROW EXECUTE FUNCTION public.set_text_content_owner();

REVOKE ALL PRIVILEGES ON TABLE public.hymns FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.hymns TO authenticated;
GRANT INSERT (id, title_ar, title_en, title_coptic, season_ar, season_en, occasion_tag, difficulty, level, audio_url, duration_sec, hazat_explanation_ar, hazat_explanation_en, lines, version)
  ON TABLE public.hymns TO authenticated;
GRANT UPDATE (title_ar, title_en, title_coptic, season_ar, season_en, occasion_tag, difficulty, level, audio_url, duration_sec, hazat_explanation_ar, hazat_explanation_en, lines)
  ON TABLE public.hymns TO authenticated;
GRANT DELETE ON TABLE public.hymns TO authenticated;
GRANT ALL ON TABLE public.hymns TO service_role;

REVOKE ALL PRIVILEGES ON TABLE public.coptic_taxis_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.coptic_taxis_items TO authenticated;
GRANT INSERT (id, title_ar, title_en, title_coptic, category, season, level, target_audience, sections, attachments, version)
  ON TABLE public.coptic_taxis_items TO authenticated;
GRANT UPDATE (title_ar, title_en, title_coptic, category, season, level, target_audience, sections, attachments)
  ON TABLE public.coptic_taxis_items TO authenticated;
GRANT DELETE ON TABLE public.coptic_taxis_items TO authenticated;
GRANT ALL ON TABLE public.coptic_taxis_items TO service_role;

COMMIT;
