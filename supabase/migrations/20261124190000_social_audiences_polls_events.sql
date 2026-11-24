-- Social foundation: audience-scoped feed posts, native polls, and community events.
-- Additive only. Apply in staging first; no existing feed or church-event rows are rewritten.

begin;

create table if not exists public.feed_post_audiences (
  id uuid primary key default gen_random_uuid(),
  post_id text not null unique references public.feed_posts(id) on delete cascade,
  audience_type text not null check (audience_type in ('everyone','role','grade','class_group','class_instance')),
  audience_value text,
  created_at timestamptz not null default now(),
  constraint feed_post_audiences_value_check check (
    (audience_type = 'everyone' and audience_value is null)
    or (audience_type <> 'everyone' and audience_value is not null and length(trim(audience_value)) between 1 and 120)
  )
);
create index if not exists feed_post_audiences_target_idx
  on public.feed_post_audiences (audience_type, audience_value);

create or replace function public.can_view_feed_post(p_post_id text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select
    exists (select 1 from public.feed_posts p where p.id = p_post_id and p.author_id = (select auth.uid()))
    or not exists (select 1 from public.feed_post_audiences a where a.post_id = p_post_id)
    or exists (
      select 1
      from public.feed_post_audiences a
      join public.profiles me on me.id = (select auth.uid())
      where a.post_id = p_post_id
        and (
          a.audience_type = 'everyone'
          or (a.audience_type = 'role' and me.role = a.audience_value)
          or (a.audience_type = 'grade' and me.grade = a.audience_value)
          or (a.audience_type = 'class_group' and exists (
            select 1 from public.class_memberships cm
            where cm.student_id = me.id
              and lower(cm.status) = 'active'
              and cm.class_group_id::text = a.audience_value
          ))
          or (a.audience_type = 'class_instance' and exists (
            select 1 from public.class_memberships cm
            where cm.student_id = me.id
              and lower(cm.status) = 'active'
              and cm.class_instance_id::text = a.audience_value
          ))
        )
    );
$$;
revoke all on function public.can_view_feed_post(text) from public, anon;
grant execute on function public.can_view_feed_post(text) to authenticated;

-- Replace the original broad authenticated SELECT policy with audience-aware access.
drop policy if exists "Authenticated users view feed posts" on public.feed_posts;
create policy "Authenticated users view feed posts"
  on public.feed_posts for select to authenticated
  using (public.can_view_feed_post(id));

drop policy if exists "Authenticated users view feed comments" on public.feed_comments;
create policy "Authenticated users view feed comments"
  on public.feed_comments for select to authenticated
  using (public.can_view_feed_post(post_id));

drop policy if exists "Authenticated users view feed reactions" on public.feed_reactions;
create policy "Authenticated users view feed reactions"
  on public.feed_reactions for select to authenticated
  using (
    (post_id is not null and public.can_view_feed_post(post_id))
    or (comment_id is not null and exists (
      select 1 from public.feed_comments c
      where c.id = comment_id and public.can_view_feed_post(c.post_id)
    ))
  );

alter table public.feed_post_audiences enable row level security;
revoke all on public.feed_post_audiences from public, anon, authenticated;
grant select on public.feed_post_audiences to authenticated;
create policy feed_post_audiences_visible
  on public.feed_post_audiences for select to authenticated
  using (public.can_view_feed_post(post_id));

create or replace function public.set_feed_post_audience(
  p_post_id text,
  p_audience_type text,
  p_audience_value text default null
) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_author uuid;
  v_role text;
  v_allowed boolean := false;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  select p.author_id into v_author from public.feed_posts p where p.id = p_post_id;
  if v_author is null then raise exception 'POST_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_author <> auth.uid() then raise exception 'NOT_POST_AUTHOR' using errcode = '42501'; end if;
  select p.role into v_role from public.profiles p where p.id = auth.uid();

  if p_audience_type not in ('everyone','role','grade','class_group','class_instance') then
    raise exception 'INVALID_AUDIENCE' using errcode = '22023';
  end if;
  if p_audience_type = 'everyone' then
    v_allowed := true;
  elsif p_audience_type = 'role' then
    v_allowed := p_audience_value in ('student','parent','teacher');
  elsif p_audience_type = 'grade' then
    v_allowed := exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.grade = p_audience_value
    ) or v_role = 'admin';
  elsif p_audience_type = 'class_group' then
    v_allowed := exists (
      select 1 from public.class_memberships cm
      where cm.student_id = auth.uid() and lower(cm.status) = 'active'
        and cm.class_group_id::text = p_audience_value
    ) or exists (
      select 1 from public.church_class_instances ci
      where ci.class_group_id::text = p_audience_value
        and auth.uid() = any(ci.servant_ids)
    ) or v_role = 'admin';
  elsif p_audience_type = 'class_instance' then
    v_allowed := exists (
      select 1 from public.class_memberships cm
      where cm.student_id = auth.uid() and lower(cm.status) = 'active'
        and cm.class_instance_id::text = p_audience_value
    ) or exists (
      select 1 from public.church_class_instances ci
      where ci.id::text = p_audience_value and auth.uid() = any(ci.servant_ids)
    ) or v_role = 'admin';
  end if;
  if not v_allowed then raise exception 'AUDIENCE_NOT_AUTHORIZED' using errcode = '42501'; end if;

  insert into public.feed_post_audiences(post_id, audience_type, audience_value)
  values (p_post_id, p_audience_type, case when p_audience_type = 'everyone' then null else p_audience_value end)
  on conflict (post_id) do update set
    audience_type = excluded.audience_type,
    audience_value = excluded.audience_value;
  return jsonb_build_object('success', true);
end;
$$;
revoke all on function public.set_feed_post_audience(text,text,text) from public, anon;
grant execute on function public.set_feed_post_audience(text,text,text) to authenticated;

create table if not exists public.feed_polls (
  id uuid primary key default gen_random_uuid(),
  post_id text not null unique references public.feed_posts(id) on delete cascade,
  question text not null check (char_length(trim(question)) between 3 and 500),
  allow_multiple boolean not null default false,
  is_anonymous boolean not null default false,
  show_results_before_vote boolean not null default false,
  closes_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.feed_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.feed_polls(id) on delete cascade,
  option_text text not null check (char_length(trim(option_text)) between 1 and 180),
  position smallint not null check (position between 0 and 9),
  created_at timestamptz not null default now(),
  unique (poll_id, position),
  unique (id, poll_id)
);
create table if not exists public.feed_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.feed_polls(id) on delete cascade,
  option_id uuid not null,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint feed_poll_votes_option_fk foreign key (option_id, poll_id)
    references public.feed_poll_options(id, poll_id) on delete cascade,
  unique (poll_id, option_id, voter_id)
);
create index if not exists feed_poll_votes_poll_idx on public.feed_poll_votes(poll_id);
create index if not exists feed_poll_options_order_idx on public.feed_poll_options(poll_id, position);

alter table public.feed_polls enable row level security;
alter table public.feed_poll_options enable row level security;
alter table public.feed_poll_votes enable row level security;
revoke all on public.feed_polls, public.feed_poll_options, public.feed_poll_votes from public, anon;
grant select, insert, update, delete on public.feed_polls to authenticated;
grant select, insert, update, delete on public.feed_poll_options to authenticated;
grant select, insert, delete on public.feed_poll_votes to authenticated;

create policy feed_polls_visible on public.feed_polls for select to authenticated
  using (public.can_view_feed_post(post_id));
create policy feed_polls_author_insert on public.feed_polls for insert to authenticated
  with check (created_by = auth.uid() and exists (
    select 1 from public.feed_posts p where p.id = post_id and p.author_id = auth.uid()
  ));
create policy feed_polls_author_update on public.feed_polls for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy feed_polls_author_delete on public.feed_polls for delete to authenticated
  using (created_by = auth.uid());

create policy feed_poll_options_visible on public.feed_poll_options for select to authenticated
  using (exists (select 1 from public.feed_polls p where p.id = poll_id and public.can_view_feed_post(p.post_id)));
create policy feed_poll_options_author_insert on public.feed_poll_options for insert to authenticated
  with check (exists (select 1 from public.feed_polls p where p.id = poll_id and p.created_by = auth.uid()));
create policy feed_poll_options_author_update on public.feed_poll_options for update to authenticated
  using (exists (select 1 from public.feed_polls p where p.id = poll_id and p.created_by = auth.uid()))
  with check (exists (select 1 from public.feed_polls p where p.id = poll_id and p.created_by = auth.uid()));
create policy feed_poll_options_author_delete on public.feed_poll_options for delete to authenticated
  using (exists (select 1 from public.feed_polls p where p.id = poll_id and p.created_by = auth.uid()));

create policy feed_poll_votes_visible on public.feed_poll_votes for select to authenticated
  using (exists (select 1 from public.feed_polls p where p.id = poll_id and public.can_view_feed_post(p.post_id)));
create policy feed_poll_votes_own_insert on public.feed_poll_votes for insert to authenticated
  with check (voter_id = auth.uid() and exists (
    select 1 from public.feed_polls p
    where p.id = poll_id and public.can_view_feed_post(p.post_id)
      and (p.closes_at is null or p.closes_at > now())
  ));
create policy feed_poll_votes_own_delete on public.feed_poll_votes for delete to authenticated
  using (voter_id = auth.uid());

-- Atomic voting validates poll state and single/multiple choice rules server-side.
create or replace function public.cast_feed_poll_vote(p_poll_id uuid, p_option_ids uuid[])
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_poll public.feed_polls%rowtype;
  v_count integer;
  v_distinct integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  select * into v_poll from public.feed_polls where id = p_poll_id for update;
  if not found then raise exception 'POLL_NOT_FOUND' using errcode = 'P0002'; end if;
  if not public.can_view_feed_post(v_poll.post_id) then raise exception 'POLL_NOT_VISIBLE' using errcode = '42501'; end if;
  if v_poll.closes_at is not null and v_poll.closes_at <= now() then raise exception 'POLL_CLOSED' using errcode = '22023'; end if;
  if p_option_ids is null or cardinality(p_option_ids) < 1 or cardinality(p_option_ids) > 10 then
    raise exception 'INVALID_VOTE' using errcode = '22023';
  end if;
  select count(distinct x), count(*) into v_distinct, v_count from unnest(p_option_ids) x;
  if v_distinct <> v_count then raise exception 'DUPLICATE_OPTIONS' using errcode = '22023'; end if;
  if not v_poll.allow_multiple and v_count <> 1 then raise exception 'SINGLE_CHOICE_ONLY' using errcode = '22023'; end if;
  if exists (
    select 1 from unnest(p_option_ids) x
    where not exists (select 1 from public.feed_poll_options o where o.id = x and o.poll_id = p_poll_id)
  ) then raise exception 'INVALID_POLL_OPTION' using errcode = '22023'; end if;

  delete from public.feed_poll_votes where poll_id = p_poll_id and voter_id = auth.uid();
  insert into public.feed_poll_votes(poll_id, option_id, voter_id)
  select p_poll_id, x, auth.uid() from unnest(p_option_ids) x;
  return jsonb_build_object('success', true, 'votes', v_count);
end;
$$;
revoke all on function public.cast_feed_poll_vote(uuid,uuid[]) from public, anon;
grant execute on function public.cast_feed_poll_vote(uuid,uuid[]) to authenticated;

create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 180),
  description text not null default '' check (char_length(description) <= 5000),
  category text not null default 'community' check (category in ('liturgy','sunday_school','family','hymn','community','service')),
  location text,
  cover_image_url text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'published' check (status in ('draft','published','cancelled','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_events_time_check check (ends_at is null or ends_at > starts_at)
);
create table if not exists public.community_event_audiences (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.community_events(id) on delete cascade,
  audience_type text not null check (audience_type in ('everyone','role','grade','class_group','class_instance')),
  audience_value text,
  constraint community_event_audiences_value_check check (
    (audience_type = 'everyone' and audience_value is null)
    or (audience_type <> 'everyone' and audience_value is not null)
  )
);
create table if not exists public.community_event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.community_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  response text not null check (response in ('going','maybe','not_going')),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index if not exists community_events_start_idx on public.community_events(status, starts_at);
create index if not exists community_event_rsvps_event_idx on public.community_event_rsvps(event_id, response);

create or replace function public.can_view_community_event(p_event_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.community_events e
    where e.id = p_event_id and e.status = 'published'
      and (
        e.created_by = (select auth.uid())
        or not exists (select 1 from public.community_event_audiences a where a.event_id = e.id)
        or exists (
          select 1 from public.community_event_audiences a
          join public.profiles me on me.id = (select auth.uid())
          where a.event_id = e.id and (
            a.audience_type = 'everyone'
            or (a.audience_type = 'role' and me.role = a.audience_value)
            or (a.audience_type = 'grade' and me.grade = a.audience_value)
            or (a.audience_type = 'class_group' and exists (
              select 1 from public.class_memberships cm where cm.student_id = me.id
                and lower(cm.status) = 'active' and cm.class_group_id::text = a.audience_value
            ))
            or (a.audience_type = 'class_instance' and exists (
              select 1 from public.class_memberships cm where cm.student_id = me.id
                and lower(cm.status) = 'active' and cm.class_instance_id::text = a.audience_value
            ))
          )
        )
      )
  );
$$;
revoke all on function public.can_view_community_event(uuid) from public, anon;
grant execute on function public.can_view_community_event(uuid) to authenticated;

alter table public.community_events enable row level security;
alter table public.community_event_audiences enable row level security;
alter table public.community_event_rsvps enable row level security;
revoke all on public.community_events, public.community_event_audiences, public.community_event_rsvps from public, anon;
grant select, insert, update, delete on public.community_events to authenticated;
grant select on public.community_event_audiences to authenticated;
grant select, insert, update, delete on public.community_event_rsvps to authenticated;

create policy community_events_visible on public.community_events for select to authenticated
  using (public.can_view_community_event(id));
create policy community_events_author_insert on public.community_events for insert to authenticated
  with check (created_by = auth.uid() and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('student','teacher','admin')
  ));
create policy community_events_author_update on public.community_events for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy community_events_author_delete on public.community_events for delete to authenticated
  using (created_by = auth.uid() or public.is_church_servant_or_admin());

create policy community_event_audiences_visible on public.community_event_audiences for select to authenticated
  using (public.can_view_community_event(event_id));
create policy community_event_rsvps_visible on public.community_event_rsvps for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.community_events e where e.id = event_id and e.created_by = auth.uid())
    or public.is_church_servant_or_admin()
  );
create policy community_event_rsvps_own_insert on public.community_event_rsvps for insert to authenticated
  with check (user_id = auth.uid() and public.can_view_community_event(event_id));
create policy community_event_rsvps_own_update on public.community_event_rsvps for update to authenticated
  using (user_id = auth.uid() and public.can_view_community_event(event_id))
  with check (user_id = auth.uid() and public.can_view_community_event(event_id));
create policy community_event_rsvps_own_delete on public.community_event_rsvps for delete to authenticated
  using (user_id = auth.uid());

commit;
