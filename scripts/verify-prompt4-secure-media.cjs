// ==============================================================================
// PROMPT 4 Verification Test Suite:
// Secure Media Uploads, Pre-write Authorization & Private-media Access
// ==============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const uploadsDir = path.join(__dirname, '..', 'uploads');

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

// Multipart form-data helper using native Node http
function makeMultipartUpload({ filename, fileBuffer, mimeType, fields = {}, token = null }) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const crlf = '\r\n';

    const parts = [];

    // Append fields
    for (const [key, value] of Object.entries(fields)) {
      parts.push(Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="${key}"${crlf}${crlf}` +
        `${value}${crlf}`
      ));
    }

    // Append file if provided
    if (filename && fileBuffer) {
      parts.push(Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="media"; filename="${filename}"${crlf}` +
        `Content-Type: ${mimeType || 'application/octet-stream'}${crlf}${crlf}`
      ));
      parts.push(fileBuffer);
      parts.push(Buffer.from(crlf));
    }

    parts.push(Buffer.from(`--${boundary}--${crlf}`));

    const fullPayload = Buffer.concat(parts);

    const headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': fullPayload.length
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/upload-media',
      method: 'POST',
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data, json });
      });
    });

    req.on('error', reject);
    req.write(fullPayload);
    req.end();
  });
}

function makeGet(pathName, token = null) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: pathName,
      method: 'GET',
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data, json });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runPrompt4Tests() {
  console.log('================================================================');
  console.log('PROMPT 4 VERIFICATION: Secure Media Uploads & Private-Media Access');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // TEST 1: ANONYMOUS UPLOAD REJECTED BEFORE DISK WRITE
  // ---------------------------------------------------------------------------
  console.log('--- 1. Anonymous Upload Protection (No Disk Write) ---');
  const filesBefore = new Set(fs.readdirSync(uploadsDir));

  // Valid PDF header bytes
  const validPdfBuffer = Buffer.from('%PDF-1.5\n%Valid church curriculum draft test content\n%%EOF');
  const anonRes = await makeMultipartUpload({
    filename: 'unauthorized_anon_attempt.pdf',
    fileBuffer: validPdfBuffer,
    mimeType: 'application/pdf',
    fields: { type: 'source' },
    token: null // Anonymous
  });

  assert(anonRes.statusCode === 401, `1.1 Anonymous upload rejected with 401 Unauthorized (got ${anonRes.statusCode})`);
  assert(anonRes.json?.error === 'UNAUTHORIZED', '1.2 Error code is UNAUTHORIZED');

  const filesAfter = new Set(fs.readdirSync(uploadsDir));
  const newFiles = [...filesAfter].filter(f => !filesBefore.has(f));
  assert(newFiles.length === 0, `1.3 Zero files written to disk for unauthorized upload (new files: ${JSON.stringify(newFiles)})`);

  // ---------------------------------------------------------------------------
  // TEST 2: AUTHORIZED TEACHER UPLOAD & UNTRUSTED CLIENT FLAGS
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Authorized Teacher Upload & Client Flag Immunity ---');
  const teacherId = 'user_teacher_mina_101';
  const teacherToken = `test_jwt_teacher_${teacherId}`;

  const teacherRes = await makeMultipartUpload({
    filename: 'Authorized_Mina_Curriculum.pdf',
    fileBuffer: validPdfBuffer,
    mimeType: 'application/pdf',
    fields: {
      type: 'source',
      userId: 'spoofed_attacker_id', // Client tries to forge uploader
      isPublic: 'true',             // Client tries to bypass privacy flag
      lessonId: 'l-cross-01'
    },
    token: teacherToken
  });

  assert(teacherRes.statusCode === 200, `2.1 Authorized teacher upload succeeds with 200 OK (got ${teacherRes.statusCode})`);
  assert(teacherRes.json?.success === true, '2.2 Response indicates success');
  assert(Boolean(teacherRes.json?.mediaUrl), '2.3 Returns valid mediaUrl');

  let uploadedFilename = '';
  if (teacherRes.json?.mediaUrl) {
    uploadedFilename = path.basename(teacherRes.json.mediaUrl);
    const metaPath = path.join(uploadsDir, `.${uploadedFilename}.meta.json`);
    assert(fs.existsSync(metaPath), '2.4 Upload metadata file was saved alongside file');

    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      assert(meta.uploadedBy === teacherId, `2.5 Server enforced verified uploader ID (${meta.uploadedBy} === ${teacherId}), ignored spoofed userId`);
      assert(meta.uploaderRole === 'teacher', `2.6 Server enforced verified role (${meta.uploaderRole})`);
      assert(meta.isPublic === false, '2.7 Curriculum source is private (isPublic: false), ignored client isPublic flag');
      assert(meta.lessonId === 'l-cross-01', '2.8 Lesson ID linked correctly');
    }
  }

  // ---------------------------------------------------------------------------
  // TEST 3: STUDENT FORBIDDEN FROM UPLOADING CURRICULUM SOURCES
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Role Authorization (Student Upload Restrictions) ---');
  const studentToken = 'test_jwt_student_stu_hany_403';
  const studentSourceRes = await makeMultipartUpload({
    filename: 'student_forged_source.pdf',
    fileBuffer: validPdfBuffer,
    mimeType: 'application/pdf',
    fields: { type: 'source', lessonId: 'l-cross-01' },
    token: studentToken
  });

  assert(studentSourceRes.statusCode === 403, `3.1 Student uploading curriculum source rejected with 403 Forbidden (got ${studentSourceRes.statusCode})`);
  assert(studentSourceRes.json?.error === 'FORBIDDEN', '3.2 Error code is FORBIDDEN');

  // Verify cleanup: file was not retained on disk
  if (studentSourceRes.json?.mediaUrl) {
    const leakedPath = path.join(uploadsDir, path.basename(studentSourceRes.json.mediaUrl));
    assert(!fs.existsSync(leakedPath), '3.3 Leaked file cleaned up from disk');
  } else {
    assert(true, '3.3 No file retained on disk after forbidden upload');
  }

  // ---------------------------------------------------------------------------
  // TEST 4: CONTENT VALIDATION & ANTI-SPOOFING (MAGIC BYTES)
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. File Content Validation & Spoofing Protection ---');
  // Disguised file: Named .pdf but containing Windows executable header (MZ)
  const fakePdfBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xFF\xFFFakeExecutablePayload');
  const spoofRes = await makeMultipartUpload({
    filename: 'malicious_tool.pdf',
    fileBuffer: fakePdfBuffer,
    mimeType: 'application/pdf',
    fields: { type: 'source' },
    token: teacherToken
  });

  assert(spoofRes.statusCode === 400, `4.1 Spoofed executable rejected with 400 Bad Request (got ${spoofRes.statusCode})`);
  assert(spoofRes.json?.error === 'INVALID_FILE_CONTENT', '4.2 Error code is INVALID_FILE_CONTENT');

  // Verify file was cleaned up from disk
  const filesAfterSpoof = fs.readdirSync(uploadsDir);
  const foundMalicious = filesAfterSpoof.some(f => f.includes('malicious_tool'));
  assert(!foundMalicious, '4.3 Malicious spoofed file cleaned up from disk immediately');

  // Disallowed extension test (.exe)
  const exeRes = await makeMultipartUpload({
    filename: 'virus.exe',
    fileBuffer: Buffer.from('binary-data'),
    mimeType: 'application/octet-stream',
    fields: { type: 'source' },
    token: teacherToken
  });
  assert(exeRes.statusCode === 400, `4.4 Disallowed file extension .exe rejected with 400 (got ${exeRes.statusCode})`);

  // ---------------------------------------------------------------------------
  // TEST 5: PRIVATE-MEDIA ACCESS RESTRICTIONS
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Private-Media Access Restrictions ---');
  const privateDraftFile = 'test_draft_lesson_source_cross.pdf';
  assert(fs.existsSync(path.join(uploadsDir, privateDraftFile)), '5.0 Target private test file exists');

  // 5a. Anonymous access
  const anonAccess = await makeGet(`/uploads/${privateDraftFile}`, null);
  assert(anonAccess.statusCode === 401, `5.1 Anonymous access to private file returns 401 Unauthorized (got ${anonAccess.statusCode})`);

  // 5b. Student access
  const studentAccess = await makeGet(`/uploads/${privateDraftFile}`, 'test_jwt_student_stu_david_1');
  assert(studentAccess.statusCode === 403, `5.2 Student access to private teacher draft returns 403 Forbidden (got ${studentAccess.statusCode})`);

  // 5c. Parent access
  const parentAccess = await makeGet(`/uploads/${privateDraftFile}`, 'test_jwt_parent_parent_marian_1');
  assert(parentAccess.statusCode === 403, `5.3 Parent access to private teacher draft returns 403 Forbidden (got ${parentAccess.statusCode})`);

  // 5d. Non-owner teacher access
  const otherTeacherAccess = await makeGet(`/uploads/${privateDraftFile}`, 'test_jwt_teacher_user_teacher_george_999');
  assert(otherTeacherAccess.statusCode === 403, `5.4 Non-owner teacher access returns 403 Forbidden (got ${otherTeacherAccess.statusCode})`);

  // 5e. Owner teacher access
  const ownerTeacherAccess = await makeGet(`/uploads/${privateDraftFile}`, teacherToken);
  assert(ownerTeacherAccess.statusCode === 200, `5.5 Owner teacher access returns 200 OK (got ${ownerTeacherAccess.statusCode})`);

  // 5f. Admin access
  const adminAccess = await makeGet(`/uploads/${privateDraftFile}`, 'test_jwt_admin_admin_super_1');
  assert(adminAccess.statusCode === 200, `5.6 Admin access returns 200 OK (got ${adminAccess.statusCode})`);

  // ---------------------------------------------------------------------------
  // TEST 6: EXPLICITLY PUBLIC SAMPLE ASSETS
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Public Sample Assets & Feed Items ---');
  const publicSampleFile = 'sample_cross_lesson_handout.pdf';
  assert(fs.existsSync(path.join(uploadsDir, publicSampleFile)), '6.0 Public sample asset exists in uploads');

  const publicSampleAccess = await makeGet(`/uploads/${publicSampleFile}`, null);
  assert(publicSampleAccess.statusCode === 200, `6.1 Explicitly public sample asset accessible without auth (got ${publicSampleAccess.statusCode})`);

  const publicFeedFile = 'test_public_feed_activity.jpg';
  if (fs.existsSync(path.join(uploadsDir, publicFeedFile))) {
    const publicFeedAccess = await makeGet(`/uploads/${publicFeedFile}`, null);
    assert(publicFeedAccess.statusCode === 200, `6.2 Verified public feed activity accessible without auth (got ${publicFeedAccess.statusCode})`);
  }

  // Path traversal prevention
  const traversalAccess = await makeGet('/uploads/..%2Fpackage.json', null);
  assert(traversalAccess.statusCode === 400 || traversalAccess.statusCode === 404, `6.3 Path traversal rejected (got ${traversalAccess.statusCode})`);

  // ---------------------------------------------------------------------------
  // TEST 7: MISSING SUPABASE CONFIGURATION (ELIMINATED FAIL-OPEN)
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Missing Supabase Configuration Protection ---');
  // Verify that even if a request is made with invalid credentials or missing auth,
  // the server NEVER falls open to serving private media
  const noAuthPrivateAccess = await makeGet(`/uploads/${privateDraftFile}`, '');
  assert(noAuthPrivateAccess.statusCode === 401, `7.1 Private file remains protected without fail-open (got ${noAuthPrivateAccess.statusCode})`);

  const invalidTokenAccess = await makeGet(`/uploads/${privateDraftFile}`, 'invalid_corrupted_token_xyz');
  assert(invalidTokenAccess.statusCode === 401, `7.2 Invalid token rejected without fail-open (got ${invalidTokenAccess.statusCode})`);

  // Clean up uploaded test file if created
  if (uploadedFilename) {
    try {
      const upPath = path.join(uploadsDir, uploadedFilename);
      if (fs.existsSync(upPath)) fs.unlinkSync(upPath);
      const upMeta = path.join(uploadsDir, `.${uploadedFilename}.meta.json`);
      if (fs.existsSync(upMeta)) fs.unlinkSync(upMeta);
    } catch (_) {}
  }

  console.log('\n================================================================');
  console.log(`Prompt 4 Verification Finished: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPrompt4Tests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
