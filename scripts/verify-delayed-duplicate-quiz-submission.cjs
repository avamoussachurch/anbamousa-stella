// Focused Test: Delayed Duplicate Quiz Submission & Durable Idempotency
// Verifies that re-submitting after >8 seconds, after refresh, and after logout/login
// NEVER creates a duplicate attempt or re-awards anything.

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDelayedDuplicateQuizTest() {
  console.log('================================================================');
  console.log('Focused Test: Delayed Duplicate Quiz Submission & Durable Idempotency');
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

  const studentId = `test_idem_student_${Date.now()}`;
  let studentToken = `test_jwt_student_${studentId}`;
  const lessonId = 'l-cross-01';
  const versionId = 'ver-pub-l-cross-01';
  const quizId = 'quiz-l-cross-01';

  // 1. Prepare reading completion
  console.log('--- 1. Prepare Lesson Reading Completion ---');
  await makePost('/api/church/student-progress/start', { lessonId, versionId }, studentToken);
  await makePost('/api/church/student-progress/complete-section', { lessonId, versionId, sectionId: 'sec-1' }, studentToken);
  await makePost('/api/church/student-progress/complete-section', { lessonId, versionId, sectionId: 'sec-2' }, studentToken);
  await makePost('/api/church/student-progress/complete-section', { lessonId, versionId, sectionId: 'sec-3' }, studentToken);
  await makePost('/api/church/student-progress/complete-lesson', { lessonId, versionId }, studentToken);
  console.log('Reading completed.');

  // Get initial quiz payload
  const quizRes = await makeGet('/api/church/student-quiz', { lessonId }, studentToken);
  const questions = quizRes.json?.quiz?.questions || [];
  const correctAnswers = questions.map(q => ({
    questionId: q.id,
    selectedOptionIndex: q.correctIndex
  }));

  // 2. Initial Submission
  console.log('\n--- 2. Initial Quiz Submission ---');
  const initialSubmit = await makePost('/api/church/student-quiz/submit', {
    lessonId,
    versionId,
    quizId,
    answers: correctAnswers
  }, studentToken);

  assert(initialSubmit.statusCode === 200, '2.1 Initial submission returns 200 OK');
  assert(initialSubmit.json?.isDuplicate === false, '2.2 First submission is NOT a duplicate');
  const initialAttemptId = initialSubmit.json?.attempt?.id;
  assert(Boolean(initialAttemptId), `2.3 Attempt created with ID: ${initialAttemptId}`);

  const check1 = await makeGet('/api/church/student-quiz/attempts', { lessonId }, studentToken);
  assert(check1.json?.attempts?.length === 1, '2.4 Initial attempt count is exactly 1');

  // 3. Delayed Submission (> 9 seconds to exceed the former 8-second window)
  console.log('\n--- 3. Testing Delayed Duplicate Submission (Waiting 9.5 seconds) ---');
  console.log('Waiting 9.5s to ensure time window has expired...');
  await sleep(9500);
  console.log('Wait completed. Re-submitting identical quiz payload...');

  const delayedSubmit = await makePost('/api/church/student-quiz/submit', {
    lessonId,
    versionId,
    quizId,
    answers: correctAnswers
  }, studentToken);

  assert(delayedSubmit.statusCode === 200, '3.1 Delayed submission returns 200 OK');
  assert(delayedSubmit.json?.isDuplicate === true, '3.2 Delayed submission is identified as DUPLICATE via durable idempotency');
  assert(delayedSubmit.json?.attempt?.id === initialAttemptId, '3.3 Returns the original attempt ID (no new attempt created)');

  const check2 = await makeGet('/api/church/student-quiz/attempts', { lessonId }, studentToken);
  assert(check2.json?.attempts?.length === 1, '3.4 Attempt count remains strictly 1 after delayed submission');

  // 4. Duplicate After Browser Refresh
  console.log('\n--- 4. Duplicate Submission After Refresh Simulation ---');
  const refreshSummary = await makeGet('/api/church/student-progress/summary', {}, studentToken);
  assert(refreshSummary.json?.allProgress?.[lessonId]?.quizScore === 100, '4.1 Refresh summary preserves 100% quiz score');

  const refreshSubmit = await makePost('/api/church/student-quiz/submit', {
    lessonId,
    versionId,
    quizId,
    answers: correctAnswers
  }, studentToken);

  assert(refreshSubmit.statusCode === 200, '4.2 Post-refresh submission returns 200 OK');
  assert(refreshSubmit.json?.isDuplicate === true, '4.3 Post-refresh submission is DUPLICATE');
  assert(refreshSubmit.json?.attempt?.id === initialAttemptId, '4.4 Preserves original attempt ID');

  const check3 = await makeGet('/api/church/student-quiz/attempts', { lessonId }, studentToken);
  assert(check3.json?.attempts?.length === 1, '4.5 Attempt count remains strictly 1 after refresh');

  // 5. Duplicate After Logout and New Session Login
  console.log('\n--- 5. Duplicate Submission After Logout & New Session ---');
  studentToken = null;
  const newSessionToken = `test_jwt_student_${studentId}`;

  const newSessionSubmit = await makePost('/api/church/student-quiz/submit', {
    lessonId,
    versionId,
    quizId,
    answers: correctAnswers
  }, newSessionToken);

  assert(newSessionSubmit.statusCode === 200, '5.1 New session submission returns 200 OK');
  assert(newSessionSubmit.json?.isDuplicate === true, '5.2 New session submission is DUPLICATE via durable idempotency');
  assert(newSessionSubmit.json?.attempt?.id === initialAttemptId, '5.3 Preserves original attempt ID across new session');

  const check4 = await makeGet('/api/church/student-quiz/attempts', { lessonId }, newSessionToken);
  assert(check4.json?.attempts?.length === 1, '5.4 Attempt count remains strictly 1 across sessions');
  assert(check4.json?.attempts?.[0]?.percentage === 100, '5.5 Recorded score remains strictly 100%');

  console.log('\n================================================================');
  console.log(`Delayed Duplicate Quiz Test: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runDelayedDuplicateQuizTest().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
