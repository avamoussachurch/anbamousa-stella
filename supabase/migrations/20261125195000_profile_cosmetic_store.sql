
create table if not exists public.profile_cosmetic_catalog (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{1,79}$'),
  kind text not null check (kind in ('frame','banner','badge','effect')),
  title_en text not null check (char_length(title_en) between 1 and 80),
  title_ar text not null check (char_length(title_ar) between 1 and 100),
  description_en text not null default '',
  description_ar text not null default '',
  preview_start text not null check (preview_start ~ '^#[0-9A-Fa-f]{6}$'),
  preview_end text not null check (preview_end ~ '^#[0-9A-Fa-f]{6}$'),
  points_cost integer not null check (points_cost between 1 and 100000),
  rarity text not null default 'common' check (rarity in ('common','rare','epic','legendary')),
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profile_customizations
  add column if not exists equipped_cosmetics jsonb not null default '{}'::jsonb;
alter table public.profile_customizations
  drop constraint if exists profile_customizations_equipped_cosmetics_object;
alter table public.profile_customizations
  add constraint profile_customizations_equipped_cosmetics_object
  check (jsonb_typeof(equipped_cosmetics) = 'object');

create table if not exists public.profile_cosmetic_unlocks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  cosmetic_id text not null references public.profile_cosmetic_catalog(id) on delete restrict,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, cosmetic_id)
);

alter table public.profile_cosmetic_catalog enable row level security;
alter table public.profile_cosmetic_unlocks enable row level security;

drop policy if exists profile_cosmetic_catalog_read_active on public.profile_cosmetic_catalog;
create policy profile_cosmetic_catalog_read_active on public.profile_cosmetic_catalog
  for select to authenticated using (is_active = true);
drop policy if exists profile_cosmetic_unlocks_read_own on public.profile_cosmetic_unlocks;
create policy profile_cosmetic_unlocks_read_own on public.profile_cosmetic_unlocks
  for select to authenticated using ((select auth.uid()) = user_id);
grant select on public.profile_cosmetic_catalog to authenticated;
grant select on public.profile_cosmetic_unlocks to authenticated;

insert into public.profile_cosmetic_catalog
(id,kind,title_en,title_ar,description_en,description_ar,preview_start,preview_end,points_cost,rarity,display_order)
values
('frame-halo-gold','frame','Golden Halo','الهالة الذهبية','A warm golden frame for your avatar.','إطار ذهبي دافئ لصورتك الشخصية.','#B7791F','#F6D365',250,'common',10),
('frame-desert-royal','frame','Desert Royal','ملكي البرية','A deep desert-gold royal frame.','إطار ملكي بلون ذهب البرية.','#7C3F24','#E7A84B',400,'rare',20),
('frame-midnight-coptic','frame','Midnight Coptic','قبطي ليلي','A midnight teal frame with a Coptic glow.','إطار فيروزي ليلي بلمعة قبطية.','#123A46','#6BC6C4',500,'rare',30),
('frame-pascha-radiance','frame','Pascha Radiance','بهاء القيامة','A radiant Easter-inspired frame.','إطار مشرق مستوحى من فرح القيامة.','#7F1D1D','#F5C96A',900,'epic',40),
('banner-kiahk-stars','banner','Kiahk Stars','نجوم كيهك','A starry Kiahk night cover.','غلاف ليلي مرصع بنجوم كيهك.','#101D46','#5B78C7',350,'common',50),
('banner-desert-dawn','banner','Desert Dawn','فجر البرية','A sunrise over the desert.','شروق الشمس فوق البرية.','#7C3F24','#F5C16C',300,'common',60),
('banner-pascha-light','banner','Pascha Light','نور البصخة','A deep burgundy-to-gold Pascha cover.','غلاف بصخة عنابي وذهبي.','#4A1020','#D7A94A',750,'epic',70),
('banner-heavenly-blue','banner','Heavenly Blue','الأزرق السماوي','A calm blue cover with a heavenly glow.','غلاف أزرق هادئ بلمعة سماوية.','#164E83','#8BC5E8',450,'rare',80),
('badge-prayer-flame','badge','Prayer Flame','شعلة الصلاة','A small flame for a faithful prayer life.','شعلة صغيرة لأمانة الصلاة.','#9A3412','#FBBF24',300,'common',90),
('badge-hymn-wreath','badge','Hymn Wreath','إكليل الألحان','A wreath celebrating love for Coptic hymns.','إكليل يكرّم محبة الألحان القبطية.','#166534','#A3D977',350,'rare',100),
('badge-cross-shield','badge','Cross Shield','درع الصليب','A shield bearing the sign of the Cross.','درع يحمل علامة الصليب.','#1E3A8A','#93C5FD',550,'epic',110),
('effect-stardust','effect','Stardust Glow','بريق النجوم','A subtle stardust glow around your profile.','بريق نجوم هادئ حول ملفك الشخصي.','#6D28D9','#E9D5FF',800,'epic',120)
on conflict (id) do update set kind=excluded.kind,title_en=excluded.title_en,title_ar=excluded.title_ar,
  description_en=excluded.description_en,description_ar=excluded.description_ar,
  preview_start=excluded.preview_start,preview_end=excluded.preview_end,points_cost=excluded.points_cost,
  rarity=excluded.rarity,is_active=excluded.is_active,display_order=excluded.display_order;

create or replace function public.guard_profile_equipped_cosmetics()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_slot text; v_cosmetic_id text;
begin
  if new.equipped_cosmetics is null or jsonb_typeof(new.equipped_cosmetics) <> 'object' then raise exception 'INVALID_EQUIPPED_COSMETICS'; end if;
  for v_slot, v_cosmetic_id in select key, value from jsonb_each_text(new.equipped_cosmetics) loop
    if v_slot not in ('frame','banner','badge','effect') or not exists (
      select 1 from public.profile_cosmetic_unlocks u
      join public.profile_cosmetic_catalog c on c.id=u.cosmetic_id
      where u.user_id=new.user_id and u.cosmetic_id=v_cosmetic_id and c.kind=v_slot
    ) then raise exception 'COSMETIC_NOT_OWNED'; end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists guard_profile_equipped_cosmetics on public.profile_customizations;
create trigger guard_profile_equipped_cosmetics before insert or update of equipped_cosmetics
on public.profile_customizations for each row execute function public.guard_profile_equipped_cosmetics();

create or replace function public.purchase_profile_cosmetic(p_cosmetic_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user_id uuid := auth.uid(); v_cost integer; v_balance integer;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  select points_cost into v_cost from public.profile_cosmetic_catalog where id=p_cosmetic_id and is_active=true;
  if not found then raise exception 'COSMETIC_NOT_AVAILABLE'; end if;
  select coalesce(points,0) into v_balance from public.profiles where id=v_user_id for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  if exists (select 1 from public.profile_cosmetic_unlocks where user_id=v_user_id and cosmetic_id=p_cosmetic_id) then
    return jsonb_build_object('success',true,'already_unlocked',true,'balance',v_balance);
  end if;
  if v_balance < v_cost then raise exception 'INSUFFICIENT_POINTS'; end if;
  update public.profiles set points=v_balance-v_cost where id=v_user_id returning points into v_balance;
  insert into public.profile_cosmetic_unlocks(user_id,cosmetic_id) values (v_user_id,p_cosmetic_id);
  return jsonb_build_object('success',true,'already_unlocked',false,'balance',v_balance);
end;
$$;

create or replace function public.equip_profile_cosmetic(p_cosmetic_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user_id uuid := auth.uid(); v_kind text;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  select kind into v_kind from public.profile_cosmetic_catalog where id=p_cosmetic_id and is_active=true;
  if not found then raise exception 'COSMETIC_NOT_AVAILABLE'; end if;
  if not exists (select 1 from public.profile_cosmetic_unlocks where user_id=v_user_id and cosmetic_id=p_cosmetic_id) then raise exception 'COSMETIC_NOT_OWNED'; end if;
  insert into public.profile_customizations(user_id,equipped_cosmetics)
  values (v_user_id,jsonb_build_object(v_kind,p_cosmetic_id))
  on conflict (user_id) do update set
    equipped_cosmetics=jsonb_set(coalesce(public.profile_customizations.equipped_cosmetics,'{}'::jsonb),array[v_kind],to_jsonb(p_cosmetic_id),true),
    updated_at=now();
  return jsonb_build_object('success',true,'kind',v_kind,'cosmetic_id',p_cosmetic_id);
end;
$$;

revoke all on function public.purchase_profile_cosmetic(text) from public, anon;
revoke all on function public.equip_profile_cosmetic(text) from public, anon;
grant execute on function public.purchase_profile_cosmetic(text) to authenticated;
grant execute on function public.equip_profile_cosmetic(text) to authenticated;
revoke all on function public.guard_profile_equipped_cosmetics() from public, anon, authenticated;

create or replace function public.get_profile_directory_v2(p_search text default null)
returns table(user_id uuid, display_name text, role text, avatar_url text, points integer,
  current_streak integer, longest_streak integer, followers_count bigint, following_count bigint,
  is_following boolean, frame_key text, banner_key text, display_title text, equipped_cosmetics jsonb)
language sql stable security definer set search_path = public, pg_temp as $function$
  select p.id,p.name,p.role,p.avatar,coalesce(p.points,0),coalesce(p.current_streak,0),coalesce(p.longest_streak,0),
    (select count(*) from public.profile_follows f where f.followed_id=p.id),
    (select count(*) from public.profile_follows f where f.follower_id=p.id),
    exists(select 1 from public.profile_follows f where f.follower_id=auth.uid() and f.followed_id=p.id),
    coalesce(custom.frame_key,'coptic-gold'),coalesce(custom.banner_key,'desert-dawn'),custom.display_title,
    coalesce(custom.equipped_cosmetics,'{}'::jsonb)
  from public.profiles p left join public.profile_customizations custom on custom.user_id=p.id
  where auth.uid() is not null and (p_search is null or btrim(p_search)='' or p.name ilike '%'||left(btrim(p_search),60)||'%')
  order by p.name limit 100;
$function$;
revoke all on function public.get_profile_directory_v2(text) from public, anon;
grant execute on function public.get_profile_directory_v2(text) to authenticated;
