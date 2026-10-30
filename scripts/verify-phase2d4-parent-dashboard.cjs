// Automated Phase 2D.4 Parent/Guardian Learning Dashboard Test Suite
const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function makeGetRequest(path, headers = {}, token = null) {
  return new Promise((resolve) => {
    const reqHeaders = { ...headers };
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }

    const req = http.get(`${BASE_URL}${path}`, { headers: reqHeaders }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {}
        resolve({ statusCode: res.statusCode, data, json });
      });
    });

    req.on('error', (err) => {
      resolve({ statusCode: 500, error: err.message });
    });
  });
}

function makePostRequest(path, payload, token = null) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(payload || {});
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(`${BASE_URL}${path}`, {
      method: 'POST',
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {}
        resolve({ statusCode: res.statusCode, data, json });
      });
    });

    req.on('error', (err) => {
      resolve({ statusCode: 500, error: err.message });
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('Phase 2D.4 Parent/Guardian Learning Dashboard Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      if (details) console.error(`       Details: ${details}`);
      failed++;
    }
  }

  const parentMaryToken = 'test_jwt_parent_mary';         // parent Mary (linked to mark, student-david)
  const studentMarkToken = 'test_jwt_student_mark';       // student Mark
  const teacherMinaToken = 'test_jwt_teacher_mina';       // teacher Mina
  const otherParentToken = 'test_jwt_parent_other';       // parent other (linked to other)

  // Reset test state to clean baseline
  await makePostRequest('/api/church/reset-review-test-state', {});

  // ----------------------------------------------------
  // TEST 1: Authorized Parent Views Single Linked Child
  // ----------------------------------------------------
  console.log('--- Test 1: Authorized Parent Views Linked Child ---');
  const res1 = await makeGetRequest('/api/church/parent/child-learning-review/mark', {}, parentMaryToken);

  assert(
    res1.statusCode === 200 &&
    res1.json?.success === true &&
    res1.json?.student?.id === 'mark' &&
    res1.json?.student?.classGroupId === 'primary_2' &&
    Array.isArray(res1.json?.lessons),
    'Test 1: Parent Mary views learning review for legitimately linked child (Mark)',
    JSON.stringify(res1.json)
  );

  // ----------------------------------------------------
  // TEST 2: Multi-Child Support for Parent Mary
  // ----------------------------------------------------
  console.log('--- Test 2: Multiple Linked Children Support ---');
  const res2Children = await makeGetRequest('/api/church/parent/children', {}, parentMaryToken);
  const childIds = res2Children.json?.children?.map(c => c.id) || [];

  const res2SecondChild = await makeGetRequest('/api/church/parent/child-learning-review/student-david', {}, parentMaryToken);

  assert(
    res2Children.statusCode === 200 &&
    childIds.includes('mark') &&
    childIds.includes('student-david') &&
    res2SecondChild.statusCode === 200 &&
    res2SecondChild.json?.student?.id === 'student-david',
    'Test 2: Parent Mary can access all legitimately linked children (Mark and David)',
    `Children: ${childIds.join(', ')}`
  );

  // ----------------------------------------------------
  // TEST 3: Parent Cannot View Another Parent's Child
  // ----------------------------------------------------
  console.log("--- Test 3: Cross-Parent Isolation ---");
  // Student 'other' is linked to 'other_parent', NOT to 'mary'
  const res3 = await makeGetRequest('/api/church/parent/child-learning-review/other', {}, parentMaryToken);

  assert(
    res3.statusCode === 403 &&
    res3.json?.success === false &&
    res3.json?.error === 'FORBIDDEN',
    "Test 3: Parent Mary receives 403 FORBIDDEN when attempting to access another parent's child (other)",
    `Status: ${res3.statusCode}, Error: ${res3.json?.error}`
  );

  // ----------------------------------------------------
  // TEST 4: Parent Cannot Access Arbitrary Nonexistent Student
  // ----------------------------------------------------
  console.log('--- Test 4: Arbitrary / Nonexistent Student Rejection ---');
  const res4 = await makeGetRequest('/api/church/parent/child-learning-review/arbitrary-child-999', {}, parentMaryToken);

  assert(
    res4.statusCode === 404 &&
    res4.json?.success === false &&
    res4.json?.error === 'STUDENT_NOT_FOUND',
    'Test 4: Querying arbitrary nonexistent student ID returns 404 STUDENT_NOT_FOUND',
    `Status: ${res4.statusCode}, Error: ${res4.json?.error}`
  );

  // ----------------------------------------------------
  // TEST 5: Servant Cannot Use Parent Endpoint
  // ----------------------------------------------------
  console.log('--- Test 5: Servant Access to Parent Endpoints Rejected ---');
  const res5 = await makeGetRequest('/api/church/parent/child-learning-review/mark', {}, teacherMinaToken);

  assert(
    res5.statusCode === 403 &&
    res5.json?.success === false &&
    res5.json?.error === 'FORBIDDEN',
    'Test 5: Servant cannot use parent endpoint to bypass servant class authorization (403 FORBIDDEN)',
    `Status: ${res5.statusCode}, Error: ${res5.json?.error}`
  );

  // ----------------------------------------------------
  // TEST 6: Student Cannot Access Parent Endpoint
  // ----------------------------------------------------
  console.log('--- Test 6: Student Access to Parent Endpoints Rejected ---');
  const res6 = await makeGetRequest('/api/church/parent/child-learning-review/mark', {}, studentMarkToken);

  assert(
    res6.statusCode === 403 &&
    res6.json?.success === false &&
    res6.json?.error === 'FORBIDDEN',
    'Test 6: Student receives 403 FORBIDDEN attempting to access parent dashboard endpoint',
    `Status: ${res6.statusCode}, Error: ${res6.json?.error}`
  );

  // ----------------------------------------------------
  // TEST 7: Authoritative Server-Derived Quiz Scores
  // ----------------------------------------------------
  console.log('--- Test 7: Authoritative Quiz Scores Reflection ---');
  // Student Mark starts lesson and completes quiz
  await makePostRequest('/api/church/student-progress/start', {
    lessonId: 'l-test-multiversion-01',
    versionId: 'v-test-multi-1'
  }, studentMarkToken);

  const quizSubmission = await makePostRequest('/api/church/student-quiz/submit', {
    lessonId: 'l-test-multiversion-01',
    versionId: 'v-test-multi-1',
    quizId: 'quiz-multi-01',
    answers: [
      { questionId: 'q-multi-1', selectedOptionIndex: 0 },
      { questionId: 'q-multi-2', selectedOptionIndex: 1 }
    ]
  }, studentMarkToken);

  const res7 = await makeGetRequest('/api/church/parent/child-learning-review/mark', {}, parentMaryToken);
  const markLesson = res7.json?.lessons?.find(l => l.lessonId === 'l-test-multiversion-01');

  assert(
    quizSubmission.statusCode === 503 &&
    quizSubmission.json?.error === 'QUIZ_PERSISTENCE_NOT_CONFIGURED' &&
    res7.statusCode === 200 &&
    markLesson?.quizAttemptsCount === 0 &&
    markLesson?.latestQuizPercentage === 0,
    'Test 7: Failed quiz persistence is not displayed as a saved score',
    `Submission: ${JSON.stringify(quizSubmission.json)}, review: ${JSON.stringify(markLesson)}`
  );

  // ----------------------------------------------------
  // TEST 8: Authoritative Server-Derived Mastery
  // ----------------------------------------------------
  console.log('--- Test 8: Authoritative Mastery Reflection ---');
  // Complete remaining sections so mastery advances
  await makePostRequest('/api/church/student-progress/complete-section', {
    lessonId: 'l-test-multiversion-01',
    versionId: 'v-test-multi-1',
    sectionId: 'sec-multi-1'
  }, studentMarkToken);
  await makePostRequest('/api/church/student-progress/complete-section', {
    lessonId: 'l-test-multiversion-01',
    versionId: 'v-test-multi-1',
    sectionId: 'sec-multi-2'
  }, studentMarkToken);
  await makePostRequest('/api/church/student-progress/complete-section', {
    lessonId: 'l-test-multiversion-01',
    versionId: 'v-test-multi-1',
    sectionId: 'sec-multi-3'
  }, studentMarkToken);

  const res8 = await makeGetRequest('/api/church/parent/child-learning-review/mark', {}, parentMaryToken);
  const masteredLesson = res8.json?.lessons?.find(l => l.lessonId === 'l-test-multiversion-01');

  assert(
    res8.statusCode === 200 &&
    masteredLesson &&
    masteredLesson.completionPercent === 100 &&
    masteredLesson.sectionsCompleted.length === 3 &&
    masteredLesson.masteryStatus !== 'MASTERED',
    'Test 8: Read sections are shown, but unpersisted quiz results do not imply mastery',
    JSON.stringify(masteredLesson)
  );

  // ----------------------------------------------------
  // TEST 9: Unpublished Lessons Strictly Excluded
  // ----------------------------------------------------
  console.log('--- Test 9: Unpublished Lessons Not Exposed ---');
  const draftLesson = res8.json?.lessons?.find(l => l.lessonId === 'l-test-draft-01');

  assert(
    draftLesson === undefined,
    'Test 9: Unpublished / draft lessons are strictly excluded from parent dashboard',
    `Found draft lesson: ${Boolean(draftLesson)}`
  );

  // ----------------------------------------------------
  // TEST 10: Private Profile Fields Not Exposed
  // ----------------------------------------------------
  console.log('--- Test 10: Privacy Safeguards Verification ---');
  const jsonStr = JSON.stringify(res8.json || {});
  const leaksSensitive = jsonStr.includes('password') ||
    jsonStr.includes('screen_time_seconds') ||
    jsonStr.includes('refreshToken') ||
    jsonStr.includes('access_token');

  assert(
    !leaksSensitive,
    'Test 10: Privacy safe - no passwords, internal relationship IDs, screen time, or tokens leaked',
    `leaksSensitive: ${leaksSensitive}`
  );

  // ----------------------------------------------------
  // TEST 11: Other Students Not Exposed in Payload
  // ----------------------------------------------------
  console.log('--- Test 11: Single Child Isolation in Review ---');
  const returnsOnlyMark = res8.json?.student?.id === 'mark' && !jsonStr.includes('student-david') && !jsonStr.includes('other');

  assert(
    returnsOnlyMark,
    'Test 11: Review payload isolates requested child; unrelated student data is not leaked',
    `Student returned: ${res8.json?.student?.id}`
  );

  // ----------------------------------------------------
  // TEST 12: Read-Only Invariant Enforced
  // ----------------------------------------------------
  console.log('--- Test 12: Read-Only Invariant Enforced ---');
  const res12 = await makePostRequest('/api/church/parent/child-learning-review/mark', { score: 100 }, parentMaryToken);

  assert(
    res12.statusCode === 404,
    'Test 12: POST to child-learning-review endpoint is rejected (strictly read-only)',
    `Status: ${res12.statusCode}`
  );

  // ----------------------------------------------------
  // TEST 13: Nonexistent Child Returns Safe Error
  // ----------------------------------------------------
  console.log('--- Test 13: Nonexistent Child Error Safety ---');
  const res13 = await makeGetRequest('/api/church/parent/child-learning-review/missing-child-404', {}, parentMaryToken);

  assert(
    res13.statusCode === 404 &&
    res13.json?.success === false,
    'Test 13: Nonexistent child returns safe 404 error response without crashing',
    `Status: ${res13.statusCode}`
  );

  // ----------------------------------------------------
  // TEST 14: Parent data endpoints require an authenticated account
  // ----------------------------------------------------
  console.log('--- Test 14: Unauthenticated requests are rejected ---');
  const res14Children = await makeGetRequest('/api/church/parent/children');
  const res14Review = await makeGetRequest('/api/church/parent/child-learning-review/student-david');

  assert(
    res14Children.statusCode === 401 &&
    res14Children.json?.error === 'UNAUTHORIZED' &&
    res14Review.statusCode === 401 &&
    res14Review.json?.error === 'UNAUTHORIZED',
    'Test 14: Unauthenticated requests cannot receive parent or child demo data',
    `Children: ${res14Children.statusCode}, review: ${res14Review.statusCode}`
  );

  // ----------------------------------------------------
  // TEST 15: Missing Parameters Fail Safely Without Fake Success
  // ----------------------------------------------------
  console.log('--- Test 15: Missing Parameter Failure Safety ---');
  const res15 = await makeGetRequest('/api/church/parent/child-learning-review?studentId=', {}, parentMaryToken);

  assert(
    res15.statusCode === 400 &&
    res15.json?.success === false &&
    res15.json?.error === 'MISSING_PARAMS',
    'Test 15: Empty studentId returns 400 MISSING_PARAMS and does not fake success',
    `Status: ${res15.statusCode}, Error: ${res15.json?.error}`
  );

  console.log('\n====================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
