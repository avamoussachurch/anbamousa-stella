BEGIN;

CREATE TABLE IF NOT EXISTS public.lesson_section_progress (
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  sections_completed TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  total_sections INTEGER NOT NULL CHECK (total_sections > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (student_id, lesson_id, version_id)
);

ALTER TABLE public.lesson_section_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lesson_section_progress FROM anon, authenticated, public;
GRANT ALL ON TABLE public.lesson_section_progress TO service_role;

CREATE OR REPLACE FUNCTION public.set_lesson_section_read(
  p_student_id UUID,
  p_lesson_id TEXT,
  p_version_id TEXT,
  p_section_id TEXT,
  p_is_read BOOLEAN,
  p_total_sections INTEGER
)
RETURNS TABLE (sections_completed TEXT[], total_sections INTEGER, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Only the trusted server may update lesson section progress.';
  END IF;
  IF p_student_id IS NULL OR p_lesson_id IS NULL OR p_version_id IS NULL
     OR p_section_id IS NULL OR p_is_read IS NULL
     OR p_total_sections IS NULL OR p_total_sections < 1 THEN
    RAISE EXCEPTION 'Invalid lesson section progress parameters.';
  END IF;

  RETURN QUERY
  INSERT INTO public.lesson_section_progress AS current_progress (
    student_id, lesson_id, version_id, sections_completed, total_sections, updated_at
  )
  VALUES (
    p_student_id,
    p_lesson_id,
    p_version_id,
    CASE WHEN p_is_read THEN ARRAY[p_section_id] ELSE ARRAY[]::TEXT[] END,
    p_total_sections,
    timezone('utc'::text, now())
  )
  ON CONFLICT (student_id, lesson_id, version_id) DO UPDATE
  SET sections_completed = CASE
        WHEN p_is_read AND NOT (p_section_id = ANY(current_progress.sections_completed))
          THEN array_append(current_progress.sections_completed, p_section_id)
        WHEN NOT p_is_read
          THEN array_remove(current_progress.sections_completed, p_section_id)
        ELSE current_progress.sections_completed
      END,
      total_sections = EXCLUDED.total_sections,
      updated_at = timezone('utc'::text, now())
  RETURNING current_progress.sections_completed,
            current_progress.total_sections,
            current_progress.updated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.set_lesson_section_read(UUID, TEXT, TEXT, TEXT, BOOLEAN, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_lesson_section_read(UUID, TEXT, TEXT, TEXT, BOOLEAN, INTEGER)
  TO service_role;

COMMIT;
