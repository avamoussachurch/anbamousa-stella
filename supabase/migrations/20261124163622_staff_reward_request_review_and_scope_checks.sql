create or replace function public.mark_reward_request_fulfilled(p_request_id uuid,p_note text default null)
returns public.reward_requests language plpgsql security definer set search_path='' as $$
declare v_request public.reward_requests%rowtype; v_actor uuid:=(select auth.uid());
begin
 if v_actor is null or not(public.has_role('teacher') or public.is_church_admin()) then raise exception 'STAFF_REQUIRED' using errcode='42501'; end if;
 if p_note is not null and char_length(p_note)>500 then raise exception 'FULFILLMENT_NOTE_TOO_LONG' using errcode='22023'; end if;
 select rr.* into v_request from public.reward_requests rr where rr.id=p_request_id for update;
 if not found or v_request.status<>'approved' or v_request.fulfilled_at is not null then raise exception 'APPROVED_UNFULFILLED_REQUEST_NOT_FOUND' using errcode='P0002'; end if;
 if not public.is_church_admin() and not(public.has_role('teacher') and public.can_access_student_data(v_request.student_id)) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 update public.reward_requests set fulfilled_at=now(),fulfilled_by=v_actor,fulfillment_note=nullif(pg_catalog.btrim(p_note),'') where id=p_request_id returning * into v_request;
 return v_request;
end; $$;
revoke all on function public.mark_reward_request_fulfilled(uuid,text) from public,anon;
grant execute on function public.mark_reward_request_fulfilled(uuid,text) to authenticated;

create or replace function public.review_staff_reward_request(p_request_id uuid,p_decision text)
returns public.reward_requests language plpgsql security definer set search_path='' as $$
declare v_request public.reward_requests%rowtype; v_actor uuid:=(select auth.uid());
begin
 if v_actor is null or not(public.has_role('teacher') or public.is_church_admin()) then raise exception 'STAFF_REQUIRED' using errcode='42501'; end if;
 if p_decision not in ('approved','rejected') then raise exception 'INVALID_DECISION' using errcode='22023'; end if;
 select rr.* into v_request from public.reward_requests rr where rr.id=p_request_id for update;
 if not found or v_request.status<>'pending' then raise exception 'PENDING_REWARD_REQUEST_NOT_FOUND' using errcode='P0002'; end if;
 if not public.is_church_admin() and not(public.has_role('teacher') and public.can_access_student_data(v_request.student_id)) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if p_decision='approved' then
  update public.profiles set points=coalesce(points,0)-v_request.cost_points where id=v_request.student_id and coalesce(points,0)>=v_request.cost_points;
  if not found then raise exception 'INSUFFICIENT_POINTS' using errcode='23514'; end if;
 end if;
 update public.reward_requests set status=p_decision,parent_id=null,decided_at=now() where id=p_request_id returning * into v_request;
 return v_request;
end; $$;
revoke all on function public.review_staff_reward_request(uuid,text) from public,anon;
grant execute on function public.review_staff_reward_request(uuid,text) to authenticated;

create or replace function public.decrement_reward_catalog_stock()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_catalog_id uuid; v_stock integer;
begin
 if new.status='approved' and coalesce(old.status,'')<>'approved' then
  select c.id,c.stock_remaining into v_catalog_id,v_stock from public.reward_catalog c where c.id::text=new.reward_id for update;
  if v_catalog_id is not null and v_stock is not null then
   if v_stock<=0 then raise exception 'REWARD_OUT_OF_STOCK'; end if;
   update public.reward_catalog set stock_remaining=stock_remaining-1,updated_at=now() where id=v_catalog_id;
  end if;
 end if;
 return new;
end; $$;
revoke all on function public.decrement_reward_catalog_stock() from public,anon,authenticated;
