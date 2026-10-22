-- ==============================================================================
-- Coptic Sunday School Platform — Feed Migration v2
-- File: supabase_migration_feed_posts_v2.sql
-- ==============================================================================

-- 1. Helper Function: authoritatively check servant/admin role from public.profiles
-- Secure search_path set to public, pg_temp to prevent path injection
CREATE OR REPLACE FUNCTION public.is_church_servant_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('teacher', 'admin')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_church_servant_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_church_servant_or_admin() TO authenticated;

-- 2. Feed Posts Table (Core post entity)
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id TEXT PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  content TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'youtube', 'audio', 'embed')),
  media_url TEXT,
  media_thumbnail TEXT,
  media_provider TEXT,
  is_pinned BOOLEAN DEFAULT false NOT NULL,
  is_announcement BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Feed Comments Table (Supports hierarchical replies via parent_id)
CREATE TABLE IF NOT EXISTS public.feed_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES public.feed_comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Feed Reactions Table (Dedicated table preventing post-row tampering)
CREATE TABLE IF NOT EXISTS public.feed_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  comment_id TEXT REFERENCES public.feed_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('heart', 'candle', 'cross')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT uq_feed_post_reaction UNIQUE (post_id, user_id, reaction_type),
  CONSTRAINT uq_feed_comment_reaction UNIQUE (comment_id, user_id, reaction_type),
  CONSTRAINT chk_feed_reaction_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Indexes for performance and sorting
CREATE INDEX IF NOT EXISTS idx_feed_posts_timeline ON public.feed_posts (is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_comments_post_thread ON public.feed_comments (post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_feed_reactions_post ON public.feed_reactions (post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feed_reactions_comment ON public.feed_reactions (comment_id) WHERE comment_id IS NOT NULL;

-- ==============================================================================
-- Row Level Security (RLS) Configuration
-- ==============================================================================

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policies: authenticated users only (no anonymous viewing)
DROP POLICY IF EXISTS "Authenticated users view feed posts" ON public.feed_posts;
CREATE POLICY "Authenticated users view feed posts"
  ON public.feed_posts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users view feed comments" ON public.feed_comments;
CREATE POLICY "Authenticated users view feed comments"
  ON public.feed_comments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users view feed reactions" ON public.feed_reactions;
CREATE POLICY "Authenticated users view feed reactions"
  ON public.feed_reactions FOR SELECT
  TO authenticated
  USING (true);

-- 2. INSERT Policies
DROP POLICY IF EXISTS "Users can insert own feed posts" ON public.feed_posts;
CREATE POLICY "Users can insert own feed posts"
  ON public.feed_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND (
      (is_pinned = false AND is_announcement = false)
      OR public.is_church_servant_or_admin()
    )
  );

DROP POLICY IF EXISTS "Users can insert own feed comments" ON public.feed_comments;
CREATE POLICY "Users can insert own feed comments"
  ON public.feed_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (SELECT 1 FROM public.feed_posts WHERE id = post_id)
    AND (parent_id IS NULL OR EXISTS (SELECT 1 FROM public.feed_comments WHERE id = parent_id AND post_id = feed_comments.post_id))
  );

DROP POLICY IF EXISTS "Users can insert own reactions" ON public.feed_reactions;
CREATE POLICY "Users can insert own reactions"
  ON public.feed_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      (post_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.feed_posts WHERE id = post_id))
      OR
      (comment_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.feed_comments WHERE id = comment_id))
    )
  );

-- 3. DELETE Policies
DROP POLICY IF EXISTS "Authors or servants can delete feed posts" ON public.feed_posts;
CREATE POLICY "Authors or servants can delete feed posts"
  ON public.feed_posts FOR DELETE
  TO authenticated
  USING (
    auth.uid() = author_id
    OR public.is_church_servant_or_admin()
  );

DROP POLICY IF EXISTS "Authors or servants can delete feed comments" ON public.feed_comments;
CREATE POLICY "Authors or servants can delete feed comments"
  ON public.feed_comments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = author_id
    OR public.is_church_servant_or_admin()
  );

DROP POLICY IF EXISTS "Users can delete own reactions" ON public.feed_reactions;
CREATE POLICY "Users can delete own reactions"
  ON public.feed_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. UPDATE Policies on comments
DROP POLICY IF EXISTS "Authors can update own comments" ON public.feed_comments;
CREATE POLICY "Authors can update own comments"
  ON public.feed_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- ==============================================================================
-- Column Protection on feed_posts via Secure Scoped Functions
-- Direct UPDATE on public.feed_posts is REVOKED from authenticated to prevent column tampering
-- ==============================================================================

REVOKE UPDATE ON public.feed_posts FROM authenticated;

-- Function A: Author edits their own post content and media
CREATE OR REPLACE FUNCTION public.edit_feed_post(
  p_post_id TEXT,
  p_content TEXT,
  p_media_type TEXT DEFAULT NULL,
  p_media_url TEXT DEFAULT NULL,
  p_media_thumbnail TEXT DEFAULT NULL,
  p_media_provider TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_post RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_post FROM public.feed_posts WHERE id = p_post_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found' USING ERRCODE = 'P0002';
  END IF;

  -- Only post author or authorized servants can edit content
  IF v_post.author_id <> v_user_id AND NOT public.is_church_servant_or_admin() THEN
    RAISE EXCEPTION 'Permission denied to edit this post' USING ERRCODE = '42501';
  END IF;

  -- Validate media_type if provided
  IF p_media_type IS NOT NULL AND p_media_type NOT IN ('image', 'video', 'youtube', 'audio', 'embed') THEN
    RAISE EXCEPTION 'Invalid media type' USING ERRCODE = '22023';
  END IF;

  UPDATE public.feed_posts
  SET 
    content = TRIM(p_content),
    media_type = p_media_type,
    media_url = p_media_url,
    media_thumbnail = p_media_thumbnail,
    media_provider = p_media_provider,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_post_id;

  RETURN jsonb_build_object('success', true, 'id', p_post_id);
END;
$$;

-- Function B: Servant/Admin pins or unpins a post
CREATE OR REPLACE FUNCTION public.moderate_feed_post_pin(
  p_post_id TEXT,
  p_is_pinned BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL OR NOT public.is_church_servant_or_admin() THEN
    RAISE EXCEPTION 'Only verified church servants or administrators can pin posts' USING ERRCODE = '42501';
  END IF;

  UPDATE public.feed_posts
  SET 
    is_pinned = p_is_pinned,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_post_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('success', true, 'id', p_post_id, 'is_pinned', p_is_pinned);
END;
$$;

-- Function C: Servant/Admin sets announcement status
CREATE OR REPLACE FUNCTION public.moderate_feed_post_announcement(
  p_post_id TEXT,
  p_is_announcement BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL OR NOT public.is_church_servant_or_admin() THEN
    RAISE EXCEPTION 'Only verified church servants or administrators can set announcement status' USING ERRCODE = '42501';
  END IF;

  UPDATE public.feed_posts
  SET 
    is_announcement = p_is_announcement,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_post_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object('success', true, 'id', p_post_id, 'is_announcement', p_is_announcement);
END;
$$;

-- Function D: Atomic Reaction Toggle
CREATE OR REPLACE FUNCTION public.toggle_feed_reaction(
  p_post_id TEXT DEFAULT NULL,
  p_comment_id TEXT DEFAULT NULL,
  p_reaction_type TEXT DEFAULT 'heart'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_deleted BOOLEAN := false;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_reaction_type NOT IN ('heart', 'candle', 'cross') THEN
    RAISE EXCEPTION 'Invalid reaction type' USING ERRCODE = '22023';
  END IF;

  IF p_post_id IS NULL AND p_comment_id IS NULL THEN
    RAISE EXCEPTION 'Either post_id or comment_id is required' USING ERRCODE = '22023';
  END IF;

  -- Validate post exists if target is post
  IF p_post_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.feed_posts WHERE id = p_post_id) THEN
    RAISE EXCEPTION 'Post not found' USING ERRCODE = 'P0002';
  END IF;

  -- Validate comment exists if target is comment
  IF p_comment_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.feed_comments WHERE id = p_comment_id) THEN
    RAISE EXCEPTION 'Comment not found' USING ERRCODE = 'P0002';
  END IF;

  -- Attempt to delete existing reaction (toggle off)
  IF p_post_id IS NOT NULL THEN
    DELETE FROM public.feed_reactions
    WHERE post_id = p_post_id AND user_id = v_user_id AND reaction_type = p_reaction_type;
    IF FOUND THEN
      v_deleted := true;
    END IF;
  ELSE
    DELETE FROM public.feed_reactions
    WHERE comment_id = p_comment_id AND user_id = v_user_id AND reaction_type = p_reaction_type;
    IF FOUND THEN
      v_deleted := true;
    END IF;
  END IF;

  -- If not deleted, insert new reaction (toggle on)
  IF NOT v_deleted THEN
    IF p_post_id IS NOT NULL THEN
      INSERT INTO public.feed_reactions (post_id, user_id, reaction_type)
      VALUES (p_post_id, v_user_id, p_reaction_type);
    ELSE
      INSERT INTO public.feed_reactions (comment_id, user_id, reaction_type)
      VALUES (p_comment_id, v_user_id, p_reaction_type);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action', CASE WHEN v_deleted THEN 'removed' ELSE 'added' END,
    'reaction_type', p_reaction_type
  );
END;
$$;

-- Grant execution on the scoped functions to authenticated users
REVOKE ALL ON FUNCTION public.edit_feed_post(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.edit_feed_post(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.moderate_feed_post_pin(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderate_feed_post_pin(TEXT, BOOLEAN) TO authenticated;

REVOKE ALL ON FUNCTION public.moderate_feed_post_announcement(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderate_feed_post_announcement(TEXT, BOOLEAN) TO authenticated;

REVOKE ALL ON FUNCTION public.toggle_feed_reaction(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_feed_reaction(TEXT, TEXT, TEXT) TO authenticated;

-- Minimum table grants to authenticated role
GRANT SELECT, INSERT, DELETE ON public.feed_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.feed_reactions TO authenticated;
