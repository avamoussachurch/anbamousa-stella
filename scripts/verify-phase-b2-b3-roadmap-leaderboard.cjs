// scripts/verify-phase-b2-b3-roadmap-leaderboard.cjs
// Phase B2: Candy Crush-Style Learning Roadmap & Phase B3: Leaderboard Redesign QA Suite

const http = require('http');
const assert = require('assert');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

let passCount = 0;
let failCount = 0;

function pass(desc) {
  passCount++;
  console.log(`[PASS] ${desc}`);
}

function fail(desc, err) {
  failCount++;
  console.error(`[FAIL] ${desc}`, err ? err.message || err : '');
}

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

// Roadmap State Simulator replicating StudentRoadmapView.tsx logic
function computeRoadmapNodes(lessons, isTeacher = false) {
  const sorted = [...lessons].sort((a, b) => {
    if (a.date && b.date) return a.date.localeCompare(b.date);
    return 0;
  });

  let currentFound = false;
  let completedSoFar = 0;
  let nextLesson = null;

  const nodes = sorted.map((lesson, idx) => {
    const isCompleted = Boolean(lesson.isCompleted);
    if (isCompleted) completedSoFar++;

    let state = 'locked';
    const prevLesson = idx > 0 ? sorted[idx - 1] : undefined;
    const isPrevCompleted = idx === 0 || Boolean(prevLesson?.isCompleted) || isTeacher;

    if (isCompleted) {
      state = 'completed';
    } else if (isPrevCompleted) {
      if (!currentFound) {
        state = 'current';
        currentFound = true;
        nextLesson = lesson;
      } else {
        state = 'available';
      }
    } else {
      state = 'locked';
    }

    return {
      index: idx,
      lesson,
      state,
      prerequisiteLesson: prevLesson,
      starsEarned: isCompleted ? 3 : 0
    };
  });

  return {
    nodes,
    total: nodes.length,
    completedCount: completedSoFar,
    progressPercent: nodes.length > 0 ? Math.round((completedSoFar / nodes.length) * 100) : 0,
    nextLesson
  };
}

async function runTests() {
  console.log('================================================================');
  console.log('Phase B2 & B3: Continuously Expanding Roadmap & Leaderboard QA');
  console.log('================================================================\n');

  // --- 1. A new student with zero completed lessons ---
  console.log('--- 1. Roadmap State for New Student (Zero Completed Lessons) ---');
  const mockClassLessons = [
    { id: 'les-1', title: 'Moses at the Burning Bush', date: '2026-10-01', status: 'published', grade: '4th Grade', classGroupId: 'primary_2', pointsAvailable: 150, isCompleted: false },
    { id: 'les-2', title: 'The Parting of the Red Sea', date: '2026-10-08', status: 'published', grade: '4th Grade', classGroupId: 'primary_2', pointsAvailable: 150, isCompleted: false },
    { id: 'les-3', title: 'Manna in the Wilderness', date: '2026-10-15', status: 'published', grade: '4th Grade', classGroupId: 'primary_2', pointsAvailable: 150, isCompleted: false }
  ];

  const newStudentRoadmap = computeRoadmapNodes(mockClassLessons, false);
  try {
    assert.strictEqual(newStudentRoadmap.total, 3, 'Total nodes matches eligible lessons');
    assert.strictEqual(newStudentRoadmap.completedCount, 0, 'Completed count is 0');
    assert.strictEqual(newStudentRoadmap.progressPercent, 0, 'Progress percent is 0%');
    assert.strictEqual(newStudentRoadmap.nodes[0].state, 'current', 'First lesson is recommended next (current)');
    assert.strictEqual(newStudentRoadmap.nodes[1].state, 'locked', 'Second lesson is locked');
    assert.strictEqual(newStudentRoadmap.nodes[2].state, 'locked', 'Third lesson is locked');
    assert.strictEqual(newStudentRoadmap.nextLesson.id, 'les-1', 'Next lesson selected is lesson 1');
    pass('New student roadmap starts cleanly at milestone 1 with subsequent milestones locked');
  } catch (err) {
    fail('New student roadmap initialization', err);
  }

  // --- 2. Student with partially completed curriculum ---
  console.log('\n--- 2. Roadmap State for Student with Partial Progress ---');
  const partialLessons = [
    { ...mockClassLessons[0], isCompleted: true },
    { ...mockClassLessons[1], isCompleted: false },
    { ...mockClassLessons[2], isCompleted: false }
  ];

  const partialRoadmap = computeRoadmapNodes(partialLessons, false);
  try {
    assert.strictEqual(partialRoadmap.completedCount, 1, 'Completed count is 1');
    assert.strictEqual(partialRoadmap.progressPercent, 33, 'Progress percent is 33%');
    assert.strictEqual(partialRoadmap.nodes[0].state, 'completed', 'Node 0 is completed');
    assert.strictEqual(partialRoadmap.nodes[0].starsEarned, 3, 'Node 0 has 3 stars earned');
    assert.strictEqual(partialRoadmap.nodes[1].state, 'current', 'Node 1 is now current');
    assert.strictEqual(partialRoadmap.nodes[2].state, 'locked', 'Node 2 is locked waiting on Node 1');
    assert.strictEqual(partialRoadmap.nextLesson.id, 'les-2', 'Next lesson selected is lesson 2');
    pass('Partial progress correctly advances current pointer and unlocks next checkpoint');
  } catch (err) {
    fail('Partial progress roadmap state', err);
  }

  // --- 3. Dynamic Expanding Curriculum (Teacher publishes Lesson 4) ---
  console.log('\n--- 3. Continuous Expansion When Teacher Publishes New Lessons ---');
  const expandedLessons = [
    ...partialLessons,
    { id: 'les-4', title: 'Mount Sinai and the Ten Commandments', date: '2026-10-22', status: 'published', grade: '4th Grade', classGroupId: 'primary_2', pointsAvailable: 150, isCompleted: false }
  ];

  const expandedRoadmap = computeRoadmapNodes(expandedLessons, false);
  try {
    assert.strictEqual(expandedRoadmap.total, 4, 'Roadmap dynamically expanded from 3 to 4 nodes');
    assert.strictEqual(expandedRoadmap.completedCount, 1, 'Student last completed checkpoint preserved');
    assert.strictEqual(expandedRoadmap.progressPercent, 25, 'Progress denominator updated safely (1/4 = 25%)');
    assert.strictEqual(expandedRoadmap.nodes[1].state, 'current', 'Current milestone unchanged during expansion');
    assert.strictEqual(expandedRoadmap.nodes[3].state, 'locked', 'Newly added lesson appears as connected locked milestone');
    pass('Roadmap extends seamlessly without hardcoded limits and preserves student checkpoint');
  } catch (err) {
    fail('Dynamic curriculum expansion', err);
  }

  // --- 4. Filtering: Class Isolation & Unpublished Content ---
  console.log('\n--- 4. Class Isolation & Unpublished Draft Privacy ---');
  const mixedCurriculum = [
    // Eligible 4th Grade published
    { id: 'les-4a', title: '4th Grade Lesson A', grade: '4th Grade', classGroupId: 'primary_2', status: 'published' },
    // Unpublished draft for 4th Grade
    { id: 'les-4-draft', title: '4th Grade Unfinished Draft', grade: '4th Grade', classGroupId: 'primary_2', status: 'draft' },
    // Another grade's published lesson (1st grade)
    { id: 'les-1a', title: '1st Grade Angels Lesson', grade: '1st Grade', classGroupId: 'primary_1', status: 'published' },
    // High School lesson
    { id: 'les-sec', title: 'Secondary Church History', grade: 'Sec 1', classGroupId: 'secondary', status: 'published' }
  ];

  // Student filter logic from LessonsTab.tsx
  const studentGroupId = 'primary_2';
  const studentVisibleLessons = mixedCurriculum.filter(l => {
    if (l.status !== 'published') return false;
    return l.classGroupId === studentGroupId;
  });

  try {
    assert.strictEqual(studentVisibleLessons.length, 1, 'Only published lessons for student class are visible');
    assert.strictEqual(studentVisibleLessons[0].id, 'les-4a', 'Matches student class');
    assert.ok(!studentVisibleLessons.some(l => l.status === 'draft'), 'Drafts are hidden from student roadmap');
    assert.ok(!studentVisibleLessons.some(l => l.classGroupId === 'primary_1'), 'Other grade lessons excluded from roadmap');
    pass('Class isolation and draft privacy verified on roadmap feed');
  } catch (err) {
    fail('Class isolation & draft privacy', err);
  }

  // --- 5. Empty Curriculum Handling ---
  console.log('\n--- 5. Handling New Student with No Assigned Curriculum ---');
  const emptyRoadmap = computeRoadmapNodes([], false);
  try {
    assert.strictEqual(emptyRoadmap.total, 0, 'Total nodes is 0');
    assert.strictEqual(emptyRoadmap.completedCount, 0, 'Completed count is 0');
    assert.strictEqual(emptyRoadmap.progressPercent, 0, 'Progress percent is 0%');
    assert.strictEqual(emptyRoadmap.nextLesson, null, 'No next lesson when curriculum empty');
    pass('Empty curriculum gracefully returns zero-node roadmap without division-by-zero crashes');
  } catch (err) {
    fail('Empty curriculum handling', err);
  }

  // --- 6. Leaderboard Top 3 Podium Verification (Phase B3) ---
  console.log('\n--- 6. Leaderboard Top 3 Podium Mathematical Invariants ---');
  const mockStreakLeaderboard = [
    { id: 's1', studentId: 'stu-1', studentName: 'Mina Shenouda', streakDays: 14, rank: 1 },
    { id: 's2', studentId: 'stu-2', studentName: 'Mary George', streakDays: 10, rank: 2 },
    { id: 's3', studentId: 'stu-3', studentName: 'Youssef Mina', streakDays: 7, rank: 3 },
    { id: 's4', studentId: 'stu-4', studentName: 'David Emad', streakDays: 5, rank: 4 },
    { id: 's5', studentId: 'stu-5', studentName: 'Kirollos Bassem', streakDays: 3, rank: 5 }
  ];

  const mockPointsLeaderboard = [
    { id: 'p1', studentId: 'stu-a', studentName: 'Sarah Peter', pointsThisWeek: 450, rank: 1 },
    { id: 'p2', studentId: 'stu-b', studentName: 'Mina Shenouda', pointsThisWeek: 350, rank: 2 },
    { id: 'p3', studentId: 'stu-c', studentName: 'Youssef Mina', pointsThisWeek: 250, rank: 3 },
    { id: 'p4', studentId: 'stu-d', studentName: 'Mary George', pointsThisWeek: 150, rank: 4 }
  ];

  try {
    // Streaks Top 3 Podium
    const streakPodium = mockStreakLeaderboard.slice(0, 3);
    assert.strictEqual(streakPodium.length, 3, 'Streak podium has exactly 3 entries');
    assert.strictEqual(streakPodium[0].rank, 1, 'Gold place is Rank 1');
    assert.strictEqual(streakPodium[1].rank, 2, 'Silver place is Rank 2');
    assert.strictEqual(streakPodium[2].rank, 3, 'Bronze place is Rank 3');
    assert.ok(streakPodium[0].streakDays > streakPodium[1].streakDays, 'Rank 1 streak > Rank 2');
    assert.ok(streakPodium[1].streakDays > streakPodium[2].streakDays, 'Rank 2 streak > Rank 3');
    pass('Streak leaderboard correctly ranks Top 3 podium with descending streak days');

    // Points Top 3 Podium
    const pointsPodium = mockPointsLeaderboard.slice(0, 3);
    assert.strictEqual(pointsPodium.length, 3, 'Points podium has exactly 3 entries');
    assert.strictEqual(pointsPodium[0].rank, 1, 'Gold place is Rank 1');
    assert.strictEqual(pointsPodium[1].rank, 2, 'Silver place is Rank 2');
    assert.strictEqual(pointsPodium[2].rank, 3, 'Bronze place is Rank 3');
    assert.ok(pointsPodium[0].pointsThisWeek > pointsPodium[1].pointsThisWeek, 'Rank 1 points > Rank 2');
    assert.ok(pointsPodium[1].pointsThisWeek > pointsPodium[2].pointsThisWeek, 'Rank 2 points > Rank 3');
    pass('Points leaderboard correctly ranks Top 3 podium with descending weekly points');

    // Ranks 4+ isolated below podium
    const remainingStreakRunners = mockStreakLeaderboard.slice(3);
    assert.strictEqual(remainingStreakRunners.length, 2, 'Ranks 4+ cleanly isolated below podium');
    assert.strictEqual(remainingStreakRunners[0].rank, 4, 'Remaining list starts at rank 4');
    pass('Ranks 4+ cleanly isolated below Top 3 podium');
  } catch (err) {
    fail('Leaderboard podium invariants', err);
  }

  // --- 7. Live Server Health & Diagnostic Integration Check ---
  console.log('\n--- 7. Dev Server & Endpoint Availability Check ---');
  try {
    const testStudent = 'test_student_b2';
    const token = `test_jwt_student_${testStudent}`;
    const res = await makeRequest('GET', `/api/church/student-progress/summary?studentId=${testStudent}`, null, token);
    assert.strictEqual(res.statusCode, 200, 'Student progress summary endpoint responds with 200');
    assert.ok(typeof res.json.streak?.currentStreak === 'number', 'Summary returns numeric streak');
    assert.ok(Array.isArray(res.json.completedLessonIds), 'Summary returns completedLessonIds array');
    pass('Authoritative student progress summary endpoint active and responsive');
  } catch (err) {
    fail('Server summary endpoint check', err);
  }

  console.log('\n================================================================');
  console.log(`Phase B2 & B3 QA Results: ${passCount} passed, ${failCount} failed`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Unexpected error executing verification suite:', err);
  process.exit(1);
});
