#!/usr/bin/env node
/**
 * One-time, operator-run bootstrap for the first Stella administrator.
 *
 * SECURITY:
 * - Run only from a trusted local terminal or controlled Cloud Shell.
 * - Never expose SUPABASE_SERVICE_ROLE_KEY to browser code or commit it.
 * - This invokes the database's service_role-only provision_profile_role RPC.
 * - Requires an explicit typed confirmation and refuses to run if an admin already exists.
 */

import { createClient } from '@supabase/supabase-js';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const targetEmail = process.env.STELLA_INITIAL_ADMIN_EMAIL?.trim().toLowerCase();

function fail(message) {
  console.error(`\nBootstrap stopped: ${message}`);
  process.exitCode = 1;
}

if (!supabaseUrl || !serviceRoleKey || !targetEmail) {
  fail('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and STELLA_INITIAL_ADMIN_EMAIL in this terminal session.');
} else if (!/^https:\/\//.test(supabaseUrl)) {
  fail('SUPABASE_URL must be the HTTPS URL of the intended Supabase project.');
} else if (!serviceRoleKey.startsWith('eyJ')) {
  fail('Use the legacy service_role JWT from the Supabase project API settings. Never use a publishable/anon key.');
} else {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .ilike('email', targetEmail)
      .maybeSingle();

    if (profileError) throw new Error(`Could not verify the target profile: ${profileError.message}`);
    if (!profile?.id || String(profile.email).toLowerCase() !== targetEmail) {
      throw new Error('No exact matching profile was found for STELLA_INITIAL_ADMIN_EMAIL.');
    }

    const { data: authResult, error: authError } = await supabase.auth.admin.getUserById(profile.id);
    if (authError) throw new Error(`Could not verify the Supabase Auth account: ${authError.message}`);
    if (!authResult?.user?.email || authResult.user.email.toLowerCase() !== targetEmail) {
      throw new Error('The Auth user email does not match the requested profile email.');
    }
    if (authResult.user.banned_until && new Date(authResult.user.banned_until) > new Date()) {
      throw new Error('The target Auth account is currently banned.');
    }

    const { count, error: adminCountError } = await supabase
      .from('profile_role_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .is('revoked_at', null);

    if (adminCountError) throw new Error(`Could not check existing administrators: ${adminCountError.message}`);
    if ((count || 0) > 0) {
      throw new Error('An active administrator already exists. Use the existing admin workflow instead of first-admin bootstrap.');
    }

    console.log('\nVerified target account:');
    console.log(`  Email: ${targetEmail}`);
    console.log(`  Existing profile role: ${profile.role || 'not set'}`);
    console.log('  Active administrators: 0');
    console.log('\nThis will grant the admin role through the database-protected service_role RPC and write the role audit record.');

    const rl = createInterface({ input: stdin, output: stdout });
    const answer = await rl.question(`Type "GRANT ADMIN TO ${targetEmail}" to continue: `);
    rl.close();

    if (answer.trim() !== `GRANT ADMIN TO ${targetEmail}`) {
      throw new Error('Confirmation did not match. No role was changed.');
    }

    const { error: provisionError } = await supabase.rpc('provision_profile_role', {
      p_user_id: profile.id,
      p_role: 'admin'
    });
    if (provisionError) throw new Error(`Trusted admin provisioning failed: ${provisionError.message}`);

    const { data: assigned, error: verifyError } = await supabase
      .from('profile_role_assignments')
      .select('id, role, revoked_at')
      .eq('user_id', profile.id)
      .eq('role', 'admin')
      .is('revoked_at', null)
      .maybeSingle();

    if (verifyError) throw new Error(`Role was provisioned, but read-back verification failed: ${verifyError.message}`);
    if (!assigned) throw new Error('Provisioning RPC returned without an active admin assignment. Do not assume success.');

    console.log(`\nVerified: ${targetEmail} now has an active admin role.`);
    console.log('Remove SUPABASE_SERVICE_ROLE_KEY from this terminal session when finished.');
  } catch (error) {
    fail(error instanceof Error ? error.message : 'Unexpected bootstrap failure.');
  }
}
