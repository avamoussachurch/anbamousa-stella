-- Tune achievement query plans, keep RLS policies single-purpose, and include staff-recorded activity.
create index if not exists achievement_badges_created_by_idx on public.achievement_badges(created_by);
create index if not exists achievement_badges_updated_by_idx on public.achievement_badges(updated_by);
create index if not exists achievement_category_milestones_created_by_idx on public.achievement_category_milestones(created_by);
create index if not exists achievement_unlocks_badge_id_idx on public.achievement_unlocks(badge_id);
create index if not exists achievement_milestone_awards_milestone_id_idx on public.achievement_milestone_awards(milestone_id);
create index if not exists reward_catalog_created_by_idx on public.reward_catalog(created_by);
create index if not exists reward_catalog_updated_by_idx on public.reward_catalog(updated_by);
create index if not exists reward_requests_fulfilled_by_idx on public.reward_requests(fulfilled_by);
create index if not exists feed_post_reports_post_id_idx on public.feed_post_reports(post_id);
create index if not exists feed_post_reports_reported_user_id_idx on public.feed_post_reports(reported_user_id);
create index if not exists feed_post_reports_reviewed_by_idx on public.feed_post_reports(reviewed_by);

do $$
begin
 if not exists(select 1 from pg_constraint where conname='achievement_badges_criteria_valid') then
  alter table public.achievement_badges add constraint achievement_badges_criteria_valid check (
   criteria ? 'event_type' and criteria->>'event_type'=any(array[
    'lesson_opened','lesson_completed','hymn_opened','hymn_mastered','taxis_opened','taxis_completed',
    'prayer_day','quiz_passed','attendance_present','community_post','community_reaction','memory_verse',
    'class_participation','learning_day'
   ]) and coalesce(criteria->>'count','1') ~ '^[1-9][0-9]{0,4}$'
  );
 end if;
end $$;

drop policy if exists achievement_badges_staff_manage on public.achievement_badges;
create policy achievement_badges_staff_insert on public.achievement_badges for insert to authenticated with check(public.has_role('teacher') or public.is_church_admin());
create policy achievement_badges_staff_update on public.achievement_badges for update to authenticated using(public.has_role('teacher') or public.is_church_admin()) with check(public.has_role('teacher') or public.is_church_admin());
create policy achievement_badges_staff_delete on public.achievement_badges for delete to authenticated using(public.has_role('teacher') or public.is_church_admin());
drop policy if exists achievement_milestones_staff_manage on public.achievement_category_milestones;
create policy achievement_milestones_staff_insert on public.achievement_category_milestones for insert to authenticated with check(public.has_role('teacher') or public.is_church_admin());
create policy achievement_milestones_staff_update on public.achievement_category_milestones for update to authenticated using(public.has_role('teacher') or public.is_church_admin()) with check(public.has_role('teacher') or public.is_church_admin());
create policy achievement_milestones_staff_delete on public.achievement_category_milestones for delete to authenticated using(public.has_role('teacher') or public.is_church_admin());
drop policy if exists reward_catalog_staff_manage on public.reward_catalog;
create policy reward_catalog_staff_insert on public.reward_catalog for insert to authenticated with check(public.has_role('teacher') or public.is_church_admin());
create policy reward_catalog_staff_update on public.reward_catalog for update to authenticated using(public.has_role('teacher') or public.is_church_admin()) with check(public.has_role('teacher') or public.is_church_admin());
create policy reward_catalog_staff_delete on public.reward_catalog for delete to authenticated using(public.has_role('teacher') or public.is_church_admin());
drop policy if exists achievement_events_no_client_access on public.achievement_events;

create or replace function public.evaluate_student_achievements(p_student_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_badge record; v_milestone record; v_count integer; v_points integer:=0;
 v_new_badges jsonb:='[]'::jsonb; v_new_milestones jsonb:='[]'::jsonb; v_inserted_id uuid;
begin
 if p_student_id is null then raise exception 'STUDENT_REQUIRED'; end if;
 for v_badge in select b.id,b.slug,b.title_en,b.title_ar,b.category,b.icon,b.style,b.points_reward,
   b.criteria->>'event_type' required_event,coalesce((b.criteria->>'count')::integer,1) required_count
  from public.achievement_badges b where b.is_active=true and b.criteria ? 'event_type' order by b.display_order,b.created_at
 loop
  select count(*)::integer into v_count from public.achievement_events e where e.student_id=p_student_id and e.event_type=v_badge.required_event;
  if v_count>=v_badge.required_count then
   v_inserted_id:=null;
   insert into public.achievement_unlocks(student_id,badge_id,points_awarded,evidence)
   values(p_student_id,v_badge.id,v_badge.points_reward,pg_catalog.jsonb_build_object('event_type',v_badge.required_event,'count',v_count))
   on conflict(student_id,badge_id) do nothing returning id into v_inserted_id;
   if v_inserted_id is not null then
    update public.profiles set points=coalesce(points,0)+v_badge.points_reward where id=p_student_id;
    v_points:=v_points+v_badge.points_reward;
    v_new_badges:=v_new_badges||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
     'id',v_badge.id,'slug',v_badge.slug,'title_en',v_badge.title_en,'title_ar',v_badge.title_ar,
     'category',v_badge.category,'icon',v_badge.icon,'style',v_badge.style,'points_reward',v_badge.points_reward));
   end if;
  end if;
 end loop;
 for v_milestone in select m.id,m.category,m.badge_count,m.title_en,m.title_ar,m.points_reward
  from public.achievement_category_milestones m where m.is_active=true order by m.badge_count
 loop
  select count(*)::integer into v_count from public.achievement_unlocks u
   join public.achievement_badges b on b.id=u.badge_id where u.student_id=p_student_id and b.category=v_milestone.category;
  if v_count>=v_milestone.badge_count then
   v_inserted_id:=null;
   insert into public.achievement_milestone_awards(student_id,milestone_id,points_awarded)
   values(p_student_id,v_milestone.id,v_milestone.points_reward)
   on conflict(student_id,milestone_id) do nothing returning id into v_inserted_id;
   if v_inserted_id is not null then
    update public.profiles set points=coalesce(points,0)+v_milestone.points_reward where id=p_student_id;
    v_points:=v_points+v_milestone.points_reward;
    v_new_milestones:=v_new_milestones||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
     'id',v_milestone.id,'category',v_milestone.category,'badge_count',v_milestone.badge_count,
     'title_en',v_milestone.title_en,'title_ar',v_milestone.title_ar,'points_reward',v_milestone.points_reward));
   end if;
  end if;
 end loop;
 return pg_catalog.jsonb_build_object('success',true,'new_badges',v_new_badges,'new_milestones',v_new_milestones,'points_awarded',v_points);
end; $$;
revoke all on function public.evaluate_student_achievements(uuid) from public,anon,authenticated;

create or replace function public.record_achievement_event(p_event_type text,p_source_key text,p_metadata jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_student_id uuid:=(select auth.uid()); v_inserted integer; v_result jsonb;
begin
 if v_student_id is null or not public.has_role('student') then raise exception 'STUDENT_AUTHENTICATION_REQUIRED' using errcode='42501'; end if;
 if p_event_type not in ('lesson_opened','lesson_completed','hymn_opened','hymn_mastered','taxis_opened','taxis_completed','prayer_day','quiz_passed','attendance_present','community_post','community_reaction','memory_verse','class_participation','learning_day') then raise exception 'INVALID_ACHIEVEMENT_EVENT' using errcode='22023'; end if;
 if p_source_key is null or char_length(p_source_key) not between 1 and 180 or p_metadata is null or pg_catalog.jsonb_typeof(p_metadata)<>'object' or pg_catalog.pg_column_size(p_metadata)>8192 then raise exception 'INVALID_ACHIEVEMENT_EVENT_PAYLOAD' using errcode='22023'; end if;
 insert into public.achievement_events(student_id,event_type,source_key,metadata) values(v_student_id,p_event_type,p_source_key,p_metadata)
 on conflict(student_id,source_key) do nothing;
 get diagnostics v_inserted=row_count;
 v_result:=public.evaluate_student_achievements(v_student_id);
 return v_result||pg_catalog.jsonb_build_object('duplicate',(v_inserted=0));
end; $$;
revoke all on function public.record_achievement_event(text,text,jsonb) from public,anon;
grant execute on function public.record_achievement_event(text,text,jsonb) to authenticated;

create or replace function public.capture_attendance_achievement_event()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='present' and (tg_op='INSERT' or old.status is distinct from 'present') then
  if exists(select 1 from public.profile_role_assignments r where r.user_id=new.student_id and r.role='student' and r.revoked_at is null) then
   insert into public.achievement_events(student_id,event_type,source_key,metadata)
   values(new.student_id,'attendance_present','attendance:'||new.attendance_session_id::text||':'||new.student_id::text,
    pg_catalog.jsonb_build_object('session_id',new.attendance_session_id,'marked_at',new.marked_at))
   on conflict(student_id,source_key) do nothing;
  end if;
 end if;
 return new;
end; $$;
revoke all on function public.capture_attendance_achievement_event() from public,anon,authenticated;
drop trigger if exists capture_attendance_achievement_event on public.class_attendance_records;
create trigger capture_attendance_achievement_event after insert or update of status on public.class_attendance_records for each row execute function public.capture_attendance_achievement_event();

create or replace function public.capture_feed_post_achievement_event()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if coalesce(new.is_hidden,false)=false and exists(select 1 from public.profile_role_assignments r where r.user_id=new.author_id and r.role='student' and r.revoked_at is null) then
  insert into public.achievement_events(student_id,event_type,source_key,metadata)
  values(new.author_id,'community_post','feed-post:'||new.id,pg_catalog.jsonb_build_object('post_id',new.id))
  on conflict(student_id,source_key) do nothing;
 end if;
 return new;
end; $$;
revoke all on function public.capture_feed_post_achievement_event() from public,anon,authenticated;
drop trigger if exists capture_feed_post_achievement_event on public.feed_posts;
create trigger capture_feed_post_achievement_event after insert on public.feed_posts for each row execute function public.capture_feed_post_achievement_event();

create or replace function public.capture_feed_reaction_achievement_event()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.profile_role_assignments r where r.user_id=new.user_id and r.role='student' and r.revoked_at is null) then
  insert into public.achievement_events(student_id,event_type,source_key,metadata)
  values(new.user_id,'community_reaction','feed-reaction:'||new.id::text,pg_catalog.jsonb_build_object('post_id',new.post_id,'comment_id',new.comment_id,'reaction_type',new.reaction_type))
  on conflict(student_id,source_key) do nothing;
 end if;
 return new;
end; $$;
revoke all on function public.capture_feed_reaction_achievement_event() from public,anon,authenticated;
drop trigger if exists capture_feed_reaction_achievement_event on public.feed_reactions;
create trigger capture_feed_reaction_achievement_event after insert on public.feed_reactions for each row execute function public.capture_feed_reaction_achievement_event();

update public.achievement_badges set is_active=false where slug in ('memory-keeper','class-helper');
