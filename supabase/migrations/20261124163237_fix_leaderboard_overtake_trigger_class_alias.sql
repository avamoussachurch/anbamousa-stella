create or replace function private.notify_leaderboard_overtake()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public','private'
as $function$
declare
  v_peer record;
  v_cairo_date date := (now() at time zone 'Africa/Cairo')::date;
begin
  if new.points is not distinct from old.points or coalesce(new.role,'') <> 'student' then return new; end if;
  for v_peer in
    select distinct peer.id,peer.name,mine.class_instance_id
    from public.class_memberships mine
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
end; $function$;
