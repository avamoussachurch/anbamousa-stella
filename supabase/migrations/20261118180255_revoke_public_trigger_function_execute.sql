-- Trigger functions must not be callable as PostgREST RPCs.
-- The trigger definitions remain intact; authenticated/service roles retain their explicit grants.
REVOKE EXECUTE ON FUNCTION public.enforce_feed_post_media_ownership() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.prevent_admin_action_audit_mutation() FROM PUBLIC, anon;
