import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const languageAwareScreens = [
  '../components/legal/FAQ.tsx',
  '../components/legal/PrivacyPolicy.tsx',
  '../components/parent/QrCodeScanner.tsx',
  '../components/parent/ParentSettings.tsx',
  '../components/common/ChildQrCodeModal.tsx',
  '../components/teacher/LessonEditModal.tsx',
  '../components/parent/WeeklyProgressView.tsx',
  '../components/student/LessonView.tsx',
  '../components/student/VerseRecitalModal.tsx',
  '../components/parent/ParentLearningJourney.tsx',
  '../components/auth/SupabaseConnectionTester.tsx',
  '../components/parent/AddChildModal.tsx',
  '../components/parent/ChurchEventNotifications.tsx',
  '../components/student/LessonsTab.tsx',
  '../components/student/PointsTab.tsx',
  '../components/design-system/DesignSystemPage.tsx',
  '../components/student/FeedTab.tsx',
  '../components/teacher/ServantSourceManagement.tsx',
  '../components/teacher/TeacherDashboard.tsx',
  '../components/parent/ChildrenLessonsProgress.tsx',
  '../components/profile/RoleProfileShared.tsx',
  '../components/parent/ParentDashboard.tsx',
  '../components/parent/ParentHomeDashboard.tsx',
  '../components/student/StudentAdventureHome.tsx',
  '../components/admin/AdminWorkspace.tsx',
  '../components/teacher/ServantHomeDashboard.tsx',
  '../components/taxis/CopticTaxisTab.tsx',
  '../components/common/HymnsTaxisLevelSetup.tsx',
  '../components/teacher/LessonEngagementSummary.tsx',
  '../components/auth/StudentOnboardingModal.tsx',
  '../components/teacher/StudentLearningReviewView.tsx',
  '../components/student/StudentRoadmapView.tsx',
  '../components/hymns/HymnsSchoolTab.tsx',
  '../components/teacher/publishing/TeacherPublishingHub.tsx',
  '../components/sunday-school/student/RewardCelebration.tsx',
  '../components/sunday-school/viewers/InAppDocumentViewer.tsx',
  '../components/teacher/publishing/HymnsEnrollmentManager.tsx',
  '../components/teacher/StudentExperiencePreview.tsx',
  '../components/student/JourneyOfMosesVisuals.tsx',
  '../components/teacher/ExpressLessonPublishModal.tsx',
  '../components/teacher/publishing/CurriculumImportCenter.tsx',
  '../components/teacher/ServantClassManagement.tsx',
  '../components/sunday-school/student/SundaySchoolQuizView.tsx',
  '../components/teacher/publishing/HymnsPublishingStudio.tsx',
  '../components/sunday-school/student/SundaySchoolLessonView.tsx',
  '../components/teacher/publishing/TaxisPublishingStudio.tsx'
];

test('language switching does not mirror role-based or shared screen layouts', async () => {
  const contents = await Promise.all(
    languageAwareScreens.map(path => readFile(new URL(path, import.meta.url), 'utf8'))
  );

  for (let index = 0; index < contents.length; index++) {
    assert.doesNotMatch(
      contents[index],
      /dir=\{(?:lang === 'ar'|isArabic|isAr)[^}]*\}/,
      `Language-dependent layout direction remains in ${languageAwareScreens[index]}`
    );
  }
});

test('Arabic-first app shell remains RTL while language metadata can change', async () => {
  const preferences = await readFile(new URL('./uiPreferences.ts', import.meta.url), 'utf8');
  assert.match(preferences, /root\.setAttribute\('dir', 'rtl'\)/);
  assert.match(preferences, /root\.setAttribute\('data-language'/);
});
