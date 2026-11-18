-- Correctly correlate a reply to its parent comment and keep both on the same post.
-- The previous policy used unqualified parent_id/post_id columns in a self-query;
-- PostgreSQL resolved both sides to the inner alias, making the parent check invalid.

DROP POLICY IF EXISTS "Users can insert own feed comments" ON public.feed_comments;

CREATE POLICY "Users can insert own feed comments"
  ON public.feed_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = author_id
    AND EXISTS (
      SELECT 1
      FROM public.feed_posts AS target_post
      WHERE target_post.id = feed_comments.post_id
    )
    AND (
      parent_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.feed_comments AS parent_comment
        WHERE parent_comment.id = feed_comments.parent_id
          AND parent_comment.post_id = feed_comments.post_id
          AND parent_comment.id <> feed_comments.id
      )
    )
  );
