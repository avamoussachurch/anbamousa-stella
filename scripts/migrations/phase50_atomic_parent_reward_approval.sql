-- Atomically review a parent reward request and deduct points only on approval.
-- The server calls this using its trusted service-role client after authenticating the parent.
create or replace function public.review_parent_reward_request(
  p_parent_id uuid,
  p_request_id uuid,
  p_decision text
)
returns setof public.reward_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.reward_requests%rowtype;
begin
  if p_parent_id is null or p_request_id is null then
    raise exception 'INVALID_REQUEST';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'INVALID_DECISION';
  end if;

  select rr.*
    into v_request
    from public.reward_requests as rr
   where rr.id = p_request_id
   for update;

  if not found then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if not exists (
    select 1
      from public.user_relationships as ur
     where ur.parent_id = p_parent_id
       and ur.child_id = v_request.student_id
       and ur.relationship_type in ('parent_child', 'guardian_student')
       and ur.verified_at is not null
  ) then
    raise exception 'FORBIDDEN';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'REQUEST_ALREADY_REVIEWED';
  end if;

  if p_decision = 'approved' then
    update public.profiles
       set points = coalesce(points, 0) - v_request.cost_points
     where id = v_request.student_id
       and coalesce(points, 0) >= v_request.cost_points;

    if not found then
      raise exception 'INSUFFICIENT_POINTS';
    end if;
  end if;

  update public.reward_requests
     set status = p_decision,
         parent_id = p_parent_id,
         decided_at = timezone('utc', now())
   where id = p_request_id
   returning * into v_request;

  return next v_request;
end;
$$;

revoke all on function public.review_parent_reward_request(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.review_parent_reward_request(uuid, uuid, text) to service_role;
