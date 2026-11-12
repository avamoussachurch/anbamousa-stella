-- Phase 24: evaluate JWT identity helpers once per statement in RLS policies.
-- This preserves each policy's logic and only wraps direct auth.uid() calls in scalar SELECTs.

DO $migration$
DECLARE
  policy_row record;
  optimized_using text;
  optimized_check text;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    optimized_using := CASE
      WHEN policy_row.qual IS NULL THEN NULL
      ELSE regexp_replace(
        policy_row.qual,
        '(?i)(?<!select )auth\.uid\(\)',
        '( SELECT auth.uid() )',
        'g'
      )
    END;

    optimized_check := CASE
      WHEN policy_row.with_check IS NULL THEN NULL
      ELSE regexp_replace(
        policy_row.with_check,
        '(?i)(?<!select )auth\.uid\(\)',
        '( SELECT auth.uid() )',
        'g'
      )
    END;

    IF optimized_using IS DISTINCT FROM policy_row.qual THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I USING (%s)',
        policy_row.policyname,
        policy_row.schemaname,
        policy_row.tablename,
        optimized_using
      );
    END IF;

    IF optimized_check IS DISTINCT FROM policy_row.with_check THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
        policy_row.policyname,
        policy_row.schemaname,
        policy_row.tablename,
        optimized_check
      );
    END IF;
  END LOOP;
END
$migration$;
