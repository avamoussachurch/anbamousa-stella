# STELLA — Friday Full-Platform Readiness: Phase 1 Baseline

**Assessment date:** November 10, 2026  
**Scope:** Read-only repository investigation for Student, Teacher, Parent, and Admin.  
**Disposition:** Readiness is **not demonstrated**. The build and current local tests pass, but source inspection identifies broken or unproven production workflows and the live data/configuration required to operate them was not checked.

## 1. Repository baseline

| Item | Result |
|---|---|
| Branch | `SITE-POLISH--Phase-1-Baseline` |
| HEAD | `541e68900988907017a5ab57b2e433ccc5f75bae` (`docs: add Friday demonstration readiness audit report`) |
| Worktree | Clean at investigation start and after local checks; no application, SQL, database, permission, or deployment changes were made. This report is the only requested addition. |
| Existing readiness report | [`STELLA_FRIDAY_READINESS.md`](./STELLA_FRIDAY_READINESS.md) exists. Its 140/143 test summary is stale relative to the run below. |
| Build | `npm run build` — **passed**. Vite emitted a 2,235.73 kB minified JavaScript chunk warning and a mixed static/dynamic Supabase import warning. Server bundle completed. |
| Lint/type check | `npm run lint` — **passed** (`tsc --noEmit`; no separate ESLint script is configured). |
| Tests | **151 passed, 0 failed, 0 cancelled**, across 23 discovered test files. Command and discovery: `$files = Get-ChildItem -Path src,tests -Recurse -File -Include *.test.ts,*.test.tsx,*.test.mjs; & npx tsx --test $files.FullName`. There is no `test` script in [`package.json`](./package.json). |
| Diff whitespace check | `git diff --check` — **passed**. |

The test run is local and mock/static-oriented; it does not prove a live Supabase workflow. The existing report’s prior failure/cancellation counts did not reproduce in this checkout.

## 2. Authentication and four-role workflow matrix

Authentication starts in [`src/lib/supabaseAuth.ts`](./src/lib/supabaseAuth.ts): Supabase Auth creates/signs in users. Registration is restricted to students and requires a grade and Hymns/Taxis level; teacher and parent accounts must be provisioned. [`src/context/AuthContext.tsx`](./src/context/AuthContext.tsx) hydrates the profile and fetches assigned roles; [`src/lib/roleService.ts`](./src/lib/roleService.ts) calls `/api/church/me/roles`. The server verifies the bearer token with Supabase Auth and reads active `profile_role_assignments` in [`server.ts`](./server.ts). Workspace/tab routing is checked client-side by [`src/lib/workspaces.ts`](./src/lib/workspaces.ts) and [`src/App.tsx`](./src/App.tsx); protected API handlers also perform server-side authorization.

| Role | Frontend access and principal workflow | Backend/persistence path | Phase 1 assessment |
|---|---|---|---|
| **Student** | Student workspace; lesson library, lesson view, quizzes, progress, Hymns, and Taxis. Workspace/tab access depends on assigned roles. | Published lessons/versions/sections are read from Supabase by `getPublishedLessonsForCurrentUser`; progress and quiz operations call authenticated server endpoints and trusted Supabase RPCs. Hymns/Taxis use separate `/api/church/*` endpoints. | The ordinary role gate is present. The live catalog is reported empty, and the progress API’s server-local lesson/roster assumptions do not match the Supabase-backed lesson reader. Hymns/Taxis also do not obtain their bearer token from the authenticated Supabase session (see blockers). |
| **Teacher** | Teacher workspace includes class management, authoring, review, publishing, and student preview. | `lessonAuthoringService` writes drafts/versions/sections to Supabase. Publishing calls `/api/church/publish-approved-lesson-version`, which checks approval metadata, active-year class mapping, and the teacher’s active `servant_class_assignments` row before calling the publish RPC. Class/servant operations use class/admin APIs. | The authorization checks are explicit. The initial audit reports no servant assignments, which would block a real teacher publish; that live state was not re-queried. Hymns/Taxis authoring also suffers from the missing bearer-token propagation and local-file persistence. |
| **Parent** | Parent workspace, Add Child, linked-child list, child learning review, family/events. [`ParentDashboard`](./src/components/parent/ParentDashboard.tsx) and child review components call the parent service. | `linkChildByCodeAsync` calls `/api/church/parent/connect-child`; the server verifies the parent role and persists a verified `user_relationships` row. Child listing/review checks active student roles and reads progress, sections, and quiz attempts from Supabase. | The authenticated flow is present and role-scoped in code. The initial audit reports no parent roles; no live parent account, connection, or review flow was verified. |
| **Admin** | Admin workspace sections for accounts, roles, families, classes, curriculum, security/audit, and support. [`AdminWorkspace`](./src/components/admin/AdminWorkspace.tsx) sends authenticated requests. | Current UI endpoints use `requireRoleAdmin`, trusted server Supabase access, audited role-management RPCs, and database-backed admin/class views in [`server.ts`](./server.ts). | The role gate and administrative paths exist. The initial audit reports no confirmed active admin assignment; without one, the admin workspace cannot be reached and its APIs reject requests. This database state was not independently checked. |

### Permission and role-resolution observations

- The normal account role source is active `profile_role_assignments`, not a client-selected workspace or cached legacy role. The server verifies identity and roles before returning `/api/church/me/roles`; the UI rejects unassigned workspaces.
- Students can self-register; teacher/parent registration is intentionally withheld for administrator provisioning. The login/register UI does not offer self-assigned admin access.
- The Hymns/Taxis service token handling is inconsistent with the rest of the app: those services read `localStorage['church_auth_token']`, while the repository contains no writer for that key. The server expects a bearer token and derives roles from it. This breaks role-specific behavior and authenticated mutations on those endpoints.
- The completion RPC still checks the legacy singular `profiles.role = 'student'` rather than an active assigned student role. The platform supports multiple assigned roles, so a student who also has another primary legacy role may be unable to complete a lesson. The exact deployed profile/assignment combinations are unknown.

## 3. Critical workflow traces

### Student lessons, media, completion, and progress

1. [`LessonsContext`](./src/context/LessonsContext.tsx) selects the teacher curriculum for the teacher workspace and the published student reader otherwise. [`getPublishedLessonsForCurrentUser`](./src/lib/curriculumService.ts) reads `lessons`, then active `lesson_versions` with `PUBLISHED` status, then ordered `lesson_sections`; it returns an empty list when no lesson rows exist.
2. [`LessonView`](./src/components/student/LessonView.tsx) starts progress and submits section reads/completion through [`studentProgressService`](./src/lib/studentProgressService.ts). The server exposes start, complete-section, and complete-lesson endpoints. Section state is written/read with `set_lesson_section_read` and `lesson_section_progress`; final completion calls `record_lesson_completion`, which records `lesson_progress` and points.
3. There is a significant boundary mismatch: the lesson reader uses Supabase records, but the server progress routes use `serverReviewState.lessons`, `serverReviewState.versions`, and `serverReviewState` class membership. `ensurePublishedLessonAndVersion` manufactures demo sections such as `sec-1` when it does not find a version in that local state. Production `lesson_sections.id` values are UUIDs. The complete-section endpoint validates the submitted section against that local/demo section list before the Supabase write. `getStudentClassGroups` likewise reads only local/persisted server state, not the current Supabase roster. A real published lesson/roster is therefore not proven to pass progress authorization or section validation.
4. Sunday School lesson media has a signed-URL path in [`SundaySchoolLessonView`](./src/components/sunday-school/student/SundaySchoolLessonView.tsx). Hymns/Taxis media does not: [`HymnsSchoolTab`](./src/components/hymns/HymnsSchoolTab.tsx) puts the stored audio reference directly in `<audio src>`, while [`CopticTaxisTab`](./src/components/taxis/CopticTaxisTab.tsx) puts document references directly in `<a href>`. The private-media URL endpoint only authorizes the owner/admin or published lesson/source references, not Hymns/Taxis records.

### Teacher class assignment, curriculum authoring, and publishing

- Draft authoring is a direct authenticated Supabase path: `createLessonDraft` in [`lessonAuthoringService`](./src/lib/lessonAuthoringService.ts) inserts a lesson, an `AI_DRAFT` version, and optional sections.
- Admin servant assignment is database-backed through `/api/church/admin/servant-assignments` in [`server.ts`](./server.ts); the UI uses it from [`AdminWorkspace`](./src/components/admin/AdminWorkspace.tsx). Publishing requires a teacher’s active assignment to the class matching the lesson grade and active church year, approved version metadata, and a successful publish RPC.
- The user’s initial audit reports zero `servant_class_assignments`. If still true, the code’s teacher publishing gate returns 403. We did not inspect or change live records.
- The source supports workflow steps, but no real approved lesson was published and then retrieved by a real student during this read-only phase.

### Parent linking and progress viewing

- Authenticated parent linking posts a child code to `/api/church/parent/connect-child`. The server checks parent role, resolves a unique child code, checks the active student role, and upserts a verified relationship.
- `getAuthoritativeParentChildren` calls `/api/church/parent/children`. Child progress review calls `/api/church/parent/child-learning-review/:studentId`, which checks that the parent is linked to the child and reads `lesson_progress`, `lesson_section_progress`, and `quiz_attempts`.
- These are database-backed code paths; live roles, a valid child code, relationship RLS/grants, and a complete parent-to-child view were not tested.

### Admin management and role administration

- The current Admin workspace uses `/api/church/admin/*` endpoints, protected by `requireRoleAdmin`. Role changes go through `manage_profile_role`, protect against self-change and removal of the last active admin, and write role audit data. Admin class assignment validates the active teacher role and active-year class.
- A prior set of server endpoints also manages in-memory review state; the current `AdminWorkspace` requests the newer database-backed endpoints for its account/role/class views. No real administrator session was available for end-to-end verification.

### Sunday School, Hymns, and Taxis persistence/retrieval

- Sunday School lesson authoring/retrieval is wired to `lessons`, `lesson_versions`, and `lesson_sections` in Supabase; publishing and completion use RPCs. The reported initial zero rows mean there may be no real student curriculum to retrieve.
- Hymns/Taxis client services call `/api/church/hymns` and `/api/church/taxis`. The server’s canonical collections are `serverReviewState.hymnsCollection` and `serverReviewState.taxisCollection`; `savePersistentClassState` serializes them to `uploads/class_roster_persistence.json` / `uploads/church_year_classes_persistence.json`. These routes do not write to the Supabase `hymns` or `coptic_taxis_items` tables. The current client also has local fallbacks. This is not a Supabase-backed persistence path.

## 4. Launch blockers and findings

Severity describes launch impact; “confirmed” means confirmed from repository code. Live database state and user-level behavior were not independently verified.

### F1 — Student progress is bound to demo/server-local lesson and roster state

- **Severity:** High
- **Exact paths:** [`ensurePublishedLessonAndVersion`](./server.ts), [`getStudentClassGroups`](./server.ts), `/api/church/student-progress/start`, `/api/church/student-progress/complete-section` in [`server.ts`](./server.ts); Supabase lesson retrieval in [`curriculumService.ts`](./src/lib/curriculumService.ts); section submission in [`studentProgressService.ts`](./src/lib/studentProgressService.ts).
- **Root cause/evidence:** Lesson delivery reads Supabase, while progress authorization/section validation reads `serverReviewState`. When a version is missing from this state, the helper synthesizes a published demo version with non-database section IDs; class authorization reads only local/persisted memberships. The Supabase schema defines `lesson_sections.id` as UUID. These paths do not establish that the real DB lesson version, section IDs, or current class enrollment were loaded before progress writes.
- **Affected:** Student lesson start, section completion, completion/progress; teacher preview-to-student handoff and parent progress depend on the resulting records.
- **Status:** **Confirmed code mismatch; live failure not exercised** because no live published lesson/user was available. Initial audit reports the curriculum tables are empty.
- **Smallest safe repair:** Make progress handlers validate the lesson’s current published version, its actual section IDs, grade/class membership, and stored progress from trusted Supabase records. Keep demo fixtures isolated to explicit test/demo requests; do not allow them to stand in for production records.
- **Verification required:** With an authenticated student in an active assigned class, start a real published lesson, read every DB-backed section, reload, finish once, and verify section/progress/points rows and the returned UI state. Also verify draft, stale-version, wrong-class, and wrong-student requests are rejected. Repeat after a server restart.

### F2 — Hymns/Taxis requests do not forward the Supabase access token

- **Severity:** High
- **Exact paths:** `getAuthHeaders` in [`hymnsService.ts`](./src/lib/hymnsService.ts); `getTaxisItems`, `saveTaxisItem`, and `createTaxisDraft` in [`taxisService.ts`](./src/lib/taxisService.ts); server role resolution in [`server.ts`](./server.ts).
- **Root cause/evidence:** The services read `localStorage['church_auth_token']`; repository-wide search found no production code that writes this key. Other authenticated services retrieve the current access token from `supabase.auth.getSession()`. Server endpoints rely on the request authorization header to resolve role assignments. Thus Hymns/Taxis requests arrive unauthenticated: teacher/admin reads are restricted to guest/public behavior, level 2/3 student reads can be wrong/empty, and role-protected mutations are rejected. `saveTaxisItem` can fall through to local storage when the token is absent, creating a success-shaped local result instead of an authoritative server save.
- **Affected:** Student level-filtered retrieval; teacher/admin Hymns and Taxis authoring, review, and publishing.
- **Status:** **Confirmed code defect**; no authenticated server request was made in this phase.
- **Smallest safe repair:** Build these request headers from the existing Supabase session helper and make authenticated server failures explicit instead of falling through to demo/local success.
- **Verification required:** Inspect a real request to ensure a valid bearer token is attached; confirm role-specific student levels, teacher/admin views and mutations, persistence after reload, and explicit expired-session errors.

### F3 — Hymns and Taxis are not persisted to their Supabase tables

- **Severity:** High
- **Exact paths:** `serverReviewState.hymnsCollection`, `serverReviewState.taxisCollection`, and `savePersistentClassState` in [`server.ts`](./server.ts); Hymns/Taxis API clients in [`hymnsService.ts`](./src/lib/hymnsService.ts) and [`taxisService.ts`](./src/lib/taxisService.ts).
- **Root cause/evidence:** CRUD routes mutate in-memory collections and serialize them to local JSON files. They do not use `public.hymns` or `public.coptic_taxis_items`. The initial audit reports those database tables have zero rows; that count is not re-verified here.
- **Affected:** Teacher authoring/publishing and student retrieval for Hymns and Taxis; persistence across hosts, deploys, or server instances is not established.
- **Status:** **Confirmed architecture gap**; actual file durability depends on deployment topology, which was not inspected.
- **Smallest safe repair:** Route these CRUD/review/read operations through the existing Supabase tables and their intended RLS/service authorization; retain local fixtures only for explicit demo mode.
- **Verification required:** Create/review/publish using an authenticated teacher/admin, confirm corresponding Supabase rows and status, read as the correct student level, and verify the same data from another process and after restart.

### F4 — Private Hymns/Taxis media references are not playable through the current UI

- **Severity:** High
- **Exact paths:** `<audio src={selectedHymn.audioUrl}>` in [`HymnsSchoolTab.tsx`](./src/components/hymns/HymnsSchoolTab.tsx); `href={doc.fileUrl}` in [`CopticTaxisTab.tsx`](./src/components/taxis/CopticTaxisTab.tsx); `/api/media-url` in [`server.ts`](./server.ts).
- **Root cause/evidence:** The UI passes `supabase-storage://` references directly to browser media/link elements, unlike the Sunday School view which requests authorized URLs. `/api/media-url` signs private files only when the requester owns them/is admin or a published lesson/source references them; no Hymns/Taxis association is checked. A UI-only conversion to signed URLs would therefore still be rejected for these records.
- **Affected:** Student Hymns audio and Taxis documents/media; teacher preview may work only when the uploader owns the object.
- **Status:** **Confirmed code-path defect**; no live private object was fetched or played.
- **Smallest safe repair:** Resolve private references through an authenticated media flow and authorize access against the published Hymns/Taxis record and assigned level; do not make curriculum storage public.
- **Verification required:** Play/download a real private Hymns/Taxis object as an authorized student, refresh after signed URL expiry, and confirm unrelated users and unpublished records remain denied.

### F5 — Current live curriculum/teacher assignment state is a conditional publishing blocker

- **Severity:** High
- **Exact paths:** `/api/church/publish-approved-lesson-version` in [`server.ts`](./server.ts); published reader in [`curriculumService.ts`](./src/lib/curriculumService.ts).
- **Root cause/evidence:** The publish endpoint requires approved version metadata and an active teacher assignment for the grade’s class in the active church year. The student reader returns no lessons when `lessons` has no rows. The user’s initial audit and the existing [`STELLA_FRIDAY_READINESS.md`](./STELLA_FRIDAY_READINESS.md) report zero `lessons`, `lesson_versions`, `lesson_sections`, and `servant_class_assignments`.
- **Affected:** Teacher Sunday School publishing and Student lesson retrieval/progress.
- **Status:** **Code gates confirmed; live row counts are reported, not independently re-queried.** If the reported state remains current, teacher publish will be denied for lack of assignment and the student lesson catalog will be empty.
- **Smallest safe repair:** After a verified admin is available, provision the correct active-year teacher/class assignment and author/publish real curriculum through the normal workflow. Do not seed test or replacement content.
- **Verification required:** Read-only confirm live counts and active-year/class mapping; then publish an approved real lesson as its assigned teacher and retrieve it as an enrolled student.

### F6 — No confirmed active administrator is an operational access gate

- **Severity:** High
- **Exact paths:** `fetchAssignedRoles` in [`roleService.ts`](./src/lib/roleService.ts); `requireRoleAdmin` and `/api/church/admin/*` handlers in [`server.ts`](./server.ts); [`AdminWorkspace`](./src/components/admin/AdminWorkspace.tsx).
- **Root cause/evidence:** Admin access requires an active `admin` assignment; role selection is not self-service, and admin role management itself requires an admin. The initial audit reports no administrator assignment.
- **Affected:** Admin accounts, role administration, class assignment, and audited admin workflows.
- **Status:** **Conditional blocker based on the initial audit; not live-verified.** If no active admin exists, the Admin UI and its role/class operations are unavailable.
- **Smallest safe repair:** Use the approved, controlled administrator bootstrap process, then manage all later grants/revocations through the audited admin workflow. No role was granted in this phase.
- **Verification required:** Confirm an unsuspended account has an active admin assignment, sign in, fetch `/api/church/me/roles`, and verify Admin overview, role audit, account, and servant-assignment views. Confirm non-admin requests remain denied.

### F7 — Completion RPC uses a legacy singular role check

- **Severity:** Medium
- **Exact path:** `public.record_lesson_completion` in [`supabase_schema.sql`](./supabase_schema.sql).
- **Root cause/evidence:** The RPC checks `profiles.role = 'student'`; current authentication/workspace authorization uses active multi-role assignments. A valid student assignment paired with a different legacy primary `profiles.role` can be rejected by the completion transaction.
- **Affected:** Lesson completion and points for multi-role student accounts.
- **Status:** **Confirmed schema-level inconsistency; affected live account combinations are unknown.**
- **Smallest safe repair:** Align the completion RPC’s student authorization with the active assigned-role model in a reviewed migration, preserving the trusted-server-only write restriction.
- **Verification required:** Test completion for student-only and multi-role users with differing legacy profile roles; verify non-students cannot write and repeat completion awards no duplicate points.

## 5. Prioritized repair queue

Order within each group is recommended implementation order; resolve the live-state gates before scheduling demonstrations.

### 1. Authentication and role permissions

1. Verify current active role inventory using an approved read-only check. Resolve the admin bootstrap gate through the authorized process; then confirm `/api/church/me/roles` and admin-only denial behavior.
2. Repair Hymns/Taxis access-token acquisition and remove unauthenticated success/local-write fallbacks (F2).
3. Check `record_lesson_completion` against active assigned roles for multi-role users and plan a reviewed migration if needed (F7).

### 2. Curriculum persistence and publishing

1. Read-only verify the reported curriculum and class-assignment counts, active church year, classes, and relevant RPC availability.
2. Once an admin is confirmed, assign the intended teacher to the actual active class through the audited workflow; author and approve a real lesson, then publish through the normal RPC path (F5).
3. Persist Hymns/Taxis through their Supabase tables instead of local JSON (F3).

### 3. Student learning and progress

1. Reconcile progress server handlers with authoritative Supabase lesson/version/section and roster records (F1).
2. Run real student start → section read → completion → quiz persistence and verify DB readback, idempotency, points, and parent-visible progress.

### 4. Parent and admin workflows

1. Verify an active parent account, a valid child connection code, verified relationship creation, linked-child listing, and child learning review.
2. Verify admin account/role changes, servant assignment, audit writes, and role revocation/last-admin protections with a real authorized admin.

### 5. Media and presentation reliability

1. Add published-record-aware signed URL resolution for Hymns/Taxis private media and validate authorization/expiry behavior (F4).
2. Reassess the large JS chunk and mixed Supabase import warning after functional blockers; these are build warnings, not evidence that the learning workflows work.

## 6. What this phase could not verify

- Current production row counts for lessons, versions, sections, Hymns, Taxis, role assignments, class assignments, parent relationships, or progress.
- Which migrations/RPC definitions/policies/grants are actually installed in the target Supabase project; availability of trusted server configuration and deployment topology.
- A real student, teacher, parent, or admin authenticated end-to-end workflow; live Sunday School publishing, completion, quiz award, family link, or admin role operation.
- Whether private media objects exist, their bucket policy/metadata, signed URL access, or playback in a real browser.
- Whether local server JSON data survives the actual deployment lifecycle or is shared across instances.
- Any production readiness conclusion. No Supabase connection or production read/write was attempted; no SQL, migrations, data, permissions, source files, or deployment settings were changed.
