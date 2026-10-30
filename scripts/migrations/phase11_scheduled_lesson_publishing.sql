-- Scheduled lesson publishing.
-- Requires Supabase's managed pg_cron extension. This migration is not applied automatically.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE IF NOT EXISTS public.lesson_publication_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES public.lesson_versions(id) ON DELETE CASCADE,
  scheduled_by UUID NOT NULL REFERENCES public.profiles(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'processing', 'published', 'failed', 'cancelled')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS lesson_publication_jobs_one_active_per_lesson
  ON public.lesson_publication_jobs(lesson_id)
  WHERE status IN ('scheduled', 'processing');
CREATE INDEX IF NOT EXISTS lesson_publication_jobs_due_idx
  ON public.lesson_publication_jobs(scheduled_at, created_at)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS lesson_publication_jobs_version_idx
  ON public.lesson_publication_jobs(version_id, created_at DESC);

ALTER TABLE public.lesson_publication_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lesson_publication_jobs FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.publish_lesson_version_immediately(
  p_lesson_id UUID,
  p_version_id UUID,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role TEXT;
  v_grade_level TEXT;
  v_class_group TEXT;
  v_version RECORD;
  v_publication_result JSONB;
BEGIN
  SELECT p.role INTO v_role
  FROM public.profiles AS p
  WHERE p.id = p_actor_id;
  IF v_role IS NULL OR v_role NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'Only teachers and administrators may publish lessons';
  END IF;

  PERFORM 1
  FROM public.lessons AS l
  WHERE l.id = p_lesson_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lesson not found';
  END IF;

  SELECT v.id, v.lesson_id, v.created_by, v.status, v.approved_by, v.approved_at
  INTO v_version
  FROM public.lesson_versions AS v
  WHERE v.id = p_version_id AND v.lesson_id = p_lesson_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lesson version not found';
  END IF;
  IF v_role = 'teacher' AND v_version.created_by IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION 'Teachers may publish only their own lesson versions';
  END IF;
  IF v_version.status <> 'APPROVED' OR v_version.approved_by IS NULL OR v_version.approved_at IS NULL THEN
    RAISE EXCEPTION 'Only approved versions with approval metadata may be published';
  END IF;
  IF v_role = 'teacher' THEN
    SELECT l.grade_level INTO v_grade_level
    FROM public.lessons AS l
    WHERE l.id = p_lesson_id;

    v_class_group := CASE
      WHEN v_grade_level IN ('KG1', 'KG2') THEN 'angels'
      WHEN v_grade_level IN ('Grade 1', 'Grade 2', 'Grade 3') THEN 'primary_1'
      WHEN v_grade_level IN ('Grade 4', 'Grade 5', 'Grade 6') THEN 'primary_2'
      WHEN v_grade_level IN ('Prep 1', 'Prep 2', 'Prep 3') THEN 'preparatory'
      WHEN v_grade_level IN ('Secondary 1', 'Secondary 2', 'Secondary 3') THEN 'secondary'
      WHEN v_grade_level IN ('University', 'Youth') THEN 'university'
      ELSE NULL
    END;
    IF v_class_group IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.servant_class_assignments AS a
      JOIN public.church_years AS y ON y.id = a.church_year_id AND y.is_active = true
      JOIN public.class_instances AS c
        ON c.id = a.class_instance_id
        AND c.church_year_id = a.church_year_id
        AND c.class_group_id = v_class_group
      WHERE a.servant_id = p_actor_id AND a.is_active = true
    ) THEN
      RAISE EXCEPTION 'Teacher is not assigned to a class for this lesson grade';
    END IF;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.lesson_publication_jobs AS j
    WHERE j.lesson_id = p_lesson_id
      AND j.status IN ('scheduled', 'processing')
  ) THEN
    RAISE EXCEPTION 'Cancel the scheduled publication before publishing this lesson immediately';
  END IF;

  SELECT public.publish_lesson_version(p_lesson_id, p_version_id)
  INTO v_publication_result;
  RETURN v_publication_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.schedule_lesson_publication(
  p_lesson_id UUID,
  p_version_id UUID,
  p_scheduled_at TIMESTAMPTZ
)
RETURNS public.lesson_publication_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_role TEXT;
  v_grade_level TEXT;
  v_class_group TEXT;
  v_version RECORD;
  v_job public.lesson_publication_jobs;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF p_scheduled_at IS NULL OR p_scheduled_at <= pg_catalog.clock_timestamp() THEN
    RAISE EXCEPTION 'Publication time must be in the future';
  END IF;

  PERFORM 1
  FROM public.lessons AS l
  WHERE l.id = p_lesson_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lesson not found';
  END IF;

  SELECT p.role INTO v_role
  FROM public.profiles AS p
  WHERE p.id = v_actor;
  IF v_role IS NULL OR v_role NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'Only teachers and administrators may schedule lessons';
  END IF;

  SELECT v.id, v.lesson_id, v.created_by, v.status, v.approved_by, v.approved_at
  INTO v_version
  FROM public.lesson_versions AS v
  WHERE v.id = p_version_id AND v.lesson_id = p_lesson_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lesson version not found';
  END IF;
  IF v_role = 'teacher' AND v_version.created_by IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION 'Teachers may schedule only their own lesson versions';
  END IF;
  IF v_version.status <> 'APPROVED' OR v_version.approved_by IS NULL OR v_version.approved_at IS NULL THEN
    RAISE EXCEPTION 'Only approved versions with approval metadata may be scheduled';
  END IF;
  IF v_role = 'teacher' THEN
    SELECT l.grade_level INTO v_grade_level
    FROM public.lessons AS l
    WHERE l.id = p_lesson_id;

    v_class_group := CASE
      WHEN v_grade_level IN ('KG1', 'KG2') THEN 'angels'
      WHEN v_grade_level IN ('Grade 1', 'Grade 2', 'Grade 3') THEN 'primary_1'
      WHEN v_grade_level IN ('Grade 4', 'Grade 5', 'Grade 6') THEN 'primary_2'
      WHEN v_grade_level IN ('Prep 1', 'Prep 2', 'Prep 3') THEN 'preparatory'
      WHEN v_grade_level IN ('Secondary 1', 'Secondary 2', 'Secondary 3') THEN 'secondary'
      WHEN v_grade_level IN ('University', 'Youth') THEN 'university'
      ELSE NULL
    END;

    IF v_class_group IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.servant_class_assignments AS a
      JOIN public.church_years AS y ON y.id = a.church_year_id AND y.is_active = true
      JOIN public.class_instances AS c
        ON c.id = a.class_instance_id
        AND c.church_year_id = a.church_year_id
        AND c.class_group_id = v_class_group
      WHERE a.servant_id = v_actor AND a.is_active = true
    ) THEN
      RAISE EXCEPTION 'Teacher is not assigned to a class for this lesson grade';
    END IF;
  END IF;

  INSERT INTO public.lesson_publication_jobs (
    lesson_id, version_id, scheduled_by, scheduled_at
  ) VALUES (
    p_lesson_id, p_version_id, v_actor, p_scheduled_at
  )
  RETURNING * INTO v_job;
  RETURN v_job;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'This lesson already has a scheduled publication';
END;
$$;

CREATE OR REPLACE FUNCTION public.reschedule_lesson_publication(
  p_publication_id UUID,
  p_scheduled_at TIMESTAMPTZ
)
RETURNS public.lesson_publication_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_role TEXT;
  v_job public.lesson_publication_jobs;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  IF p_scheduled_at IS NULL OR p_scheduled_at <= pg_catalog.clock_timestamp() THEN
    RAISE EXCEPTION 'Publication time must be in the future';
  END IF;

  SELECT p.role INTO v_role FROM public.profiles AS p WHERE p.id = v_actor;
  IF v_role IS NULL OR v_role NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'Only teachers and administrators may reschedule lessons';
  END IF;

  SELECT j.* INTO v_job
  FROM public.lesson_publication_jobs AS j
  WHERE j.id = p_publication_id
  FOR UPDATE;
  IF NOT FOUND OR v_job.status <> 'scheduled' THEN
    RAISE EXCEPTION 'Only scheduled publications can be rescheduled';
  END IF;
  IF v_role <> 'admin' AND v_job.scheduled_by IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION 'Only the scheduler or an administrator may reschedule this publication';
  END IF;

  UPDATE public.lesson_publication_jobs AS j
  SET scheduled_at = p_scheduled_at, updated_at = pg_catalog.now(), error_message = NULL
  WHERE j.id = p_publication_id
  RETURNING * INTO v_job;
  RETURN v_job;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_lesson_publication(p_publication_id UUID)
RETURNS public.lesson_publication_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_role TEXT;
  v_job public.lesson_publication_jobs;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  SELECT p.role INTO v_role FROM public.profiles AS p WHERE p.id = v_actor;
  IF v_role IS NULL OR v_role NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'Only teachers and administrators may cancel scheduled lessons';
  END IF;

  SELECT j.* INTO v_job
  FROM public.lesson_publication_jobs AS j
  WHERE j.id = p_publication_id
  FOR UPDATE;
  IF NOT FOUND OR v_job.status <> 'scheduled' THEN
    RAISE EXCEPTION 'Only scheduled publications can be cancelled';
  END IF;
  IF v_role <> 'admin' AND v_job.scheduled_by IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION 'Only the scheduler or an administrator may cancel this publication';
  END IF;

  UPDATE public.lesson_publication_jobs AS j
  SET status = 'cancelled', updated_at = pg_catalog.now(), completed_at = pg_catalog.now()
  WHERE j.id = p_publication_id
  RETURNING * INTO v_job;
  RETURN v_job;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_lesson_publications()
RETURNS SETOF public.lesson_publication_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_role TEXT;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required';
  END IF;
  SELECT p.role INTO v_role FROM public.profiles AS p WHERE p.id = v_actor;
  IF v_role IS NULL OR v_role NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'Only teachers and administrators may view publication jobs';
  END IF;

  RETURN QUERY
  SELECT j.*
  FROM public.lesson_publication_jobs AS j
  WHERE v_role = 'admin' OR j.scheduled_by = v_actor
  ORDER BY j.scheduled_at, j.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_due_lesson_publications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_job public.lesson_publication_jobs;
  v_version RECORD;
  v_publication_result JSONB;
  v_scheduler_role TEXT;
  v_grade_level TEXT;
  v_class_group TEXT;
  v_published_count INTEGER := 0;
  v_now TIMESTAMPTZ;
BEGIN
  FOR v_job IN
    SELECT j.*
    FROM public.lesson_publication_jobs AS j
    WHERE j.status = 'scheduled'
      AND j.scheduled_at <= pg_catalog.clock_timestamp()
    ORDER BY j.scheduled_at, j.created_at
    LIMIT 100
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.lesson_publication_jobs AS j
    SET status = 'processing', updated_at = pg_catalog.now(), error_message = NULL
    WHERE j.id = v_job.id;

    BEGIN
      SELECT v.id, v.lesson_id, v.status, v.approved_by, v.approved_at, v.created_by
      INTO v_version
      FROM public.lesson_versions AS v
      WHERE v.id = v_job.version_id AND v.lesson_id = v_job.lesson_id
      FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Scheduled lesson version no longer exists';
      END IF;
      SELECT p.role INTO v_scheduler_role
      FROM public.profiles AS p
      WHERE p.id = v_job.scheduled_by;
      IF v_scheduler_role IS NULL OR v_scheduler_role NOT IN ('teacher', 'admin') THEN
        RAISE EXCEPTION 'Scheduler is no longer authorized to publish lessons';
      END IF;
      IF v_scheduler_role = 'teacher' THEN
        IF v_version.created_by IS DISTINCT FROM v_job.scheduled_by THEN
          RAISE EXCEPTION 'Scheduled version is no longer owned by its teacher';
        END IF;

        SELECT l.grade_level INTO v_grade_level
        FROM public.lessons AS l
        WHERE l.id = v_job.lesson_id;
        v_class_group := CASE
          WHEN v_grade_level IN ('KG1', 'KG2') THEN 'angels'
          WHEN v_grade_level IN ('Grade 1', 'Grade 2', 'Grade 3') THEN 'primary_1'
          WHEN v_grade_level IN ('Grade 4', 'Grade 5', 'Grade 6') THEN 'primary_2'
          WHEN v_grade_level IN ('Prep 1', 'Prep 2', 'Prep 3') THEN 'preparatory'
          WHEN v_grade_level IN ('Secondary 1', 'Secondary 2', 'Secondary 3') THEN 'secondary'
          WHEN v_grade_level IN ('University', 'Youth') THEN 'university'
          ELSE NULL
        END;
        IF v_class_group IS NULL OR NOT EXISTS (
          SELECT 1
          FROM public.servant_class_assignments AS a
          JOIN public.church_years AS y ON y.id = a.church_year_id AND y.is_active = true
          JOIN public.class_instances AS c
            ON c.id = a.class_instance_id
            AND c.church_year_id = a.church_year_id
            AND c.class_group_id = v_class_group
          WHERE a.servant_id = v_job.scheduled_by AND a.is_active = true
        ) THEN
          RAISE EXCEPTION 'Scheduler is no longer assigned to a class for this lesson grade';
        END IF;
      END IF;
      IF v_version.status <> 'APPROVED' OR v_version.approved_by IS NULL OR v_version.approved_at IS NULL THEN
        RAISE EXCEPTION 'Scheduled version is no longer eligible for publication';
      END IF;

      SELECT public.publish_lesson_version(v_job.lesson_id, v_job.version_id)
      INTO v_publication_result;
      IF COALESCE((v_publication_result ->> 'success')::BOOLEAN, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'Authoritative publication RPC did not confirm success';
      END IF;

      v_now := pg_catalog.now();

      UPDATE public.lesson_publication_jobs AS j
      SET status = 'published', updated_at = v_now, completed_at = v_now
      WHERE j.id = v_job.id;
      v_published_count := v_published_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        UPDATE public.lesson_publication_jobs AS j
        SET status = 'failed',
            error_message = pg_catalog.left(SQLERRM, 1000),
            updated_at = pg_catalog.now(),
            completed_at = pg_catalog.now()
        WHERE j.id = v_job.id;
    END;
  END LOOP;

  RETURN v_published_count;
END;
$$;

REVOKE ALL ON FUNCTION public.schedule_lesson_publication(UUID, UUID, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.publish_lesson_version_immediately(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reschedule_lesson_publication(UUID, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_lesson_publication(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_lesson_publications() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_due_lesson_publications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_lesson_publication(UUID, UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_lesson_version_immediately(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.reschedule_lesson_publication(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_lesson_publication(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_lesson_publications() TO authenticated;

DO $$
DECLARE
  v_existing_job_id BIGINT;
BEGIN
  SELECT j.jobid INTO v_existing_job_id
  FROM cron.job AS j
  WHERE j.jobname = 'stella-due-lesson-publishing';
  IF v_existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'stella-due-lesson-publishing',
    '* * * * *',
    'SELECT public.process_due_lesson_publications();'
  );
END;
$$;
