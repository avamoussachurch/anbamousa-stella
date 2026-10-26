// ==============================================================================
// Focused Test Suite: Quiz UX Improvements & Streak Persistence
// Tests:
// 1. 100% score triggers ConfettiCanvas (component presence, pointer-events-none, cleanup, condition)
// 2. Start Quiz button is rendered, prominent, accessible, and clickable after lesson completion
// 3. Streak is calculated, authoritatively saved, and returned by the server
// 4. Streak survives refresh and new-session queries
// 5. Duplicate submission does not add another streak or points
// ==============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function makePost(pathName, payload, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = new URL(pathName, BASE_URL);
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

function makeGet(pathName, queryParams = {}, token) {
  return new Promise((resolve, reject) => {
    const query = new URLSearchParams(queryParams).toString();
    const fullPath = query ? `${pathName}?${query}` : pathName;
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

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runQuizUXTests() {
  console.log('================================================================');
  console.log('FOCUSED TESTS: Quiz UX Improvements & Streak Persistence');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. CONFETTI CANVAS VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('--- 1. Confetti Canvas Component & Trigger Invariants ---');
  const confettiPath = path.join(__dirname, '..', 'src', 'components', 'sunday-school', 'student', 'ConfettiCanvas.tsx');
  assert(fs.existsSync(confettiPath), '1.1 ConfettiCanvas.tsx file exists');
  const confettiCode = fs.readFileSync(confettiPath, 'utf8');

  assert(confettiCode.includes('pointerEvents: \'none\'') || confettiCode.includes('pointer-events-none'), '1.2 Canvas has pointer-events-none so it never blocks buttons');
  assert(confettiCode.includes('cancelAnimationFrame'), '1.3 Cleans up requestAnimationFrame on unmount / results close');
  assert(confettiCode.includes('clearTimeout'), '1.4 Cleans up spawn timers properly');
  assert(confettiCode.includes('window.removeEventListener'), '1.5 Removes resize event listeners cleanly');
  assert(!confettiCode.includes('prefers-reduced-motion'), '1.6 Confetti celebration always plays without reduced-motion suppression');

  const quizViewPath = path.join(__dirname, '..', 'src', 'components', 'sunday-school', 'student', 'SundaySchoolQuizView.tsx');
  const quizViewCode = fs.readFileSync(quizViewPath, 'utf8');
  assert(quizViewCode.includes('import { ConfettiCanvas }'), '1.7 SundaySchoolQuizView imports ConfettiCanvas');
  assert(quizViewCode.includes('displayPercentage === 100 && <ConfettiCanvas />'), '1.8 ConfettiCanvas triggers strictly after server confirms 100% score');

  // ---------------------------------------------------------------------------
  // 2. START QUIZ BUTTON IN TRANSITION SCREEN
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Start Quiz Button After Lesson Completion ---');
  const lessonViewPath = path.join(__dirname, '..', 'src', 'components', 'student', 'LessonView.tsx');
  const lessonViewCode = fs.readFileSync(lessonViewPath, 'utf8');

  assert(lessonViewCode.includes('data-testid="start-quiz-button"'), '2.1 Prominent start-quiz-button rendered in transition screen');
  assert(lessonViewCode.includes('ابدأ اختبار المراجعة الآن'), '2.2 Clear Arabic label displayed');
  assert(lessonViewCode.includes('Start Review Quiz'), '2.3 Clear English label displayed');
  assert(lessonViewCode.includes('setIsTakingQuiz(true)'), '2.4 Clicking button immediately launches the quiz');
  assert(lessonViewCode.includes('min-h-[58px]') || lessonViewCode.includes('min-h-[66px]'), '2.5 Large responsive tap target for mobile phones');

  // ---------------------------------------------------------------------------
  // 3. SERVER-AUTHORITATIVE STREAK CALCULATION & SAVING
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Streak Persistence & Server Authority ---');
  const testStudentId = `stu_ux_${Date.now()}`;
  const testStudentToken = `test_jwt_student_${testStudentId}`;
  const lessonId = `l-step4-ux-${Date.now()}`;

  const quizRes = await makeGet('/api/church/student-quiz', { lessonId }, testStudentToken);
  assert(quizRes.statusCode === 200 && quizRes.json?.success === true, '3.1 Quiz loaded successfully');
  const questions = quizRes.json?.quiz?.questions || [];
  const versionId = quizRes.json?.quiz?.versionId;
  const quizId = quizRes.json?.quiz?.id;

  const correctAnswers = questions.map(q => ({
    questionId: q.id,
    selectedOptionIndex: q.correctIndex
  }));

  // Submit 100% quiz
  const submitRes = await makePost('/api/church/student-quiz/submit', {
    lessonId,
    versionId,
    quizId,
    answers: correctAnswers
  }, testStudentToken);

  assert(submitRes.statusCode === 200 && submitRes.json?.success === true, '3.2 100% submission succeeds (200 OK)');
  assert(submitRes.json?.attempt?.percentage === 100, '3.3 Server confirmed 100% score');
  assert(submitRes.json?.isFirstCompletion === true, '3.4 Marked as first completion');
  assert(submitRes.json?.pointsEarned === 50, '3.5 50 points earned');
  assert(submitRes.json?.streak?.currentStreak >= 1, `3.6 Streak saved and returned by server (currentStreak: ${submitRes.json?.streak?.currentStreak})`);
  assert(submitRes.json?.streak?.streakGained === true, '3.7 streakGained is true on active day');
  assert(Boolean(submitRes.json?.streak?.lastActiveCairoDate), `3.8 Cairo date recorded: ${submitRes.json?.streak?.lastActiveCairoDate}`);

  const initialStreak = submitRes.json?.streak?.currentStreak;
  const initialPoints = submitRes.json?.totalPoints;

  // ---------------------------------------------------------------------------
  // 4. REFRESH & NEW SESSION PERSISTENCE
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Refresh & New-Session Streak Persistence ---');
  // Query authoritative student progress summary
  const summaryRes = await makeGet('/api/church/student-progress/summary', { studentId: testStudentId }, testStudentToken);
  assert(summaryRes.statusCode === 200 && summaryRes.json?.success === true, '4.1 Progress summary fetched after session refresh');
  assert(summaryRes.json?.streak?.currentStreak === initialStreak, `4.2 Streak persisted across session refresh (${summaryRes.json?.streak?.currentStreak} == ${initialStreak})`);
  assert(summaryRes.json?.points === initialPoints, `4.3 Points persisted across session refresh (${summaryRes.json?.points} == ${initialPoints})`);
  assert(summaryRes.json?.streak?.isActiveToday === true, '4.4 Student marked active today');

  // ---------------------------------------------------------------------------
  // 5. DUPLICATE SUBMISSION DOES NOT DUPLICATE STREAK
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Duplicate Submission Streak Protection ---');
  const dupRes = await makePost('/api/church/student-quiz/submit', {
    lessonId,
    versionId,
    quizId,
    answers: correctAnswers
  }, testStudentToken);

  assert(dupRes.statusCode === 200 && dupRes.json?.success === true, '5.1 Duplicate submission handled safely (200 OK)');
  assert(dupRes.json?.isDuplicate === true, '5.2 Flagged as duplicate');
  assert(dupRes.json?.pointsEarned === 0, '5.3 Duplicate awards 0 points');
  assert(dupRes.json?.streak?.streakGained === false, '5.4 Duplicate does NOT add another streak');
  assert(dupRes.json?.streak?.currentStreak === initialStreak, `5.5 Current streak unchanged (${dupRes.json?.streak?.currentStreak})`);
  assert(dupRes.json?.totalPoints === initialPoints, `5.6 Total points unchanged (${dupRes.json?.totalPoints})`);

  // Final summary check to ensure no side-effect leakage
  const finalSummary = await makeGet('/api/church/student-progress/summary', { studentId: testStudentId }, testStudentToken);
  assert(finalSummary.json?.streak?.currentStreak === initialStreak, `5.7 Persisted streak remains strictly ${initialStreak} after duplicate attempt`);

  console.log('================================================================');
  console.log(`Quiz UX & Streak Tests Finished: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runQuizUXTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
