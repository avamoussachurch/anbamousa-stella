# Anba Mousa Release Readiness — 18 November 2026

## Decision

**Not approved for a full public/student launch yet.** The repository and Supabase work that can be completed with the connected access has been completed and verified. The remaining gates require production hosting access, real account sessions, approved curriculum, and a decision about public feed media.

This report separates verified code/database work from items that cannot be certified from repository and database access alone.

## Completed repository work

The following pull requests are merged to `main`:

- **PR #94** — authoritative streak lifecycle and shared activity-day history.
- **PR #95** — onboarding and Hymns practice recorder improvements.
- **PR #98** — teacher attendance and student visitation tracking.
- **PR #99** — correct feed-comment reply parent correlation in RLS.
- **PR #100** — remove anonymous reads of feed posts/comments/reactions and revoke broad anonymous database grants.
- **PR #101** — index attendance/visitation actor foreign keys and pin server-only helper search paths.
- **PR #102** — revoke PostgreSQL's default PUBLIC function EXECUTE grant for functions created by the postgres migration owner.
- **PR #103** — upgrade GitHub Actions checkout/setup-node actions to Node 24-compatible releases.

The latest CI run (#465) passed:
- TypeScript check
- **342 tests passed, 0 failed**
- trusted bootstrap script syntax check
- authenticated production smoke-test script syntax check
- production frontend/backend build

The build still reports the shared Vite entry chunk above its 500 kB raw warning threshold and a transitive `punycode` deprecation warning. Neither caused CI failure.

## Supabase changes and live verification

All corresponding database migrations are recorded in the connected project.

### Verified

- Streak current values never exceed longest-streak values; hourly Cairo-local reminder and recalculation jobs are active.
- A live authenticated transaction successfully inserted a root feed comment and a reply under the corrected RLS policy; the transaction was rolled back and left no QA rows.
- Read-only role-context checks passed:
  - Student can read their own profile/membership, not an unrelated student's profile.
  - Parent can read the verified child's profile/data, not an unrelated student.
  - Teacher can read an assigned student's profile/data, not an unrelated student.
  - Admin can read the expected wider profile scope.
- Anonymous database access is limited to SELECT on `feed_post_attachments`; its RLS policy returned only the one explicitly opted-in global audio attachment.
- Anonymous users cannot SELECT feed posts, comments, reactions, profiles, memberships, progress, or other private public-schema data.
- No public-schema function remains executable by `anon` or `PUBLIC`. A transaction-created function verified that new postgres-owned public functions are not executable by anon/PUBLIC; the test transaction was rolled back.
- The 10 RLS-enabled tables with no end-user policies are server-only tables; authenticated and anon table grants are absent, while service-role access is present.
- The 26 authenticated-executable SECURITY DEFINER functions are intentional application RPCs/RLS helpers; reviewed callable functions contain auth/role checks. Their search paths are pinned. The generic Supabase warning remains because authenticated users can execute these RPCs.
- Supabase Performance Advisor no longer reports unindexed foreign keys. It reports 32 unused-index INFO findings; indexes were not dropped without workload evidence.
- Supabase Health Advisor returned no findings.
- Supabase logs showed no 5xx responses in the last 24 hours at the time of this audit.

### Remaining Supabase security setting

Supabase Auth still reports **Leaked Password Protection disabled**. This is an Auth configuration setting, not a PostgreSQL migration; it was not changeable through the connected database tools. Enable it in the Supabase Auth password/security settings if the project plan supports it.

## Current live data readiness

Read-only inventory at audit time:

| Item | Live count |
|---|---:|
| Profiles | 8 |
| Active student role assignments | 4 |
| Distinct students with active class membership | 3 |
| Active parent role assignments | 4 |
| Verified parent-child links | 1 |
| Active teacher role assignments | 3 |
| Active teacher class assignments | 3 |
| Published Hymns | 1 |
| Published Coptic Taxis items | 0 |
| Published Sunday School lessons with active version pointer | 0 |
| Lesson source records | 0 |
| Account setup completion records | 0 |

One student-role account has no active class membership and no pending class-change request. It must be assigned to the correct class by an authorized administrator; this audit did not guess the student's class or mutate membership data.

The live curriculum is not ready for a real student launch: there is one published Hymn, no published Taxis items, and no active published Sunday School lessons. Existing draft/test-like lesson rows were not published, rewritten, or deleted. Coptic lesson/hymn/ritual content must be supplied or approved by the church; no content was invented.

The new account-setup completion table is empty. The code is present, but the updated onboarding flows still need to be completed with real student, teacher, parent, and admin accounts.

## Media privacy decision required

- `stella-curriculum-media-v1` is private.
- `stella-feed-media-v1` is public by the existing documented design and currently contains three objects, including two images attached to student-authored feed posts and one audio item.
- Feed database rows are now authenticated-only, while the global audio player remains limited to explicitly opted-in audio metadata. However, a public Storage bucket makes an object downloadable by anyone who knows its public URL.

This public bucket behavior was not changed because the current feed media pipeline returns public URLs; making the bucket private without a coordinated signed-URL code change and deployment would break existing feed media. Before launch, the church must confirm whether student-posted images are intentionally public outside the signed-in community. If not, move feed media to a private bucket and implement authenticated signed URLs, while preserving the explicitly opted-in public audio-player path.

## Hosting and real-device validation not completed

- The repository contains no Cloud Run deployment workflow. The earlier release audit identifies Cloud Run as the production host, but the connected tools do not provide Cloud Run deployment/revision access.
- The currently served production revision was not verified against the latest `main` commit.
- No real browser sessions were available for student, teacher, parent, or admin accounts. Database role-context tests do not replace browser-based end-to-end tests.
- Real microphone permission, pause/resume/stop, waveform rendering, playback, upload, and save-error behavior still need a physical browser/device test.
- Mobile/desktop layout, Arabic/RTL, accessibility, and slow-network behavior were not visually certified in a live browser.

## Stella 2.0 visual scope

`STELLA_VILLAGE_MAP_SPEC.md` and `STELLA_VILLAGE_ASSETS.md` are specifications only. The detailed isometric Coptic-inspired village, separate pixel-art layers/sprites, walkability/collision map, character movement, camera, destination interactions, and portal transitions are not implemented as a production runtime experience. Do not describe Stella 2.0 as complete.

## Final release gates

1. Deploy the latest `main` revision to the production host and verify the served commit.
2. Complete browser end-to-end tests with real student, teacher, parent, and admin accounts.
3. Assign the one unassigned student to the correct class and complete the missing verified family links.
4. Load and approve the real Sunday School, Hymns, and Taxis curriculum; verify publish-to-student retrieval.
5. Complete onboarding with real accounts and verify the optional phone field.
6. Decide whether student feed images may be publicly accessible by direct URL; if not, implement private signed media before launch.
7. Enable leaked-password protection in Supabase Auth if available on the current plan.
8. Perform live device tests for recording, media playback, responsive layout, Arabic/RTL, and accessibility.
9. Treat the detailed pixel-art village as a separate incomplete Stella 2.0 milestone.

No student/profile/class data was fabricated, no real curriculum was invented, and no user media was deleted or moved during this audit.
