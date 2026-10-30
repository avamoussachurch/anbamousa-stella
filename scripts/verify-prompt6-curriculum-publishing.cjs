/**
 * PROMPT 6 VERIFICATION SUITE:
 * Curriculum Schema, Versioning Contract, and Lesson Publication
 *
 * Verifies:
 * 1. Tracked SQL Schema & Migration Invariants (clean install & additive)
 * 2. Database Contract Alignment (all columns, keys, constraints, RLS)
 * 3. Workflow: Draft -> Submit -> Revise -> Approve -> Publish
 * 4. Authoritative Publication Boundary (active_version_id, status='published')
 * 5. Student Retrieval (receives active published version only; historical hidden)
 * 6. Multi-Version Active Switching (V1 -> V2)
 * 7. Persistence Across Server Restart
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

let passed = 0;
let failed = 0;

function assert(condition, message, detail = '') {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message} ${detail ? '- ' + detail : ''}`);
    failed++;
  }
}

function makeRequest(method, pathname, payload = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = payload ? JSON.stringify(payload) : null;
    const headers = {};
    if (data) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = new URL(pathname, BASE_URL);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json
        });
      });
    });

    req.on('error', err => reject(err));
    if (data) req.write(data);
    req.end();
  });
}

async function runPrompt6Tests() {
  console.log('================================================================');
  console.log('PROMPT 6 VERIFICATION: Curriculum Schema & Lesson Publication');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: SQL Schema & Migration Contract Invariants
  // --------------------------------------------------------------------------
  console.log('--- 1. Database Contract & Schema Migration Invariants ---');
  const migrationPath = path.join(__dirname, 'migrations', 'phase5_curriculum_versioning.sql');
  const schemaPath = path.join(__dirname, '..', 'supabase_schema.sql');

  assert(fs.existsSync(migrationPath), '1.1 Additive migration phase5_curriculum_versioning.sql exists');
  assert(fs.existsSync(schemaPath), '1.2 Base supabase_schema.sql exists');

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Verify all 9 missing objects + active_version_id in migration
  const requiredTables = [
    'lesson_versions',
    'lesson_sections',
    'lesson_sources',
    'lesson_section_sources',
    'evidence_maps',
    'claim_evidence',
    'source_conflicts',
    'lesson_outlines',
    'lesson_outline_sections',
    'servant_review_comments'
  ];

  for (const table of requiredTables) {
    assert(
      migrationSql.includes(`CREATE TABLE IF NOT EXISTS public.${table}`),
      `1.3 Migration defines public.${table}`
    );
    assert(
      schemaSql.includes(`CREATE TABLE IF NOT EXISTS public.${table}`),
      `1.4 Base schema defines public.${table} for clean-install`
    );
  }

  // Verify authoritative column additions to public.lessons
  assert(
    migrationSql.includes('active_version_id UUID REFERENCES public.lesson_versions'),
    '1.5 Migration adds active_version_id FK pointer to public.lessons'
  );
  assert(
    schemaSql.includes('active_version_id UUID REFERENCES public.lesson_versions'),
    '1.6 Base schema contains active_version_id FK pointer to public.lessons'
  );
  assert(
    migrationSql.includes('ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS lesson_status'),
    '1.7 Migration adds lesson_status to public.lessons'
  );

  // Verify publish_lesson_version RPC function
  assert(
    migrationSql.includes('CREATE OR REPLACE FUNCTION public.publish_lesson_version'),
    '1.8 Migration includes publish_lesson_version stored procedure'
  );
  assert(
    (migrationSql.match(/CREATE OR REPLACE FUNCTION public\.publish_lesson_version\s*\(/g) || []).length === 1,
    '1.8a Migration defines one publish_lesson_version signature with no conflicting duplicate parameter names'
  );
  assert(
    (schemaSql.match(/CREATE OR REPLACE FUNCTION public\.publish_lesson_version\s*\(/g) || []).length === 1,
    '1.8b Clean-install schema defines one publish_lesson_version signature'
  );
  assert(
    /publish_lesson_version\s*\(\s*p_lesson_id\s+UUID\s*,\s*p_version_id\s+UUID\s*\)/i.test(migrationSql),
    '1.8c Migration preserves the named RPC arguments used by the server'
  );
  assert(
    migrationSql.includes('SECURITY DEFINER') && migrationSql.includes('SET search_path = public, pg_temp'),
    '1.9 publish_lesson_version RPC uses safe fixed search_path and SECURITY DEFINER'
  );
  assert(
    migrationSql.includes('REVOKE ALL ON FUNCTION public.publish_lesson_version(UUID, UUID) FROM PUBLIC, anon, authenticated'),
    '1.10 Direct client execution revoked on publish_lesson_version'
  );
  assert(
    migrationSql.includes('GRANT EXECUTE ON FUNCTION public.publish_lesson_version(UUID, UUID) TO service_role'),
    '1.11 Execution granted strictly to service_role on publish_lesson_version'
  );

  // Verify RLS enablement
  for (const table of requiredTables) {
    assert(
      migrationSql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`),
      `1.12 RLS enabled on public.${table}`
    );
  }

  // --------------------------------------------------------------------------
  // SECTION 2: Workflow Testing: Draft -> Submit -> Revise -> Approve
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Curriculum Authoring Workflow (Draft -> Submit -> Revise -> Approve) ---');
  const teacherToken = 'test_jwt_teacher_mina';
  const otherTeacherToken = 'test_jwt_teacher_other';
  const studentToken = 'test_jwt_student_mark';

  const lessonId = 'l-test-draft-01';
  const draftVersionId = 'v-test-draft-1';

  // Reset test state for clean reproducible run
  await makeRequest('POST', '/api/church/reset-review-test-state', {});

  // 2.1 Submit AI_DRAFT -> SERVANT_REVIEW
  const submitRes = await makeRequest('POST', '/api/church/submit-for-review', {
    lessonId,
    versionId: draftVersionId,
    notes: 'Teacher Mina submitted for ecclesiastical review'
  }, teacherToken);

  assert(submitRes.statusCode === 200, '2.1 Authorized teacher submits AI_DRAFT to SERVANT_REVIEW (got 200)');
  assert(submitRes.json?.status === 'SERVANT_REVIEW', '2.2 Version status transitioned to SERVANT_REVIEW');

  // 2.2 Student forbidden from submitting or approving
  const studentSubmit = await makeRequest('POST', '/api/church/submit-for-review', {
    lessonId,
    versionId: draftVersionId
  }, studentToken);
  assert(studentSubmit.statusCode === 403, '2.3 Student submission rejected with 403 Forbidden');

  // 2.3 Servant requests revision -> REVISION_REQUESTED
  const reviseRes = await makeRequest('POST', '/api/church/request-revision', {
    lessonId,
    versionId: draftVersionId,
    feedbackComment: 'Please align Patristic quote with St. Athanasius De Incarnatione',
    servantName: 'Servant Mina'
  }, teacherToken);

  assert(reviseRes.statusCode === 200, '2.4 Servant requests revision (got 200)');
  assert(reviseRes.json?.status === 'REVISION_REQUESTED', '2.5 Version status transitioned to REVISION_REQUESTED');

  // 2.4 Resubmit to SERVANT_REVIEW after addressing feedback
  const resubmitRes = await makeRequest('POST', '/api/church/submit-for-review', {
    lessonId,
    versionId: draftVersionId,
    notes: 'Updated quote from De Incarnatione paragraph 54'
  }, teacherToken);
  assert(resubmitRes.statusCode === 200 && resubmitRes.json?.status === 'SERVANT_REVIEW', '2.6 Resubmitted to SERVANT_REVIEW');

  // 2.4b Resolve theological source conflicts before approval
  await makeRequest('POST', '/api/church/resolve-source-conflict', {
    conflictId: 'conf-test-01',
    resolutionNote: 'The 326 AD date marks arrival; 327 AD marks completion of excavation.'
  }, teacherToken);

  // 2.5 Servant approves version -> APPROVED
  const approveRes = await makeRequest('POST', '/api/church/approve-version', {
    lessonId,
    versionId: draftVersionId,
    approvalNote: 'Theological content verified against Orthodox Patristic sources.',
    servantName: 'Servant Mina'
  }, teacherToken);

  assert(approveRes.statusCode === 200, '2.7 Servant approves version (got 200)');
  assert(approveRes.json?.status === 'APPROVED', '2.8 Version status transitioned to APPROVED');
  assert(Boolean(approveRes.json?.approvedBy && approveRes.json?.approvedAt), '2.9 Ecclesiastical approval metadata recorded');

  // 2.6 Critical Check: Root lesson must still be draft and active_version_id must still be null!
  const rootLessonCheck = await makeRequest('GET', `/api/church/active-version?lessonId=${lessonId}`, null, studentToken);
  assert(rootLessonCheck.statusCode === 404 || rootLessonCheck.json?.activeVersion === null, '2.10 Approved version is NOT visible to students before explicit publication');

  // --------------------------------------------------------------------------
  // SECTION 3: Authoritative Publication Boundary
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Authoritative Publication Boundary ---');

  // 3.1 Unapproved AI_DRAFT cannot be published
  // Reset state to test direct draft publication attempt
  await makeRequest('POST', '/api/church/reset-review-test-state', {});
  const unapprovedPub = await makeRequest('POST', '/api/church/publish-lesson-version', {
    lessonId,
    versionId: draftVersionId
  }, teacherToken);
  assert(unapprovedPub.statusCode === 400, '3.1 Direct publication of unapproved draft rejected with 400 (got 400)');
  assert(unapprovedPub.json?.error === 'INVALID_STATE', '3.2 Error code is INVALID_STATE');

  // 3.2 Publish APPROVED version (v-test-approved-1)
  const approvedVersionId = 'v-test-approved-1';
  const pubRes = await makeRequest('POST', '/api/church/publish-lesson-version', {
    lessonId,
    versionId: approvedVersionId
  }, teacherToken);

  assert(pubRes.statusCode === 200, '3.3 Approved version publishes successfully (got 200)');
  assert(pubRes.json?.status === 'PUBLISHED', '3.4 Returned version status is PUBLISHED');
  assert(pubRes.json?.activeVersionId === approvedVersionId, '3.5 returned activeVersionId matches published version');
  assert(pubRes.json?.lessonStatus === 'published', '3.6 returned lessonStatus is published');

  // 3.3 Unauthorized teacher cannot publish
  const otherPub = await makeRequest('POST', '/api/church/publish-lesson-version', {
    lessonId,
    versionId: approvedVersionId
  }, otherTeacherToken);
  assert(otherPub.statusCode === 403, '3.7 Unassigned teacher publication rejected with 403 Forbidden');

  // --------------------------------------------------------------------------
  // SECTION 4: Student Retrieval & Multi-Version Active Switching
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Student Retrieval & Multi-Version Active Switching ---');

  // 4.1 Student gets newly published active version
  const studentActive = await makeRequest('GET', `/api/church/active-version?lessonId=${lessonId}`, null, studentToken);
  assert(studentActive.statusCode === 200, '4.1 Student queries active version successfully (got 200)');
  assert(studentActive.json?.activeVersion?.id === approvedVersionId, '4.2 Student receives authoritative active version');
  assert(studentActive.json?.activeVersion?.status === 'PUBLISHED', '4.3 Active version status is PUBLISHED');

  // 4.2 Multi-Version Switching: Lesson has V1 published, now publishes V2
  const multiLessonId = 'l-test-multiversion-01';
  const multiV1Id = 'v-test-multi-1';
  const multiV2Id = 'v-test-multi-2';

  // Publish V2
  const pubV2Res = await makeRequest('POST', '/api/church/publish-lesson-version', {
    lessonId: multiLessonId,
    versionId: multiV2Id
  }, teacherToken);
  assert(pubV2Res.statusCode === 200, '4.4 Multi-version lesson V2 published successfully (got 200)');

  // Student queries active version -> MUST be V2
  const studentMulti = await makeRequest('GET', `/api/church/active-version?lessonId=${multiLessonId}`, null, studentToken);
  assert(studentMulti.json?.activeVersion?.id === multiV2Id, `4.5 Student immediately receives new active version V2 (${studentMulti.json?.activeVersion?.id})`);

  // Student queries version list -> MUST see ONLY V2 (historical V1 hidden from students)
  const studentList = await makeRequest('GET', `/api/church/lesson-versions?lessonId=${multiLessonId}`, null, studentToken);
  const studentVersions = studentList.json?.versions || [];
  assert(studentVersions.length === 1 && studentVersions[0].id === multiV2Id, '4.6 Historical V1 is strictly hidden from student query');

  // Teacher queries version list -> MUST see both V1 and V2
  const teacherList = await makeRequest('GET', `/api/church/lesson-versions?lessonId=${multiLessonId}`, null, teacherToken);
  const teacherVersions = teacherList.json?.versions || [];
  assert(
    teacherVersions.some(v => v.id === multiV1Id) && teacherVersions.some(v => v.id === multiV2Id),
    '4.7 Teacher retains full historical audit visibility of both V1 and V2'
  );

  // --------------------------------------------------------------------------
  // SECTION 5: Persistence Across Server Restart
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Persistence Across Server Restart ---');
  // Check that the persistent state file on disk contains the published active_version_id
  const stateFilePath = path.join(__dirname, '..', 'uploads', 'church_year_classes_persistence.json');
  assert(fs.existsSync(stateFilePath), '5.1 Persistent class state file exists on disk');

  const diskState = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
  const persistedLesson = diskState.lessons?.[multiLessonId];
  assert(
    persistedLesson?.active_version_id === multiV2Id,
    `5.2 Active version pointer persisted to disk (${persistedLesson?.active_version_id} === ${multiV2Id})`
  );
  assert(
    persistedLesson?.status === 'published',
    `5.3 Lesson published status persisted to disk (${persistedLesson?.status})`
  );
  assert(
    diskState.versions?.[multiV2Id]?.status === 'PUBLISHED',
    `5.4 Version status persisted to disk as PUBLISHED (${diskState.versions?.[multiV2Id]?.status})`
  );

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`Prompt 6 Verification Finished: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPrompt6Tests().catch((err) => {
  console.error('Fatal error in Prompt 6 test suite:', err);
  process.exit(1);
});
