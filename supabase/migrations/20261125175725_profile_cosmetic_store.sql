create table if not exists public.profile_cosmetic_catalog (
  id text primary key,
  kind text not null,
  title_en text not null,
  title_ar text not null,
  description_en text not null default '',
  description_ar text not null default '',
  preview_start text not null,
  preview_end text not null,
  points_cost integer not null,
  rarity text not null default 'common',
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint profile_cosmetic_catalog_id_check check (id ~ '^[a-z0-9][a-z0-9_-]{1,79}$'),
  constraint profile_cosmetic_catalog_kind_check check (kind in ('frame','banner','badge','effect')),
  constraint profile_cosmetic_catalog_title_en_check check (char_length(title_en) between 1 and 80),
  constraint profile_cosmetic_catalog_title_ar_check check (char_length(title_ar) between 1 and 100),
  constraint profile_cosmetic_catalog_preview_start_check check (preview_start ~ '^#[0-9A-Fa-f]{6}$'),
  constraint profile_cosmetic_catalog_preview_end_check check (preview_end ~ '^#[0-9A-Fa-f]{6}$'),
  constraint profile_cosmetic_catalog_points_cost_check check (points_cost between 1 and 100000),
  constraint profile_cosmetic_catalog_rarity_check check (rarity in ('common','rare','epic','legendary'))
);

create table if not exists public.profile_cosmetic_unlocks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  cosmetic_id text not null references public.profile_cosmetic_catalog(id) on delete restrict,
  unlocked_at timestamptz not null default now(),
  points_spent integer not null default 0,
  primary key (user_id, cosmetic_id),
  constraint profile_cosmetic_unlocks_points_spent_check check (points_spent >= 0)
);

alter table public.profile_cosmetic_catalog enable row level security;
alter table public.profile_cosmetic_unlocks enable row level security;

drop policy if exists profile_cosmetic_catalog_read_active on public.profile_cosmetic_catalog;
create policy profile_cosmetic_catalog_read_active on public.profile_cosmetic_catalog
  for select to authenticated using (is_active = true);

drop policy if exists profile_cosmetic_unlocks_read_own on public.profile_cosmetic_unlocks;
create policy profile_cosmetic_unlocks_read_own on public.profile_cosmetic_unlocks
  for select to authenticated using ((select auth.uid()) = user_id);

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
on conflict (id) do nothing;
