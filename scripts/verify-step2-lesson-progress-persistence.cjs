// Step 2 Verification Script: Lesson Progress & Backend Persistence E2E Test
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

async function runStep2Verification() {
  console.log('================================================================');
  console.log('Step 2: Lesson Progress System & Backend Persistence Verification');
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

  const studentId = `test_student_step2_${Date.now()}`;
  const studentToken = `test_jwt_student_${studentId}`;
  const lessonId = 'l-cross-01';
  const versionId = 'ver-pub-l-cross-01';

  // 1. Fresh student summary check
  console.log('--- 1. Initial Fresh Student Progress State ---');
  const sum1 = await makeGet('/api/church/student-progress/summary', {}, studentToken);
  assert(sum1.statusCode === 200 && sum1.json?.success === true, '1.1 Summary endpoint returns 200 OK');
  assert(!sum1.json?.completedLessonIds?.includes(lessonId), '1.2 Lesson is not completed initially');
  const initialPoints = sum1.json?.points || 0;

  // 2. Start Lesson Progress
  console.log('--- 2. Start Lesson Progress ---');
  const startRes = await makePost('/api/church/student-progress/start', {
    lessonId,
    versionId
  }, studentToken);
  assert(startRes.statusCode === 200 && startRes.json?.success === true, '2.1 Start lesson returns 200 OK');
  assert(startRes.json?.progress?.status === 'IN_PROGRESS', '2.2 Progress status is IN_PROGRESS');

  // 3. Mark Section Read (Reading completion state)
  console.log('--- 3. Section Reading Completion State ---');
  const secRes = await makePost('/api/church/student-progress/complete-section', {
    lessonId,
    versionId,
    sectionId: 'sec-1'
  }, studentToken);
  assert(secRes.statusCode === 200 && secRes.json?.success === true, '3.1 Section completion returns 200 OK');
  assert(secRes.json?.progress?.sectionsCompleted?.includes('sec-1'), '3.2 Section sec-1 is recorded in progress');

  // Complete other sections to finish reading
  await makePost('/api/church/student-progress/complete-section', { lessonId, versionId, sectionId: 'sec-2' }, studentToken);
  await makePost('/api/church/student-progress/complete-section', { lessonId, versionId, sectionId: 'sec-3' }, studentToken);

  // 4. Complete Lesson authoritatively (Finished reading / finished learning action)
  console.log('--- 4. Authoritative Lesson Completion ---');
  const compRes = await makePost('/api/church/student-progress/complete-lesson', {
    lessonId,
    versionId
  }, studentToken);
  assert(compRes.statusCode === 200 && compRes.json?.success === true, '4.1 Complete lesson returns 200 OK');
  assert(compRes.json?.isFirstCompletion === true, '4.2 First completion is true');
  assert(compRes.json?.pointsEarned === 50, '4.3 50 points awarded on first completion');
  assert(compRes.json?.totalPoints === initialPoints + 50, '4.4 Total points authoritatively incremented by 50');
  assert(compRes.json?.progress?.status === 'COMPLETED', '4.5 Progress status is COMPLETED');

  // 5. Duplicate Completion Protection (Second Submission)
  console.log('--- 5. Duplicate Completion Protection ---');
  const dupRes = await makePost('/api/church/student-progress/complete-lesson', {
    lessonId,
    versionId
  }, studentToken);
  assert(dupRes.statusCode === 200 && dupRes.json?.success === true, '5.1 Duplicate completion request succeeds safely (200 OK)');
  assert(dupRes.json?.isFirstCompletion === false, '5.2 isFirstCompletion is false on second completion');
  assert(dupRes.json?.pointsEarned === 0, '5.3 0 additional points awarded on duplicate');
  assert(dupRes.json?.totalPoints === initialPoints + 50, '5.4 Total points unchanged by duplicate submission');

  // 6. Persistence & Restoration after new session / reload (Server-Side Verification)
  console.log('--- 6. Persistence Survived New Session / Refresh ---');
  // Querying fresh summary without in-memory client state simulates a brand new browser tab / session
  const freshSum = await makeGet('/api/church/student-progress/summary', {}, studentToken);
  assert(freshSum.statusCode === 200 && freshSum.json?.success === true, '6.1 Fresh summary query succeeds with 200 OK');
  assert(freshSum.json?.completedLessonIds?.includes(lessonId), '6.2 Completed lesson ID is restored in completedLessonIds');
  assert(freshSum.json?.allProgress?.[lessonId]?.status === 'COMPLETED', '6.3 Detailed progress status is restored as COMPLETED');
  assert(freshSum.json?.points === initialPoints + 50, '6.4 Points persist across sessions');
  assert(freshSum.json?.streak?.currentStreak >= 1, '6.5 Cairo streak persists across sessions');

  // 7. Verify diagnostic integrity
  console.log('--- 7. Diagnostic Consistency Check ---');
  const diagRes = await makeGet(`/api/church/student-progress/diagnose/${lessonId}`, {}, studentToken);
  assert(diagRes.statusCode === 200 && diagRes.json?.success === true, '7.1 Diagnostic check returns 200 OK');
  assert(diagRes.json?.serverState?.status === 'COMPLETED', '7.2 Diagnostic confirms lesson status is COMPLETED');
  assert(diagRes.json?.serverState?.pointsAwarded === true, '7.3 Diagnostic confirms pointsAwarded is true');
  assert(diagRes.json?.serverState?.isCompleteOnServer === true || diagRes.json?.diagnostics?.isCompleteOnServer === true, '7.4 Diagnostic confirms isCompleteOnServer is true');

  console.log('\n================================================================');
  console.log(`Step 2 Verification Finished: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep2Verification().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
