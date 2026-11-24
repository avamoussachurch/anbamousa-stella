-- Validate every Bazaar request against the published staff catalogue.
-- Prevent forged reward IDs/prices and bypassing approval at INSERT time.

create or replace function public.validate_reward_request_catalog()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reward public.reward_catalog%rowtype;
  v_points integer;
begin
  if new.status is distinct from 'pending'
     or new.decided_at is not null
     or new.fulfilled_at is not null
     or new.fulfilled_by is not null
     or new.fulfillment_note is not null then
    raise exception 'REWARD_REQUEST_MUST_START_PENDING' using errcode = '42501';
  end if;

  if auth.uid() is not null and new.student_id is distinct from auth.uid() then
    raise exception 'REWARD_REQUEST_STUDENT_MISMATCH' using errcode = '42501';
  end if;

  select c.* into v_reward
    from public.reward_catalog c
   where c.id::text = new.reward_id
   for share;

  if not found or not v_reward.is_active then
    raise exception 'REWARD_NOT_AVAILABLE' using errcode = '23514';
  end if;

  if v_reward.stock_remaining is not null and v_reward.stock_remaining <= 0 then
    raise exception 'REWARD_OUT_OF_STOCK' using errcode = '23514';
  end if;

  if v_reward.points_cost <= 0
     or new.cost_points is distinct from v_reward.points_cost
     or new.reward_name_en is distinct from v_reward.title_en
     or new.reward_name_ar is distinct from v_reward.title_ar then
    raise exception 'REWARD_REQUEST_CATALOG_MISMATCH' using errcode = '23514';
  end if;

  if new.parent_id is not null and not exists (
    select 1
      from public.user_relationships ur
     where ur.parent_id = new.parent_id
       and ur.child_id = new.student_id
       and ur.relationship_type in ('parent_child','guardian_student')
       and ur.verified_at is not null
  ) then
    raise exception 'VERIFIED_PARENT_REQUIRED' using errcode = '42501';
  end if;

  select p.points into v_points
    from public.profiles p
   where p.id = new.student_id;
  if coalesce(v_points, 0) < new.cost_points then
    raise exception 'INSUFFICIENT_POINTS' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_reward_request_catalog() from public, anon, authenticated;
drop trigger if exists reward_requests_validate_catalog_before_insert on public.reward_requests;
create trigger reward_requests_validate_catalog_before_insert
before insert on public.reward_requests
for each row execute function public.validate_reward_request_catalog();

create or replace function public.stamp_reward_decision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status is distinct from 'pending'
     or new.status is null
     or new.status not in ('approved','rejected') then
    raise exception 'Only pending reward requests can be decided.'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id
     or new.student_id is distinct from old.student_id
     or new.reward_id is distinct from old.reward_id
     or new.reward_name_en is distinct from old.reward_name_en
     or new.reward_name_ar is distinct from old.reward_name_ar
     or new.cost_points is distinct from old.cost_points
     or new.parent_id is distinct from old.parent_id
     or new.created_at is distinct from old.created_at
     or new.fulfilled_at is distinct from old.fulfilled_at
     or new.fulfilled_by is distinct from old.fulfilled_by
     or new.fulfillment_note is distinct from old.fulfillment_note then
    raise exception 'Reward request details cannot be changed during approval.'
      using errcode = '42501';
  end if;

  new.decided_at := pg_catalog.now();
  return new;
end;
$$;

create or replace function public.decrement_reward_catalog_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_catalog_id uuid;
  v_stock integer;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    if new.cost_points <= 0 then
      raise exception 'INVALID_REWARD_COST' using errcode = '22023';
    end if;

    select c.id, c.stock_remaining
      into v_catalog_id, v_stock
      from public.reward_catalog c
     where c.id::text = new.reward_id
     for update;

    if v_catalog_id is null then
      raise exception 'REWARD_CATALOG_ITEM_NOT_FOUND' using errcode = '23514';
    end if;
    if v_stock is not null and v_stock <= 0 then
      raise exception 'REWARD_OUT_OF_STOCK' using errcode = '23514';
    end if;

    update public.profiles
       set points = coalesce(points, 0) - new.cost_points
     where id = new.student_id
       and coalesce(points, 0) >= new.cost_points;
    if not found then
      raise exception 'INSUFFICIENT_POINTS' using errcode = '23514';
    end if;

    if v_stock is not null then
      update public.reward_catalog
         set stock_remaining = stock_remaining - 1,
             updated_at = pg_catalog.now()
       where id = v_catalog_id;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.decrement_reward_catalog_stock() from public, anon, authenticated;

create or replace function public.review_staff_reward_request(p_request_id uuid, p_decision text)
returns public.reward_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.reward_requests%rowtype;
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not coalesce(public.has_role('teacher') or public.is_church_admin(), false) then
    raise exception 'STAFF_REQUIRED' using errcode = '42501';
  end if;
  if p_decision is null or p_decision not in ('approved','rejected') then
    raise exception 'INVALID_DECISION' using errcode = '22023';
  end if;

  select rr.* into v_request
    from public.reward_requests rr
   where rr.id = p_request_id
   for update;

  if not found or v_request.status <> 'pending' then
    raise exception 'PENDING_REWARD_REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not public.is_church_admin()
     and not (public.has_role('teacher') and public.can_access_student_data(v_request.student_id)) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.reward_requests
     set status = p_decision
   where id = p_request_id
   returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.review_staff_reward_request(uuid,text) from public, anon;
grant execute on function public.review_staff_reward_request(uuid,text) to authenticated;
