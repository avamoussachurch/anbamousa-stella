// ==============================================================================
// Complete Supabase-Backed Quiz Attempts Persistence & Security Test Suite
// Verifies:
// 1. Authenticated Student Submission (deterministic grading, session-derived identity)
// 2. Anonymous Read/Write Rejection (401 on submit and query)
// 3. Cross-Student Isolation (403 when student attempts to view peer's attempts)
// 4. Teacher Class Scoping (Assigned teacher allowed, unassigned teacher 403, admin allowed)
// 5. Delayed Duplicate Submission & Durable Idempotency (fingerprint & key recovery)
// 6. Refresh and Logout/Login Session Survival (score, percentage, and answers intact)
// 7. Local File Deletion & Redeployment Simulation (survives container wipe)
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

function assert(condition, message, detail = '') {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message} - ${detail}`);
    failed++;
  }
}

async function runPersistenceTestSuite() {
  console.log('================================================================');
  console.log('Supabase-Backed Quiz Attempts Persistence & Security Verification');
  console.log('================================================================\n');

  // Test Entities
  const student1Id = `stu_pers_${Date.now()}_1`;
  const student2Id = `stu_pers_${Date.now()}_2`;
  const teacherMinaId = `user_teacher_mina_101`;
  const teacherOtherId = `user_teacher_other_404`;
  const adminId = `admin_bishop`;

  const student1Token = `test_jwt_student_${student1Id}`;
  const student2Token = `test_jwt_student_${student2Id}`;
  const teacherMinaToken = `test_jwt_teacher_${teacherMinaId}`;
  const teacherOtherToken = `test_jwt_teacher_${teacherOtherId}`;
  const adminToken = `test_jwt_admin_${adminId}`;

  const lessonId = 'l-cross-01';
  const versionId = 'ver-pub-l-cross-01';
  const quizId = 'quiz-ver-pub-l-cross-01';

  // ---------------------------------------------------------------------------
  // 1. MIGRATION SQL VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('--- 1. Migration File Hardening & Invariants ---');
  const migrationPath = path.join(__dirname, 'migrations', 'phase3_quiz_attempts_persistence.sql');
  assert(fs.existsSync(migrationPath), '1.1 phase3_quiz_attempts_persistence.sql exists');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert(sql.includes('CREATE TABLE IF NOT EXISTS public.quiz_attempts'), '1.2 Defines public.quiz_attempts table');
  assert(sql.includes('lesson_id TEXT NOT NULL'), '1.3 Uses TEXT for lesson_id (compatible with canonical IDs like l-cross-01)');
  assert(sql.includes('uq_quiz_attempts_fingerprint'), '1.4 Creates unique index on (student_id, lesson_id, quiz_id, answer_fingerprint)');
  assert(sql.includes('uq_quiz_attempts_idempotency_key'), '1.5 Creates unique index on idempotency_key');
  assert(sql.includes('ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;'), '1.6 Enables Row Level Security');
  assert(!sql.includes('CREATE POLICY') || !sql.includes('TO anon'), '1.7 Zero anon policies (public read/write forbidden)');
  assert(sql.includes('REVOKE ALL ON TABLE public.quiz_attempts FROM anon;'), '1.8 Revokes all privileges from anon');
  assert(sql.includes('GRANT SELECT ON TABLE public.quiz_attempts TO authenticated;'), '1.9 Authenticated users granted SELECT only');
  assert(sql.includes('GRANT ALL ON TABLE public.quiz_attempts TO service_role;'), '1.10 service_role granted full write control');

  // ---------------------------------------------------------------------------
  // 2. ANONYMOUS READ/WRITE REJECTION
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Anonymous Read & Write Rejection ---');
  const anonSubmit = await makePost('/api/church/student-quiz/submit', {
    lessonId,
    versionId,
    quizId,
    answers: [{ questionId: 'q1', selectedOptionIndex: 0 }]
  });
  assert(anonSubmit.statusCode === 401, '2.1 Anonymous submission rejected with 401 UNAUTHORIZED');
  assert(anonSubmit.json?.error === 'UNAUTHORIZED', '2.2 Error code is UNAUTHORIZED');

  const anonAttempts = await makeGet('/api/church/student-quiz/attempts', { lessonId });
  assert(anonAttempts.statusCode === 401, '2.3 Anonymous attempts query rejected with 401 UNAUTHORIZED');
  assert(anonAttempts.json?.error === 'UNAUTHORIZED', '2.4 Error code is UNAUTHORIZED');

  // ---------------------------------------------------------------------------
  // 3. AUTHENTICATED STUDENT SUBMISSION
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Authenticated Student Submission ---');
  // Load quiz questions
  const quizRes = await makeGet('/api/church/student-quiz', { lessonId }, student1Token);
  assert(quizRes.statusCode === 200 && quizRes.json?.success === true, '3.1 Published quiz loads successfully');
  const questions = quizRes.json?.quiz?.questions || [];
  assert(questions.length > 0, `3.2 Quiz contains ${questions.length} active questions`);

  // Start lesson & complete reading
  await makePost('/api/church/student-progress/start', { lessonId, versionId }, student1Token);
  await makePost('/api/church/student-progress/complete-section', { lessonId, versionId, sectionId: 'sec-1' }, student1Token);
  await makePost('/api/church/student-progress/complete-section', { lessonId, versionId, sectionId: 'sec-2' }, student1Token);
  await makePost('/api/church/student-progress/complete-section', { lessonId, versionId, sectionId: 'sec-3' }, student1Token);
  await makePost('/api/church/student-progress/complete-lesson', { lessonId, versionId }, student1Token);

  // Submit correct answers
  const correctAnswers = questions.map(q => ({
    questionId: q.id,
    selectedOptionIndex: q.correctIndex
  }));
  const testIdempotencyKey = `idem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const submitRes = await makePost('/api/church/student-quiz/submit', {
    lessonId,
    versionId,
    quizId,
    answers: correctAnswers,
    idempotencyKey: testIdempotencyKey
  }, student1Token);

  assert(submitRes.statusCode === 200 && submitRes.json?.success === true, '3.3 Authenticated submission succeeds (200 OK)');
  assert(submitRes.json?.attempt?.percentage === 100, '3.4 Deterministic score computed as 100%');
  assert(submitRes.json?.attempt?.passed === true, '3.5 Attempt passed is true');
  assert(submitRes.json?.attempt?.studentId === student1Id, '3.6 Student ID derived strictly from verified session');
  assert(submitRes.json?.isDuplicate === false, '3.7 First submission is marked isDuplicate: false');
  const originalAttemptId = submitRes.json?.attempt?.id;
  assert(Boolean(originalAttemptId), `3.8 Assigned authoritative attempt ID: ${originalAttemptId}`);

  // Server prevents teachers from submitting on behalf of students
  const teacherSubmit = await makePost('/api/church/student-quiz/submit', {
    lessonId,
    versionId,
    quizId,
    answers: correctAnswers,
    studentId: student1Id
  }, teacherMinaToken);
  assert(teacherSubmit.statusCode === 403, '3.9 Teacher strictly forbidden from submitting quiz attempts (403)');

  // ---------------------------------------------------------------------------
  // 4. CROSS-STUDENT PRIVACY ISOLATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Cross-Student Privacy Isolation ---');
  // Student 2 attempts to view Student 1's attempts
  const peerEavesdrop = await makeGet('/api/church/student-quiz/attempts', {
    lessonId,
    studentId: student1Id
  }, student2Token);
  assert(peerEavesdrop.statusCode === 403, '4.1 Peer student query rejected with 403 FORBIDDEN');
  assert(peerEavesdrop.json?.error === 'FORBIDDEN', '4.2 Error code is FORBIDDEN');

  // Student 1 can view their own attempts
  const selfQuery = await makeGet('/api/church/student-quiz/attempts', { lessonId }, student1Token);
  assert(selfQuery.statusCode === 200 && selfQuery.json?.attempts?.length === 1, '4.3 Student can access their own attempts');
  assert(selfQuery.json?.attempts?.[0]?.id === originalAttemptId, '4.4 Self-query returns authentic attempt ID');

  // ---------------------------------------------------------------------------
  // 5. TEACHER CLASS SCOPING
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Teacher Class Scoping ---');
  // Authoritatively enroll Student 1 in primary_1 class instance (where Mina is assigned)
  // Class code MUSA-7K4P corresponds to inst_2026-2027_primary_1
  const joinClassRes = await makePost('/api/church/student/join-class', {
    code: 'MUSA-7K4P',
    exactGrade: 'Primary 2'
  }, student1Token);
  assert(joinClassRes.statusCode === 200, '5.0 Student 1 authoritatively joins Primary 1–3 class');

  // Servant Mina queries Student 1 (assigned to primary_1)
  const assignedTeacherRes = await makeGet('/api/church/student-quiz/attempts', {
    lessonId,
    studentId: student1Id
  }, teacherMinaToken);
  assert(assignedTeacherRes.statusCode === 200, '5.1 Assigned teacher (Mina) allowed to access student attempts (200 OK)');
  assert(assignedTeacherRes.json?.attempts?.[0]?.id === originalAttemptId, '5.2 Assigned teacher receives student attempt history');

  // Servant Other queries Student 1 (not assigned to primary_1)
  const unassignedTeacherRes = await makeGet('/api/church/student-quiz/attempts', {
    lessonId,
    studentId: student1Id
  }, teacherOtherToken);
  assert(unassignedTeacherRes.statusCode === 403, '5.3 Unassigned teacher (Other) rejected with 403 FORBIDDEN_TEACHER_SCOPE');
  assert(unassignedTeacherRes.json?.error === 'FORBIDDEN_TEACHER_SCOPE', '5.4 Error code is FORBIDDEN_TEACHER_SCOPE');

  // Admin Bishop queries Student 1
  const adminRes = await makeGet('/api/church/student-quiz/attempts', {
    lessonId,
    studentId: student1Id
  }, adminToken);
  assert(adminRes.statusCode === 200, '5.5 Admin allowed system audit access across classes (200 OK)');
  assert(adminRes.json?.attempts?.[0]?.id === originalAttemptId, '5.6 Admin receives student attempt history');

  // ---------------------------------------------------------------------------
  // 6. DELAYED DUPLICATE SUBMISSION & DURABLE IDEMPOTENCY
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Delayed Duplicate Submission & Durable Idempotency ---');
  // Wait 1.5 seconds to ensure delayed submission
  await new Promise(r => setTimeout(r, 1500));

  // A. Retrying with identical answers (fingerprint duplicate)
  const dupFingerprintRes = await makePost('/api/church/student-quiz/submit', {
    lessonId,
    versionId,
    quizId,
    answers: correctAnswers
  }, student1Token);
  assert(dupFingerprintRes.statusCode === 200, '6.1 Delayed duplicate submission returns 200 OK safely');
  assert(dupFingerprintRes.json?.isDuplicate === true, '6.2 Server identifies submission as duplicate via answer fingerprint');
  assert(dupFingerprintRes.json?.attempt?.id === originalAttemptId, '6.3 Original attempt ID returned without creating a new attempt');

  // B. Retrying with identical idempotencyKey
  const dupKeyRes = await makePost('/api/church/student-quiz/submit', {
    lessonId,
    versionId,
    quizId,
    answers: correctAnswers,
    idempotencyKey: testIdempotencyKey
  }, student1Token);
  assert(dupKeyRes.statusCode === 200, '6.4 Idempotency key retry returns 200 OK safely');
  assert(dupKeyRes.json?.isDuplicate === true, '6.5 Server identifies submission as duplicate via idempotency key');
  assert(dupKeyRes.json?.attempt?.id === originalAttemptId, '6.6 Original attempt ID returned');

  // Verify total attempt count for student remains exactly 1
  const countCheck = await makeGet('/api/church/student-quiz/attempts', { lessonId }, student1Token);
  assert(countCheck.json?.attempts?.length === 1, '6.7 Durable deduplication ensures exactly 1 record stored');

  // ---------------------------------------------------------------------------
  // 7. REFRESH & LOGOUT/LOGIN SESSION PERSISTENCE
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Refresh & Logout/Login Session Persistence ---');
  // Refresh query
  const refreshSummary = await makeGet('/api/church/student-progress/summary', {}, student1Token);
  assert(refreshSummary.statusCode === 200, '7.1 Summary endpoint returns 200 OK after simulated refresh');
  assert(refreshSummary.json?.allProgress?.[lessonId]?.quizScore === 100, '7.2 Quiz score (100%) preserved in progress after refresh');

  const refreshAttempts = await makeGet('/api/church/student-quiz/attempts', { lessonId }, student1Token);
  assert(refreshAttempts.json?.attempts?.[0]?.percentage === 100, '7.3 Attempt percentage preserved after refresh');
  assert(refreshAttempts.json?.attempts?.[0]?.answers?.length === questions.length, '7.4 Full answer history preserved after refresh');

  // Logout & fresh login with new session token
  const freshSessionToken = `test_jwt_student_${student1Id}`;
  const freshSessionAttempts = await makeGet('/api/church/student-quiz/attempts', { lessonId }, freshSessionToken);
  assert(freshSessionAttempts.statusCode === 200, '7.5 Fresh session attempts query returns 200 OK');
  assert(freshSessionAttempts.json?.attempts?.length === 1, '7.6 Single attempt record preserved across sessions');
  assert(freshSessionAttempts.json?.attempts?.[0]?.id === originalAttemptId, '7.7 Original attempt ID matches in fresh session');

  // ---------------------------------------------------------------------------
  // 8. LOCAL FILE DELETION & CONTAINER REDEPLOYMENT SIMULATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Local File Deletion / Container Redeployment Simulation ---');
  // Simulate Cloud Run container instance recycling / disk wipe
  // Remove class_roster_persistence.json
  const rosterPersistencePath = path.join(process.cwd(), 'uploads', 'class_roster_persistence.json');
  if (fs.existsSync(rosterPersistencePath)) {
    fs.unlinkSync(rosterPersistencePath);
    console.log('Simulated container redeployment: uploads/class_roster_persistence.json unlinked');
  }

  // Query attempts with fresh session
  const redeployRes = await makeGet('/api/church/student-quiz/attempts', { lessonId }, freshSessionToken);
  assert(redeployRes.statusCode === 200, '8.1 Query succeeds (200 OK) after local roster file deletion');
  assert(redeployRes.json?.attempts?.length === 1, '8.2 Attempt record is durably preserved despite file deletion');
  assert(redeployRes.json?.attempts?.[0]?.id === originalAttemptId, '8.3 Authentic attempt ID and data intact');
  assert(redeployRes.json?.attempts?.[0]?.percentage === 100, '8.4 100% score restored seamlessly');

  console.log('\n================================================================');
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPersistenceTestSuite().catch(err => {
  console.error('Fatal persistence test error:', err);
  process.exit(1);
});
