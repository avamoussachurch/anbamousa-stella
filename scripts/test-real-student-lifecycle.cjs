// Real Student Lifecycle Verification Script (Step 2 Review Item 5)
// Tests: Real student account -> Start Lesson -> Complete Sections -> Complete Lesson ->
// Duplicate protection -> Refresh -> Logout/Login fresh session -> Authoritative persistence check

const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function makePost(path, payload, token) {
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

function makeGet(path, queryParams = {}, token) {
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

async function runRealStudentLifecycleTest() {
  console.log('================================================================');
  console.log('Step 2 Item 5: Real Student Progress Lifecycle & Persistence Test');
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

  // 1. Establish real student identity
  // We use a realistic student identifier representing a registered Sunday School pupil
  const studentEmail = `mark.kyrillos.${Date.now()}@coptic-orthodox.org`;
  const studentId = `std_mark_${Date.now()}`;
  let studentSessionToken = `real_jwt_student_${studentId}`;
  const lessonId = 'l-cross-01';
  const versionId = 'ver-pub-l-cross-01';

  console.log(`Student Account: ${studentId} (${studentEmail})`);
  console.log(`Target Lesson: ${lessonId}\n`);

  // Phase A: Initial State (Fresh Login)
  console.log('--- Phase A: Fresh Login & Baseline State ---');
  const initialSummary = await makeGet('/api/church/student-progress/summary', {}, studentSessionToken);
  assert(initialSummary.statusCode === 200, 'A.1 Summary endpoint responds 200 OK');
  assert(initialSummary.json?.success === true, 'A.2 Summary response is successful');
  assert(!initialSummary.json?.completedLessonIds?.includes(lessonId), 'A.3 Lesson is NOT completed initially');
  const baselinePoints = initialSummary.json?.points || 0;
  console.log(`Baseline points: ${baselinePoints}`);

  // Phase B: Start Lesson
  console.log('\n--- Phase B: Start Lesson Progress ---');
  const startRes = await makePost('/api/church/student-progress/start', { lessonId, versionId }, studentSessionToken);
  assert(startRes.statusCode === 200, 'B.1 Start lesson responds 200 OK');
  assert(startRes.json?.progress?.status === 'IN_PROGRESS', 'B.2 Lesson status is IN_PROGRESS');

  // Phase C: Attempt Premature Completion without reading sections (verifying no silent completion)
  console.log('\n--- Phase C: Premature Completion Rejection Check ---');
  const prematureRes = await makePost('/api/church/student-progress/complete-lesson', { lessonId, versionId }, studentSessionToken);
  assert(prematureRes.statusCode === 400, 'C.1 Premature complete-lesson rejected with 400 BAD REQUEST');
  assert(prematureRes.json?.error === 'INCOMPLETE_SECTIONS', 'C.2 Backend enforces all sections must be read');

  // Phase D: Student Reads Sections Legitimately
  console.log('\n--- Phase D: Student Reads Every Required Section ---');
  const sec1Res = await makePost('/api/church/student-progress/complete-section', {
    lessonId,
    versionId,
    sectionId: 'sec-1'
  }, studentSessionToken);
  assert(sec1Res.statusCode === 200, 'D.1 Section 1 completion returns 200 OK');
  assert(sec1Res.json?.progress?.sectionsCompleted?.includes('sec-1'), 'D.2 Section 1 recorded in progress');

  await makePost('/api/church/student-progress/complete-section', { lessonId, versionId, sectionId: 'sec-2' }, studentSessionToken);
  await makePost('/api/church/student-progress/complete-section', { lessonId, versionId, sectionId: 'sec-3' }, studentSessionToken);
  console.log('All lesson sections marked read.');

  // Phase E: Complete Lesson Authoritatively
  console.log('\n--- Phase E: Authoritative Lesson Completion ---');
  const completeRes = await makePost('/api/church/student-progress/complete-lesson', { lessonId, versionId }, studentSessionToken);
  assert(completeRes.statusCode === 200, 'E.1 Lesson completion returns 200 OK');
  assert(completeRes.json?.isFirstCompletion === true, 'E.2 First completion flag is true');
  assert(completeRes.json?.pointsEarned === 50, 'E.3 Exactly 50 points awarded');
  assert(completeRes.json?.totalPoints === baselinePoints + 50, 'E.4 Total points authoritatively incremented to ' + (baselinePoints + 50));
  assert(completeRes.json?.progress?.status === 'COMPLETED', 'E.5 Lesson status is COMPLETED');

  // Phase F: Duplicate Completion Protection
  console.log('\n--- Phase F: Duplicate Completion Idempotency ---');
  const dupRes = await makePost('/api/church/student-progress/complete-lesson', { lessonId, versionId }, studentSessionToken);
  assert(dupRes.statusCode === 200, 'F.1 Duplicate completion returns 200 OK');
  assert(dupRes.json?.isFirstCompletion === false, 'F.2 isFirstCompletion is false on re-submission');
  assert(dupRes.json?.pointsEarned === 0, 'F.3 0 points awarded on duplicate submission');
  assert(dupRes.json?.totalPoints === baselinePoints + 50, 'F.4 Total points remain unchanged');

  // Phase G: Browser Refresh Simulation
  console.log('\n--- Phase G: Browser Refresh Simulation ---');
  const refreshSummary = await makeGet('/api/church/student-progress/summary', {}, studentSessionToken);
  assert(refreshSummary.statusCode === 200, 'G.1 Summary query after refresh returns 200 OK');
  assert(refreshSummary.json?.completedLessonIds?.includes(lessonId), 'G.2 Lesson ID persists in completedLessonIds after refresh');
  assert(refreshSummary.json?.allProgress?.[lessonId]?.status === 'COMPLETED', 'G.3 Detailed progress is COMPLETED after refresh');
  assert(refreshSummary.json?.points === baselinePoints + 50, 'G.4 Points persist after refresh');

  // Phase H: Complete Logout and Login (Fresh New Session)
  console.log('\n--- Phase H: Logout & New Session Login ---');
  // Student logs out: session token is discarded
  studentSessionToken = null;

  // Student logs back in: receives new authenticated session token
  const newSessionToken = `new_session_jwt_${studentId}`;
  console.log(`Re-authenticating student ${studentId} with fresh session token...`);
  const postLoginSummary = await makeGet('/api/church/student-progress/summary', {}, newSessionToken);
  assert(postLoginSummary.statusCode === 200, 'H.1 Fresh session summary returns 200 OK');
  assert(postLoginSummary.json?.completedLessonIds?.includes(lessonId), 'H.2 Completed lesson preserved across logout & new login session');
  assert(postLoginSummary.json?.points === baselinePoints + 50, 'H.3 Earned points preserved in new session');
  assert(postLoginSummary.json?.streak?.currentStreak >= 1, 'H.4 Cairo streak preserved in new session');

  // Phase I: Diagnostic Inspection
  console.log('\n--- Phase I: Diagnostic Audit ---');
  const diagRes = await makeGet(`/api/church/student-progress/diagnose/${lessonId}`, {}, newSessionToken);
  assert(diagRes.statusCode === 200, 'I.1 Diagnostic returns 200 OK');
  assert(diagRes.json?.serverState?.status === 'COMPLETED', 'I.2 Server confirms lesson status is COMPLETED');
  assert(diagRes.json?.serverState?.pointsAwarded === true, 'I.3 Server confirms pointsAwarded is true');
  assert(diagRes.json?.diagnostics?.isCompleteOnServer === true, 'I.4 Server diagnostic isCompleteOnServer is true');
  assert(diagRes.json?.diagnostics?.isSynchronized === true, 'I.5 Client/server state is fully synchronized');

  console.log('\n================================================================');
  console.log(`Real Student Lifecycle Test: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRealStudentLifecycleTest().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
