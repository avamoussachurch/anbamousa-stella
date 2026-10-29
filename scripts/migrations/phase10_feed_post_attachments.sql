-- Additive feed attachment records. Apply manually after reviewing the schema.
-- Existing media_url fields remain unchanged and continue to be read as fallback.

CREATE TABLE IF NOT EXISTS public.feed_post_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position SMALLINT NOT NULL CHECK (position BETWEEN 0 AND 9),
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'youtube', 'audio', 'embed')),
  storage_bucket TEXT,
  object_path TEXT,
  external_url TEXT,
  media_thumbnail TEXT,
  media_provider TEXT,
  original_filename TEXT,
  mime_type TEXT,
  byte_size BIGINT CHECK (byte_size IS NULL OR byte_size >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT feed_post_attachments_storage_target_check CHECK (
    (storage_bucket IS NOT NULL AND object_path IS NOT NULL AND external_url IS NULL)
    OR
    (storage_bucket IS NULL AND object_path IS NULL AND external_url IS NOT NULL)
  ),
  CONSTRAINT feed_post_attachments_post_position_unique UNIQUE (post_id, position)
);

CREATE INDEX IF NOT EXISTS feed_post_attachments_post_order_idx
  ON public.feed_post_attachments (post_id, position);
CREATE INDEX IF NOT EXISTS feed_post_attachments_storage_ref_idx
  ON public.feed_post_attachments (storage_bucket, object_path)
  WHERE storage_bucket IS NOT NULL;

ALTER TABLE public.feed_post_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.feed_post_attachments FROM PUBLIC, anon;
GRANT SELECT, INSERT ON TABLE public.feed_post_attachments TO authenticated;
GRANT ALL ON TABLE public.feed_post_attachments TO service_role;

CREATE OR REPLACE FUNCTION public.can_attach_owned_feed_media(
  p_bucket TEXT,
  p_object_path TEXT,
  p_owner_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.media_objects AS m
    WHERE m.storage_bucket = p_bucket
      AND m.object_path = p_object_path
      AND m.owner_id = p_owner_id
      AND m.visibility = 'public'
      AND m.media_type IN ('image', 'video', 'audio')
  );
$function$;

REVOKE ALL ON FUNCTION public.can_attach_owned_feed_media(TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_attach_owned_feed_media(TEXT, TEXT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_attach_owned_feed_media_reference(
  p_reference TEXT,
  p_owner_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $function$
DECLARE
  v_reference TEXT;
  v_separator INTEGER;
BEGIN
  IF p_reference IS NULL OR p_reference !~ '^supabase-storage://[A-Za-z0-9][A-Za-z0-9_-]{0,99}/' THEN
    RETURN false;
  END IF;

  v_reference := pg_catalog.substr(p_reference, pg_catalog.length('supabase-storage://') + 1);
  v_separator := pg_catalog.strpos(v_reference, '/');
  IF v_separator <= 1 OR v_separator >= pg_catalog.length(v_reference) THEN
    RETURN false;
  END IF;

  RETURN public.can_attach_owned_feed_media(
    pg_catalog.substr(v_reference, 1, v_separator - 1),
    pg_catalog.substr(v_reference, v_separator + 1),
    p_owner_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.can_attach_owned_feed_media_reference(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_attach_owned_feed_media_reference(TEXT, UUID) TO authenticated;

DROP POLICY IF EXISTS "Authenticated users view feed post attachments" ON public.feed_post_attachments;
CREATE POLICY "Authenticated users view feed post attachments"
  ON public.feed_post_attachments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authors attach their own feed media" ON public.feed_post_attachments;
CREATE POLICY "Authors attach their own feed media"
  ON public.feed_post_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.feed_posts AS p
      WHERE p.id = post_id AND p.author_id = auth.uid()
    )
    AND (
      (storage_bucket IS NOT NULL AND public.can_attach_owned_feed_media(storage_bucket, object_path, owner_id))
      OR (
        storage_bucket IS NULL
        AND external_url ~ '^https://'
        AND external_url !~* '/object/sign/'
        AND external_url !~* '[?&](access_token|token|signature|expires|x-amz-signature|x-amz-credential)='
      )
    )
  );

-- Protect the legacy single-media columns too: otherwise clients could bypass
-- attachment-row ownership checks by writing directly to feed_posts.media_url.
CREATE OR REPLACE FUNCTION public.enforce_feed_post_media_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.media_url IS NOT DISTINCT FROM OLD.media_url THEN
    RETURN NEW;
  END IF;

  IF NEW.media_url IS NULL THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL AND current_user IN ('service_role', 'postgres') THEN
    RETURN NEW;
  END IF;

  IF NEW.media_url ~ '^https://'
    AND NEW.media_url !~* '/object/sign/'
    AND NEW.media_url !~* '[?&](access_token|token|signature|expires|x-amz-signature|x-amz-credential)='
  THEN
    RETURN NEW;
  END IF;

  IF public.can_attach_owned_feed_media_reference(NEW.media_url, auth.uid()) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Feed media must be a public external URL or the authenticated owner''s public upload.'
    USING ERRCODE = '42501';
END;
$function$;

DROP TRIGGER IF EXISTS enforce_feed_post_media_ownership ON public.feed_posts;
CREATE TRIGGER enforce_feed_post_media_ownership
  BEFORE INSERT OR UPDATE OF media_url ON public.feed_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_feed_post_media_ownership();
