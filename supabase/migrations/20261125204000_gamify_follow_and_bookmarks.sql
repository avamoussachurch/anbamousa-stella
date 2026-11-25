alter table public.achievement_events
  drop constraint if exists achievement_events_event_type_check;
alter table public.achievement_events
  add constraint achievement_events_event_type_check check (
    event_type = any(array[
      'lesson_opened','lesson_completed','hymn_opened','hymn_mastered',
      'taxis_opened','taxis_completed','prayer_day','quiz_passed',
      'attendance_present','community_post','community_reaction',
      'memory_verse','class_participation','learning_day',
      'community_poll_vote','church_event_rsvp','profile_cosmetic_unlocked',
      'community_follow','community_bookmark'
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
      'community_poll_vote','church_event_rsvp','profile_cosmetic_unlocked',
      'community_follow','community_bookmark'
    ]::text[]))
    and coalesce((criteria ->> 'count'),'1') ~ '^[1-9][0-9]{0,4}$'
  );

create or replace function public.capture_profile_follow_achievement_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not exists (
    select 1 from public.profile_role_assignments r
    where r.user_id = new.follower_id and r.role = 'student' and r.revoked_at is null
  ) then
    return new;
  end if;

  insert into public.achievement_events(student_id,event_type,source_key,metadata)
  values (new.follower_id,'community_follow','profile-follow:' || new.followed_id::text,
    pg_catalog.jsonb_build_object('followed_id',new.followed_id))
  on conflict (student_id,source_key) do nothing;

  perform public.evaluate_student_achievements(new.follower_id);
  return new;
end;
$function$;

create or replace function public.capture_feed_post_bookmark_achievement_event()
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
  values (new.user_id,'community_bookmark','feed-bookmark:' || new.post_id,
    pg_catalog.jsonb_build_object('post_id',new.post_id))
  on conflict (student_id,source_key) do nothing;

  perform public.evaluate_student_achievements(new.user_id);
  return new;
end;
$function$;

drop trigger if exists capture_profile_follow_achievement_event on public.profile_follows;
create trigger capture_profile_follow_achievement_event
after insert on public.profile_follows
for each row execute function public.capture_profile_follow_achievement_event();

drop trigger if exists capture_feed_post_bookmark_achievement_event on public.feed_post_bookmarks;
create trigger capture_feed_post_bookmark_achievement_event
after insert on public.feed_post_bookmarks
for each row execute function public.capture_feed_post_bookmark_achievement_event();

revoke all on function public.capture_profile_follow_achievement_event() from public, anon;
revoke all on function public.capture_feed_post_bookmark_achievement_event() from public, anon;
grant execute on function public.capture_profile_follow_achievement_event() to authenticated;
grant execute on function public.capture_feed_post_bookmark_achievement_event() to authenticated;

insert into public.achievement_badges
  (slug,title_en,title_ar,description_en,description_ar,category,icon,style,criteria,points_reward,is_active,display_order)
values
('first-follow','First Connection','أول تواصل','Follow your first person in the community.','تابع أول شخص في مجتمع أنبا موسى.','community','users','teal','{"event_type":"community_follow","count":1}'::jsonb,20,true,460),
('community-connector','Community Connector','حلقة وصل المجتمع','Follow five people in the community.','تابع خمسة أشخاص في المجتمع.','community','users-round','blue','{"event_type":"community_follow","count":5}'::jsonb,60,true,470),
('first-bookmark','Saved Treasure','كنز محفوظ','Save your first community post.','احفظ أول منشور يعجبك في المجتمع.','community','bookmark','gold','{"event_type":"community_bookmark","count":1}'::jsonb,20,true,480),
('memory-keeper','Memory Keeper','حافظ الذكريات','Save five community posts for later.','احفظ خمسة منشورات للرجوع إليها لاحقاً.','community','bookmark-check','coral','{"event_type":"community_bookmark","count":5}'::jsonb,60,true,490)
on conflict (slug) do nothing;

insert into public.achievement_category_milestones
  (category,badge_count,title_en,title_ar,points_reward,is_active,display_order)
values
('community',14,'Community Legend','أسطورة المجتمع',400,true,190)
on conflict (category,badge_count) do nothing;
