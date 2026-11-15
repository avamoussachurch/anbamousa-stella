create or replace function private.notify_leaderboard_overtake()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare v_peer record; v_cairo_date date := (now() at time zone 'Africa/Cairo')::date;
begin
  if new.points is not distinct from old.points or coalesce(new.role,'') <> 'student' then return new; end if;
  for v_peer in
    select distinct peer.id,peer.name,cm.class_instance_id from public.class_memberships mine
    join public.church_years cy on cy.id=mine.church_year_id and cy.is_active=true
    join public.class_memberships peer_membership on peer_membership.class_instance_id=mine.class_instance_id
      and peer_membership.church_year_id=mine.church_year_id and peer_membership.status='active'
    join public.profiles peer on peer.id=peer_membership.student_id
    where mine.student_id=new.id and mine.status='active' and peer.id<>new.id and peer.role='student'
      and coalesce(old.points,0)>=coalesce(peer.points,0) and coalesce(new.points,0)<coalesce(peer.points,0)
  loop
    perform private.enqueue_notification(new.id,'leaderboard','Someone moved ahead of you!','حد سبقك في الترتيب!',
      coalesce(v_peer.name,'A classmate')||' has moved ahead in your class leaderboard. Your next step is waiting!',
      coalesce(v_peer.name,'زميلك')||' تقدم في ترتيب الفصل. خطوتك الجاية مستنياك!',
      'overtaken-alltime:'||v_peer.id::text||':'||v_cairo_date::text,'points',
      jsonb_build_object('newRankAheadUserId',v_peer.id,'classInstanceId',v_peer.class_instance_id,'timeframe','all_time'));
  end loop;
  return new;
end; $$;

create or replace function private.notify_weekly_leaderboard_overtake()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare
  v_week_start date;
  v_today date := (now() at time zone 'Africa/Cairo')::date;
  v_after_points integer;
  v_delta integer;
  v_before_points integer;
  v_peer record;
  v_peer_points integer;
begin
  if new.completed is not true or new.completed_at is null then return new; end if;
  v_week_start := v_today - extract(dow from (now() at time zone 'Africa/Cairo'))::integer;
  if (new.completed_at at time zone 'Africa/Cairo')::date < v_week_start then return new; end if;
  if tg_op='UPDATE' and old.completed is true
     and old.points_earned is not distinct from new.points_earned
     and old.completed_at is not distinct from new.completed_at then return new; end if;
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
    where mine.student_id=new.student_id and mine.status='active' and peer.id<>new.student_id and peer.role='student'
  loop
    select coalesce(sum(lp.points_earned),0)::integer into v_peer_points
    from public.lesson_progress lp
    where lp.student_id=v_peer.id and lp.completed is true and lp.completed_at is not null
      and (lp.completed_at at time zone 'Africa/Cairo')::date >= v_week_start;
    if v_before_points >= v_peer_points and v_after_points < v_peer_points then
      perform private.enqueue_notification(new.student_id,'leaderboard','A classmate moved ahead this week','زميلك تقدم عليك هذا الأسبوع',
        coalesce(v_peer.name,'A classmate')||' moved ahead in this week’s points ranking. Your next small step can change the picture!',
        coalesce(v_peer.name,'زميلك')||' تقدم في ترتيب نقاط الأسبوع. خطوة صغيرة منك ممكن تغيّر الترتيب!',
        'overtaken-weekly:'||v_peer.id::text||':'||v_today::text,'points',
        jsonb_build_object('newRankAheadUserId',v_peer.id,'classInstanceId',v_peer.class_instance_id,'timeframe','weekly'));
    end if;
  end loop;
  return new;
end; $$;
