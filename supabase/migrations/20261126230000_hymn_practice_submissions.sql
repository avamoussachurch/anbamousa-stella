-- Private, class-scoped student hymn practice recordings for teacher review.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('hymn-practice-recordings','hymn-practice-recordings',false,26214400,NULL)
ON CONFLICT (id) DO UPDATE SET public=false, file_size_limit=26214400, allowed_mime_types=NULL;

CREATE TABLE IF NOT EXISTS public.hymn_practice_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  hymn_id text NOT NULL,
  hymn_title text NOT NULL,
  recording_path text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds BETWEEN 0 AND 1800),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','reviewed')),
  teacher_feedback text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hymn_practice_submissions_student_idx
  ON public.hymn_practice_submissions(student_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS hymn_practice_submissions_submitted_idx
  ON public.hymn_practice_submissions(submitted_at DESC);

ALTER TABLE public.hymn_practice_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students and assigned servants read hymn practice" ON public.hymn_practice_submissions;
CREATE POLICY "Students and assigned servants read hymn practice"
ON public.hymn_practice_submissions FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.profile_role_assignments pra
    WHERE pra.user_id = auth.uid() AND pra.role = 'admin' AND pra.revoked_at IS NULL
  )
  OR EXISTS (
    SELECT 1
    FROM public.class_memberships cm
    JOIN public.servant_class_assignments sca
      ON sca.class_instance_id = cm.class_instance_id
     AND sca.church_year_id = cm.church_year_id
    WHERE cm.student_id = hymn_practice_submissions.student_id
      AND cm.status = 'active' AND cm.left_at IS NULL
      AND sca.servant_id = auth.uid() AND sca.is_active = true
  )
);

DROP POLICY IF EXISTS "Students submit their own hymn practice" ON public.hymn_practice_submissions;
CREATE POLICY "Students submit their own hymn practice"
ON public.hymn_practice_submissions FOR INSERT TO authenticated
WITH CHECK (
  student_id = auth.uid()
  AND (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'student')
    OR EXISTS (SELECT 1 FROM public.profile_role_assignments pra WHERE pra.user_id = auth.uid() AND pra.role = 'student' AND pra.revoked_at IS NULL)
  )
);

DROP POLICY IF EXISTS "Assigned servants review hymn practice" ON public.hymn_practice_submissions;
CREATE POLICY "Assigned servants review hymn practice"
ON public.hymn_practice_submissions FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (SELECT 1 FROM public.profile_role_assignments pra WHERE pra.user_id = auth.uid() AND pra.role = 'admin' AND pra.revoked_at IS NULL)
  OR EXISTS (
    SELECT 1 FROM public.class_memberships cm
    JOIN public.servant_class_assignments sca
      ON sca.class_instance_id = cm.class_instance_id
     AND sca.church_year_id = cm.church_year_id
    WHERE cm.student_id = hymn_practice_submissions.student_id
      AND cm.status = 'active' AND cm.left_at IS NULL
      AND sca.servant_id = auth.uid() AND sca.is_active = true
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (SELECT 1 FROM public.profile_role_assignments pra WHERE pra.user_id = auth.uid() AND pra.role = 'admin' AND pra.revoked_at IS NULL)
  OR EXISTS (
    SELECT 1 FROM public.class_memberships cm
    JOIN public.servant_class_assignments sca
      ON sca.class_instance_id = cm.class_instance_id
     AND sca.church_year_id = cm.church_year_id
    WHERE cm.student_id = hymn_practice_submissions.student_id
      AND cm.status = 'active' AND cm.left_at IS NULL
      AND sca.servant_id = auth.uid() AND sca.is_active = true
  )
);

GRANT SELECT, INSERT, UPDATE ON public.hymn_practice_submissions TO authenticated;

DROP POLICY IF EXISTS "Students upload own hymn practice audio" ON storage.objects;
CREATE POLICY "Students upload own hymn practice audio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'hymn-practice-recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'student')
    OR EXISTS (SELECT 1 FROM public.profile_role_assignments pra WHERE pra.user_id = auth.uid() AND pra.role = 'student' AND pra.revoked_at IS NULL)
  )
);

DROP POLICY IF EXISTS "Students and assigned servants read hymn practice audio" ON storage.objects;
CREATE POLICY "Students and assigned servants read hymn practice audio"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'hymn-practice-recordings'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.profile_role_assignments pra WHERE pra.user_id = auth.uid() AND pra.role = 'admin' AND pra.revoked_at IS NULL)
    OR EXISTS (
      SELECT 1
      FROM public.class_memberships cm
      JOIN public.servant_class_assignments sca
        ON sca.class_instance_id = cm.class_instance_id
       AND sca.church_year_id = cm.church_year_id
      WHERE cm.student_id = (storage.foldername(name))[1]::uuid
        AND cm.status = 'active' AND cm.left_at IS NULL
        AND sca.servant_id = auth.uid() AND sca.is_active = true
    )
  )
);
