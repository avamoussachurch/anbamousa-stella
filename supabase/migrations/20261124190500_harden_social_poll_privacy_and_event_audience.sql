-- Tighten social poll privacy and provide a scoped event-audience setter.
begin;

-- Votes are intentionally not directly readable/writable. This prevents anonymous-poll
-- voter identity leaks and bypasses of single-choice / close-time validation.
revoke select, insert, delete on public.feed_poll_votes from authenticated;

create or replace function public.get_feed_poll_results(p_poll_id uuid)
returns table(option_id uuid, option_text text, vote_count bigint, percentage numeric)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_poll public.feed_polls%rowtype;
  v_total bigint;
  v_has_voted boolean;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  select * into v_poll from public.feed_polls where id = p_poll_id;
  if not found or not public.can_view_feed_post(v_poll.post_id) then
    raise exception 'POLL_NOT_VISIBLE' using errcode = '42501';
  end if;
  select exists(select 1 from public.feed_poll_votes v where v.poll_id = p_poll_id and v.voter_id = auth.uid())
    into v_has_voted;
  if not v_poll.show_results_before_vote and not v_has_voted then
    raise exception 'VOTE_BEFORE_RESULTS' using errcode = '42501';
  end if;
  select count(distinct voter_id) into v_total from public.feed_poll_votes where poll_id = p_poll_id;
  return query
    select o.id, o.option_text, count(v.id),
      case when v_total = 0 then 0::numeric
        else round((count(v.id)::numeric / v_total::numeric) * 100, 1) end
    from public.feed_poll_options o
    left join public.feed_poll_votes v on v.option_id = o.id and v.poll_id = p_poll_id
    where o.poll_id = p_poll_id
    group by o.id, o.option_text, o.position
    order by o.position;
end;
$$;
revoke all on function public.get_feed_poll_results(uuid) from public, anon;
grant execute on function public.get_feed_poll_results(uuid) to authenticated;

-- Enforce one vote operation per authenticated actor through the atomic RPC only.
-- Existing cast_feed_poll_vote uses SECURITY DEFINER and remains the only write path.
revoke insert, delete on public.feed_poll_votes from authenticated;

create or replace function public.set_community_event_audience(
  p_event_id uuid,
  p_audience_type text,
  p_audience_value text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_allowed boolean := false;
  v_role text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if not exists(select 1 from public.community_events e where e.id = p_event_id and e.created_by = auth.uid()) then
    raise exception 'EVENT_NOT_OWNED' using errcode = '42501';
  end if;
  if p_audience_type not in ('everyone','role','grade','class_group','class_instance') then
    raise exception 'INVALID_AUDIENCE' using errcode = '22023';
  end if;
  select p.role into v_role from public.profiles p where p.id = auth.uid();

  if p_audience_type = 'everyone' then
    v_allowed := v_role in ('teacher','admin');
  elsif p_audience_type = 'role' then
    v_allowed := v_role in ('teacher','admin') and p_audience_value in ('student','parent','teacher');
  elsif p_audience_type = 'grade' then
    v_allowed := v_role = 'admin' or (
      v_role = 'teacher' and exists (
        select 1 from public.profiles p where p.id = auth.uid() and p.grade = p_audience_value
      )
    );
  elsif p_audience_type = 'class_group' then
    v_allowed := v_role = 'admin' or exists (
      select 1 from public.church_class_instances ci
      where ci.class_group_id::text = p_audience_value and auth.uid() = any(ci.servant_ids)
    );
  elsif p_audience_type = 'class_instance' then
    v_allowed := v_role = 'admin' or exists (
      select 1 from public.church_class_instances ci
      where ci.id::text = p_audience_value and auth.uid() = any(ci.servant_ids)
    );
  end if;
  if not v_allowed then raise exception 'EVENT_AUDIENCE_NOT_AUTHORIZED' using errcode = '42501'; end if;

  insert into public.community_event_audiences(event_id, audience_type, audience_value)
  values (p_event_id, p_audience_type, case when p_audience_type = 'everyone' then null else p_audience_value end)
  on conflict (event_id) do update set audience_type = excluded.audience_type, audience_value = excluded.audience_value;
  return jsonb_build_object('success', true);
end;
$$;
revoke all on function public.set_community_event_audience(uuid,text,text) from public, anon;
grant execute on function public.set_community_event_audience(uuid,text,text) to authenticated;

-- Event publishing is staff-only; students can still create regular community posts.
drop policy if exists community_events_author_insert on public.community_events;
create policy community_events_author_insert on public.community_events for insert to authenticated
  with check (created_by = auth.uid() and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('teacher','admin')
  ));

commit;
