grant insert on public.achievement_events to service_role;
grant execute on function public.evaluate_student_achievements(uuid) to service_role;

create or replace function public.record_achievement_event(p_event_type text,p_source_key text,p_metadata jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_student_id uuid:=(select auth.uid()); v_date date; v_has_prayer boolean:=false; v_inserted integer; v_result jsonb;
begin
 if v_student_id is null or not public.has_role('student') then raise exception 'STUDENT_AUTHENTICATION_REQUIRED' using errcode='42501'; end if;
 if p_event_type<>'prayer_day' then raise exception 'EVENT_REQUIRES_VERIFIED_SERVER_ACTIVITY' using errcode='42501'; end if;
 if p_source_key is null or p_source_key !~ '^prayer-day:[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  or p_metadata is null or pg_catalog.jsonb_typeof(p_metadata)<>'object' or pg_catalog.pg_column_size(p_metadata)>8192 then
  raise exception 'INVALID_ACHIEVEMENT_EVENT_PAYLOAD' using errcode='22023';
 end if;
 v_date:=pg_catalog.split_part(p_source_key,':',2)::date;
 if v_date<>(now() at time zone 'Africa/Cairo')::date then raise exception 'PRAYER_DAY_MUST_BE_TODAY_IN_CAIRO' using errcode='22023'; end if;
 select exists(select 1 from public.agpeya_prayers p where p.user_id=v_student_id and p.date=v_date and (
  (pg_catalog.jsonb_typeof(p.completed_hours)='array' and pg_catalog.jsonb_array_length(p.completed_hours)>0)
  or (pg_catalog.jsonb_typeof(p.completed_hours)='object' and p.completed_hours<>'{}'::jsonb)
  or nullif(pg_catalog.btrim(p.personal_prayer),'') is not null
 )) into v_has_prayer;
 if not v_has_prayer then raise exception 'NO_SAVED_PRAYER_FOR_CAIRO_DAY' using errcode='42501'; end if;
 insert into public.achievement_events(student_id,event_type,source_key,metadata) values(v_student_id,'prayer_day',p_source_key,p_metadata)
 on conflict(student_id,source_key) do nothing;
 get diagnostics v_inserted=row_count;
 v_result:=public.evaluate_student_achievements(v_student_id);
 return v_result||pg_catalog.jsonb_build_object('duplicate',(v_inserted=0));
end; $$;
revoke all on function public.record_achievement_event(text,text,jsonb) from public,anon;
grant execute on function public.record_achievement_event(text,text,jsonb) to authenticated;

update public.achievement_badges set is_active=false
where slug in ('hymn-heart','hymn-master','taxis-practitioner','memory-keeper','class-helper');
