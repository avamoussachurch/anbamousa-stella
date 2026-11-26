CREATE OR REPLACE FUNCTION private.set_hymn_practice_student_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public','private'
AS $function$
BEGIN
  SELECT COALESCE(NULLIF(BTRIM(p.name), ''), 'Student')
  INTO NEW.student_name
  FROM public.profiles p
  WHERE p.id = NEW.student_id;

  IF NEW.student_name IS NULL THEN
    RAISE EXCEPTION 'Hymn practice student profile is unavailable';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS set_hymn_practice_student_name ON public.hymn_practice_submissions;
CREATE TRIGGER set_hymn_practice_student_name
BEFORE INSERT ON public.hymn_practice_submissions
FOR EACH ROW EXECUTE FUNCTION private.set_hymn_practice_student_name();
