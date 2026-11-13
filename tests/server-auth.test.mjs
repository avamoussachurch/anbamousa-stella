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
let curriculumWriteFailure = false;
let publicationTeacherAssigned = false;
let publicationRpcCalls = 0;
let publicationGrade = 'Grade 4';
let publicationActiveYear = true;
let publicationRpcFailure = false;
let publicationReadbackMatches = true;
let publicationClassGroupQueries = [];
let delegatedAccessResult = true;
let delegatedAccessFailure = false;
const delegatedAccessCalls = [];
let publicationTeacherAssignmentYear = '00000000-0000-4000-8000-000000000001';
let assignedClassGroupId = 'primary_2';
let liveTeacherAssignments = [];
let liveClassMemberships = [];
let appEnv;
let appPort;
const roleAssignments = new Map();
const roleRequests = [];
const roleAudit = [];
const adminActionAudit = [];
const missingProfileIds = new Set();
const roleLookupFailureIds = new Set();
const bannedUserIds = new Set();
const profileHymnsTaxisLevels = new Map();
const profileGrades = new Map();
const hymnsTable = new Map();
const taxisItemsTable = new Map();
const completionWrites = new Map();
const completionRpcCalls = [];
const persistedLessons = new Map();
const persistedLessonVersions = new Map();
const persistedLessonSections = new Map();
const persistedProfiles = new Map();
const persistedClassMemberships = [];
const persistedClassInstances = new Map();
const persistedSectionProgress = new Map();
const persistedLessonProgress = new Map();
let sectionProgressWriteFailure = false;
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

function readRequestJson(req) {
  return new Promise((resolve, reject) => {
    let rawBody = '';
    req.on('data', chunk => { rawBody += chunk; });
    req.on('end', () => {
      try {
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function respondPostgrestRows(req, res, status, rows) {
  if (req.headers.accept?.includes('application/vnd.pgrst.object+json')) {
    if (rows.length === 0) return respondJson(res, 406, { code: 'PGRST116', message: 'No rows found' });
    return respondJson(res, status, rows[0]);
  }
  return respondJson(res, status, rows);
}

function filterPostgrestRows(rows, url) {
  return rows.filter(row => {
    for (const [column, filter] of url.searchParams) {
      if (column === 'select' || column === 'order' || column === 'limit') continue;
      if (filter.startsWith('eq.') && String(row[column] ?? '') !== filter.slice(3)) return false;
      if (filter.startsWith('in.(')) {
        const values = filter.slice(4, -1).split(',').map(value => value.replace(/^"|"$/g, ''));
        if (!values.includes(String(row[column] ?? ''))) return false;
      }
    }
    return true;
  });
}

function persistedProgressRows(tableName) {
  if (tableName === 'lessons') return [...persistedLessons.values()];
  if (tableName === 'lesson_versions') return [...persistedLessonVersions.values()];
  if (tableName === 'lesson_sections') return [...persistedLessonSections.values()];
  if (tableName === 'profiles') return [...persistedProfiles.values()];
  if (tableName === 'church_years') return [{ id: '00000000-0000-4000-8000-000000000001', is_active: true }];
  if (tableName === 'class_memberships') return persistedClassMemberships;
  if (tableName === 'class_instances') return [...persistedClassInstances.values()];
  if (tableName === 'lesson_section_progress') return [...persistedSectionProgress.values()];
  if (tableName === 'lesson_progress') return [...persistedLessonProgress.values()];
  return [];
}

async function handleCurriculumTable(req, res, url, tableName, table, bearer, userId) {
  if (curriculumWriteFailure && ['POST', 'PATCH'].includes(req.method)) {
    return respondJson(res, 500, { code: 'XX000', message: 'Simulated Supabase curriculum write failure' });
  }

  const roles = roleAssignments.get(userId) || [];
  const canManage = roles.includes('teacher') || roles.includes('admin');
  const isAdmin = roles.includes('admin');
  const isTeacher = roles.includes('teacher');
  const queryId = (url.searchParams.get('id') || '').replace(/^eq\./, '');

  if (req.method === 'GET') {
    let rows = [...table.values()].filter(row => !queryId || row.id === queryId);
    for (const [key, value] of url.searchParams) {
      if (key === 'select' || key === 'order' || key === 'limit') continue;
      if (value.startsWith('eq.')) {
        const expected = value.slice(3);
        rows = rows.filter(row => String(row[key] ?? '') === expected);
      }
    }
    if (!canManage) {
      if (!roles.includes('student')) rows = [];
      else if (tableName === 'hymns') {
        const level = profileHymnsTaxisLevels.get(userId);
        rows = rows.filter(row => row.status === 'published' && row.level === level);
      } else {
        const level = profileHymnsTaxisLevels.get(userId);
        const grade = (profileGrades.get(userId) || '').toLowerCase();
        rows = rows.filter(row =>
          row.status === 'published' &&
          row.level === level &&
          (['ALL', 'CONGREGATION'].includes(row.target_audience) &&
            (row.audience_detail !== 'preparatory' || grade.includes('prep')) ||
            row.target_audience === 'DEACONS' && (level || 0) >= 2)
        );
      }
    }
    return respondPostgrestRows(req, res, 200, rows);
  }

  if (!canManage) return respondJson(res, 403, { code: '42501', message: 'Teacher or admin role required' });
  const payload = await readRequestJson(req);
  if (req.method === 'POST') {
    const row = {
      ...payload,
      status: payload.status || 'draft',
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (row.status !== 'draft' || (!isAdmin && !isTeacher)) {
      return respondJson(res, 403, { code: '42501', message: 'Only teacher/admin-owned drafts may be created' });
    }
    if (table.has(row.id)) return respondJson(res, 409, { code: '23505', message: 'Duplicate content ID' });
    table.set(row.id, row);
    return respondPostgrestRows(req, res, 201, [row]);
  }

  if (req.method === 'PATCH') {
    const row = table.get(queryId);
    if (!row) return respondPostgrestRows(req, res, 200, []);
    const isOwner = row.created_by === userId;
    const canReview = isTeacher && ['under_review', 'approved'].includes(row.status);
    if (!isAdmin && (!isTeacher || (!isOwner && !canReview))) {
      return respondJson(res, 403, { code: '42501', message: 'Only the author or admin may update this content' });
    }
    const updated = { ...row, ...payload };
    table.set(queryId, updated);
    return respondPostgrestRows(req, res, 200, [updated]);
  }
  return respondJson(res, 405, { message: 'Unsupported method' });
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

async function startApp() {
  appOutput = '';
  app = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: root,
    env: appEnv,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  app.stdout.setEncoding('utf8').on('data', data => { appOutput += data; });
  app.stderr.setEncoding('utf8').on('data', data => { appOutput += data; });
  await waitForApp();
}

async function restartApp() {
  if (app && app.exitCode === null) {
    app.kill();
    await once(app, 'exit');
  }
  await startApp();
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

async function requestWithLiveAuth(path, { role, userId } = {}) {
  if (role && userId && !roleAssignments.has(userId)) roleAssignments.set(userId, [role]);
  return fetch(`${baseUrl}${path}`, {
    headers: { authorization: `Bearer ${role}|${userId}` }
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
      const idFilter = url.searchParams.get('id') || '';
      const requestedIds = idFilter.startsWith('eq.')
        ? [idFilter.slice(3)]
        : idFilter.startsWith('in.(')
          ? idFilter.slice(4, -1).split(',').map(value => value.replace(/^"|"$/g, ''))
          : userId ? [userId] : [];
      const rows = requestedIds
        .filter(requestedId => !missingProfileIds.has(requestedId))
        .map(requestedId => persistedProfiles.get(requestedId) || {
          id: requestedId,
          name: requestedId,
          email: `${requestedId}@example.test`,
          role: roleAssignments.get(requestedId)?.[0] || role || 'student',
          grade: profileGrades.get(requestedId) || 'Grade 4',
          points: 0,
          avatar: null,
          current_streak: 0,
          longest_streak: 0,
          hymns_taxis_level: profileHymnsTaxisLevels.get(requestedId) ?? null,
          created_at: new Date(0).toISOString()
        });
      return respondPostgrestRows(req, res, 200, rows);
    }
    if (url.pathname === '/rest/v1/profile_role_assignments') {
      const userIdFilter = url.searchParams.get('user_id') || '';
      const requestedIds = userIdFilter.startsWith('eq.')
        ? [userIdFilter.slice(3)]
        : userIdFilter.startsWith('in.(')
          ? userIdFilter.slice(4, -1).split(',').map(value => value.replace(/^"|"$/g, ''))
          : userId ? [userId] : [];
      if (requestedIds.some(requestedId => roleLookupFailureIds.has(requestedId))) {
        return respondJson(res, 500, { message: 'Role lookup unavailable' });
      }
      const requestedRole = (url.searchParams.get('role') || '').replace(/^eq\./, '');
      const rows = requestedIds.flatMap(requestedId => (roleAssignments.get(requestedId) || [])
        .filter(roleValue => !requestedRole || roleValue === requestedRole)
        .map(roleValue => ({ user_id: requestedId, role: roleValue, revoked_at: null })));
      return respondPostgrestRows(req, res, 200, rows);
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
    if (url.pathname === '/rest/v1/hymns') {
      return handleCurriculumTable(req, res, url, 'hymns', hymnsTable, bearer, userId);
    }
    if (url.pathname === '/rest/v1/coptic_taxis_items') {
      return handleCurriculumTable(req, res, url, 'coptic_taxis_items', taxisItemsTable, bearer, userId);
    }
    if (bearer === 'test-service-role-key') {
      const tableName = url.pathname.replace('/rest/v1/', '');
      const requestedId = (url.searchParams.get('id') || '').replace(/^eq\./, '');
      const requestedLessonId = (url.searchParams.get('lesson_id') || '').replace(/^eq\./, '');
      const requestedVersionId = (url.searchParams.get('lesson_version_id') || '').replace(/^eq\./, '');
      const requestedStudentId = (url.searchParams.get('student_id') || '').replace(/^eq\./, '');
      const requestedProfileId = (url.searchParams.get('id') || '').replace(/^eq\./, '');
      const requestedClassIds = (url.searchParams.get('id') || '').match(/^in\.\((.*)\)$/)?.[1].split(',') || [];
      const usePersistedFixture =
        tableName === 'lessons' && (persistedLessons.has(requestedId) || persistedLessons.size > 0) ||
        tableName === 'lesson_versions' &&
          (persistedLessonVersions.has(requestedId) || persistedLessons.has(requestedLessonId) || persistedLessonVersions.size > 0) ||
        tableName === 'lesson_sections' &&
          ([...persistedLessonVersions.values()].some(version => version.id === requestedVersionId) ||
            [...persistedLessonVersions.values()].some(version => version.id === requestedLessonId) ||
            persistedLessonSections.size > 0) ||
        tableName === 'profiles' && persistedProfiles.size > 0 ||
        tableName === 'church_years' ||
        tableName === 'class_memberships' &&
          persistedClassMemberships.length > 0 ||
        tableName === 'class_instances' &&
          persistedClassInstances.size > 0 ||
        ['lesson_section_progress', 'lesson_progress'].includes(tableName);
      if (usePersistedFixture) {
        return respondPostgrestRows(req, res, 200, filterPostgrestRows(persistedProgressRows(tableName), url));
      }
    }
    if (bearer === 'test-service-role-key' && url.pathname === '/rest/v1/class_memberships') {
      return respondJson(res, 200, []);
    }
    if (url.pathname === '/rest/v1/user_relationships') {
      return respondJson(res, 200, []);
    }
    if (url.pathname === '/rest/v1/rpc/can_access_student_data') {
      let rawBody = '';
      req.on('data', chunk => { rawBody += chunk; });
      req.on('end', () => {
        const body = JSON.parse(rawBody || '{}');
        delegatedAccessCalls.push({ bearer, body });
        if (delegatedAccessFailure) {
          return respondJson(res, 500, { code: 'XX000', message: 'Simulated access check failure' });
        }
        return respondJson(res, 200, delegatedAccessResult);
      });
      return;
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
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        (url.searchParams.get('id') || '').replace(/^eq\./, '')
      )) {
        return respondPostgrestRows(req, res, 200, []);
      }
      if (url.searchParams.get('select') === 'status') {
        return respondPostgrestRows(req, res, 200, [{ status: 'PUBLISHED' }]);
      }
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
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        (url.searchParams.get('id') || '').replace(/^eq\./, '')
      )) {
        return respondPostgrestRows(req, res, 200, []);
      }
      if (url.searchParams.get('select') === 'active_version_id,lesson_status') {
        return respondPostgrestRows(req, res, 200, publicationReadbackMatches
          ? [{ active_version_id: 'v-publication-test', lesson_status: 'published' }]
          : [{ active_version_id: 'different-version', lesson_status: 'draft' }]);
      }
      if (url.searchParams.get('select') === 'grade_level') {
        return respondPostgrestRows(req, res, 200, [{ grade_level: publicationGrade }]);
      }
      return respondJson(res, 200, { grade_level: 'Grade 4' });
    }
    if (bearer === 'test-service-role-key' && url.pathname === '/rest/v1/church_years') {
      return respondPostgrestRows(req, res, 200, publicationActiveYear ? [{ id: 'year-1' }] : []);
    }
    if (bearer === 'test-service-role-key' && url.pathname === '/rest/v1/church_events') {
      return respondJson(res, 200, []);
    }
    if (bearer === 'test-service-role-key' && url.pathname === '/rest/v1/class_instances') {
      const requestedGroup = (url.searchParams.get('class_group_id') || '').replace(/^eq\./, '');
      publicationClassGroupQueries.push(requestedGroup);
      return respondPostgrestRows(req, res, 200, requestedGroup === 'primary_2' ? [{ id: 'class-1' }] : []);
    }
    if (bearer === 'test-service-role-key' && url.pathname === '/rest/v1/servant_class_assignments') {
      if (req.method === 'POST' || req.method === 'PATCH') {
        return respondJson(res, 201, {});
      }
      const requestedYear = (url.searchParams.get('church_year_id') || '').replace(/^eq\./, '');
      return respondPostgrestRows(req, res, 200, publicationTeacherAssigned && requestedYear === publicationTeacherAssignmentYear
        ? [{ id: 'assignment-1' }]
        : []);
    }
    if (bearer === 'test-service-role-key' && url.pathname === '/rest/v1/lesson_publication_jobs') {
      return respondJson(res, 200, null);
    }
    if (bearer === 'test-service-role-key' && [
      '/rest/v1/rpc/publish_lesson_version_immediately',
      '/rest/v1/rpc/publish_lesson_version'
    ].includes(url.pathname)) {
      publicationRpcCalls += 1;
      if (publicationRpcFailure) {
        return respondJson(res, 409, { code: '42501', message: 'Simulated publication failure' });
      }
      return respondJson(res, 200, { success: true, published_at: '2026-01-01T00:00:00.000Z' });
    }
    if (bearer !== 'test-service-role-key' && url.pathname === '/rest/v1/church_years') {
      return respondPostgrestRows(req, res, 200, [{ id: 'year-live', name: 'Live Year', is_active: true }]);
    }
    if (bearer !== 'test-service-role-key' && url.pathname === '/rest/v1/servant_class_assignments') {
      const requestedUserId = (url.searchParams.get('servant_id') || '').replace(/^eq\./, '');
      const rows = liveTeacherAssignments.filter(assignment =>
        (!requestedUserId || assignment.servant_id === requestedUserId) &&
        assignment.church_year_id === 'year-live' &&
        assignment.is_active
      );
      return respondPostgrestRows(req, res, 200, rows);
    }
    if (bearer !== 'test-service-role-key' && url.pathname === '/rest/v1/class_instances') {
      const idFilter = url.searchParams.get('id') || '';
      const requestedId = idFilter.startsWith('eq.') ? idFilter.slice(3) : '';
      const requestedIds = (url.searchParams.get('id') || '').match(/^in\.\((.*)\)$/)?.[1]?.split(',').map(value => value.replace(/^"|"$/g, '')) || [];
      const requestedGroup = (url.searchParams.get('class_group_id') || '').replace(/^eq\./, '');
      const rows = [{
        id: 'class-live',
        class_group_id: assignedClassGroupId,
        name_en: 'Assigned Class',
        name_ar: 'فصل',
        join_code: 'LIVE-CLASS',
        church_year_id: 'year-live'
      }].filter(instance =>
        (!requestedId || instance.id === requestedId) &&
        (!requestedIds.length || requestedIds.includes(instance.id)) &&
        (!requestedGroup || instance.class_group_id === requestedGroup)
      );
      return respondPostgrestRows(req, res, 200, rows);
    }
    if (bearer !== 'test-service-role-key' && url.pathname === '/rest/v1/class_memberships') {
      const classId = (url.searchParams.get('class_instance_id') || '').replace(/^eq\./, '');
      const yearId = (url.searchParams.get('church_year_id') || '').replace(/^eq\./, '');
      const rows = liveClassMemberships.filter(membership =>
        membership.class_instance_id === classId && membership.church_year_id === yearId && membership.status === 'active'
      );
      return respondPostgrestRows(req, res, 200, rows);
    }
    if (bearer !== 'test-service-role-key' && url.pathname === '/rest/v1/profiles' && url.searchParams.get('id')?.startsWith('in.')) {
      const ids = url.searchParams.get('id').slice(4, -1).split(',');
      return respondPostgrestRows(req, res, 200, ids.map(id => ({
        id,
        name: `Profile ${id}`,
        avatar: null,
        role: roleAssignments.get(id)?.[0] || 'student',
        hymns_taxis_level: null
      })));
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
        const progressKey = `${body.p_student_id}:${body.p_lesson_id}`;
        persistedLessonProgress.set(progressKey, {
          student_id: body.p_student_id,
          lesson_id: body.p_lesson_id,
          completed: true,
          completed_at: result.completed_at,
          points_earned: previous ? (persistedLessonProgress.get(progressKey)?.points_earned || 50) : 50
        });
        const profile = persistedProfiles.get(body.p_student_id);
        if (profile) persistedProfiles.set(body.p_student_id, { ...profile, points: result.total_points });
        return respondJson(res, 200, [result]);
      });
      return;
    }
    if (url.pathname === '/rest/v1/rpc/set_lesson_section_read') {
      if (bearer !== 'test-service-role-key') {
        return respondJson(res, 403, { message: 'Trusted server key required' });
      }
      readRequestJson(req).then(body => {
        if (sectionProgressWriteFailure) {
          return respondJson(res, 500, { message: 'Simulated section progress write failure' });
        }
        const key = `${body.p_student_id}:${body.p_lesson_id}:${body.p_version_id}`;
        const previous = persistedSectionProgress.get(key)?.sections_completed || [];
        const sections = body.p_is_read
          ? [...new Set([...previous, body.p_section_id])]
          : previous.filter(id => id !== body.p_section_id);
        persistedSectionProgress.set(key, {
          student_id: body.p_student_id,
          lesson_id: body.p_lesson_id,
          version_id: body.p_version_id,
          sections_completed: sections,
          total_sections: body.p_total_sections
        });
        return respondJson(res, 200, [{ sections_completed: sections }]);
      });
      return;
    }
    return respondJson(res, 404, { message: 'Not found' });
  });
  const authPort = await listenOnEphemeralPort(authServer);
  authUrl = `http://127.0.0.1:${authPort}`;

  const portProbe = createServer();
  appPort = await listenOnEphemeralPort(portProbe);
  portProbe.close();
  await once(portProbe, 'close');
  baseUrl = `http://127.0.0.1:${appPort}`;
  appEnv = { ...process.env };
  delete appEnv.SUPABASE_ANON_KEY;
  appEnv.NODE_ENV = 'test';
  appEnv.PORT = String(appPort);
  appEnv.VITE_SUPABASE_URL = authUrl;
  appEnv.SUPABASE_URL = authUrl;
  appEnv.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
  appEnv.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  appEnv.SUPABASE_SECRET_KEY = 'test-service-role-key';
  appEnv.ENABLE_REVIEW_TEST_RESET = 'false';
  await startApp();
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

function preparePersistedStudentLesson({ studentId, lessonId, versionId, sectionIds, classGroupId = 'primary_2' }) {
  const activeYearId = '00000000-0000-4000-8000-000000000001';
  const classInstanceId = `10000000-0000-4000-8000-${studentId.slice(-12)}`;
  persistedProfiles.set(studentId, { id: studentId, points: 100 });
  persistedLessons.set(lessonId, {
    id: lessonId,
    grade_level: 'Grade 4',
    active_version_id: versionId,
    status: 'published',
    lesson_status: 'published'
  });
  persistedLessonVersions.set(versionId, {
    id: versionId,
    lesson_id: lessonId,
    status: 'PUBLISHED'
  });
  for (const id of sectionIds) {
    persistedLessonSections.set(id, { id, lesson_version_id: versionId });
  }
  persistedClassInstances.set(classInstanceId, {
    id: classInstanceId,
    class_group_id: classGroupId,
    church_year_id: activeYearId
  });
  persistedClassMemberships.push({
    student_id: studentId,
    church_year_id: activeYearId,
    class_instance_id: classInstanceId,
    status: 'active'
  });
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
  publicationGrade = 'Grade 4';
  publicationActiveYear = true;
  publicationTeacherAssignmentYear = '00000000-0000-4000-8000-000000000001';
  publicationRpcFailure = false;
  publicationReadbackMatches = true;
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

  publicationGrade = '4th Grade';
  const gradeAlias = await request('/api/church/publish-approved-lesson-version', {
    method: 'POST',
    role: 'teacher',
    userId: 'user_teacher_mina_101',
    body
  });
  assert.equal(gradeAlias.status, 200, await gradeAlias.text());
  assert.equal(publicationRpcCalls, initialRpcCalls + 2);

  publicationGrade = 'Grade 1';
  const wrongGrade = await request('/api/church/publish-approved-lesson-version', {
    method: 'POST',
    role: 'teacher',
    userId: 'user_teacher_mina_101',
    body
  });
  const wrongGradeBody = await wrongGrade.text();
  assert.equal(wrongGrade.status, 403, `${wrongGradeBody}; class-group lookup: ${publicationClassGroupQueries.at(-1)}`);
  assert.equal(publicationClassGroupQueries.at(-1), 'primary_1');

  publicationGrade = 'Grade 4';
  publicationTeacherAssignmentYear = 'year-inactive';
  const inactiveYear = await request('/api/church/publish-approved-lesson-version', {
    method: 'POST',
    role: 'teacher',
    userId: 'user_teacher_mina_101',
    body
  });
  assert.equal(inactiveYear.status, 403, await inactiveYear.text());

  publicationTeacherAssignmentYear = '00000000-0000-4000-8000-000000000001';
  publicationRpcFailure = true;
  const failedPublication = await request('/api/church/publish-approved-lesson-version', {
    method: 'POST',
    role: 'teacher',
    userId: 'user_teacher_mina_101',
    body
  });
  assert.equal(failedPublication.status, 409, await failedPublication.text());

  publicationRpcFailure = false;
  publicationReadbackMatches = false;
  const unverifiedPublication = await request('/api/church/publish-approved-lesson-version', {
    method: 'POST',
    role: 'teacher',
    userId: 'user_teacher_mina_101',
    body
  });
  assert.equal(unverifiedPublication.status, 500, await unverifiedPublication.text());

  const multiRoleAdminId = `multi-role-admin-${Date.now()}`;
  roleAssignments.set(multiRoleAdminId, ['teacher', 'admin']);
  publicationTeacherAssigned = false;
  publicationReadbackMatches = true;
  const adminWithTeacherRole = await request('/api/church/publish-approved-lesson-version', {
    method: 'POST',
    role: 'teacher',
    userId: multiRoleAdminId,
    body
  });
  assert.equal(adminWithTeacherRole.status, 200, await adminWithTeacherRole.text());

  publicationTeacherAssigned = false;
  publicationGrade = 'Grade 4';
  publicationActiveYear = true;
  publicationTeacherAssignmentYear = '00000000-0000-4000-8000-000000000001';
  publicationRpcFailure = false;
  publicationReadbackMatches = true;
});

test('multi-role teacher class reads require a current matching assignment and use persisted roster rows', async () => {
  const teacherId = `live-class-teacher-${Date.now()}`;
  roleAssignments.set(teacherId, ['student', 'teacher']);
  assignedClassGroupId = 'primary_2';
  liveTeacherAssignments = [{
    id: 'assignment-live',
    servant_id: teacherId,
    class_instance_id: 'class-live',
    church_year_id: 'year-live',
    is_active: true
  }];
  liveClassMemberships = [{
    id: 'membership-live',
    student_id: 'student-live',
    class_instance_id: 'class-live',
    church_year_id: 'year-live',
    exact_grade: 'Grade 4',
    status: 'active',
    joined_at: '2026-01-01T00:00:00.000Z'
  }];

  const valid = await requestWithLiveAuth('/api/church/my-class?classGroupId=primary_2', {
    role: 'teacher',
    userId: teacherId
  });
  const validBodyText = await valid.text();
  assert.equal(valid.status, 200, validBodyText);
  const validBody = JSON.parse(validBodyText);
  assert.equal(validBody.classInfo.classInstanceId, 'class-live');
  assert.deepEqual(validBody.roster.map(student => student.id), ['student-live']);

  const wrongClass = await requestWithLiveAuth('/api/church/my-class?classGroupId=primary_1', {
    role: 'teacher',
    userId: teacherId
  });
  assert.equal(wrongClass.status, 403, await wrongClass.text());

  liveTeacherAssignments = [{
    ...liveTeacherAssignments[0],
    church_year_id: 'year-inactive'
  }];
  const inactiveYear = await requestWithLiveAuth('/api/church/my-class', {
    role: 'teacher',
    userId: teacherId
  });
  assert.equal(inactiveYear.status, 403, await inactiveYear.text());

  liveTeacherAssignments = [];
  const unassigned = await requestWithLiveAuth('/api/church/my-class', {
    role: 'teacher',
    userId: teacherId
  });
  assert.equal(unassigned.status, 403, await unassigned.text());

  liveTeacherAssignments = [];
  liveClassMemberships = [];
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
  assert.equal(forgedUpdate.status, 409);
  assert.equal(forgedResult.error, 'USE_WORKFLOW_ACTION');

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

test('Hymns and Taxis persist through Supabase across an application restart and honor role boundaries', async () => {
  const suffix = Date.now();
  const teacherId = `hymns-taxis-restart-teacher-${suffix}`;
  const reviewerId = `hymns-taxis-restart-reviewer-${suffix}`;
  const studentId = `hymns-taxis-restart-student-${suffix}`;
  roleAssignments.set(teacherId, ['teacher']);
  roleAssignments.set(reviewerId, ['teacher']);
  roleAssignments.set(studentId, ['student']);
  profileGrades.set(teacherId, 'Head Servant');
  profileGrades.set(studentId, 'Grade 4');
  profileHymnsTaxisLevels.set(studentId, 2);

  const unauthorizedCreate = await request('/api/church/hymns', {
    method: 'POST',
    role: 'student',
    userId: studentId,
    body: { titleAr: 'غير مصرح', level: 2 }
  });
  assert.equal(unauthorizedCreate.status, 403);
  const unauthorizedTaxisCreate = await request('/api/church/taxis', {
    method: 'POST',
    role: 'student',
    userId: studentId,
    body: { titleAr: 'غير مصرح', titleEn: 'Not allowed', level: 2 }
  });
  assert.equal(unauthorizedTaxisCreate.status, 403);

  const hymnId = `restart-hymn-${suffix}`;
  const hymnCreate = await request('/api/church/hymns', {
    method: 'POST',
    role: 'teacher',
    userId: teacherId,
    body: {
      id: hymnId,
      titleAr: 'لحن بعد إعادة التشغيل',
      titleEn: 'Restart Hymn',
      titleCoptic: 'Ⲁ̀ⲅⲓⲟⲥ',
      seasonAr: 'الصوم الكبير',
      seasonEn: 'Great Lent',
      occasionTag: 'lent',
      level: 2,
      audioUrl: 'storage://hymns/restart-audio',
      pdfUrl: 'storage://hymns/restart-pdf',
      sheetMusicUrl: 'storage://hymns/restart-sheet',
      lines: [{ id: 1, coptic: 'Ⲁ̀ⲅⲓⲟⲥ', arabized: 'أجيوس', arabic: 'قدوس' }],
      status: 'published'
    }
  });
  assert.equal(hymnCreate.status, 201, hymnCreate.status === 201 ? '' : await hymnCreate.text());
  assert.equal((await hymnCreate.json()).hymn.status, 'published');

  const taxisId = `restart-taxis-${suffix}`;
  const taxisCreate = await request('/api/church/taxis', {
    method: 'POST',
    role: 'teacher',
    userId: teacherId,
    body: {
      id: taxisId,
      titleAr: 'طقس بعد إعادة التشغيل',
      titleEn: 'Restart Taxis',
      category: 'liturgy',
      season: 'Great Lent',
      level: 2,
      audience: 'all',
      sections: [{ id: 'section-1', order: 1, titleAr: 'عنوان', titleEn: 'Title', contentAr: 'شرح' }],
      references: ['كتاب الطقس'],
      documents: []
    }
  });
  assert.equal(taxisCreate.status, 201, taxisCreate.status === 201 ? '' : await taxisCreate.text());
  assert.equal((await taxisCreate.json()).item.status, 'draft');

  const submitTaxis = await request(`/api/church/taxis/${taxisId}/submit-review`, {
    method: 'POST',
    role: 'teacher',
    userId: teacherId,
    body: {}
  });
  assert.equal(submitTaxis.status, 200, await submitTaxis.text());

  const selfApproval = await request(`/api/church/taxis/${taxisId}/review`, {
    method: 'POST',
    role: 'teacher',
    userId: teacherId,
    body: { action: 'APPROVE' }
  });
  assert.equal(selfApproval.status, 403);

  const reviewerApproval = await request(`/api/church/taxis/${taxisId}/review`, {
    method: 'POST',
    role: 'teacher',
    userId: reviewerId,
    body: { action: 'APPROVE' }
  });
  assert.equal(reviewerApproval.status, 200, await reviewerApproval.text());

  const publishTaxis = await request(`/api/church/taxis/${taxisId}/publish`, {
    method: 'POST',
    role: 'teacher',
    userId: teacherId,
    body: {}
  });
  assert.equal(publishTaxis.status, 200, await publishTaxis.text());

  const unauthorizedPublish = await request(`/api/church/taxis/${taxisId}/publish`, {
    method: 'POST',
    role: 'student',
    userId: studentId,
    body: {}
  });
  assert.equal(unauthorizedPublish.status, 403);

  await restartApp();

  const studentHymns = await request('/api/church/hymns?level=2', { role: 'student', userId: studentId });
  assert.equal(studentHymns.status, 200, studentHymns.status === 200 ? '' : await studentHymns.text());
  const hymns = await studentHymns.json();
  const storedHymn = hymns.items.find(item => item.id === hymnId);
  assert.equal(storedHymn?.status, 'published');
  assert.equal(storedHymn?.audioUrl, 'storage://hymns/restart-audio');
  assert.equal(storedHymn?.pdfUrl, 'storage://hymns/restart-pdf');
  assert.equal(storedHymn?.lines[0].arabic, 'قدوس');

  const studentTaxis = await request('/api/church/taxis', { role: 'student', userId: studentId });
  assert.equal(studentTaxis.status, 200, studentTaxis.status === 200 ? '' : await studentTaxis.text());
  const taxis = await studentTaxis.json();
  const storedTaxis = taxis.items.find(item => item.id === taxisId);
  assert.equal(storedTaxis?.status, 'published');
  assert.equal(storedTaxis?.season, 'Great Lent');
  assert.deepEqual(storedTaxis?.references, ['كتاب الطقس']);
  assert.equal(storedTaxis?.sections[0].contentAr, 'شرح');

  const unpublishHymn = await request(`/api/church/hymns/${hymnId}/unpublish`, {
    method: 'POST',
    role: 'teacher',
    userId: teacherId,
    body: {}
  });
  assert.equal(unpublishHymn.status, 200, await unpublishHymn.text());

  const unpublishTaxis = await request(`/api/church/taxis/${taxisId}/unpublish`, {
    method: 'POST',
    role: 'teacher',
    userId: teacherId,
    body: {}
  });
  assert.equal(unpublishTaxis.status, 200, await unpublishTaxis.text());

  curriculumWriteFailure = true;
  const failedWrite = await request('/api/church/hymns', {
    method: 'POST',
    role: 'teacher',
    userId: teacherId,
    body: { id: `failed-hymn-${suffix}`, titleAr: 'فشل', level: 2 }
  });
  curriculumWriteFailure = false;
  assert.equal(failedWrite.status, 500);
  assert.equal((await failedWrite.json()).success, false);
  assert.equal(hymnsTable.has(`failed-hymn-${suffix}`), false);
  curriculumWriteFailure = true;
  const failedTaxisWrite = await request('/api/church/taxis', {
    method: 'POST',
    role: 'teacher',
    userId: teacherId,
    body: { id: `failed-taxis-${suffix}`, titleAr: 'فشل', titleEn: 'Failed', level: 2 }
  });
  curriculumWriteFailure = false;
  assert.equal(failedTaxisWrite.status, 500);
  assert.equal((await failedTaxisWrite.json()).success, false);
  assert.equal(taxisItemsTable.has(`failed-taxis-${suffix}`), false);

  roleAssignments.delete(teacherId);
  roleAssignments.delete(studentId);
  profileGrades.delete(teacherId);
  profileGrades.delete(studentId);
  profileHymnsTaxisLevels.delete(studentId);
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

test('UUID-backed student completion persists real section UUIDs and is returned by a later progress read', async () => {
  const studentId = '40000000-0000-4000-8000-000000000001';
  const lessonId = '20000000-0000-4000-8000-000000000001';
  const versionId = '30000000-0000-4000-8000-000000000001';
  const sectionIds = [
    '50000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000002'
  ];
  preparePersistedStudentLesson({ studentId, lessonId, versionId, sectionIds });

  const start = await request('/api/church/student-progress/start', {
    method: 'POST', role: 'student', userId: studentId, body: { lessonId, versionId }
  });
  assert.equal(start.status, 200, await start.text());
  for (const sectionId of sectionIds) {
    const section = await request('/api/church/student-progress/complete-section', {
      method: 'POST', role: 'student', userId: studentId, body: { lessonId, versionId, sectionId }
    });
    assert.equal(section.status, 200, await section.text());
  }

  const completion = await request('/api/church/student-progress/complete-lesson', {
    method: 'POST', role: 'student', userId: studentId, body: { lessonId, versionId }
  });
  const completed = await completion.json();
  assert.equal(completion.status, 200, JSON.stringify(completed));
  assert.equal(completed.progress.status, 'COMPLETED');
  assert.deepEqual(completed.progress.sectionsCompleted.sort(), sectionIds.sort());

  const readback = await request(`/api/church/student-progress?lessonId=${lessonId}`, {
    role: 'student', userId: studentId
  });
  const persisted = await readback.json();
  assert.equal(readback.status, 200, JSON.stringify(persisted));
  assert.equal(persisted.progress.status, 'COMPLETED');
  assert.equal(persisted.progress.completionPercent, 100);

  const summaryResponse = await request('/api/church/student-progress/summary', {
    role: 'student', userId: studentId
  });
  const summary = await summaryResponse.json();
  assert.equal(summaryResponse.status, 200, JSON.stringify(summary));
  assert.deepEqual(summary.completedLessonIds, [lessonId]);
  assert.equal(summary.allProgress[lessonId].status, 'COMPLETED');
  assert.deepEqual(summary.allProgress[lessonId].sectionsCompleted.sort(), sectionIds.sort());
  assert.equal(summary.points, 150);
  assert.equal(summary.totalAssignedLessons, 1);
});

test('UUID-backed progress rejects another student, invalid lesson versions, invalid sections, and unassigned classes', async () => {
  const studentId = '40000000-0000-4000-8000-000000000002';
  const lessonId = '20000000-0000-4000-8000-000000000002';
  const versionId = '30000000-0000-4000-8000-000000000002';
  const sectionId = '50000000-0000-4000-8000-000000000003';
  preparePersistedStudentLesson({ studentId, lessonId, versionId, sectionIds: [sectionId] });

  const unauthorized = await request('/api/church/student-progress/start', {
    method: 'POST', role: 'teacher', userId: '40100000-0000-4000-8000-000000000002',
    body: { lessonId, versionId, studentId }
  });
  assert.equal(unauthorized.status, 403);

  const invalidVersion = await request('/api/church/student-progress/start', {
    method: 'POST', role: 'student', userId: studentId,
    body: { lessonId, versionId: '30000000-0000-4000-8000-000000000099' }
  });
  assert.equal(invalidVersion.status, 404);
  assert.equal((await invalidVersion.json()).error, 'INVALID_VERSION');

  const invalidSection = await request('/api/church/student-progress/complete-section', {
    method: 'POST', role: 'student', userId: studentId,
    body: { lessonId, versionId, sectionId: '50000000-0000-4000-8000-000000000099' }
  });
  assert.equal(invalidSection.status, 400);
  assert.equal((await invalidSection.json()).error, 'INVALID_SECTION');

  const unassignedStudent = '40000000-0000-4000-8000-000000000003';
  const otherLesson = '20000000-0000-4000-8000-000000000003';
  const otherVersion = '30000000-0000-4000-8000-000000000003';
  preparePersistedStudentLesson({
    studentId: unassignedStudent,
    lessonId: otherLesson,
    versionId: otherVersion,
    sectionIds: ['50000000-0000-4000-8000-000000000004'],
    classGroupId: 'preparatory'
  });
  const unassigned = await request('/api/church/student-progress/start', {
    method: 'POST', role: 'student', userId: unassignedStudent, body: { lessonId: otherLesson, versionId: otherVersion }
  });
  assert.equal(unassigned.status, 403);
  assert.equal((await unassigned.json()).error, 'CLASS_NOT_ASSIGNED');

  const missingLesson = await request('/api/church/student-progress/start', {
    method: 'POST', role: 'student', userId: studentId,
    body: {
      lessonId: '20000000-0000-4000-8000-000000000099',
      versionId: '30000000-0000-4000-8000-000000000099'
    }
  });
  assert.equal(missingLesson.status, 404);
  assert.equal((await missingLesson.json()).error, 'LESSON_NOT_FOUND');
});

test('UUID-backed section and completion database failures do not mark progress complete', async () => {
  const studentId = '40000000-0000-4000-8000-000000000004';
  const lessonId = '20000000-0000-4000-8000-000000000004';
  const versionId = '30000000-0000-4000-8000-000000000004';
  const sectionIds = [
    '50000000-0000-4000-8000-000000000005',
    '50000000-0000-4000-8000-000000000006'
  ];
  preparePersistedStudentLesson({ studentId, lessonId, versionId, sectionIds });

  sectionProgressWriteFailure = true;
  try {
    const failedSection = await request('/api/church/student-progress/complete-section', {
      method: 'POST', role: 'student', userId: studentId,
      body: { lessonId, versionId, sectionId: sectionIds[0] }
    });
    assert.equal(failedSection.status, 500);
  } finally {
    sectionProgressWriteFailure = false;
  }

  for (const sectionId of sectionIds) {
    const section = await request('/api/church/student-progress/complete-section', {
      method: 'POST', role: 'student', userId: studentId, body: { lessonId, versionId, sectionId }
    });
    assert.equal(section.status, 200, await section.text());
  }

  rpcFailure = true;
  try {
    const failedCompletion = await request('/api/church/student-progress/complete-lesson', {
      method: 'POST', role: 'student', userId: studentId, body: { lessonId, versionId }
    });
    assert.equal(failedCompletion.status, 502);
    assert.equal((await failedCompletion.json()).success, false);
  } finally {
    rpcFailure = false;
  }

  const readback = await request(`/api/church/student-progress?lessonId=${lessonId}`, {
    role: 'student', userId: studentId
  });
  const progress = await readback.json();
  assert.equal(readback.status, 200);
  assert.equal(progress.progress.status, 'IN_PROGRESS');
  assert.equal(progress.progress.completionPercent, 100);
  assert.equal(progress.progress.completedAt, null);
});

test('failed authoritative completion does not report lesson completion in progress summaries', async () => {
  const studentId = `test_student_failed_completion_${Date.now()}`;
  const lessonId = 'l-cross-01';
  const versionId = `ver-failed-completion-${Date.now()}`;
  await prepareLessonCompletion({ studentId, lessonId, versionId });

  rpcFailure = true;
  try {
    const completion = await request('/api/church/student-progress/complete-lesson', {
      method: 'POST',
      role: 'student',
      userId: studentId,
      body: { lessonId, versionId }
    });
    assert.equal(completion.status, 502);
  } finally {
    rpcFailure = false;
  }

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

test('role authorization fails closed when assigned-role lookup fails', async () => {
  const roleLookupFailureId = 'role-auth-lookup-failure';
  roleAssignments.set(roleLookupFailureId, ['admin']);
  roleLookupFailureIds.add(roleLookupFailureId);

  try {
    const roleLookupFailure = await request('/api/church/admin/role-requests', {
      role: 'admin',
      userId: roleLookupFailureId
    });
    assert.equal(roleLookupFailure.status, 401);
  } finally {
    roleLookupFailureIds.delete(roleLookupFailureId);
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


test('parent and teacher delegated student-data access is checked against Supabase', async () => {
  const studentId = 'a1111111-1111-4111-8111-111111111111';
  const parentId = 'parent-db-access-check';
  const teacherId = 'teacher-db-access-check';
  roleAssignments.set(parentId, ['parent']);
  roleAssignments.set(teacherId, ['teacher']);
  delegatedAccessResult = true;
  delegatedAccessFailure = false;

  const before = delegatedAccessCalls.length;
  const parentResponse = await request(`/api/church/completion-history?studentId=${studentId}`, {
    role: 'parent',
    userId: parentId
  });
  assert.equal(parentResponse.status, 200, await parentResponse.clone().text());
  assert.equal(delegatedAccessCalls.length, before + 1);
  assert.equal(delegatedAccessCalls.at(-1).body.p_student_id, studentId);
  assert.match(delegatedAccessCalls.at(-1).bearer, /test_jwt_parent/);

  delegatedAccessResult = false;
  const deniedTeacherResponse = await request(`/api/church/completion-history?studentId=${studentId}`, {
    role: 'teacher',
    userId: teacherId
  });
  assert.equal(deniedTeacherResponse.status, 403);

  delegatedAccessFailure = true;
  const unavailableResponse = await request(`/api/church/completion-history?studentId=${studentId}`, {
    role: 'parent',
    userId: parentId
  });
  assert.equal(unavailableResponse.status, 502);
  assert.equal((await unavailableResponse.json()).error, 'ACCESS_CHECK_FAILED');

  delegatedAccessFailure = false;
  delegatedAccessResult = true;
});


test('authenticated student leaderboard uses only the active Supabase class roster and progress', async () => {
  const studentId = 'a2111111-1111-4111-8111-111111111111';
  const peerId = 'b2111111-1111-4111-8111-111111111111';
  const classInstanceId = 'leaderboard-class-instance';
  const yearId = '00000000-0000-4000-8000-000000000001';
  const studentLessonId = 'c2111111-1111-4111-8111-111111111111';
  const peerLessonId = 'd2111111-1111-4111-8111-111111111111';
  const now = new Date().toISOString();

  roleAssignments.set(studentId, ['student']);
  roleAssignments.set(peerId, ['student']);
  persistedClassInstances.set(classInstanceId, {
    id: classInstanceId,
    church_year_id: yearId,
    class_group_id: 'primary_2'
  });
  persistedClassMemberships.push(
    { id: 'lb-membership-student', student_id: studentId, class_instance_id: classInstanceId, church_year_id: yearId, exact_grade: 'Grade 6', status: 'active', left_at: null },
    { id: 'lb-membership-peer', student_id: peerId, class_instance_id: classInstanceId, church_year_id: yearId, exact_grade: 'Grade 6', status: 'active', left_at: null }
  );
  persistedProfiles.set(studentId, {
    id: studentId, name: 'Current Student', avatar: null, grade: 'Grade 6',
    points: 200, current_streak: 3, longest_streak: 5
  });
  persistedProfiles.set(peerId, {
    id: peerId, name: 'Classmate', avatar: null, grade: 'Grade 6',
    points: 260, current_streak: 4, longest_streak: 6
  });
  persistedLessonProgress.set(`${studentId}:${studentLessonId}`, {
    student_id: studentId, lesson_id: studentLessonId, completed: true,
    completed_at: now, points_earned: 40
  });
  persistedLessonProgress.set(`${peerId}:${peerLessonId}`, {
    student_id: peerId, lesson_id: peerLessonId, completed: true,
    completed_at: now, points_earned: 70
  });

  const response = await request('/api/church/leaderboard?timeframe=weekly', {
    role: 'student',
    userId: studentId
  });
  assert.equal(response.status, 200, await response.clone().text());
  const payload = await response.json();
  assert.equal(payload.classGroupId, 'primary_2');
  assert.equal(payload.totalParticipants, 2);
  assert.equal(payload.leaderboard[0].studentId, peerId);
  assert.equal(payload.leaderboard[0].pointsThisWeek, 70);
  assert.equal(payload.leaderboard[1].studentId, studentId);
  assert.equal(payload.leaderboard[1].pointsThisWeek, 40);
  assert.equal(payload.currentUserEntry.studentId, studentId);
  assert.equal(payload.leaderboard.some(entry => entry.studentId === 'mark'), false);

  const forbidden = await request('/api/church/leaderboard?classGroupId=preparatory', {
    role: 'student',
    userId: studentId
  });
  assert.equal(forbidden.status, 403);
});

test('unassigned authenticated students receive an empty leaderboard instead of demo classmates', async () => {
  const studentId = 'e2111111-1111-4111-8111-111111111111';
  roleAssignments.set(studentId, ['student']);
  const response = await request('/api/church/leaderboard', {
    role: 'student',
    userId: studentId
  });
  assert.equal(response.status, 200, await response.clone().text());
  const payload = await response.json();
  assert.equal(payload.classGroupId, null);
  assert.deepEqual(payload.leaderboard, []);
  assert.equal(payload.totalParticipants, 0);
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
