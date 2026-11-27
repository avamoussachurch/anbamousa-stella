-- Lesson-level voice recordings and handouts are valid lesson materials even
-- when they are not linked to a particular section. Access remains scoped by
-- can_read_curriculum_lesson(), which enforces publication, active version,
-- class membership, and verified parent/child access.
CREATE OR REPLACE FUNCTION public.can_read_curriculum_source(p_source_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
DECLARE
  v_lesson_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT source.lesson_id
  INTO v_lesson_id
  FROM public.lesson_sources AS source
  WHERE source.id = p_source_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN public.can_read_curriculum_lesson(v_lesson_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.can_read_curriculum_source(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_curriculum_source(UUID) TO authenticated, service_role;
