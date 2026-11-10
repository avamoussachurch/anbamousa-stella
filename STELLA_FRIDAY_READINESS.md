# STELLA — Friday Demonstration Readiness Audit Report
**Date:** November 10, 2026  
**Target Demonstration Date:** Friday, November 13, 2026  
**Auditor:** Automated System Audit (Read-Only Inspection)  
**Status:** **CONDITIONAL READINESS — 4 BLOCKING ITEMS IDENTIFIED BEFORE LIVE DEMO**

---

## Executive Summary

A comprehensive, read-only audit of the Stella application was conducted across the frontend, backend server, database schemas, Supabase Storage, authentication layers, curriculum workflows, and test suites.

- **Build & Compilation:** `tsc --noEmit` (lint) and `vite build` + `esbuild` production builds **PASS** with zero errors.
- **Test Suite:** 140 of 143 tests pass. The single test failure in `tests/media-storage-reference.test.ts` is caused by a syntax nesting bug (a `describe` block mistakenly placed inside an `it` block).
- **Runtime Environment:** All required environment variables (`VITE_SUPABASE_URL`, `SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`) are present in the running Node.js process environment.
- **Core Sunday School System:** The Sunday School lesson flow, quiz scoring, and lesson completion persistence are fully wired to Supabase RPCs (`record_lesson_completion`, `publish_lesson_version_immediately`) and fail closed.
- **Critical Demonstration Blockers:**
  1. **Hymns & Taxis Audio Playback:** Media files uploaded to private storage generate `supabase-storage://` URIs, which are bound directly to `<audio src="...">` and `<a href="...">` elements without signed URL resolution. Browsers cannot play these URLs.
  2. **Hymns & Taxis Database Disconnect:** The Hymns and Taxis APIs read and write exclusively to in-memory server state serialized to local JSON files (`uploads/class_roster_persistence.json`). They do not write to the live Supabase tables `public.hymns` or `public.coptic_taxis_items` (both have 0 rows in Supabase).
  3. **Teacher Sunday School Publishing Blocked by Empty Roster:** The publishing endpoint `/api/church/publish-approved-lesson-version` requires an active row in `public.servant_class_assignments`. In Supabase, `servant_class_assignments` has 0 rows; all live teacher publish requests will fail with `403 FORBIDDEN`.
  4. **No Administrator Account in Live Database:** In `public.profile_role_assignments`, there are 4 students, 3 teachers, 0 parents, and 0 admins. The Admin Control Center cannot be demonstrated with live authentication until an admin role assignment is added.

---

## 1. Project Architecture & Client-Server Connectivity

| Component | Technology | Configuration & Status |
| :--- | :--- | :--- |
| **Frontend** | React 19 SPA, Tailwind CSS v4 | Managed via Vite (`vite.config.ts`), PWA support enabled |
| **Backend** | Express 4.21, TypeScript | `server.ts` running on port 3000 |
| **Dev Mode** | `npm run dev` (`tsx server.ts`) | Vite middleware mounted directly inside Express (`server.ts:14544-14549`) |
| **Prod Mode** | `npm run build` / `npm start` | Vite bundles SPA to `dist/`, esbuild bundles `server.ts` to `dist/server.cjs` |
| **API Transport** | Relative `/api/*` endpoints | Direct local proxying via Vite middleware; no CORS or cross-origin latency |

### Findings:
- The integration between Express and Vite middleware is correctly configured.
- Client fetch requests across all components (e.g. `src/lib/roleService.ts`, `src/lib/studentProgressService.ts`, `src/lib/lessonPublishingService.ts`) use uniform relative paths starting with `/api/`.
- Client-side Supabase configuration (`src/lib/supabase.ts:49-58`) includes an automated runtime fallback: if client-side Vite environment variables are missing at build time, it fetches `/api/supabase/config` from Express to dynamically instantiate the Supabase client.

---

## 2. Authentication & Role-Based Access Control (RBAC)

### Server-Side Implementation (`server.ts:121-222`):
- **Verification Middleware:** `requireAssignedRoles(allowedRoles?)` calls `verifyServerRequestAuth(req)`.
- **Identity Resolution:**
  - Extracts Bearer token from `Authorization` header or `?token=` query parameter.
  - In non-production environments only, permits `test_jwt_` and `test_token_` prefixes for automated unit/mock tests.
  - In production, invokes `authClient.auth.getUser(token)` against Supabase Auth.
- **Role Verification:**
  - Performs trusted query using the Supabase Service Role client against `public.profile_role_assignments` where `user_id = verifiedUserId` and `revoked_at IS NULL`.
  - Enforces permitted roles: `student`, `parent`, `teacher`, `admin`.
- **Role Inquiry Endpoint:** `GET /api/church/me/roles` (`server.ts:310`) authoritatively returns assigned roles to the client.

### Client-Side Workspaces (`src/lib/workspaces.ts`):
- Strict workspace boundaries:
  - `student`: home, lessons, feed, calendar, hymns, taxis, agpeya, points, profile.
  - `parent`: home, children, journey, family, events, feed, profile.
  - `teacher`: home, studio, classManagement, attendance, mastery, lessons, sundaySchool, sources, preview, feed, communication, moderation, ai, profile.
  - `admin`: home, accounts, roles, families, classes, curriculum, security, support, role-requests, role-audit, profile.
- Navigation guard `canAccessWorkspace(roles, requested)` strictly restricts routing; unauthorized route visits automatically fall back to the account's primary default workspace.

### Live Database Role Inventory:
A live query of `public.profile_role_assignments` reveals:
- **Total active role assignments:** 7
- **Students:** 4
- **Teachers:** 3
- **Admins:** 0
- **Parents:** 0

> **Demonstration Risk:** Any attempt to demonstrate the Admin Control Center or Parent Portal using a live Supabase account will be rejected until corresponding rows are added to `public.profile_role_assignments`.

---

## 3. Supabase Database & Storage Integration

### Database Verification:
Live read-only inspection of the configured Supabase project (`https://rjwgnzuxpouihemloeaz.supabase.co`) confirmed table presence and row counts:

| Table Name | Presence in Live DB | Live Row Count | Notes |
| :--- | :--- | :--- | :--- |
| `profiles` | **EXISTS** | 7 rows | Matches Auth accounts |
| `profile_role_assignments` | **EXISTS** | 7 rows | 4 students, 3 teachers |
| `church_years` | **EXISTS** | 1 row | Active year: `2026-2027` |
| `class_instances` | **EXISTS** | 6 rows | Angels, Primary 1–3, Primary 4–6, Prep, Sec, Univ |
| `servant_class_assignments` | **EXISTS** | **0 rows** | **BLOCKER:** Blocks teacher Sunday School publishing |
| `lessons` | **EXISTS** | 0 rows | Ready for live curriculum ingestion |
| `lesson_versions` | **EXISTS** | 0 rows | Ready for live versioning |
| `lesson_sections` | **EXISTS** | 0 rows | Ready for lesson sections |
| `quiz_attempts` | **EXISTS** | 1 row | Persistence verified |
| `lesson_progress` | **EXISTS** | 0 rows | Ready for student progress |
| `media_objects` | **EXISTS** | 2 rows | Upload metadata records present |
| `hymns` | **EXISTS** | 0 rows | API currently uses local JSON persistence |
| `coptic_taxis_items` | **EXISTS** | 0 rows | API currently uses local JSON persistence |

### RPC Functions:
- `publish_lesson_version_immediately`: Confirmed present; enforces teacher/admin authentication.
- `publish_lesson_version`: Confirmed present; validates lesson and version existence.
- `record_lesson_completion`: Confirmed present; validates student role and atomically awards points.

### Storage Buckets:
- `stella-feed-media-v1`: Public bucket for community feed attachments.
- `stella-curriculum-media-v1`: Private bucket for curriculum sources, audio recordings, and liturgical guides.
- Both buckets confirmed configured via `GET /api/storage/status` (`server.ts:12898`).

---

## 4. Teacher Publishing & Student Retrieval

### A. Sunday School System
- **Teacher Workflow (`src/lib/lessonPublishingService.ts:408-460`):**
  - Teacher clicks publish in `LessonVersionStudio.tsx`.
  - Frontend calls `POST /api/church/publish-approved-lesson-version`.
  - Backend (`server.ts:4744-4913`) verifies:
    1. Authentication & teacher/admin role (`server.ts:4746-4752`).
    2. Version status is `APPROVED` with valid `approved_by` and `approved_at` (`server.ts:4789-4794`).
    3. Teacher class assignment in `servant_class_assignments` (`server.ts:4842-4855`).
    4. Calls Supabase RPC `publish_lesson_version_immediately` (`server.ts:4876`).
    5. Fails closed (HTTP 409 / 500) if Supabase write fails.
  - **Identified Blocker:** Because `servant_class_assignments` is currently empty in Supabase, line 4854 will reject all teacher publish attempts with `403 FORBIDDEN: Teacher is not assigned to a class for this lesson grade.`
- **Student Retrieval (`src/components/student/LessonView.tsx:51-163`):**
  - Resolves `currentVersionId` matching status `PUBLISHED`.
  - Enforces class grade boundaries (`LessonView.tsx:181-220`). Students in Prep cannot open Primary milestones.

### B. Hymns System
- **Teacher Publishing (`server.ts:13865-13938`):**
  - Endpoint `POST /api/church/hymns` validates title and level (1, 2, or 3).
  - Writes to `serverReviewState.hymnsCollection[hymnId]` and calls `savePersistentClassState()` to save to `uploads/class_roster_persistence.json`.
  - **Does NOT write to Supabase table `public.hymns`.**
- **Student Retrieval (`server.ts:13748-13816`):**
  - Students see only `status === 'published'` hymns matching their shared `hymns_taxis_level` (1, 2, or 3).
- **Audio Playback Failure:**
  - Uploaded audio generates `supabase-storage://stella-curriculum-media-v1/...` (`server.ts:13080`).
  - `HymnsSchoolTab.tsx:433` mounts `<audio src={selectedHymn.audioUrl} />` directly with the raw `supabase-storage://` URI.
  - Browsers cannot play custom URI schemes; audio playback fails silently or shows media error.

### C. Taxis / Coptic Rituals System
- **Teacher Publishing (`server.ts:14218-14280`):**
  - Endpoint `POST /api/church/taxis` validates Arabic title and curriculum level.
  - Writes to `serverReviewState.taxisCollection[id]` and calls `savePersistentClassState()`.
  - **Does NOT write to Supabase table `public.coptic_taxis_items`.**
- **Student Retrieval (`server.ts:14119-14172`):**
  - Filters by student's shared `hymns_taxis_level` and audience (`preparatory`, `deacons`, `all`).
- **Document / Media Link Failure:**
  - References in `documents` use raw `supabase-storage://` URLs without resolution through `/api/media-url`.

---

## 5. Student Lesson Viewing & Progress / Completion Persistence

### Section Reading & Lesson Completion Flow:
1. **Section Progress:** `POST /api/church/student-progress/complete-section` records section completion in server state.
2. **Completion Gating:** `LessonView.tsx:281-295` and `server.ts:5801-5808` strictly prohibit lesson completion until every section has been read.
3. **Completion Persistence:** `POST /api/church/student-progress/complete-lesson` calls `persistLessonCompletion()` (`server.ts:5459-5494`), which executes the database RPC:
   ```sql
   record_lesson_completion(p_student_id, p_lesson_id, p_completed_at)
   ```
4. **Fail-Closed Behavior:** If the database RPC returns an error, the endpoint aborts with HTTP 502 `PROGRESS_PERSISTENCE_FAILED`. Points and completion status are not awarded in memory when the database rejects the write.
5. **Cairo Date & Streak:** The server calculates the Cairo local date (`server.ts:5838`) to compute consecutive active days and update the student's streak idempotently.

### Quiz Attempts & Scoring:
1. **Server-Authoritative Scoring (`server.ts:6754-6783`):** The server compares submitted answer indices against `correctIndex` in the published version's `quizDraft`. Client-supplied scores are discarded.
2. **Durable Idempotency (`server.ts:6806-6850`):** Submissions with the same `idempotencyKey` or identical answer fingerprints return the existing recorded attempt without duplicate points.
3. **Database Write:** Attempts are mapped and inserted into `public.quiz_attempts`. Missing database configuration immediately returns HTTP 503 (`server.ts:6872`).

---

## 6. Main Navigation & User Journeys

| Role | Initial Landing | Primary Destinations | Secondary / Support Paths |
| :--- | :--- | :--- | :--- |
| **Student** | Student Adventure Map (`StudentAdventureHome.tsx`) | Lessons Roadmap, Feed, Calendar, Hymns, Taxis | Agpeya, Points / Rewards, Profile |
| **Parent** | Parent Dashboard (`ParentHomeTab.tsx`) | Children Overview, Family Altar, Calendar, Feed | Reward Requests Review, Profile |
| **Servant / Teacher** | Servant Dashboard (`TeacherDashboard.tsx`) | Lesson Version Studio, Class Roster, Sources Studio | Student Mastery, Attendance, Moderation, Profile |
| **Administrator** | Admin Workspace (`AdminWorkspace.tsx`) | Accounts, Roles, Classes, Church Year, Security | Audit Logs, Support Sessions, Profile |

- **Multi-Role Switching:** Accounts possessing multiple roles (e.g., Servant + Parent) can switch workspaces via the workspace switcher without losing credentials.
- **RTL & Internationalization:** Full Arabic (RTL) and English (LTR) language switching is preserved across all four workspaces.

---

## 7. Build Errors, Runtime Diagnostics & Missing Config

### Build & Compilation Diagnostics:
- `npm run lint` (`tsc --noEmit`): **PASSED** (0 errors).
- `npm run build`: **PASSED** (Client bundle and Node server bundle generated cleanly).
- Dev Server: Running stably on port 3000 (`http://localhost:3000`).

### Environment Variables:
All 7 required environment variables are set in the server process environment:
- `PORT`: Set (3000)
- `VITE_SUPABASE_URL`: Set
- `SUPABASE_URL`: Set
- `VITE_SUPABASE_ANON_KEY`: Set
- `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY`: Set
- `GEMINI_API_KEY`: Set

---

## 8. Existing Tests & Verification Scope

### Test Suite Summary:
- **Total Tests:** 143
- **Passed:** 140
- **Failed:** 1
- **Cancelled (Subtests):** 2

### Detail on Failed Test:
- **File:** `tests/media-storage-reference.test.ts`
- **Location:** Line 15, Column 5
- **Issue:** A `describe('persistent media upload confirmation', ...)` suite was accidentally nested inside an `it('round-trips an object path without storing a signed URL', ...)` test callback.
- **Consequence:** In Node.js native test runner (`node:test`), suites cannot be declared inside tests. This cancels the parent test and its subtests with `ERR_TEST_FAILURE`.
- **Remedy:** Move the closing brace of the first `it` block from line 46 to line 14 so that the `describe` block is a sibling suite.

### Verification Authenticity:
- **Unit & Mock Validation:** All 143 tests run against in-memory state or mocked HTTP endpoints.
- **Live Supabase Testing:** None of the automated tests connect to the live Supabase database or live Supabase Storage buckets.
- **Conclusion:** While business logic, permission rules, and data contracts are rigorously tested in unit suites, live database interactions rely on runtime inspection rather than automated regression scripts.

---

## Action Plan: 4 Recommended Fixes for Friday's Demonstration

To guarantee a seamless live demonstration on Friday, November 13, 2026, implement the following four targeted adjustments in VS Code:

### 1. Fix Media Resolution in Hymns & Taxis (High Priority)
- **Problem:** `HymnsSchoolTab.tsx:433` and `CopticTaxisTab.tsx:327` pass `supabase-storage://...` directly into `<audio src="...">` and `<a href="...">`. Additionally, `server.ts:12944-12980` in `/api/media-url` only checks `lessons` and `lesson_sources`, rejecting Hymns and Taxis requests with HTTP 403.
- **Fix:**
  1. Update `GET /api/media-url` in `server.ts` to allow student/teacher access to media associated with published hymns and taxis items.
  2. In `HymnsSchoolTab.tsx` and `CopticTaxisTab.tsx`, resolve `supabase-storage://` references via `fetch('/api/media-url?reference=' + encodeURIComponent(rawRef))` before setting audio playback sources.

### 2. Seed Servant Class Assignments in Supabase (High Priority)
- **Problem:** `public.servant_class_assignments` has 0 rows in Supabase. When a teacher publishes a lesson, `server.ts:4842-4855` queries this table and returns `403 FORBIDDEN: Teacher is not assigned to a class for this lesson grade.`
- **Fix:** In Supabase SQL Editor, insert a row into `servant_class_assignments` linking the demonstration teacher's `user_id` to `church_year_id = '2026-2027'` and the appropriate `class_instance_id` (e.g. `inst_2026-2027_preparatory`).

### 3. Assign an Administrator Role in Supabase (Medium Priority)
- **Problem:** `profile_role_assignments` has 0 admin rows. The Admin Control Center cannot be accessed with real Supabase Auth.
- **Fix:** In Supabase SQL Editor, insert a row into `profile_role_assignments` with `user_id = '<demo_user_id>'` and `role = 'admin'`.

### 4. Correct Test Suite Syntax in `tests/media-storage-reference.test.ts` (Low Priority)
- **Problem:** Nested `describe` block inside `it` block on line 15.
- **Fix:** Close `it('round-trips an object path...')` at line 14 before `describe('persistent media upload confirmation')`. All 143 tests will then report passing.
