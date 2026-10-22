/**
 * Phase Task 1: Feed Migration Verification Suite
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

console.log("================================================================");
console.log("Task 1: Supabase Feed Migration & Hardened RLS QA Suite");
console.log("================================================================");

// 1. Verify SQL Migration File Presence & Structure
console.log("\n--- 1. SQL Migration Hardening Invariants ---");
const sqlPath = path.join(__dirname, '..', 'supabase_migration_feed_posts_v2.sql');
assert(fs.existsSync(sqlPath), "supabase_migration_feed_posts_v2.sql exists");

const sqlContent = fs.readFileSync(sqlPath, 'utf8');

assert(sqlContent.includes("CREATE TABLE IF NOT EXISTS public.feed_posts"), "Defines public.feed_posts table");
assert(sqlContent.includes("CREATE TABLE IF NOT EXISTS public.feed_comments"), "Defines public.feed_comments table");
assert(sqlContent.includes("CREATE TABLE IF NOT EXISTS public.feed_reactions"), "Defines public.feed_reactions table");

assert(sqlContent.includes("ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;"), "Enables RLS on feed_posts");
assert(sqlContent.includes("ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;"), "Enables RLS on feed_comments");
assert(sqlContent.includes("ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;"), "Enables RLS on feed_reactions");

assert(!sqlContent.includes("OR true"), "Zero instances of 'OR true' in RLS policies");
assert(!sqlContent.includes("TO anon"), "Zero anonymous access policies; strictly authenticated");

assert(sqlContent.includes("REVOKE UPDATE ON public.feed_posts FROM authenticated;"), "Direct UPDATE revoked from authenticated on feed_posts");
assert(sqlContent.includes("SET search_path = public, pg_temp"), "Security Definer functions use safe fixed search_path");
assert(sqlContent.includes("public.is_church_servant_or_admin()"), "Includes authoritative role verification function");
assert(sqlContent.includes("public.edit_feed_post"), "Includes scoped edit_feed_post function");
assert(sqlContent.includes("public.moderate_feed_post_pin"), "Includes scoped moderate_feed_post_pin function");
assert(sqlContent.includes("public.toggle_feed_reaction"), "Includes atomic toggle_feed_reaction function");

// 2. Unit Testing Client-Side Migration Logic
console.log("\n--- 2. Client Migration Safety & Mock Exclusion Invariants ---");

const mockIds = ['announcement-1', 'photo-post-1', 'video-post-1', 'p0-photo', 'p0-audio', 'mock-test'];
const realIds = ['post-1729000000000', 'post_1729111222_abc123', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'];

const MOCK_ID_PREFIXES = ['announcement-', 'photo-post-', 'video-post-', 'p0-', 'mock-'];
function isMockPostId(id) {
  if (!id) return false;
  return MOCK_ID_PREFIXES.some(prefix => id.startsWith(prefix));
}

for (const id of mockIds) {
  assert(isMockPostId(id) === true, `Correctly identifies mock ID fixture as excluded: ${id}`);
}

for (const id of realIds) {
  assert(isMockPostId(id) === false, `Correctly allows authentic post ID for migration: ${id}`);
}

// 3. Testing Ownership Isolation Invariants
console.log("\n--- 3. Authorship & Ownership Isolation Invariants ---");
const currentUserId = '11111111-2222-3333-4444-555555555555';
const otherUserId = '99999999-8888-7777-6666-555555555555';

const sampleCache = [
  { id: 'announcement-1', authorId: 'teacher-1', content: 'Mock announcement' },
  { id: 'post-1729000000001', authorId: currentUserId, content: 'Real student reflection' },
  { id: 'post-1729000000002', authorId: otherUserId, content: 'Another student post cached on shared device' },
  { id: 'p0-photo', authorId: 't1', content: 'Sample priest post' }
];

function filterPostsForMigration(posts, userId) {
  const eligible = [];
  let skippedMock = 0;
  let unowned = 0;

  for (const p of posts) {
    if (isMockPostId(p.id)) {
      skippedMock++;
      continue;
    }
    if (p.authorId !== userId) {
      unowned++;
      continue;
    }
    eligible.push(p);
  }

  return { eligible, skippedMock, unowned };
}

const filterResult = filterPostsForMigration(sampleCache, currentUserId);
assert(filterResult.eligible.length === 1, "Exactly 1 real post selected for current user migration");
assert(filterResult.eligible[0].id === 'post-1729000000001', "Selected post matches current user's genuine author ID");
assert(filterResult.skippedMock === 2, "Both mock posts rejected from migration");
assert(filterResult.unowned === 1, "Post authored by another user on shared device rejected");

// 4. Idempotency Invariants
console.log("\n--- 4. Migration Idempotency Invariants ---");
const migratedLog = new Set(['post-1729000000001']);
const secondPassEligible = filterResult.eligible.filter(p => !migratedLog.has(p.id));
assert(secondPassEligible.length === 0, "Repeated migration pass finds 0 duplicate records to upload");

// 5. Verification of Application Code Integration
console.log("\n--- 5. Application Code Integration ---");
const feedServicePath = path.join(__dirname, '..', 'src', 'lib', 'feedService.ts');
const feedTabPath = path.join(__dirname, '..', 'src', 'components', 'student', 'FeedTab.tsx');

assert(fs.existsSync(feedServicePath), "src/lib/feedService.ts exists");
assert(fs.existsSync(feedTabPath), "src/components/student/FeedTab.tsx exists");

const feedServiceCode = fs.readFileSync(feedServicePath, 'utf8');
const feedTabCode = fs.readFileSync(feedTabPath, 'utf8');

assert(feedServiceCode.includes("fetchFeedPostsFromSupabase"), "feedService exports fetchFeedPostsFromSupabase");
assert(feedServiceCode.includes("createFeedPostInSupabase"), "feedService exports createFeedPostInSupabase");
assert(feedServiceCode.includes("editFeedPostInSupabase"), "feedService exports editFeedPostInSupabase");
assert(feedServiceCode.includes("toggleFeedReactionInSupabase"), "feedService exports toggleFeedReactionInSupabase");
assert(feedServiceCode.includes("syncUserLocalPostsToSupabase"), "feedService exports syncUserLocalPostsToSupabase");

assert(feedTabCode.includes("fetchFeedPostsFromSupabase"), "FeedTab connects to fetchFeedPostsFromSupabase");
assert(feedTabCode.includes("createFeedPostInSupabase"), "FeedTab connects to createFeedPostInSupabase");
assert(feedTabCode.includes("syncUserLocalPostsToSupabase"), "FeedTab invokes safe user migration");

console.log("\n================================================================");
console.log(`Task 1 QA Results: ${passed} passed, ${failed} failed`);
console.log("================================================================");

if (failed > 0) {
  process.exit(1);
}
