-- Phase 31: expose all attached sources for lessons the caller can actually read.
-- The previous function required a source to be linked to a lesson section in the
-- active version. Teacher recordings and handouts uploaded at lesson level are
-- valid lesson materials too, so that condition hid them from students.
-- can_read_curriculum_lesson enforces publication, active-version, class and
-- verified parent/child access rules; do not replace it with a status-only check.

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
