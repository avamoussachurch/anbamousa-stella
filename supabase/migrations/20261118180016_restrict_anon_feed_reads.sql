-- Feed posts, comments, and reactions are for authenticated community members.
-- The global audio player remains public only through the opted-in attachment policy.

DROP POLICY IF EXISTS "Allow public read feed posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Allow public read feed comments" ON public.feed_comments;
DROP POLICY IF EXISTS "Allow public read feed reactions" ON public.feed_reactions;

REVOKE SELECT ON TABLE public.feed_posts FROM PUBLIC, anon;
REVOKE SELECT ON TABLE public.feed_comments FROM PUBLIC, anon;
REVOKE SELECT ON TABLE public.feed_reactions FROM PUBLIC, anon;
