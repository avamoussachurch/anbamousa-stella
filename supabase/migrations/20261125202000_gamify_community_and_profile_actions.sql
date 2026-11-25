alter table public.achievement_events
  drop constraint if exists achievement_events_event_type_check;
alter table public.achievement_events
  add constraint achievement_events_event_type_check check (
    event_type = any(array[
      'lesson_opened','lesson_completed','hymn_opened','hymn_mastered',
      'taxis_opened','taxis_completed','prayer_day','quiz_passed',
      'attendance_present','community_post','community_reaction',
      'memory_verse','class_participation','learning_day',
      'community_poll_vote','church_event_rsvp','profile_cosmetic_unlocked'
    ]::text[])
  );

alter table public.achievement_badges
  drop constraint if exists achievement_badges_criteria_valid;
alter table public.achievement_badges
  add constraint achievement_badges_criteria_valid check (
    (criteria ? 'event_type')
    and ((criteria ->> 'event_type') = any(array[
      'lesson_opened','lesson_completed','hymn_opened','hymn_mastered',
      'taxis_opened','taxis_completed','prayer_day','quiz_passed',
      'attendance_present','community_post','community_reaction',
      'memory_verse','class_participation','learning_day',
      'community_poll_vote','church_event_rsvp','profile_cosmetic_unlocked'
    ]::text[]))
    and coalesce((criteria ->> 'count'),'1') ~ '^[1-9][0-9]{0,4}$'
  );

create or replace function public.capture_community_poll_vote_achievement_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_post_id text;
begin
  select option_row.post_id into v_post_id
  from public.feed_post_poll_options option_row
  where option_row.id = new.option_id;

  if v_post_id is not null then
    insert into public.achievement_events(student_id,event_type,source_key,metadata)
    values (new.user_id,'community_poll_vote','poll-vote:' || v_post_id,
      jsonb_build_object('post_id',v_post_id))
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
  if new.response = 'attending' then
    insert into public.achievement_events(student_id,event_type,source_key,metadata)
    values (new.user_id,'church_event_rsvp','church-event-rsvp:' || new.event_id::text,
      jsonb_build_object('event_id',new.event_id,'response',new.response))
    on conflict (student_id,source_key) do nothing;

    perform public.evaluate_student_achievements(new.user_id);
  end if;
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
  insert into public.achievement_events(student_id,event_type,source_key,metadata)
  values (new.user_id,'profile_cosmetic_unlocked','cosmetic-unlocked:' || new.cosmetic_id,
    jsonb_build_object('cosmetic_id',new.cosmetic_id))
  on conflict (student_id,source_key) do nothing;

  perform public.evaluate_student_achievements(new.user_id);
  return new;
end;
$function$;

drop trigger if exists capture_community_poll_vote_achievement_event on public.feed_post_poll_votes;
create trigger capture_community_poll_vote_achievement_event
after insert on public.feed_post_poll_votes
for each row execute function public.capture_community_poll_vote_achievement_event();

drop trigger if exists capture_church_event_rsvp_achievement_event on public.church_event_rsvps;
create trigger capture_church_event_rsvp_achievement_event
after insert or update of response on public.church_event_rsvps
for each row execute function public.capture_church_event_rsvp_achievement_event();

drop trigger if exists capture_profile_cosmetic_unlock_achievement_event on public.profile_cosmetic_unlocks;
create trigger capture_profile_cosmetic_unlock_achievement_event
after insert on public.profile_cosmetic_unlocks
for each row execute function public.capture_profile_cosmetic_unlock_achievement_event();

revoke all on function public.capture_community_poll_vote_achievement_event() from public, anon;
revoke all on function public.capture_church_event_rsvp_achievement_event() from public, anon;
revoke all on function public.capture_profile_cosmetic_unlock_achievement_event() from public, anon;
grant execute on function public.capture_community_poll_vote_achievement_event() to authenticated;
grant execute on function public.capture_church_event_rsvp_achievement_event() to authenticated;
grant execute on function public.capture_profile_cosmetic_unlock_achievement_event() to authenticated;

insert into public.achievement_badges
  (slug,title_en,title_ar,description_en,description_ar,category,icon,style,criteria,points_reward,is_active,display_order)
values
('poll-participant','Poll Participant','صوت في استطلاع','Vote in your first community poll.','شارك بصوتك في أول استطلاع مجتمعي.','community','chart-bar','blue','{"event_type":"community_poll_vote","count":1}'::jsonb,25,true,400),
('poll-regular','Poll Regular','صوت المجتمع','Vote in five different community polls.','شارك في خمسة استطلاعات مجتمعية مختلفة.','community','chart-no-axes-combined','teal','{"event_type":"community_poll_vote","count":5}'::jsonb,75,true,410),
('event-supporter','Event Supporter','داعم المناسبات','RSVP as attending to your first church event.','أكد حضورك لأول مناسبة كنسية.','community','calendar-check','green','{"event_type":"church_event_rsvp","count":1}'::jsonb,25,true,420),
('event-regular','Church Calendar Companion','رفيق المناسبات','RSVP as attending to five church events.','أكد حضورك لخمس مناسبات كنسية.','community','calendar-heart','gold','{"event_type":"church_event_rsvp","count":5}'::jsonb,75,true,430),
('profile-stylist','Profile Stylist','منسق الملف الشخصي','Unlock your first profile cosmetic.','افتح أول عنصر لتخصيص ملفك الشخصي.','community','palette','coral','{"event_type":"profile_cosmetic_unlocked","count":1}'::jsonb,35,true,440),
('cosmetic-collector','Cosmetic Collector','جامع الزينة','Unlock five profile cosmetics.','افتح خمسة عناصر لتخصيص ملفك الشخصي.','community','shopping-bag','gold','{"event_type":"profile_cosmetic_unlocked","count":5}'::jsonb,100,true,450)
on conflict (slug) do nothing;

update public.achievement_category_milestones
set badge_count = 10, updated_at = now()
where category = 'community' and badge_count = 3;
update public.achievement_category_milestones
set badge_count = 6, updated_at = now()
where category = 'community' and badge_count = 2;
update public.achievement_category_milestones
set badge_count = 3, updated_at = now()
where category = 'community' and badge_count = 1;
