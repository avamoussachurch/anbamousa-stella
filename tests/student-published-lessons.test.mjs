import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { configureSupabase } from '../src/lib/supabase.ts';
import {
  getPublishedLessonsForCurrentUser,
  shouldLoadAuthoringCurriculum
} from '../src/lib/curriculumService.ts';

const originalFetch = globalThis.fetch;
const jwtPart = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const accessToken = [
  jwtPart({ alg: 'HS256', typ: 'JWT' }),
  jwtPart({ sub: 'student-assigned', exp: Math.floor(Date.now() / 1000) + 3600 }),
  'test-signature'
].join('.');

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('admins refresh the authoring curriculum instead of the student-assigned lesson list', () => {
  assert.equal(shouldLoadAuthoringCurriculum('admin', ['admin']), true);
  assert.equal(shouldLoadAuthoringCurriculum('teacher', ['teacher']), true);
  assert.equal(shouldLoadAuthoringCurriculum('student', ['student']), false);
});

test('student lesson retrieval uses active membership and excludes lessons for other class groups', async () => {
  globalThis.fetch = async input => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    if (url.pathname === '/auth/v1/user') {
      return new Response(JSON.stringify({ id: 'student-assigned' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }

    const rowsByTable = {
      church_years: [{ id: 'active-year', is_active: true }],
      user_relationships: [],
      class_memberships: [{ class_instance_id: 'assigned-class' }],
      class_instances: [{ class_group_id: 'primary_2' }],
      lessons: [
        {
          id: 'lesson-assigned',
          title_en: 'Assigned lesson',
          title_ar: 'درس',
          grade_level: 'Grade 4',
          active_version_id: 'version-assigned',
          status: 'published',
          created_at: '2026-01-01T00:00:00.000Z'
        },
        {
          id: 'lesson-other-class',
          title_en: 'Other class lesson',
          title_ar: 'درس آخر',
          grade_level: 'Grade 1',
          active_version_id: 'version-other',
          status: 'published',
          created_at: '2026-01-01T00:00:00.000Z'
        }
      ],
      lesson_versions: [
        {
          id: 'version-assigned',
          lesson_id: 'lesson-assigned',
          version_number: 2,
          status: 'PUBLISHED',
          created_by: 'teacher',
          created_at: '2026-01-01T00:00:00.000Z'
        }
      ],
      lesson_sections: []
    };
    const table = url.pathname.replace('/rest/v1/', '');
    return new Response(JSON.stringify(rowsByTable[table] || []), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };

  const client = configureSupabase('http://supabase.test', 'test-anon-key');
  await client.auth.setSession({ access_token: accessToken, refresh_token: 'test-refresh-token' });
  const result = await getPublishedLessonsForCurrentUser();

  assert.equal(result.error, null);
  assert.deepEqual(result.data.map(lesson => lesson.id), ['lesson-assigned']);
  assert.equal(result.data[0].currentVersionId, 'version-assigned');
});
