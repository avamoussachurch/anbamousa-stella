# Stella Initial Admin Bootstrap — Read-Only Inspection

**Inspection date:** November 10, 2026  
**Scope:** Repository documentation and code only. No files other than this report were changed; no SQL, accounts, roles, or production records were touched.

## Findings

### 1. Dedicated existing bootstrap mechanism

**No.** There is no dedicated application-side bootstrap script, CLI command, or HTTP endpoint that invokes `public.provision_profile_role(p_user_id, p_role)`.

Repository-wide search found the RPC definition and grants in the SQL files, and references in security documentation and verification tests/scripts. There is no TypeScript/JavaScript caller for this RPC in `server.ts` or `scripts/`. The one role-management endpoint does not call it.

### 2. Definition and invocation path

- **Definition:** [`public.provision_profile_role`](./scripts/migrations/phase13_multi_role_accounts.sql), defined in `scripts/migrations/phase13_multi_role_accounts.sql` around line 444. It accepts `p_user_id UUID` and `p_role TEXT`.
- **Internal path:** The function permits only `auth.role() = 'service_role'`, then calls `public.grant_profile_role_internal(...)`. That helper validates the role, verifies that a matching row exists in `public.profiles`, inserts the active role assignment if one does not already exist, and writes a `role_change_audit` record.
- **Permissions:** The migration revokes execution from `PUBLIC`, `anon`, and `authenticated`, then grants it to `service_role`.
- **Existing server role-management path:** `/api/church/admin/role-assignments` in [`server.ts`](./server.ts) is guarded by `requireRoleAdmin` and calls `manage_profile_role`, not `provision_profile_role`. The corresponding `manage_profile_role` RPC requires an active admin actor and forbids self-role changes, so it cannot bootstrap the first admin.
- **Actual bootstrap invocation path in this repository:** None. The documented path is an authorized operator making a one-time call from a trusted server-side process using the provisioning RPC.

### 3. Credential boundary

The RPC itself checks that the database request role is `service_role`. The migration grants its execute permission only to that database role. Thus any valid caller must use a server-only service-role credential; a browser anon/publishable key or authenticated user session is insufficient.

The repository does not implement a caller that loads a service-role key and invokes this specific RPC. `server.ts` has generic trusted Supabase client helpers for other operations, but no `provision_profile_role` call.

### 4. Target account and profile verification

- **Documented operator procedure:** [`SUPABASE_SECURITY.md`](./SUPABASE_SECURITY.md) says the authorized operator must verify the intended account’s Auth user ID and profile before provisioning.
- **RPC-side check:** The RPC delegates to `grant_profile_role_internal`, which checks that the target ID exists in `public.profiles` and rejects unsupported roles. It does **not** independently call Supabase Auth Admin to verify an Auth user or validate that the profile belongs to an active, unsuspended Auth account.
- **Caller-side verification:** No bootstrap caller exists, so the documented operator verification is not automated or enforced by an application path.

### 5. Exposure and trust model

The documented initial-admin procedure requires trusted operator execution. The provisioning RPC is not exposed by a public HTTP route in this repository. The public application role endpoint `/api/church/admin/role-assignments` is not a bootstrap substitute: it requires an existing admin and calls the different, admin-actor `manage_profile_role` RPC.

### 6. Can it safely provision the initial admin without code changes?

**The database function is designed to permit trusted-service-role provisioning without an existing admin actor**, and the repository documents using it for initial-admin provisioning. Therefore, a code change is not inherently required if all of these conditions are met:

1. The Phase 13 schema/function and its service-role execute grant are already deployed and verified in the target project.
2. An authorized operator verifies the target’s Auth user ID and corresponding profile.
3. The operator invokes the RPC from a controlled trusted server-side process, keeping the credential out of the browser, source control, and chat.
4. The resulting role assignment and audit record are verified read-only afterward.

However, **this repository does not provide an executable bootstrap command or caller**. Whether the procedure can be performed now cannot be established from repository inspection alone; deployment state and access to an approved trusted operator environment must be confirmed. No invocation was attempted.

### 7. Exact documented command or procedure

[`SUPABASE_SECURITY.md`](./SUPABASE_SECURITY.md) documents this procedure: verify the intended Auth user ID and profile, then perform a one-time trusted server-side call to `provision_profile_role(user_id, 'admin')` with the server-only service-role credential. It explicitly says not to add admin self-signup/self-promotion, expose an unauthenticated endpoint, send the credential to a browser, or put it in source control.

**There is no exact shell command, script, or copy-paste RPC payload documented.** The documented procedure names the function and role but leaves the specific trusted invocation mechanism to an authorized operator. No command is supplied here because doing so would require inventing an undocumented credential-handling flow.

## Verification performed

- Read `SUPABASE_SECURITY.md`.
- Inspected `public.provision_profile_role`, its internal helper, and grants in `scripts/migrations/phase13_multi_role_accounts.sql`.
- Searched `server.ts`, `scripts/`, SQL, and project documentation for `provision_profile_role` and role-management callers.
- Inspected `/api/church/admin/role-assignments` and confirmed it calls `manage_profile_role` behind an admin gate.
- No SQL, RPC, HTTP call, account lookup, or role change was executed.
