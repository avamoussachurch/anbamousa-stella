-- Trigger functions are invoked by PostgreSQL's trigger machinery, not by
-- application RPC calls. Remove their unnecessary PostgREST EXECUTE surface.
revoke execute on function public.capture_church_event_rsvp_achievement_event() from public, anon, authenticated;
revoke execute on function public.capture_community_poll_vote_achievement_event() from public, anon, authenticated;
revoke execute on function public.capture_feed_post_bookmark_achievement_event() from public, anon, authenticated;
revoke execute on function public.capture_profile_cosmetic_unlock_achievement_event() from public, anon, authenticated;
revoke execute on function public.capture_profile_follow_achievement_event() from public, anon, authenticated;
revoke execute on function public.enforce_single_choice_poll_vote() from public, anon, authenticated;
revoke execute on function public.notify_profile_followed() from public, anon, authenticated;
