const http = require('http');
const assert = require('assert');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function createTestToken(userId, role) {
  return `test_jwt_${role}_${userId}`;
}

async function run() {
  console.log('--- TEST A: Student Request -> Servant Approval -> Added to Roster ---');
  const studentToken = createTestToken('student_test_approval_1', 'student');
  const teacherMinaToken = createTestToken('user_teacher_mina_101', 'teacher');

  // 1. Student selects exact grade Grade 4 in primary_2
  const reqRes = await request('POST', '/api/church/onboarding/request', {
    studentId: 'student_test_approval_1',
    studentName: 'Approval Test Student',
    requestedGrade: 'Grade 4',
    requestedClassGroupId: 'primary_2'
  }, {
    'Authorization': `Bearer ${studentToken}`
  });

  assert.strictEqual(reqRes.status, 200, 'Student request returns 200');
  const requestId = reqRes.data.request?.id;
  assert(Boolean(requestId), 'Activation request was created');

  // 2. Servant fetches pending requests
  const pendingRes = await request('GET', '/api/church/onboarding/requests?classGroupId=primary_2', null, {
    'Authorization': `Bearer ${teacherMinaToken}`
  });
  assert.strictEqual(pendingRes.status, 200, 'Servant gets pending requests');
  const hasRequest = pendingRes.data.requests?.some(r => r.id === requestId);
  assert(hasRequest, 'Newly submitted request is visible in pending list');

  // 3. Servant APPROVES request
  const approveRes = await request('POST', '/api/church/onboarding/review', {
    requestId,
    action: 'APPROVE',
    assignedGrade: 'Grade 4'
  }, {
    'Authorization': `Bearer ${teacherMinaToken}`
  });
  assert.strictEqual(approveRes.status, 200, 'Approval returns 200');
  assert.strictEqual(approveRes.data.request?.status, 'APPROVED', 'Request is APPROVED');

  // 4. Verify request is NO LONGER in pending requests list
  const pendingAfterApprove = await request('GET', '/api/church/onboarding/requests?classGroupId=primary_2', null, {
    'Authorization': `Bearer ${teacherMinaToken}`
  });
  const inPendingAfterApprove = pendingAfterApprove.data.requests?.some(r => r.id === requestId);
  assert(!inPendingAfterApprove, 'Approved request is no longer returned in pending requests list');

  // 5. Verify student is in the authoritative class roster
  const myClassRes = await request('GET', '/api/church/my-class', null, {
    'Authorization': `Bearer ${teacherMinaToken}`
  });
  assert.strictEqual(myClassRes.status, 200, 'My-class returns 200');
  const inRoster = myClassRes.data.roster?.some(s => s.id === 'student_test_approval_1');
  assert(inRoster, 'Approved student is now present in the authoritative class roster');
  console.log('✅ PASS: Student approved and successfully added to roster; removed from pending list.');

  console.log('\n--- TEST B: Servant Rejection -> Disappears from Pending List ---');
  // 1. Submit another request to test denial
  const reqDenyRes = await request('POST', '/api/church/onboarding/request', {
    studentId: 'student_test_deny_2',
    studentName: 'Deny Test Student',
    requestedGrade: 'Grade 5',
    requestedClassGroupId: 'primary_2'
  }, {
    'Authorization': `Bearer ${studentToken}`
  });
  const denyRequestId = reqDenyRes.data.request?.id;
  assert(Boolean(denyRequestId), 'Deny test request created');

  // 2. Servant DENIES / REJECTS request
  const denyRes = await request('POST', '/api/church/onboarding/review', {
    requestId: denyRequestId,
    action: 'REJECT'
  }, {
    'Authorization': `Bearer ${teacherMinaToken}`
  });
  assert.strictEqual(denyRes.status, 200, 'Rejection returns 200');
  assert.strictEqual(denyRes.data.request?.status, 'REJECTED', 'Request is REJECTED');

  // 3. Verify request is NO LONGER in pending requests list
  const pendingAfterDeny = await request('GET', '/api/church/onboarding/requests?classGroupId=primary_2', null, {
    'Authorization': `Bearer ${teacherMinaToken}`
  });
  const inPendingAfterDeny = pendingAfterDeny.data.requests?.some(r => r.id === denyRequestId);
  assert(!inPendingAfterDeny, 'Denied request is completely removed from pending list');
  console.log('✅ PASS: Denied request cleanly removed from pending list.');

  console.log('\n--- TEST C: Manual Student Assignment Using Student Code ---');
  // Use student code 'A7K2M' (David Shenouda) to assign to Grade 4
  const codeAssignRes = await request('POST', '/api/church/student/class', {
    studentId: 'A7K2M',
    classGroupId: 'primary_2',
    grade: 'Grade 4'
  }, {
    'Authorization': `Bearer ${teacherMinaToken}`
  });
  assert.strictEqual(codeAssignRes.status, 200, 'Manual assignment using code A7K2M returns 200');
  assert.strictEqual(codeAssignRes.data.success, true, 'Assignment reports success');

  // Check roster for David Shenouda
  const rosterCheck = await request('GET', '/api/church/my-class', null, {
    'Authorization': `Bearer ${teacherMinaToken}`
  });
  const hasDavid = rosterCheck.data.roster?.some(s => s.id === 'student-david' || s.id === 'A7K2M' || s.name.includes('David'));
  assert(hasDavid, 'Student David assigned via code A7K2M is present in the class roster');
  console.log('✅ PASS: Manual assignment via student code A7K2M successfully adds student to roster.');

  // Also test with B6T2N (Mina Emad)
  const codeAssignRes2 = await request('POST', '/api/church/student/class', {
    studentId: 'B6T2N',
    classGroupId: 'primary_2',
    grade: 'Grade 4'
  }, {
    'Authorization': `Bearer ${teacherMinaToken}`
  });
  assert.strictEqual(codeAssignRes2.status, 200, 'Manual assignment using code B6T2N returns 200');
  const hasMina = (await request('GET', '/api/church/my-class', null, { 'Authorization': `Bearer ${teacherMinaToken}` }))
    .data.roster?.some(s => s.id === 'c1' || s.id === 'B6T2N' || s.name.includes('Mina Emad'));
  assert(hasMina, 'Student Mina assigned via code B6T2N is present in the class roster');
  console.log('✅ PASS: Manual assignment via student code B6T2N successfully adds student to roster.');

  console.log('\n🎉 ALL 4 USER SCENARIO CHECKS PASSED PERFECTLY!');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
