
create table if not exists public.feed_post_bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id text not null references public.feed_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists feed_post_bookmarks_user_created_idx
  on public.feed_post_bookmarks(user_id, created_at desc);
alter table public.feed_post_bookmarks enable row level security;

drop policy if exists feed_post_bookmarks_select_own on public.feed_post_bookmarks;
create policy feed_post_bookmarks_select_own on public.feed_post_bookmarks
  for select to authenticated
  using ((select auth.uid()) = user_id and public.can_view_feed_post(post_id));

drop policy if exists feed_post_bookmarks_insert_own on public.feed_post_bookmarks;
create policy feed_post_bookmarks_insert_own on public.feed_post_bookmarks
  for insert to authenticated
  with check ((select auth.uid()) = user_id and public.can_view_feed_post(post_id));

drop policy if exists feed_post_bookmarks_delete_own on public.feed_post_bookmarks;
create policy feed_post_bookmarks_delete_own on public.feed_post_bookmarks
  for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.feed_post_bookmarks to authenticated;
