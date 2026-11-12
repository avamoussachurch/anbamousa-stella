import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const migrationUrl = new URL('../scripts/migrations/phase19_curriculum_access_isolation.sql', import.meta.url);
const sql = await readFile(migrationUrl, 'utf8');

function modeledLessonAccess({
  role,
  published,
  activeVersionPublished,
  lessonGroup,
  assignedGroups = [],
  ownsLesson = false,
  verifiedLinkedChild = false
}) {
  const roles = Array.isArray(role) ? role : [role];
  if (roles.includes('admin')) return true;
  if (roles.includes('teacher') && (ownsLesson || assignedGroups.includes(lessonGroup))) return true;
  return published && activeVersionPublished && (
    (roles.includes('student') && assignedGroups.includes(lessonGroup))
    || (roles.includes('parent') && verifiedLinkedChild && assignedGroups.includes(lessonGroup))
  );
}

function modeledGradeClassGroup(gradeLevel) {
  const grade = (gradeLevel ?? '').trim().toLowerCase();
  const normalized = grade.replace(/[^a-z0-9]+/g, ' ').trim();
  if (/(^|[^a-z0-9])primary_2([^a-z0-9]|$)/.test(grade)) return 'primary_2';
  if (/(^| )primary [1-3]( |$)/.test(normalized)) return 'primary_1';
  if (/(^| )primary [4-6]( |$)/.test(normalized)) return 'primary_2';
  return null;
}

function modeledRelatedRead({ parentLessonReadable, isActiveVersion, canReview = false }) {
  if (!parentLessonReadable) return false;
  return canReview || isActiveVersion;
}

function modeledSourceLinkRead({ sectionLessonReadable, sourceLessonReadable }) {
  return sectionLessonReadable && sourceLessonReadable;
}

function modeledSourceRead({ lessonReadable, canReview = false, attachedToActiveVersion = false }) {
  return canReview || (lessonReadable && attachedToActiveVersion);
}

test('Phase 19 replaces broad reads on lessons, versions, and sections', () => {
  assert.match(sql, /BEGIN;\s*[\s\S]*CREATE POLICY lessons_select_isolated/);
  assert.match(sql, /CREATE POLICY lesson_versions_select_isolated/);
  assert.match(sql, /CREATE POLICY lesson_sections_select_isolated/);
  assert.match(sql, /cmd IN \('SELECT', 'ALL'\)/);
  assert.match(sql, /lesson_sections_write_policy/);
  assert.match(sql, /DROP POLICY IF EXISTS lesson_sections_write_policy/);
  assert.match(sql, /DROP POLICY IF EXISTS lesson_sections_insert_teacher/);
  assert.match(sql, /DROP POLICY IF EXISTS lesson_sections_update_teacher/);
  assert.match(sql, /DROP POLICY IF EXISTS lesson_sections_delete_teacher/);
  assert.match(sql, /lesson_sources_select_isolated/);
  assert.match(sql, /lesson_section_sources_select_isolated/);
  assert.match(sql, /DROP POLICY IF EXISTS lesson_sources_insert_teacher/);
  assert.match(sql, /DROP POLICY IF EXISTS lesson_section_sources_insert_teacher/);
  assert.match(sql, /tablename = 'lesson_sources' AND policyname = 'lesson_sources_write_policy'/);
  assert.match(sql, /tablename = 'lesson_section_sources'/);
  assert.match(sql, /COMMIT;\s*$/);
  assert.doesNotMatch(sql, /ALTER TABLE public\.(lessons|lesson_versions|lesson_sections) FORCE ROW LEVEL SECURITY/);
});

test('student reads require active class match and the active published version', () => {
  const baseline = {
    role: 'student',
    published: true,
    activeVersionPublished: true,
    lessonGroup: 'primary_2',
    assignedGroups: ['primary_2']
  };
  assert.equal(modeledLessonAccess(baseline), true, 'assigned student reads their class lesson');
  assert.equal(modeledLessonAccess({ ...baseline, lessonGroup: 'primary_1' }), false, 'cross-class lesson is denied');
  assert.equal(modeledLessonAccess({ ...baseline, published: false }), false, 'unpublished lesson is denied');
  assert.equal(modeledLessonAccess({ ...baseline, activeVersionPublished: false }), false, 'non-published active version is denied');

  assert.match(sql, /membership\.status = 'active'/);
  assert.match(sql, /church_year\.is_active = true/);
  assert.match(sql, /active_version\.status = 'PUBLISHED'/);
  assert.match(sql, /lesson\.active_version_id = lesson_versions\.id/);
});

test('grade mapping distinguishes the primary_2 class group from grade two', () => {
  assert.equal(modeledGradeClassGroup('primary_2'), 'primary_2');
  assert.equal(modeledGradeClassGroup('Primary 2'), 'primary_1');
  assert.equal(modeledGradeClassGroup('Primary 4'), 'primary_2');

  const explicitGroupMapping = sql.indexOf("IF v_grade ~ '(^|[^a-z0-9])primary_2");
  const normalizedGradeMapping = sql.indexOf("IF v_normalized ~ '(^| )primary [1-3]");
  assert.notEqual(explicitGroupMapping, -1, 'SQL handles the explicit class-group encoding');
  assert.ok(explicitGroupMapping < normalizedGradeMapping, 'explicit class-group mapping precedes normalized grades');
  assert.doesNotMatch(sql, /IF v_normalized ~ '\(\^\| \)primary 2/);
});

test('teachers, admins, and verified linked parents retain scoped access', () => {
  const assignedLesson = {
    role: 'teacher',
    published: false,
    activeVersionPublished: false,
    lessonGroup: 'preparatory',
    assignedGroups: ['preparatory']
  };
  assert.equal(modeledLessonAccess(assignedLesson), true, 'teacher may review curriculum in assigned class');
  assert.equal(modeledLessonAccess({ ...assignedLesson, assignedGroups: [] }), false, 'unassigned teacher cannot read another draft');
  assert.equal(modeledLessonAccess({ ...assignedLesson, assignedGroups: [], ownsLesson: true }), true, 'teacher retains own draft access');
  assert.equal(modeledLessonAccess({ ...assignedLesson, role: 'admin', assignedGroups: [] }), true, 'admin retains access');
  assert.equal(modeledLessonAccess({
    ...assignedLesson,
    role: ['teacher', 'student'],
    lessonGroup: 'primary_1',
    assignedGroups: ['primary_2']
  }), false, 'teacher role does not suppress student checks for a different class');
  assert.equal(modeledLessonAccess({
    ...assignedLesson,
    role: ['teacher', 'student'],
    lessonGroup: 'primary_2',
    assignedGroups: ['primary_2']
  }), true, 'multi-role user receives valid student access');
  assert.equal(modeledLessonAccess({
    ...assignedLesson,
    role: 'parent',
    published: true,
    activeVersionPublished: true,
    verifiedLinkedChild: true
  }), true, 'verified parent can read linked child class lesson');
  assert.equal(modeledLessonAccess({
    ...assignedLesson,
    role: 'parent',
    published: true,
    activeVersionPublished: true
  }), false, 'unlinked parent cannot read lesson');

  assert.match(sql, /public\.has_role\('teacher'\)/);
  assert.match(sql, /public\.has_role\('admin'\)/);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.can_review_curriculum_lesson/);
  assert.match(sql, /relationship\.verified_at IS NOT NULL/);
  assert.match(sql, /child_role\.role = 'student'/);
  assert.match(sql, /child_role\.revoked_at IS NULL/);
  assert.match(sql, /relationship\.relationship_type IN \('parent_child', 'guardian_student'\)/);
});

test('student related reads cannot expose historical versions or unrelated sections', () => {
  assert.equal(modeledRelatedRead({ parentLessonReadable: true, isActiveVersion: true }), true);
  assert.equal(modeledRelatedRead({ parentLessonReadable: true, isActiveVersion: false }), false);
  assert.equal(modeledRelatedRead({ parentLessonReadable: false, isActiveVersion: true }), false);
  assert.equal(modeledRelatedRead({ parentLessonReadable: true, isActiveVersion: false, canReview: true }), true);

  assert.match(sql, /lesson_version\.id = lesson_sections\.lesson_version_id/);
  assert.match(sql, /lesson\.active_version_id = lesson_version\.id/);
  assert.match(sql, /public\.can_review_curriculum_lesson\(lesson\.id\)/);
  assert.match(sql, /CREATE POLICY lesson_versions_select_service_role/);
  assert.match(sql, /CREATE POLICY lesson_sections_select_service_role/);
});

test('lesson sources and section-source links follow both lesson visibility checks', () => {
  assert.equal(modeledSourceLinkRead({ sectionLessonReadable: true, sourceLessonReadable: true }), true);
  assert.equal(modeledSourceLinkRead({ sectionLessonReadable: true, sourceLessonReadable: false }), false);
  assert.equal(modeledSourceLinkRead({ sectionLessonReadable: false, sourceLessonReadable: true }), false);
  assert.equal(modeledSourceRead({ lessonReadable: true, attachedToActiveVersion: true }), true);
  assert.equal(modeledSourceRead({ lessonReadable: true, attachedToActiveVersion: false }), false);
  assert.equal(modeledSourceRead({ lessonReadable: false, canReview: true }), true);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.can_read_curriculum_source/);
  assert.match(sql, /lesson\.active_version_id = lesson_version\.id/);
  assert.match(sql, /CREATE POLICY lesson_sources_select_isolated[\s\S]*?can_read_curriculum_source\(id\)/);
  assert.match(sql, /CREATE POLICY lesson_section_sources_select_isolated[\s\S]*?can_read_curriculum_lesson\(source\.lesson_id\)/);
  assert.match(sql, /CREATE POLICY lesson_sources_select_service_role/);
  assert.match(sql, /CREATE POLICY lesson_section_sources_select_service_role/);
});
