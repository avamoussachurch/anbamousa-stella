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
  v_servant_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_read_curriculum_lesson(p_lesson_id) THEN
    RETURN NULL;
  END IF;

  SELECT
    CASE
      WHEN NULLIF(pg_catalog.btrim(lesson.approved_servant_name), '') IS NOT NULL
        AND pg_catalog.btrim(lesson.approved_servant_name) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN NULLIF(pg_catalog.btrim(lesson.approved_servant_name), '')
      ELSE NULL
    END,
    COALESCE(
      active_version.approved_by,
      CASE
        WHEN pg_catalog.btrim(COALESCE(lesson.approved_servant_name, '')) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN pg_catalog.btrim(lesson.approved_servant_name)::uuid
        ELSE NULL
      END,
      lesson.created_by
    )
  INTO v_name, v_servant_id
  FROM public.lessons AS lesson
  LEFT JOIN public.lesson_versions AS active_version
    ON active_version.id = lesson.active_version_id
  WHERE lesson.id = p_lesson_id;

  IF v_name IS NOT NULL THEN
    RETURN v_name;
  END IF;

  SELECT NULLIF(pg_catalog.btrim(profile.name), '')
  INTO v_name
  FROM public.profiles AS profile
  WHERE profile.id = v_servant_id;

  RETURN v_name;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_lesson_servant_display_name(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lesson_servant_display_name(UUID) TO authenticated;
