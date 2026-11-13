import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('parent and teacher signup is allowed while student-only onboarding remains scoped', async () => {
  const auth = await read('src/lib/supabaseAuth.ts');
  assert.match(auth, /role: 'student' \| 'teacher' \| 'parent'/);
  assert.match(auth, /!\['student', 'teacher', 'parent'\]\.includes\(role\)/);
  assert.doesNotMatch(auth, /Teacher and parent accounts must be provisioned/);
  assert.match(auth, /account_role: role/);
  assert.match(auth, /role === 'student' \? \{/);
  assert.match(auth, /role,\s*grade: normalizedGrade/);
  assert.match(auth, /hymnsTaxisLevel: parsedLevel \|\| undefined/);
});

test('database signup trigger allowlists parent and teacher and rejects self-selected admin', async () => {
  const migration = await read('scripts/migrations/phase32_self_service_parent_teacher_registration.sql');
  assert.match(migration, /profile_role_assignments/);
  assert.match(migration, /on_auth_user_created_student_profile/);
  assert.match(migration, /create_role_assignment_for_new_profile/);
  assert.match(migration, /v_requested_role NOT IN \('student', 'parent', 'teacher'\)/);
  assert.match(migration, /v_requested_role := 'student'/);
  assert.match(migration, /INSERT INTO public\.profiles \(id, name, email, role\)/);
  assert.doesNotMatch(migration, /INSERT INTO public\.(?:class_memberships|servant_class_assignments|user_relationships)/);
  assert.match(migration, /SECURITY DEFINER[\s\S]*?SET search_path = ''[\s\S]*?SET row_security = off/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.create_student_profile_for_auth_user\(\) FROM PUBLIC, anon, authenticated/);
});

test('teacher registration does not assign a class and parent registration does not link a child', async () => {
  const login = await read('src/components/auth/LoginScreen.tsx');
  const auth = await read('src/lib/supabaseAuth.ts');
  assert.match(login, /role === 'student' \? selectedGrade : undefined/);
  assert.match(login, /role === 'student' \? selectedClassGroupId/);
  assert.match(auth, /Only students provide class\/grade and Hymns & Taxis onboarding details/);
  assert.match(auth, /account_role: role/);
  assert.doesNotMatch(auth, /user_relationships|class_memberships|servant_class_assignments/);
});
