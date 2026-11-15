-- Launch readiness: persistent, role-scoped notifications and browser push subscriptions.
-- Additive migration. Existing profiles, relationships, classes, events, feed and lesson data remain untouched.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in (
    'announcement','event','lesson','assignment','progress','streak',
    'achievement','leaderboard','help_request','moderation','system','motivation'
  )),
  title_en text not null,
  title_ar text not null,
  body_en text not null,
  body_ar text not null,
  action_tab text,
  action_data jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  push_status text not null default 'pending'
    check (push_status in ('pending','sent','skipped','failed')),
  push_attempts integer not null default 0 check (push_attempts >= 0),
  push_last_error text,
  push_sent_at timestamptz,
  unique (recipient_id, dedupe_key)
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_pending_push_idx
  on public.notifications (created_at)
  where push_status = 'pending';

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  in_app_enabled boolean not null default true,
  push_enabled boolean not null default false,
  category_settings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(category_settings) = 'object'),
  quiet_hours_start time,
  quiet_hours_end time,
  timezone text not null default 'Africa/Cairo',
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_secret text not null,
  expiration_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_success_at timestamptz,
  failure_count integer not null default 0 check (failure_count >= 0),
  unique (endpoint)
);
create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (recipient_id = (select auth.uid()));

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- A recipient can only mark a notification read; all content and delivery metadata
-- are server-owned. Inserts and deletes are trigger/service-owned.
revoke insert, delete on public.notifications from anon, authenticated;
revoke update on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

drop policy if exists notification_preferences_own on public.notification_preferences;
create policy notification_preferences_own on public.notification_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists push_subscriptions_update_own on public.push_subscriptions;
create policy push_subscriptions_update_own on public.push_subscriptions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Trigger-only notification helpers are kept outside the exposed public schema.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to postgres, service_role;

create or replace function private.enqueue_notification(
  p_recipient_id uuid,
  p_category text,
  p_title_en text,
  p_title_ar text,
  p_body_en text,
  p_body_ar text,
  p_dedupe_key text,
  p_action_tab text default null,
  p_action_data jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if p_recipient_id is null or p_dedupe_key is null or length(p_dedupe_key) > 240 then
    return;
  end if;
  insert into public.notifications (
    recipient_id, category, title_en, title_ar, body_en, body_ar,
    dedupe_key, action_tab, action_data
  ) values (
    p_recipient_id, p_category, left(p_title_en, 160), left(p_title_ar, 160),
    left(p_body_en, 600), left(p_body_ar, 600), p_dedupe_key,
    p_action_tab, coalesce(p_action_data, '{}'::jsonb)
  )
  on conflict (recipient_id, dedupe_key) do nothing;
end;
$$;
revoke all on function private.enqueue_notification(uuid,text,text,text,text,text,text,text,jsonb)
  from public, anon, authenticated;

create or replace function private.notify_new_church_event()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_profile record;
begin
  for v_profile in
    select p.id from public.profiles p
    where exists (
      select 1 from public.profile_role_assignments pra
      where pra.user_id = p.id and pra.revoked_at is null
    ) or p.role in ('student','teacher','parent','admin')
  loop
    perform private.enqueue_notification(
      v_profile.id, 'event',
      'A new church event was posted', 'تم نشر فعالية كنسية جديدة',
      coalesce(new.title_en, 'Church event'),
      coalesce(new.title_ar, 'فعالية كنسية'),
      'event:' || new.id::text, 'calendar',
      jsonb_build_object('eventId', new.id, 'dateTime', new.date_time)
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists notifications_after_church_event on public.church_events;
create trigger notifications_after_church_event
  after insert on public.church_events
  for each row execute function private.notify_new_church_event();

create or replace function private.notify_new_feed_post()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_profile record;
  v_excerpt text := left(regexp_replace(coalesce(new.content, ''), '\s+', ' ', 'g'), 180);
begin
  for v_profile in
    select p.id from public.profiles p
    where p.id <> new.author_id
  loop
    perform private.enqueue_notification(
      v_profile.id,
      case when new.is_announcement then 'announcement' else 'announcement' end,
      case when new.is_announcement then 'New church announcement' else 'New community post' end,
      case when new.is_announcement then 'إعلان كنسي جديد' else 'منشور جديد في المجتمع' end,
      coalesce(new.author_name, 'A community member') || ': ' || v_excerpt,
      coalesce(new.author_name, 'أحد أفراد المجتمع') || ': ' || v_excerpt,
      'feed-post:' || new.id,
      'feed',
      jsonb_build_object('postId', new.id, 'isAnnouncement', new.is_announcement)
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists notifications_after_feed_post on public.feed_posts;
create trigger notifications_after_feed_post
  after insert on public.feed_posts
  for each row execute function private.notify_new_feed_post();

create or replace function private.notify_published_lesson()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_student record;
  v_was_published boolean := false;
begin
  if coalesce(new.status, '') <> 'published'
     and coalesce(new.lesson_status, '') <> 'published' then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and old.active_version_id is not distinct from new.active_version_id
     and coalesce(old.status, '') = coalesce(new.status, '')
     and coalesce(old.lesson_status, '') = coalesce(new.lesson_status, '') then
    return new;
  end if;

  for v_student in
    select distinct p.id
    from public.profiles p
    left join public.class_memberships cm
      on cm.student_id = p.id and cm.status = 'active'
    where p.role = 'student'
      and (
        (new.grade_level is not null and (p.grade = new.grade_level or cm.exact_grade = new.grade_level))
        or (new.grade_level is null)
      )
  loop
    perform private.enqueue_notification(
      v_student.id, 'lesson',
      'A new lesson is ready for you', 'درس جديد جاهز ليك',
      'A new Sunday School lesson has been published: ' || coalesce(new.title_en, 'New lesson'),
      'تم نشر درس جديد: ' || coalesce(new.title_ar, new.title_en, 'درس جديد'),
      'published-lesson:' || new.id::text || ':' || coalesce(new.active_version_id::text, 'published'),
      'lessons',
      jsonb_build_object('lessonId', new.id, 'versionId', new.active_version_id)
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists notifications_after_lesson_publish on public.lessons;
create trigger notifications_after_lesson_publish
  after insert or update on public.lessons
  for each row execute function private.notify_published_lesson();

create or replace function private.notify_lesson_completion()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_student_name text;
  v_lesson_title text;
  v_parent record;
  v_teacher record;
  v_completed_count integer;
begin
  if new.completed is not true then return new; end if;
  if tg_op = 'UPDATE' and old.completed is true then return new; end if;

  select coalesce(p.name, 'A student') into v_student_name
  from public.profiles p where p.id = new.student_id;
  select coalesce(l.title_en, 'a lesson') into v_lesson_title
  from public.lessons l where l.id = new.lesson_id;

  -- Student receives a private celebration; never publish their activity publicly.
  perform private.enqueue_notification(
    new.student_id, 'achievement',
    'Lesson completed! Great work!', 'أحسنت! خلصت الدرس',
    'You completed ' || coalesce(v_lesson_title, 'your lesson') || '. Keep learning at your own pace.',
    'أكملت ' || coalesce(v_lesson_title, 'الدرس') || '. كمل تعلّم براحتك!',
    'lesson-completed:' || new.lesson_id::text,
    'points',
    jsonb_build_object('lessonId', new.lesson_id, 'pointsEarned', coalesce(new.points_earned, 0))
  );

  -- Parent recipients are restricted to verified guardian relationships.
  for v_parent in
    select distinct ur.parent_id
    from public.user_relationships ur
    where ur.child_id = new.student_id
      and ur.verified_at is not null
      and ur.relationship_type in ('parent_child','guardian_student')
  loop
    perform private.enqueue_notification(
      v_parent.parent_id, 'progress',
      'Your child completed a lesson', 'ابنك/بنتك أكمل درسًا',
      coalesce(v_student_name, 'Your child') || ' completed ' || coalesce(v_lesson_title, 'a lesson') || '.',
      coalesce(v_student_name, 'ابنك/بنتك') || ' أكمل ' || coalesce(v_lesson_title, 'درسًا') || '.',
      'child-lesson-completed:' || new.student_id::text || ':' || new.lesson_id::text,
      'children',
      jsonb_build_object('childId', new.student_id, 'lessonId', new.lesson_id)
    );
  end loop;

  -- Only teachers assigned to the student's active class receive class activity.
  for v_teacher in
    select distinct sca.servant_id
    from public.class_memberships cm
    join public.servant_class_assignments sca
      on sca.class_instance_id = cm.class_instance_id
     and sca.church_year_id = cm.church_year_id
     and sca.is_active = true
    join public.church_years cy on cy.id = cm.church_year_id and cy.is_active = true
    where cm.student_id = new.student_id and cm.status = 'active'
  loop
    perform private.enqueue_notification(
      v_teacher.servant_id, 'progress',
      'A student completed a lesson', 'أحد التلاميذ أكمل درسًا',
      coalesce(v_student_name, 'A student') || ' completed ' || coalesce(v_lesson_title, 'a lesson') || '.',
      coalesce(v_student_name, 'أحد التلاميذ') || ' أكمل ' || coalesce(v_lesson_title, 'درسًا') || '.',
      'class-lesson-completed:' || new.student_id::text || ':' || new.lesson_id::text,
      'home',
      jsonb_build_object('studentId', new.student_id, 'lessonId', new.lesson_id)
    );
  end loop;

  select count(*)::integer into v_completed_count
  from public.lesson_progress lp
  where lp.student_id = new.student_id and lp.completed is true;

  if v_completed_count in (5, 10, 20, 30, 50) then
    perform private.enqueue_notification(
      new.student_id, 'achievement',
      'A learning milestone unlocked!', 'حققت إنجازًا جديدًا!',
      'You have completed ' || v_completed_count::text || ' lessons. Every step counts!',
      'أكملت ' || v_completed_count::text || ' دروس. كل خطوة بتفرق!',
      'lesson-milestone:' || v_completed_count::text,
      'points',
      jsonb_build_object('completedLessons', v_completed_count)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists notifications_after_lesson_completion on public.lesson_progress;
create trigger notifications_after_lesson_completion
  after insert or update on public.lesson_progress
  for each row execute function private.notify_lesson_completion();

create or replace function private.notify_leaderboard_overtake()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_peer record;
begin
  if new.points is not distinct from old.points then return new; end if;
  if coalesce(new.role, '') <> 'student' then return new; end if;

  for v_peer in
    select distinct peer.id, peer.name, cm.class_instance_id
    from public.class_memberships mine
    join public.church_years cy on cy.id = mine.church_year_id and cy.is_active = true
    join public.class_memberships peer_membership
      on peer_membership.class_instance_id = mine.class_instance_id
     and peer_membership.church_year_id = mine.church_year_id
     and peer_membership.status = 'active'
    join public.profiles peer on peer.id = peer_membership.student_id
    where mine.student_id = new.id
      and mine.status = 'active'
      and peer.id <> new.id
      and peer.role = 'student'
      and coalesce(old.points,0) >= coalesce(peer.points,0)
      and coalesce(new.points,0) < coalesce(peer.points,0)
  loop
    perform private.enqueue_notification(
      new.id, 'leaderboard',
      'Someone moved ahead of you!', 'حد سبقك في الترتيب!',
      coalesce(v_peer.name, 'A classmate') || ' has moved ahead in your class leaderboard. Your next step is waiting!',
      coalesce(v_peer.name, 'زميلك') || ' تقدم في ترتيب الفصل. خطوتك الجاية مستنياك!',
      'overtaken:' || v_peer.id::text || ':' || current_date::text,
      'points',
      jsonb_build_object('newRankAheadUserId', v_peer.id, 'classInstanceId', v_peer.class_instance_id)
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists notifications_after_points_change on public.profiles;
create trigger notifications_after_points_change
  after update of points on public.profiles
  for each row execute function private.notify_leaderboard_overtake();

-- Realtime lets an open notification centre update without polling.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public' and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
