-- Phase 30: harden authenticated feed SECURITY DEFINER helpers.
-- These functions are intentionally callable by authenticated users and are
-- also used by RLS policies. Keep the current-user and role checks in place,
-- and pin every SECURITY DEFINER search_path to the empty path.

CREATE OR REPLACE FUNCTION public.can_attach_owned_feed_media(
  p_bucket text,
  p_object_path text,
  p_owner_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT COALESCE(p_owner_id = (SELECT auth.uid()), false)
    AND EXISTS (
      SELECT 1
      FROM public.media_objects AS m
      WHERE m.storage_bucket = p_bucket
        AND m.object_path = p_object_path
        AND m.owner_id = p_owner_id
        AND m.visibility = 'public'
        AND m.media_type IN ('image', 'video', 'audio')
    );
$function$;

CREATE OR REPLACE FUNCTION public.can_attach_owned_feed_media_reference(
  p_reference text,
  p_owner_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_reference TEXT;
  v_separator INTEGER;
BEGIN
  IF auth.uid() IS NULL OR p_owner_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  IF p_reference IS NULL
     OR p_reference !~ '^supabase-storage://[A-Za-z0-9][A-Za-z0-9_-]{0,99}/' THEN
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

ALTER FUNCTION public.edit_feed_post(text, text, text, text, text, text)
  SET search_path TO '';
ALTER FUNCTION public.moderate_feed_post_announcement(text, boolean)
  SET search_path TO '';
ALTER FUNCTION public.moderate_feed_post_pin(text, boolean)
  SET search_path TO '';
ALTER FUNCTION public.toggle_feed_reaction(text, text, text)
  SET search_path TO '';
