-- Feed post moderation: trusted reporting, staff-scoped review, and post hiding.
BEGIN;

ALTER TABLE public.feed_posts
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_feed_posts_visible_created
  ON public.feed_posts (is_hidden, created_at DESC);

CREATE TABLE IF NOT EXISTS public.feed_post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id text NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'privacy', 'other')),
  details text CHECK (details IS NULL OR char_length(details) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'actioned', 'dismissed')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  resolution_note text CHECK (resolution_note IS NULL OR char_length(resolution_note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feed_post_reports_not_self CHECK (reporter_id <> reported_user_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_post_reports_queue
  ON public.feed_post_reports (status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feed_post_reports_open_reporter_post
  ON public.feed_post_reports (reporter_id, post_id)
  WHERE status = 'open';

ALTER TABLE public.feed_post_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.feed_post_reports FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.feed_post_reports TO authenticated;

DROP POLICY IF EXISTS feed_post_reports_insert_own ON public.feed_post_reports;
CREATE POLICY feed_post_reports_insert_own
  ON public.feed_post_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = (SELECT auth.uid())
    AND reported_user_id <> (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.feed_posts p
      WHERE p.id = post_id
        AND p.author_id = reported_user_id
        AND p.author_id <> (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS feed_post_reports_select_assigned_staff ON public.feed_post_reports;
CREATE POLICY feed_post_reports_select_assigned_staff
  ON public.feed_post_reports
  FOR SELECT TO authenticated
  USING (
    public.is_church_servant_or_admin()
    AND public.can_access_student_data(reporter_id)
  );

DROP POLICY IF EXISTS feed_post_reports_update_assigned_staff ON public.feed_post_reports;
CREATE POLICY feed_post_reports_update_assigned_staff
  ON public.feed_post_reports
  FOR UPDATE TO authenticated
  USING (
    public.is_church_servant_or_admin()
    AND public.can_access_student_data(reporter_id)
  )
  WITH CHECK (
    public.is_church_servant_or_admin()
    AND public.can_access_student_data(reporter_id)
  );

CREATE OR REPLACE FUNCTION public.review_feed_post_report(
  p_report_id uuid,
  p_action text,
  p_resolution_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_report public.feed_post_reports%ROWTYPE;
  v_status text;
BEGIN
  IF NOT public.is_church_servant_or_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_report
    FROM public.feed_post_reports
   WHERE id = p_report_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REPORT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.can_access_student_data(v_report.reporter_id) THEN
    RAISE EXCEPTION 'REPORT_SCOPE_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF p_action NOT IN ('hide', 'dismiss') THEN
    RAISE EXCEPTION 'INVALID_ACTION' USING ERRCODE = '22023';
  END IF;

  IF p_action = 'hide' THEN
    UPDATE public.feed_posts
       SET is_hidden = true, updated_at = now()
     WHERE id = v_report.post_id;
    v_status := 'actioned';
  ELSE
    v_status := 'dismissed';
  END IF;

  UPDATE public.feed_post_reports
     SET status = v_status,
         reviewed_by = (SELECT auth.uid()),
         reviewed_at = now(),
         resolution_note = NULLIF(left(coalesce(p_resolution_note, ''), 1000), ''),
         updated_at = now()
   WHERE id = p_report_id;

  RETURN jsonb_build_object('success', true, 'status', v_status);
END;
$$;

REVOKE ALL ON FUNCTION public.review_feed_post_report(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_feed_post_report(uuid, text, text) TO authenticated;

COMMIT;
