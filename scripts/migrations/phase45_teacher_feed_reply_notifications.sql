create or replace function private.notify_teacher_feed_reply()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare
  v_post_author uuid;
  v_post_author_name text;
  v_parent_comment_author uuid;
  v_commenter_is_staff boolean := false;
  v_parent record;
begin
  select fp.author_id,fp.author_name into v_post_author,v_post_author_name
  from public.feed_posts fp where fp.id=new.post_id;
  if v_post_author is null then return new; end if;

  select (p.role in ('teacher','admin') or exists (
    select 1 from public.profile_role_assignments pra
    where pra.user_id=new.author_id and pra.role in ('teacher','admin') and pra.revoked_at is null
  )) into v_commenter_is_staff
  from public.profiles p where p.id=new.author_id;

  if not coalesce(v_commenter_is_staff,false) then return new; end if;

  if v_post_author <> new.author_id then
    perform private.enqueue_notification(v_post_author,'announcement','A teacher replied to your post','أحد الخدام رد على منشورك',
      coalesce(new.author_name,'A teacher')||' replied: '||left(coalesce(new.content,''),180),
      coalesce(new.author_name,'أحد الخدام')||' رد: '||left(coalesce(new.content,''),180),
      'teacher-feed-reply:'||new.id,'feed',jsonb_build_object('postId',new.post_id,'commentId',new.id));
    for v_parent in select distinct ur.parent_id from public.user_relationships ur
      where ur.child_id=v_post_author and ur.verified_at is not null
        and ur.relationship_type in ('parent_child','guardian_student') loop
      perform private.enqueue_notification(v_parent.parent_id,'announcement','A teacher replied to your child','أحد الخدام رد على ابنك/بنتك',
        coalesce(new.author_name,'A teacher')||' replied to '||coalesce(v_post_author_name,'your child')||'''s post.',
        coalesce(new.author_name,'أحد الخدام')||' رد على منشور '||coalesce(v_post_author_name,'ابنك/بنتك')||'.',
        'parent-teacher-feed-reply:'||v_post_author::text||':'||new.id,'feed',
        jsonb_build_object('childId',v_post_author,'postId',new.post_id,'commentId',new.id));
    end loop;
  end if;

  if new.parent_id is not null then
    select fc.author_id into v_parent_comment_author from public.feed_comments fc where fc.id=new.parent_id;
    if v_parent_comment_author is not null and v_parent_comment_author <> new.author_id
       and v_parent_comment_author <> v_post_author then
      perform private.enqueue_notification(v_parent_comment_author,'announcement','A teacher replied to your comment','أحد الخدام رد على تعليقك',
        coalesce(new.author_name,'A teacher')||' replied to your comment.',
        coalesce(new.author_name,'أحد الخدام')||' رد على تعليقك.',
        'teacher-comment-reply:'||new.id,'feed',jsonb_build_object('postId',new.post_id,'commentId',new.id));
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists notifications_after_teacher_feed_reply on public.feed_comments;
create trigger notifications_after_teacher_feed_reply
  after insert on public.feed_comments
  for each row execute function private.notify_teacher_feed_reply();
