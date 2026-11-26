import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const adventure = read('../src/components/common/LearningAdventurePanel.tsx');
const sundaySchool = read('../src/components/sunday-school/student/SundaySchoolLessonView.tsx');
const hymns = read('../src/components/hymns/HymnsSchoolTab.tsx');
const taxis = read('../src/components/taxis/CopticTaxisTab.tsx');

test('learning adventure panel animates quest progress and respects reduced motion', () => {
  assert.match(adventure, /useReducedMotion/);
  assert.match(adventure, /aria-label={title}/);
  assert.match(adventure, /completed = steps\.filter/);
  assert.match(adventure, /animate={{ width: `\$\{percent\}%` }}/);
  assert.match(adventure, /CheckCircle2/);
});

test('Sunday School quest progress is derived from saved sections, flashcards, quiz attempts and lesson completion', () => {
  assert.match(sundaySchool, /LearningAdventurePanel/);
  assert.match(sundaySchool, /complete: sections\.length === 0 \|\| isAllSectionsRead/);
  assert.match(sundaySchool, /complete: activeFlashcardIndex === eligibleFlashcards\.length - 1 && isFlashcardFlipped/);
  assert.match(sundaySchool, /complete: Boolean\(latestQuizAttempt\)/);
  assert.match(sundaySchool, /complete: isContentCompleted/);
});

test('Hymn adventure uses actual listening, practice recording and mastery state', () => {
  assert.match(hymns, /LearningAdventurePanel/);
  assert.match(hymns, /currentTime \/ duration >= 0\.8/);
  assert.match(hymns, /Boolean\(recordedAudioUrl\)/);
  assert.match(hymns, /Boolean\(masteredHymns\[selectedHymn\.id\]\)/);
  assert.match(hymns, /RewardCelebration/);
});

test('Taxis adventure tracks reviewed steps and celebrates only confirmed server completion', () => {
  assert.match(taxis, /reviewedTaxisSteps/);
  assert.match(taxis, /LearningAdventurePanel/);
  assert.match(taxis, /completionConfirmed = !userData/);
  assert.match(taxis, /if \(res\.success\) completionConfirmed = true/);
  assert.match(taxis, /if \(completionConfirmed\) setShowTaxisCelebration\(true\)/);
  assert.match(taxis, /RewardCelebration/);
});

test('teacher studio exposes controls for the same story, flashcard and quiz activities used by student quests', () => {
  const studio = read('../src/components/sunday-school/teacher/LessonVersionStudio.tsx');
  assert.match(studio, /Build the student's learning adventure/);
  assert.match(studio, /setActiveTab\('sections'\)/);
  assert.match(studio, /setActiveTab\('materials'\)/);
  assert.match(studio, /setActiveTab\('quiz'\)/);
  assert.match(studio, /currentVersion\.flashcards/);
  assert.match(studio, /currentVersion\.quizDraft\?\.questions/);
});
