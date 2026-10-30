-- ==============================================================================
-- PHASE 5: CURRICULUM VERSIONING & PUBLICATION SCHEMA MIGRATION
-- Additive migration for versioned curriculum, sources, evidence, and reviews
-- ==============================================================================

-- 1. Create public.lesson_versions Table
CREATE TABLE IF NOT EXISTS public.lesson_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'AI_DRAFT' CHECK (status IN ('AI_DRAFT', 'SERVANT_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'PUBLISHED')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  approval_note TEXT,
  change_reason TEXT,
  published_at TIMESTAMPTZ,
  published_by TEXT,
  summary_en TEXT,
  summary_ar TEXT,
  summary_cop TEXT,
  big_idea_en TEXT,
  big_idea_ar TEXT,
  objectives_en TEXT[] DEFAULT '{}',
  objectives_ar TEXT[] DEFAULT '{}',
  recap_en TEXT,
  recap_ar TEXT,
  narration_script_en TEXT,
  narration_script_ar TEXT,
  tts_audio_url_en TEXT,
  tts_audio_url_ar TEXT,
  tts_status TEXT DEFAULT 'NONE' CHECK (tts_status IN ('NONE', 'PENDING', 'GENERATED', 'STALE')),
  quiz_draft JSONB,
  slides JSONB,
  flashcards JSONB,
  CONSTRAINT uq_lesson_versions_lesson_version UNIQUE (lesson_id, version_number)
);

-- 2. Add Authoritative Columns to public.lessons Table
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS active_version_id UUID REFERENCES public.lesson_versions(id) ON DELETE SET NULL;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS lesson_status TEXT DEFAULT 'draft';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS approved_servant_name TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 3. Create public.lesson_sections Table
CREATE TABLE IF NOT EXISTS public.lesson_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_version_id UUID NOT NULL REFERENCES public.lesson_versions(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 1,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  title_cop TEXT,
  content_en TEXT NOT NULL,
  content_ar TEXT NOT NULL,
  content_cop TEXT,
  teacher_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Create public.lesson_sources Table
CREATE TABLE IF NOT EXISTS public.lesson_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  session_id TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_url TEXT,
  file_size BIGINT,
  description TEXT,
  teacher_notes TEXT,
  rights_status TEXT DEFAULT 'TEACHER_OWNED',
  processing_status TEXT DEFAULT 'INDEXED',
  priority TEXT DEFAULT 'PRIMARY',
  transcript TEXT,
  extracted_content TEXT,
  page_count INTEGER,
  slide_count INTEGER,
  duration_seconds INTEGER,
  youtube_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Create public.lesson_section_sources Junction Table
CREATE TABLE IF NOT EXISTS public.lesson_section_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.lesson_sections(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.lesson_sources(id) ON DELETE CASCADE,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_section_source UNIQUE (section_id, source_id)
);

-- 6. Create public.evidence_maps Table
CREATE TABLE IF NOT EXISTS public.evidence_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  lesson_version_id UUID REFERENCES public.lesson_versions(id) ON DELETE SET NULL,
  main_topics_en TEXT[] DEFAULT '{}',
  main_topics_ar TEXT[] DEFAULT '{}',
  bible_references JSONB DEFAULT '[]'::jsonb,
  teacher_explanations TEXT[] DEFAULT '{}',
  unsupported_claims TEXT[] DEFAULT '{}',
  review_status TEXT DEFAULT 'PENDING_REVIEW' CHECK (review_status IN ('PENDING_REVIEW', 'IN_REVIEW', 'SERVANT_APPROVED')),
  last_reviewed_by TEXT,
  last_reviewed_at TIMESTAMPTZ,
  allow_internet_search BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Create public.claim_evidence Table
CREATE TABLE IF NOT EXISTS public.claim_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_map_id UUID NOT NULL REFERENCES public.evidence_maps(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.lesson_sources(id) ON DELETE SET NULL,
  source_name TEXT NOT NULL,
  source_location TEXT NOT NULL,
  statement_en TEXT NOT NULL,
  statement_ar TEXT NOT NULL,
  quote_en TEXT,
  quote_ar TEXT,
  category TEXT,
  is_verified BOOLEAN DEFAULT false,
  servant_review_status TEXT DEFAULT 'PENDING' CHECK (servant_review_status IN ('PENDING', 'VERIFIED', 'FLAGGED', 'NEEDS_SOURCE')),
  servant_review_note TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Create public.source_conflicts Table
CREATE TABLE IF NOT EXISTS public.source_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_map_id UUID NOT NULL REFERENCES public.evidence_maps(id) ON DELETE CASCADE,
  source_a_id TEXT,
  source_a_name TEXT NOT NULL,
  source_a_location TEXT,
  source_a_quote TEXT,
  source_b_id TEXT,
  source_b_name TEXT NOT NULL,
  source_b_location TEXT,
  source_b_quote TEXT,
  conflict_description_en TEXT NOT NULL,
  conflict_description_ar TEXT NOT NULL,
  status TEXT DEFAULT 'UNRESOLVED' CHECK (status IN ('UNRESOLVED', 'RESOLVED')),
  resolution_note TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Create public.lesson_outlines & public.lesson_outline_sections Tables
CREATE TABLE IF NOT EXISTS public.lesson_outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  lesson_version_id UUID REFERENCES public.lesson_versions(id) ON DELETE SET NULL,
  is_approved_by_teacher BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.lesson_outline_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outline_id UUID NOT NULL REFERENCES public.lesson_outlines(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 1,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  title_cop TEXT,
  objective_en TEXT NOT NULL,
  objective_ar TEXT NOT NULL,
  source_refs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Create public.servant_review_comments Table
CREATE TABLE IF NOT EXISTS public.servant_review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  lesson_version_id UUID NOT NULL REFERENCES public.lesson_versions(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.lesson_sections(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  comment_type TEXT DEFAULT 'CONTENT',
  quote_highlighted TEXT,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT,
  resolved BOOLEAN DEFAULT false,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- Indexes for Performance and Query Optimization
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lessons_active_version_id ON public.lessons(active_version_id);
CREATE INDEX IF NOT EXISTS idx_lesson_versions_lesson_id ON public.lesson_versions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_versions_status ON public.lesson_versions(status);
CREATE INDEX IF NOT EXISTS idx_lesson_sections_version ON public.lesson_sections(lesson_version_id);
CREATE INDEX IF NOT EXISTS idx_lesson_sections_order ON public.lesson_sections(lesson_version_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lesson_sources_lesson ON public.lesson_sources(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_sources_uploader ON public.lesson_sources(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_lesson_section_sources_section ON public.lesson_section_sources(section_id);
CREATE INDEX IF NOT EXISTS idx_lesson_section_sources_source ON public.lesson_section_sources(source_id);
CREATE INDEX IF NOT EXISTS idx_evidence_maps_lesson ON public.evidence_maps(lesson_id);
CREATE INDEX IF NOT EXISTS idx_evidence_maps_version ON public.evidence_maps(lesson_version_id);
CREATE INDEX IF NOT EXISTS idx_claim_evidence_map ON public.claim_evidence(evidence_map_id);
CREATE INDEX IF NOT EXISTS idx_source_conflicts_map ON public.source_conflicts(evidence_map_id);
CREATE INDEX IF NOT EXISTS idx_lesson_outlines_lesson ON public.lesson_outlines(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_outline_sections_outline ON public.lesson_outline_sections(outline_id);
CREATE INDEX IF NOT EXISTS idx_servant_review_comments_version ON public.servant_review_comments(lesson_version_id);
CREATE INDEX IF NOT EXISTS idx_servant_review_comments_lesson ON public.servant_review_comments(lesson_id);

-- ------------------------------------------------------------------------------
-- Stored Procedures: Authoritative Publication Boundary
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_lesson_version(
  p_lesson_id UUID,
  p_version_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_version RECORD;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  -- 1. Verify target version exists and belongs to target lesson
  SELECT * INTO v_version
  FROM public.lesson_versions
  WHERE id = p_version_id AND lesson_id = p_lesson_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target lesson version does not exist or does not belong to lesson %', p_lesson_id;
  END IF;

  -- 2. Verify status is APPROVED or already PUBLISHED
  IF v_version.status NOT IN ('APPROVED', 'PUBLISHED') THEN
    RAISE EXCEPTION 'Cannot publish lesson version in status %; version must be APPROVED', v_version.status;
  END IF;

  -- 3. Verify ecclesiastical approval metadata
  IF v_version.status = 'APPROVED' AND (v_version.approved_by IS NULL OR v_version.approved_at IS NULL) THEN
    RAISE EXCEPTION 'Version lacks ecclesiastical approval metadata (approved_by, approved_at)';
  END IF;

  -- 4. Mark version as PUBLISHED
  UPDATE public.lesson_versions
  SET
    status = 'PUBLISHED',
    published_at = v_now,
    published_by = COALESCE(v_version.approved_by, 'Servant')
  WHERE id = p_version_id;

  -- 5. Atomically update authoritative pointer in lessons table
  UPDATE public.lessons
  SET
    active_version_id = p_version_id,
    lesson_status = 'published',
    status = 'published',
    approved_servant_name = COALESCE(v_version.approved_by, approved_servant_name),
    approved_at = COALESCE(v_version.approved_at, approved_at)
  WHERE id = p_lesson_id;

  RETURN jsonb_build_object(
    'success', true,
    'lesson_id', p_lesson_id,
    'version_id', p_version_id,
    'active_version_id', p_version_id,
    'status', 'PUBLISHED',
    'published_at', v_now
  );
END;
$$;

-- Revoke direct client access to privileged publishing RPC; grant to service_role
REVOKE ALL ON FUNCTION public.publish_lesson_version(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_lesson_version(UUID, UUID) TO service_role;

-- ------------------------------------------------------------------------------
-- Row Level Security (RLS) Policies & Role Grants
-- ------------------------------------------------------------------------------

-- Enable RLS on all newly added tables
ALTER TABLE public.lesson_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_section_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_outlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_outline_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servant_review_comments ENABLE ROW LEVEL SECURITY;

-- Grants for authenticated users and service_role
GRANT SELECT ON TABLE public.lesson_versions TO authenticated;
GRANT ALL ON TABLE public.lesson_versions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lesson_sections TO authenticated;
GRANT ALL ON TABLE public.lesson_sections TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lesson_sources TO authenticated;
GRANT ALL ON TABLE public.lesson_sources TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lesson_section_sources TO authenticated;
GRANT ALL ON TABLE public.lesson_section_sources TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.evidence_maps TO authenticated;
GRANT ALL ON TABLE public.evidence_maps TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.claim_evidence TO authenticated;
GRANT ALL ON TABLE public.claim_evidence TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.source_conflicts TO authenticated;
GRANT ALL ON TABLE public.source_conflicts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lesson_outlines TO authenticated;
GRANT ALL ON TABLE public.lesson_outlines TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lesson_outline_sections TO authenticated;
GRANT ALL ON TABLE public.lesson_outline_sections TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.servant_review_comments TO authenticated;
GRANT ALL ON TABLE public.servant_review_comments TO service_role;

-- Policies for lesson_sections: Authenticated can read, teachers/admins can write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies 
    WHERE schemaname = 'public' AND tablename = 'lesson_sections' AND policyname = 'lesson_sections_select_policy'
  ) THEN
    CREATE POLICY lesson_sections_select_policy ON public.lesson_sections
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies 
    WHERE schemaname = 'public' AND tablename = 'lesson_sections' AND policyname = 'lesson_sections_write_policy'
  ) THEN
    CREATE POLICY lesson_sections_write_policy ON public.lesson_sections
      FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
      );
  END IF;
END $$;

-- Policies for lesson_sources: Authenticated can read, teachers/admins can write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies 
    WHERE schemaname = 'public' AND tablename = 'lesson_sources' AND policyname = 'lesson_sources_select_policy'
  ) THEN
    CREATE POLICY lesson_sources_select_policy ON public.lesson_sources
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies 
    WHERE schemaname = 'public' AND tablename = 'lesson_sources' AND policyname = 'lesson_sources_write_policy'
  ) THEN
    CREATE POLICY lesson_sources_write_policy ON public.lesson_sources
      FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
      );
  END IF;
END $$;

-- Policies for lesson_section_sources: Authenticated can read, teachers/admins can write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies 
    WHERE schemaname = 'public' AND tablename = 'lesson_section_sources' AND policyname = 'lesson_section_sources_select_policy'
  ) THEN
    CREATE POLICY lesson_section_sources_select_policy ON public.lesson_section_sources
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies 
    WHERE schemaname = 'public' AND tablename = 'lesson_section_sources' AND policyname = 'lesson_section_sources_write_policy'
  ) THEN
    CREATE POLICY lesson_section_sources_write_policy ON public.lesson_section_sources
      FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
      );
  END IF;
END $$;

-- Policies for evidence_maps: Teachers/admins can read and write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies 
    WHERE schemaname = 'public' AND tablename = 'evidence_maps' AND policyname = 'evidence_maps_servant_policy'
  ) THEN
    CREATE POLICY evidence_maps_servant_policy ON public.evidence_maps
      FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
      );
  END IF;
END $$;

-- Policies for claim_evidence: Teachers/admins can read and write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies 
    WHERE schemaname = 'public' AND tablename = 'claim_evidence' AND policyname = 'claim_evidence_servant_policy'
  ) THEN
    CREATE POLICY claim_evidence_servant_policy ON public.claim_evidence
      FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
      );
  END IF;
END $$;

-- Policies for source_conflicts: Teachers/admins can read and write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies 
    WHERE schemaname = 'public' AND tablename = 'source_conflicts' AND policyname = 'source_conflicts_servant_policy'
  ) THEN
    CREATE POLICY source_conflicts_servant_policy ON public.source_conflicts
      FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
      );
  END IF;
END $$;

-- Policies for lesson_outlines & sections: Teachers/admins can read and write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies 
    WHERE schemaname = 'public' AND tablename = 'lesson_outlines' AND policyname = 'lesson_outlines_servant_policy'
  ) THEN
    CREATE POLICY lesson_outlines_servant_policy ON public.lesson_outlines
      FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies 
    WHERE schemaname = 'public' AND tablename = 'lesson_outline_sections' AND policyname = 'lesson_outline_sections_servant_policy'
  ) THEN
    CREATE POLICY lesson_outline_sections_servant_policy ON public.lesson_outline_sections
      FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
      );
  END IF;
END $$;

-- Policies for servant_review_comments: Teachers/admins can read and write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies 
    WHERE schemaname = 'public' AND tablename = 'servant_review_comments' AND policyname = 'servant_review_comments_servant_policy'
  ) THEN
    CREATE POLICY servant_review_comments_servant_policy ON public.servant_review_comments
      FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
      );
  END IF;
END $$;
