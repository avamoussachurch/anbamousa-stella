-- Let students in an authorized class retrieve the servant's lesson-level voice
-- recording even when the recording is attached to the lesson rather than a section.
-- Other source types remain subject to the active-version section-link requirement.
CREATE OR REPLACE FUNCTION public.can_read_curriculum_source(
  p_source_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $function$
DECLARE
  v_lesson_id UUID;
  v_source_type TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT source.lesson_id, source.type
  INTO v_lesson_id, v_source_type
  FROM public.lesson_sources AS source
  WHERE source.id = p_source_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF public.can_review_curriculum_lesson(v_lesson_id) THEN
    RETURN true;
  END IF;

  IF NOT public.can_read_curriculum_lesson(v_lesson_id) THEN
    RETURN false;
  END IF;

  IF upper(coalesce(v_source_type, '')) = 'TEACHER_VOICE' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.lessons AS lesson
      WHERE lesson.id = v_lesson_id
        AND lesson.active_version_id IS NOT NULL
        AND lower(coalesce(lesson.status, lesson.lesson_status, '')) = 'published'
    );
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.lesson_section_sources AS section_source
    JOIN public.lesson_sections AS section
      ON section.id = section_source.section_id
    JOIN public.lesson_versions AS lesson_version
      ON lesson_version.id = section.lesson_version_id
    JOIN public.lessons AS lesson
      ON lesson.id = lesson_version.lesson_id
    WHERE section_source.source_id = p_source_id
      AND lesson.id = v_lesson_id
      AND lesson.active_version_id = lesson_version.id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.can_read_curriculum_source(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_curriculum_source(UUID) TO authenticated, service_role;
