create or replace function public.record_community_achievement_event(
  p_event_type text,
  p_source_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_source_key text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_source_id is null or length(btrim(p_source_id)) = 0 or length(p_source_id) > 160 then
    raise exception 'INVALID_ACHIEVEMENT_SOURCE';
  end if;

  if p_event_type = 'community_post' then
    if not exists (
      select 1 from public.feed_posts p
      where p.id = p_source_id and p.author_id = v_user_id
        and coalesce(p.is_hidden, false) = false
    ) then
      raise exception 'COMMUNITY_POST_NOT_VERIFIED';
    end if;
    v_source_key := 'community-post:' || p_source_id;
  elsif p_event_type = 'community_reaction' then
    if not exists (
      select 1 from public.feed_reactions r
      where r.user_id = v_user_id and r.post_id = p_source_id
        and r.comment_id is null
    ) then
      raise exception 'COMMUNITY_REACTION_NOT_VERIFIED';
    end if;
    v_source_key := 'community-reaction:' || p_source_id;
  else
    raise exception 'INVALID_COMMUNITY_ACHIEVEMENT_EVENT';
  end if;

  insert into public.achievement_events(student_id, event_type, source_key, metadata)
  values (v_user_id, p_event_type, v_source_key, jsonb_build_object('source_id', p_source_id))
  on conflict (student_id, source_key) do nothing;

  return public.evaluate_student_achievements(v_user_id);
end;
$function$;

revoke all on function public.record_community_achievement_event(text, text) from public, anon;
grant execute on function public.record_community_achievement_event(text, text) to authenticated;
