import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('profile frames align to the rounded-square avatar preview and public profiles show equipped cosmetics', () => {
  const studio = read('../src/components/profile/ProfileCustomizationStudio.tsx');
  const directory = read('../src/components/student/FeedPeopleDirectory.tsx');
  const profile = read('../src/components/student/ProfileTab.tsx');
  assert.match(studio, /<rect x="3" y="3" width="94" height="94" rx="25"/);
  assert.match(studio, /h-\[calc\(100%\+20px\)\] w-\[calc\(100%\+20px\)\]/);
  assert.match(directory, /profileFrameColor\(selected\)/);
  assert.match(directory, /bannerBackground\(selected\)/);
  assert.match(directory, /anbaCommunityProfile/);
  assert.match(profile, /followersCount/);
  assert.match(profile, /followingCount/);
});

test('student family codes are repaired to five characters and the parent input matches', () => {
  const server = read('../server.ts');
  const parentModal = read('../src/components/parent/AddChildModal.tsx');
  const parser = read('../src/lib/parentChildService.ts');
  assert.match(server, /if \(!rotate && \/\^\[A-Z0-9\]\{5\}\$\/\.test\(existingCode\)\) return existingCode/);
  assert.match(server, /Could not allocate a unique five-character family connection code/);
  assert.match(parentModal, /maxLength=\{5\}/);
  assert.match(parser, /normalized\.length === 5/);
});

test('feed voice notes use decoded waveform data, seeking, correct duration and playback speeds', () => {
  const voice = read('../src/components/student/FeedVoiceMessage.tsx');
  assert.match(voice, /decodeAudioData/);
  assert.match(voice, /getChannelData\(0\)/);
  assert.match(voice, /onDurationChange/);
  assert.match(voice, /audio\.currentTime = next/);
  assert.match(voice, /audioRef\.current\.playbackRate = playbackRate/);
});

test('feed videos provide five-second skip and speed selection', () => {
  const video = read('../src/components/student/FeedVideoPlayer.tsx');
  assert.match(video, /skip\(-5\)/);
  assert.match(video, /skip\(5\)/);
  assert.match(video, /Video playback speed/);
  assert.match(video, /videoRef\.current\.playbackRate = playbackRate/);
});

test('reaction picker dismisses outside and confirms selected reactions visually', () => {
  const feed = read('../src/components/student/FeedTab.tsx');
  assert.match(feed, /closeOnOutsidePress/);
  assert.match(feed, /data-feed-reaction-root/);
  assert.match(feed, /aria-pressed=\{myPostReactionKeys\.has/);
  assert.match(feed, /bg-amber-100/);
});

test('community profile overlay supports back navigation and displays the public profile treatment', () => {
  const directory = read('../src/components/student/FeedPeopleDirectory.tsx');
  assert.match(directory, /backWithinDirectory/);
  assert.match(directory, /ArrowLeft/);
  assert.match(directory, /This is how the profile appears to church members/);
  assert.match(directory, /followers_count/);
  assert.match(directory, /following_count/);
});

test('app exposes a global back button and animates page transitions', () => {
  const app = read('../src/App.tsx');
  const topbar = read('../src/components/layout/TopBar.tsx');
  assert.match(app, /onBack=\{handleAppBack\}/);
  assert.match(app, /window\.history\.back\(\)/);
  assert.match(app, /tabTransitionTick/);
  assert.match(topbar, /Go back one step/);
});

test('lesson completion launches its quiz automatically and only quiz submission earns the learning day', () => {
  const lesson = read('../src/components/student/LessonView.tsx');
  const server = read('../server.ts');
  assert.match(lesson, /if \(hasQuiz\)[\s\S]*?setIsTakingQuiz\(true\)/);
  assert.match(lesson, /type: 'spring'/);\n  assert.match(lesson, /currentStreak: res\\.streak\\?\\.currentStreak \\?\\? userData\\.currentStreak \\?\\? 0/);
  assert.doesNotMatch(lesson, /start-quiz-button|isTransitioningToQuiz/);
  assert.match(server, /const requiresQuiz = Array\.isArray\(targetVersion\?\.quizDraft\?\.questions\)/);
  assert.match(server, /requiresQuiz[\s\S]*?loadPersistedStudentStreak[\s\S]*?: await persistStudentActivityDay/);
});

test('lesson attribution resolves a servant display name and published servant voice is available to students', () => {
  const lesson = read('../src/components/student/LessonView.tsx');
  const studentLesson = read('../src/components/sunday-school/student/SundaySchoolLessonView.tsx');
  const migration = read('../supabase/migrations/20261127170000_allow_published_lesson_teacher_voice_for_students.sql');
  assert.match(lesson, /from\('profiles'\)\.select\('name'\)/);
  assert.match(lesson, /teacherName: servantDisplayName/);
  assert.match(studentLesson, /sources\.find\(s => s\.type === 'TEACHER_VOICE' && Boolean\(s\.fileUrl\)\)/);
  assert.match(studentLesson, /audioUrl=\{displayedAudioUrl\}/);
  assert.match(migration, /RETURN public\.can_read_curriculum_lesson\(v_lesson_id\)/);
});
