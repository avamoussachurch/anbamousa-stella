import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';
import { mockLessons } from '../../data';
import { useAuth } from '../../context/AuthContext';
import { useLessons } from '../../context/LessonsContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { 
  Language, 
  LessonVersion
} from '../../types';
import { SundaySchoolLessonView } from '../sunday-school/student/SundaySchoolLessonView';
import { SundaySchoolQuizView } from '../sunday-school/student/SundaySchoolQuizView';
import { startLessonProgress, completeSectionProgress, completeLessonProgress, diagnoseLessonCompletion } from '../../lib/studentProgressService';
import { submitStudentQuizAttempt, getStudentQuizAttempts } from '../../lib/studentQuizService';
import { getStudentMastery, evaluateStudentMastery } from '../../lib/studentMasteryService';
import { getClassGroupForGrade, getClassGroupLabel, getClassGroupById } from '../../lib/classGroups';
import { updateLeaderboardUser, updateStreakLeaderboardUser } from '../../lib/pointsService';
import { hasRole } from '../../lib/workspaces';
import { getLocalizedErrorMessage } from '../../lib/localizedErrors';

export function LessonView({ lessonId, onBack, lang = 'ar', readOnly = false }: { lessonId: string; onBack: () => void; lang?: Language; readOnly?: boolean }) {
  const { userData, isGuest, setUserDirectly } = useAuth();
  const { 
    lessons, 
    markCompleted,
    lessonSources,
    lessonVersions,
    studentProgress,
    quizAttempts,
    studentMasteries,
    setStudentMastery,
    updateStudentContentProgress,
    recordQuizAttempt,
    refreshProgressSummary,
    curriculumLoading,
    curriculumError,
    curriculumLoadedForUserId
  } = useLessons();

  const isOnlineAuth = Boolean(!isGuest && userData && isSupabaseConfigured);
  const curriculumReady = !isOnlineAuth ||
    (!curriculumLoading && curriculumLoadedForUserId === userData?.id);
  const lesson = (curriculumReady ? lessons.find(l => l.id === lessonId) : undefined) ||
    (isGuest ? mockLessons.find(l => l.id === lessonId) : undefined);
  
  const currentStudentId = userData?.id || 'u1';
  const versions = (lessonVersions && lessonVersions[lessonId]) || [];

  const activePublishedVersion = useMemo<LessonVersion | null>(() => {
    if (isOnlineAuth) {
      if (!lesson?.currentVersionId) return null;
      const activeVersion = lesson.latestVersion?.id === lesson.currentVersionId
        ? lesson.latestVersion
        : versions.find(version => version.id === lesson.currentVersionId);
      return activeVersion?.status === 'PUBLISHED' && activeVersion.sections.length > 0
        ? activeVersion
        : null;
    }

    const previewVersion = (lesson?.currentVersionId
      ? versions.find(version => version.id === lesson.currentVersionId)
      : null) || lesson?.latestVersion ||
      versions.find(version => version.status === 'PUBLISHED');
    return previewVersion?.status === 'PUBLISHED' && previewVersion.sections.length > 0
      ? previewVersion
      : null;
  }, [lesson, versions, isOnlineAuth, lessonId]);

  const [isTakingQuiz, setIsTakingQuiz] = useState<boolean>(false);
  const [targetSectionId, setTargetSectionId] = useState<string | undefined>(undefined);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [finishSuccess, setFinishSuccess] = useState<boolean>(false);
  const [sectionProgressError, setSectionProgressError] = useState<string | null>(null);
  const completionInFlightRef = useRef(false);

  useEffect(() => {
    if (activePublishedVersion && userData && !readOnly && isOnlineAuth) {
      startLessonProgress({
        lessonId,
        versionId: activePublishedVersion.id,
        studentId: currentStudentId
      }).then(({ data, error, streak, streakSyncError }) => {
        if (error) {
          setSectionProgressError(getLocalizedErrorMessage(error, lang));
          return;
        }
        if (streakSyncError) console.warn('Lesson opened, but learning streak sync failed:', streakSyncError);
        if (streak && userData && setUserDirectly) {
          setUserDirectly({
            ...userData,
            currentStreak: streak.currentStreak,
            longestStreak: Math.max(userData.longestStreak || 0, streak.longestStreak)
          });
        }
        if (data) {
          updateStudentContentProgress(
            currentStudentId,
            lessonId,
            data.sectionsCompleted,
            data.completionPercent,
            data.status === 'COMPLETED'
          );
        }
      });

      getStudentMastery(lessonId, currentStudentId, activePublishedVersion.id).then(({ data }) => {
        if (data) {
          setStudentMastery(
            currentStudentId,
            lessonId,
            data.status,
            data.evaluatedBy || 'Automated Curriculum Engine',
            data.teacherNotes
          );
        }
      });

      getStudentQuizAttempts(lessonId, currentStudentId).then(({ data }) => {
        if (data && data.length > 0) {
          data.forEach(att => recordQuizAttempt(att));
        }
      });
    }
  }, [lessonId, activePublishedVersion?.id, userData?.id, currentStudentId, readOnly, isOnlineAuth]);

  if (isOnlineAuth && !curriculumReady) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <BookOpen className="w-12 h-12 text-gray-400" />
        <h2 className="text-lg font-bold text-gray-800">
          {curriculumError || (lang === 'ar' ? 'بنحمّل الدروس المنشورة...' : 'Loading published lessons...')}
        </h2>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-[var(--color-church-blue)] text-white text-xs font-bold"
        >
          {lang === 'ar' ? 'ارجع لقائمة الدروس' : 'Back to Lessons'}
        </button>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <BookOpen className="w-12 h-12 text-gray-400" />
        <h2 className="text-lg font-bold text-gray-800">
          {curriculumError || (lang === 'ar' ? 'مش لاقيين الدرس ده.' : 'Lesson not found')}
        </h2>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-[var(--color-church-blue)] text-white text-xs font-bold"
        >
          {lang === 'ar' ? 'ارجع لقائمة الدروس' : 'Back to Lessons'}
        </button>
      </div>
    );
  }

  if (!activePublishedVersion) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <BookOpen className="w-12 h-12 text-gray-400" />
        <h2 className="text-lg font-bold text-gray-800">
          {lang === 'ar' ? 'الدرس ده لسه ملوش نسخة منشورة.' : 'No active published lesson version is available'}
        </h2>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-[var(--color-church-blue)] text-white text-xs font-bold"
        >
          {lang === 'ar' ? 'ارجع لقائمة الدروس' : 'Back to Lessons'}
        </button>
      </div>
    );
  }

  // Priority 1B: Class-based lesson access authorization
  const isStudent = !readOnly && hasRole(userData, 'student');
  const studentGrade = userData?.requestedGrade || userData?.grade;
  const studentClass = userData?.requestedClassGroupId 
    ? getClassGroupById(userData.requestedClassGroupId) 
    : (studentGrade ? getClassGroupForGrade(studentGrade) : null);
  const lessonClass = lesson?.classGroupId 
    ? getClassGroupById(lesson.classGroupId) 
    : (lesson?.grade ? getClassGroupForGrade(lesson.grade) : null);

  const isRestrictedForStudent = Boolean(
    isStudent && 
    studentClass && 
    lessonClass && 
    studentClass.id !== lessonClass.id
  );

  if (isRestrictedForStudent && studentClass && lessonClass) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md mx-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-3xl border border-amber-300">
          🔒
        </div>
        <h2 className="text-xl font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
          {lang === 'ar' ? 'الدرس ده مخصص لمرحلة دراسية تانية.' : 'Restricted Lesson Milestone'}
        </h2>
        <p className="text-xs sm:text-sm text-[var(--mousa-sand-500)] leading-relaxed">
          {lang === 'ar'
            ? `المحطة دي مخصصة لطلاب مرحلة (${getClassGroupLabel(lessonClass, lang)})، وفصلك المسجل هو (${getClassGroupLabel(studentClass, lang)}). تقدر تشوف الدروس المخصصة لصفّك بس.`
            : `This milestone is assigned to ${getClassGroupLabel(lessonClass, 'en')}. You are currently registered in ${getClassGroupLabel(studentClass, 'en')}.`}
        </p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-[var(--mousa-teal)] hover:bg-[var(--mousa-teal-deep)] text-white text-xs font-black shadow-xs cursor-pointer"
        >
          {lang === 'ar' ? 'ارجع لدروس فصلك' : 'Back to My Class Lessons'}
        </button>
      </div>
    );
  }

  const activeSources = (lessonSources || []).filter(s => s.lessonId === lessonId);
  const userProgressKey = `${currentStudentId}_${lessonId}`;
  const currentProgress = !readOnly && studentProgress ? studentProgress[userProgressKey] : undefined;
  const userQuizAttempts = readOnly ? [] : (quizAttempts && quizAttempts[userProgressKey]) || [];
  const currentMastery = !readOnly && studentMasteries ? studentMasteries[userProgressKey] : undefined;

  const handleFinishLesson = async () => {
    if (readOnly || !isOnlineAuth) {
      setFinishError(lang === 'ar'
        ? 'لازم تسجّل دخولك وتكون متصل بالإنترنت عشان نحفظ إنك خلّصت الدرس.'
        : 'Sign in and connect to Supabase to save lesson completion.');
      return;
    }
    if (completionInFlightRef.current || isFinishing || !activePublishedVersion) return;
    completionInFlightRef.current = true;
    setIsFinishing(true);
    setFinishError(null);

    try {
      // 1. Verify all sections are genuinely completed by the student (no silent auto-completion)
      const allSections = activePublishedVersion.sections || [];
      const currentSections = currentProgress?.sectionsCompleted || [];
      const remainingSections = allSections.filter(s => !currentSections.includes(s.id));

      if (allSections.length > 0 && remainingSections.length > 0) {
        setFinishError(
          lang === 'ar'
            ? `كمّل قراءة كل الأقسام (${currentSections.length} من ${allSections.length} مقروء) قبل إنهاء محطة الدرس.`
            : `Please read all sections (${currentSections.length} of ${allSections.length} read) before finishing the lesson.`
        );
        setIsFinishing(false);
        completionInFlightRef.current = false;
        return;
      }

      // 2. Authoritatively finalize lesson completion on backend
      const res = await completeLessonProgress({
        lessonId,
        versionId: activePublishedVersion.id,
        studentId: currentStudentId
      });

      if (res.error) {
        setFinishError(getLocalizedErrorMessage(res.error.message, lang) || (lang === 'ar' ? 'مش قادرين نحفظ إنك خلّصت الدرس.' : 'Failed to save lesson completion'));
        setIsFinishing(false);
        completionInFlightRef.current = false;
        return;
      }

      const allSecIds = allSections.map(s => s.id);
      updateStudentContentProgress(currentStudentId, lessonId, allSecIds, 100, true);
      markCompleted(lessonId);

      // Automatically evaluate student mastery after lesson completion
      const masteryRes = await evaluateStudentMastery({
        lessonId,
        versionId: activePublishedVersion.id,
        studentId: currentStudentId
      });
      if (masteryRes.data) {
        setStudentMastery(
          currentStudentId,
          lessonId,
          masteryRes.data.status,
          masteryRes.data.evaluatedBy || 'Automated Curriculum Engine',
          masteryRes.data.teacherNotes
        );
      }

      // Authoritative points and streak synchronization (Server-authoritative, idempotent)
      if (typeof res.totalPoints === 'number' && userData) {
        setUserDirectly({
          ...userData,
          points: res.totalPoints,
          currentStreak: res.streak?.currentStreak ?? userData.currentStreak ?? 1
        });
      }

      // Synchronize overall application state with authoritative server summary
      if (refreshProgressSummary) {
        try {
          await refreshProgressSummary();
        } catch (e) {
          console.warn('Note on summary refresh after completion:', e);
        }
      }

      // Diagnostic check: audit client/server synchronization in background
      diagnoseLessonCompletion(lessonId, {
        isCompleted: true,
        points: res.totalPoints ?? userData?.points,
        studentId: currentStudentId
      }).catch(() => {});

      setIsFinishing(false);
      completionInFlightRef.current = false;
      setFinishSuccess(true);

      // Automatically transition to the quiz if questions exist on the active published version
      const hasQuiz = Boolean(
        activePublishedVersion.quizDraft &&
        activePublishedVersion.quizDraft.questions &&
        activePublishedVersion.quizDraft.questions.length > 0
      );

      if (hasQuiz) {
        setTargetSectionId(undefined);
        setIsTakingQuiz(true);
      }
    } catch (err: any) {
      console.error(err);
      setFinishError(err?.message || (lang === 'ar' ? 'حصلت مشكلة وإحنا بنحفظ إكمال الدرس.' : 'Error saving completion'));
      setIsFinishing(false);
      completionInFlightRef.current = false;
    }
  };

  // Quiz View Mode: Render Tiered Sunday School Quiz View
  if (!readOnly && isTakingQuiz && activePublishedVersion?.quizDraft) {
    return (
      <motion.div
        className="px-4 pt-4 pb-20"
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <SundaySchoolQuizView
          quiz={activePublishedVersion.quizDraft}
          lessonId={lessonId}
          studentId={currentStudentId}
          lang={lang}
          previousAttempts={userQuizAttempts}
          onBackToLesson={() => setIsTakingQuiz(false)}
          onSubmitAttempt={async (attempt) => {
            if (!activePublishedVersion) {
              return { success: false, error: 'The active published quiz is unavailable. Reopen the lesson and try again.' };
            }

            const res = await submitStudentQuizAttempt({
              lessonId,
              versionId: activePublishedVersion.id,
              quizId: attempt.quizId,
              answers: attempt.answers.map(a => ({
                questionId: a.questionId,
                selectedOptionIndex: a.selectedOptionIndex
              }))
            });
            if (res.error || !res.data) {
              return {
                success: false,
                error: res.error?.message || 'The server did not confirm that your quiz was saved. Please retry.'
              };
            }
            recordQuizAttempt(res.data);

            // Evaluate student mastery only after the server confirms the attempt was saved.
            const masteryRes = await evaluateStudentMastery({
              lessonId,
              versionId: activePublishedVersion.id,
              studentId: currentStudentId
            });
            if (masteryRes.data) {
              setStudentMastery(
                currentStudentId,
                lessonId,
                masteryRes.data.status,
                masteryRes.data.evaluatedBy || 'Automated Curriculum Engine',
                masteryRes.data.teacherNotes
              );
            }

            // Authoritative streak and points synchronization across all screens
            if (userData) {
              const nextPoints = typeof res.totalPoints === 'number' && res.totalPoints > 0 ? res.totalPoints : userData.points;
              const serverCurrentStreak = res.streak?.currentStreak;
              const serverLongestStreak = res.streak?.longestStreak;
              const nextStreak = typeof serverCurrentStreak === 'number' && Number.isFinite(serverCurrentStreak)
                ? Math.max(0, serverCurrentStreak)
                : Math.max(0, userData.currentStreak ?? 0);
              const nextLongest = Math.max(
                nextStreak,
                typeof serverLongestStreak === 'number' && Number.isFinite(serverLongestStreak)
                  ? Math.max(0, serverLongestStreak)
                  : 0,
                userData.longestStreak ?? 0
              );

              const updatedUser = {
                ...userData,
                points: nextPoints,
                currentStreak: nextStreak,
                longestStreak: nextLongest
              };
              setUserDirectly(updatedUser);
              updateLeaderboardUser(updatedUser, res.pointsEarned ?? 0);
              updateStreakLeaderboardUser(updatedUser);
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('church_user_updated', { detail: updatedUser }));
              }
            }

            if (refreshProgressSummary) {
              try {
                await refreshProgressSummary();
              } catch (_) {}
            }

            return {
              success: true,
              data: res.data,
              isDuplicate: res.isDuplicate,
              isFirstCompletion: res.isFirstCompletion,
              pointsEarned: res.pointsEarned,
              totalPoints: res.totalPoints,
              streak: res.streak
            };
          }}
          onReviewSection={(secId) => {
            setTargetSectionId(secId);
            setIsTakingQuiz(false);
          }}
        />
      </motion.div>
    );
  }

  // Playful Rich Student Lesson Story Reader Mode
  return (
    <div className="px-4 pt-4 pb-20 relative">
      <SundaySchoolLessonView
        lesson={lesson}
        version={activePublishedVersion}
        sources={activeSources}
        progress={currentProgress}
        quizAttempts={userQuizAttempts}
        mastery={currentMastery}
        onBack={onBack}
        lang={lang}
        isOnlineAuth={isOnlineAuth}
        readOnly={readOnly || !isOnlineAuth}
        targetSectionId={targetSectionId}
        onFinishLesson={handleFinishLesson}
        isFinishing={isFinishing}
        finishError={finishError}
        sectionProgressError={sectionProgressError}
        finishSuccess={finishSuccess}
        onNavigateHome={onBack}
        previewMode={isGuest}
        onMarkSectionRead={async sectionId => {
          if (readOnly || !isOnlineAuth) return;
          const existingSections = currentProgress?.sectionsCompleted || [];
          const isRead = !existingSections.includes(sectionId);
          setSectionProgressError(null);

          if (activePublishedVersion && isOnlineAuth) {
            const result = await completeSectionProgress({
              lessonId,
              versionId: activePublishedVersion.id,
              sectionId,
              isRead,
              studentId: currentStudentId
            });
            if (result.error || !result.data) {
              setSectionProgressError(
                lang === 'ar'
                  ? 'مش قادرين نحفظ التغيير دلوقتي. جرّب تاني واتأكد إن الإنترنت شغال.'
                  : 'We could not save that change. Please try again and check your connection.'
              );
              return;
            }
            updateStudentContentProgress(
              currentStudentId,
              lessonId,
              result.data.sectionsCompleted,
              result.data.completionPercent,
              result.data.status === 'COMPLETED'
            );
            return;
          }

        }}
        onStartQuiz={() => {
          if (readOnly) return;
          setTargetSectionId(undefined);
          setIsTakingQuiz(true);
        }}
      />

    </div>
  );
}
