-- Prevent broad notification fanout before audience is assigned.
-- New clients must call set_feed_post_audience for every new post, including "everyone".
begin;

drop trigger if exists notifications_after_feed_post on public.feed_posts;

create or replace function private.notify_targeted_feed_post()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_post public.feed_posts%rowtype;
  v_recipient record;
  v_excerpt text;
begin
  select * into v_post from public.feed_posts where id = new.post_id;
  if not found or coalesce(v_post.is_hidden, false) then return new; end if;
  v_excerpt := left(regexp_replace(coalesce(v_post.content, ''), '\s+', ' ', 'g'), 180);

  for v_recipient in
    select distinct p.id
    from public.profiles p
    where p.id <> v_post.author_id
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
      v_recipient.id,
      case when v_post.is_announcement then 'announcement' else 'announcement' end,
      case when v_post.is_announcement then 'New church announcement' else 'New community post' end,
      case when v_post.is_announcement then 'إعلان كنسي جديد' else 'منشور جديد في المجتمع' end,
      coalesce(v_post.author_name, 'A community member') || ': ' || v_excerpt,
      coalesce(v_post.author_name, 'أحد أفراد المجتمع') || ': ' || v_excerpt,
      'feed-post:' || v_post.id,
      'feed',
      jsonb_build_object('postId', v_post.id, 'isAnnouncement', v_post.is_announcement)
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists feed_post_audience_notify on public.feed_post_audiences;
create trigger feed_post_audience_notify
  after insert or update on public.feed_post_audiences
  for each row execute function private.notify_targeted_feed_post();

commit;
