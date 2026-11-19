-- Only student accounts can submit community post reports.
DROP POLICY IF EXISTS feed_post_reports_insert_own ON public.feed_post_reports;
CREATE POLICY feed_post_reports_insert_own
  ON public.feed_post_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = (SELECT auth.uid())
    AND public.has_role('student')
    AND reported_user_id <> (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.feed_posts p
      WHERE p.id = post_id
        AND p.author_id = reported_user_id
        AND p.author_id <> (SELECT auth.uid())
    )
  );
