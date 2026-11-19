create table public.agpeya_prayers (
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  completed_hours jsonb not null default '{}'::jsonb,
  streak_days integer not null default 0 check (streak_days >= 0),
  personal_prayer text not null default '',
  updated_at timestamptz not null default now(),
  constraint agpeya_prayers_pkey primary key (user_id, date),
  constraint agpeya_prayers_completed_hours_object check (jsonb_typeof(completed_hours) = 'object'),
  constraint agpeya_prayers_personal_prayer_length check (char_length(personal_prayer) <= 10000)
);

comment on table public.agpeya_prayers is
  'Private per-user daily Agpeya progress and saved personal prayer text.';

alter table public.agpeya_prayers enable row level security;

revoke all on table public.agpeya_prayers from anon;
revoke all on table public.agpeya_prayers from authenticated;
grant select, insert, update on table public.agpeya_prayers to authenticated;
grant all on table public.agpeya_prayers to service_role;

create policy "Users can read their own Agpeya prayer records"
  on public.agpeya_prayers
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own Agpeya prayer records"
  on public.agpeya_prayers
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own Agpeya prayer records"
  on public.agpeya_prayers
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
