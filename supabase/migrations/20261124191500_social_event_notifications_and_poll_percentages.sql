-- Correct multi-select poll percentages and enqueue targeted event notifications.
begin;

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
  select count(*) into v_total from public.feed_poll_votes where poll_id = p_poll_id;
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

create or replace function private.notify_targeted_community_event()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_event public.community_events%rowtype;
  v_recipient record;
begin
  select * into v_event from public.community_events where id = new.event_id;
  if not found or v_event.status <> 'published' then return new; end if;

  for v_recipient in
    select distinct p.id
    from public.profiles p
    where p.id <> v_event.created_by
      and (
        new.audience_type = 'everyone'
        or (new.audience_type = 'role' and exists (
          select 1 from public.profile_role_assignments ra
          where ra.user_id = p.id and ra.revoked_at is null and ra.role = new.audience_value
        ))
        or (new.audience_type = 'grade' and p.grade = new.audience_value)
        or (new.audience_type = 'class_group' and exists (
          select 1 from public.class_memberships cm
          join public.class_instances ci on ci.id = cm.class_instance_id
          where cm.student_id = p.id and cm.status = 'active'
            and ci.class_group_id = new.audience_value
        ))
        or (new.audience_type = 'class_instance' and exists (
          select 1 from public.class_memberships cm
          where cm.student_id = p.id and cm.status = 'active'
            and cm.class_instance_id = new.audience_value
        ))
      )
  loop
    perform private.enqueue_notification(
      v_recipient.id, 'event',
      'A new community event was posted', 'تم نشر فعالية مجتمعية جديدة',
      v_event.title,
      v_event.title,
      'community-event:' || v_event.id::text || ':' || v_recipient.id::text,
      'calendar',
      jsonb_build_object('eventId', v_event.id, 'startsAt', v_event.starts_at)
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists community_event_audience_notify on public.community_event_audiences;
create trigger community_event_audience_notify
  after insert or update on public.community_event_audiences
  for each row execute function private.notify_targeted_community_event();

commit;
