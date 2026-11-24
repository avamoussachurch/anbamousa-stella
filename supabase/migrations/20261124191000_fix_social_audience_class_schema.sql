-- Align audience authorization with the canonical active-year class model.
begin;

create or replace function public.can_view_feed_post(p_post_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    exists (select 1 from public.feed_posts p where p.id = p_post_id and p.author_id = (select auth.uid()))
    or not exists (select 1 from public.feed_post_audiences a where a.post_id = p_post_id)
    or exists (
      select 1 from public.feed_post_audiences a
      where a.post_id = p_post_id and (
        a.audience_type = 'everyone'
        or (a.audience_type = 'role' and exists (
          select 1 from public.profile_role_assignments ra
          where ra.user_id = (select auth.uid()) and ra.revoked_at is null and ra.role = a.audience_value
        ))
        or (a.audience_type = 'grade' and exists (
          select 1 from public.profiles p where p.id = (select auth.uid()) and p.grade = a.audience_value
        ))
        or (a.audience_type = 'class_group' and exists (
          select 1 from public.class_memberships cm
          join public.class_instances ci on ci.id = cm.class_instance_id
          where cm.student_id = (select auth.uid()) and cm.status = 'active'
            and ci.class_group_id = a.audience_value
        ))
        or (a.audience_type = 'class_instance' and exists (
          select 1 from public.class_memberships cm
          where cm.student_id = (select auth.uid()) and cm.status = 'active'
            and cm.class_instance_id = a.audience_value
        ))
      )
    );
$$;

create or replace function public.set_feed_post_audience(
  p_post_id text, p_audience_type text, p_audience_value text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_allowed boolean := false;
  v_is_admin boolean := false;
  v_is_teacher boolean := false;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if not exists(select 1 from public.feed_posts p where p.id = p_post_id and p.author_id = auth.uid()) then
    raise exception 'POST_NOT_OWNED' using errcode = '42501';
  end if;
  if p_audience_type not in ('everyone','role','grade','class_group','class_instance') then
    raise exception 'INVALID_AUDIENCE' using errcode = '22023';
  end if;
  select coalesce(bool_or(ra.role = 'admin'), false),
         coalesce(bool_or(ra.role = 'teacher'), false)
    into v_is_admin, v_is_teacher
  from public.profile_role_assignments ra
  where ra.user_id = auth.uid() and ra.revoked_at is null;

  if p_audience_type = 'everyone' then
    v_allowed := v_is_teacher or v_is_admin;
  elsif p_audience_type = 'role' then
    v_allowed := (v_is_teacher or v_is_admin) and p_audience_value in ('student','parent','teacher');
  elsif p_audience_type = 'grade' then
    v_allowed := v_is_admin or (v_is_teacher and exists (
      select 1 from public.servant_class_assignments sca
      join public.class_instances ci on ci.id = sca.class_instance_id
      join public.profiles p on p.id = auth.uid()
      where sca.servant_id = auth.uid() and sca.is_active = true
        and ci.church_year_id = sca.church_year_id
        and p.grade in (
          case ci.class_group_id
            when 'angels' then 'KG1'
            when 'primary_1' then 'Grade 1'
            when 'primary_2' then 'Grade 4'
            when 'preparatory' then 'Prep 1'
            when 'secondary' then 'Secondary 1'
            when 'university' then 'University'
            else null
          end
        )
    ));
  elsif p_audience_type = 'class_group' then
    v_allowed := v_is_admin or exists (
      select 1 from public.servant_class_assignments sca
      join public.class_instances ci on ci.id = sca.class_instance_id
      where sca.servant_id = auth.uid() and sca.is_active = true
        and sca.church_year_id = ci.church_year_id
        and ci.class_group_id = p_audience_value
    ) or exists (
      select 1 from public.class_memberships cm
      join public.class_instances ci on ci.id = cm.class_instance_id
      where cm.student_id = auth.uid() and cm.status = 'active'
        and ci.class_group_id = p_audience_value
    );
  elsif p_audience_type = 'class_instance' then
    v_allowed := v_is_admin or exists (
      select 1 from public.servant_class_assignments sca
      where sca.servant_id = auth.uid() and sca.is_active = true
        and sca.class_instance_id = p_audience_value
        and exists (select 1 from public.class_instances ci
          where ci.id = sca.class_instance_id and ci.church_year_id = sca.church_year_id)
    ) or exists (
      select 1 from public.class_memberships cm
      where cm.student_id = auth.uid() and cm.status = 'active'
        and cm.class_instance_id = p_audience_value
    );
  end if;
  if not v_allowed then raise exception 'AUDIENCE_NOT_AUTHORIZED' using errcode = '42501'; end if;
  insert into public.feed_post_audiences(post_id, audience_type, audience_value)
  values (p_post_id, p_audience_type, case when p_audience_type = 'everyone' then null else p_audience_value end)
  on conflict (post_id) do update set audience_type = excluded.audience_type, audience_value = excluded.audience_value;
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.can_view_community_event(p_event_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.community_events e
    where e.id = p_event_id and e.status = 'published'
      and (
        e.created_by = (select auth.uid())
        or not exists (select 1 from public.community_event_audiences a where a.event_id = e.id)
        or exists (
          select 1 from public.community_event_audiences a
          where a.event_id = e.id and (
            a.audience_type = 'everyone'
            or (a.audience_type = 'role' and exists (
              select 1 from public.profile_role_assignments ra
              where ra.user_id = (select auth.uid()) and ra.revoked_at is null and ra.role = a.audience_value
            ))
            or (a.audience_type = 'grade' and exists (
              select 1 from public.profiles p where p.id = (select auth.uid()) and p.grade = a.audience_value
            ))
            or (a.audience_type = 'class_group' and exists (
              select 1 from public.class_memberships cm
              join public.class_instances ci on ci.id = cm.class_instance_id
              where cm.student_id = (select auth.uid()) and cm.status = 'active'
                and ci.class_group_id = a.audience_value
            ))
            or (a.audience_type = 'class_instance' and exists (
              select 1 from public.class_memberships cm
              where cm.student_id = (select auth.uid()) and cm.status = 'active'
                and cm.class_instance_id = a.audience_value
            ))
          )
        )
      )
  );
$$;

create or replace function public.set_community_event_audience(
  p_event_id uuid, p_audience_type text, p_audience_value text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_allowed boolean := false;
  v_is_admin boolean := false;
  v_is_teacher boolean := false;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if not exists(select 1 from public.community_events e where e.id = p_event_id and e.created_by = auth.uid()) then
    raise exception 'EVENT_NOT_OWNED' using errcode = '42501';
  end if;
  if p_audience_type not in ('everyone','role','grade','class_group','class_instance') then
    raise exception 'INVALID_AUDIENCE' using errcode = '22023';
  end if;
  select coalesce(bool_or(ra.role = 'admin'), false),
         coalesce(bool_or(ra.role = 'teacher'), false)
    into v_is_admin, v_is_teacher
  from public.profile_role_assignments ra
  where ra.user_id = auth.uid() and ra.revoked_at is null;

  if p_audience_type = 'everyone' then v_allowed := v_is_teacher or v_is_admin;
  elsif p_audience_type = 'role' then v_allowed := (v_is_teacher or v_is_admin) and p_audience_value in ('student','parent','teacher');
  elsif p_audience_type = 'grade' then
    v_allowed := v_is_admin or (v_is_teacher and exists (
      select 1 from public.servant_class_assignments sca
      join public.class_instances ci on ci.id = sca.class_instance_id
      join public.profiles p on p.id = auth.uid()
      where sca.servant_id = auth.uid() and sca.is_active = true
        and ci.church_year_id = sca.church_year_id
        and p.grade = p_audience_value
    ));
  elsif p_audience_type = 'class_group' then
    v_allowed := v_is_admin or exists (
      select 1 from public.servant_class_assignments sca
      join public.class_instances ci on ci.id = sca.class_instance_id
      where sca.servant_id = auth.uid() and sca.is_active = true
        and ci.church_year_id = sca.church_year_id and ci.class_group_id = p_audience_value
    );
  elsif p_audience_type = 'class_instance' then
    v_allowed := v_is_admin or exists (
      select 1 from public.servant_class_assignments sca
      where sca.servant_id = auth.uid() and sca.is_active = true
        and sca.class_instance_id = p_audience_value
    );
  end if;
  if not v_allowed then raise exception 'EVENT_AUDIENCE_NOT_AUTHORIZED' using errcode = '42501'; end if;
  insert into public.community_event_audiences(event_id, audience_type, audience_value)
  values (p_event_id, p_audience_type, case when p_audience_type = 'everyone' then null else p_audience_value end)
  on conflict (event_id) do update set audience_type = excluded.audience_type, audience_value = excluded.audience_value;
  return jsonb_build_object('success', true);
end;
$$;

commit;
