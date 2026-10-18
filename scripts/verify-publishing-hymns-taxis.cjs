// Automated Hymns School & Coptic Rituals / Taxis Security & RBAC Test Suite
const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function makePostRequest(path, payload, token) {
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

function makePutRequest(path, payload, token) {
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
      method: 'PUT',
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

function makeGetRequest(path, queryParams = {}, token) {
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

async function runTestSuite() {
  console.log('====================================================');
  console.log('Hymns School & Coptic Rituals/Taxis Comprehensive QA');
  console.log('====================================================\n');

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

  const studentToken = 'test_jwt_student_george_' + Date.now();
  const teacherMinaToken = 'test_jwt_teacher_mina';
  const otherStudentToken = 'test_jwt_student_david';
  const adminToken = 'test_jwt_admin_super';

  // ----------------------------------------------------
  // TEST 1: Student checks initial enrollment status
  // ----------------------------------------------------
  console.log('\n--- Test 1: Student checks initial Hymns enrollment status ---');
  const enr1 = await makeGetRequest('/api/church/hymns/my-enrollment', {}, studentToken);
  assert(enr1.statusCode === 200, 'my-enrollment returns 200');
  assert(enr1.json?.success === true, 'my-enrollment returns success');
  assert(enr1.json?.membership === null, 'student is initially not enrolled');

  // ----------------------------------------------------
  // TEST 2: Student submits enrollment application for Level 1
  // ----------------------------------------------------
  console.log('\n--- Test 2: Student submits Hymns enrollment application ---');
  const app1 = await makePostRequest('/api/church/hymns/enroll', {
    level: 1,
    rosterGroup: 'primary_choir',
    notes: 'Eager to learn Ep-Oro and Khen Efran',
    studentName: 'George The Deacon Candidate'
  }, studentToken);
  assert(app1.statusCode === 200, 'Student enrollment submission returns 200');
  assert(app1.json?.membership?.status === 'pending', 'Membership status is pending');
  assert(app1.json?.membership?.level === 1, 'Requested level is 1');
  const membershipId = app1.json?.membership?.id;

  // ----------------------------------------------------
  // TEST 3: Duplicate pending submission is rejected
  // ----------------------------------------------------
  console.log('\n--- Test 3: Duplicate enrollment submission is rejected ---');
  const dup1 = await makePostRequest('/api/church/hymns/enroll', {
    level: 1,
    rosterGroup: 'primary_choir'
  }, studentToken);
  assert(dup1.statusCode === 400, 'Duplicate request returns 400');
  assert(dup1.json?.error === 'ALREADY_PENDING', 'Error code is ALREADY_PENDING');

  // ----------------------------------------------------
  // TEST 4: Student Forbidden from Viewing Other Requests or Approving Own Request
  // ----------------------------------------------------
  console.log('\n--- Test 4: Student Forbidden from Privileged Review APIs ---');
  const reqListStudent = await makeGetRequest('/api/church/hymns/requests', {}, studentToken);
  assert(reqListStudent.statusCode === 403, 'Student cannot list hymns requests (403)');

  const approveSelf = await makePostRequest('/api/church/hymns/review', {
    membershipId,
    action: 'APPROVE'
  }, studentToken);
  assert(approveSelf.statusCode === 403, 'Student cannot self-approve enrollment (403)');

  // ----------------------------------------------------
  // TEST 5: Servant Mina approves student for Level 1
  // ----------------------------------------------------
  console.log('\n--- Test 5: Servant Mina approves student for Level 1 ---');
  const reqListTeacher = await makeGetRequest('/api/church/hymns/requests', {}, teacherMinaToken);
  assert(reqListTeacher.statusCode === 200, 'Servant can list requests (200)');
  const foundReq = (reqListTeacher.json?.requests || []).find(r => r.id === membershipId);
  assert(Boolean(foundReq), 'Servant sees George pending request');

  const approveRes = await makePostRequest('/api/church/hymns/review', {
    membershipId,
    action: 'APPROVE',
    targetLevel: 1,
    targetRosterGroup: 'primary_choir',
    notes: 'Approved for Level 1 Novice Deacon Choir'
  }, teacherMinaToken);
  assert(approveRes.statusCode === 200, 'Servant approval returns 200');
  assert(approveRes.json?.membership?.status === 'approved', 'Membership is now approved');

  // ----------------------------------------------------
  // TEST 6: Student immediate access enforcement (Level 1 Allowed, Level 2 Forbidden)
  // ----------------------------------------------------
  console.log('\n--- Test 6: Immediate authorization enforcement for Level 1 ---');
  const hymnsL1 = await makeGetRequest('/api/church/hymns', {}, studentToken);
  assert(hymnsL1.statusCode === 200, 'Student can fetch authorized hymns (200)');
  assert(hymnsL1.json?.enrolledLevel === 1, 'Student confirmed at Level 1');
  const hasEpOro = hymnsL1.json?.items.some(h => h.id === 'ep_oro');
  assert(hasEpOro, 'Student can access Level 1 Ep-Oro');
  const hasAgios = hymnsL1.json?.items.some(h => h.id === 'agios');
  assert(!hasAgios, 'Level 2 Agios is strictly excluded from Level 1 student items');

  // Direct access to Level 2 hymn returns 403
  const directL2 = await makeGetRequest('/api/church/hymns/agios', {}, studentToken);
  assert(directL2.statusCode === 403, 'Direct access to Level 2 hymn returns 403 FORBIDDEN');
  assert(directL2.json?.error === 'HYMN_LEVEL_ACCESS_DENIED', 'Error code is HYMN_LEVEL_ACCESS_DENIED');

  // ----------------------------------------------------
  // TEST 7: Servant Mina transfers student to Level 2 (Immediate promotion)
  // ----------------------------------------------------
  console.log('\n--- Test 7: Servant transfers student to Level 2 ---');
  const transferRes = await makePostRequest('/api/church/hymns/review', {
    membershipId,
    action: 'TRANSFER',
    targetLevel: 2,
    targetRosterGroup: 'deacons_prep',
    notes: 'Mastered Level 1, promoted to Preparatory Deacons'
  }, teacherMinaToken);
  assert(transferRes.statusCode === 200, 'Transfer returns 200');
  assert(transferRes.json?.membership?.level === 2, 'New level is 2');

  // Student can now access Level 2 Agios immediately
  const hymnsL2 = await makeGetRequest('/api/church/hymns', {}, studentToken);
  assert(hymnsL2.statusCode === 200, 'Student fetches hymns as Level 2 (200)');
  assert(hymnsL2.json?.enrolledLevel === 2, 'Enrolled level is now 2');
  const hasAgiosNow = hymnsL2.json?.items.some(h => h.id === 'agios');
  assert(hasAgiosNow, 'Level 2 student can now access Agios');

  // Level 3 Pek-Thronos is still forbidden
  const directL3 = await makeGetRequest('/api/church/hymns/pek_ethronos', {}, studentToken);
  assert(directL3.statusCode === 403, 'Level 3 hymn is still forbidden for Level 2 student (403)');

  // ----------------------------------------------------
  // TEST 8: Hymns School Publishing & Version History
  // ----------------------------------------------------
  console.log('\n--- Test 8: Hymns School Publishing & Version History ---');
  const newHymnId = `test_hymn_${Date.now()}`;
  const pubHymn = await makePostRequest('/api/church/hymns', {
    id: newHymnId,
    titleAr: 'لحن تين أوأوشت (فلنسجد للثالوث القدوس)',
    titleEn: 'Ten-Oo-Osht (We Worship You)',
    titleCoptic: 'Ⲧⲉⲛⲟⲩⲱϣⲧ ⲙ̀Ⲫⲓⲱⲧ',
    level: 1,
    seasonAr: 'طقس سنوي',
    occasionTag: 'annual',
    status: 'draft',
    audioUrl: '/uploads/sample_cross_lesson_audio.mp3',
    lines: [
      { id: 1, coptic: 'Ⲧⲉⲛⲟⲩⲱϣⲧ ⲙ̀Ⲫⲓⲱⲧ ⲛⲉⲙ Ⲡ̀ϣⲏⲣⲓ', arabized: 'تين أوأوشت إمفيوت نيم بشيري', arabic: 'نسجد للآب والابن' }
    ]
  }, teacherMinaToken);
  assert(pubHymn.statusCode === 201, 'Teacher creates new hymn draft (201)');
  assert(pubHymn.json?.hymn?.status === 'draft', 'Hymn is draft');

  // Draft is hidden from students
  const studentSeeDraft = await makeGetRequest(`/api/church/hymns/${newHymnId}`, {}, studentToken);
  assert(studentSeeDraft.statusCode === 403, 'Draft hymn is hidden from students (403)');

  // Teacher publishes hymn
  const updateToPublished = await makePutRequest(`/api/church/hymns/${newHymnId}`, {
    status: 'published',
    titleAr: 'لحن تين أوأوشت المعتمد (فلنسجد للثالوث القدوس)'
  }, teacherMinaToken);
  assert(updateToPublished.statusCode === 200, 'Teacher publishes hymn (200)');
  assert(updateToPublished.json?.hymn?.version === 2, 'Version incremented to 2');
  assert(updateToPublished.json?.hymn?.history?.length === 1, 'Previous version saved in history');

  // Student can now view published Level 1 hymn
  const studentSeePub = await makeGetRequest(`/api/church/hymns/${newHymnId}`, {}, studentToken);
  assert(studentSeePub.statusCode === 200, 'Student can view published hymn (200)');

  // Teacher restores version 1
  const restoreHymn = await makePostRequest(`/api/church/hymns/${newHymnId}/restore`, {
    targetVersion: 1
  }, teacherMinaToken);
  assert(restoreHymn.statusCode === 200, 'Version restore returns 200');
  assert(restoreHymn.json?.hymn?.titleAr === 'لحن تين أوأوشت (فلنسجد للثالوث القدوس)', 'Title restored to v1 title');

  // ----------------------------------------------------
  // TEST 9: Coptic Rituals / Taxis Draft Privacy
  // ----------------------------------------------------
  console.log('\n--- Test 9: Coptic Rituals / Taxis Draft Privacy ---');
  const studentTaxis = await makeGetRequest('/api/church/taxis', {}, studentToken);
  assert(studentTaxis.statusCode === 200, 'Student can list published Taxis (200)');
  const hasDraftSacrament = studentTaxis.json?.items.some(t => t.id === 'taxis_draft_sacrament');
  assert(!hasDraftSacrament, 'Student CANNOT see taxis_draft_sacrament draft in list');

  const directDraftSacrament = await makeGetRequest('/api/church/taxis/taxis_draft_sacrament', {}, studentToken);
  assert(directDraftSacrament.statusCode === 403, 'Student direct access to draft ritual returns 403');

  // ----------------------------------------------------
  // TEST 10: Taxis Lifecycle: Create -> Review -> Publish -> Restore
  // ----------------------------------------------------
  console.log('\n--- Test 10: Taxis Lifecycle: Create -> Review -> Publish -> Restore ---');
  const newTaxisId = `taxis_test_${Date.now()}`;
  const createTaxis = await makePostRequest('/api/church/taxis', {
    id: newTaxisId,
    titleAr: 'طقس سر مسحة المرضى (صلاة القنديل العام)',
    titleEn: 'Sacrament of the Unction of the Sick',
    titleCopt: 'Ⲡⲓⲧⲁⲝⲓⲥ ⲛ̀ⲧⲉ ⲡⲓⲉⲩⲭⲉⲗⲉⲟⲛ',
    category: 'sacraments',
    audience: 'all',
    sections: [
      {
        id: 'sec_1',
        order: 1,
        titleAr: 'إيقاد القناديل السبعة وصلوات الأواشي',
        titleEn: 'Lighting the 7 Lamps & Prayers',
        priestAction: 'يصنع الكاهن ٧ فتائل من القطن النقي في طبق الزيت',
        deaconResponse: 'مرد الشماس: هللويا صلوا من أجل المرضى'
      }
    ]
  }, teacherMinaToken);
  assert(createTaxis.statusCode === 201, 'Teacher creates Taxis draft (201)');
  assert(createTaxis.json?.item?.status === 'draft', 'Status is draft');

  // Submit for review
  const submitRev = await makePostRequest(`/api/church/taxis/${newTaxisId}/submit-review`, {}, teacherMinaToken);
  assert(submitRev.statusCode === 200, 'Submit for review returns 200');
  assert(submitRev.json?.item?.status === 'under_review', 'Status is under_review');

  // Review approval
  const approveRev = await makePostRequest(`/api/church/taxis/${newTaxisId}/review`, {
    action: 'APPROVE',
    notes: 'Rites and rubrics verified against the Euchologion'
  }, teacherMinaToken);
  assert(approveRev.statusCode === 200, 'Review approval returns 200');
  assert(approveRev.json?.item?.status === 'approved', 'Status is approved');

  // Student still cannot see approved (unpublished) item
  const studentSeeApproved = await makeGetRequest(`/api/church/taxis/${newTaxisId}`, {}, studentToken);
  assert(studentSeeApproved.statusCode === 403, 'Student cannot see approved unpublished ritual (403)');

  // Publish ritual
  const pubTaxis = await makePostRequest(`/api/church/taxis/${newTaxisId}/publish`, {}, teacherMinaToken);
  assert(pubTaxis.statusCode === 200, 'Publish returns 200');
  assert(pubTaxis.json?.item?.status === 'published', 'Status is now published');

  // Student CAN now view the published ritual
  const studentSeePubTaxis = await makeGetRequest(`/api/church/taxis/${newTaxisId}`, {}, studentToken);
  assert(studentSeePubTaxis.statusCode === 200, 'Student can view published ritual (200)');
  assert(studentSeePubTaxis.json?.item?.titleAr.includes('مسحة المرضى'), 'Contains Arabic ritual title');

  // Unpublish ritual
  const unpubTaxis = await makePostRequest(`/api/church/taxis/${newTaxisId}/unpublish`, {}, teacherMinaToken);
  assert(unpubTaxis.statusCode === 200, 'Unpublish returns 200');
  assert(unpubTaxis.json?.item?.status === 'unpublished', 'Status is unpublished');

  // Student access is revoked immediately
  const studentSeeUnpub = await makeGetRequest(`/api/church/taxis/${newTaxisId}`, {}, studentToken);
  assert(studentSeeUnpub.statusCode === 403, 'Unpublished ritual is immediately forbidden to student (403)');

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
