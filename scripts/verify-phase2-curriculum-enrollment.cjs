// Regression test suite for Phase 2: Curriculum Assignment, Hardcoded State Audit & New Account Correctness
const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function makePostRequest(path, payload, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = new URL(path, BASE_URL);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (_) {}
        resolve({ statusCode: res.statusCode, headers: res.headers, body, json });
      });
    });

    req.on('error', err => reject(err));
    req.write(data);
    req.end();
  });
}

function makeGetRequest(path, queryParams = {}, token) {
  return new Promise((resolve, reject) => {
    const query = new URLSearchParams(queryParams).toString();
    const fullPath = query ? `${path}?${query}` : path;
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = new URL(fullPath, BASE_URL);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET',
      headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (_) {}
        resolve({ statusCode: res.statusCode, headers: res.headers, body, json });
      });
    });

    req.on('error', err => reject(err));
    req.end();
  });
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('Phase 2 QA: Curriculum Enrollment, Isolation & Clean Initial State');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, detail = '') {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message} - ${detail}`);
      failed++;
    }
  }

  // Reset state for clean test run
  await makePostRequest('/api/church/reset-review-test-state', {});

  const newStudentId = 'std_sec_karim_909';
  const newStudentToken = `test_jwt_student_${newStudentId}`;

  // 1. Submit onboarding activation for First Secondary (Secondary 1)
  console.log('--- 1. New Account Onboarding: Select First Secondary ---');
  const onbRes = await makePostRequest('/api/church/onboarding/request', {
    studentId: newStudentId,
    studentName: 'Karim Nabil (First Secondary)',
    email: 'karim.secondary@church.org',
    requestedClassGroupId: 'secondary',
    requestedGrade: 'Secondary 1',
    notes: 'Registered for First Secondary Sunday School.'
  }, newStudentToken);

  assert(onbRes.statusCode === 200, 'Activation request returns 200 OK');
  assert(onbRes.json?.request?.requestedClassGroupId === 'secondary', 'Requested class group is secondary');
  assert(onbRes.json?.request?.requestedGrade === 'Secondary 1', 'Requested grade is Secondary 1');

  // 2. Query initial server progress summary for fresh First Secondary student
  console.log('\n--- 2. Fresh Account Progress Invariants: No Inherited State ---');
  const sumRes = await makeGetRequest('/api/church/student-progress/summary', {}, newStudentToken);
  assert(sumRes.statusCode === 200, 'Summary returns 200 OK');
  assert(sumRes.json?.classGroupId === 'secondary', 'Student resolved to secondary class group');
  assert(sumRes.json?.completedCount === 0, 'Completed lesson count is 0 (NOT inherited 1 or 2)');
  assert(sumRes.json?.progressPercent === 0, 'Progress percent is 0% (NOT 67% or 2/3)');
  assert(sumRes.json?.points === 0, 'Initial points start at 0 (NOT inherited 100 or 120)');
  assert(sumRes.json?.totalAssignedLessons === 1, 'Total assigned lessons matches secondary curriculum (1), not hardcoded 3');

  // 3. UI/API Lesson Access Authorization: Only Secondary Curriculum Allowed
  console.log('\n--- 3. Lesson Isolation: Grade 4 Lessons Blocked for Secondary Student ---');
  // Attempt to start Grade 4 lesson (l-test-multiversion-01)
  const g4Start = await makePostRequest('/api/church/student-progress/start', {
    lessonId: 'l-test-multiversion-01',
    versionId: 'v-test-multi-1',
    studentId: newStudentId
  }, newStudentToken);

  assert(g4Start.statusCode === 403, 'Starting Grade 4 lesson returns 403 FORBIDDEN for Secondary student');
  assert(g4Start.json?.error === 'FORBIDDEN_CLASS_ACCESS', 'Error code is FORBIDDEN_CLASS_ACCESS');

  // Attempt to complete Grade 4 lesson directly
  const g4Complete = await makePostRequest('/api/church/student-progress/complete-lesson', {
    lessonId: 'l-test-multiversion-01',
    versionId: 'v-test-multi-1',
    studentId: newStudentId
  }, newStudentToken);

  assert(g4Complete.statusCode === 403, 'Completing Grade 4 lesson returns 403 FORBIDDEN for Secondary student');

  // 4. Authorized Lesson Progress: Secondary Student on Secondary Lesson
  console.log('\n--- 4. Authorized Progress: Secondary Student on Secondary Lesson ---');
  const secStart = await makePostRequest('/api/church/student-progress/start', {
    lessonId: 'l-sec-01',
    versionId: 'v-sec-01',
    studentId: newStudentId
  }, newStudentToken);

  assert(secStart.statusCode === 200, 'Starting authorized Secondary lesson returns 200 OK');
  assert(secStart.json?.progress?.status === 'IN_PROGRESS', 'Secondary progress status is IN_PROGRESS');

  // Complete section 1
  const s1 = await makePostRequest('/api/church/student-progress/complete-section', {
    lessonId: 'l-sec-01',
    versionId: 'v-sec-01',
    sectionId: 'sec-sec-1',
    studentId: newStudentId
  }, newStudentToken);
  assert(s1.statusCode === 200, 'Section 1 completed');

  // Complete section 2
  const s2 = await makePostRequest('/api/church/student-progress/complete-section', {
    lessonId: 'l-sec-01',
    versionId: 'v-sec-01',
    sectionId: 'sec-sec-2',
    studentId: newStudentId
  }, newStudentToken);
  assert(s2.statusCode === 200, 'Section 2 completed');

  // Complete secondary lesson
  const secFin = await makePostRequest('/api/church/student-progress/complete-lesson', {
    lessonId: 'l-sec-01',
    versionId: 'v-sec-01',
    studentId: newStudentId
  }, newStudentToken);

  assert(secFin.statusCode === 200, 'Secondary lesson completion returns 200 OK');
  assert(secFin.json?.isFirstCompletion === true, 'First completion flag is true');
  assert(secFin.json?.pointsEarned === 50, 'Awards 50 points');
  assert(secFin.json?.totalPoints === 50, 'Total points updated authoritatively to 50');

  // 5. Verify post-completion summary for Secondary student
  console.log('\n--- 5. Post-Completion Summary: Authoritative Denominators ---');
  const sumAfter = await makeGetRequest('/api/church/student-progress/summary', {}, newStudentToken);
  assert(sumAfter.statusCode === 200, 'Summary after completion returns 200 OK');
  assert(sumAfter.json?.completedCount === 1, 'Completed count is exactly 1');
  assert(sumAfter.json?.totalAssignedLessons === 1, 'Total assigned denominator is 1 (not hardcoded 3)');
  assert(sumAfter.json?.progressPercent === 100, 'Progress percent is exactly 100% (1/1 completed)');
  assert(sumAfter.json?.points === 50, 'Points persist at 50');

  // 6. Diagnostic Check for Secondary Student
  console.log('\n--- 6. Diagnostic Check on Secondary Lesson ---');
  const diagSec = await makeGetRequest('/api/church/student-progress/diagnose/l-sec-01', {}, newStudentToken);
  assert(diagSec.statusCode === 200, 'Diagnostic endpoint returns 200 OK');
  assert(diagSec.json?.serverState?.status === 'COMPLETED', 'Server state is confirmed COMPLETED');
  assert(diagSec.json?.diagnostics?.isCompleteOnServer === true, 'isCompleteOnServer is true');
  assert(diagSec.json?.diagnostics?.isSynchronized === true, 'isSynchronized is true');

  console.log('\n================================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runTestSuite().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
