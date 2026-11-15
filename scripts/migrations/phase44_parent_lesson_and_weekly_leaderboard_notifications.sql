-- Notify verified parents when a new lesson is published for their child.
create or replace function private.notify_published_lesson()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare v_student record; v_parent record;
begin
  if coalesce(new.status,'') <> 'published' and coalesce(new.lesson_status,'') <> 'published' then return new; end if;
  if tg_op='UPDATE' and old.active_version_id is not distinct from new.active_version_id
     and coalesce(old.status,'')=coalesce(new.status,'') and coalesce(old.lesson_status,'')=coalesce(new.lesson_status,'') then return new; end if;
  for v_student in
    select distinct p.id,p.name from public.profiles p
    left join public.class_memberships cm on cm.student_id=p.id and cm.status='active'
    where p.role='student' and (new.grade_level is null or p.grade=new.grade_level or cm.exact_grade=new.grade_level)
  loop
    perform private.enqueue_notification(v_student.id,'lesson','A new lesson is ready for you','درس جديد جاهز ليك',
      'A new Sunday School lesson has been published: '||coalesce(new.title_en,'New lesson'),
      'تم نشر درس جديد: '||coalesce(new.title_ar,new.title_en,'درس جديد'),
      'published-lesson:'||new.id::text||':'||coalesce(new.active_version_id::text,'published'),
      'lessons',jsonb_build_object('lessonId',new.id,'versionId',new.active_version_id));
    for v_parent in select distinct ur.parent_id from public.user_relationships ur
      where ur.child_id=v_student.id and ur.verified_at is not null
        and ur.relationship_type in ('parent_child','guardian_student') loop
      perform private.enqueue_notification(v_parent.parent_id,'lesson','A new lesson is ready for your child','درس جديد جاهز لابنك/بنتك',
        'A new lesson is available for '||coalesce(v_student.name,'your child')||': '||coalesce(new.title_en,'New lesson'),
        'درس جديد متاح لـ '||coalesce(v_student.name,'ابنك/بنتك')||': '||coalesce(new.title_ar,new.title_en,'درس جديد'),
        'child-published-lesson:'||v_student.id::text||':'||new.id::text||':'||coalesce(new.active_version_id::text,'published'),
        'children',jsonb_build_object('childId',v_student.id,'lessonId',new.id,'versionId',new.active_version_id));
    end loop;
  end loop;
  return new;
end; $$;

-- Weekly leaderboard uses verified lesson_progress points (Cairo Sunday reset),
-- so overtaking notifications must be driven by the same source, not lifetime profile points.
create or replace function private.notify_weekly_leaderboard_overtake()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare
  v_week_start date;
  v_after_points integer;
  v_delta integer;
  v_before_points integer;
  v_peer record;
  v_peer_points integer;
begin
  if new.completed is not true or new.completed_at is null then return new; end if;
  if (new.completed_at at time zone 'Africa/Cairo')::date < ((now() at time zone 'Africa/Cairo')::date - extract(dow from (now() at time zone 'Africa/Cairo'))::integer) then
    return new;
  end if;
  if tg_op='UPDATE' and old.completed is true
     and old.points_earned is not distinct from new.points_earned
     and old.completed_at is not distinct from new.completed_at then return new; end if;

  v_week_start := (now() at time zone 'Africa/Cairo')::date
    - extract(dow from (now() at time zone 'Africa/Cairo'))::integer;
  select coalesce(sum(lp.points_earned),0)::integer into v_after_points
  from public.lesson_progress lp
  where lp.student_id=new.student_id and lp.completed is true
    and lp.completed_at is not null
    and (lp.completed_at at time zone 'Africa/Cairo')::date >= v_week_start;

  if tg_op='INSERT' then
    v_delta := coalesce(new.points_earned,0);
  else
    v_delta := case when new.completed then coalesce(new.points_earned,0) else 0 end
      - case when old.completed then coalesce(old.points_earned,0) else 0 end;
  end if;
  v_before_points := greatest(0,v_after_points-v_delta);

  for v_peer in
    select distinct peer.id,peer.name,cm.class_instance_id
    from public.class_memberships mine
    join public.church_years cy on cy.id=mine.church_year_id and cy.is_active=true
    join public.class_memberships peer_membership on peer_membership.class_instance_id=mine.class_instance_id
      and peer_membership.church_year_id=mine.church_year_id and peer_membership.status='active'
    join public.profiles peer on peer.id=peer_membership.student_id
    where mine.student_id=new.student_id and mine.status='active'
      and peer.id<>new.student_id and peer.role='student'
  loop
    select coalesce(sum(lp.points_earned),0)::integer into v_peer_points
    from public.lesson_progress lp
    where lp.student_id=v_peer.id and lp.completed is true and lp.completed_at is not null
      and (lp.completed_at at time zone 'Africa/Cairo')::date >= v_week_start;
    if v_before_points >= v_peer_points and v_after_points < v_peer_points then
      perform private.enqueue_notification(new.student_id,'leaderboard','A classmate moved ahead this week','زميلك تقدم عليك هذا الأسبوع',
        coalesce(v_peer.name,'A classmate')||' moved ahead in this week’s points ranking. Your next small step can change the picture!',
        coalesce(v_peer.name,'زميلك')||' تقدم في ترتيب نقاط الأسبوع. خطوة صغيرة منك ممكن تغيّر الترتيب!',
        'overtaken-weekly:'||v_peer.id::text||':'||current_date::text,'points',
        jsonb_build_object('newRankAheadUserId',v_peer.id,'classInstanceId',v_peer.class_instance_id,'timeframe','weekly'));
    end if;
  end loop;
  return new;
end; $$;
drop trigger if exists notifications_after_weekly_points_change on public.lesson_progress;
create trigger notifications_after_weekly_points_change
  after insert or update on public.lesson_progress
  for each row execute function private.notify_weekly_leaderboard_overtake();
