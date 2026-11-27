import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('trigger-only security-definer functions are not exposed as authenticated RPCs', async () => {
  const migration = await read('../supabase/migrations/20261127161810_revoke_trigger_only_function_rpc_execution.sql');
  const functions = [
    'capture_church_event_rsvp_achievement_event',
    'capture_community_poll_vote_achievement_event',
    'capture_feed_post_bookmark_achievement_event',
    'capture_profile_cosmetic_unlock_achievement_event',
    'capture_profile_follow_achievement_event',
    'enforce_single_choice_poll_vote',
    'notify_profile_followed'
  ];

  for (const name of functions) {
    assert.match(migration, new RegExp('revoke execute on function public\\\\.' + name + '\\\\(\\\\) from public, anon, authenticated', 'i'));
  }
});
