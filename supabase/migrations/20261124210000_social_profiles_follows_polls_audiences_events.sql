-- Anba Mousa social foundation: safe directory, follows, polls, and optional feed audiences.
-- This migration is intentionally committed to the feature branch only; it is not applied to production.

alter table public.feed_posts
  add column if not exists audience_mode text not null default 'everyone';

do $$ begin
  alter table public.feed_posts add constraint feed_posts_audience_mode_check
    check (audience_mode in ('everyone','classes','grades'));
exception when duplicate_object then null; end $$;

create table if not exists public.profile_follows (
  follower_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint profile_follows_no_self check (follower_id <> followed_id)
);
alter table public.profile_follows enable row level security;
drop policy if exists profile_follows_read_authenticated on public.profile_follows;
create policy profile_follows_read_authenticated on public.profile_follows
  for select to authenticated using (true);
drop policy if exists profile_follows_insert_self on public.profile_follows;
create policy profile_follows_insert_self on public.profile_follows
  for insert to authenticated with check (follower_id = auth.uid());
drop policy if exists profile_follows_delete_self on public.profile_follows;
create policy profile_follows_delete_self on public.profile_follows
  for delete to authenticated using (follower_id = auth.uid());

create or replace function public.get_profile_directory(p_search text default null)
returns table (
  user_id uuid,
  display_name text,
  role text,
  avatar_url text,
  points integer,
  current_streak integer,
  longest_streak integer,
  followers_count bigint,
  following_count bigint,
  is_following boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.name, p.role, p.avatar,
         coalesce(p.points,0), coalesce(p.current_streak,0), coalesce(p.longest_streak,0),
         (select count(*) from public.profile_follows f where f.followed_id=p.id),
         (select count(*) from public.profile_follows f where f.follower_id=p.id),
         exists(select 1 from public.profile_follows f where f.follower_id=auth.uid() and f.followed_id=p.id)
  from public.profiles p
  where auth.uid() is not null
    and (p_search is null or btrim(p_search)='' or p.name ilike '%' || left(btrim(p_search),60) || '%')
  order by p.name
  limit 100;
$$;
revoke all on function public.get_profile_directory(text) from public;
grant execute on function public.get_profile_directory(text) to authenticated;

create table if not exists public.feed_post_class_targets (
  post_id text not null references public.feed_posts(id) on delete cascade,
  class_instance_id text not null references public.class_instances(id) on delete cascade,
  primary key (post_id,class_instance_id)
);
create table if not exists public.feed_post_grade_targets (
  post_id text not null references public.feed_posts(id) on delete cascade,
  grade text not null,
  primary key (post_id,grade)
);
alter table public.feed_post_class_targets enable row level security;
alter table public.feed_post_grade_targets enable row level security;

create or replace function public.can_view_feed_post(p_post_id text)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.feed_posts p
    where p.id=p_post_id and p.is_hidden=false
      and (
        p.audience_mode='everyone'
        or p.author_id=auth.uid()
        or has_role('admin')
        or (
          p.audience_mode='classes' and (
            exists (
              select 1 from public.feed_post_class_targets t
              join public.class_memberships m on m.class_instance_id=t.class_instance_id
              where t.post_id=p.id and m.student_id=auth.uid() and m.status='active'
            )
            or exists (
              select 1 from public.feed_post_class_targets t
              join public.servant_class_assignments a on a.class_instance_id=t.class_instance_id
              where t.post_id=p.id and a.servant_id=auth.uid() and a.is_active=true
            )
          )
        )
        or (
          p.audience_mode='grades' and exists (
            select 1 from public.feed_post_grade_targets t
            join public.profiles viewer on viewer.id=auth.uid()
            where t.post_id=p.id and t.grade=viewer.grade
          )
        )
      )
  );
$$;
revoke all on function public.can_view_feed_post(text) from public;
grant execute on function public.can_view_feed_post(text) to authenticated;

drop policy if exists "Authenticated users view feed posts" on public.feed_posts;
create policy feed_posts_audience_read on public.feed_posts
  for select to authenticated
  using (public.can_view_feed_post(id));

drop policy if exists feed_post_class_targets_read on public.feed_post_class_targets;
create policy feed_post_class_targets_read on public.feed_post_class_targets
  for select to authenticated using (public.can_view_feed_post(post_id));
drop policy if exists feed_post_grade_targets_read on public.feed_post_grade_targets;
create policy feed_post_grade_targets_read on public.feed_post_grade_targets
  for select to authenticated using (public.can_view_feed_post(post_id));

drop policy if exists feed_post_class_targets_author_write on public.feed_post_class_targets;
create policy feed_post_class_targets_author_write on public.feed_post_class_targets
  for all to authenticated
  using (exists(select 1 from public.feed_posts p where p.id=post_id and (p.author_id=auth.uid() or has_role('admin'))))
  with check (
    exists(select 1 from public.feed_posts p where p.id=post_id and (p.author_id=auth.uid() or has_role('admin')))
    and (
      has_role('admin')
      or exists(select 1 from public.servant_class_assignments a where a.class_instance_id=feed_post_class_targets.class_instance_id and a.servant_id=auth.uid() and a.is_active=true)
      or exists(select 1 from public.class_memberships m where m.class_instance_id=feed_post_class_targets.class_instance_id and m.student_id=auth.uid() and m.status='active')
    )
  );
drop policy if exists feed_post_grade_targets_author_write on public.feed_post_grade_targets;
create policy feed_post_grade_targets_author_write on public.feed_post_grade_targets
  for all to authenticated
  using (exists(select 1 from public.feed_posts p where p.id=post_id and (p.author_id=auth.uid() or has_role('admin'))))
  with check (
    exists(select 1 from public.feed_posts p where p.id=post_id and (p.author_id=auth.uid() or has_role('admin')))
    and (has_role('admin') or is_church_servant_or_admin())
  );

create table if not exists public.feed_post_polls (
  post_id text primary key references public.feed_posts(id) on delete cascade,
  question text not null check (length(btrim(question)) between 1 and 240),
  allow_multiple boolean not null default false,
  closes_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.feed_post_poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id text not null references public.feed_post_polls(post_id) on delete cascade,
  label text not null check (length(btrim(label)) between 1 and 120),
  position integer not null default 0,
  unique(post_id,position)
);
create table if not exists public.feed_post_poll_votes (
  option_id uuid not null references public.feed_post_poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(option_id,user_id)
);
alter table public.feed_post_polls enable row level security;
alter table public.feed_post_poll_options enable row level security;
alter table public.feed_post_poll_votes enable row level security;
drop policy if exists feed_poll_read on public.feed_post_polls;
create policy feed_poll_read on public.feed_post_polls for select to authenticated
  using (public.can_view_feed_post(post_id));
drop policy if exists feed_poll_options_read on public.feed_post_poll_options;
create policy feed_poll_options_read on public.feed_post_poll_options for select to authenticated
  using (public.can_view_feed_post(post_id));
drop policy if exists feed_poll_votes_read_own on public.feed_post_poll_votes;
create policy feed_poll_votes_read_own on public.feed_post_poll_votes for select to authenticated
  using (user_id=auth.uid());
drop policy if exists feed_poll_votes_insert_own on public.feed_post_poll_votes;
create policy feed_poll_votes_insert_own on public.feed_post_poll_votes for insert to authenticated
  with check (
    user_id=auth.uid()
    and exists (
      select 1 from public.feed_post_poll_options o
      join public.feed_post_polls p on p.post_id=o.post_id
      where o.id=option_id and public.can_view_feed_post(p.post_id)
        and (p.closes_at is null or p.closes_at>now())
    )
  );

create table if not exists public.church_event_rsvps (
  event_id uuid not null references public.church_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  response text not null check (response in ('attending','maybe','not_attending')),
  updated_at timestamptz not null default now(),
  primary key(event_id,user_id)
);
alter table public.church_event_rsvps enable row level security;
drop policy if exists church_event_rsvps_read_own on public.church_event_rsvps;
create policy church_event_rsvps_read_own on public.church_event_rsvps
  for select to authenticated using (user_id=auth.uid() or has_role('admin'));
drop policy if exists church_event_rsvps_write_own on public.church_event_rsvps;
create policy church_event_rsvps_write_own on public.church_event_rsvps
  for all to authenticated using (user_id=auth.uid())
  with check (user_id=auth.uid());


-- Polls are authored only by the feed-post owner. A vote is private to its voter.
drop policy if exists feed_poll_author_insert on public.feed_post_polls;
create policy feed_poll_author_insert on public.feed_post_polls
  for insert to authenticated with check (
    exists(select 1 from public.feed_posts p where p.id=post_id and p.author_id=auth.uid())
  );
drop policy if exists feed_poll_author_delete on public.feed_post_polls;
create policy feed_poll_author_delete on public.feed_post_polls
  for delete to authenticated using (
    exists(select 1 from public.feed_posts p where p.id=post_id and p.author_id=auth.uid())
  );
drop policy if exists feed_poll_options_author_insert on public.feed_post_poll_options;
create policy feed_poll_options_author_insert on public.feed_post_poll_options
  for insert to authenticated with check (
    exists(select 1 from public.feed_posts p where p.id=post_id and p.author_id=auth.uid())
  );
drop policy if exists feed_poll_options_author_delete on public.feed_post_poll_options;
create policy feed_poll_options_author_delete on public.feed_post_poll_options
  for delete to authenticated using (
    exists(select 1 from public.feed_posts p where p.id=post_id and p.author_id=auth.uid())
  );

create or replace function public.enforce_single_choice_poll_vote()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_post_id text; v_allow_multiple boolean;
begin
  select o.post_id,p.allow_multiple into v_post_id,v_allow_multiple
  from public.feed_post_poll_options o join public.feed_post_polls p on p.post_id=o.post_id
  where o.id=new.option_id;
  if v_post_id is null then raise exception 'Poll option not found'; end if;
  if not v_allow_multiple and exists (
    select 1 from public.feed_post_poll_votes old_vote
    join public.feed_post_poll_options old_option on old_option.id=old_vote.option_id
    where old_vote.user_id=new.user_id and old_option.post_id=v_post_id
  ) then raise exception 'This poll allows one answer only'; end if;
  return new;
end $$;
drop trigger if exists feed_poll_single_choice_guard on public.feed_post_poll_votes;
create trigger feed_poll_single_choice_guard before insert on public.feed_post_poll_votes
for each row execute function public.enforce_single_choice_poll_vote();


create or replace function public.get_feed_poll_results(p_post_ids text[])
returns table (
  post_id text,
  option_id uuid,
  option_label text,
  vote_count bigint,
  has_voted boolean
)
language sql stable security definer
set search_path=public,pg_temp
as $$
  select o.post_id,o.id,o.label,count(v.user_id),
         exists(select 1 from public.feed_post_poll_votes mine where mine.option_id=o.id and mine.user_id=auth.uid())
  from public.feed_post_poll_options o
  join public.feed_post_polls poll on poll.post_id=o.post_id
  left join public.feed_post_poll_votes v on v.option_id=o.id
  where auth.uid() is not null
    and o.post_id=any(coalesce(p_post_ids,'{}'::text[]))
    and public.can_view_feed_post(o.post_id)
  group by o.post_id,o.id,o.label,o.position
  order by o.post_id,o.position;
$$;
revoke all on function public.get_feed_poll_results(text[]) from public;
grant execute on function public.get_feed_poll_results(text[]) to authenticated;
