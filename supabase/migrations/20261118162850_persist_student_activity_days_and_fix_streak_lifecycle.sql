-- Durable, cross-school student activity days for authoritative streaks.
CREATE TABLE IF NOT EXISTS public.student_activity_days (
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_activity_days_pkey PRIMARY KEY (student_id, activity_date)
);

CREATE INDEX IF NOT EXISTS student_activity_days_activity_date_idx
  ON public.student_activity_days (activity_date DESC);

ALTER TABLE public.student_activity_days ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.student_activity_days FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.student_activity_days TO service_role;

ALTER TABLE public.profiles
  ALTER COLUMN current_streak SET DEFAULT 0,
  ALTER COLUMN longest_streak SET DEFAULT 0;

CREATE OR REPLACE FUNCTION private.recalculate_student_streak(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
DECLARE
  v_today date := (now() AT TIME ZONE 'Africa/Cairo')::date;
  v_current integer := 0;
  v_longest integer := 0;
  v_latest_day date;
  v_latest_activity timestamptz;
BEGIN
  -- Serialize recalculations for a student so concurrent completions cannot
  -- overwrite a newer streak calculation with a stale snapshot.
  PERFORM 1 FROM public.profiles WHERE id = p_student_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  WITH ordered_days AS (
    SELECT
      activity_date,
      activity_date - ROW_NUMBER() OVER (ORDER BY activity_date)::integer AS island
    FROM public.student_activity_days
    WHERE student_id = p_student_id
  ),
  streak_groups AS (
    SELECT COUNT(*)::integer AS streak_length, MAX(activity_date) AS last_day
    FROM ordered_days
    GROUP BY island
  ),
  latest AS (
    SELECT MAX(activity_date) AS last_day
    FROM public.student_activity_days
    WHERE student_id = p_student_id
  )
  SELECT
    COALESCE((SELECT MAX(streak_length) FROM streak_groups), 0),
    CASE
      WHEN latest.last_day >= v_today - 1
        THEN COALESCE((SELECT streak_length FROM streak_groups WHERE last_day = latest.last_day), 0)
      ELSE 0
    END,
    latest.last_day,
    (SELECT MAX(last_activity_at) FROM public.student_activity_days WHERE student_id = p_student_id)
  INTO v_longest, v_current, v_latest_day, v_latest_activity
  FROM latest;

  UPDATE public.profiles
  SET
    current_streak = GREATEST(0, v_current),
    longest_streak = GREATEST(COALESCE(longest_streak, 0), v_longest, v_current, 0),
    last_active = CASE
      WHEN v_latest_activity IS NULL THEN last_active
      ELSE GREATEST(COALESCE(last_active, v_latest_activity), v_latest_activity)
    END
  WHERE id = p_student_id;
END;
$function$;

CREATE OR REPLACE FUNCTION private.on_student_activity_day_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
BEGIN
  PERFORM private.recalculate_student_streak(NEW.student_id);
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.recalculate_student_streak(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.on_student_activity_day_changed() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.recalculate_student_streak(uuid) TO service_role;

DROP TRIGGER IF EXISTS student_activity_days_recalculate_streak ON public.student_activity_days;
CREATE TRIGGER student_activity_days_recalculate_streak
AFTER INSERT OR UPDATE OF last_activity_at ON public.student_activity_days
FOR EACH ROW
EXECUTE FUNCTION private.on_student_activity_day_changed();

-- Preserve the last known active run where the existing profile has a dated,
-- server-recorded current streak. Lesson completion history is also imported.
INSERT INTO public.student_activity_days (student_id, activity_date, last_activity_at)
SELECT
  p.id,
  ((p.last_active AT TIME ZONE 'Africa/Cairo')::date - offsets.day_offset)::date,
  p.last_active
FROM public.profiles p
CROSS JOIN LATERAL generate_series(0, GREATEST(COALESCE(p.current_streak, 0), 1) - 1) AS offsets(day_offset)
WHERE p.current_streak > 0
  AND p.last_active IS NOT NULL
ON CONFLICT (student_id, activity_date) DO UPDATE
SET last_activity_at = GREATEST(public.student_activity_days.last_activity_at, EXCLUDED.last_activity_at);

INSERT INTO public.student_activity_days (student_id, activity_date, last_activity_at)
SELECT
  lp.student_id,
  (lp.completed_at AT TIME ZONE 'Africa/Cairo')::date,
  MAX(lp.completed_at)
FROM public.lesson_progress lp
WHERE lp.completed = true
  AND lp.completed_at IS NOT NULL
GROUP BY lp.student_id, (lp.completed_at AT TIME ZONE 'Africa/Cairo')::date
ON CONFLICT (student_id, activity_date) DO UPDATE
SET last_activity_at = GREATEST(public.student_activity_days.last_activity_at, EXCLUDED.last_activity_at);

-- Recalculate the profiles after the backfill. Longest streak is never reduced.
DO $block$
DECLARE
  v_student_id uuid;
BEGIN
  FOR v_student_id IN
    SELECT DISTINCT student_id FROM public.student_activity_days
  LOOP
    PERFORM private.recalculate_student_streak(v_student_id);
  END LOOP;
END;
$block$;

-- Re-evaluate current streaks hourly so a missed Cairo-local day lapses even
-- when a student does not sign in again. Historical longest streak is retained.
CREATE OR REPLACE FUNCTION private.recalculate_all_student_streaks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
DECLARE
  v_student_id uuid;
  v_count integer := 0;
BEGIN
  FOR v_student_id IN
    SELECT id
    FROM public.profiles
    WHERE COALESCE(current_streak, 0) > 0
       OR COALESCE(longest_streak, 0) > 0
       OR EXISTS (
         SELECT 1 FROM public.student_activity_days d WHERE d.student_id = profiles.id
       )
  LOOP
    PERFORM private.recalculate_student_streak(v_student_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION private.recalculate_all_student_streaks() FROM PUBLIC, anon, authenticated;
DO $block$
DECLARE
  v_job record;
BEGIN
  FOR v_job IN SELECT jobid FROM cron.job WHERE jobname = 'anba-mousa-streak-recalculation'
  LOOP
    PERFORM cron.unschedule(v_job.jobid);
  END LOOP;
  PERFORM cron.schedule(
    'anba-mousa-streak-recalculation',
    '5 * * * *',
    'SELECT private.recalculate_all_student_streaks();'
  );
END;
$block$;

COMMENT ON TABLE public.student_activity_days IS
  'Server-only, deduplicated Cairo-local activity dates used to calculate current and longest student learning streaks across all learning areas.';
