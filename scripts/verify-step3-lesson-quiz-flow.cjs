// Step 3 Verification Suite: Lesson Quiz Flow, Persistence, Duplicate Protection, and Refresh/New-Session Survival
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

async function runStep3QuizTests() {
  console.log('================================================================');
  console.log('Step 3: Lesson Quiz Flow, Duplicate Protection & Persistence Test');
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

  const studentId = `test_quiz_student_${Date.now()}`;
  let studentToken = `test_jwt_student_${studentId}`;
  const lessonId = 'l-cross-01';
  const versionId = 'ver-pub-l-cross-01';
  const quizId = 'quiz-ver-pub-l-cross-01';

  // 1. Fetch active lesson quiz
  console.log('--- 1. Fetch Published Lesson Quiz ---');
  const quizRes = await makeGet('/api/church/student-quiz', { lessonId }, studentToken);
  assert(quizRes.statusCode === 200 && quizRes.json?.success === true, '1.1 GET /api/church/student-quiz returns 200 OK');
  assert(Array.isArray(quizRes.json?.quiz?.questions) && quizRes.json.quiz.questions.length > 0, '1.2 Quiz has active questions');
  const questions = quizRes.json.quiz.questions;
  console.log(`Quiz loaded with ${questions.length} questions`);

  // 2. Start Lesson and Complete Reading Sections
  console.log('\n--- 2. Complete Lesson Reading Sections ---');
  await makePost('/api/church/student-progress/start', { lessonId, versionId }, studentToken);
  await makePost('/api/church/student-progress/complete-section', { lessonId, versionId, sectionId: 'sec-1' }, studentToken);
  await makePost('/api/church/student-progress/complete-section', { lessonId, versionId, sectionId: 'sec-2' }, studentToken);
  await makePost('/api/church/student-progress/complete-section', { lessonId, versionId, sectionId: 'sec-3' }, studentToken);
  const finishRes = await makePost('/api/church/student-progress/complete-lesson', { lessonId, versionId }, studentToken);
  assert(finishRes.statusCode === 200 && finishRes.json?.success === true, '2.1 Reading completed authoritatively');

  // 3. Validation: Missing parameters rejected
  console.log('\n--- 3. Quiz Submit Validation Handling ---');
  const invalidRes = await makePost('/api/church/student-quiz/submit', { lessonId }, studentToken);
  assert(invalidRes.statusCode === 400, '3.1 Missing versionId and quizId rejected with 400 BAD REQUEST');
  assert(invalidRes.json?.error === 'MISSING_PARAMS', '3.2 Error code is MISSING_PARAMS');

  // 4. Submit Authentic Quiz Answers
  console.log('\n--- 4. Authoritative Quiz Answer Submission ---');
  // Formulate correct answers
  const correctAnswers = questions.map(q => ({
    questionId: q.id,
    selectedOptionIndex: q.correctIndex
  }));

  const submitRes = await makePost('/api/church/student-quiz/submit', {
    lessonId,
    versionId,
    quizId,
    answers: correctAnswers
  }, studentToken);

  assert(submitRes.statusCode === 200 && submitRes.json?.success === true, '4.1 Quiz submission returns 200 OK');
  assert(submitRes.json?.attempt?.percentage === 100, '4.2 Server computes 100% score authoritatively');
  assert(submitRes.json?.attempt?.passed === true, '4.3 Attempt passed is true');
  assert(submitRes.json?.attempt?.score === questions.length, '4.4 Score matches question count');
  assert(submitRes.json?.isDuplicate === false, '4.5 First submission is not marked as duplicate');
  const attemptId = submitRes.json?.attempt?.id;
  assert(Boolean(attemptId), '4.6 Server issued a valid attempt ID: ' + attemptId);

  // 5. Duplicate Quiz Submission Protection
  console.log('\n--- 5. Duplicate Quiz Submission Protection ---');
  const dupRes = await makePost('/api/church/student-quiz/submit', {
    lessonId,
    versionId,
    quizId,
    answers: correctAnswers
  }, studentToken);

  assert(dupRes.statusCode === 200 && dupRes.json?.success === true, '5.1 Duplicate submission returns 200 OK safely');
  assert(dupRes.json?.isDuplicate === true, '5.2 Server identifies submission as duplicate');
  assert(dupRes.json?.attempt?.id === attemptId, '5.3 Server safely returns the existing attempt ID');

  // Check attempt list on server doesn't have duplicate records
  const attemptsCheck = await makeGet('/api/church/student-quiz/attempts', { lessonId }, studentToken);
  assert(attemptsCheck.json?.attempts?.length === 1, '5.4 Only 1 attempt stored on server (duplicate prevented)');

  // 6. Refresh Simulation (Querying summary and attempts)
  console.log('\n--- 6. Browser Refresh Simulation ---');
  const refreshSummary = await makeGet('/api/church/student-progress/summary', {}, studentToken);
  assert(refreshSummary.statusCode === 200, '6.1 Summary query after refresh returns 200 OK');
  assert(refreshSummary.json?.allProgress?.[lessonId]?.quizScore === 100, '6.2 Quiz score (100%) preserved in allProgress after refresh');
  assert(refreshSummary.json?.quizScores?.[lessonId] === 100, '6.3 Quiz score preserved in latestQuizScores after refresh');

  const refreshAttempts = await makeGet('/api/church/student-quiz/attempts', { lessonId }, studentToken);
  assert(refreshAttempts.statusCode === 200, '6.4 Attempts query returns 200 OK after refresh');
  assert(refreshAttempts.json?.attempts?.[0]?.percentage === 100, '6.5 Attempt percentage preserved after refresh');
  assert(refreshAttempts.json?.attempts?.[0]?.answers?.length === questions.length, '6.6 Full recorded answers preserved after refresh');

  // 7. Complete Logout & Login Simulation (New Session)
  console.log('\n--- 7. Logout & Fresh Session Login Persistence ---');
  // Invalidate previous session
  studentToken = null;

  // New session token issued upon fresh login
  const newSessionToken = `test_jwt_student_${studentId}`;
  console.log(`Re-authenticating student ${studentId} with fresh session token...`);

  const newSessionSummary = await makeGet('/api/church/student-progress/summary', {}, newSessionToken);
  assert(newSessionSummary.statusCode === 200, '7.1 Fresh session summary returns 200 OK');
  assert(newSessionSummary.json?.allProgress?.[lessonId]?.quizScore === 100, '7.2 Quiz score preserved in new session summary');
  assert(newSessionSummary.json?.completedLessonIds?.includes(lessonId), '7.3 Lesson remains completed in new session');

  const newSessionAttempts = await makeGet('/api/church/student-quiz/attempts', { lessonId }, newSessionToken);
  assert(newSessionAttempts.statusCode === 200, '7.4 Fresh session attempts query returns 200 OK');
  assert(newSessionAttempts.json?.attempts?.length === 1, '7.5 Attempt history preserved across logout/login');
  assert(newSessionAttempts.json?.attempts?.[0]?.percentage === 100, '7.6 Attempt score 100% persists in new session');

  // 8. Security and Isolation
  console.log('\n--- 8. Security, Cross-Student & Role Isolation ---');
  const otherStudentToken = `test_jwt_student_other_${Date.now()}`;
  const eavesdropRes = await makeGet('/api/church/student-quiz/attempts', { lessonId, studentId }, otherStudentToken);
  assert(eavesdropRes.statusCode === 403, '8.1 Other student rejected from reading target student attempts (403)');

  const teacherToken = 'test_jwt_teacher_servant_mina';
  const teacherSubmitRes = await makePost('/api/church/student-quiz/submit', {
    lessonId,
    versionId,
    quizId,
    answers: correctAnswers,
    studentId
  }, teacherToken);
  assert(teacherSubmitRes.statusCode === 403, '8.2 Teacher strictly rejected from submitting student quiz (403)');

  console.log('\n================================================================');
  console.log(`Step 3 Verification Finished: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep3QuizTests().catch(err => {
  console.error('Fatal quiz test error:', err);
  process.exit(1);
});
