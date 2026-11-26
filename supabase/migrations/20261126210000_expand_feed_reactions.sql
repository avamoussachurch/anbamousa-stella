-- Allow a broad but controlled set of distinct community reactions.
ALTER TABLE public.feed_reactions
  DROP CONSTRAINT IF EXISTS feed_reactions_reaction_type_check;

ALTER TABLE public.feed_reactions
  ADD CONSTRAINT feed_reactions_reaction_type_check
  CHECK (reaction_type = ANY (ARRAY[
    'heart','candle','cross','pray','laugh','wow','clap','fire','dove','star'
  ]));

CREATE OR REPLACE FUNCTION public.toggle_feed_reaction(
  p_post_id text DEFAULT NULL::text,
  p_comment_id text DEFAULT NULL::text,
  p_reaction_type text DEFAULT 'heart'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid;
  v_deleted boolean := false;
  v_inserted integer := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_reaction_type NOT IN ('heart','candle','cross','pray','laugh','wow','clap','fire','dove','star') THEN
    RAISE EXCEPTION 'Invalid reaction type' USING ERRCODE = '22023';
  END IF;

  IF p_post_id IS NULL AND p_comment_id IS NULL THEN
    RAISE EXCEPTION 'Either post_id or comment_id is required' USING ERRCODE = '22023';
  END IF;
  IF p_post_id IS NOT NULL AND p_comment_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only one reaction target is allowed' USING ERRCODE = '22023';
  END IF;

  IF p_post_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.feed_posts WHERE id = p_post_id) THEN
    RAISE EXCEPTION 'Post not found' USING ERRCODE = 'P0002';
  END IF;
  IF p_comment_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.feed_comments WHERE id = p_comment_id) THEN
    RAISE EXCEPTION 'Comment not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_post_id IS NOT NULL THEN
    DELETE FROM public.feed_reactions
    WHERE post_id = p_post_id AND user_id = v_user_id AND reaction_type = p_reaction_type;
  ELSE
    DELETE FROM public.feed_reactions
    WHERE comment_id = p_comment_id AND user_id = v_user_id AND reaction_type = p_reaction_type;
  END IF;
  v_deleted := FOUND;

  IF NOT v_deleted THEN
    IF p_post_id IS NOT NULL THEN
      INSERT INTO public.feed_reactions (post_id, user_id, reaction_type)
      VALUES (p_post_id, v_user_id, p_reaction_type)
      ON CONFLICT (post_id, user_id, reaction_type) DO NOTHING;
      GET DIAGNOSTICS v_inserted = ROW_COUNT;
    ELSE
      INSERT INTO public.feed_reactions (comment_id, user_id, reaction_type)
      VALUES (p_comment_id, v_user_id, p_reaction_type)
      ON CONFLICT (comment_id, user_id, reaction_type) DO NOTHING;
      GET DIAGNOSTICS v_inserted = ROW_COUNT;
    END IF;
  END IF;

  IF NOT v_deleted AND v_inserted = 0 THEN
    RETURN jsonb_build_object('success', true, 'action', 'unchanged', 'reaction_type', p_reaction_type);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action', CASE WHEN v_deleted THEN 'removed' ELSE 'added' END,
    'reaction_type', p_reaction_type
  );
END;
$function$;

COMMENT ON FUNCTION public.toggle_feed_reaction(text,text,text) IS
  'Idempotent per-user reaction toggle for one of the approved Anba Mousa emoji reactions.';
