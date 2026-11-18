import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('first-login student setup is independent from the feature walkthrough and also runs for existing grades', async () => {
  const app = await read('../src/App.tsx');
  assert.match(app, /getAccountSetupStatus\(\)/);
  assert.match(app, /status\.completedRoles\.includes\(role\)/);
  assert.match(app, /setShowStudentOnboardingModal\(!completed && !dismissed\)/);
  assert.match(app, /localStorage\.setItem\('stella_' \+ role \+ '_account_setup_v1_' \+ userData\.id, 'completed'\)/);
});

test('teacher, parent, and administrator accounts each receive role-specific setup', async () => {
  const app = await read('../src/App.tsx');
  const wizard = await read('../src/components/auth/AccountSetupWizard.tsx');
  assert.match(app, /\['student', 'teacher', 'parent', 'admin'\]/);
  assert.match(app, /getAccountSetupStatus\(\)/);
  assert.match(wizard, /type SetupRole = 'teacher' \| 'parent' \| 'admin'/);
  assert.match(wizard, /Phone number \(optional\)/);
  assert.match(wizard, /await completeAccountSetup\(role\)/);
  assert.match(wizard, /Let’s set up your administrator account/);
  assert.doesNotMatch(wizard, /onClick=\{onComplete\}[^>]*aria-label=.*Close/);
});

test('optional contact phone is accepted, validated only when supplied, and persisted', async () => {
  const auth = await read('../src/context/AuthContext.tsx');
  const server = await read('../server.ts');
  const migration = await read('../supabase/migrations/202611170001_add_profile_contact_phone.sql');
  assert.match(auth, /'phone'/);
  assert.match(auth, /if \(updates\.phone !== undefined\)/);
  assert.match(server, /'contact_phone'/);
  assert.match(server, /body\.contact_phone !== null/);
  assert.match(server, /leave this field blank/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS contact_phone text/);
});

test('leaderboard routes are allowed in parent, teacher, and admin workspaces', async () => {
  const workspaces = await read('../src/lib/workspaces.ts');
  const navigation = await read('../src/components/layout/workspaceNavigation.ts');
  assert.match(workspaces, /parent: \[[^\]]*'leaderboard'/);
  assert.match(workspaces, /teacher: \[[^\]]*'leaderboard'/);
  assert.match(workspaces, /admin: \[[^\]]*'leaderboard'/);
  for (const role of ['parent', 'teacher', 'admin']) {
    assert.match(navigation, new RegExp(role + ': \\['));
  }
});
