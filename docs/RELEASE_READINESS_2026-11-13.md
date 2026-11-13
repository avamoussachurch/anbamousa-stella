# Anba Mousa Release Readiness — 13 November 2026

## Executive status

**Code candidate:** merged to `main`; combined CI run #295 passed 281/281 tests and the production build.

**Production launch:** not yet approved. The live data does not currently contain enough verified curriculum or student/parent relationships for a real-school launch, and the Cloud Run revision cannot be inspected or smoke-tested from the connected GitHub/Supabase access.

This report deliberately separates verified code checks from live-data and deployment checks that still require a real authenticated session or the hosting console.

## Changes merged to `main`

### PR #70 — reduce repeated server traffic

- Stabilized the student leaderboard refresh against the whole AuthContext user object.
- Stabilized teacher/admin notification refresh against unrelated screen-time updates.
- Added regression tests for both paths.
- GitHub Actions CI run #289 passed: dependency install, TypeScript check, tests, trusted bootstrap syntax check, and production build.

### PR #71 — explicit Hymns/Taxis ownership

- Persistence adapters now map `createdBy` to `created_by`.
- The server overwrites creator identity with the verified auth user when constructing Hymns and Taxis insert payloads.
- Added adapter and server-route regression tests.
- GitHub Actions CI run #290 passed all validation steps.

**Diagnostic qualification:** the live database already has a `set_text_content_owner()` trigger that fills `created_by` from `auth.uid()`. The missing explicit field was therefore not proven to be the cause of the empty curriculum tables. The additional server assignment is defense-in-depth. Supabase logs for the last 30 days showed reads of Hymns/Taxis but no POST/PATCH write attempts, so a real authenticated teacher save is still required to establish why no content has been created.

## UI, accessibility, and mobile experience

- Arabic is the first-run default (`ar`); the root document starts RTL. Switching to English changes copy/language metadata while keeping the spatial layout anchored RTL, rather than flipping the whole application.
- The global sound preference persists locally; sound effects are optional and synthesized locally. The quiz victory splash includes performance, earned/total points, streak, confetti, and result-specific sound.
- Ambient world effects and quiz confetti honor reduced-motion preferences. CSS includes higher-contrast defaults and visible keyboard focus styles.
- Student Home is a responsive adventure/journey experience with ambient decoration. The full isometric Coptic village remains a **proposed specification**, not an implemented runtime map; do not represent the full village-world design as complete.
- PR #73 added route-level lazy loading. Entry JavaScript fell from 2,276.54 kB raw / 619.17 kB gzip to 960.23 kB raw / 273.80 kB gzip. Teacher, parent, admin, lesson viewer, and student feature screens are separate on-demand chunks. Vite still reports the shared entry chunk above its 500 kB raw warning threshold.
- The combined code-splitting CI run #295 passed TypeScript, 281 tests (0 failures, 0 skipped), trusted bootstrap syntax, and production build.

### PR #73 — on-demand workspace loading

- Lazy-loaded student feature tabs, lesson viewer, teacher/parent/admin workspaces, and profile/onboarding screens.
- Added a localized, accessible loading fallback.
- CI run #295 passed TypeScript, 281 tests, trusted bootstrap syntax, and production build.
- Reduced the entry JavaScript from 2,276.54 kB raw / 619.17 kB gzip to 960.23 kB raw / 273.80 kB gzip. The shared entry chunk still exceeds Vite's 500 kB raw warning threshold.

## Supabase checks

- Applied the existing Phase 21 policy migration so the live migration history records `phase21_admin_approved_lesson_version_insert`. The intended policy is recreated; no curriculum rows were changed.
- The Phase 22 student/class-change work is recorded in the database as `reconcile_phase22_student_class_change_requests`; the repository's source migration is `scripts/migrations/phase22_student_class_change_requests.sql`.
- Sent a PostgREST schema-cache reload notification.
- The previously observed `lesson_section_progress` 404s were no longer present in the subsequent 60-minute observation window: 9 requests returned 200 and 0 returned 404.
- RLS is enabled on the server-only audit, publication-job, media-reference, and section-progress tables; those tables have no end-user policies and are accessible to the trusted server role.
- The reviewed security-definer functions had no direct `anon` EXECUTE grants. Authenticated EXECUTE grants remain on application RPCs/helpers and should continue to be reviewed with their role checks.
- Supabase Security Advisor still reports leaked-password protection disabled. The connected Supabase controls available in this session do not expose the Auth password-protection setting; it must be enabled in the Supabase Auth settings before launch.
- The legacy public buckets `hymns-audio` and `lesson-worksheets` currently contain no objects. The curriculum media bucket is private. The feed-media bucket is public and contains two objects.

## Current live data inventory

Read-only counts captured on 13 November 2026:

| Data | Count |
|---|---:|
| Profiles | 7 |
| Active student role assignments | 4 |
| Active teacher role assignments | 3 |
| Active admin role assignments | 1 |
| Sunday School lessons | 5 |
| Published lessons | 3 |
| Draft lessons | 2 |
| Hymns | 0 |
| Coptic Taxis items | 0 |
| Active class memberships | 1 |
| Verified parent-child relationships | 0 |

Three published lesson records have test-like titles and must be reviewed or replaced before real students use the production curriculum. They have not been deleted or unpublished by this audit.

## Supabase quota and traffic

The organization usage snapshot supplied for the current billing cycle showed:

- Log ingestion: 4.373 GB / 1 GB.
- Log query: 193.687 GB / 100 GB.
- Egress: 5.749 GB / 5 GB.

The concentrated Node/Google Cloud traffic included repeated leaderboard-related reads. PR #70 removes the screen-time-driven refresh dependency, but its impact cannot be measured until the merged code is deployed. Recheck quota consumption and request volume after deployment; do not assume the fix alone will bring all quota meters below plan limits.

## Authenticated publishing smoke test

A new script, `scripts/smoke-test-hymns-taxis-production.mjs`, exercises the live authenticated path end-to-end:

1. Teacher creates a Hymn draft; teacher reads it back; teacher publishes it; a student with the matching assigned level retrieves it.
2. Teacher creates a Taxis draft; teacher submits it for review; a separate admin reviews and publishes it; a student with the matching assigned level retrieves it.
3. Unique QA records are deleted using a server-only service-role key in a `finally` cleanup path.

The script requires real, short-lived access tokens for a teacher, admin, and student, plus the Supabase service-role key for cleanup. It does not use fake test JWTs and must be run against the deployed app with dedicated QA accounts. CI syntax-checks the script, but the live E2E has **not** been run because this session has no real teacher/admin/student access tokens or Cloud Run request/log access.

Example environment variable names are documented in the script header. Never commit tokens or service-role keys.

## Remaining release blockers

1. **Curriculum content:** no Hymns or Taxis records exist. Load verified, church-approved content and perform one authenticated teacher create/update/publish plus student retrieval test for each system.
2. **Student roster:** only one active class membership exists for four student-role assignments. Confirm and assign the remaining students to the correct church-year/class groups.
3. **Parent experience:** there are no verified parent-child relationships. Create/verify real parent accounts and link them through the approved relationship flow before claiming parent E2E coverage.
4. **Published lesson quality:** review the three test-like published lessons and replace them with approved content or unpublish them before real student access.
5. **Auth security:** enable leaked-password protection in Supabase Auth settings.
6. **Hosting verification:** the repository has `npm run build` and `npm start`, and CI validates the build. There is no Cloud Run deploy workflow or Dockerfile in this repository. The actual Cloud Run service revision, runtime environment variables, secrets, health checks, and live browser behavior were not inspectable through the connected GitHub/Supabase tools.
7. **Post-deploy performance:** observe Supabase request volume, log ingestion, log-query usage, and egress after deploying the merged performance fix.

## What this audit did not do

- Did not deploy or change the Cloud Run service.
- Did not create fake student/parent accounts or fabricate parent relationships.
- Did not invent or insert unverified Coptic hymn/ritual content.
- Did not delete or rewrite live curriculum/student rows.
- Did not disable logging, weaken RLS, or remove security-definer grants wholesale.

## Release decision

**Do not treat the current production data as ready for real-school launch yet.** The merged code changes have passed their individual CI pipelines, and the live database migration/schema checks are reconciled for the reviewed changes. The remaining blockers are verified curriculum, real roster/parent data, Auth password protection, a combined-main CI run, and a post-deploy authenticated smoke test.
