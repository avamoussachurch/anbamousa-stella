# Supabase security hardening

## Migration and validation

For an existing Supabase project, apply `scripts/migrations/phase4_security_hardening.sql` only after all earlier tracked migrations. For a clean install, apply `supabase_schema.sql` and the tracked migrations in their documented order, then apply the Phase 4 migration last. The clean-install schema includes the same Phase 4 block; reapplying the additive migration last ensures later migrations cannot reintroduce permissive policies.

After applying the migration, run `scripts/migrations/phase4_security_hardening_checks.sql` in the Supabase SQL Editor as an administrator. The script makes no changes. Review its profile-role query and verify every existing `admin`, `teacher`, and `parent` assignment before relying on those privileges. Existing elevated roles are deliberately preserved, not automatically demoted.

The migration marks existing family relationships as unverified. Only relationships with a trusted `verified_at` value authorize parent access. Call `provision_verified_family_relationship(...)` only from a trusted process with the `service_role`; browser clients cannot execute it. Similarly, use `provision_profile_role(...)` from a trusted server when assigning elevated roles. No live project deployment or SQL validation is implied by these repository changes.

## Trusted-server dependencies

Authenticated browser clients can no longer write authoritative lesson progress, quiz attempts, profile role/points/grade/parent fields, family links, or lesson approval/publication state. Quiz-attempt reads retain a scoped student/assigned-teacher/admin policy. For `lesson_versions`, unknown policies are removed and no browser read policy is added; private version reads therefore require an explicitly designed trusted path. The migration also revokes authenticated execution of known lesson approval and publishing RPCs. Existing browser flows that depend on those reads or writes need a verified server-side implementation before they can succeed against a hardened database.

Lesson completion now uses the server-only `record_lesson_completion(...)` RPC. It accepts a student ID derived from the verified session, confirms the profile is a student, records completion, and awards the fixed first-completion amount in one database transaction. Configure `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` only in the trusted server environment; never set either with a `VITE_` prefix. Apply the updated hardening migration before expecting this endpoint to persist completion and points. Without the RPC migration or server-only key, the endpoint fails explicitly and does not report successful completion.

The application currently calls `publish_lesson_version` from the browser, and the tracked SQL files do not define that function or the `lesson_versions` table. The migration revokes browser access if the RPC exists, but its implementation and any additional approval RPCs must be inspected in the live project. Do not treat client-side prechecks as authorization.

Grade changes are now rejected by the browser enrollment helper when they do not match the stored profile. A trusted administrative path must update the grade before enrollment. Parent-child link verification and authoritative progress/reward updates likewise require trusted server workflows.

## Key handling

Only the Supabase URL and publishable/anon key belong in `VITE_` browser configuration. Never expose a secret/service-role key to Vite or commit it. The supplied secret key was exposed and must be rotated in the Supabase project before any trusted server uses its replacement. The replacement key must remain server-only.
