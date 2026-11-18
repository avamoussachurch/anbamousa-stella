-- Remove the broad Supabase default grants from all existing public-schema objects.
-- The only anonymous table read intentionally retained is the opt-in global audio list.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON TABLE public.feed_post_attachments TO anon;

REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
