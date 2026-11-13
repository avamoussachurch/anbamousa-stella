import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);

test('Phase 33 grants teacher parent-workspace eligibility without bypassing family verification', async () => {
  const migration = await readFile(new URL('scripts/migrations/phase33_teacher_parent_dual_workspace.sql', root), 'utf8');
  assert.match(migration, /NEW\.role = 'teacher'/);
  assert.match(migration, /grant_profile_role_internal\([\s\S]*?'parent'[\s\S]*?'registration'/);
  assert.match(migration, /profile_role_assignments AS ra[\s\S]*?ra\.role = 'teacher'[\s\S]*?ra\.revoked_at IS NULL/);
  assert.match(migration, /verified family links/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.grant_parent_workspace_to_teacher\(\) FROM PUBLIC, anon, authenticated/);
  assert.doesNotMatch(migration, /INSERT INTO public\.(?:user_relationships|class_memberships|servant_class_assignments)/);
});
