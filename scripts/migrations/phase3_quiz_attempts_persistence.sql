-- ==============================================================================
-- PHASE 3: DURABLE SECURE QUIZ ATTEMPTS PERSISTENCE MIGRATION (FINAL REVISION)
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

BEGIN;

-- 1. Create normalized, durable quiz_attempts table
-- Compatible with canonical string lesson IDs (e.g. 'l-cross-01')
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  quiz_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  total_score NUMERIC NOT NULL DEFAULT 0,
  percentage INT NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  answer_fingerprint TEXT NOT NULL,
  idempotency_key TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Query Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_lesson 
  ON public.quiz_attempts (student_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_lesson 
  ON public.quiz_attempts (lesson_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_submitted_at 
  ON public.quiz_attempts (submitted_at DESC);

-- 3. Database-Enforced Permanent Deduplication & Idempotency Constraints
-- Constraint A: Unique answer fingerprint per student, lesson, and quiz
CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_attempts_fingerprint 
  ON public.quiz_attempts (student_id, lesson_id, quiz_id, answer_fingerprint);

-- Constraint B: Unique idempotency key per submission
CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_attempts_idempotency_key 
  ON public.quiz_attempts (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 4. Enable Row Level Security (Default Deny All)
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security Policies
-- SELECT Policy:
-- - Students can view ONLY their own attempts.
-- - Teachers/Servants can view attempts ONLY for students actively enrolled in their assigned classes.
-- - Admins have system auditing access.
DROP POLICY IF EXISTS "quiz_attempts_select_policy" ON public.quiz_attempts;
CREATE POLICY "quiz_attempts_select_policy"
  ON public.quiz_attempts
  FOR SELECT
  TO authenticated
  USING (
    -- 1. Student viewing own attempts
    student_id = auth.uid()::text

    -- 2. Administrator system audit
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )

    -- 3. Teacher/Servant assigned to student's active class instance
    OR EXISTS (
      SELECT 1 
      FROM public.class_memberships cm
      JOIN public.servant_class_assignments sca 
        ON sca.class_instance_id = cm.class_instance_id
       AND sca.church_year_id = cm.church_year_id
      JOIN public.church_years cy 
        ON cy.id = sca.church_year_id
      WHERE cm.student_id::text = public.quiz_attempts.student_id
        AND sca.servant_id = auth.uid()
        AND sca.is_active = true
        AND cy.is_active = true
        AND cm.status = 'active'
    )
  );

-- NO INSERT, UPDATE, or DELETE policies for authenticated or anon users!
-- Students and public clients CANNOT write directly to quiz_attempts.
-- All grading, score computation, and attempt creation are strictly server-authoritative.

-- 6. Grants & Access Privileges
REVOKE ALL ON TABLE public.quiz_attempts FROM anon;
REVOKE ALL ON TABLE public.quiz_attempts FROM public;

-- Authenticated users (students & teachers) may only READ records permitted by RLS
GRANT SELECT ON TABLE public.quiz_attempts TO authenticated;

-- Only trusted backend server using service_role has write privileges
GRANT ALL ON TABLE public.quiz_attempts TO service_role;

COMMIT;
