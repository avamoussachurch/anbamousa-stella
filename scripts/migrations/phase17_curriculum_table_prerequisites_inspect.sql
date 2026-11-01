-- Read-only inspection for the Phase 17 curriculum table prerequisites.
SELECT
  table_name,
  pg_catalog.to_regclass('public.' || table_name) IS NOT NULL AS table_exists,
  COALESCE((
    SELECT c.relrowsecurity
    FROM pg_catalog.pg_class AS c
    WHERE c.oid = pg_catalog.to_regclass('public.' || table_name)
  ), false) AS rls_enabled,
  COALESCE((
    SELECT pg_catalog.string_agg(
      column_name || ' ' || data_type,
      ', ' ORDER BY ordinal_position
    )
    FROM information_schema.columns AS col
    WHERE col.table_schema = 'public'
      AND col.table_name = expected.table_name
  ), 'No columns found') AS columns
FROM (VALUES ('hymns'), ('coptic_taxis_items')) AS expected(table_name);

SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('hymns', 'coptic_taxis_items')
ORDER BY tablename, policyname;
