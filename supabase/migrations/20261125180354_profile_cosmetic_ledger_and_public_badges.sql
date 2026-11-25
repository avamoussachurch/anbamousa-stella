alter table public.profile_cosmetic_unlocks
  add column if not exists points_balance_after integer;
alter table public.profile_cosmetic_unlocks
  drop constraint if exists profile_cosmetic_unlocks_points_balance_after_check;
alter table public.profile_cosmetic_unlocks
  add constraint profile_cosmetic_unlocks_points_balance_after_check
  check (points_balance_after is null or points_balance_after >= 0);

alter table public.profile_customizations
  add column if not exists equipped_cosmetics jsonb not null default '{}'::jsonb;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profile_customizations_equipped_cosmetics_object'
      and conrelid = 'public.profile_customizations'::regclass
  ) then
    alter table public.profile_customizations
      add constraint profile_customizations_equipped_cosmetics_object
      check (jsonb_typeof(equipped_cosmetics) = 'object');
  end if;
end
$$;

create or replace function public.purchase_profile_cosmetic(p_cosmetic_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_cost integer;
  v_balance integer;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;

  select points_cost into v_cost
  from public.profile_cosmetic_catalog
  where id = p_cosmetic_id and is_active = true;
  if not found then raise exception 'COSMETIC_NOT_AVAILABLE'; end if;

  select coalesce(points,0) into v_balance
  from public.profiles where id = v_user_id for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

  if exists (
    select 1 from public.profile_cosmetic_unlocks
    where user_id = v_user_id and cosmetic_id = p_cosmetic_id
  ) then
    return jsonb_build_object('success',true,'already_unlocked',true,'balance',v_balance);
  end if;

  if v_balance < v_cost then raise exception 'INSUFFICIENT_POINTS'; end if;

  update public.profiles set points = v_balance - v_cost
  where id = v_user_id returning points into v_balance;

  insert into public.profile_cosmetic_unlocks(user_id,cosmetic_id,points_spent,points_balance_after)
  values (v_user_id,p_cosmetic_id,v_cost,v_balance);

  return jsonb_build_object('success',true,'already_unlocked',false,'balance',v_balance,'points_spent',v_cost);
end;
$function$;

create or replace function public.equip_profile_cosmetic(p_cosmetic_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_kind text;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;

  select kind into v_kind
  from public.profile_cosmetic_catalog
  where id = p_cosmetic_id and is_active = true;
  if not found then raise exception 'COSMETIC_NOT_AVAILABLE'; end if;

  if not exists (
    select 1 from public.profile_cosmetic_unlocks
    where user_id = v_user_id and cosmetic_id = p_cosmetic_id
  ) then
    raise exception 'COSMETIC_NOT_OWNED';
  end if;

  insert into public.profile_customizations(user_id,equipped_cosmetics)
  values (v_user_id,jsonb_build_object(v_kind,p_cosmetic_id))
  on conflict (user_id) do update set
    equipped_cosmetics = jsonb_set(
      coalesce(public.profile_customizations.equipped_cosmetics,'{}'::jsonb),
      array[v_kind],
      to_jsonb(p_cosmetic_id),
      true
    ),
    updated_at = now();

  return jsonb_build_object('success',true,'kind',v_kind,'cosmetic_id',p_cosmetic_id);
end;
$function$;

create or replace function public.unequip_profile_cosmetic(p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_kind not in ('frame','banner','badge','effect') then raise exception 'INVALID_COSMETIC_SLOT'; end if;

  update public.profile_customizations
  set equipped_cosmetics = coalesce(equipped_cosmetics,'{}'::jsonb) - p_kind,
      updated_at = now()
  where user_id = v_user_id;

  return jsonb_build_object('success',true,'kind',p_kind);
end;
$function$;

create or replace function public.get_profile_directory_v3(p_search text default null)
returns table (
  user_id uuid,
  display_name text,
  role text,
  avatar_url text,
  points integer,
  current_streak integer,
  longest_streak integer,
  followers_count bigint,
  following_count bigint,
  is_following boolean,
  frame_key text,
  banner_key text,
  display_title text,
  equipped_cosmetics jsonb,
  earned_badges jsonb
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    p.id,
    p.name,
    p.role,
    p.avatar,
    coalesce(p.points,0),
    coalesce(p.current_streak,0),
    coalesce(p.longest_streak,0),
    (select count(*) from public.profile_follows f where f.followed_id = p.id),
    (select count(*) from public.profile_follows f where f.follower_id = p.id),
    exists(select 1 from public.profile_follows f where f.follower_id = auth.uid() and f.followed_id = p.id),
    coalesce(custom.frame_key,'coptic-gold'),
    coalesce(custom.banner_key,'desert-dawn'),
    custom.display_title,
    coalesce(custom.equipped_cosmetics,'{}'::jsonb),
    coalesce((
      select jsonb_agg(earned.badge_data)
      from (
        select jsonb_build_object(
          'id',b.id,'title_en',b.title_en,'title_ar',b.title_ar,
          'category',b.category,'icon',b.icon,'style',b.style,'earned_at',u.earned_at
        ) as badge_data
        from public.achievement_unlocks u
        join public.achievement_badges b on b.id = u.badge_id
        where u.student_id = p.id
        order by u.earned_at desc
        limit 8
      ) earned
    ),'[]'::jsonb)
  from public.profiles p
  left join public.profile_customizations custom on custom.user_id = p.id
  where auth.uid() is not null
    and (p_search is null or btrim(p_search) = '' or p.name ilike '%' || left(btrim(p_search),60) || '%')
  order by p.name
  limit 100;
$function$;

revoke all on function public.purchase_profile_cosmetic(text) from public, anon;
revoke all on function public.equip_profile_cosmetic(text) from public, anon;
revoke all on function public.unequip_profile_cosmetic(text) from public, anon;
revoke all on function public.get_profile_directory_v3(text) from public, anon;
grant execute on function public.purchase_profile_cosmetic(text) to authenticated;
grant execute on function public.equip_profile_cosmetic(text) to authenticated;
grant execute on function public.unequip_profile_cosmetic(text) to authenticated;
grant execute on function public.get_profile_directory_v3(text) to authenticated;
