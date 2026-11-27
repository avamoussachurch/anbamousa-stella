create index if not exists church_event_rsvps_user_id_idx
  on public.church_event_rsvps (user_id);
create index if not exists feed_post_bookmarks_post_id_idx
  on public.feed_post_bookmarks (post_id);
create index if not exists feed_post_class_targets_class_instance_id_idx
  on public.feed_post_class_targets (class_instance_id);
create index if not exists feed_post_poll_votes_user_id_idx
  on public.feed_post_poll_votes (user_id);
create index if not exists hymn_practice_submissions_reviewed_by_idx
  on public.hymn_practice_submissions (reviewed_by);
create index if not exists profile_cosmetic_unlocks_cosmetic_id_idx
  on public.profile_cosmetic_unlocks (cosmetic_id);
create index if not exists profile_follows_followed_id_idx
  on public.profile_follows (followed_id);
