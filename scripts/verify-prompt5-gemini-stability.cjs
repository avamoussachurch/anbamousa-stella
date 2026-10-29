// ==============================================================================
// PROMPT 5 Verification Test Suite:
// Stabilize Gemini Integration, Auth, Input Validation & Provider Error Handling
// ==============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
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

function makeRequest({ pathName, method = 'POST', headers = {}, body = null, isJson = true }) {
  return new Promise((resolve, reject) => {
    let payload = body;
    const reqHeaders = { ...headers };

    if (body && isJson && typeof body === 'object') {
      payload = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    } else if (body && Buffer.isBuffer(body)) {
      reqHeaders['Content-Length'] = body.length;
    }

    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: pathName,
      method,
      headers: reqHeaders
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
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function makeMultipart({ pathName, filename, fileBuffer, mimeType, fields = {}, token = null }) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const crlf = '\r\n';
    const parts = [];

    for (const [key, value] of Object.entries(fields)) {
      parts.push(Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="${key}"${crlf}${crlf}` +
        `${value}${crlf}`
      ));
    }

    if (filename && fileBuffer) {
      const fieldName = (pathName.includes('transcribe') || pathName.includes('generate-lesson') || pathName.includes('verify-verse-recital')) ? 'audio' : 'file';
      parts.push(Buffer.from(
        `--${boundary}${crlf}` +
        `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"${crlf}` +
        `Content-Type: ${mimeType || 'audio/webm'}${crlf}${crlf}`
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
      path: pathName,
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

async function runPrompt5Tests() {
  console.log('================================================================');
  console.log('PROMPT 5 VERIFICATION: Stabilize Gemini Backend Integration');
  console.log('================================================================\n');

  const teacherToken = 'test_jwt_teacher_mina_101';
  const studentToken = 'test_jwt_student_peter_202';

  // ---------------------------------------------------------------------------
  // 1. BILLABLE OPERATION AUTHENTICATION & AUTHORIZATION
  // ---------------------------------------------------------------------------
  console.log('--- 1. Billable Operation Authentication & Role Authorization ---');

  // 1.1 Anonymous request to /api/church/transcribe rejected
  const anonTranscribe = await makeRequest({
    pathName: '/api/church/transcribe',
    body: {}
  });
  assert(anonTranscribe.statusCode === 401, `1.1 Anonymous transcribe rejected with 401 Unauthorized (got ${anonTranscribe.statusCode})`);
  assert(anonTranscribe.json?.error === 'UNAUTHORIZED', '1.2 Anonymous transcribe error is UNAUTHORIZED');

  // 1.2 Anonymous request to /api/church/generate-tts rejected
  const anonTts = await makeRequest({
    pathName: '/api/church/generate-tts',
    body: { text: "Holy Holy Holy", lessonId: "l-1" }
  });
  assert(anonTts.statusCode === 401, `1.3 Anonymous generate-tts rejected with 401 Unauthorized (got ${anonTts.statusCode})`);

  // 1.3 Anonymous request to /api/church/generate-lesson-pipeline rejected
  const anonGen = await makeRequest({
    pathName: '/api/church/generate-lesson-pipeline',
    body: { lessonId: "l-1", draftVersionId: "v-1" }
  });
  assert(anonGen.statusCode === 401, `1.4 Anonymous generate-lesson-pipeline rejected with 401 Unauthorized (got ${anonGen.statusCode})`);

  // 1.4 Student role forbidden on teacher-only billable endpoints
  const studentTranscribe = await makeRequest({
    pathName: '/api/church/transcribe',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: {}
  });
  assert(studentTranscribe.statusCode === 403, `1.5 Student role forbidden on /api/church/transcribe with 403 (got ${studentTranscribe.statusCode})`);
  assert(studentTranscribe.json?.error === 'FORBIDDEN', '1.6 Student error code is FORBIDDEN');

  const studentTts = await makeRequest({
    pathName: '/api/church/generate-tts',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: { text: "Holy Holy Holy", lessonId: "l-1" }
  });
  assert(studentTts.statusCode === 403, `1.7 Student role forbidden on /api/church/generate-tts with 403 (got ${studentTts.statusCode})`);

  const studentExtract = await makeRequest({
    pathName: '/api/church/extract-source',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: { sourceText: "Sample lesson context" }
  });
  assert(studentExtract.statusCode === 403, `1.8 Student role forbidden on /api/church/extract-source with 403 (got ${studentExtract.statusCode})`);

  // ---------------------------------------------------------------------------
  // 2. SERVER-AUTHORITATIVE APPROVAL & OWNERSHIP (ZERO TRUST FOR isApproved)
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Server-Authoritative Approval & Ownership (Zero Client Trust) ---');

  // 2.1 Client sends isApproved: true on an unapproved draft -> server rejects with 403 CONTENT_NOT_APPROVED
  const bypassAttempt = await makeRequest({
    pathName: '/api/church/generate-tts',
    headers: { Authorization: `Bearer ${teacherToken}` },
    body: {
      lessonId: 'lesson_unapproved_draft_99',
      versionId: 'ver_draft_99',
      isApproved: true, // Client attempts bypass
      script: 'Welcome children to today Sunday School lesson on the Coptic Apostles.'
    }
  });
  assert(bypassAttempt.statusCode === 403, `2.1 Client isApproved bypass rejected with 403 (got ${bypassAttempt.statusCode})`);
  assert(bypassAttempt.json?.error === 'CONTENT_NOT_APPROVED', '2.2 Error code is CONTENT_NOT_APPROVED');
  assert(bypassAttempt.json?.message?.includes('approved and verified'), '2.3 Error message explicitly requires verified server approval');

  // 2.2 Teacher ownership verification: Teacher Mina tries to generate TTS for Teacher Fadi's unapproved draft
  const otherTeacherToken = 'test_jwt_teacher_other_fadi_999';
  const crossTeacherAttempt = await makeRequest({
    pathName: '/api/church/generate-tts',
    headers: { Authorization: `Bearer ${otherTeacherToken}` },
    body: {
      lessonId: 'l-cross-01',
      versionId: 'v-cross-draft',
      isApproved: true,
      text: 'Trying to generate narration for another servant draft'
    }
  });
  assert(crossTeacherAttempt.statusCode === 403, `2.4 Non-owner teacher blocked from generating TTS with 403 (got ${crossTeacherAttempt.statusCode})`);

  // ---------------------------------------------------------------------------
  // 3. INPUT VALIDATION & BOUNDED LIMITS
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Input Validation & Bounded Limits ---');

  // 3.1 Extract-source missing all content (no file and no sourceText)
  const emptyExtract = await makeRequest({
    pathName: '/api/church/extract-source',
    headers: { Authorization: `Bearer ${teacherToken}` },
    body: {}
  });
  assert(emptyExtract.statusCode === 400, `3.1 Empty extract-source rejected with 400 (got ${emptyExtract.statusCode})`);
  assert(emptyExtract.json?.error === 'INVALID_INPUT', '3.2 Error code is INVALID_INPUT');

  // 3.2 Generate-tts missing text or script
  const emptyTts = await makeRequest({
    pathName: '/api/church/generate-tts',
    headers: { Authorization: `Bearer ${teacherToken}` },
    body: { lessonId: 'l-1' }
  });
  assert(emptyTts.statusCode === 400, `3.3 Empty generate-tts text rejected with 400 (got ${emptyTts.statusCode})`);
  assert(emptyTts.json?.error === 'INVALID_INPUT', '3.4 Error code is INVALID_INPUT');

  // 3.3 Grade reflection missing reflectionText
  const emptyReflection = await makeRequest({
    pathName: '/api/grade-reflection',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: { reflectionText: "   " }
  });
  assert(emptyReflection.statusCode === 400, `3.5 Empty grade-reflection rejected with 400 (got ${emptyReflection.statusCode})`);
  assert(emptyReflection.json?.error === 'INVALID_INPUT', '3.6 Error code is INVALID_INPUT');

  // 3.4 Reflection text exceeding 5,000 characters limit
  const hugeText = 'A'.repeat(5050);
  const oversizedReflection = await makeRequest({
    pathName: '/api/grade-reflection',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: { reflectionText: hugeText }
  });
  assert(oversizedReflection.statusCode === 413, `3.7 Oversized reflection text rejected with 413 (got ${oversizedReflection.statusCode})`);
  assert(oversizedReflection.json?.error === 'INPUT_TOO_LARGE', '3.8 Error code is INPUT_TOO_LARGE');

  // 3.5 Verify-verse-recital missing targetVerse
  const emptyVerse = await makeRequest({
    pathName: '/api/verify-verse-recital',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: { targetVerse: "" }
  });
  assert(emptyVerse.statusCode === 400, `3.9 Empty targetVerse rejected with 400 (got ${emptyVerse.statusCode})`);
  assert(emptyVerse.json?.error === 'INVALID_INPUT', '3.10 Error code is INVALID_INPUT');

  // 3.6 Verify-verse-recital missing both audio and transcript
  const noAudioNoTranscript = await makeRequest({
    pathName: '/api/verify-verse-recital',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: { targetVerse: "John 1:1 In the beginning was the Word" }
  });
  assert(noAudioNoTranscript.statusCode === 400, `3.11 Missing audio & transcript rejected with 400 (got ${noAudioNoTranscript.statusCode})`);
  assert(noAudioNoTranscript.json?.error === 'INVALID_INPUT', '3.12 Error code is INVALID_INPUT');

  // 3.7 Regenerate-section missing section or teacherComment
  const emptyRegen = await makeRequest({
    pathName: '/api/church/regenerate-section',
    headers: { Authorization: `Bearer ${teacherToken}` },
    body: { section: { titleEn: "History" }, teacherComment: "" }
  });
  assert(emptyRegen.statusCode === 400, `3.13 Empty teacherComment on section regeneration rejected with 400 (got ${emptyRegen.statusCode})`);
  assert(emptyRegen.json?.error === 'INVALID_INPUT', '3.14 Error code is INVALID_INPUT');

  // ---------------------------------------------------------------------------
  // 4. RATE LIMITING & ABUSE PROTECTION
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Rate Limiting Protection ---');
  // Rapid requests from a specific user ID to test rate limiting
  const rateLimitUserToken = `test_jwt_teacher_spam_burst_${Date.now()}`;
  let hitRateLimit = false;
  let rateLimitResponse = null;

  for (let i = 0; i < 35; i++) {
    const res = await makeRequest({
      pathName: '/api/church/extract-source',
      headers: { Authorization: `Bearer ${rateLimitUserToken}` },
      body: { sourceText: "Valid source text testing the server rate limiter." }
    });
    if (res.statusCode === 429) {
      hitRateLimit = true;
      rateLimitResponse = res;
      break;
    }
  }

  assert(hitRateLimit === true, '4.1 Rate limiter triggered with 429 Too Many Requests after burst');
  assert(rateLimitResponse?.json?.error === 'RATE_LIMIT_EXCEEDED', '4.2 Error code is RATE_LIMIT_EXCEEDED');
  assert(rateLimitResponse?.json?.message?.includes('wait'), '4.3 Error message instructs caller to wait');

  // ---------------------------------------------------------------------------
  // 5. PREDICTABLE ERROR HANDLING (NO FALSE SUCCESS OR CRASHES)
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Predictable Error Handling & No False Success ---');

  // 5.1 Unsupported model / provider failure handling
  // Verify that server does not return false success 200 when backend AI processing is ungrounded or failing
  const validVerseInput = {
    targetVerse: "For God so loved the world that He gave His only begotten Son",
    transcript: "For God so loved the world"
  };
  const verseCall = await makeRequest({
    pathName: '/api/verify-verse-recital',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: validVerseInput
  });
  assert([200, 502, 503, 504].includes(verseCall.statusCode), `5.1 AI endpoint handled predictably with status ${verseCall.statusCode} (${verseCall.json?.error || 'SUCCESS'}) without crash`);
  assert(verseCall.statusCode !== 200 || typeof verseCall.json?.accuracyPercentage === 'number', '5.2 Success response returns valid schema with accuracy percentage');

  // 5.2 Server remains healthy and alive after all error tests
  const healthCheck = await makeRequest({
    pathName: '/api/church/published-lessons',
    method: 'GET'
  });
  assert(healthCheck.statusCode === 200, `5.3 Server dev process remains robust and responsive (status ${healthCheck.statusCode})`);

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`PROMPT 5 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPrompt5Tests().catch(err => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
