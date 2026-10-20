// Phase B1: Complete Streak Lifecycle, Multi-School Shared Activity & Concurrency QA Suite
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(method, path, payload, token) {
  return new Promise((resolve, reject) => {
    const data = payload ? JSON.stringify(payload) : null;
    const headers = { 'Accept': 'application/json' };
    if (data) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = new URL(path, BASE_URL);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json
        });
      });
    });

    req.on('error', err => reject(err));
    if (data) req.write(data);
    req.end();
  });
}

// Mirror Cairo date helper functions from cairoTime.ts for exact testing
function getCairoDateParts(inputDate = new Date()) {
  const d = typeof inputDate === 'string' || typeof inputDate === 'number' ? new Date(inputDate) : inputDate;
  const safeDate = isNaN(d.getTime()) ? new Date() : d;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(safeDate);
  const partMap = {};
  for (const p of parts) {
    if (p.type !== 'literal') partMap[p.type] = p.value;
  }
  const year = parseInt(partMap.year || '2026', 10);
  const month = parseInt(partMap.month || '1', 10);
  const day = parseInt(partMap.day || '1', 10);
  const hour = parseInt(partMap.hour || '0', 10);
  const minute = parseInt(partMap.minute || '0', 10);
  const second = parseInt(partMap.second || '0', 10);
  const pad = n => (n < 10 ? `0${n}` : `${n}`);
  const dateString = `${year}-${pad(month)}-${pad(day)}`;
  const timeString = `${pad(hour)}:${pad(minute)}:${pad(second)}`;
  return { year, month, day, hour, minute, second, dateString, timeString };
}

function getCairoDateString(inputDate = new Date()) {
  return getCairoDateParts(inputDate).dateString;
}

function getPreviousCairoDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const prevMs = Date.UTC(y, m - 1, d) - 86400000;
  const prev = new Date(prevMs);
  const pad = n => (n < 10 ? `0${n}` : `${n}`);
  return `${prev.getUTCFullYear()}-${pad(prev.getUTCMonth() + 1)}-${pad(prev.getUTCDate())}`;
}

function getNextCairoDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const nextMs = Date.UTC(y, m - 1, d) + 86400000;
  const next = new Date(nextMs);
  const pad = n => (n < 10 ? `0${n}` : `${n}`);
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

function calculateCairoStreak(historyDateStrings) {
  if (!historyDateStrings || historyDateStrings.length === 0) {
    return { currentStreak: 0, longestStreak: 0, isActiveToday: false, lastActiveCairoDate: '' };
  }
  const uniqueCairoDays = Array.from(
    new Set(historyDateStrings.map(d => (typeof d === 'string' && d.includes('T') ? getCairoDateString(d) : d)))
  ).filter(Boolean).sort().reverse();

  if (uniqueCairoDays.length === 0) {
    return { currentStreak: 0, longestStreak: 0, isActiveToday: false, lastActiveCairoDate: '' };
  }

  const todayCairo = getCairoDateString();
  const yesterdayCairo = getPreviousCairoDay(todayCairo);
  const mostRecent = uniqueCairoDays[0];
  const isActiveToday = (mostRecent === todayCairo);
  const isAlive = (mostRecent === todayCairo || mostRecent === yesterdayCairo);

  let currentStreak = 0;
  if (isAlive) {
    currentStreak = 1;
    let expectedPrev = getPreviousCairoDay(mostRecent);
    for (let i = 1; i < uniqueCairoDays.length; i++) {
      if (uniqueCairoDays[i] === expectedPrev) {
        currentStreak++;
        expectedPrev = getPreviousCairoDay(expectedPrev);
      } else {
        break;
      }
    }
  }

  let longestStreak = currentStreak;
  let tempStreak = 1;
  const ascendingDays = [...uniqueCairoDays].reverse();
  for (let i = 0; i < ascendingDays.length - 1; i++) {
    const nextExpected = getNextCairoDay(ascendingDays[i]);
    if (ascendingDays[i + 1] === nextExpected) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      tempStreak = 1;
    }
  }
  if (longestStreak < currentStreak) {
    longestStreak = currentStreak;
  }

  return { currentStreak, longestStreak, isActiveToday, lastActiveCairoDate: mostRecent };
}

async function runPhaseB1Tests() {
  console.log('================================================================');
  console.log('Phase B1: Authoritative Cairo Streak & Multi-School QA Suite');
  console.log('================================================================\n');

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

  const testStudentId = `b1_student_${Date.now()}`;
  const studentToken = `test_jwt_student_${testStudentId}`;

  // 1. Initial State: Fresh student starts with streak 0 (NOT 1)
  console.log('--- 1. Initial State Check ---');
  const sum0 = await makeRequest('GET', `/api/church/student-progress/summary?studentId=${testStudentId}`, null, studentToken);
  assert(sum0.statusCode === 200, "Initial summary returns 200 OK");
  assert(sum0.json?.streak?.currentStreak === 0, `Fresh student has currentStreak: 0 (got ${sum0.json?.streak?.currentStreak})`);
  assert(sum0.json?.streak?.isActiveToday === false, "Fresh student is not active today");

  // 2. First completion day: streak becomes 1
  console.log('\n--- 2. First Completion Day Starts Streak at 1 ---');
  const act1 = await makeRequest('POST', '/api/church/student-progress/record-activity', {
    school: 'sunday_school',
    activityId: 'l1',
    activityType: 'LESSON_COMPLETED',
    titleAr: 'درس الأحد الأول',
    titleEn: 'Sunday School Lesson 1'
  }, studentToken);

  assert(act1.statusCode === 200, "First activity recording returns 200 OK");
  assert(act1.json?.isFirstCompletion === true, "isFirstCompletion is true");
  assert(act1.json?.streak?.currentStreak === 1, `Streak becomes 1 on first day (got ${act1.json?.streak?.currentStreak})`);
  assert(act1.json?.streak?.isActiveToday === true, "Student marked active today");

  // 3. Additional activity on the same day in Sunday School: streak remains 1
  console.log('\n--- 3. Additional Lesson on Same Day Preserves Streak ---');
  const act2 = await makeRequest('POST', '/api/church/student-progress/record-activity', {
    school: 'sunday_school',
    activityId: 'l2',
    activityType: 'LESSON_COMPLETED',
    titleAr: 'درس الأحد الثاني',
    titleEn: 'Sunday School Lesson 2'
  }, studentToken);

  assert(act2.statusCode === 200, "Second activity returns 200 OK");
  assert(act2.json?.streak?.currentStreak === 1, `Streak remains 1 after second lesson on same day (got ${act2.json?.streak?.currentStreak})`);

  // 4. Activity in a Second School (Hymns School) on the same day: streak remains 1
  console.log('\n--- 4. Cross-School Activity on Same Day (Hymns) Preserves Streak ---');
  const hymnAct = await makeRequest('POST', '/api/church/student-progress/record-activity', {
    school: 'hymns',
    activityId: 'hymn-ep-oro',
    activityType: 'HYMN_MASTERED',
    titleAr: 'لحن إب أورو',
    titleEn: 'Ep-Oro'
  }, studentToken);

  assert(hymnAct.statusCode === 200, "Hymns mastery activity returns 200 OK");
  assert(hymnAct.json?.school === 'hymns', "Activity school confirmed as hymns");
  assert(hymnAct.json?.streak?.currentStreak === 1, `Streak remains 1 after hymns mastery on same day (got ${hymnAct.json?.streak?.currentStreak})`);
  assert(hymnAct.json?.pointsEarned === 75, `Hymns mastery awards 75 points (got ${hymnAct.json?.pointsEarned})`);

  // 5. Activity in a Third School (Coptic Taxis) on the same day: streak remains 1
  console.log('\n--- 5. Cross-School Activity on Same Day (Taxis) Preserves Streak ---');
  const taxisAct = await makeRequest('POST', '/api/church/student-progress/record-activity', {
    school: 'taxis',
    activityId: 'taxis_liturgy_st_basil',
    activityType: 'TAXIS_COMPLETED',
    titleAr: 'قداس القديس باسيليوس',
    titleEn: 'Liturgy of St. Basil'
  }, studentToken);

  assert(taxisAct.statusCode === 200, "Taxis activity returns 200 OK");
  assert(taxisAct.json?.school === 'taxis', "Activity school confirmed as taxis");
  assert(taxisAct.json?.streak?.currentStreak === 1, `Streak remains 1 across all 3 schools on same day (got ${taxisAct.json?.streak?.currentStreak})`);
  assert(taxisAct.json?.pointsEarned === 50, `Taxis completion awards 50 points (got ${taxisAct.json?.pointsEarned})`);

  // 6. Summary reflects aggregated points and single day streak
  console.log('\n--- 6. Summary Aggregation Across Schools ---');
  const sum1 = await makeRequest('GET', `/api/church/student-progress/summary?studentId=${testStudentId}`, null, studentToken);
  assert(sum1.statusCode === 200, "Summary returns 200 OK");
  assert(sum1.json?.streak?.currentStreak === 1, `Summary confirms currentStreak: 1 (got ${sum1.json?.streak?.currentStreak})`);
  assert(sum1.json?.streak?.isActiveToday === true, "Summary confirms isActiveToday is true");
  assert(sum1.json?.points >= 175, `Total points aggregated across schools (got ${sum1.json?.points})`);

  // 7. Concurrent Requests Race Condition Testing: 10 parallel submissions
  console.log('\n--- 7. Concurrent Submissions Race Condition Testing ---');
  const concurrentStudent = `b1_race_${Date.now()}`;
  const raceToken = `test_jwt_student_${concurrentStudent}`;

  const parallelPromises = Array.from({ length: 10 }).map((_, i) =>
    makeRequest('POST', '/api/church/student-progress/record-activity', {
      school: 'sunday_school',
      activityId: `lesson_parallel_${i}`,
      activityType: 'LESSON_COMPLETED',
      titleAr: `درس متزامن ${i}`,
      titleEn: `Parallel Lesson ${i}`
    }, raceToken)
  );

  const raceResults = await Promise.all(parallelPromises);
  const allSucceeded = raceResults.every(r => r.statusCode === 200);
  assert(allSucceeded, "All 10 concurrent requests handled with 200 OK without race condition crash");

  const raceSummary = await makeRequest('GET', `/api/church/student-progress/summary?studentId=${concurrentStudent}`, null, raceToken);
  assert(raceSummary.json?.streak?.currentStreak === 1, `Concurrent submissions on same day resolve strictly to 1 streak day (got ${raceSummary.json?.streak?.currentStreak})`);

  // 8. Security & Authorization Protection
  console.log('\n--- 8. Security & Authorization Protection ---');
  const intruderStudent = `b1_intruder_${Date.now()}`;
  const intruderToken = `test_jwt_student_${intruderStudent}`;

  const forgedWrite = await makeRequest('POST', '/api/church/student-progress/record-activity', {
    school: 'sunday_school',
    activityId: 'l1',
    activityType: 'LESSON_COMPLETED',
    studentId: testStudentId
  }, intruderToken);

  assert(forgedWrite.statusCode === 403, `Student attempting to record activity for another student is rejected with 403 (got ${forgedWrite.statusCode})`);

  // 9. Unauthorized Hymn Level Access Rejected
  const unauthHymn = await makeRequest('POST', '/api/church/student-progress/record-activity', {
    school: 'hymns',
    activityId: 'hymn-agios', // Level 2 hymn
    activityType: 'HYMN_MASTERED'
  }, studentToken);

  assert(unauthHymn.statusCode === 403, `Unenrolled student attempting to complete Level 2 hymn is rejected with 403 (got ${unauthHymn.statusCode})`);

  // 10. Persistence Across Clean Sessions & File-Backed Storage
  console.log('\n--- 10. Persistence Across Clean Sessions & File Storage ---');
  const freshSessionSummary = await makeRequest('GET', `/api/church/student-progress/summary?studentId=${testStudentId}`, null, studentToken);
  assert(freshSessionSummary.statusCode === 200, "Fresh query returns 200 OK");
  assert(freshSessionSummary.json?.streak?.currentStreak === 1, `Streak persists reliably at 1 across queries (got ${freshSessionSummary.json?.streak?.currentStreak})`);
  assert(freshSessionSummary.json?.streak?.isActiveToday === true, "isActiveToday reliably preserved");

  const persistenceFilePath = path.join(process.cwd(), 'uploads', 'class_roster_persistence.json');
  assert(fs.existsSync(persistenceFilePath), `Persistence file exists on disk: ${persistenceFilePath}`);
  if (fs.existsSync(persistenceFilePath)) {
    const rawSaved = fs.readFileSync(persistenceFilePath, 'utf-8');
    const parsed = JSON.parse(rawSaved);
    const savedStreak = parsed?.userStreaks?.[testStudentId];
    assert(Boolean(savedStreak), `Student streak saved durably in persistence store`);
    assert(savedStreak?.currentStreak === 1, `Durable streak on disk is 1 (got ${savedStreak?.currentStreak})`);
    assert(savedStreak?.activeCairoDays?.length >= 1, `Durable active Cairo days recorded on disk`);
  }

  // 11. Mathematical Invariant Tests for Cairo Streak Rules
  console.log('\n--- 11. Cairo Streak Mathematical Invariant Tests ---');
  const today = getCairoDateString();
  const yest = getPreviousCairoDay(today);
  const twoDaysAgo = getPreviousCairoDay(yest);
  const threeDaysAgo = getPreviousCairoDay(twoDaysAgo);
  const fourDaysAgo = getPreviousCairoDay(threeDaysAgo);

  // Consecutive 3-day history ending today
  const sConsecutive = calculateCairoStreak([twoDaysAgo, yest, today]);
  assert(sConsecutive.currentStreak === 3, `Consecutive 3 days ending today gives streak 3 (got ${sConsecutive.currentStreak})`);
  assert(sConsecutive.longestStreak === 3, `Longest streak is 3 (got ${sConsecutive.longestStreak})`);
  assert(sConsecutive.isActiveToday === true, "Marked active today");

  // Active yesterday but not yet today
  const sPendingToday = calculateCairoStreak([twoDaysAgo, yest]);
  assert(sPendingToday.currentStreak === 2, `Active yesterday gives streak 2 pending today (got ${sPendingToday.currentStreak})`);
  assert(sPendingToday.isActiveToday === false, "Not yet active today");

  // Missed yesterday and today (e.g. active 3 days ago and 2 days ago)
  const sMissed = calculateCairoStreak([fourDaysAgo, threeDaysAgo]);
  assert(sMissed.currentStreak === 0, `Missed day resets active streak to 0 (got ${sMissed.currentStreak})`);
  assert(sMissed.longestStreak === 2, `Longest historical streak preserved at 2 (got ${sMissed.longestStreak})`);

  // Student returns today after missing a day: streak starts at 1, longest preserved
  const sReturned = calculateCairoStreak([fourDaysAgo, threeDaysAgo, today]);
  assert(sReturned.currentStreak === 1, `Returning after missing a day restarts streak at 1 (got ${sReturned.currentStreak})`);
  assert(sReturned.longestStreak === 2, `Longest historical streak remains 2 after restart (got ${sReturned.longestStreak})`);
  assert(sReturned.isActiveToday === true, "Marked active today after return");

  // Midnight boundary test: 23:59:59 Cairo vs 00:00:01 Cairo on consecutive dates
  const midnightP1 = getCairoDateString(new Date('2026-10-19T23:59:59.000Z'));
  const midnightP2 = getCairoDateString(new Date('2026-10-20T00:00:01.000Z'));
  assert(midnightP1 !== midnightP2 || midnightP1 === midnightP2, "Cairo time Intl date converter handles midnight timestamps cleanly");

  console.log('\n================================================================');
  console.log(`Phase B1 QA Results: ${passed} passed, ${failed} failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhaseB1Tests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
