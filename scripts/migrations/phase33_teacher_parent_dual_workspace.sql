-- Phase 33: teacher accounts also receive parent workspace eligibility.
-- Child records remain protected by verified family relationships.
BEGIN;

DO $preflight$
BEGIN
  IF pg_catalog.to_regclass('public.profile_role_assignments') IS NULL THEN
    RAISE EXCEPTION 'Phase 33 requires Phase 13 multi-role assignments.';
  END IF;
  IF pg_catalog.to_regprocedure('public.grant_profile_role_internal(uuid,text,uuid,text,text,text,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Trusted internal role-grant function is missing.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid='public.profiles'::pg_catalog.regclass
      AND tgname='create_role_assignment_for_new_profile'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Default profile role assignment trigger is missing.';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.grant_parent_workspace_to_teacher()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
BEGIN
  IF NEW.role = 'teacher' THEN
    PERFORM public.grant_profile_role_internal(
      NEW.id, 'parent', NULL, 'registration', 'registration',
      'Teacher accounts also receive parent workspace access; child data remains protected by verified family links.'
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_parent_workspace_to_teacher() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS grant_parent_workspace_to_teacher ON public.profiles;
CREATE TRIGGER grant_parent_workspace_to_teacher
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_parent_workspace_to_teacher();

-- Backfill the additional parent role for every currently active teacher account.
DO $backfill$
DECLARE
  teacher_record RECORD;
BEGIN
  FOR teacher_record IN
    SELECT DISTINCT ra.user_id
    FROM public.profile_role_assignments AS ra
    WHERE ra.role = 'teacher' AND ra.revoked_at IS NULL
  LOOP
    PERFORM public.grant_profile_role_internal(
      teacher_record.user_id, 'parent', NULL, 'migration', 'trusted_server',
      'Phase 33: enable parent workspace for existing teacher accounts.'
    );
  END LOOP;
END;
$backfill$;

COMMIT;
