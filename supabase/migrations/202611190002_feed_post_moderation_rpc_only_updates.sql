-- Moderation decisions must go through the SECURITY DEFINER review RPC.
REVOKE UPDATE ON public.feed_post_reports FROM authenticated;
DROP POLICY IF EXISTS feed_post_reports_update_assigned_staff ON public.feed_post_reports;
