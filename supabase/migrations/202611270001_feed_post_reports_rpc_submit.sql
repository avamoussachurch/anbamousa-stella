-- Keep report submission under invoker privileges and enforce reporter identity with RLS.
CREATE UNIQUE INDEX IF NOT EXISTS feed_post_reports_reporter_post_unique
  ON public.feed_post_reports (reporter_id, post_id);

GRANT INSERT ON public.feed_post_reports TO authenticated;
DROP POLICY IF EXISTS feed_post_reports_insert_student ON public.feed_post_reports;
CREATE POLICY feed_post_reports_insert_student
  ON public.feed_post_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = (SELECT auth.uid())
    AND public.has_role('student')
    AND EXISTS (
      SELECT 1
      FROM public.feed_posts AS p
      WHERE p.id = post_id
        AND p.author_id = reported_user_id
        AND p.is_hidden = false
    )
  );

CREATE OR REPLACE FUNCTION public.submit_feed_post_report(
  p_post_id text,
  p_reason text,
  p_details text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  v_reported_user_id uuid;
  v_report_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role('student') THEN
    RAISE EXCEPTION 'STUDENT_ROLE_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_reason NOT IN ('spam', 'harassment', 'inappropriate', 'privacy', 'other') THEN
    RAISE EXCEPTION 'INVALID_REPORT_REASON' USING ERRCODE = '22023';
  END IF;
  IF p_details IS NOT NULL AND char_length(p_details) > 1000 THEN
    RAISE EXCEPTION 'REPORT_DETAILS_TOO_LONG' USING ERRCODE = '22023';
  END IF;

  SELECT p.author_id INTO v_reported_user_id
    FROM public.feed_posts AS p
   WHERE p.id = p_post_id AND p.is_hidden = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POST_NOT_FOUND_OR_HIDDEN' USING ERRCODE = 'P0002';
  END IF;
  IF v_reported_user_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'CANNOT_REPORT_OWN_POST' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.feed_post_reports (post_id, reporter_id, reported_user_id, reason, details)
  VALUES (p_post_id, (SELECT auth.uid()), v_reported_user_id, p_reason, NULLIF(btrim(p_details), ''))
  ON CONFLICT (reporter_id, post_id) DO NOTHING
  RETURNING id INTO v_report_id;

  IF v_report_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'already_reported', true);
  END IF;
  RETURN jsonb_build_object('success', true, 'report_id', v_report_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_feed_post_report(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_feed_post_report(text, text, text) TO authenticated;
