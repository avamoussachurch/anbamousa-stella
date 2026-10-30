-- Add the narrowly scoped database read permission required by the trusted
-- Express publishing route, which checks for an active scheduled job before
-- calling the service-role-only immediate-publish RPC.
--
-- Run only after Phase 11 has completed and committed successfully.
-- This does not grant access to anon/authenticated, change RLS, or alter any
-- publication jobs. Run only after verifying Phase 11 is already installed.
-- Safe to rerun: GRANT is idempotent.

BEGIN;

DO $preflight$
DECLARE
  v_table_oid REGCLASS := pg_catalog.to_regclass('public.lesson_publication_jobs');
BEGIN
  IF v_table_oid IS NULL THEN
    RAISE EXCEPTION
      'public.lesson_publication_jobs is missing; inspect the database and apply Phase 11 once before Phase 12.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute
    WHERE attrelid = v_table_oid
      AND attname IN ('id', 'lesson_id', 'status')
      AND NOT attisdropped
    GROUP BY attrelid
    HAVING COUNT(*) = 3
  ) THEN
    RAISE EXCEPTION
      'public.lesson_publication_jobs does not have the expected lookup columns; inspect it before granting access.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class
    WHERE oid = v_table_oid
      AND relrowsecurity
  ) THEN
    RAISE EXCEPTION
      'RLS is not enabled on public.lesson_publication_jobs; do not grant access until the Phase 11 schema is reviewed.';
  END IF;
END;
$preflight$;

GRANT SELECT ON TABLE public.lesson_publication_jobs TO service_role;

COMMIT;
