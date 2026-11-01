-- Phase 16: authorize scheduled lesson publication using active normalized roles.
-- Apply after Phase 11 and Phase 13. This migration changes function bodies only;
-- it does not apply itself or alter curriculum records.
BEGIN;

DO $preflight$
DECLARE
  v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF pg_catalog.to_regclass('public.profile_role_assignments') IS NULL THEN
    v_missing := pg_catalog.array_append(v_missing, 'public.profile_role_assignments (Phase 13)');
  END IF;
  IF pg_catalog.to_regclass('public.lesson_publication_jobs') IS NULL THEN
    v_missing := pg_catalog.array_append(v_missing, 'public.lesson_publication_jobs (Phase 11)');
  END IF;
  IF pg_catalog.to_regprocedure('public.publish_lesson_version_immediately(uuid,uuid,uuid)') IS NULL
     OR pg_catalog.to_regprocedure('public.schedule_lesson_publication(uuid,uuid,timestamp with time zone)') IS NULL
     OR pg_catalog.to_regprocedure('public.reschedule_lesson_publication(uuid,timestamp with time zone)') IS NULL
     OR pg_catalog.to_regprocedure('public.cancel_lesson_publication(uuid)') IS NULL
     OR pg_catalog.to_regprocedure('public.list_lesson_publications()') IS NULL
     OR pg_catalog.to_regprocedure('public.process_due_lesson_publications()') IS NULL THEN
    v_missing := pg_catalog.array_append(v_missing, 'Phase 11 scheduled-publication functions');
  END IF;
  IF pg_catalog.cardinality(v_missing) > 0 THEN
    RAISE EXCEPTION
      'Phase 16 prerequisites are missing: %. Inspect first and apply only the missing prerequisite migrations.',
      pg_catalog.array_to_string(v_missing, ', ');
  END IF;
END;
$preflight$;

DO $role_authorization$
DECLARE
  v_definition TEXT;
  v_original TEXT;
BEGIN
  SELECT pg_catalog.pg_get_functiondef(
    'public.publish_lesson_version_immediately(uuid,uuid,uuid)'::pg_catalog.regprocedure
  ) INTO v_definition;
  v_original := v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    'SELECT[[:space:]]+p\.role[[:space:]]+INTO[[:space:]]+v_role[[:space:]]+FROM[[:space:]]+public\.profiles[[:space:]]+AS[[:space:]]+p[[:space:]]+WHERE[[:space:]]+p\.id[[:space:]]*=[[:space:]]*p_actor_id;',
    'SELECT CASE WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = p_actor_id AND ra.role = ''admin'' AND ra.revoked_at IS NULL) THEN ''admin'' WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = p_actor_id AND ra.role = ''teacher'' AND ra.revoked_at IS NULL) THEN ''teacher'' ELSE NULL END INTO v_role;',
    'g'
  );
  IF v_definition = v_original THEN
    RAISE EXCEPTION 'Phase 16 could not identify the expected immediate-publish role check.';
  END IF;
  EXECUTE v_definition;

  SELECT pg_catalog.pg_get_functiondef(
    'public.schedule_lesson_publication(uuid,uuid,timestamp with time zone)'::pg_catalog.regprocedure
  ) INTO v_definition;
  v_original := v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    'SELECT[[:space:]]+p\.role[[:space:]]+INTO[[:space:]]+v_role[[:space:]]+FROM[[:space:]]+public\.profiles[[:space:]]+AS[[:space:]]+p[[:space:]]+WHERE[[:space:]]+p\.id[[:space:]]*=[[:space:]]*v_actor;',
    'SELECT CASE WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = v_actor AND ra.role = ''admin'' AND ra.revoked_at IS NULL) THEN ''admin'' WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = v_actor AND ra.role = ''teacher'' AND ra.revoked_at IS NULL) THEN ''teacher'' ELSE NULL END INTO v_role;',
    'g'
  );
  IF v_definition = v_original THEN
    RAISE EXCEPTION 'Phase 16 could not identify the expected schedule role check.';
  END IF;
  EXECUTE v_definition;

  SELECT pg_catalog.pg_get_functiondef(
    'public.reschedule_lesson_publication(uuid,timestamp with time zone)'::pg_catalog.regprocedure
  ) INTO v_definition;
  v_original := v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    'SELECT[[:space:]]+p\.role[[:space:]]+INTO[[:space:]]+v_role[[:space:]]+FROM[[:space:]]+public\.profiles[[:space:]]+AS[[:space:]]+p[[:space:]]+WHERE[[:space:]]+p\.id[[:space:]]*=[[:space:]]*v_actor;',
    'SELECT CASE WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = v_actor AND ra.role = ''admin'' AND ra.revoked_at IS NULL) THEN ''admin'' WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = v_actor AND ra.role = ''teacher'' AND ra.revoked_at IS NULL) THEN ''teacher'' ELSE NULL END INTO v_role;',
    'g'
  );
  IF v_definition = v_original THEN
    RAISE EXCEPTION 'Phase 16 could not identify the expected reschedule role check.';
  END IF;
  EXECUTE v_definition;

  SELECT pg_catalog.pg_get_functiondef(
    'public.cancel_lesson_publication(uuid)'::pg_catalog.regprocedure
  ) INTO v_definition;
  v_original := v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    'SELECT[[:space:]]+p\.role[[:space:]]+INTO[[:space:]]+v_role[[:space:]]+FROM[[:space:]]+public\.profiles[[:space:]]+AS[[:space:]]+p[[:space:]]+WHERE[[:space:]]+p\.id[[:space:]]*=[[:space:]]*v_actor;',
    'SELECT CASE WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = v_actor AND ra.role = ''admin'' AND ra.revoked_at IS NULL) THEN ''admin'' WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = v_actor AND ra.role = ''teacher'' AND ra.revoked_at IS NULL) THEN ''teacher'' ELSE NULL END INTO v_role;',
    'g'
  );
  IF v_definition = v_original THEN
    RAISE EXCEPTION 'Phase 16 could not identify the expected cancellation role check.';
  END IF;
  EXECUTE v_definition;

  SELECT pg_catalog.pg_get_functiondef(
    'public.list_lesson_publications()'::pg_catalog.regprocedure
  ) INTO v_definition;
  v_original := v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    'SELECT[[:space:]]+p\.role[[:space:]]+INTO[[:space:]]+v_role[[:space:]]+FROM[[:space:]]+public\.profiles[[:space:]]+AS[[:space:]]+p[[:space:]]+WHERE[[:space:]]+p\.id[[:space:]]*=[[:space:]]*v_actor;',
    'SELECT CASE WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = v_actor AND ra.role = ''admin'' AND ra.revoked_at IS NULL) THEN ''admin'' WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = v_actor AND ra.role = ''teacher'' AND ra.revoked_at IS NULL) THEN ''teacher'' ELSE NULL END INTO v_role;',
    'g'
  );
  IF v_definition = v_original THEN
    RAISE EXCEPTION 'Phase 16 could not identify the expected publication-list role check.';
  END IF;
  EXECUTE v_definition;

  SELECT pg_catalog.pg_get_functiondef(
    'public.process_due_lesson_publications()'::pg_catalog.regprocedure
  ) INTO v_definition;
  v_original := v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    'SELECT[[:space:]]+p\.role[[:space:]]+INTO[[:space:]]+v_scheduler_role[[:space:]]+FROM[[:space:]]+public\.profiles[[:space:]]+AS[[:space:]]+p[[:space:]]+WHERE[[:space:]]+p\.id[[:space:]]*=[[:space:]]*v_job\.scheduled_by;',
    'SELECT CASE WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = v_job.scheduled_by AND ra.role = ''admin'' AND ra.revoked_at IS NULL) THEN ''admin'' WHEN EXISTS (SELECT 1 FROM public.profile_role_assignments ra WHERE ra.user_id = v_job.scheduled_by AND ra.role = ''teacher'' AND ra.revoked_at IS NULL) THEN ''teacher'' ELSE NULL END INTO v_scheduler_role;',
    'g'
  );
  IF v_definition = v_original THEN
    RAISE EXCEPTION 'Phase 16 could not identify the expected due-publication role check.';
  END IF;
  EXECUTE v_definition;
END;
$role_authorization$;

COMMIT;
