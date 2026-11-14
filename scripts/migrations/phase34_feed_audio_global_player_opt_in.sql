-- Feed voice recordings stay feed-only unless their author explicitly opts in.
-- The default is deliberately false; only audio attachments may be promoted.
ALTER TABLE public.feed_post_attachments
  ADD COLUMN IF NOT EXISTS include_in_global_player BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS global_audio_title TEXT;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conname = 'feed_post_attachments_global_audio_type_check'
      AND conrelid = 'public.feed_post_attachments'::regclass
  ) THEN
    ALTER TABLE public.feed_post_attachments
      ADD CONSTRAINT feed_post_attachments_global_audio_type_check
      CHECK (
        NOT include_in_global_player
        OR (
          media_type = 'audio'
          AND global_audio_title IS NOT NULL
          AND pg_catalog.length(pg_catalog.btrim(global_audio_title)) BETWEEN 1 AND 100
        )
      );
  END IF;
END
$migration$;

-- Anonymous users may read only audio explicitly published to the global player.
-- Existing authenticated attachment access remains unchanged.
GRANT SELECT ON TABLE public.feed_post_attachments TO anon;
DROP POLICY IF EXISTS "Public users view opted-in global feed audio" ON public.feed_post_attachments;
CREATE POLICY "Public users view opted-in global feed audio"
  ON public.feed_post_attachments
  FOR SELECT
  TO anon
  USING (media_type = 'audio' AND include_in_global_player = true);

-- A public feed attachment is not automatically a global audio track.
-- This policy grants no write access and no access to unselected attachments.
