import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('community feed rows are not anonymously readable', async () => {
  const migration = await read('../supabase/migrations/20261118180016_restrict_anon_feed_reads.sql');
  assert.match(migration, /DROP POLICY IF EXISTS "Allow public read feed posts"/);
  assert.match(migration, /DROP POLICY IF EXISTS "Allow public read feed comments"/);
  assert.match(migration, /DROP POLICY IF EXISTS "Allow public read feed reactions"/);
  assert.match(migration, /REVOKE SELECT ON TABLE public\.feed_posts FROM PUBLIC, anon/);
  assert.match(migration, /REVOKE SELECT ON TABLE public\.feed_comments FROM PUBLIC, anon/);
  assert.match(migration, /REVOKE SELECT ON TABLE public\.feed_reactions FROM PUBLIC, anon/);
});

test('anonymous access is limited to explicitly opted-in global audio attachments', async () => {
  const migration = await read('../supabase/migrations/20261118180206_revoke_anon_access_from_private_objects.sql');
  assert.match(migration, /REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon/);
  assert.match(migration, /GRANT SELECT ON TABLE public\.feed_post_attachments TO anon/);
  assert.match(migration, /REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon/);
  assert.match(migration, /REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon/);
});

test('future postgres-owned public objects do not inherit anonymous grants', async () => {
  const migration = await read('../supabase/migrations/20261118180211_revoke_anon_default_privileges.sql');
  assert.match(migration, /ALTER DEFAULT PRIVILEGES IN SCHEMA public\s+REVOKE ALL ON TABLES FROM anon/);
  assert.match(migration, /ALTER DEFAULT PRIVILEGES IN SCHEMA public\s+REVOKE ALL ON SEQUENCES FROM anon/);
  assert.match(migration, /ALTER DEFAULT PRIVILEGES IN SCHEMA public\s+REVOKE EXECUTE ON FUNCTIONS FROM anon/);
});

test('trigger-only functions cannot be invoked through public RPC grants', async () => {
  const migration = await read('../supabase/migrations/20261118180255_revoke_public_trigger_function_execute.sql');
  assert.match(migration, /enforce_feed_post_media_ownership\(\) FROM PUBLIC, anon/);
  assert.match(migration, /prevent_admin_action_audit_mutation\(\) FROM PUBLIC, anon/);
});
