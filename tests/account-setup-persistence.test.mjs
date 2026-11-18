import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('account setup completion is stored and read from a server-owned table', async () => {
  const migration = await read('../supabase/migrations/20261118173000_persist_account_setup_completion.sql');
  const server = await read('../server.ts');
  const service = await read('../src/lib/onboardingService.ts');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.account_setup_completions/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.account_setup_completions FROM PUBLIC, anon, authenticated/);
  assert.match(server, /app\.get\('\/api\/account\/setup-status'/);
  assert.match(server, /app\.post\('\/api\/account\/setup-complete'/);
  assert.match(server, /assignedRoles\.includes\(role as ServerRole\)/);
  assert.match(service, /export async function getAccountSetupStatus/);
  assert.match(service, /export async function completeAccountSetup/);
});

test('student, teacher, parent, and admin setup are marked complete only after server confirmation', async () => {
  const app = await read('../src/App.tsx');
  const wizard = await read('../src/components/auth/AccountSetupWizard.tsx');
  const student = await read('../src/components/auth/StudentOnboardingModal.tsx');
  assert.match(app, /getAccountSetupStatus\(\)/);
  assert.match(app, /status\.completedRoles\.includes\(role\)/);
  assert.match(wizard, /await completeAccountSetup\(role\)/);
  assert.match(student, /await completeAccountSetup\('student'\)/);
});
