-- Student reports are submitted through a SECURITY DEFINER RPC so reporter identity
-- and the reported post author are derived from the authenticated session/database.
REVOKE INSERT ON public.feed_post_reports FROM authenticated;
DROP POLICY IF EXISTS feed_post_reports_insert_own ON public.feed_post_reports;

CREATE OR REPLACE FUNCTION public.submit_feed_post_report(
  p_post_id text,
  p_reason text,
  p_details text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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

  SELECT author_id INTO v_reported_user_id
    FROM public.feed_posts
   WHERE id = p_post_id AND is_hidden = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'POST_NOT_FOUND_OR_HIDDEN' USING ERRCODE = 'P0002';
  END IF;
  IF v_reported_user_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'CANNOT_REPORT_OWN_POST' USING ERRCODE = '42501';
  END IF;

  BEGIN
    INSERT INTO public.feed_post_reports (post_id, reporter_id, reported_user_id, reason, details)
    VALUES (p_post_id, (SELECT auth.uid()), v_reported_user_id, p_reason, NULLIF(btrim(p_details), ''))
    RETURNING id INTO v_report_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'already_reported', true);
  END;

  RETURN jsonb_build_object('success', true, 'report_id', v_report_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_feed_post_report(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_feed_post_report(text, text, text) TO authenticated;
