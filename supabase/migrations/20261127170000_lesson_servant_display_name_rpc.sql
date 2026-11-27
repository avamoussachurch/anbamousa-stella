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
