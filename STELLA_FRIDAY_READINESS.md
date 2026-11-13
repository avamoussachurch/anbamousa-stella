# Anba Mousa — Current Release Readiness Audit

**Audit date:** November 13, 2026  
**Repository:** `avamoussachurch/anbamousa-stella`  
**Audited branch:** `main`  
**Main commit at audit:** `498c955943373b8d597dd7ce2b7bf9ea07186f76`  
**Decision:** **Code build is green; full public release is not yet verified.** The village redesign is out of scope for this release.

> This report replaces the November 10 readiness report. Several of its critical findings are now stale: the live database has an administrator, teacher assignments, published Sunday School lessons, and the Hymns/Taxis API code now contains Supabase persistence and private-media resolution. The current remaining gaps are primarily live curriculum content, roster/role provisioning, security configuration, and real-device/production verification.

---

## 1. Verified repository and CI state

The following changes are merged into `main`:

- **PR #63 — class-group and language-shell corrections**
  - Stable IDs such as `primary_1` and `primary_2` are resolved before parsing embedded digits as grade numbers.
  - Student progress authorization and the server's legacy class-group resolver use the shared mapping.
  - The application shell remains anchored RTL when switching to English instead of mirroring the entire shell.
- **PR #64 — database-backed delegated student access**
  - Teacher and parent access to another student's learning data now calls Supabase `can_access_student_data`.
  - Production access no longer trusts server-local JSON relationships or class assignments.
  - Database-check failures fail closed.
- **PR #66 — live points and streak leaderboards**
  - Authenticated student leaderboards now use the active Supabase class roster, student role assignments, profile points/streaks, and persisted lesson completions.
  - Students are restricted to their own class group; servants to assigned groups; admins to active groups.
  - Points and streak rankings are sorted independently. Unassigned students receive an empty state instead of demo classmates.

**GitHub Actions on the merged main commit passed:**
- TypeScript type-check (`npm run lint`)
- Full automated test suite (**273 tests passed** on the PR validation run)
- Trusted bootstrap script syntax check
- Production Vite/client and server build

The PR validation runs also passed. These checks validate code and mocked workflows; they do not replace live authenticated browser testing.

---

## 2. Live Supabase inventory (read-only)

The configured Supabase project was inspected without changing production data.

| Area | Live state |
|---|---:|
| Profiles | 7 |
| Active role assignments | 8 |
| Admin / teacher / student / parent roles | 1 / 3 / 4 / 0 |
| Active church year | 2026–2027 |
| Class instances | 6 |
| Active servant-class assignments | 2 |
| Active student class memberships | 1 |
| Lessons | 5 |
| Published lessons | 3 |
| Draft lessons | 2 |
| Lesson versions | 5 |
| Published lesson versions | 5 |
| Lesson sections | 5 |
| Lesson progress rows | 2 |
| Lesson section-progress rows | 3 |
| Quiz attempts | 2 |
| Hymns rows | 0 |
| Coptic Taxis rows | 0 |
| Media metadata rows | 2 |
| Verified parent/guardian links | 0 |

### Current class coverage

- Both active servant assignments are for `primary_2`.
- The only active student membership is **Grade 6 / primary_2**.
- The three published lessons are all **5th–6th Grade**.
- The remaining student profiles include two **Prep 3** students and one **Primary** student, but none has an active class membership.
- There are no parent-role accounts and no verified parent/guardian relationships.

**Operational consequence:** the current live curriculum is accessible to the enrolled Grade 6 student. Other student accounts are not yet enrolled in a matching class. Teacher publishing for other class groups is not provisioned. Parent access cannot be demonstrated until a real parent account and verified relationship exist.

No student, teacher, parent, or admin roles were added or changed during this audit.

---

## 3. Current curriculum persistence and media code

### Sunday School

- The current server uses Supabase-backed lesson/version/section retrieval and publication paths.
- Student progress and quiz completion use trusted database operations; completion does not silently award points when the persistence operation fails.
- The progress summary reads persisted profile, lesson, version, membership, and section-progress data.
- PR #63 fixes the stable class-group identifier bug that could interpret `primary_2` as Grade 2.
- Two lesson records are marked `draft` while their referenced active version rows are marked `PUBLISHED`. Student access remains blocked by the parent lesson status, but those two records should be reconciled in the teacher/admin curriculum review.

### Hymns and Coptic Taxis

- The current server includes Supabase-backed collection and item handlers for `public.hymns` and `public.coptic_taxis_items`.
- The persistence adapters map application objects to the database schema.
- The server uses authenticated role requests and database ownership/status checks for curriculum writes.
- The Hymns and Taxis student screens resolve private `supabase-storage://` references through the authenticated media URL flow. The private curriculum bucket does not need to be made public.

**Important live-data distinction:** the code path is present, but both live content tables currently contain zero rows. This means the code can be deployed, but students will have no live Hymns or Taxis curriculum to browse until content is imported or uploaded and published. Existing content that may remain in an old server-local `uploads/class_roster_persistence.json` file was not accessible to this audit and has not been migrated.

### Delegated teacher/parent access

- PR #64 now uses the database authorization function for UUID student accounts.
- The function checks active class membership, current-year teacher assignments, and verified family relationships.
- Non-UUID local fixtures are accepted only in the test environment.

---

## 4. Security and database advisor findings

The Supabase security advisor currently reports:

1. **Leaked password protection is disabled — WARN.** Enable this in Supabase Auth before a broad public launch.
2. **26 SECURITY DEFINER functions are executable by authenticated users — WARN.** Several are intentional client RPCs and authorization helpers (for example, role checks, student-data access checks, class enrollment, feed actions, and lesson publication operations). Their grants and internal role checks still need a focused function-by-function review; the advisor warning alone does not prove each function is exploitable.
3. **Four RLS-enabled tables have no client policies — INFO:** `admin_action_audit`, `lesson_publication_jobs`, `lesson_section_progress`, and `media_objects`. These are intended to be server/RPC-only tables; keep them inaccessible to browser roles unless a reviewed policy is required.
4. **Unused indexes — INFO.** Do not drop them solely on this observation; the current dataset and traffic are too small to justify destructive index cleanup.

No RLS policies, grants, functions, storage buckets, or production rows were modified during this audit.

A read-only privilege check confirmed that **none of the SECURITY DEFINER functions can be executed by the `anon` role**. Twenty-six are executable by `authenticated`; these include policy helpers and intentional client RPCs, but their internal role checks still deserve focused review before a broad public launch.

### Storage inventory

- `stella-curriculum-media-v1`: private bucket, 100 MB limit, currently 0 objects. This matches the current server default for curriculum uploads and signed media URLs.
- `stella-feed-media-v1`: public bucket, 100 MB limit, 2 objects.
- Legacy `hymns-audio` and `lesson-worksheets` buckets: public and currently empty.
- No browser policies are present on `storage.objects`; current curriculum uploads and signed reads use the server service-role path. Keep the curriculum bucket private. Review the two empty legacy public buckets before deleting or changing their visibility.

---

## 5. Product and experience readiness

### Verified in code

- Arabic-first language preference is preserved.
- The application shell no longer mirrors when English is selected.
- Student home includes an animated learning-journey presentation, progress/streak/points display, and community preview.
- Existing reduced-motion handling and automated tests remain in place.
- Quiz, lesson-progress, and role-boundary tests pass in CI.

### Not yet verified or not yet complete

- **Village redesign:** explicitly deferred from this release pass. The current student home and navigation remain in place; this audit does not authorize replacing them with a new village/map experience. The pixel-art world brief is a separate future design project and is not a gate for deploying the existing product.
- **Native visual review:** no authenticated browser session was available for full Arabic/English visual review at phone and desktop sizes. CI cannot verify contrast, clipping, animation feel, or real touch interactions.
- **Parent experience:** no parent-role account or verified family link exists in the live database, so the parent portal cannot be validated with real data.
- **Full roster:** only one student is currently enrolled, and only one class group has active servant assignments.
- **Hymns/Taxis content:** both live tables are empty. Upload/publish/retrieve has automated mock coverage but has not been exercised with a real teacher session against the live project.
- **Production deployment:** no production or Vercel preview deployment was performed or verified in this audit.

---

## 6. Release decision and remaining gates

**The merged code passes CI and is buildable. It is not accurate to call the entire product fully launch-verified yet.**

Before describing the full product as ready for public use:

1. Deploy the merged `main` build to the configured hosting provider and verify its environment variables point to the audited Supabase project.
2. Sign in as a real teacher, create and publish one Hymn and one Taxis item, then confirm each appears for the correct student level/audience and that private audio/documents open.
3. Complete the roster setup: assign teachers to the intended class groups and enroll each student in the correct current-year class. Do not infer the ambiguous `Primary` profile's exact grade.
4. Create or identify a real parent account and verify the parent-child relationship through the trusted admin flow before testing the parent workspace.
5. Enable leaked-password protection and review the authenticated SECURITY DEFINER RPC grants.
6. Perform real phone and desktop visual QA in Arabic and English, including the student, teacher, parent, and admin workspaces.
7. Treat the detailed pixel-art village/map as a separate future project; it is not required to deploy the current product and must not be started as part of this release without explicit approval.

**Deployment note:** a deploy can publish the current merged code, but it will not populate empty curriculum tables, enroll students, create verified family links, or complete the missing pixel-art world.