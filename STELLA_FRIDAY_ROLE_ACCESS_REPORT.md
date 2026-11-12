# STELLA — Friday Demo Repair 1: Four-Role Access Verification

**Assessment date:** November 10, 2026  
**Repository:** `SITE-POLISH--Phase-1-Baseline`, HEAD `541e68900988907017a5ab57b2e433ccc5f75bae`  
**Outcome:** Live role inventory and authenticated admin access **could not be verified**. No account, role, database record, permission, or deployment setting was changed.

## Executive summary

- The application has server-authoritative multi-role resolution and server-side role checks. A workspace URL or client role by itself does not grant authorization.
- Current local `.env` contains Supabase URL and anon-key configuration, but **no server-only `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`**. `getTrustedRoleClient()` in [`server.ts`](./server.ts) requires one of those server-only keys to verify assigned roles. Thus this checkout cannot establish a trusted role lookup with its current local configuration.
- Read-only requests using only the configured anon key could not read `profile_role_assignments` or `user_relationships`. Anonymous counts for `servant_class_assignments`, `church_years`, and `class_instances` were zero; these are **not authoritative role/class inventory results** because the request was anonymous and the live RLS visibility was not established.
- No authenticated administrator session was available. `/api/church/me/roles` and the admin APIs could not be exercised as an authorized user. No exact demonstration account can be safely selected from the evidence available.
- The user confirmed that **no existing Admin account is available** for sign-in. This establishes that an admin demonstration account is currently unavailable to the user; it does not independently establish the live database’s admin assignment count.
- The previous audit’s reported counts are not treated as current.

## Verified active role inventory

| Inventory item | Verification result |
|---|---|
| Active admin assignments | **Could not be verified in the database.** Anonymous read of `profile_role_assignments` failed. The user reports no existing Admin account is available for sign-in. |
| Active teacher assignments | **Could not be verified** for the same reason. |
| Active parent assignments | **Could not be verified** for the same reason. |
| Active student assignments | **Could not be verified** for the same reason. |
| Active teacher-to-class assignments | **Could not be verified.** Anonymous `servant_class_assignments` query returned count 0, but that result is not sufficient to conclude the table is empty. |
| Active church year and class mapping | **Could not be verified.** Anonymous counts for `church_years` and `class_instances` were both 0, but are not authoritative without established RLS visibility or an authorized account. |
| Valid parent-to-child relationship | **Could not be verified.** Anonymous access to `user_relationships` failed; no signed-in parent was available to list linked children. |
| Safe demo account identities | **Not identified.** No account emails, names, IDs, passwords, or tokens were retrieved or disclosed. An authorized Admin account list is needed to select existing accounts. |

These are current investigation results, not a restatement of the previous audit’s counts.

## Role resolution and enforcement

1. [`registerWithSupabase` and `loginWithSupabase`](./src/lib/supabaseAuth.ts) register student accounts only; teacher and parent accounts require church administrator provisioning. The login helper loads the profile but returns no authoritative roles itself.
2. [`AuthContext`](./src/context/AuthContext.tsx) obtains a Supabase session, loads the user profile, then calls `fetchAssignedRoles`. Role lookup failures are logged and result in no assigned roles; cached legacy role fields do not substitute for the server’s assigned roles.
3. [`fetchAssignedRoles`](./src/lib/roleService.ts) sends the bearer token to `/api/church/me/roles`. The server verifies the token with Supabase Auth and reads active `profile_role_assignments` using a trusted server client.
4. [`workspaces.ts`](./src/lib/workspaces.ts) and [`App.tsx`](./src/App.tsx) restrict the displayed workspace and tabs to assigned roles. This is a UI guard, not the authorization boundary.
5. In [`server.ts`](./server.ts), `requireAssignedRoles`/`requireRoleAdmin` and route-specific checks verify roles server-side. The current Admin UI helper `adminRequest` in [`AdminWorkspace.tsx`](./src/components/admin/AdminWorkspace.tsx) sends the session bearer token to these routes.

### Local configuration blocker

`server.ts` calls `getTrustedRoleClient()` to read assigned roles. That helper throws if neither `SUPABASE_SECRET_KEY` nor `SUPABASE_SERVICE_ROLE_KEY` is configured. The local `.env` inspection found neither key set. This means local trusted role resolution is not verifiable and, with that configuration, `/api/church/me/roles` cannot establish the assigned role for a signed-in user. No secret value was read or printed.

This finding applies to the current local checkout configuration only. It does not establish whether the deployed production server has the required secret.

## Admin bootstrap documentation

[`SUPABASE_SECURITY.md`](./SUPABASE_SECURITY.md) documents the intended initial-admin process:

- Verify the intended account’s Auth user ID and profile.
- An authorized operator provisions the initial admin using the server-only `provision_profile_role(user_id, 'admin')` RPC with the service-role credential.
- Do not add a self-service admin sign-up or promotion path; do not expose the service credential to the browser or source control.

[`phase13_multi_role_accounts.sql`](./scripts/migrations/phase13_multi_role_accounts.sql) defines that trusted provisioning RPC and role-change audit behavior. It also defines `manage_profile_role`, which requires a trusted-server call and active admin actor and prevents self-role changes and revocation of the final active admin. [`phase13_multi_role_accounts_verify.sql`](./scripts/migrations/phase13_multi_role_accounts_verify.sql) and [`phase17_assigned_role_authorization_verify.sql`](./scripts/migrations/phase17_assigned_role_authorization_verify.sql) contain read-only verification queries.

The docs state the migration sequence and caution that migrations must be inspected and verified. Repository definitions do **not** prove which migrations or RPCs are deployed. No SQL or migration was executed as part of this task.

## Requested access checks

| Access check | Result |
|---|---|
| `/api/church/me/roles` for an existing account | **Not tested with a user session.** The current local server configuration also lacks its required trusted role-lookup key; the user reports no existing Admin account is available. |
| Admin workspace overview | **Not tested as an administrator.** Client-side workspace routing is not proof of API access. |
| Account and role management | **Not tested as an administrator.** Relevant routes are protected by `requireRoleAdmin`; no admin session was provided. |
| Servant/class assignments | **Not tested as an administrator or teacher.** Admin API is protected; the anon query result is not authoritative. |

Relevant admin routes in [`server.ts`](./server.ts) include `/api/church/admin/overview`, `/api/church/admin/accounts`, `/api/church/admin/role-assignments`, `/api/church/admin/classes`, and `/api/church/admin/servant-assignments`.

### Sign-in needed to continue

The user reports that no existing Admin account is available, so the authenticated admin checks remain blocked. Do not create or promote an account for this verification. If an authorized operator later identifies an existing Admin account, that user can sign in through the app; do not send a password, token, or service credential in chat. The local server must also have its already-approved server-only role-verification configuration before admin APIs can succeed.

To verify a parent-child connection, an existing parent must also sign in and open the linked-children view. To verify student and teacher experience, existing accounts of those roles should sign in separately; workspace selection alone is insufficient.

## Role operational assessment

- **Admin available:** No existing Admin account is available for sign-in, per the user. Active database assignments remain unverified.
- **Teacher with valid active class assignment:** Unknown; no authenticated assignment inventory or teacher session was available.
- **Parent with valid linked child:** Unknown; no authenticated parent session or relationship inventory was available.
- **Student access operational:** Code path exists and workspace restrictions are covered by local tests, but active student assignments and real sign-in/access are unverified. Local server role resolution is blocked by the missing server-only key configuration.
- **Demo accounts:** None identified. Select only from the verified account list after an authorized Admin session is available. Do not use guest/demo roles as evidence of production authorization.

## Remaining blockers and smallest safe resolutions

1. **Local trusted role lookup is not configured.** An authorized operator should confirm the deployment’s trusted-server secret is installed only in the intended server secret store. Do not put it in `VITE_` configuration, source control, or chat. Do not rotate or change production configuration as part of this verification.
2. **Live role/class/family inventory is unknown.** Have an existing authorized administrator use the Admin UI to inspect accounts and classes, or have an authorized operator run the documented read-only verification process. Do not grant roles or assignments to make the check pass.
3. **Authenticated API access remains unproven.** Sign in with existing authorized accounts and verify the corresponding server endpoints; do not infer access from client navigation.
4. **Deployed migrations remain unconfirmed.** An authorized operator should review migration history and run only the documented read-only verification checks through the approved database process. No SQL was run here.

## Tests and checks performed

- `npx tsx --test tests/workspaces.test.ts tests/server-auth.test.mjs tests/supabase-security.test.mjs` — **60 passed, 0 failed, 0 cancelled**.
- Tests cover client-side workspace routing and mocked server authorization/admin paths. They are local tests and do not establish production account assignments, deployed schema, or access by a real account.
- Anonymous Supabase REST reads were attempted for role assignments, servant/class assignments, church years, class instances, and verified relationships. Role-assignment and relationship reads failed; three anonymous counts returned 0. No result was treated as authoritative role inventory.
- Inspected `.env` configuration presence without displaying values. URL and anon-key configuration exist; server-only role-lookup keys do not.
- No application code, database records, roles, permissions, migrations, or deployment settings were changed.
