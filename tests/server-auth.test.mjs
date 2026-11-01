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
let publicationTeacherAssigned = false;
let publicationRpcCalls = 0;
const roleAssignments = new Map();
const roleRequests = [];
const roleAudit = [];
const adminActionAudit = [];
const missingProfileIds = new Set();
const roleLookupFailureIds = new Set();
const bannedUserIds = new Set();
const profileHymnsTaxisLevels = new Map();
const completionWrites = new Map();
const completionRpcCalls = [];
const quizAttemptWrites = [];
const profilePatchWrites = [];
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
  return { authorization: `Bearer test_jwt_${role}|${userId}` };
}

async function request(path, { method = 'GET', role, userId, body } = {}) {
  if (role && userId && !roleAssignments.has(userId)) roleAssignments.set(userId, [role]);
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
    const [role = 'student', userId = ''] = bearer.replace(/^test_jwt_/, '').split('|');
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname === '/auth/v1/user') {
      return respondJson(res, userId ? 200 : 401, {
        id: userId,
        user_metadata: { role }
      });
    }
    if (bearer === 'test-service-role-key' && url.pathname === '/auth/v1/admin/users' && req.method === 'GET') {
      return respondJson(res, 200, {
        users: [...roleAssignments.entries()].map(([id]) => ({
          id,
          email: `${id}@example.test`,
          banned_until: bannedUserIds.has(id) ? new Date(Date.now() + 86400000).toISOString() : null,
          created_at: new Date(0).toISOString(),
          last_sign_in_at: new Date(0).toISOString(),
          user_metadata: { full_name: id }
        }))
      });
    }
    if (bearer === 'test-service-role-key' && url.pathname.startsWith('/auth/v1/admin/users/')) {
      const targetId = url.pathname.split('/').pop();
      if (req.method === 'GET') {
        return respondJson(res, 200, { user: {
          id: targetId,
          email: `${targetId}@example.test`,
          banned_until: bannedUserIds.has(targetId) ? new Date(Date.now() + 86400000).toISOString() : null,
          created_at: new Date(0).toISOString()
        } });
      }
      if (req.method === 'PUT') {
        let rawBody = '';
        req.on('data', chunk => { rawBody += chunk; });
        req.on('end', () => {
          const body = JSON.parse(rawBody || '{}');
          if (body.ban_duration === 'none') bannedUserIds.delete(targetId);
          else bannedUserIds.add(targetId);
          return respondJson(res, 200, { user: {
            id: targetId,
            banned_until: body.ban_duration === 'none' ? null : new Date(Date.now() + 86400000).toISOString()
          } });
        });
        return;
      }
    }
    if (bearer === 'test-service-role-key' && url.pathname === '/auth/v1/invite' && req.method === 'POST') {
      let rawBody = '';
      req.on('data', chunk => { rawBody += chunk; });
      req.on('end', () => {
        const body = JSON.parse(rawBody || '{}');
        return respondJson(res, 200, { user: { id: 'invited-account', email: body.email } });
      });
      return;
    }
    if (url.pathname === '/rest/v1/profiles') {
      if (req.method === 'PATCH') {
        if (bearer !== 'test-service-role-key') {
          return respondJson(res, 403, { message: 'Trusted server key required' });
        }
        let rawBody = '';
        req.on('data', chunk => { rawBody += chunk; });
        req.on('end', () => {
          const body = JSON.parse(rawBody || '{}');
          profilePatchWrites.push(body);
          if (!url.searchParams.has('select')) return respondJson(res, 200, []);
          const profileId = (url.searchParams.get('id') || '').replace(/^eq\./, '');
          if (body.hymns_taxis_level !== undefined) {
            profileHymnsTaxisLevels.set(profileId, body.hymns_taxis_level);
          }
          return respondJson(res, 200, [{
            id: profileId,
            name: body.name || profileId,
            avatar: body.avatar || null,
            hymns_taxis_level: body.hymns_taxis_level ?? profileHymnsTaxisLevels.get(profileId) ?? null,
            push_notifications_enabled: body.push_notifications_enabled ?? true,
            notify_lesson_completion: body.notify_lesson_completion ?? true,
            notify_event_reminders: body.notify_event_reminders ?? true,
            require_reward_approval: body.require_reward_approval ?? true,
          }]);
        });
        return;
      }
      const requestedId = (url.searchParams.get('id') || '').replace(/^eq\./, '') || userId;
      if (missingProfileIds.has(requestedId)) return respondJson(res, 200, []);
      return respondJson(res, 200, requestedId ? [{
        id: requestedId,
        name: requestedId,
        email: `${requestedId}@example.test`,
        role: roleAssignments.get(requestedId)?.[0] || role || 'student',
        grade: 'Grade 4',
        hymns_taxis_level: profileHymnsTaxisLevels.get(requestedId) ?? null,
        created_at: new Date(0).toISOString()
      }] : []);
    }
    if (url.pathname === '/rest/v1/profile_role_assignments') {
      const requestedId = (url.searchParams.get('user_id') || '').replace(/^eq\./, '') || userId;
      if (roleLookupFailureIds.has(requestedId)) {
        return respondJson(res, 500, { message: 'Role lookup unavailable' });
      }
      const requestedRole = (url.searchParams.get('role') || '').replace(/^eq\./, '');
      return respondJson(res, 200, (roleAssignments.get(requestedId) || [])
        .filter(roleValue => !requestedRole || roleValue === requestedRole)
        .map(roleValue => ({
        role: roleValue,
        revoked_at: null
      })));
    }
    if (url.pathname === '/rest/v1/role_promotion_requests') {
      const requestedId = (url.searchParams.get('requester_id') || '').replace(/^eq\./, '');
      const status = (url.searchParams.get('status') || '').replace(/^eq\./, '');
      const requests = roleRequests.filter(item =>
        (!requestedId || item.requester_id === requestedId) &&
        (!status || item.status === status)
      );
      return respondJson(res, 200, requests);
    }
    if (url.pathname === '/rest/v1/role_change_audit') {
      const targetId = (url.searchParams.get('target_user_id') || '').replace(/^eq\./, '');
      return respondJson(res, 200, roleAudit.filter(item => !targetId || item.target_user_id === targetId));
    }
    if (url.pathname === '/rest/v1/admin_action_audit') {
      if (req.method === 'POST') {
        let rawBody = '';
        req.on('data', chunk => { rawBody += chunk; });
        req.on('end', () => {
          const payload = JSON.parse(rawBody || '{}');
          adminActionAudit.push(...(Array.isArray(payload) ? payload : [payload]));
          return respondJson(res, 201, []);
        });
        return;
      }
      return respondJson(res, 200, adminActionAudit);
    }
    if (['/rest/v1/class_memberships', '/rest/v1/user_relationships'].includes(url.pathname)) {
      return respondJson(res, 200, []);
    }
    if (url.pathname === '/rest/v1/rpc/request_role_promotion') {
      let rawBody = '';
      req.on('data', chunk => { rawBody += chunk; });
      req.on('end', () => {
        const body = JSON.parse(rawBody || '{}');
        const requestedRole = body.p_requested_role;
        if (!userId) return respondJson(res, 401, { code: '42501', message: 'Authenticated user required' });
        if (!['student', 'parent', 'teacher'].includes(requestedRole)) {
          return respondJson(res, 400, { code: '22023', message: 'Invalid requested role' });
        }
        if ((roleAssignments.get(userId) || []).includes(requestedRole)) {
          return respondJson(res, 409, { code: '23505', message: 'Role already assigned' });
        }
        if (roleRequests.some(item => item.requester_id === userId &&
          item.requested_role === requestedRole && item.status === 'pending')) {
          return respondJson(res, 409, { code: '23505', message: 'Duplicate pending request' });
        }
        const roleRequest = {
          id: `request-${roleRequests.length + 1}`,
          requester_id: userId,
          requested_role: requestedRole,
          status: 'pending',
          reason: body.p_reason || null,
          requested_at: new Date().toISOString()
        };
        roleRequests.push(roleRequest);
        return respondJson(res, 200, roleRequest.id);
      });
      return;
    }
    if (url.pathname === '/rest/v1/rpc/review_role_promotion_request') {
      let rawBody = '';
      req.on('data', chunk => { rawBody += chunk; });
      req.on('end', () => {
        const body = JSON.parse(rawBody || '{}');
        const actorId = body.p_actor_id;
        if (!(roleAssignments.get(actorId) || []).includes('admin')) {
          return respondJson(res, 403, { code: '42501', message: 'Admin role required' });
        }
        const roleRequest = roleRequests.find(item => item.id === body.p_request_id);
        if (!roleRequest) return respondJson(res, 404, { code: 'P0002', message: 'Request not found' });
        if (roleRequest.requester_id === actorId) {
          return respondJson(res, 403, { code: '42501', message: 'Cannot review own request' });
        }
        if (roleRequest.status !== 'pending') {
          return respondJson(res, 409, { code: '23514', message: 'Request is not pending' });
        }
        if (body.p_approve) {
          const currentRoles = roleAssignments.get(roleRequest.requester_id) || [];
          roleAssignments.set(roleRequest.requester_id, [...currentRoles, roleRequest.requested_role]);
        }
        roleRequest.status = body.p_approve ? 'approved' : 'rejected';
        roleRequest.reviewed_by = actorId;
        roleRequest.reviewed_at = new Date().toISOString();
        roleRequest.review_reason = body.p_review_reason || null;
        roleAudit.push({
          actor_id: actorId,
          target_user_id: roleRequest.requester_id,
          action: body.p_approve ? 'request_approved' : 'request_rejected',
          requested_role: roleRequest.requested_role,
          request_id: roleRequest.id,
          reason: roleRequest.review_reason
        });
        if (body.p_approve) {
          roleAudit.push({
            actor_id: actorId,
            target_user_id: roleRequest.requester_id,
            action: 'role_granted',
            new_role: roleRequest.requested_role,
            requested_role: roleRequest.requested_role,
            request_id: roleRequest.id
          });
        }
        return respondJson(res, 200, roleRequest);
      });
      return;
    }
    if (url.pathname === '/rest/v1/rpc/manage_profile_role') {
      let rawBody = '';
      req.on('data', chunk => { rawBody += chunk; });
      req.on('end', () => {
        const body = JSON.parse(rawBody || '{}');
        const actorId = body.p_actor_id;
        const targetId = body.p_target_user_id;
        const currentRoles = roleAssignments.get(targetId) || [];
        if (!(roleAssignments.get(actorId) || []).includes('admin')) {
          return respondJson(res, 403, { code: '42501', message: 'Admin role required' });
        }
        if (actorId === targetId) {
          return respondJson(res, 403, { code: '42501', message: 'Cannot change own roles' });
        }
        if (!roleAssignments.has(targetId)) {
          return respondJson(res, 404, { code: 'P0002', message: 'Profile not found' });
        }
        if (body.p_action === 'grant') {
          if (currentRoles.includes(body.p_role)) return respondJson(res, 200, false);
          roleAssignments.set(targetId, [...currentRoles, body.p_role]);
          roleAudit.push({
            actor_id: actorId,
            target_user_id: targetId,
            action: 'role_granted',
            new_role: body.p_role,
            requested_role: body.p_role,
            reason: body.p_reason || null
          });
          return respondJson(res, 200, true);
        }
        if (!currentRoles.includes(body.p_role)) return respondJson(res, 200, false);
        if (body.p_role === 'admin' && [...roleAssignments.values()].filter(roles => roles.includes('admin')).length <= 1) {
          return respondJson(res, 403, { code: '42501', message: 'Cannot revoke last admin' });
        }
        roleAssignments.set(targetId, currentRoles.filter(roleValue => roleValue !== body.p_role));
        roleAudit.push({
          actor_id: actorId,
          target_user_id: targetId,
          action: 'role_revoked',
          previous_role: body.p_role,
          requested_role: body.p_role,
          reason: body.p_reason || null
        });
        return respondJson(res, 200, true);
      });
      return;
    }
    if (bearer === 'test-service-role-key' && url.pathname === '/rest/v1/lesson_versions') {
      return respondJson(res, 200, {
        id: 'v-publication-test',
        lesson_id: 'l-publication-test',
        created_by: 'user_teacher_mina_101',
        status: 'APPROVED',
        approved_by: 'reviewer-1',
        approved_at: '2026-01-01T00:00:00.000Z'
      });
    }
    if (bearer === 'test-service-role-key' && url.pathname === '/rest/v1/lessons') {
      return respondJson(res, 200, { grade_level: 'Grade 4' });
    }
    if (bearer === 'test-service-role-key' && url.pathname === '/rest/v1/church_years') {
      return respondJson(res, 200, { id: 'year-1' });
    }
    if (bearer === 'test-service-role-key' && url.pathname === '/rest/v1/church_events') {
      return respondJson(res, 200, []);
    }
    if (bearer === 'test-service-role-key' && url.pathname === '/rest/v1/class_instances') {
      return respondJson(res, 200, { id: 'class-1' });
    }
    if (bearer === 'test-service-role-key' && url.pathname === '/rest/v1/servant_class_assignments') {
      if (req.method === 'POST' || req.method === 'PATCH') {
        return respondJson(res, 201, {});
      }
      return respondJson(res, 200, publicationTeacherAssigned ? { id: 'assignment-1' } : null);
    }
    if (bearer === 'test-service-role-key' && url.pathname === '/rest/v1/lesson_publication_jobs') {
      return respondJson(res, 200, null);
    }
    if (bearer === 'test-service-role-key' && [
      '/rest/v1/rpc/publish_lesson_version_immediately',
      '/rest/v1/rpc/publish_lesson_version'
    ].includes(url.pathname)) {
      publicationRpcCalls += 1;
      return respondJson(res, 200, { success: true, published_at: '2026-01-01T00:00:00.000Z' });
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
  delete env.SUPABASE_ANON_KEY;
  env.NODE_ENV = 'test';
  env.PORT = String(appPort);
  env.VITE_SUPABASE_URL = authUrl;
  env.SUPABASE_URL = authUrl;
  env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
  env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
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

test('parent workspace APIs allow hybrid parent accounts but reject accounts without the parent role', async () => {
  const hybridParentId = 'user_parent_mary_301';
  roleAssignments.set(hybridParentId, ['student', 'parent']);
  const childList = await request('/api/church/parent/children', {
    role: 'student',
    userId: hybridParentId
  });
  assert.equal(childList.status, 200, await childList.clone().text());

  const linkedReview = await request('/api/church/parent/child-learning-review/mark', {
    role: 'student',
    userId: hybridParentId
  });
  assert.equal(linkedReview.status, 200);

  const unrelatedReview = await request('/api/church/parent/child-learning-review/other', {
    role: 'student',
    userId: hybridParentId
  });
  assert.equal(unrelatedReview.status, 403);

  const studentId = 'parent-endpoint-student-only';
  roleAssignments.set(studentId, ['student']);
  const forbiddenChildren = await request('/api/church/parent/children', {
    role: 'student',
    userId: studentId
  });
  assert.equal(forbiddenChildren.status, 403);

  const forbiddenReview = await request('/api/church/parent/child-learning-review/mark', {
    role: 'student',
    userId: studentId
  });
  assert.equal(forbiddenReview.status, 403);
  const forbiddenRewards = await request('/api/church/parent/reward-requests', {
    role: 'student',
    userId: studentId
  });
  assert.equal(forbiddenRewards.status, 403);
  const forbiddenConnect = await request('/api/church/parent/connect-child', {
    method: 'POST',
    role: 'student',
    userId: studentId,
    body: { childCode: 'ST-12345' }
  });
  assert.equal(forbiddenConnect.status, 403);

  const invalidParentCode = await request('/api/church/parent/connect-child', {
    method: 'POST',
    role: 'parent',
    userId: hybridParentId,
    body: { childCode: 'not a code' }
  });
  assert.equal(invalidParentCode.status, 400);

  const invalidRewardDecision = await request('/api/church/parent/reward-requests/request-1/review', {
    method: 'POST',
    role: 'parent',
    userId: hybridParentId,
    body: { decision: 'pending' }
  });
  assert.equal(invalidRewardDecision.status, 400);
});

test('anonymous and non-owner lesson publishing is rejected, including missing ownership', async () => {
  const anonymousApprovedRoute = await request('/api/church/publish-approved-lesson-version', {
    method: 'POST',
    body: { lessonId: 'l-test-multiversion-01', versionId: 'v-test-multi-1' }
  });
  assert.equal(anonymousApprovedRoute.status, 401);

  const studentApprovedRoute = await request('/api/church/publish-approved-lesson-version', {
    method: 'POST',
    role: 'student',
    userId: 'mark',
    body: { lessonId: 'l-test-multiversion-01', versionId: 'v-test-multi-1' }
  });
  assert.equal(studentApprovedRoute.status, 403);

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

test('admin curriculum mutations are recorded in the administrative audit log', async () => {
  const adminId = 'admin-curriculum-audit-user';
  roleAssignments.set(adminId, ['admin']);
  const initialAuditCount = adminActionAudit.length;

  const invalidPublish = await request('/api/church/publish-lesson-version', {
    method: 'POST',
    role: 'admin',
    userId: adminId,
    body: { lessonId: 'curriculum-audit-lesson' }
  });

  assert.equal(invalidPublish.status, 400);
  assert.equal(adminActionAudit.length, initialAuditCount + 1);
  assert.equal(adminActionAudit.at(-1).actor_id, adminId);
  assert.equal(adminActionAudit.at(-1).operation, 'curriculum_post');
  assert.deepEqual(adminActionAudit.at(-1).details, {
    path: '/api/church/publish-lesson-version',
    resourceId: 'curriculum-audit-lesson'
  });
});

test('lesson publishing requires the teacher class assignment and succeeds for an assigned teacher', async () => {
  const body = { lessonId: 'l-publication-test', versionId: 'v-publication-test' };
  publicationTeacherAssigned = false;
  const initialRpcCalls = publicationRpcCalls;
  const unassigned = await request('/api/church/publish-approved-lesson-version', {
    method: 'POST',
    role: 'teacher',
    userId: 'user_teacher_mina_101',
    body
  });
  assert.equal(unassigned.status, 403, await unassigned.text());
  assert.equal(publicationRpcCalls, initialRpcCalls, 'unassigned teacher must not reach the publication RPC');

  publicationTeacherAssigned = true;
  const assigned = await request('/api/church/publish-approved-lesson-version', {
    method: 'POST',
    role: 'teacher',
    userId: 'user_teacher_mina_101',
    body
  });
  assert.equal(assigned.status, 200, await assigned.text());
  assert.equal(publicationRpcCalls, initialRpcCalls + 1);
  publicationTeacherAssigned = false;
});

test('Taxis workflow metadata cannot be forged through edits and publishing requires approval', async () => {
  const adminId = `taxis-approval-admin-${Date.now()}`;
  const temporaryId = `new_taxis_approval_test_${Date.now()}`;
  roleAssignments.set(adminId, ['admin']);

  const created = await request('/api/church/taxis', {
    method: 'POST',
    role: 'admin',
    userId: adminId,
    body: { id: temporaryId, titleAr: 'اختبار اعتماد', titleEn: 'Approval test', level: 1 }
  });
  assert.equal(created.status, 201);
  const createdBody = await created.json();
  const itemId = createdBody.item.id;
  assert.equal(itemId.startsWith('new_'), false);

  const forgedUpdate = await request(`/api/church/taxis/${itemId}`, {
    method: 'PUT',
    role: 'admin',
    userId: adminId,
    body: {
      titleAr: 'اختبار اعتماد',
      titleEn: 'Approval test',
      status: 'approved',
      approvedBy: adminId,
      publishedBy: adminId,
      assignedReviewers: [adminId]
    }
  });
  const forgedResult = await forgedUpdate.json();
  assert.equal(forgedUpdate.status, 200);
  assert.equal(forgedResult.item.status, 'draft');
  assert.equal(forgedResult.item.approvedBy, undefined);
  assert.equal(forgedResult.item.publishedBy, undefined);
  assert.equal(forgedResult.item.assignedReviewers, undefined);

  const publishDraft = await request(`/api/church/taxis/${itemId}/publish`, {
    method: 'POST',
    role: 'admin',
    userId: adminId,
    body: {}
  });
  const publishResult = await publishDraft.json();
  assert.equal(publishDraft.status, 409);
  assert.equal(publishResult.error, 'APPROVAL_REQUIRED');

  const submitForReview = await request(`/api/church/taxis/${itemId}/submit-review`, {
    method: 'POST',
    role: 'admin',
    userId: adminId,
    body: {}
  });
  assert.equal(submitForReview.status, 200);
  assert.equal((await submitForReview.json()).item.status, 'under_review');

  const approval = await request(`/api/church/taxis/${itemId}/review`, {
    method: 'POST',
    role: 'admin',
    userId: adminId,
    body: { action: 'APPROVE' }
  });
  assert.equal(approval.status, 200);
  assert.equal((await approval.json()).item.status, 'approved');

  const lockedApprovedEdit = await request(`/api/church/taxis/${itemId}`, {
    method: 'PUT',
    role: 'admin',
    userId: adminId,
    body: { titleAr: 'تعديل غير مسموح' }
  });
  assert.equal(lockedApprovedEdit.status, 409);
  assert.equal((await lockedApprovedEdit.json()).error, 'WORKFLOW_LOCKED');

  const requestChanges = await request(`/api/church/taxis/${itemId}/review`, {
    method: 'POST',
    role: 'admin',
    userId: adminId,
    body: { action: 'REQUEST_CHANGES' }
  });
  assert.equal(requestChanges.status, 200);
  assert.equal((await requestChanges.json()).item.status, 'draft');

  const resubmit = await request(`/api/church/taxis/${itemId}/submit-review`, {
    method: 'POST',
    role: 'admin',
    userId: adminId,
    body: {}
  });
  assert.equal(resubmit.status, 200);

  const reapproval = await request(`/api/church/taxis/${itemId}/review`, {
    method: 'POST',
    role: 'admin',
    userId: adminId,
    body: { action: 'APPROVE' }
  });
  assert.equal(reapproval.status, 200);
  assert.equal((await reapproval.json()).item.status, 'approved');

  const publishApproved = await request(`/api/church/taxis/${itemId}/publish`, {
    method: 'POST',
    role: 'admin',
    userId: adminId,
    body: {}
  });
  assert.equal(publishApproved.status, 200);
  assert.equal((await publishApproved.json()).item.status, 'published');

  const lockedPublishedEdit = await request(`/api/church/taxis/${itemId}`, {
    method: 'PUT',
    role: 'admin',
    userId: adminId,
    body: { titleAr: 'تعديل منشور' }
  });
  assert.equal(lockedPublishedEdit.status, 409);
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

test('lesson section progress can be marked read and unread through the authenticated route', async () => {
  const lessonId = 'l-cross-01';
  const versionId = 'v-section-toggle-regression';
  const userId = 'stu_section_toggle_regression';
  const start = await request('/api/church/student-progress/start', {
    method: 'POST',
    role: 'student',
    userId,
    body: { lessonId, versionId }
  });
  assert.equal(start.status, 200, await start.text());

  const markRead = await request('/api/church/student-progress/complete-section', {
    method: 'POST',
    role: 'student',
    userId,
    body: { lessonId, versionId, sectionId: 'sec-1', isRead: true }
  });
  const readResult = await markRead.json();
  assert.equal(markRead.status, 200);
  assert.equal(readResult.progress.sectionsCompleted.includes('sec-1'), true);

  const markUnread = await request('/api/church/student-progress/complete-section', {
    method: 'POST',
    role: 'student',
    userId,
    body: { lessonId, versionId, sectionId: 'sec-1', isRead: false }
  });
  const unreadResult = await markUnread.json();
  assert.equal(markUnread.status, 200);
  assert.equal(unreadResult.progress.sectionsCompleted.includes('sec-1'), false);

  const invalidReadState = await request('/api/church/student-progress/complete-section', {
    method: 'POST',
    role: 'student',
    userId,
    body: { lessonId, versionId, sectionId: 'sec-1', isRead: 'false' }
  });
  assert.equal(invalidReadState.status, 400);
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

test('Servant Home summary requires an assigned teacher role and returns an authoritative empty state', async () => {
  const anonymous = await request('/api/church/servant/home-summary');
  assert.equal(anonymous.status, 401);

  const student = await request('/api/church/servant/home-summary', {
    role: 'student',
    userId: 'servant-home-student'
  });
  assert.equal(student.status, 403);

  const teacher = await request('/api/church/servant/home-summary', {
    role: 'teacher',
    userId: 'servant-home-empty'
  });
  assert.equal(teacher.status, 200);
  const summary = await teacher.json();
  assert.equal(summary.success, true);
  assert.deepEqual(summary.classes, []);
  assert.deepEqual(summary.totals, {
    students: 0,
    completedLessons: 0,
    progressRecords: 0,
    curriculumCount: 0
  });
  assert.deepEqual(summary.upcomingEvents, []);
  assert.equal(summary.attendanceAvailable, false);
});

test('Servant profile classes are scoped to assigned teacher accounts', async () => {
  const anonymous = await request('/api/church/servant/profile-classes');
  assert.equal(anonymous.status, 401);

  const student = await request('/api/church/servant/profile-classes', {
    role: 'student',
    userId: 'servant-profile-student'
  });
  assert.equal(student.status, 403);

  const teacher = await request('/api/church/servant/profile-classes', {
    role: 'teacher',
    userId: 'servant-profile-empty'
  });
  assert.equal(teacher.status, 200);
  const payload = await teacher.json();
  assert.equal(payload.success, true);
  assert.deepEqual(payload.classes, []);
});

test('role authorization uses assigned roles and admin routes reject non-admin callers', async () => {
  const userId = 'multi-role-account';
  roleAssignments.set(userId, ['student', 'parent']);
  const rolesResponse = await request('/api/church/me/roles', { role: 'admin', userId });
  assert.equal(rolesResponse.status, 200);
  assert.deepEqual((await rolesResponse.json()).roles, ['student', 'parent']);

  const pending = await request('/api/church/admin/role-requests', {
    role: 'student',
    userId: 'role-request-non-admin'
  });
  assert.equal(pending.status, 403);

  const anonymous = await request('/api/church/me/roles');
  assert.equal(anonymous.status, 401);
});

test('role authorization fails closed when profile or assigned-role lookups fail', async () => {
  const missingProfileId = 'role-auth-missing-profile';
  const roleLookupFailureId = 'role-auth-lookup-failure';
  roleAssignments.set(missingProfileId, ['student']);
  roleAssignments.set(roleLookupFailureId, ['admin']);
  missingProfileIds.add(missingProfileId);
  roleLookupFailureIds.add(roleLookupFailureId);

  try {
    const missingProfile = await request('/api/church/me/roles', {
      role: 'admin',
      userId: missingProfileId
    });
    const roleLookupFailure = await request('/api/church/admin/role-requests', {
      role: 'admin',
      userId: roleLookupFailureId
    });

    assert.equal(missingProfile.status, 401);
    assert.equal(roleLookupFailure.status, 401);
  } finally {
    missingProfileIds.delete(missingProfileId);
    roleLookupFailureIds.delete(roleLookupFailureId);
    roleAssignments.delete(missingProfileId);
    roleAssignments.delete(roleLookupFailureId);
  }
});

test('own-account profile updates validate fields and use the authenticated user identity', async () => {
  const userId = 'own-profile-update';
  roleAssignments.set(userId, ['parent']);
  const initialWriteCount = profilePatchWrites.length;

  const saved = await request('/api/account/profile', {
    method: 'PATCH',
    role: 'parent',
    userId,
    body: { name: '  Parent Account  ', notify_event_reminders: false }
  });
  const savedPayload = await saved.json();
  assert.equal(saved.status, 200, JSON.stringify(savedPayload));
  assert.equal(savedPayload.profile.id, userId);
  assert.equal(savedPayload.profile.name, 'Parent Account');
  assert.equal(savedPayload.profile.notify_event_reminders, false);
  assert.deepEqual(profilePatchWrites.at(-1), { name: 'Parent Account', notify_event_reminders: false });
  assert.equal(profilePatchWrites.length, initialWriteCount + 1);

  for (const body of [
    { points: 99999 },
    { role: 'admin' },
    { grade: 'Grade 7' },
    { parent_id: 'another-account' },
    { permissions: ['admin'] },
    { name: 'x' },
    { notify_event_reminders: 'false' }
  ]) {
    const before = profilePatchWrites.length;
    const rejected = await request('/api/account/profile', {
      method: 'PATCH',
      role: 'parent',
      userId,
      body
    });
    assert.equal(rejected.status, 400, JSON.stringify({ body, response: await rejected.json() }));
    assert.equal(profilePatchWrites.length, before, 'invalid profile request must not reach the database');
  }

  const anonymous = await request('/api/account/profile', {
    method: 'PATCH',
    body: { name: 'Unauthenticated' }
  });
  assert.equal(anonymous.status, 401);
});

test('students can update only their own supported shared Hymns/Taxis level', async () => {
  const studentId = 'shared-level-student';
  const missingLevelStudentId = 'shared-level-missing';
  const otherStudentId = 'shared-level-other-student';
  roleAssignments.set(studentId, ['student']);
  roleAssignments.set(missingLevelStudentId, ['student']);
  profileHymnsTaxisLevels.set(studentId, 1);
  profileHymnsTaxisLevels.set(otherStudentId, 3);

  const initialWriteCount = profilePatchWrites.length;
  const saved = await request('/api/church/hymns-taxis-level', {
    method: 'PUT',
    role: 'student',
    userId: studentId,
    body: { level: 2 }
  });
  const savedPayload = await saved.json();
  assert.equal(saved.status, 200, JSON.stringify(savedPayload));
  assert.equal(savedPayload.level, 2);
  assert.deepEqual(profilePatchWrites.at(-1), { hymns_taxis_level: 2 });
  assert.equal(profileHymnsTaxisLevels.get(studentId), 2);
  assert.equal(profileHymnsTaxisLevels.get(otherStudentId), 3);

  const missingLevelSaved = await request('/api/church/hymns-taxis-level', {
    method: 'PUT',
    role: 'student',
    userId: missingLevelStudentId,
    body: { level: 3 }
  });
  assert.equal(missingLevelSaved.status, 200);
  assert.equal((await missingLevelSaved.json()).level, 3);
  assert.equal(profileHymnsTaxisLevels.get(missingLevelStudentId), 3);

  for (const body of [
    { level: 0 },
    { level: 4 },
    { level: 'not-a-level' },
    { level: 2, studentId: otherStudentId }
  ]) {
    const before = profilePatchWrites.length;
    const rejected = await request('/api/church/hymns-taxis-level', {
      method: 'PUT',
      role: 'student',
      userId: studentId,
      body
    });
    assert.equal(rejected.status, 400, JSON.stringify({ body, response: await rejected.json() }));
    assert.equal(profilePatchWrites.length, before, 'invalid or cross-account updates must not reach the database');
  }

  const nonStudent = await request('/api/church/hymns-taxis-level', {
    method: 'PUT',
    role: 'parent',
    userId: 'shared-level-parent',
    body: { level: 1 }
  });
  assert.equal(nonStudent.status, 403);
  assert.equal(profilePatchWrites.length, initialWriteCount + 2);
  roleAssignments.delete(studentId);
  roleAssignments.delete(missingLevelStudentId);
  profileHymnsTaxisLevels.delete(studentId);
  profileHymnsTaxisLevels.delete(missingLevelStudentId);
  profileHymnsTaxisLevels.delete(otherStudentId);
});

test('a revoked role immediately loses access to role-protected server operations', async () => {
  const userId = 'role-auth-revoked-student';
  roleAssignments.set(userId, ['student', 'teacher']);
  const beforeRevoke = await request('/api/church/me/roles', { role: 'admin', userId });
  assert.equal(beforeRevoke.status, 200);
  assert.deepEqual((await beforeRevoke.json()).roles, ['student', 'teacher']);

  roleAssignments.set(userId, ['teacher']);
  const protectedWrite = await request('/api/church/student-progress/start', {
    method: 'POST',
    role: 'student',
    userId,
    body: { lessonId: 'test-revoked-role-lesson', versionId: 'test-revoked-role-version' }
  });
  assert.equal(protectedWrite.status, 403);
  roleAssignments.delete(userId);
});

test('users can submit permitted role requests, but duplicate and admin requests are rejected', async () => {
  const userId = 'role-request-valid-user';
  const valid = await request('/api/church/role-requests', {
    method: 'POST',
    role: 'student',
    userId,
    body: { role: 'teacher', reason: 'I serve the class.' }
  });
  assert.equal(valid.status, 201);
  const requestResult = await valid.json();
  assert.equal(requestResult.request.status, 'pending');

  const duplicate = await request('/api/church/role-requests', {
    method: 'POST',
    role: 'student',
    userId,
    body: { role: 'teacher' }
  });
  assert.equal(duplicate.status, 409);

  const adminRequest = await request('/api/church/role-requests', {
    method: 'POST',
    role: 'student',
    userId,
    body: { role: 'admin' }
  });
  assert.equal(adminRequest.status, 400);

  const history = await request('/api/church/role-requests/me', { role: 'student', userId });
  assert.equal(history.status, 200);
  assert.equal((await history.json()).requests.length, 1);
});

test('admins can approve and reject pending role requests without accepting self-approval', async () => {
  const adminId = 'role-review-admin';
  const requesterId = 'role-review-requester';
  roleAssignments.set(adminId, ['admin']);

  const approvalRequest = await request('/api/church/role-requests', {
    method: 'POST',
    role: 'student',
    userId: requesterId,
    body: { role: 'parent' }
  });
  const approvalId = (await approvalRequest.json()).request.id;
  const queue = await request('/api/church/admin/role-requests', { role: 'admin', userId: adminId });
  assert.equal(queue.status, 200);
  assert.equal((await queue.json()).requests.some(item => item.id === approvalId), true);
  const approval = await request(`/api/church/admin/role-requests/${approvalId}/review`, {
    method: 'POST',
    role: 'admin',
    userId: adminId,
    body: { decision: 'approve', reason: 'Verified.' }
  });
  assert.equal(approval.status, 200, await approval.text());
  assert.deepEqual(roleAssignments.get(requesterId), ['student', 'parent']);

  const rejectionIdResponse = await request('/api/church/role-requests', {
    method: 'POST',
    role: 'student',
    userId: 'role-rejection-requester',
    body: { role: 'teacher' }
  });
  const rejectionId = (await rejectionIdResponse.json()).request.id;
  const rejection = await request(`/api/church/admin/role-requests/${rejectionId}/review`, {
    method: 'POST',
    role: 'admin',
    userId: adminId,
    body: { decision: 'reject' }
  });
  assert.equal(rejection.status, 200, await rejection.text());

  const selfId = 'role-self-review-admin';
  roleAssignments.set(selfId, ['student', 'admin']);
  const selfRequest = await request('/api/church/role-requests', {
    method: 'POST',
    role: 'admin',
    userId: selfId,
    body: { role: 'teacher' }
  });
  const selfRequestId = (await selfRequest.json()).request.id;
  const selfReview = await request(`/api/church/admin/role-requests/${selfRequestId}/review`, {
    method: 'POST',
    role: 'admin',
    userId: selfId,
    body: { decision: 'approve' }
  });
  assert.equal(selfReview.status, 403);
});

test('admins can add and revoke roles additively, with audited changes and last-admin protection', async () => {
  const adminId = 'c819fe9c-6cb2-4c89-8d03-27896834e701';
  const targetId = 'd819fe9c-6cb2-4c89-8d03-27896834e700';
  roleAssignments.set(adminId, ['admin']);
  roleAssignments.set(targetId, ['student']);

  const grant = await request('/api/church/admin/role-assignments', {
    method: 'POST',
    role: 'admin',
    userId: adminId,
    body: { targetUserId: targetId, role: 'teacher', action: 'grant', reason: 'Servant approved.', actorId: targetId }
  });
  assert.equal(grant.status, 200, await grant.text());
  assert.deepEqual(roleAssignments.get(targetId), ['student', 'teacher']);

  const revoke = await request('/api/church/admin/role-assignments', {
    method: 'POST',
    role: 'admin',
    userId: adminId,
    body: { targetUserId: targetId, role: 'teacher', action: 'revoke' }
  });
  assert.equal(revoke.status, 200, await revoke.text());
  assert.deepEqual(roleAssignments.get(targetId), ['student']);

  const audit = await request(`/api/church/admin/role-audit?targetUserId=${targetId}`, {
    role: 'admin',
    userId: adminId
  });
  assert.equal(audit.status, 200);
  const auditRows = (await audit.json()).audit;
  assert.equal(auditRows.length, 2);
  assert.equal(auditRows.every(item => item.actor_id === adminId), true);

  const selfAdminGrant = await request('/api/church/admin/role-assignments', {
    method: 'POST',
    role: 'admin',
    userId: adminId,
    body: {
      targetUserId: adminId,
      role: 'admin',
      action: 'grant'
    }
  });
  assert.equal(selfAdminGrant.status, 403);

  const selfAdminRevoke = await request('/api/church/admin/role-assignments', {
    method: 'POST',
    role: 'admin',
    userId: adminId,
    body: {
      targetUserId: adminId,
      role: 'admin',
      action: 'revoke'
    }
  });
  assert.equal(selfAdminRevoke.status, 403);
  assert.deepEqual(roleAssignments.get(adminId), ['admin']);
});

test('all Admin Control Center APIs reject callers without an assigned admin role', async () => {
  const nonAdminId = 'admin-control-center-non-admin';
  roleAssignments.set(nonAdminId, ['student']);
  const urls = [
    ['/api/church/admin/overview', 'GET'],
    ['/api/church/admin/accounts', 'GET'],
    ['/api/church/admin/accounts/invite', 'POST'],
    ['/api/church/admin/accounts/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/status', 'POST'],
    ['/api/church/admin/role-requests', 'GET'],
    ['/api/church/admin/role-requests/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/review', 'POST'],
    ['/api/church/admin/role-assignments', 'POST'],
    ['/api/church/admin/role-audit', 'GET'],
    ['/api/church/admin/families', 'GET'],
    ['/api/church/admin/classes', 'GET'],
    ['/api/church/admin/servant-assignments', 'POST'],
    ['/api/church/admin/support-sessions', 'POST'],
    ['/api/church/admin/support-sessions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/close', 'POST'],
    ['/api/church/admin/action-audit', 'GET']
  ];
  for (const [url, method] of urls) {
    const response = await request(url, {
      method, role: 'student', userId: nonAdminId,
      body: method === 'POST' ? { actorId: nonAdminId } : undefined
    });
    assert.equal(response.status, 403, `${method} ${url} must require an assigned admin role`);
  }
});

test('admin suspension and reactivation use server-side Auth operations and append audit records', async () => {
  const adminId = 'admin-status-actor';
  const targetId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  roleAssignments.set(adminId, ['admin']);
  roleAssignments.set(targetId, ['student']);

  const suspended = await request(`/api/church/admin/accounts/${targetId}/status`, {
    method: 'POST', role: 'admin', userId: adminId,
    body: { action: 'suspend', reason: 'Safety review', actorId: targetId }
  });
  assert.equal(suspended.status, 200, await suspended.clone().text());
  assert.equal(bannedUserIds.has(targetId), true);
  assert.equal(adminActionAudit.at(-1).actor_id, adminId);
  assert.equal(adminActionAudit.at(-1).target_user_id, targetId);
  assert.equal(adminActionAudit.at(-1).operation, 'account_suspended');

  const reactivated = await request(`/api/church/admin/accounts/${targetId}/status`, {
    method: 'POST', role: 'admin', userId: adminId,
    body: { action: 'reactivate', reason: 'Review complete' }
  });
  assert.equal(reactivated.status, 200, await reactivated.clone().text());
  assert.equal(bannedUserIds.has(targetId), false);
  assert.equal(adminActionAudit.at(-1).operation, 'account_reactivated');
});

test('admin account invitations use server Auth and audit the verified actor', async () => {
  const adminId = 'admin-invite-actor';
  roleAssignments.set(adminId, ['admin']);
  const response = await request('/api/church/admin/accounts/invite', {
    method: 'POST', role: 'admin', userId: adminId,
    body: { email: 'new-account@example.test', reason: 'New family registration', actorId: 'forged' }
  });
  assert.equal(response.status, 201, await response.clone().text());
  const event = adminActionAudit.at(-1);
  assert.equal(event.actor_id, adminId);
  assert.equal(event.operation, 'account_invited');
  assert.equal(event.target_user_id, 'invited-account');
});

test('admin support access is read-only, revalidated, and audited with the verified actor', async () => {
  const adminId = 'admin-support-actor';
  const targetId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  roleAssignments.set(adminId, ['admin']);
  roleAssignments.set(targetId, ['student']);
  const response = await request('/api/church/admin/support-sessions', {
    method: 'POST', role: 'admin', userId: adminId,
    body: { targetUserId: targetId, reason: 'Help resolve account access', actorId: targetId }
  });
  assert.equal(response.status, 200, `${await response.clone().text()}\n${appOutput.slice(-2000)}`);
  const payload = await response.json();
  assert.equal(payload.supportSession.readOnly, true);
  assert.equal(payload.account.id, targetId);
  const event = adminActionAudit.at(-1);
  assert.equal(event.operation, 'support_access_opened');
  assert.equal(event.actor_id, adminId);
  assert.equal(event.target_user_id, targetId);

  const audit = await request('/api/church/admin/action-audit', { role: 'admin', userId: adminId });
  assert.equal(audit.status, 200);
  assert.equal((await audit.json()).audit.some(entry => entry.operation === 'support_access_opened'), true);
});

test('admin class assignment preserves role authority and records the verified actor', async () => {
  const adminId = 'admin-class-actor';
  const servantId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  roleAssignments.set(adminId, ['admin']);
  roleAssignments.set(servantId, ['student', 'teacher']);
  const response = await request('/api/church/admin/servant-assignments', {
    method: 'POST', role: 'admin', userId: adminId,
    body: { servantId, classGroupId: 'primary_2', action: 'ASSIGN', actorId: servantId }
  });
  assert.equal(response.status, 200, `${await response.clone().text()}\n${appOutput.slice(-2000)}`);
  const event = adminActionAudit.at(-1);
  assert.equal(event.operation, 'servant_class_assigned');
  assert.equal(event.actor_id, adminId);
  assert.equal(event.target_user_id, servantId);
});
