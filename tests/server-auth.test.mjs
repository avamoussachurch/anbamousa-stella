import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

const root = new URL('../', import.meta.url);
let app;
let authServer;
let baseUrl;
let authUrl;
let appOutput = '';
let rpcFailure = false;
let quizInsertFailure = false;
const completionWrites = new Map();
const completionRpcCalls = [];
const quizAttemptWrites = [];
const stateFilePaths = [
  new URL('../uploads/church_year_classes_persistence.json', import.meta.url),
  new URL('../uploads/class_roster_persistence.json', import.meta.url),
  new URL('../uploads/quiz_attempts_backup.json', import.meta.url)
];
let stateFileSnapshots = [];

function respondJson(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(value));
}

async function listenOnEphemeralPort(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
}

async function waitForApp() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (app.exitCode !== null) {
      throw new Error(`App exited before becoming ready:\n${appOutput}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      await delay(250);
    }
  }
  throw new Error(`App did not become ready:\n${appOutput}`);
}

function authHeaders(role, userId) {
  return { authorization: `Bearer ${role}|${userId}` };
}

async function request(path, { method = 'GET', role, userId, body } = {}) {
  const headers = { ...(role && userId ? authHeaders(role, userId) : {}) };
  if (body !== undefined) headers['content-type'] = 'application/json';
  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

before(async () => {
  stateFileSnapshots = await Promise.all(stateFilePaths.map(file => readFile(file)));
  authServer = createServer((req, res) => {
    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
    const [role = 'student', userId = ''] = bearer.split('|');
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname === '/auth/v1/user') {
      return respondJson(res, userId ? 200 : 401, {
        id: userId,
        user_metadata: { role }
      });
    }
    if (url.pathname === '/rest/v1/profiles') {
      if (req.method === 'PATCH') {
        if (bearer !== 'test-service-role-key') {
          return respondJson(res, 403, { message: 'Trusted server key required' });
        }
        return respondJson(res, 200, []);
      }
      return respondJson(res, 200, [{ role }]);
    }
    if (url.pathname === '/rest/v1/quiz_attempts') {
      if (bearer !== 'test-service-role-key') {
        return respondJson(res, 403, { message: 'Trusted server key required' });
      }
      if (req.method === 'POST') {
        let rawBody = '';
        req.on('data', chunk => { rawBody += chunk; });
        req.on('end', () => {
          if (quizInsertFailure) {
            return respondJson(res, 403, { code: '42501', message: 'Simulated quiz-attempt write denial' });
          }
          quizAttemptWrites.push(JSON.parse(rawBody || '{}'));
          return respondJson(res, 201, {});
        });
        return;
      }
    }
    if (url.pathname === '/rest/v1/rpc/record_lesson_completion') {
      if (bearer !== 'test-service-role-key') {
        return respondJson(res, 403, { message: 'Trusted server key required' });
      }
      let rawBody = '';
      req.on('data', chunk => { rawBody += chunk; });
      req.on('end', () => {
        const body = JSON.parse(rawBody || '{}');
        completionRpcCalls.push(body);
        if (rpcFailure) {
          return respondJson(res, 500, { message: 'Simulated transaction failure' });
        }
        const key = `${body.p_student_id}:${body.p_lesson_id}`;
        const previous = completionWrites.get(key);
        const result = {
          points_awarded: previous ? 0 : 50,
          total_points: previous ? previous.total_points : 150,
          completed_at: previous?.completed_at || body.p_completed_at
        };
        completionWrites.set(key, result);
        return respondJson(res, 200, [result]);
      });
      return;
    }
    return respondJson(res, 404, { message: 'Not found' });
  });
  const authPort = await listenOnEphemeralPort(authServer);
  authUrl = `http://127.0.0.1:${authPort}`;

  const portProbe = createServer();
  const appPort = await listenOnEphemeralPort(portProbe);
  portProbe.close();
  await once(portProbe, 'close');
  baseUrl = `http://127.0.0.1:${appPort}`;
  const env = { ...process.env };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_ANON_KEY;
  env.NODE_ENV = 'test';
  env.PORT = String(appPort);
  env.VITE_SUPABASE_URL = authUrl;
  env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
  env.SUPABASE_SECRET_KEY = 'test-service-role-key';
  env.ENABLE_REVIEW_TEST_RESET = 'false';

  app = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  app.stdout.setEncoding('utf8').on('data', data => { appOutput += data; });
  app.stderr.setEncoding('utf8').on('data', data => { appOutput += data; });
  await waitForApp();
});

async function prepareLessonCompletion({ studentId = 'mark', lessonId, versionId }) {
  const start = await request('/api/church/student-progress/start', {
    method: 'POST',
    role: 'student',
    userId: studentId,
    body: { lessonId, versionId }
  });
  assert.equal(start.status, 200, await start.text());

  for (const sectionId of ['sec-1', 'sec-2', 'sec-3']) {
    const section = await request('/api/church/student-progress/complete-section', {
      method: 'POST',
      role: 'student',
      userId: studentId,
      body: { lessonId, versionId, sectionId }
    });
    assert.equal(section.status, 200, await section.text());
  }
}

after(async () => {
  if (app && app.exitCode === null) {
    app.kill();
    await Promise.race([once(app, 'exit'), delay(5000)]);
  }
  if (authServer?.listening) {
    authServer.close();
    await once(authServer, 'close');
  }
  await Promise.all(stateFilePaths.map((file, index) => writeFile(file, stateFileSnapshots[index])));
});

test('anonymous progress, history, and diagnostics requests are rejected', async () => {
  const urls = [
    '/api/church/student-progress?lessonId=l-test-multiversion-01&studentId=mark',
    '/api/church/student-progress/summary?studentId=mark',
    '/api/church/completion-history?studentId=mark',
    '/api/church/student-progress/diagnose/l-test-multiversion-01?studentId=mark'
  ];
  for (const url of urls) {
    const response = await request(url);
    assert.equal(response.status, 401, `${url} should require authentication`);
  }
});

test('a student cannot request another student’s progress or use a forged test token', async () => {
  const response = await request('/api/church/student-progress/summary?studentId=other', {
    role: 'student',
    userId: 'mark'
  });
  assert.equal(response.status, 403);

  const forged = await fetch(`${baseUrl}/api/church/student-progress/summary?studentId=mark`, {
    headers: { authorization: 'Bearer test_jwt_student_mark' }
  });
  assert.equal(forged.status, 401);
});

test('a student cannot write for another student or for an unassigned class', async () => {
  const before = await request('/api/church/student-progress/summary', {
    role: 'student',
    userId: 'mark'
  });
  assert.equal(before.status, 200);
  const beforeSummary = await before.json();

  const crossStudentWrite = await request('/api/church/student-progress/start', {
    method: 'POST',
    role: 'student',
    userId: 'mark',
    body: {
      lessonId: 'l-test-multiversion-01',
      versionId: 'v-test-multi-1',
      studentId: 'other'
    }
  });
  assert.equal(crossStudentWrite.status, 403);

  const unassignedClassWrite = await request('/api/church/student-progress/start', {
    method: 'POST',
    role: 'student',
    userId: 'mark',
    body: { lessonId: 'l-prep-01', versionId: 'v-prep-01', studentId: 'mark' }
  });
  assert.equal(unassignedClassWrite.status, 403);

  const after = await request('/api/church/student-progress/summary', {
    role: 'student',
    userId: 'mark'
  });
  assert.equal(after.status, 200);
  assert.deepEqual((await after.json()).allProgress, beforeSummary.allProgress);
});

test('parent and teacher access requires a matching child relationship or class assignment', async () => {
  const relatedChild = await request('/api/church/student-progress/summary?studentId=mark', {
    role: 'parent',
    userId: 'user_parent_mary_301'
  });
  assert.equal(relatedChild.status, 200);

  const unrelatedChild = await request('/api/church/student-progress/summary?studentId=other', {
    role: 'parent',
    userId: 'user_parent_mary_301'
  });
  assert.equal(unrelatedChild.status, 403);

  const assignedStudent = await request('/api/church/student-progress/summary?studentId=mark', {
    role: 'teacher',
    userId: 'user_teacher_mina_101'
  });
  assert.equal(assignedStudent.status, 200);

  const unassignedStudent = await request('/api/church/student-progress/summary?studentId=other', {
    role: 'teacher',
    userId: 'user_teacher_mina_101'
  });
  assert.equal(unassignedStudent.status, 403);
});

test('anonymous and non-owner lesson publishing is rejected, including missing ownership', async () => {
  const anonymous = await request('/api/church/publish-lesson-version', {
    method: 'POST',
    body: { lessonId: 'l-test-multiversion-01', versionId: 'v-test-multi-1' }
  });
  assert.equal(anonymous.status, 401);

  const student = await request('/api/church/publish-lesson-version', {
    method: 'POST',
    role: 'student',
    userId: 'mark',
    body: { lessonId: 'l-test-multiversion-01', versionId: 'v-test-multi-1' }
  });
  assert.equal(student.status, 403);

  const differentTeacher = await request('/api/church/publish-lesson-version', {
    method: 'POST',
    role: 'teacher',
    userId: 'user_teacher_other_404',
    body: { lessonId: 'l-test-multiversion-01', versionId: 'v-test-multi-1' }
  });
  assert.equal(differentTeacher.status, 403);

  const missingOwner = await request('/api/church/publish-lesson-version', {
    method: 'POST',
    role: 'teacher',
    userId: 'user_teacher_mina_101',
    body: { lessonId: 'l-test-multiversion-01', versionId: 'toString' }
  });
  assert.equal(missingOwner.status, 403);
});

test('unauthorized progress writes and disabled reset endpoint do not proceed', async () => {
  const write = await request('/api/church/student-progress/start', {
    method: 'POST',
    body: { lessonId: 'l-test-multiversion-01', versionId: 'v-test-multi-1', studentId: 'mark' }
  });
  assert.equal(write.status, 401);

  const reset = await request('/api/church/reset-review-test-state', { method: 'POST' });
  assert.equal(reset.status, 404);
});

test('lesson completion persists using the verified student identity and server-calculated points', async () => {
  const lessonId = '9b0a8f4c-9e1d-4c7b-8a12-123456789abc';
  await prepareLessonCompletion({ lessonId, versionId: 'v-persisted-completion' });

  const response = await request('/api/church/student-progress/complete-lesson', {
    method: 'POST',
    role: 'student',
    userId: 'mark',
    body: {
      lessonId,
      versionId: 'v-persisted-completion',
      studentId: 'mark',
      pointsEarned: 999999,
      totalPoints: 999999
    }
  });
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  assert.equal(result.pointsEarned, 50);
  assert.equal(result.totalPoints, 150);
  assert.equal(completionRpcCalls.at(-1).p_student_id, 'mark');
  assert.equal(completionRpcCalls.at(-1).p_lesson_id, lessonId);

  const repeated = await request('/api/church/student-progress/complete-lesson', {
    method: 'POST',
    role: 'student',
    userId: 'mark',
    body: { lessonId, versionId: 'v-persisted-completion' }
  });
  const repeatedResult = await repeated.json();
  assert.equal(repeated.status, 200);
  assert.equal(repeatedResult.pointsEarned, 0);
  assert.equal(repeatedResult.totalPoints, 150);
});

test('unauthenticated and cross-student completions never reach the trusted write path', async () => {
  const lessonId = '9b0a8f4c-9e1d-4c7b-8a12-123456789abd';
  await prepareLessonCompletion({ lessonId, versionId: 'v-unauthorized-completion' });
  const callCount = completionRpcCalls.length;

  const anonymous = await request('/api/church/student-progress/complete-lesson', {
    method: 'POST',
    body: { lessonId, versionId: 'v-unauthorized-completion' }
  });
  assert.equal(anonymous.status, 401);

  const crossStudent = await request('/api/church/student-progress/complete-lesson', {
    method: 'POST',
    role: 'student',
    userId: 'mark',
    body: { lessonId, versionId: 'v-unauthorized-completion', studentId: 'other' }
  });
  assert.equal(crossStudent.status, 403);
  assert.equal(completionRpcCalls.length, callCount);
});

test('failed Supabase completion writes return an error without awarding points', async () => {
  const lessonId = '9b0a8f4c-9e1d-4c7b-8a12-123456789abe';
  await prepareLessonCompletion({ lessonId, versionId: 'v-failed-completion' });
  rpcFailure = true;
  try {
    const response = await request('/api/church/student-progress/complete-lesson', {
      method: 'POST',
      role: 'student',
      userId: 'mark',
      body: { lessonId, versionId: 'v-failed-completion' }
    });
    const result = await response.json();
    assert.equal(response.status, 502);
    assert.equal(result.success, false);
    assert.equal(result.error, 'PROGRESS_PERSISTENCE_FAILED');
    assert.equal(result.totalPoints, undefined);
  } finally {
    rpcFailure = false;
  }
});

test('failed authoritative completion does not report lesson completion in progress summaries', async () => {
  const studentId = `test_student_failed_completion_${Date.now()}`;
  const lessonId = 'l-cross-01';
  const versionId = `ver-failed-completion-${Date.now()}`;
  await prepareLessonCompletion({ studentId, lessonId, versionId });

  const completion = await request('/api/church/student-progress/complete-lesson', {
    method: 'POST',
    role: 'student',
    userId: studentId,
    body: { lessonId, versionId }
  });
  assert.equal(completion.status, 502);

  const summaryResponse = await request('/api/church/student-progress/summary', {
    role: 'student',
    userId: studentId
  });
  const summary = await summaryResponse.json();
  assert.equal(summaryResponse.status, 200);
  assert.equal(summary.completedLessonIds.includes(lessonId), false);
  assert.equal(summary.allProgress[lessonId].status, 'IN_PROGRESS');
});

test('quiz submission uses trusted persistence and reports database write failures', async () => {
  const lessonId = 'l-cross-01';
  const quizResponse = await request(`/api/church/student-quiz?lessonId=${lessonId}`, {
    role: 'student',
    userId: `quiz_read_${Date.now()}`
  });
  assert.equal(quizResponse.status, 200);
  const quiz = (await quizResponse.json()).quiz;
  const answers = quiz.questions.map(question => ({
    questionId: question.id,
    selectedOptionIndex: question.correctIndex
  }));
  const initialWriteCount = quizAttemptWrites.length;

  quizInsertFailure = true;
  try {
    const failed = await request('/api/church/student-quiz/submit', {
      method: 'POST',
      role: 'student',
      userId: `quiz_failed_${Date.now()}`,
      body: {
        lessonId,
        versionId: quiz.versionId,
        quizId: quiz.id,
        answers
      }
    });
    const failedResult = await failed.json();
    assert.equal(failed.status, 502);
    assert.equal(failedResult.success, false);
    assert.equal(failedResult.error, 'QUIZ_PERSISTENCE_FAILED');
    assert.equal(quizAttemptWrites.length, initialWriteCount);
  } finally {
    quizInsertFailure = false;
  }

  const studentId = `quiz_saved_${Date.now()}`;
  const saved = await request('/api/church/student-quiz/submit', {
    method: 'POST',
    role: 'student',
    userId: studentId,
    body: {
      lessonId,
      versionId: quiz.versionId,
      quizId: quiz.id,
      answers,
      score: 999999,
      percentage: 100,
      pointsEarned: 999999,
      totalPoints: 999999,
      passed: true,
      quizQuestions: [{ id: 'forged-question', correctIndex: -1 }]
    }
  });
  const savedResult = await saved.json();
  assert.equal(saved.status, 200);
  assert.equal(savedResult.success, true);
  assert.equal(savedResult.attempt.studentId, studentId);
  assert.equal(savedResult.attempt.score, quiz.questions.length);
  assert.equal(savedResult.attempt.totalScore, quiz.questions.length);
  assert.equal(quizAttemptWrites.length, initialWriteCount + 1);
  assert.equal(quizAttemptWrites.at(-1).student_id, studentId);
  assert.equal(quizAttemptWrites.at(-1).percentage, 100);
});
