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

-- Return only the public servant display name for a lesson the caller is
-- already authorized to read; never expose the underlying account identifier.
CREATE OR REPLACE FUNCTION public.get_lesson_servant_display_name(p_lesson_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $function$
DECLARE
  v_name text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_read_curriculum_lesson(p_lesson_id) THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    NULLIF(pg_catalog.btrim(lesson.approved_servant_name), ''),
    NULLIF(pg_catalog.btrim(profile.name), '')
  )
  INTO v_name
  FROM public.lessons AS lesson
  LEFT JOIN public.lesson_versions AS active_version
    ON active_version.id = lesson.active_version_id
  LEFT JOIN public.profiles AS profile
    ON profile.id = COALESCE(active_version.approved_by, lesson.created_by)
  WHERE lesson.id = p_lesson_id;

  RETURN v_name;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_lesson_servant_display_name(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lesson_servant_display_name(UUID) TO authenticated;
