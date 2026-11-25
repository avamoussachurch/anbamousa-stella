
create or replace function public.evaluate_my_achievements()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_student_id uuid := auth.uid();
begin
  if v_student_id is null or not public.has_role('student') then
    raise exception 'STUDENT_AUTHENTICATION_REQUIRED' using errcode='42501';
  end if;
  return public.evaluate_student_achievements(v_student_id);
end;
$$;
revoke all on function public.evaluate_my_achievements() from public, anon;
grant execute on function public.evaluate_my_achievements() to authenticated;

create or replace function public.capture_feed_reaction_achievement_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_source_key text;
begin
  if exists (
    select 1 from public.profile_role_assignments r
    where r.user_id = new.user_id and r.role = 'student' and r.revoked_at is null
  ) then
    v_source_key := 'feed-reaction:' || new.user_id::text || ':' ||
      coalesce(new.post_id::text, 'comment-' || new.comment_id::text);
    insert into public.achievement_events(student_id,event_type,source_key,metadata)
    values (
      new.user_id,'community_reaction',v_source_key,
      jsonb_build_object('post_id',new.post_id,'comment_id',new.comment_id,'reaction_type',new.reaction_type)
    )
    on conflict(student_id,source_key) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.capture_feed_reaction_achievement_event() from public, anon, authenticated;
