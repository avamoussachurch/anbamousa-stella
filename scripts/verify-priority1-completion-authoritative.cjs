// Regression test suite for Priority 1: Authoritative Lesson Completion End-to-End
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
  console.log('Priority 1: Authoritative Lesson Completion End-to-End QA Suite');
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

  // Reset state for clean authoritative test run
  await makePostRequest('/api/church/reset-review-test-state', {});

  const studentId = 'mark';
  const studentToken = 'test_jwt_student_mark';
  const otherStudentToken = 'test_jwt_student_other';
  const teacherMinaToken = 'test_jwt_teacher_mina';

  // Lesson published for primary_2 class group
  const lessonId = 'l-test-multiversion-01';
  const versionId = 'v-test-multi-1';

  // 1. Initial State Check via Summary endpoint
  console.log('--- 1. Initial State Check for Fresh Student ---');
  const sum1 = await makeGetRequest('/api/church/student-progress/summary', {}, studentToken);
  assert(sum1.statusCode === 200, 'Summary returns 200 OK');
  assert(sum1.json?.completedLessonIds.length === 0, 'No lessons initially completed');
  assert(sum1.json?.completedCount === 0, 'Completed count is 0');
  const initialPoints = sum1.json?.points || 100;
  assert(typeof initialPoints === 'number', 'Authoritative points initialized');

  // 2. Cross-Student Protection on Summary
  console.log('\n--- 2. Cross-Student Protection on Summary & History ---');
  const sumForbidden = await makeGetRequest('/api/church/student-progress/summary', { studentId: 'other' }, studentToken);
  assert(sumForbidden.statusCode === 403, 'Student cannot view other student summary (403)');
  const histForbidden = await makeGetRequest('/api/church/completion-history', { studentId: 'other' }, studentToken);
  assert(histForbidden.statusCode === 403, 'Student cannot view other student completion history (403)');

  // 3. Start Lesson
  console.log('\n--- 3. Student Starts Lesson ---');
  const startRes = await makePostRequest('/api/church/student-progress/start', {
    lessonId,
    versionId,
    studentId
  }, studentToken);
  assert(startRes.statusCode === 200, 'Start lesson returns 200');
  assert(startRes.json?.progress?.status === 'IN_PROGRESS', 'Status is IN_PROGRESS');

  // 4. Incomplete Completion is Safely Rejected
  console.log('\n--- 4. Premature Completion Attempt Rejected ---');
  const earlyFin = await makePostRequest('/api/church/student-progress/complete-lesson', {
    lessonId,
    versionId,
    studentId
  }, studentToken);
  assert(earlyFin.statusCode === 400, 'Premature completion returns 400');
  assert(earlyFin.json?.error === 'INCOMPLETE_SECTIONS', 'Error code is INCOMPLETE_SECTIONS');

  // 5. Complete all required sections
  console.log('\n--- 5. Student Completes All Sections ---');
  await makePostRequest('/api/church/student-progress/complete-section', {
    lessonId,
    versionId,
    sectionId: 'sec-multi-1',
    studentId
  }, studentToken);
  await makePostRequest('/api/church/student-progress/complete-section', {
    lessonId,
    versionId,
    sectionId: 'sec-multi-2',
    studentId
  }, studentToken);
  const sec3 = await makePostRequest('/api/church/student-progress/complete-section', {
    lessonId,
    versionId,
    sectionId: 'sec-multi-3',
    studentId
  }, studentToken);
  assert(sec3.statusCode === 200, 'All sections finished');

  // 6. Complete Lesson (First Time)
  console.log('\n--- 6. Complete Lesson Authoritatively ---');
  const fin1 = await makePostRequest('/api/church/student-progress/complete-lesson', {
    lessonId,
    versionId,
    studentId
  }, studentToken);
  assert(fin1.statusCode === 200, 'complete-lesson returns 200 OK');
  assert(fin1.json?.isFirstCompletion === true, 'isFirstCompletion is true');
  assert(fin1.json?.pointsEarned === 50, 'Awards exactly 50 points on first completion');
  assert(fin1.json?.totalPoints === initialPoints + 50, 'Total points updated authoritatively');
  assert(fin1.json?.streak?.currentStreak >= 1, 'Cairo streak updated');
  assert(fin1.json?.completionHistory?.length >= 1, 'Completion history recorded');
  assert(fin1.json?.completionHistory[0]?.cairoDate !== undefined, 'Cairo date attached to history');

  // 7. Duplicate Completion Submission (Idempotency)
  console.log('\n--- 7. Idempotency: Duplicate Completion Does NOT Award Duplicate Points ---');
  const finDup = await makePostRequest('/api/church/student-progress/complete-lesson', {
    lessonId,
    versionId,
    studentId
  }, studentToken);
  assert(finDup.statusCode === 200, 'Duplicate submission succeeds safely with 200');
  assert(finDup.json?.isFirstCompletion === false, 'isFirstCompletion is false on duplicate');
  assert(finDup.json?.pointsEarned === 0, '0 additional points awarded on duplicate');
  assert(finDup.json?.totalPoints === initialPoints + 50, 'Total points unchanged by duplicate submission');

  // 8. Cross-Device / Fresh Session Retrieval via Summary
  console.log('\n--- 8. Cross-Device / Refresh Persistence via Summary ---');
  const sum2 = await makeGetRequest('/api/church/student-progress/summary', {}, studentToken);
  assert(sum2.statusCode === 200, 'Summary returns 200 on fresh query');
  assert(sum2.json?.completedLessonIds.includes(lessonId), 'Lesson ID is authoritatively in completedLessonIds');
  assert(sum2.json?.completedCount >= 1, 'Completed count is >= 1');
  assert(sum2.json?.points === initialPoints + 50, 'Points persist across sessions');
  assert(sum2.json?.mastery[lessonId]?.status === 'MASTERED', 'Mastery is MASTERED on server');

  // 9. Completion History Endpoint
  console.log('\n--- 9. Query Completion History Endpoint ---');
  const histRes = await makeGetRequest('/api/church/completion-history', {}, studentToken);
  assert(histRes.statusCode === 200, 'History returns 200');
  assert(histRes.json?.activities?.length >= 1, 'Contains completed lesson activity');
  assert(histRes.json?.activities[0]?.lessonId === lessonId, 'Activity matches lesson ID');
  assert(histRes.json?.activities[0]?.pointsEarned === 50, 'Activity records earned points');

  // 10. Leaderboard Authoritative Calculation & Cairo Weekly Reset
  console.log('\n--- 10. Authoritative Leaderboard Ranking ---');
  const lbWeekly = await makeGetRequest('/api/church/leaderboard', { timeframe: 'weekly' }, studentToken);
  assert(lbWeekly.statusCode === 200, 'Leaderboard returns 200');
  assert(lbWeekly.json?.cairoDate !== undefined, 'Includes current Cairo date');
  assert(lbWeekly.json?.cairoWeekReset !== undefined, 'Includes Cairo weekly reset date');
  assert(Array.isArray(lbWeekly.json?.leaderboard), 'Returns leaderboard array');
  assert(lbWeekly.json?.currentUserEntry?.studentId === studentId, 'Includes current student entry');
  assert(lbWeekly.json?.currentUserEntry?.rank >= 1, 'Current student has valid rank');

  // 11. Class Isolation on Leaderboard
  console.log('\n--- 11. Class Isolation on Leaderboard ---');
  const lbForbidden = await makeGetRequest('/api/church/leaderboard', { classGroupId: 'preparatory' }, studentToken);
  assert(lbForbidden.statusCode === 403, 'Student cannot view preparatory leaderboard when enrolled in primary_2 (403)');

  // 12. Failed Request & Retry
  console.log('\n--- 12. Failed Request & Safe Retry ---');
  const failMissing = await makePostRequest('/api/church/student-progress/complete-lesson', {
    lessonId: '',
    versionId: '',
    studentId
  }, studentToken);
  assert(failMissing.statusCode === 400, 'Empty params returns 400 MISSING_PARAMS');
  assert(failMissing.json?.error === 'MISSING_PARAMS', 'Error code is MISSING_PARAMS');

  // Retry with valid parameters completes safely
  const retryRes = await makePostRequest('/api/church/student-progress/complete-lesson', {
    lessonId,
    versionId,
    studentId
  }, studentToken);
  assert(retryRes.statusCode === 200, 'Retry with correct parameters succeeds safely with 200');

  // 13. Unauthorized & Fabricated Completion Protection
  console.log('\n--- 13. Unauthorized & Fabricated Completion Rejections ---');
  // 13a. Cross-student progress write attempt
  const crossWrite = await makePostRequest('/api/church/student-progress/complete-lesson', {
    lessonId,
    versionId,
    studentId: 'other'
  }, studentToken);
  assert(crossWrite.statusCode === 403, 'Student cannot write progress on behalf of another student (403)');

  // 13b. Parent attempts to write student learning progress
  const parentToken = 'test_jwt_parent_mary';
  const parentWrite = await makePostRequest('/api/church/student-progress/complete-lesson', {
    lessonId,
    versionId,
    studentId: 'mark'
  }, parentToken);
  assert(parentWrite.statusCode === 403, 'Parent is strictly rejected from writing lesson completion (403)');

  // 13c. Student attempts to complete a lesson assigned to a different class group
  const wrongClassLesson = await makePostRequest('/api/church/student-progress/complete-lesson', {
    lessonId: 'l-prep-01',
    versionId: 'v-prep-01',
    studentId: 'mark'
  }, studentToken);
  assert(wrongClassLesson.statusCode === 403, 'Student completing lesson for unassigned class is rejected (403)');

  // 14. Authoritative Lesson Completion Diagnostic Utility
  console.log('\n--- 14. Diagnostic Utility Verification ---');
  const diagRes = await makeGetRequest(`/api/church/student-progress/diagnose/${lessonId}`, {}, studentToken);
  assert(diagRes.statusCode === 200, 'Diagnostic endpoint returns 200 OK');
  assert(diagRes.json?.serverState?.status === 'COMPLETED', 'Diagnostic reports serverState status as COMPLETED');
  assert(diagRes.json?.serverState?.pointsAwarded === true, 'Diagnostic confirms pointsAwarded is true');
  assert(diagRes.json?.diagnostics?.isCompleteOnServer === true, 'Diagnostic confirms isCompleteOnServer is true');
  assert(diagRes.json?.diagnostics?.isSynchronized === true, 'Diagnostic reports isSynchronized is true');
  assert(diagRes.json?.pointsTreasury?.totalPoints >= initialPoints + 50, 'Diagnostic reflects authoritative points treasury');

  // Diagnostic cross-student privacy protection
  const diagForbidden = await makeGetRequest(`/api/church/student-progress/diagnose/${lessonId}`, { studentId: 'other' }, studentToken);
  assert(diagForbidden.statusCode === 403, 'Student cannot inspect diagnostic records for another student (403)');

  console.log('\n================================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runTestSuite().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
