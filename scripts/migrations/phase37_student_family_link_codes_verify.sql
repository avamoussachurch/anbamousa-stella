-- Phase 37 verification: private access, uniqueness, and code format.
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  has_table_privilege('anon', 'public.student_family_link_codes', 'SELECT') AS anon_can_select,
  has_table_privilege('authenticated', 'public.student_family_link_codes', 'SELECT') AS authenticated_can_select,
  has_table_privilege('service_role', 'public.student_family_link_codes', 'SELECT') AS service_role_can_select,
  (SELECT count(*) FROM public.student_family_link_codes) AS issued_codes,
  (SELECT count(*) FROM public.student_family_link_codes WHERE code !~ '^ST-[A-Z0-9]{10}$') AS malformed_codes
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'student_family_link_codes';
