import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('authorized profile routes select a separate profile component for each non-student role', async () => {
  const [router, app, student, parent, servant, admin, parentForm, servantForm, shared, server] = await Promise.all([
    readFile(new URL('./RoleAccountProfile.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../student/ProfileTab.tsx', import.meta.url), 'utf8'),
    readFile(new URL('./ParentAccountProfile.tsx', import.meta.url), 'utf8'),
    readFile(new URL('./ServantAccountProfile.tsx', import.meta.url), 'utf8'),
    readFile(new URL('./AdminAccountProfile.tsx', import.meta.url), 'utf8'),
    readFile(new URL('./ParentProfileForm.tsx', import.meta.url), 'utf8'),
    readFile(new URL('./ServantProfileForm.tsx', import.meta.url), 'utf8'),
    readFile(new URL('./RoleProfileShared.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../../server.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(router, /case 'parent':\s+return <ParentAccountProfile/);
  assert.match(router, /case 'teacher':\s+return <ServantAccountProfile/);
  assert.match(router, /case 'admin':\s+return <AdminAccountProfile/);
  assert.match(app, /activeWorkspace === 'parent'[\s\S]*?RoleAccountProfile role="parent"/);
  assert.match(app, /activeWorkspace === 'teacher'[\s\S]*?RoleAccountProfile role="teacher"/);
  assert.match(app, /activeWorkspace === 'admin'[\s\S]*?RoleAccountProfile role="admin"/);
  assert.match(app, /workspaceRole="student"/);
  assert.match(student, /getStudentActiveMembership/);
  assert.match(student, /getOrCreateChildLinkCode/);
  assert.doesNotMatch(student, /parent-' \+ manualParentEmail|Link Now|ربط الآن/);
  assert.match(student, /Hymns School Level/);
  assert.match(student, /updateMyHymnsTaxisLevel/);
  assert.match(student, /shares this setting with Coptic Taxis/);
  assert.doesNotMatch(student, /HymnsTaxisLevelSetup/);
  assert.match(student, /request a grade or enrollment change|طلب تعديل الصف أو التسجيل/);
  assert.doesNotMatch(student, /updateUserProfile\(\{[\s\S]{0,160}(?:grade|parentEmail|parentId|phone):/);
  assert.match(parent, /getAuthoritativeParentChildren/);
  assert.match(parent, /Linked children|الأبناء المرتبطون/);
  assert.match(parentForm, /ParentProfileForm/);
  assert.match(parentForm, /user\.email/);
  assert.doesNotMatch(parentForm, /childId|studentId|parent_id|phone/);
  assert.match(servant, /getServantAssignedClasses/);
  assert.match(servant, /Assigned classes|الفصول المسندة/);
  assert.match(servantForm, /ServantProfileForm/);
  assert.match(servantForm, /cannot be changed here|لا يمكن تعديلها هنا/);
  assert.match(admin, /refreshAssignedRoles/);
  assert.match(admin, /security and audit|الأمان والتدقيق/);
  assert.match(shared, /updateUserProfile\(\{ fullName: name\.trim\(\) \}\)/);
  assert.match(shared, /type AccountPreference/);
  assert.doesNotMatch(shared, /'roles'|'role'|'points'|'grade'|'classAssignments'|'permissions'/);
  assert.match(server, /app\.patch\('\/api\/account\/profile', requireAssignedRoles\(\)/);
  assert.match(server, /PROFILE_FIELD_NOT_EDITABLE/);
  assert.match(server, /targetStudentId = authContext\.userId/);
  assert.match(server, /bodyStudentId !== authContext\.userId/);
});
