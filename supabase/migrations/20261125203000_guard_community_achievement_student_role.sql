create or replace function public.capture_community_poll_vote_achievement_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_post_id text;
begin
  if not exists (
    select 1 from public.profile_role_assignments r
    where r.user_id = new.user_id and r.role = 'student' and r.revoked_at is null
  ) then
    return new;
  end if;

  select option_row.post_id into v_post_id
  from public.feed_post_poll_options option_row
  where option_row.id = new.option_id;

  if v_post_id is not null then
    insert into public.achievement_events(student_id,event_type,source_key,metadata)
    values (new.user_id,'community_poll_vote','poll-vote:' || v_post_id,
      pg_catalog.jsonb_build_object('post_id',v_post_id))
    on conflict (student_id,source_key) do nothing;

    perform public.evaluate_student_achievements(new.user_id);
  end if;
  return new;
end;
$function$;

create or replace function public.capture_church_event_rsvp_achievement_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.response <> 'attending' or not exists (
    select 1 from public.profile_role_assignments r
    where r.user_id = new.user_id and r.role = 'student' and r.revoked_at is null
  ) then
    return new;
  end if;

  insert into public.achievement_events(student_id,event_type,source_key,metadata)
  values (new.user_id,'church_event_rsvp','church-event-rsvp:' || new.event_id::text,
    pg_catalog.jsonb_build_object('event_id',new.event_id,'response',new.response))
  on conflict (student_id,source_key) do nothing;

  perform public.evaluate_student_achievements(new.user_id);
  return new;
end;
$function$;

create or replace function public.capture_profile_cosmetic_unlock_achievement_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not exists (
    select 1 from public.profile_role_assignments r
    where r.user_id = new.user_id and r.role = 'student' and r.revoked_at is null
  ) then
    return new;
  end if;

  insert into public.achievement_events(student_id,event_type,source_key,metadata)
  values (new.user_id,'profile_cosmetic_unlocked','cosmetic-unlocked:' || new.cosmetic_id,
    pg_catalog.jsonb_build_object('cosmetic_id',new.cosmetic_id))
  on conflict (student_id,source_key) do nothing;

  perform public.evaluate_student_achievements(new.user_id);
  return new;
end;
$function$;

revoke all on function public.capture_community_poll_vote_achievement_event() from public, anon;
revoke all on function public.capture_church_event_rsvp_achievement_event() from public, anon;
revoke all on function public.capture_profile_cosmetic_unlock_achievement_event() from public, anon;
grant execute on function public.capture_community_poll_vote_achievement_event() to authenticated;
grant execute on function public.capture_church_event_rsvp_achievement_event() to authenticated;
grant execute on function public.capture_profile_cosmetic_unlock_achievement_event() to authenticated;
