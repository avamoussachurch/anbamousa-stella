import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const foundation = read('../supabase/migrations/20261124162121_achievement_badges_and_staff_managed_bazaar.sql');
const progressRead = read('../supabase/migrations/20261124162212_allow_students_to_read_own_achievement_progress.sql');
const activity = read('../supabase/migrations/20261124163057_achievement_engine_activity_coverage_and_policy_tuning.sql');
const staffRewards = read('../supabase/migrations/20261124163622_staff_reward_request_review_and_scope_checks.sql');
const expandedBadges = read('../supabase/migrations/20261124163935_expand_achievement_collection_and_learning_consistency.sql');
const secureEvents = read('../supabase/migrations/20261124164523_secure_achievement_event_sources_and_prayer_verification.sql');
const completionBadges = read('../supabase/migrations/20261124171826_enable_verified_hymn_taxis_completion_badges.sql');
const rewardApprovalMigration = read('../supabase/migrations/20261124171750_reward_approval_atomic_points_and_stock.sql');
const server = read('../server.ts');
const eventService = read('../src/lib/achievementService.ts');
const gallery = read('../src/components/achievements/AchievementRewardsStudio.tsx');
const celebration = read('../src/components/achievements/AchievementCelebrationHost.tsx');
const points = read('../src/components/student/PointsTab.tsx');
const admin = read('../src/components/admin/AdminWorkspace.tsx');
const teacher = read('../src/components/teacher/TeacherDashboard.tsx');
const progress = read('../src/lib/studentProgressService.ts');
const prayer = read('../src/components/agpeya/AgpeyaPrayerTab.tsx');
const quiz = read('../src/lib/studentQuizService.ts');

test('achievement data is persisted with RLS and idempotent unlock records', () => {
  for (const table of ['achievement_badges','achievement_events','achievement_unlocks','achievement_category_milestones','achievement_milestone_awards','reward_catalog']) {
    assert.match(foundation, new RegExp('create table if not exists public\\.' + table));
    assert.match(foundation, new RegExp('alter table public\\.' + table + ' enable row level security'));
  }
  assert.match(foundation, /unique\(student_id, badge_id\)/);
  assert.match(foundation, /unique\(student_id, milestone_id\)/);
  assert.match(foundation, /grant execute on function public\.record_achievement_event\(text,text,jsonb\) to authenticated/i);
  assert.match(foundation, /from public,anon/);
  assert.match(foundation, /on conflict\(slug\) do nothing/);
});

test('badge and milestone points are awarded atomically only once', () => {
  assert.match(activity, /public\.evaluate_student_achievements/);
  assert.match(activity, /on conflict\(student_id,badge_id\) do nothing/);
  assert.match(activity, /on conflict\(student_id,milestone_id\) do nothing/);
  assert.match(activity, /update public\.profiles set points=coalesce\(points,0\)\+v_badge\.points_reward/);
  assert.match(activity, /update public\.profiles set points=coalesce\(points,0\)\+v_milestone\.points_reward/);
});

test('students can only read their own event progress', () => {
  assert.match(progressRead, /student_id = \(select auth\.uid\(\)\)/);
  assert.match(progressRead, /achievement_events_read_own/);
});

test('activity events cover learning, hymns, taxis, prayer, quizzes, attendance, and community', () => {
  // Activity is recorded only by authenticated server routes after the underlying
  // lesson/content/quiz has been verified; the client only dispatches returned awards.
  assert.match(server, /recordServerAchievementEvent\(targetStudentId, 'lesson_opened'/);
  assert.match(server, /recordServerAchievementEvent\(targetStudentId, 'lesson_completed'/);
  assert.match(server, /recordServerAchievementEvent\(targetStudentId, eventType/);
  assert.match(server, /eventType: 'lesson_opened' \| 'lesson_completed' \| 'hymn_opened' \| 'hymn_mastered' \| 'taxis_opened' \| 'taxis_completed' \| 'quiz_passed'/);
  assert.match(expandedBadges, /learning_day/);
  assert.match(prayer, /recordAchievementEvent\('prayer_day'/);
  assert.match(quiz, /dispatchAchievementResult\(json\.achievementResult\)/);
  assert.match(server, /recordServerAchievementEvent\(targetStudentId, 'quiz_passed'/);
  assert.match(server, /const eventType = school === 'hymns' \? 'hymn_opened' : 'taxis_opened'/);
  assert.match(server, /recordServerAchievementEvent\(targetStudentId, eventType/);
  assert.match(server, /const eventType = school === 'hymns' \? 'hymn_mastered' : 'taxis_completed'/);
  assert.match(server, /recordServerAchievementEvent\(targetStudentId, eventType, sourceKey/);
  assert.match(server, /from\('hymns'\)/);
  assert.match(server, /from\('coptic_taxis_items'\)/);
  assert.match(server, /achievement_events/);
  assert.match(server, /recordServerAchievementEvent\(targetStudentId, 'lesson_opened'/);
  assert.match(completionBadges, /hymn-heart/);
  assert.match(completionBadges, /hymn-master/);
  assert.match(completionBadges, /taxis-practitioner/);
  assert.match(activity, /capture_attendance_achievement_event/);
  assert.match(activity, /capture_feed_post_achievement_event/);
  assert.match(activity, /capture_feed_reaction_achievement_event/);
  assert.match(secureEvents, /p_event_type<>'prayer_day'/);
  assert.match(secureEvents, /public\.agpeya_prayers/);
  assert.match(secureEvents, /grant execute on function public\.evaluate_student_achievements\(uuid\) to service_role/);
  assert.match(server, /getTrustedServiceClient\('Achievement tracking is temporarily unavailable\.'/);
});

test('student gallery and Bazaar use the live database catalogue', () => {
  assert.match(gallery, /from\('achievement_badges'\)/);
  assert.match(gallery, /from\('achievement_unlocks'\)/);
  assert.match(gallery, /from\('achievement_category_milestones'\)/);
  assert.match(gallery, /from\('reward_catalog'\)/);
  assert.match(gallery, /submitRewardRequest/);
  assert.match(points, /AchievementRewardsStudio mode="student" initialView="badges"/);
  assert.match(points, /AchievementRewardsStudio mode="student" initialView="bazaar"/);
});

test('teachers and admins can manage badges, milestones, catalogue, and fulfilment', () => {
  assert.match(gallery, /mode === 'manage'/);
  assert.match(gallery, /saveBadge/);
  assert.match(gallery, /saveMilestone/);
  assert.match(gallery, /saveReward/);
  assert.match(gallery, /SUPPORTED_EVENT_TYPES/);
  assert.match(gallery, /not connected yet/);
  assert.match(gallery, /mark_reward_request_fulfilled/);
  assert.match(gallery, /review_staff_reward_request/);
  assert.match(rewardApprovalMigration, /set points = coalesce\(points, 0\) - new\.cost_points/);
  assert.match(rewardApprovalMigration, /new\.cost_points is distinct from old\.cost_points/);
  assert.match(rewardApprovalMigration, /update public\.reward_catalog/);
  assert.match(rewardApprovalMigration, /review_staff_reward_request/);
  assert.match(staffRewards, /can_access_student_data\(v_request.student_id\)/);
  assert.match(staffRewards, /review_staff_reward_request/);
  assert.match(admin, /AchievementRewardsStudio mode="manage"/);
  assert.match(teacher, /AchievementRewardsStudio mode="manage"/);
});

test('badge unlocks dispatch a global, prominent celebration', () => {
  assert.match(eventService, /anba:achievement-unlocked/);
  assert.match(celebration, /fixed inset-0 z-\[9999\]/);
  assert.match(celebration, /BADGE UNLOCKED/);
  assert.match(celebration, /confetti/);
  assert.match(celebration, /syncAuthoritativeProgress/);
  assert.match(celebration, /from\('profiles'\)/);
});
