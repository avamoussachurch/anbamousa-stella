// ==============================================================================
// Focused Step 4 Verification Test Suite:
// Quiz-result Celebrations, Points, Streak Updates, and Duplicate Protection
// Tests:
// 1. 100% Score (Tier 1: Perfect Score, First Completion Award, Streak Update)
// 2. Duplicate Submission Protection (idempotency, 0 duplicate points, 0 duplicate streak)
// 3. 85% Score (Tier 2: 80-99% Celebration Tier, Server-side Grading)
// 4. 50% Score (Tier 3: 50-79% Normal Completion, Passed=True, Valid Award)
// 5. Below 50% Score (Tier 4: <50% Retry/Revision, Passed=False, 0 Points, No Streak)
// 6. Retake Protection (Repeat attempt on completed lesson does not re-award points)
// ==============================================================================

const http = require('http');

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

async function runStep4Tests() {
  console.log('================================================================');
  console.log('STEP 4 FOCUSED TESTS: Quiz Celebrations, Points & Streak Awards');
  console.log('================================================================\n');

  // Test 1: 100% Score (Tier 100%)
  console.log('--- 1. Focused Test: 100% Score & First Completion Reward ---');
  const student1Id = `stu_step4_${Date.now()}_100`;
  const student1Token = `test_jwt_student_${student1Id}`;
  const lesson1Id = 'l-cross-01';
  const version1Id = 'ver-pub-l-cross-01';
  const quiz1Id = 'quiz-ver-pub-l-cross-01';

  const quiz1Res = await makeGet('/api/church/student-quiz', { lessonId: lesson1Id }, student1Token);
  assert(quiz1Res.statusCode === 200 && quiz1Res.json?.success === true, '1.1 Fetched published quiz successfully');
  const questions1 = quiz1Res.json?.quiz?.questions || [];
  assert(questions1.length > 0, `1.2 Loaded ${questions1.length} questions for lesson`);

  // Answer 100% correctly
  const allCorrectAnswers = questions1.map(q => ({
    questionId: q.id,
    selectedOptionIndex: q.correctIndex
  }));

  const res100 = await makePost('/api/church/student-quiz/submit', {
    lessonId: lesson1Id,
    versionId: version1Id,
    quizId: quiz1Id,
    answers: allCorrectAnswers
  }, student1Token);

  assert(res100.statusCode === 200 && res100.json?.success === true, '1.3 100% submission succeeds with 200 OK');
  assert(res100.json?.attempt?.percentage === 100, `1.4 Authoritative score is 100% (got ${res100.json?.attempt?.percentage}%)`);
  assert(res100.json?.attempt?.passed === true, '1.5 100% attempt passed is true');
  assert(res100.json?.isFirstCompletion === true, '1.6 First completion flagged true');
  assert(res100.json?.pointsEarned === 50, `1.7 Exactly 50 points awarded for completion (got ${res100.json?.pointsEarned})`);
  assert(res100.json?.totalPoints >= 50, `1.8 Student totalPoints updated correctly (got ${res100.json?.totalPoints})`);
  assert(res100.json?.streak?.currentStreak >= 1, `1.9 Streak recorded >= 1 day (got ${res100.json?.streak?.currentStreak})`);
  assert(res100.json?.streak?.streakGained === true, '1.10 Streak gained flag is true on first active day');
  const totalPointsAfterFirst = res100.json?.totalPoints;

  // Test 2: Duplicate Submission Protection
  console.log('\n--- 2. Focused Test: Duplicate Submission Protection ---');
  const dupRes = await makePost('/api/church/student-quiz/submit', {
    lessonId: lesson1Id,
    versionId: version1Id,
    quizId: quiz1Id,
    answers: allCorrectAnswers
  }, student1Token);

  assert(dupRes.statusCode === 200 && dupRes.json?.success === true, '2.1 Duplicate request handled smoothly');
  assert(dupRes.json?.isDuplicate === true, '2.2 Identified as duplicate submission');
  assert(dupRes.json?.isFirstCompletion === false, '2.3 isFirstCompletion is false on duplicate');
  assert(dupRes.json?.pointsEarned === 0, '2.4 Exactly 0 points earned on duplicate (no double award)');
  assert(dupRes.json?.streak?.streakGained === false, '2.5 No duplicate streak gained');
  assert(dupRes.json?.totalPoints === totalPointsAfterFirst, '2.6 Total points remains unchanged');

  // Test 3: 85% Score (Tier 80-99%)
  console.log('\n--- 3. Focused Test: 85% Score (Tier 80-99%) ---');
  const student85Id = `stu_step4_${Date.now()}_85`;
  const student85Token = `test_jwt_student_${student85Id}`;
  const lesson85Id = 'l-step4-tier85-20q';

  const quiz85Res = await makeGet('/api/church/student-quiz', { lessonId: lesson85Id }, student85Token);
  assert(quiz85Res.statusCode === 200 && quiz85Res.json?.success === true, '3.1 Fetched quiz for 85% tier test');
  const questions85 = quiz85Res.json?.quiz?.questions || [];
  const version85Id = quiz85Res.json?.quiz?.versionId;
  const quiz85Id = quiz85Res.json?.quiz?.id;
  assert(questions85.length === 20, `3.2 Loaded 20 questions for 85% tier verification (got ${questions85.length})`);

  // Answer 17 out of 20 correctly (17 / 20 = 85%)
  const answers85 = questions85.map((q, idx) => ({
    questionId: q.id,
    selectedOptionIndex: idx < 17 ? q.correctIndex : (q.correctIndex + 1) % 4
  }));

  const res85 = await makePost('/api/church/student-quiz/submit', {
    lessonId: lesson85Id,
    versionId: version85Id,
    quizId: quiz85Id,
    answers: answers85
  }, student85Token);

  assert(res85.statusCode === 200 && res85.json?.success === true, '3.3 85% submission succeeds');
  assert(res85.json?.attempt?.score === 17, `3.4 Score is 17 (got ${res85.json?.attempt?.score})`);
  assert(res85.json?.attempt?.totalScore === 20, '3.5 Total questions is 20');
  assert(res85.json?.attempt?.percentage === 85, `3.6 Score is exactly 85% (got ${res85.json?.attempt?.percentage}%)`);
  assert(res85.json?.attempt?.passed === true, '3.7 85% attempt passed is true');
  assert(res85.json?.isFirstCompletion === true, '3.8 First completion awarded on 85% pass');
  assert(res85.json?.pointsEarned === 50, '3.9 Exactly 50 points awarded');

  // Test 4: 50% Score (Tier 50-79% Normal Completion)
  console.log('\n--- 4. Focused Test: 50% Score (Tier 50-79% Normal Completion) ---');
  const student50Id = `stu_step4_${Date.now()}_50`;
  const student50Token = `test_jwt_student_${student50Id}`;
  const lesson50Id = `l-step4-50-${Date.now()}`;

  const quiz50Res = await makeGet('/api/church/student-quiz', { lessonId: lesson50Id }, student50Token);
  assert(quiz50Res.statusCode === 200 && quiz50Res.json?.success === true, '4.1 Fetched quiz for 50% tier test');
  const questions50 = quiz50Res.json?.quiz?.questions || [];
  const version50Id = quiz50Res.json?.quiz?.versionId;
  const quiz50Id = quiz50Res.json?.quiz?.id;
  assert(questions50.length === 2, `4.2 Loaded 2 questions for 50% test (got ${questions50.length})`);

  // Answer 1 out of 2 correctly (1 / 2 = 50%)
  const answers50 = [
    { questionId: questions50[0].id, selectedOptionIndex: questions50[0].correctIndex },
    { questionId: questions50[1].id, selectedOptionIndex: (questions50[1].correctIndex + 1) % 4 }
  ];

  const res50 = await makePost('/api/church/student-quiz/submit', {
    lessonId: lesson50Id,
    versionId: version50Id,
    quizId: quiz50Id,
    answers: answers50
  }, student50Token);

  assert(res50.statusCode === 200 && res50.json?.success === true, '4.3 50% submission succeeds');
  assert(res50.json?.attempt?.percentage === 50, `4.4 Score is exactly 50% (got ${res50.json?.attempt?.percentage}%)`);
  assert(res50.json?.attempt?.passed === true, '4.5 50% attempt passed is true (normal completion threshold)');
  assert(res50.json?.isFirstCompletion === true, '4.6 50% achieves first completion reward');
  assert(res50.json?.pointsEarned === 50, '4.7 Exactly 50 points earned');

  // Test 5: Below 50% Score (Tier < 50% Retry/Revision)
  console.log('\n--- 5. Focused Test: Below 50% Score (Tier < 50% Retry Encouragement) ---');
  const studentBelowId = `stu_step4_${Date.now()}_below`;
  const studentBelowToken = `test_jwt_student_${studentBelowId}`;
  const lessonBelowId = `l-step4-below-${Date.now()}`;

  const quizBelowRes = await makeGet('/api/church/student-quiz', { lessonId: lessonBelowId }, studentBelowToken);
  assert(quizBelowRes.statusCode === 200 && quizBelowRes.json?.success === true, '5.1 Fetched quiz for below 50% test');
  const questionsBelow = quizBelowRes.json?.quiz?.questions || [];
  const versionBelowId = quizBelowRes.json?.quiz?.versionId;
  const quizBelowId = quizBelowRes.json?.quiz?.id;

  // Answer 0 out of 2 correctly (0% < 50%)
  const answersBelow = questionsBelow.map(q => ({
    questionId: q.id,
    selectedOptionIndex: (q.correctIndex + 1) % 4
  }));

  const resBelow = await makePost('/api/church/student-quiz/submit', {
    lessonId: lessonBelowId,
    versionId: versionBelowId,
    quizId: quizBelowId,
    answers: answersBelow
  }, studentBelowToken);

  assert(resBelow.statusCode === 200 && resBelow.json?.success === true, '5.2 Below 50% submission succeeds');
  assert(resBelow.json?.attempt?.percentage === 0, `5.3 Score is 0% (< 50%) (got ${resBelow.json?.attempt?.percentage}%)`);
  assert(resBelow.json?.attempt?.passed === false, '5.4 passed is false for score < 50%');
  assert(resBelow.json?.isFirstCompletion === false, '5.5 isFirstCompletion is false for score < 50%');
  assert(resBelow.json?.pointsEarned === 0, '5.6 Exactly 0 points awarded on score < 50%');
  assert(resBelow.json?.streak?.streakGained === false, '5.7 No streak gained for unpassed attempt');

  // Test 6: Retake Protection (Repeat attempt on completed lesson does not re-award)
  console.log('\n--- 6. Focused Test: Retake Protection (No Double-Awarding on Repeat Attempts) ---');
  // Student 1 (who already scored 100% on l-cross-01 in Test 1) submits another attempt with 50%
  const retakeAnswers = [
    { questionId: questions1[0].id, selectedOptionIndex: questions1[0].correctIndex },
    { questionId: questions1[1].id, selectedOptionIndex: (questions1[1].correctIndex + 1) % 4 }
  ];
  const retakeRes = await makePost('/api/church/student-quiz/submit', {
    lessonId: lesson1Id,
    versionId: version1Id,
    quizId: quiz1Id,
    answers: retakeAnswers
  }, student1Token);

  assert(retakeRes.statusCode === 200 && retakeRes.json?.success === true, '6.1 Retake attempt recorded');
  assert(retakeRes.json?.isDuplicate === false, '6.2 Retake with different answers is marked isDuplicate: false');
  assert(retakeRes.json?.isFirstCompletion === false, '6.3 isFirstCompletion is false (already completed previously)');
  assert(retakeRes.json?.pointsEarned === 0, '6.4 Exactly 0 points earned on retake (no double points)');
  assert(retakeRes.json?.streak?.streakGained === false, '6.5 No duplicate streak gained on retake');

  console.log('================================================================');
  console.log(`Step 4 Verification Finished: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep4Tests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
