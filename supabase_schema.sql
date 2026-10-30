-- ==============================================================================
-- Coptic Sunday School & Church Education Platform - Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- Then apply the existing migrations and rerun scripts/migrations/phase4_security_hardening.sql last.
-- The matching Phase 4 block is appended here; rerunning the additive migration is safe.
-- ==============================================================================

-- 1. Create Profiles Table (linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
  grade TEXT DEFAULT '4th Grade',
  avatar TEXT DEFAULT 'https://api.dicebear.com/7.x/bottts/svg?seed=coptic_student',
  points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 1,
  longest_streak INTEGER DEFAULT 1,
  parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  require_reward_approval BOOLEAN DEFAULT true,
  push_notifications_enabled BOOLEAN DEFAULT true,
  notify_lesson_completion BOOLEAN DEFAULT true,
  notify_event_reminders BOOLEAN DEFAULT true,
  screen_time_seconds INTEGER DEFAULT 0,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by authenticated users" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile or parents can update children" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id OR auth.uid() = parent_id);

-- 2. Create Lessons Table (Curriculum, Quizzes & Multimedia References)
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bible', 'hymns', 'history', 'virtues')),
  grade_level TEXT NOT NULL,
  summary_en TEXT,
  summary_ar TEXT,
  scripture_verse_en TEXT,
  scripture_verse_ar TEXT,
  verse_reference TEXT,
  audio_url TEXT, -- Link to Supabase Storage hymn/reading
  pdf_worksheet_url TEXT, -- Link to Supabase Storage coloring sheet/PDF
  points_reward INTEGER DEFAULT 100,
  quiz_questions JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read lessons" 
  ON public.lessons FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Teachers and admins can manage lessons" 
  ON public.lessons FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'teacher' OR profiles.role = 'admin')
    )
  );

-- 3. Create Lesson Completions / Progress Table
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  quiz_score INTEGER DEFAULT 0,
  verse_memorized BOOLEAN DEFAULT false,
  points_earned INTEGER DEFAULT 0,
  servant_feedback TEXT,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(student_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users and their parents can view progress" 
  ON public.lesson_progress FOR SELECT 
  TO authenticated 
  USING (
    auth.uid() = student_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = student_id AND profiles.parent_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('teacher', 'admin'))
  );

CREATE POLICY "Students can update their progress" 
  ON public.lesson_progress FOR ALL 
  TO authenticated 
  USING (auth.uid() = student_id OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('teacher', 'admin')));

-- 4. Create Church Events & Liturgy Notifications Table
CREATE TABLE IF NOT EXISTS public.church_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('liturgy', 'sunday_school', 'parent_meeting', 'hymns', 'feast', 'service')),
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location_en TEXT,
  location_ar TEXT,
  description_en TEXT,
  description_ar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.church_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read church events" 
  ON public.church_events FOR SELECT 
  TO authenticated 
  USING (true);

-- 5. Create Reward Approval Requests Table
CREATE TABLE IF NOT EXISTS public.reward_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_id TEXT NOT NULL,
  reward_name_en TEXT NOT NULL,
  reward_name_ar TEXT NOT NULL,
  cost_points INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  parent_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  decided_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.reward_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reward requests access policy" 
  ON public.reward_requests FOR ALL 
  TO authenticated 
  USING (
    auth.uid() = student_id 
    OR auth.uid() = parent_id 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- 6. Create User Relationships Table (Parent-Child and Guardian-Student Linking)
CREATE TABLE IF NOT EXISTS public.user_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_code TEXT,
  relationship_type TEXT DEFAULT 'parent_child' CHECK (relationship_type IN ('parent_child', 'guardian_student', 'teacher_student')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(parent_id, child_id)
);

ALTER TABLE public.user_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own relationships" 
  ON public.user_relationships FOR SELECT 
  TO authenticated 
  USING (auth.uid() = parent_id OR auth.uid() = child_id OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'teacher')));

CREATE POLICY "Parents can insert and manage child relationships" 
  ON public.user_relationships FOR ALL 
  TO authenticated 
  USING (auth.uid() = parent_id OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- 7. Supabase Storage Buckets Setup Note:
-- Create three public buckets in Supabase Dashboard -> Storage:
-- 1) 'avatars' (for high-resolution student and servant profile photos)
-- 2) 'hymns-audio' (for MP3/M4A liturgical chant recordings)
-- 3) 'lesson-worksheets' (for Sunday School PDF coloring sheets and handouts)

-- ==============================================================================
-- 8. PHASE 3B: AUTHORITATIVE CHURCH YEARS & CLASS INSTANCES SCHEMA
-- ==============================================================================

-- Church Years Table
CREATE TABLE IF NOT EXISTS public.church_years (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  activated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_church_years_single_active 
ON public.church_years (is_active) 
WHERE is_active = true;

-- Year-Specific Class Instances (Exactly 6 per year)
CREATE TABLE IF NOT EXISTS public.class_instances (
  id TEXT PRIMARY KEY,
  church_year_id TEXT NOT NULL REFERENCES public.church_years(id) ON DELETE RESTRICT,
  class_group_id TEXT NOT NULL CHECK (class_group_id IN ('angels', 'primary_1', 'primary_2', 'preparatory', 'secondary', 'university')),
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  join_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_year_class_group UNIQUE (church_year_id, class_group_id),
  CONSTRAINT uq_class_instance_join_code UNIQUE (join_code),
  CONSTRAINT uq_class_instances_id_year UNIQUE (id, church_year_id)
);

-- Public Directory View (Security Invoker, strictly omits join_code)
CREATE OR REPLACE VIEW public.class_instances_directory
WITH (security_invoker = true)
AS
SELECT 
  id, 
  church_year_id, 
  class_group_id, 
  name_en, 
  name_ar, 
  created_at, 
  updated_at
FROM public.class_instances;

-- Student Class Memberships (At most 1 per student per year, preserved upon removal)
CREATE TABLE IF NOT EXISTS public.class_memberships (
  id TEXT PRIMARY KEY,
  church_year_id TEXT NOT NULL REFERENCES public.church_years(id) ON DELETE RESTRICT,
  class_instance_id TEXT NOT NULL,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  exact_grade TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'transferred', 'graduated')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  left_at TIMESTAMPTZ,
  removal_reason TEXT,
  enrolled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_student_church_year UNIQUE (church_year_id, student_id),
  CONSTRAINT fk_membership_instance_and_year 
    FOREIGN KEY (class_instance_id, church_year_id) 
    REFERENCES public.class_instances (id, church_year_id) 
    ON DELETE RESTRICT
);

-- Servant Class Assignments
CREATE TABLE IF NOT EXISTS public.servant_class_assignments (
  id TEXT PRIMARY KEY,
  church_year_id TEXT NOT NULL REFERENCES public.church_years(id) ON DELETE RESTRICT,
  class_instance_id TEXT NOT NULL,
  servant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT uq_servant_class_year UNIQUE (church_year_id, class_instance_id, servant_id),
  CONSTRAINT fk_servant_instance_and_year 
    FOREIGN KEY (class_instance_id, church_year_id) 
    REFERENCES public.class_instances (id, church_year_id) 
    ON DELETE RESTRICT
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_class_memberships_student ON public.class_memberships(student_id, church_year_id);
CREATE INDEX IF NOT EXISTS idx_class_memberships_instance ON public.class_memberships(class_instance_id, status);
CREATE INDEX IF NOT EXISTS idx_servant_assignments_servant ON public.servant_class_assignments(servant_id, church_year_id, is_active);

-- Enable RLS
ALTER TABLE public.church_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servant_class_assignments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "church_years_select" ON public.church_years FOR SELECT TO authenticated USING (true);

CREATE POLICY "class_instances_authorized_select" ON public.class_instances
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.servant_class_assignments sca
    JOIN public.church_years cy ON cy.id = sca.church_year_id
    WHERE sca.servant_id = auth.uid()
      AND sca.class_instance_id = public.class_instances.id
      AND sca.is_active = true
      AND cy.is_active = true
  )
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

GRANT SELECT ON public.class_instances_directory TO authenticated;

CREATE POLICY "servant_assignments_select" ON public.servant_class_assignments
FOR SELECT TO authenticated
USING (
  servant_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "servant_assignments_admin_manage" ON public.servant_class_assignments
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = servant_id AND role IN ('teacher', 'admin'))
);

CREATE POLICY "memberships_select" ON public.class_memberships
FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.servant_class_assignments sca
    JOIN public.church_years cy ON cy.id = sca.church_year_id
    WHERE sca.servant_id = auth.uid()
      AND sca.class_instance_id = public.class_memberships.class_instance_id
      AND sca.is_active = true
      AND cy.is_active = true
  )
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Seed Initial Active Church Year (2026-2027)
INSERT INTO public.church_years (id, name, start_date, end_date, is_active, activated_at)
VALUES ('2026-2027', '2026 / 2027', '2026-09-01', '2027-08-31', true, timezone('utc'::text, now()))
ON CONFLICT (id) DO NOTHING;

-- Seed Exactly 6 Class Instances for 2026-2027
INSERT INTO public.class_instances (id, church_year_id, class_group_id, name_en, name_ar, join_code)
VALUES
  ('inst_2026-2027_angels', '2026-2027', 'angels', 'Angels', 'فصل الملايكة', 'MUSA-ANG1'),
  ('inst_2026-2027_primary_1', '2026-2027', 'primary_1', 'Primary 1–3', 'فصل ابتدائي 1–3', 'MUSA-7K4P'),
  ('inst_2026-2027_primary_2', '2026-2027', 'primary_2', 'Primary 4–6', 'فصل ابتدائي 4–6', 'MUSA-P46B'),
  ('inst_2026-2027_preparatory', '2026-2027', 'preparatory', 'Preparatory', 'فصل إعدادي', 'MUSA-PRP1'),
  ('inst_2026-2027_secondary', '2026-2027', 'secondary', 'Secondary', 'فصل ثانوي', 'MUSA-SEC1'),
  ('inst_2026-2027_university', '2026-2027', 'university', 'University & Youth', 'فصل شباب جامعة', 'MUSA-UNI1')
ON CONFLICT (id) DO NOTHING;

-- Security Definer Procedures (Hardened search_path = '')
CREATE OR REPLACE FUNCTION public.generate_class_join_code() 
RETURNS TEXT 
LANGUAGE plpgsql 
VOLATILE 
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  chars TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  result TEXT := 'MUSA-';
  v_uuid TEXT;
  val INT;
  i INT;
BEGIN
  v_uuid := pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '');
  FOR i IN 1..4 LOOP
    val := ('x' || pg_catalog.substr(v_uuid, (i - 1) * 2 + 1, 2))::bit(8)::int;
    result := result || pg_catalog.substr(chars, (val % pg_catalog.length(chars)) + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_new_church_year(
  p_year_id TEXT,
  p_name TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_existing_active_id TEXT;
  v_groups TEXT[] := ARRAY['angels', 'primary_1', 'primary_2', 'preparatory', 'secondary', 'university'];
  v_names_en TEXT[] := ARRAY['Angels', 'Primary 1–3', 'Primary 4–6', 'Preparatory', 'Secondary', 'University & Youth'];
  v_names_ar TEXT[] := ARRAY['فصل الملايكة', 'فصل ابتدائي 1–3', 'فصل ابتدائي 4–6', 'فصل إعدادي', 'فصل ثانوي', 'فصل شباب جامعة'];
  v_group_id TEXT;
  v_inst_id TEXT;
  v_code TEXT;
  v_created_instances INT := 0;
  i INT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated: Sign-in required.';
  END IF;

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
  IF v_caller_role IS NULL OR v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only an administrator can start a new church year.';
  END IF;

  LOCK TABLE public.church_years IN EXCLUSIVE MODE;

  IF EXISTS (SELECT 1 FROM public.church_years WHERE id = p_year_id) THEN
    RAISE EXCEPTION 'Conflict: Church year % already exists.', p_year_id;
  END IF;

  SELECT id INTO v_existing_active_id FROM public.church_years WHERE is_active = true;
  IF v_existing_active_id IS NOT NULL THEN
    UPDATE public.church_years 
    SET is_active = false, archived_at = pg_catalog.timezone('utc'::text, pg_catalog.now())
    WHERE id = v_existing_active_id;
  END IF;

  INSERT INTO public.church_years (id, name, start_date, end_date, is_active, activated_at)
  VALUES (p_year_id, p_name, p_start_date, p_end_date, true, pg_catalog.timezone('utc'::text, pg_catalog.now()));

  FOR i IN 1..6 LOOP
    v_group_id := v_groups[i];
    v_inst_id := 'inst_' || p_year_id || '_' || v_group_id;
    
    LOOP
      v_code := public.generate_class_join_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.class_instances WHERE join_code = v_code);
    END LOOP;

    INSERT INTO public.class_instances (
      id, church_year_id, class_group_id, name_en, name_ar, join_code
    ) VALUES (
      v_inst_id, p_year_id, v_group_id, v_names_en[i], v_names_ar[i], v_code
    );
    v_created_instances := v_created_instances + 1;
  END LOOP;

  IF v_created_instances <> 6 THEN
    RAISE EXCEPTION 'Activation Failed: Expected exactly 6 class instances, created %.', v_created_instances;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'activatedYear', p_year_id,
    'previousYearArchived', v_existing_active_id,
    'classInstancesCreated', v_created_instances
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.join_class_by_code(p_join_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_student_id UUID;
  v_student_role TEXT;
  v_student_grade TEXT;
  v_active_year_id TEXT;
  v_instance_id TEXT;
  v_class_group_id TEXT;
  v_compatible BOOLEAN := false;
  v_existing_id TEXT;
  v_existing_status TEXT;
  v_mem_id TEXT;
BEGIN
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated: Sign-in required.';
  END IF;

  SELECT role, grade INTO v_student_role, v_student_grade 
  FROM public.profiles WHERE id = v_student_id;

  IF v_student_role IS NULL OR v_student_role <> 'student' THEN
    RAISE EXCEPTION 'Forbidden: Only students can join a class via code.';
  END IF;

  SELECT id INTO v_active_year_id FROM public.church_years WHERE is_active = true;
  IF v_active_year_id IS NULL THEN
    RAISE EXCEPTION 'No active church year configured.';
  END IF;

  SELECT id, class_group_id INTO v_instance_id, v_class_group_id
  FROM public.class_instances 
  WHERE join_code = pg_catalog.upper(pg_catalog.trim(p_join_code)) 
    AND church_year_id = v_active_year_id;

  IF v_instance_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired class join code for the active church year.';
  END IF;

  IF (v_class_group_id = 'angels' AND v_student_grade IN ('KG1', 'KG2')) OR
     (v_class_group_id = 'primary_1' AND v_student_grade IN ('Grade 1', 'Grade 2', 'Grade 3')) OR
     (v_class_group_id = 'primary_2' AND v_student_grade IN ('Grade 4', 'Grade 5', 'Grade 6')) OR
     (v_class_group_id = 'preparatory' AND v_student_grade IN ('Prep 1', 'Prep 2', 'Prep 3')) OR
     (v_class_group_id = 'secondary' AND v_student_grade IN ('Secondary 1', 'Secondary 2', 'Secondary 3')) OR
     (v_class_group_id = 'university' AND v_student_grade IN ('University', 'Youth')) THEN
    v_compatible := true;
  END IF;

  IF NOT v_compatible THEN
    RAISE EXCEPTION 'Grade Incompatibility: Student grade % cannot join class group %.', v_student_grade, v_class_group_id;
  END IF;

  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.class_memberships
  WHERE church_year_id = v_active_year_id AND student_id = v_student_id;

  IF v_existing_id IS NOT NULL THEN
    IF v_existing_status = 'active' THEN
      RAISE EXCEPTION 'Student is already actively enrolled in this church year.';
    ELSE
      UPDATE public.class_memberships
      SET status = 'active',
          class_instance_id = v_instance_id,
          exact_grade = v_student_grade,
          joined_at = pg_catalog.timezone('utc'::text, pg_catalog.now()),
          left_at = NULL,
          removal_reason = NULL,
          enrolled_by = v_student_id
      WHERE id = v_existing_id;

      RETURN pg_catalog.jsonb_build_object(
        'success', true, 
        'action', 'reactivated', 
        'membershipId', v_existing_id, 
        'classInstanceId', v_instance_id
      );
    END IF;
  ELSE
    v_mem_id := 'mem_' || pg_catalog.substr(v_student_id::text, 1, 8) || '_' || v_active_year_id;
    INSERT INTO public.class_memberships (
      id, church_year_id, class_instance_id, student_id, exact_grade, status, enrolled_by
    ) VALUES (
      v_mem_id, v_active_year_id, v_instance_id, v_student_id, v_student_grade, 'active', v_student_id
    );

    RETURN pg_catalog.jsonb_build_object(
      'success', true, 
      'action', 'enrolled', 
      'membershipId', v_mem_id, 
      'classInstanceId', v_instance_id
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.enroll_student_in_class(
  p_student_id UUID, 
  p_class_instance_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_active_year_id TEXT;
  v_inst_year_id TEXT;
  v_class_group_id TEXT;
  v_student_role TEXT;
  v_student_grade TEXT;
  v_is_authorized BOOLEAN := false;
  v_compatible BOOLEAN := false;
  v_existing_id TEXT;
  v_existing_status TEXT;
  v_mem_id TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated: Sign-in required.';
  END IF;

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
  IF v_caller_role NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only servants or administrators can manually enroll students.';
  END IF;

  SELECT id INTO v_active_year_id FROM public.church_years WHERE is_active = true;
  IF v_active_year_id IS NULL THEN
    RAISE EXCEPTION 'No active church year configured.';
  END IF;

  SELECT church_year_id, class_group_id INTO v_inst_year_id, v_class_group_id
  FROM public.class_instances WHERE id = p_class_instance_id;

  IF v_inst_year_id IS NULL OR v_inst_year_id <> v_active_year_id THEN
    RAISE EXCEPTION 'Invalid class instance: must belong to the active church year %.', v_active_year_id;
  END IF;

  IF v_caller_role = 'admin' THEN
    v_is_authorized := true;
  ELSIF v_caller_role = 'teacher' AND EXISTS (
    SELECT 1 FROM public.servant_class_assignments
    WHERE servant_id = v_caller_id 
      AND class_instance_id = p_class_instance_id 
      AND is_active = true
      AND church_year_id = v_active_year_id
  ) THEN
    v_is_authorized := true;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Unauthorized: Servant is not assigned to this class instance in the active church year.';
  END IF;

  SELECT role, grade INTO v_student_role, v_student_grade FROM public.profiles WHERE id = p_student_id;
  IF v_student_role IS NULL OR v_student_role <> 'student' THEN
    RAISE EXCEPTION 'Target user does not exist or does not hold the student role.';
  END IF;

  IF (v_class_group_id = 'angels' AND v_student_grade IN ('KG1', 'KG2')) OR
     (v_class_group_id = 'primary_1' AND v_student_grade IN ('Grade 1', 'Grade 2', 'Grade 3')) OR
     (v_class_group_id = 'primary_2' AND v_student_grade IN ('Grade 4', 'Grade 5', 'Grade 6')) OR
     (v_class_group_id = 'preparatory' AND v_student_grade IN ('Prep 1', 'Prep 2', 'Prep 3')) OR
     (v_class_group_id = 'secondary' AND v_student_grade IN ('Secondary 1', 'Secondary 2', 'Secondary 3')) OR
     (v_class_group_id = 'university' AND v_student_grade IN ('University', 'Youth')) THEN
    v_compatible := true;
  END IF;

  IF NOT v_compatible THEN
    RAISE EXCEPTION 'Grade Incompatibility: Student grade % is not compatible with class group %.', v_student_grade, v_class_group_id;
  END IF;

  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.class_memberships
  WHERE church_year_id = v_active_year_id AND student_id = p_student_id;

  IF v_existing_id IS NOT NULL THEN
    IF v_existing_status = 'active' THEN
      RAISE EXCEPTION 'Student already has an active class membership in this church year.';
    ELSE
      UPDATE public.class_memberships
      SET status = 'active',
          class_instance_id = p_class_instance_id,
          exact_grade = v_student_grade,
          joined_at = pg_catalog.timezone('utc'::text, pg_catalog.now()),
          left_at = NULL,
          removal_reason = NULL,
          enrolled_by = v_caller_id
      WHERE id = v_existing_id;

      RETURN pg_catalog.jsonb_build_object(
        'success', true, 
        'action', 'reactivated', 
        'membershipId', v_existing_id, 
        'classInstanceId', p_class_instance_id
      );
    END IF;
  ELSE
    v_mem_id := 'mem_' || pg_catalog.substr(p_student_id::text, 1, 8) || '_' || v_active_year_id;
    INSERT INTO public.class_memberships (
      id, church_year_id, class_instance_id, student_id, exact_grade, status, enrolled_by
    ) VALUES (
      v_mem_id, v_active_year_id, p_class_instance_id, p_student_id, v_student_grade, 'active', v_caller_id
    );

    RETURN pg_catalog.jsonb_build_object(
      'success', true, 
      'action', 'enrolled', 
      'membershipId', v_mem_id, 
      'classInstanceId', p_class_instance_id
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_student_from_class(
  p_membership_id TEXT, 
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_active_year_id TEXT;
  v_mem_year_id TEXT;
  v_mem_instance_id TEXT;
  v_mem_status TEXT;
  v_is_authorized BOOLEAN := false;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated: Sign-in required.';
  END IF;

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only an assigned servant or administrator can remove a student.';
  END IF;

  SELECT id INTO v_active_year_id FROM public.church_years WHERE is_active = true;
  IF v_active_year_id IS NULL THEN
    RAISE EXCEPTION 'No active church year configured.';
  END IF;

  SELECT church_year_id, class_instance_id, status 
  INTO v_mem_year_id, v_mem_instance_id, v_mem_status
  FROM public.class_memberships 
  WHERE id = p_membership_id;

  IF v_mem_instance_id IS NULL THEN
    RAISE EXCEPTION 'Membership not found.';
  END IF;

  IF v_mem_year_id <> v_active_year_id THEN
    RAISE EXCEPTION 'Invalid Operation: Historical or archived memberships cannot be modified.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.class_instances 
    WHERE id = v_mem_instance_id AND church_year_id = v_active_year_id
  ) THEN
    RAISE EXCEPTION 'Data Integrity Violation: Target class instance does not belong to the active church year.';
  END IF;

  IF v_caller_role = 'admin' THEN
    v_is_authorized := true;
  ELSIF v_caller_role = 'teacher' THEN
    IF EXISTS (
      SELECT 1 FROM public.servant_class_assignments
      WHERE servant_id = v_caller_id 
        AND class_instance_id = v_mem_instance_id 
        AND church_year_id = v_active_year_id 
        AND is_active = true
    ) THEN
      v_is_authorized := true;
    END IF;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Unauthorized: Servant is not assigned to this class instance in the active church year.';
  END IF;

  IF v_mem_status = 'inactive' THEN
    RAISE EXCEPTION 'Student membership is already inactive.';
  END IF;

  UPDATE public.class_memberships
  SET status = 'inactive',
      left_at = pg_catalog.timezone('utc'::text, pg_catalog.now()),
      removal_reason = pg_catalog.trim(p_reason)
  WHERE id = p_membership_id;

  RETURN pg_catalog.jsonb_build_object(
    'success', true, 
    'membershipId', p_membership_id, 
    'status', 'inactive',
    'leftAt', pg_catalog.timezone('utc'::text, pg_catalog.now())
  );
END;
$$;

-- Function Execution Grants & Revokes
REVOKE ALL ON FUNCTION public.generate_class_join_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_new_church_year(TEXT, TEXT, DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_class_by_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enroll_student_in_class(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_student_from_class(TEXT, TEXT) FROM PUBLIC;

-- 11. Create Hymns School Roster Memberships Table
CREATE TABLE IF NOT EXISTS public.hymns_memberships (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
  roster_group TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.hymns_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own hymns enrollment"
  ON public.hymns_memberships FOR SELECT
  TO authenticated
  USING (student_id = auth.uid()::text);

CREATE POLICY "Students can submit own hymns enrollment"
  ON public.hymns_memberships FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid()::text AND status = 'pending');

CREATE POLICY "Servants and Admins can view all hymns enrollment requests"
  ON public.hymns_memberships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Servants and Admins can update hymns enrollment status"
  ON public.hymns_memberships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- 12. Create Coptic Rituals / Taxis Items Table
CREATE TABLE IF NOT EXISTS public.coptic_taxis_items (
  id TEXT PRIMARY KEY,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_coptic TEXT,
  category TEXT NOT NULL CHECK (category IN ('LITURGY', 'SACRAMENT', 'FEAST', 'FASTING', 'DEACON_SERVICE', 'CLERICAL', 'PRAYER_CANON')),
  season TEXT NOT NULL,
  target_audience TEXT NOT NULL CHECK (target_audience IN ('ALL', 'DEACONS', 'SERVANTS', 'CONGREGATION')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'published', 'unpublished', 'archived')),
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  reviewed_by TEXT,
  published_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.coptic_taxis_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view published taxis rituals"
  ON public.coptic_taxis_items FOR SELECT
  TO authenticated
  USING (status = 'published');

CREATE POLICY "Servants and Admins can view draft and in-review taxis rituals"
  ON public.coptic_taxis_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Servants and Admins can manage taxis items"
  ON public.coptic_taxis_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- ==============================================================================
-- 16. Curriculum Versioning, Sections, Sources, Evidence Maps, and Outlines
-- ==============================================================================

-- 16.1 Create public.lesson_versions Table
CREATE TABLE IF NOT EXISTS public.lesson_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'AI_DRAFT' CHECK (status IN ('AI_DRAFT', 'SERVANT_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'PUBLISHED')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  approval_note TEXT,
  change_reason TEXT,
  published_at TIMESTAMPTZ,
  published_by TEXT,
  summary_en TEXT,
  summary_ar TEXT,
  summary_cop TEXT,
  big_idea_en TEXT,
  big_idea_ar TEXT,
  objectives_en TEXT[] DEFAULT '{}',
  objectives_ar TEXT[] DEFAULT '{}',
  recap_en TEXT,
  recap_ar TEXT,
  narration_script_en TEXT,
  narration_script_ar TEXT,
  tts_audio_url_en TEXT,
  tts_audio_url_ar TEXT,
  tts_status TEXT DEFAULT 'NONE' CHECK (tts_status IN ('NONE', 'PENDING', 'GENERATED', 'STALE')),
  quiz_draft JSONB,
  slides JSONB,
  flashcards JSONB,
  CONSTRAINT uq_lesson_versions_lesson_version UNIQUE (lesson_id, version_number)
);

-- 16.2 Add Authoritative Active Version and Review Columns to public.lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS active_version_id UUID REFERENCES public.lesson_versions(id) ON DELETE SET NULL;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS lesson_status TEXT DEFAULT 'draft';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS approved_servant_name TEXT;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 16.3 Create public.lesson_sections Table
CREATE TABLE IF NOT EXISTS public.lesson_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_version_id UUID NOT NULL REFERENCES public.lesson_versions(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 1,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  title_cop TEXT,
  content_en TEXT NOT NULL,
  content_ar TEXT NOT NULL,
  content_cop TEXT,
  teacher_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 16.4 Create public.lesson_sources Table
CREATE TABLE IF NOT EXISTS public.lesson_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  session_id TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_url TEXT,
  file_size BIGINT,
  description TEXT,
  teacher_notes TEXT,
  rights_status TEXT DEFAULT 'TEACHER_OWNED',
  processing_status TEXT DEFAULT 'INDEXED',
  priority TEXT DEFAULT 'PRIMARY',
  transcript TEXT,
  extracted_content TEXT,
  page_count INTEGER,
  slide_count INTEGER,
  duration_seconds INTEGER,
  youtube_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 16.5 Create public.lesson_section_sources Junction Table
CREATE TABLE IF NOT EXISTS public.lesson_section_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.lesson_sections(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.lesson_sources(id) ON DELETE CASCADE,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_section_source UNIQUE (section_id, source_id)
);

-- 16.6 Create public.evidence_maps Table
CREATE TABLE IF NOT EXISTS public.evidence_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  lesson_version_id UUID REFERENCES public.lesson_versions(id) ON DELETE SET NULL,
  main_topics_en TEXT[] DEFAULT '{}',
  main_topics_ar TEXT[] DEFAULT '{}',
  bible_references JSONB DEFAULT '[]'::jsonb,
  teacher_explanations TEXT[] DEFAULT '{}',
  unsupported_claims TEXT[] DEFAULT '{}',
  review_status TEXT DEFAULT 'PENDING_REVIEW' CHECK (review_status IN ('PENDING_REVIEW', 'IN_REVIEW', 'SERVANT_APPROVED')),
  last_reviewed_by TEXT,
  last_reviewed_at TIMESTAMPTZ,
  allow_internet_search BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 16.7 Create public.claim_evidence Table
CREATE TABLE IF NOT EXISTS public.claim_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_map_id UUID NOT NULL REFERENCES public.evidence_maps(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.lesson_sources(id) ON DELETE SET NULL,
  source_name TEXT NOT NULL,
  source_location TEXT NOT NULL,
  statement_en TEXT NOT NULL,
  statement_ar TEXT NOT NULL,
  quote_en TEXT,
  quote_ar TEXT,
  category TEXT,
  is_verified BOOLEAN DEFAULT false,
  servant_review_status TEXT DEFAULT 'PENDING' CHECK (servant_review_status IN ('PENDING', 'VERIFIED', 'FLAGGED', 'NEEDS_SOURCE')),
  servant_review_note TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 16.8 Create public.source_conflicts Table
CREATE TABLE IF NOT EXISTS public.source_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_map_id UUID NOT NULL REFERENCES public.evidence_maps(id) ON DELETE CASCADE,
  source_a_id TEXT,
  source_a_name TEXT NOT NULL,
  source_a_location TEXT,
  source_a_quote TEXT,
  source_b_id TEXT,
  source_b_name TEXT NOT NULL,
  source_b_location TEXT,
  source_b_quote TEXT,
  conflict_description_en TEXT NOT NULL,
  conflict_description_ar TEXT NOT NULL,
  status TEXT DEFAULT 'UNRESOLVED' CHECK (status IN ('UNRESOLVED', 'RESOLVED')),
  resolution_note TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 16.9 Create public.lesson_outlines & public.lesson_outline_sections Tables
CREATE TABLE IF NOT EXISTS public.lesson_outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  lesson_version_id UUID REFERENCES public.lesson_versions(id) ON DELETE SET NULL,
  is_approved_by_teacher BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.lesson_outline_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outline_id UUID NOT NULL REFERENCES public.lesson_outlines(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 1,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  title_cop TEXT,
  objective_en TEXT NOT NULL,
  objective_ar TEXT NOT NULL,
  source_refs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 16.10 Create public.servant_review_comments Table
CREATE TABLE IF NOT EXISTS public.servant_review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  lesson_version_id UUID NOT NULL REFERENCES public.lesson_versions(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.lesson_sections(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  comment_type TEXT DEFAULT 'CONTENT',
  quote_highlighted TEXT,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT,
  resolved BOOLEAN DEFAULT false,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lessons_active_version_id ON public.lessons(active_version_id);
CREATE INDEX IF NOT EXISTS idx_lesson_versions_lesson_id ON public.lesson_versions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_versions_status ON public.lesson_versions(status);
CREATE INDEX IF NOT EXISTS idx_lesson_sections_version ON public.lesson_sections(lesson_version_id);
CREATE INDEX IF NOT EXISTS idx_lesson_sections_order ON public.lesson_sections(lesson_version_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lesson_sources_lesson ON public.lesson_sources(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_sources_uploader ON public.lesson_sources(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_lesson_section_sources_section ON public.lesson_section_sources(section_id);
CREATE INDEX IF NOT EXISTS idx_lesson_section_sources_source ON public.lesson_section_sources(source_id);
CREATE INDEX IF NOT EXISTS idx_evidence_maps_lesson ON public.evidence_maps(lesson_id);
CREATE INDEX IF NOT EXISTS idx_evidence_maps_version ON public.evidence_maps(lesson_version_id);
CREATE INDEX IF NOT EXISTS idx_claim_evidence_map ON public.claim_evidence(evidence_map_id);
CREATE INDEX IF NOT EXISTS idx_source_conflicts_map ON public.source_conflicts(evidence_map_id);
CREATE INDEX IF NOT EXISTS idx_lesson_outlines_lesson ON public.lesson_outlines(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_outline_sections_outline ON public.lesson_outline_sections(outline_id);
CREATE INDEX IF NOT EXISTS idx_servant_review_comments_version ON public.servant_review_comments(lesson_version_id);
CREATE INDEX IF NOT EXISTS idx_servant_review_comments_lesson ON public.servant_review_comments(lesson_id);

-- Publishing RPC
CREATE OR REPLACE FUNCTION public.publish_lesson_version(
  p_lesson_id UUID,
  p_version_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_version RECORD;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  SELECT * INTO v_version
  FROM public.lesson_versions
  WHERE id = p_version_id AND lesson_id = p_lesson_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target lesson version does not exist or does not belong to lesson %', p_lesson_id;
  END IF;

  IF v_version.status NOT IN ('APPROVED', 'PUBLISHED') THEN
    RAISE EXCEPTION 'Cannot publish lesson version in status %; version must be APPROVED', v_version.status;
  END IF;

  IF v_version.status = 'APPROVED' AND (v_version.approved_by IS NULL OR v_version.approved_at IS NULL) THEN
    RAISE EXCEPTION 'Version lacks ecclesiastical approval metadata (approved_by, approved_at)';
  END IF;

  UPDATE public.lesson_versions
  SET
    status = 'PUBLISHED',
    published_at = v_now,
    published_by = COALESCE(v_version.approved_by, 'Servant')
  WHERE id = p_version_id;

  UPDATE public.lessons
  SET
    active_version_id = p_version_id,
    lesson_status = 'published',
    status = 'published',
    approved_servant_name = COALESCE(v_version.approved_by, approved_servant_name),
    approved_at = COALESCE(v_version.approved_at, approved_at)
  WHERE id = p_lesson_id;

  RETURN jsonb_build_object(
    'success', true,
    'lesson_id', p_lesson_id,
    'version_id', p_version_id,
    'active_version_id', p_version_id,
    'status', 'PUBLISHED',
    'published_at', v_now
  );
END;
$$;

-- RLS Enablement & Initial Policies
ALTER TABLE public.lesson_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_section_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_outlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_outline_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servant_review_comments ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.lesson_versions TO authenticated;
GRANT ALL ON TABLE public.lesson_versions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lesson_sections TO authenticated;
GRANT ALL ON TABLE public.lesson_sections TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lesson_sources TO authenticated;
GRANT ALL ON TABLE public.lesson_sources TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lesson_section_sources TO authenticated;
GRANT ALL ON TABLE public.lesson_section_sources TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.evidence_maps TO authenticated;
GRANT ALL ON TABLE public.evidence_maps TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.claim_evidence TO authenticated;
GRANT ALL ON TABLE public.claim_evidence TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.source_conflicts TO authenticated;
GRANT ALL ON TABLE public.source_conflicts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lesson_outlines TO authenticated;
GRANT ALL ON TABLE public.lesson_outlines TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lesson_outline_sections TO authenticated;
GRANT ALL ON TABLE public.lesson_outline_sections TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.servant_review_comments TO authenticated;
GRANT ALL ON TABLE public.servant_review_comments TO service_role;

-- BEGIN PHASE 4 SECURITY HARDENING
BEGIN;

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'student';

ALTER TABLE public.user_relationships
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.is_church_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_church_servant_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.role IN ('teacher', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_student_level()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT COALESCE(
    (
      SELECT 3
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND (p.role IN ('teacher', 'admin') OR p.grade ILIKE '%deacon%' OR p.grade ILIKE '%servant%')
    ),
    (
      SELECT 2
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND (p.grade ILIKE '%prep%' OR p.grade ILIKE '%secondary%' OR p.grade ILIKE '%uni%')
    ),
    1
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_student_data(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT p_student_id = auth.uid()
    OR public.is_church_admin()
    OR EXISTS (
      SELECT 1
      FROM public.user_relationships AS ur
      WHERE ur.parent_id = auth.uid()
        AND ur.child_id = p_student_id
        AND ur.relationship_type IN ('parent_child', 'guardian_student')
        AND ur.verified_at IS NOT NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles AS caller
      JOIN public.class_memberships AS cm
        ON cm.student_id = p_student_id
       AND cm.status = 'active'
      JOIN public.servant_class_assignments AS sca
        ON sca.class_instance_id = cm.class_instance_id
       AND sca.church_year_id = cm.church_year_id
       AND sca.servant_id = caller.id
       AND sca.is_active = true
      JOIN public.church_years AS cy
        ON cy.id = cm.church_year_id
       AND cy.is_active = true
      WHERE caller.id = auth.uid()
        AND caller.role = 'teacher'
    );
$$;

CREATE OR REPLACE FUNCTION public.can_read_profile(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT p_profile_id = auth.uid()
    OR public.is_church_admin()
    OR EXISTS (
      SELECT 1
      FROM public.user_relationships AS ur
      WHERE ur.parent_id = auth.uid()
        AND ur.child_id = p_profile_id
        AND ur.relationship_type IN ('parent_child', 'guardian_student')
        AND ur.verified_at IS NOT NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles AS target
      JOIN public.class_memberships AS cm
        ON cm.student_id = target.id
       AND cm.status = 'active'
      JOIN public.servant_class_assignments AS sca
        ON sca.class_instance_id = cm.class_instance_id
       AND sca.church_year_id = cm.church_year_id
       AND sca.servant_id = auth.uid()
       AND sca.is_active = true
      JOIN public.church_years AS cy
        ON cy.id = cm.church_year_id
       AND cy.is_active = true
      JOIN public.profiles AS caller
        ON caller.id = auth.uid()
       AND caller.role = 'teacher'
      WHERE target.id = p_profile_id
        AND target.role = 'student'
    );
$$;

CREATE OR REPLACE FUNCTION public.provision_profile_role(
  p_user_id UUID,
  p_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Role provisioning is restricted to the trusted server.'
      USING ERRCODE = '42501';
  END IF;

  IF p_role NOT IN ('student', 'teacher', 'parent', 'admin') THEN
    RAISE EXCEPTION 'Invalid profile role.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
  SET role = p_role
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.provision_verified_family_relationship(
  p_parent_id UUID,
  p_child_id UUID,
  p_relationship_type TEXT DEFAULT 'parent_child'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  v_parent_role TEXT;
  v_child_role TEXT;
  v_relationship_id UUID;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Family relationship provisioning is restricted to the trusted server.'
      USING ERRCODE = '42501';
  END IF;

  IF p_relationship_type NOT IN ('parent_child', 'guardian_student') THEN
    RAISE EXCEPTION 'Invalid family relationship type.' USING ERRCODE = '22023';
  END IF;

  SELECT role INTO v_parent_role
  FROM public.profiles
  WHERE id = p_parent_id;

  SELECT role INTO v_child_role
  FROM public.profiles
  WHERE id = p_child_id;

  IF v_parent_role <> 'parent' OR v_child_role <> 'student' THEN
    RAISE EXCEPTION 'A verified relationship requires a parent and a student profile.'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_relationships (
    parent_id, child_id, relationship_type, verified_at
  )
  VALUES (
    p_parent_id, p_child_id, p_relationship_type, pg_catalog.now()
  )
  ON CONFLICT (parent_id, child_id)
  DO UPDATE SET
    relationship_type = EXCLUDED.relationship_type,
    verified_at = EXCLUDED.verified_at
  RETURNING id INTO v_relationship_id;

  RETURN v_relationship_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_lesson_completion(
  p_student_id UUID,
  p_lesson_id UUID,
  p_completed_at TIMESTAMPTZ
)
RETURNS TABLE (
  points_awarded INTEGER,
  total_points INTEGER,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  v_was_completed BOOLEAN;
  v_points_awarded INTEGER := 0;
  v_total_points INTEGER;
  v_completed_at TIMESTAMPTZ;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Lesson completion writes are restricted to the trusted server.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_student_id
      AND role = 'student'
  ) THEN
    RAISE EXCEPTION 'Target profile is not an authorized student.'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.lesson_progress (student_id, lesson_id, completed, points_earned, completed_at)
  VALUES (p_student_id, p_lesson_id, false, 0, COALESCE(p_completed_at, pg_catalog.now()))
  ON CONFLICT (student_id, lesson_id) DO NOTHING;

  SELECT lp.completed, lp.completed_at
  INTO v_was_completed, v_completed_at
  FROM public.lesson_progress AS lp
  WHERE lp.student_id = p_student_id
    AND lp.lesson_id = p_lesson_id
  FOR UPDATE;

  IF NOT COALESCE(v_was_completed, false) THEN
    v_points_awarded := 50;
    v_completed_at := COALESCE(p_completed_at, pg_catalog.now());

    UPDATE public.lesson_progress
    SET completed = true,
        points_earned = v_points_awarded,
        completed_at = v_completed_at
    WHERE student_id = p_student_id
      AND lesson_id = p_lesson_id;

    UPDATE public.profiles
    SET points = COALESCE(points, 0) + v_points_awarded,
        last_active = v_completed_at
    WHERE id = p_student_id
    RETURNING points INTO v_total_points;
  ELSE
    SELECT COALESCE(p.points, 0)
    INTO v_total_points
    FROM public.profiles AS p
    WHERE p.id = p_student_id;
  END IF;

  RETURN QUERY SELECT v_points_awarded, v_total_points, v_completed_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_student_profile_for_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(COALESCE(NEW.email, ''), '@', 1),
      'Student'
    ),
    COALESCE(NEW.email, NEW.phone, NEW.id::TEXT || '@no-email.invalid'),
    'student'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger AS t
    WHERE t.tgname = 'on_auth_user_created_student_profile'
      AND t.tgrelid = 'auth.users'::pg_catalog.regclass
      AND NOT t.tgisinternal
  ) THEN
    CREATE TRIGGER on_auth_user_created_student_profile
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.create_student_profile_for_auth_user();
  END IF;
END;
$$;

INSERT INTO public.profiles (id, name, email, role)
SELECT
  u.id,
  COALESCE(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(COALESCE(u.email, ''), '@', 1),
    'Student'
  ),
  COALESCE(u.email, u.phone, u.id::TEXT || '@no-email.invalid'),
  'student'
FROM auth.users AS u
LEFT JOIN public.profiles AS p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

REVOKE ALL ON FUNCTION public.is_church_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_church_servant_or_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_current_student_level() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_student_data(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_read_profile(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.provision_profile_role(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.provision_verified_family_relationship(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_lesson_completion(UUID, UUID, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_student_profile_for_auth_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_church_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_church_servant_or_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_student_level() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_student_data(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_read_profile(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.provision_profile_role(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.provision_verified_family_relationship(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_lesson_completion(UUID, UUID, TIMESTAMPTZ) TO service_role;

DO $$
DECLARE
  v_policy RECORD;
BEGIN
  FOR v_policy IN
    SELECT schemaname, tablename, policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles',
        'lesson_progress',
        'reward_requests',
        'user_relationships',
        'lessons',
        'hymns_memberships'
      )
  LOOP
    EXECUTE pg_catalog.format(
      'DROP POLICY %I ON %I.%I',
      v_policy.policyname,
      v_policy.schemaname,
      v_policy.tablename
    );
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile or parents can update children" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authorized" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_student_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_safe_self_fields" ON public.profiles;

CREATE POLICY "profiles_select_authorized"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.can_read_profile(id));

CREATE POLICY "profiles_insert_student_self"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND role = 'student');

CREATE POLICY "profiles_update_safe_self_fields"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_church_admin())
  WITH CHECK (id = auth.uid() OR public.is_church_admin());

REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id, name, email, role, grade, avatar, points, current_streak, longest_streak, parent_id, require_reward_approval, push_notifications_enabled, notify_lesson_completion, notify_event_reminders, screen_time_seconds, last_active, created_at)
  ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (id, name, email, role, grade, avatar, points, current_streak, longest_streak, parent_id, require_reward_approval, push_notifications_enabled, notify_lesson_completion, notify_event_reminders, screen_time_seconds, last_active, created_at)
  ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT INSERT (id, name, email, avatar)
  ON TABLE public.profiles TO authenticated;
GRANT UPDATE (name, avatar, require_reward_approval, push_notifications_enabled, notify_lesson_completion, notify_event_reminders, screen_time_seconds, last_active)
  ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

DROP POLICY IF EXISTS "Users and their parents can view progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Students can update their progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "lesson_progress_select_authorized" ON public.lesson_progress;
CREATE POLICY "lesson_progress_select_authorized"
  ON public.lesson_progress FOR SELECT TO authenticated
  USING (public.can_access_student_data(student_id));

REVOKE ALL PRIVILEGES ON TABLE public.lesson_progress FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.lesson_progress TO authenticated;
GRANT ALL ON TABLE public.lesson_progress TO service_role;

DROP POLICY IF EXISTS "Reward requests access policy" ON public.reward_requests;
DROP POLICY IF EXISTS "reward_requests_select_related" ON public.reward_requests;
DROP POLICY IF EXISTS "reward_requests_insert_student_pending" ON public.reward_requests;
DROP POLICY IF EXISTS "reward_requests_update_verified_parent_pending" ON public.reward_requests;

CREATE POLICY "reward_requests_select_related"
  ON public.reward_requests FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.is_church_admin()
    OR EXISTS (
      SELECT 1
      FROM public.user_relationships AS ur
      WHERE ur.parent_id = auth.uid()
        AND ur.child_id = reward_requests.student_id
        AND ur.relationship_type IN ('parent_child', 'guardian_student')
        AND ur.verified_at IS NOT NULL
    )
  );

CREATE POLICY "reward_requests_insert_student_pending"
  ON public.reward_requests FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND status = 'pending'
    AND cost_points > 0
    AND EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'student'
    )
    AND (
      parent_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.user_relationships AS ur
        WHERE ur.parent_id = reward_requests.parent_id
          AND ur.child_id = reward_requests.student_id
          AND ur.relationship_type IN ('parent_child', 'guardian_student')
          AND ur.verified_at IS NOT NULL
      )
    )
  );

CREATE POLICY "reward_requests_update_verified_parent_pending"
  ON public.reward_requests FOR UPDATE TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM public.user_relationships AS ur
      WHERE ur.parent_id = auth.uid()
        AND ur.child_id = reward_requests.student_id
        AND ur.relationship_type IN ('parent_child', 'guardian_student')
        AND ur.verified_at IS NOT NULL
    )
  )
  WITH CHECK (
    status IN ('approved', 'rejected')
    AND EXISTS (
      SELECT 1
      FROM public.user_relationships AS ur
      WHERE ur.parent_id = auth.uid()
        AND ur.child_id = reward_requests.student_id
        AND ur.relationship_type IN ('parent_child', 'guardian_student')
        AND ur.verified_at IS NOT NULL
    )
  );

REVOKE ALL PRIVILEGES ON TABLE public.reward_requests FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id, student_id, reward_id, reward_name_en, reward_name_ar, cost_points, status, parent_id, created_at, decided_at)
  ON TABLE public.reward_requests FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (id, student_id, reward_id, reward_name_en, reward_name_ar, cost_points, status, parent_id, created_at, decided_at)
  ON TABLE public.reward_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.reward_requests TO authenticated;
GRANT INSERT (student_id, reward_id, reward_name_en, reward_name_ar, cost_points, parent_id)
  ON TABLE public.reward_requests TO authenticated;
GRANT UPDATE (status) ON TABLE public.reward_requests TO authenticated;
GRANT ALL ON TABLE public.reward_requests TO service_role;

CREATE OR REPLACE FUNCTION public.stamp_reward_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.status <> 'pending' OR NEW.status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Only pending reward requests can be decided.'
      USING ERRCODE = '42501';
  END IF;
  NEW.decided_at := pg_catalog.now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reward_requests_stamp_decision ON public.reward_requests;
CREATE TRIGGER reward_requests_stamp_decision
  BEFORE UPDATE OF status ON public.reward_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_reward_decision();
REVOKE ALL ON FUNCTION public.stamp_reward_decision() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Users can view their own relationships" ON public.user_relationships;
DROP POLICY IF EXISTS "Parents can insert and manage child relationships" ON public.user_relationships;
DROP POLICY IF EXISTS "user_relationships_select_verified_related" ON public.user_relationships;
CREATE POLICY "user_relationships_select_verified_related"
  ON public.user_relationships FOR SELECT TO authenticated
  USING (
    verified_at IS NOT NULL
    AND (
      parent_id = auth.uid()
      OR child_id = auth.uid()
      OR public.is_church_admin()
    )
  );

REVOKE ALL PRIVILEGES ON TABLE public.user_relationships FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.user_relationships TO authenticated;
GRANT ALL ON TABLE public.user_relationships TO service_role;

DROP POLICY IF EXISTS "Teachers and admins can manage lessons" ON public.lessons;
CREATE POLICY "lessons_select_authenticated"
  ON public.lessons FOR SELECT TO authenticated
  USING (true);
DROP POLICY IF EXISTS "lessons_insert_teacher" ON public.lessons;
DROP POLICY IF EXISTS "lessons_update_owner_or_admin" ON public.lessons;
DROP POLICY IF EXISTS "lessons_delete_owner_or_admin" ON public.lessons;
CREATE POLICY "lessons_insert_teacher"
  ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (public.is_church_servant_or_admin() AND created_by = auth.uid());
CREATE POLICY "lessons_update_owner_or_admin"
  ON public.lessons FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_church_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_church_admin());
CREATE POLICY "lessons_delete_owner_or_admin"
  ON public.lessons FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_church_admin());

CREATE OR REPLACE FUNCTION public.set_lesson_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lessons_set_owner ON public.lessons;
CREATE TRIGGER lessons_set_owner
  BEFORE INSERT ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.set_lesson_owner();

REVOKE ALL PRIVILEGES ON TABLE public.lessons FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id, title_en, title_ar, category, grade_level, summary_en, summary_ar, scripture_verse_en, scripture_verse_ar, verse_reference, audio_url, pdf_worksheet_url, points_reward, quiz_questions, created_by, created_at)
  ON TABLE public.lessons FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (id, title_en, title_ar, category, grade_level, summary_en, summary_ar, scripture_verse_en, scripture_verse_ar, verse_reference, audio_url, pdf_worksheet_url, points_reward, quiz_questions, created_by, created_at)
  ON TABLE public.lessons FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.lessons TO authenticated;
GRANT INSERT (title_en, title_ar, category, grade_level, summary_en, summary_ar, scripture_verse_en, scripture_verse_ar, verse_reference, audio_url, pdf_worksheet_url, quiz_questions)
  ON TABLE public.lessons TO authenticated;
GRANT UPDATE (title_en, title_ar, category, grade_level, summary_en, summary_ar, scripture_verse_en, scripture_verse_ar, verse_reference, audio_url, pdf_worksheet_url, quiz_questions)
  ON TABLE public.lessons TO authenticated;
GRANT DELETE ON TABLE public.lessons TO authenticated;
GRANT ALL ON TABLE public.lessons TO service_role;

DROP POLICY IF EXISTS "Students can submit own hymns enrollment" ON public.hymns_memberships;
DROP POLICY IF EXISTS "Servants and Admins can update hymns enrollment status" ON public.hymns_memberships;
DROP POLICY IF EXISTS "hymns_memberships_insert_student_pending" ON public.hymns_memberships;
CREATE POLICY "hymns_memberships_select_student"
  ON public.hymns_memberships FOR SELECT TO authenticated
  USING (student_id = auth.uid()::TEXT);
CREATE POLICY "hymns_memberships_select_staff"
  ON public.hymns_memberships FOR SELECT TO authenticated
  USING (public.is_church_servant_or_admin());
CREATE POLICY "hymns_memberships_insert_student_pending"
  ON public.hymns_memberships FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()::TEXT
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'student'
    )
  );
REVOKE ALL PRIVILEGES ON TABLE public.hymns_memberships FROM PUBLIC, anon, authenticated;
REVOKE INSERT (id, student_id, student_name, level, roster_group, status, notes, reviewed_by, reviewed_at, created_at, updated_at)
  ON TABLE public.hymns_memberships FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.hymns_memberships TO authenticated;
GRANT INSERT (student_id, student_name, level, roster_group, notes)
  ON TABLE public.hymns_memberships TO authenticated;
GRANT ALL ON TABLE public.hymns_memberships TO service_role;

-- Clients may edit content drafts but cannot choose owner or change review/publish state.
CREATE OR REPLACE FUNCTION public.set_text_content_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid()::TEXT;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF pg_catalog.to_regclass('public.coptic_taxis') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.coptic_taxis ALTER COLUMN status SET DEFAULT ''draft''';
    EXECUTE 'DROP POLICY IF EXISTS "Servants insert taxis" ON public.coptic_taxis';
    EXECUTE 'DROP POLICY IF EXISTS "Servants update taxis" ON public.coptic_taxis';
    EXECUTE 'DROP POLICY IF EXISTS "Servants delete taxis" ON public.coptic_taxis';
    EXECUTE 'DROP POLICY IF EXISTS "taxis_insert_owned_draft" ON public.coptic_taxis';
    EXECUTE 'DROP POLICY IF EXISTS "taxis_update_owned_draft" ON public.coptic_taxis';
    EXECUTE 'DROP POLICY IF EXISTS "taxis_delete_owned_draft" ON public.coptic_taxis';
    EXECUTE $policy$
      CREATE POLICY "taxis_insert_owned_draft"
      ON public.coptic_taxis FOR INSERT TO authenticated
      WITH CHECK (public.is_church_servant_or_admin() AND status = 'draft' AND created_by = auth.uid()::TEXT)
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "taxis_update_owned_draft"
      ON public.coptic_taxis FOR UPDATE TO authenticated
      USING (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.is_church_admin()))
      WITH CHECK (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.is_church_admin()))
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "taxis_delete_owned_draft"
      ON public.coptic_taxis FOR DELETE TO authenticated
      USING (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.is_church_admin()))
    $policy$;
    EXECUTE 'DROP TRIGGER IF EXISTS coptic_taxis_set_owner ON public.coptic_taxis';
    EXECUTE 'CREATE TRIGGER coptic_taxis_set_owner BEFORE INSERT ON public.coptic_taxis FOR EACH ROW EXECUTE FUNCTION public.set_text_content_owner()';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.coptic_taxis FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT SELECT ON TABLE public.coptic_taxis TO anon, authenticated';
    EXECUTE 'GRANT INSERT (id, title_ar, title_en, title_copt, category, audience, summary_ar, summary_en, version, source_references, documents, sections) ON TABLE public.coptic_taxis TO authenticated';
    EXECUTE 'GRANT UPDATE (title_ar, title_en, title_copt, category, audience, summary_ar, summary_en, source_references, documents, sections) ON TABLE public.coptic_taxis TO authenticated';
    EXECUTE 'GRANT DELETE ON TABLE public.coptic_taxis TO authenticated';
    EXECUTE 'GRANT ALL ON TABLE public.coptic_taxis TO service_role';
  END IF;

  IF pg_catalog.to_regclass('public.hymns') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.hymns ALTER COLUMN status SET DEFAULT ''draft''';
    EXECUTE 'DROP POLICY IF EXISTS "Servants insert hymns" ON public.hymns';
    EXECUTE 'DROP POLICY IF EXISTS "Servants update hymns" ON public.hymns';
    EXECUTE 'DROP POLICY IF EXISTS "Servants delete hymns" ON public.hymns';
    EXECUTE 'DROP POLICY IF EXISTS "hymns_insert_owned_draft" ON public.hymns';
    EXECUTE 'DROP POLICY IF EXISTS "hymns_update_owned_draft" ON public.hymns';
    EXECUTE 'DROP POLICY IF EXISTS "hymns_delete_owned_draft" ON public.hymns';
    EXECUTE $policy$
      CREATE POLICY "hymns_insert_owned_draft"
      ON public.hymns FOR INSERT TO authenticated
      WITH CHECK (public.is_church_servant_or_admin() AND status = 'draft' AND created_by = auth.uid()::TEXT)
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "hymns_update_owned_draft"
      ON public.hymns FOR UPDATE TO authenticated
      USING (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.is_church_admin()))
      WITH CHECK (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.is_church_admin()))
    $policy$;
    EXECUTE $policy$
      CREATE POLICY "hymns_delete_owned_draft"
      ON public.hymns FOR DELETE TO authenticated
      USING (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.is_church_admin()))
    $policy$;
    EXECUTE 'DROP TRIGGER IF EXISTS hymns_set_owner ON public.hymns';
    EXECUTE 'CREATE TRIGGER hymns_set_owner BEFORE INSERT ON public.hymns FOR EACH ROW EXECUTE FUNCTION public.set_text_content_owner()';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.hymns FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT SELECT ON TABLE public.hymns TO anon, authenticated';
    EXECUTE 'GRANT INSERT (id, title_ar, title_en, title_coptic, season_ar, season_en, occasion_tag, difficulty, level, audio_url, duration_sec, hazat_explanation_ar, hazat_explanation_en, lines, version) ON TABLE public.hymns TO authenticated';
    EXECUTE 'GRANT UPDATE (title_ar, title_en, title_coptic, season_ar, season_en, occasion_tag, difficulty, level, audio_url, duration_sec, hazat_explanation_ar, hazat_explanation_en, lines) ON TABLE public.hymns TO authenticated';
    EXECUTE 'GRANT DELETE ON TABLE public.hymns TO authenticated';
    EXECUTE 'GRANT ALL ON TABLE public.hymns TO service_role';
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Servants and Admins can manage taxis items" ON public.coptic_taxis_items;
DROP POLICY IF EXISTS "taxis_items_insert_owned_draft" ON public.coptic_taxis_items;
DROP POLICY IF EXISTS "taxis_items_update_owned_draft" ON public.coptic_taxis_items;
DROP POLICY IF EXISTS "taxis_items_delete_owned_draft" ON public.coptic_taxis_items;
CREATE POLICY "taxis_items_insert_owned_draft"
  ON public.coptic_taxis_items FOR INSERT TO authenticated
  WITH CHECK (public.is_church_servant_or_admin() AND status = 'draft' AND created_by = auth.uid()::TEXT);
CREATE POLICY "taxis_items_update_owned_draft"
  ON public.coptic_taxis_items FOR UPDATE TO authenticated
  USING (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.is_church_admin()))
  WITH CHECK (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.is_church_admin()));
CREATE POLICY "taxis_items_delete_owned_draft"
  ON public.coptic_taxis_items FOR DELETE TO authenticated
  USING (status = 'draft' AND (created_by = auth.uid()::TEXT OR public.is_church_admin()));
DROP TRIGGER IF EXISTS coptic_taxis_items_set_owner ON public.coptic_taxis_items;
CREATE TRIGGER coptic_taxis_items_set_owner
  BEFORE INSERT ON public.coptic_taxis_items
  FOR EACH ROW EXECUTE FUNCTION public.set_text_content_owner();

REVOKE ALL PRIVILEGES ON TABLE public.coptic_taxis_items FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.coptic_taxis_items TO authenticated;
GRANT INSERT (id, title_ar, title_en, title_coptic, category, season, target_audience, sections, attachments, version)
  ON TABLE public.coptic_taxis_items TO authenticated;
GRANT UPDATE (title_ar, title_en, title_coptic, category, season, target_audience, sections, attachments)
  ON TABLE public.coptic_taxis_items TO authenticated;
GRANT DELETE ON TABLE public.coptic_taxis_items TO authenticated;
GRANT ALL ON TABLE public.coptic_taxis_items TO service_role;

-- These tables are introduced by later/optional migrations, so harden them when present.
DO $$
DECLARE
  v_function RECORD;
  v_policy RECORD;
BEGIN
  FOR v_policy IN
    SELECT schemaname, tablename, policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('quiz_attempts', 'lesson_versions')
  LOOP
    EXECUTE pg_catalog.format(
      'DROP POLICY %I ON %I.%I',
      v_policy.policyname,
      v_policy.schemaname,
      v_policy.tablename
    );
  END LOOP;

  IF pg_catalog.to_regclass('public.quiz_attempts') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.quiz_attempts FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT SELECT ON TABLE public.quiz_attempts TO authenticated';
    EXECUTE 'GRANT ALL ON TABLE public.quiz_attempts TO service_role';
    EXECUTE $policy$
      CREATE POLICY quiz_attempts_select_policy
      ON public.quiz_attempts
      FOR SELECT
      TO authenticated
      USING (
        student_id = auth.uid()::text
        OR EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
        OR EXISTS (
          SELECT 1
          FROM public.class_memberships AS cm
          JOIN public.servant_class_assignments AS sca
            ON sca.class_instance_id = cm.class_instance_id
           AND sca.church_year_id = cm.church_year_id
          JOIN public.church_years AS cy
            ON cy.id = sca.church_year_id
          WHERE cm.student_id::text = public.quiz_attempts.student_id
            AND sca.servant_id = auth.uid()
            AND sca.is_active = true
            AND cy.is_active = true
            AND cm.status = 'active'
        )
      )
    $policy$;
  END IF;

  IF pg_catalog.to_regclass('public.lesson_versions') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.lesson_versions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.lesson_versions FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT SELECT ON TABLE public.lesson_versions TO authenticated';
    EXECUTE 'GRANT ALL ON TABLE public.lesson_versions TO service_role';
  END IF;

  FOR v_function IN
    SELECT p.oid::pg_catalog.regprocedure AS signature
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname IN (
        'approve_lesson_version',
        'approve_version',
        'publish_lesson_version',
        'review_lesson_version',
        'set_lesson_version_status'
      )
  LOOP
    EXECUTE pg_catalog.format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      v_function.signature
    );
    EXECUTE pg_catalog.format(
      'GRANT EXECUTE ON FUNCTION %s TO service_role',
      v_function.signature
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.set_lesson_owner() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_text_content_owner() FROM PUBLIC, anon, authenticated;

COMMIT;
