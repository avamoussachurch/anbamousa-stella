BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hymns_taxis_level INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.profiles'::pg_catalog.regclass
      AND conname = 'profiles_hymns_taxis_level_valid'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_hymns_taxis_level_valid
      CHECK (hymns_taxis_level IS NULL OR hymns_taxis_level IN (1, 2, 3)) NOT VALID;
  END IF;
END;
$$;

ALTER TABLE public.coptic_taxis_items
  ADD COLUMN IF NOT EXISTS level INTEGER;

DO $$
DECLARE
  v_policy RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.coptic_taxis_items'::pg_catalog.regclass
      AND conname = 'coptic_taxis_items_level_valid'
  ) THEN
    ALTER TABLE public.coptic_taxis_items
      ADD CONSTRAINT coptic_taxis_items_level_valid
      CHECK (level IS NULL OR level IN (1, 2, 3)) NOT VALID;
  END IF;

  IF pg_catalog.to_regclass('public.hymns') IS NOT NULL THEN
    ALTER TABLE public.hymns ENABLE ROW LEVEL SECURITY;
    GRANT SELECT ON TABLE public.hymns TO authenticated;
    FOR v_policy IN
      SELECT policyname
      FROM pg_catalog.pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'hymns'
        AND cmd = 'SELECT'
    LOOP
      EXECUTE pg_catalog.format('DROP POLICY %I ON public.hymns', v_policy.policyname);
    END LOOP;

    CREATE POLICY hymns_select_assigned_level
      ON public.hymns FOR SELECT TO authenticated
      USING (
        status = 'published'
        AND EXISTS (
          SELECT 1
          FROM public.profiles AS p
          WHERE p.id = auth.uid()
            AND p.role = 'student'
            AND p.hymns_taxis_level = public.hymns.level
        )
      );
    CREATE POLICY hymns_select_staff
      ON public.hymns FOR SELECT TO authenticated
      USING (public.is_church_servant_or_admin());
  END IF;

  ALTER TABLE public.coptic_taxis_items ENABLE ROW LEVEL SECURITY;
  GRANT SELECT ON TABLE public.coptic_taxis_items TO authenticated;

  FOR v_policy IN
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coptic_taxis_items'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE pg_catalog.format('DROP POLICY %I ON public.coptic_taxis_items', v_policy.policyname);
  END LOOP;

  CREATE POLICY taxis_items_select_assigned_level
    ON public.coptic_taxis_items FOR SELECT TO authenticated
    USING (
      status = 'published'
      AND level IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = auth.uid()
          AND p.role = 'student'
          AND p.hymns_taxis_level = public.coptic_taxis_items.level
          AND (
            public.coptic_taxis_items.target_audience IN ('ALL', 'CONGREGATION')
            OR (
              public.coptic_taxis_items.target_audience = 'DEACONS'
              AND p.hymns_taxis_level >= 2
            )
          )
      )
    );
  CREATE POLICY taxis_items_select_staff
    ON public.coptic_taxis_items FOR SELECT TO authenticated
    USING (public.is_church_servant_or_admin());
END;
$$;

GRANT INSERT (level) ON TABLE public.coptic_taxis_items TO authenticated;
GRANT UPDATE (level) ON TABLE public.coptic_taxis_items TO authenticated;

REVOKE UPDATE (hymns_taxis_level)
  ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

DROP POLICY IF EXISTS "hymns_memberships_insert_student_pending" ON public.hymns_memberships;
REVOKE INSERT ON TABLE public.hymns_memberships FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id, student_id, student_name, level, roster_group, status, notes, reviewed_by, reviewed_at, created_at, updated_at)
  ON TABLE public.hymns_memberships FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.hymns_memberships TO service_role;

CREATE OR REPLACE FUNCTION public.create_student_profile_for_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  v_grade TEXT := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'grade'), '');
  v_level_text TEXT := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'hymns_taxis_level'), '');
  v_level INTEGER := NULL;
  v_valid_grades CONSTANT TEXT[] := ARRAY[
    'KG1', 'KG2',
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
    'Prep 1', 'Prep 2', 'Prep 3',
    'Secondary 1', 'Secondary 2', 'Secondary 3',
    'University'
  ];
BEGIN
  IF v_grade IS NOT NULL OR v_level_text IS NOT NULL THEN
    IF v_grade IS NULL OR NOT (v_grade = ANY(v_valid_grades)) THEN
      RAISE EXCEPTION 'A valid Sunday School grade is required';
    END IF;
    IF v_level_text IS NULL OR v_level_text !~ '^[1-3]$' THEN
      RAISE EXCEPTION 'A valid shared Hymns and Taxis level is required';
    END IF;
    v_level := v_level_text::INTEGER;
  END IF;

  INSERT INTO public.profiles (id, name, email, role, grade, hymns_taxis_level)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(COALESCE(NEW.email, ''), '@', 1),
      'Student'
    ),
    COALESCE(NEW.email, NEW.phone, NEW.id::TEXT || '@no-email.invalid'),
    'student',
    v_grade,
    v_level
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_student_profile_for_auth_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_student_profile_for_auth_user() TO service_role;

COMMIT;
