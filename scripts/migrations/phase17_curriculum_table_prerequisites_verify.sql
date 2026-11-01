-- Read-only verification for the Phase 17 curriculum prerequisites.
SELECT 'Hymns table exists' AS check_name,
       pg_catalog.to_regclass('public.hymns') IS NOT NULL AS passed,
       COALESCE(pg_catalog.to_regclass('public.hymns')::TEXT, 'missing') AS details
UNION ALL
SELECT 'Coptic Taxis items table exists',
       pg_catalog.to_regclass('public.coptic_taxis_items') IS NOT NULL,
       COALESCE(pg_catalog.to_regclass('public.coptic_taxis_items')::TEXT, 'missing')
UNION ALL
SELECT 'Hymns has level and status columns',
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'hymns' AND column_name = 'level' AND data_type = 'integer'
       )
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'hymns' AND column_name = 'status'
       ),
       'Expected integer level and status columns.'
UNION ALL
SELECT 'Coptic Taxis has level, status, and target audience columns',
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'coptic_taxis_items' AND column_name = 'level' AND data_type = 'integer'
       )
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'coptic_taxis_items' AND column_name = 'status'
       )
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'coptic_taxis_items' AND column_name = 'target_audience'
       ),
       'Expected integer level, status, and target_audience columns.'
UNION ALL
SELECT 'Both curriculum tables have RLS enabled',
       (
         SELECT count(*) = 2
         FROM pg_catalog.pg_class AS c
         WHERE c.oid IN (
           pg_catalog.to_regclass('public.hymns'),
           pg_catalog.to_regclass('public.coptic_taxis_items')
         )
           AND c.relrowsecurity
       ),
       'RLS must be enabled on both tables.';
