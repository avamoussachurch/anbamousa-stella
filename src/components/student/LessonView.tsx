import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import { mockLessons } from '../../data';
import { useAuth } from '../../context/AuthContext';
import { useLessons } from '../../context/LessonsContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { 
  Language, 
  LessonVersion, 
  QuizDraft,
  QuestionDifficulty
} from '../../types';
import { SundaySchoolLessonView } from '../sunday-school/student/SundaySchoolLessonView';
import { SundaySchoolQuizView } from '../sunday-school/student/SundaySchoolQuizView';
import { startLessonProgress, completeSectionProgress, completeLessonProgress, diagnoseLessonCompletion } from '../../lib/studentProgressService';
import { submitStudentQuizAttempt } from '../../lib/studentQuizService';
import { getStudentMastery, evaluateStudentMastery } from '../../lib/studentMasteryService';
import { getClassGroupForGrade, getClassGroupLabel, getClassGroupById } from '../../lib/classGroups';

export function LessonView({ lessonId, onBack, lang = 'ar' }: { lessonId: string; onBack: () => void; lang?: Language }) {
  const { userData, isGuest, addPoints, setUserDirectly } = useAuth();
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
    refreshProgressSummary
  } = useLessons();

  const lesson = lessons.find(l => l.id === lessonId) || mockLessons.find(l => l.id === lessonId);
  
  // Sunday School Vertical Slice States
  const [isTakingQuiz, setIsTakingQuiz] = useState<boolean>(false);
  const [targetSectionId, setTargetSectionId] = useState<string | undefined>(undefined);

  const currentStudentId = userData?.id || 'u1';
  const versions = (lessonVersions && lessonVersions[lessonId]) || [];
  const isOnlineAuth = Boolean(!isGuest && userData && isSupabaseConfigured);

  // Authoritative Version Resolution for ALL Lessons
  const activePublishedVersion = useMemo<LessonVersion>(() => {
    let resolved: LessonVersion | null = null;

    if (isOnlineAuth) {
      if (lesson?.currentVersionId) {
        if (lesson.latestVersion && lesson.latestVersion.id === lesson.currentVersionId && lesson.latestVersion.status === 'PUBLISHED') {
          resolved = lesson.latestVersion;
        } else {
          resolved = versions.find(v => v.id === lesson.currentVersionId && v.status === 'PUBLISHED') || null;
        }
      }
    } else {
      // Offline / Demo / Guest fallback
      resolved = (lesson?.currentVersionId ? versions.find(v => v.id === lesson.currentVersionId) : null) ||
        lesson?.latestVersion ||
        versions.find(v => v.status === 'APPROVED' || v.status === 'PUBLISHED') ||
        versions[versions.length - 1] ||
        null;
    }

    if (resolved && resolved.sections && resolved.sections.length > 0) {
      return resolved;
    }

    // Build authentic version using only the teacher's actual data
    const lessonTitle = lesson?.title || 'Sunday School Lesson';
    const lessonTitleAr = lesson?.titleAr || lessonTitle;
    const lessonSummary = lesson?.summary || 'Spiritual curriculum lesson for our Sunday School class.';
    const lessonSummaryAr = lesson?.summaryAr || lessonSummary;

    // Only construct quizDraft if the servant actually defined quiz questions
    const hasQuiz = Boolean(lesson?.quiz && lesson.quiz.length > 0);
    const quizDraftQuestions = hasQuiz
      ? lesson!.quiz!.map((q, idx) => ({
          id: q.id || `q-${lessonId}-${idx}`,
          type: 'multiple_choice' as const,
          difficulty: q.difficulty || (idx === 0 ? 'EASY' : idx === 1 ? 'MEDIUM' : 'HARD') as QuestionDifficulty,
          points: q.points || (idx === 0 ? 10 : idx === 1 ? 20 : 30),
          questionEn: q.question,
          questionAr: q.question,
          optionsEn: q.options,
          optionsAr: q.options,
          correctIndex: q.correctIndex,
          explanationEn: `Key takeaway for ${lessonTitle}.`,
          explanationAr: `النقطة الأساسية لدرس ${lessonTitleAr}.`
        }))
      : [];

    const generatedQuiz: QuizDraft | undefined = hasQuiz ? {
      id: `quiz-gen-${lessonId}`,
      lessonId,
      titleEn: `${lessonTitle} Review Quiz`,
      titleAr: `اختبار مراجعة ${lessonTitleAr}`,
      status: 'APPROVED',
      questions: quizDraftQuestions
    } : undefined;

    const mainExplanationAr = lesson?.writtenExplanation || lesson?.teacherNotes || lessonSummaryAr;
    const mainExplanationEn = lesson?.writtenExplanation || lesson?.teacherNotes || lessonSummary;

    return {
      id: `ver-auto-${lessonId}`,
      lessonId,
      versionNumber: 1,
      status: 'PUBLISHED',
      createdBy: lesson?.teacherName || 'Sunday School Servant',
      createdAt: lesson?.date || new Date().toISOString(),
      approvedBy: lesson?.approvedServantName || 'Sunday School Servant',
      approvedAt: lesson?.approvedAt || new Date().toISOString(),
      summaryEn: lessonSummary,
      summaryAr: lessonSummaryAr,
      summaryCop: lesson?.summaryCop,
      bigIdeaEn: lessonSummary,
      bigIdeaAr: lessonSummaryAr,
      objectivesEn: [
        `Learn the spiritual lessons of ${lessonTitle}`,
        'Practice Christian love and obedience at home and church'
      ],
      objectivesAr: [
        `تعلم الدروس الروحية لـ ${lessonTitleAr}`,
        'ممارسة المحبة والطاعة المسيحية في بيوتنا وكنيستنا'
      ],
      sections: [
        {
          id: `sec-${lessonId}-1`,
          order: 1,
          titleEn: `1. The Story of ${lessonTitle}`,
          titleAr: `١. القصة والشرح الإيماني: ${lessonTitleAr}`,
          titleCop: lesson?.titleCop || 'Ⲡⲓⲥⲃⲱ ⲛ̀ⲧⲉ ϯⲉⲕⲕⲗⲏⲥⲓⲁ',
          contentEn: mainExplanationEn,
          contentAr: mainExplanationAr,
          contentCop: lesson?.summaryCop,
          teacherNotes: lesson?.teacherNotes || undefined
        }
      ],
      // Only attach slides if the servant provided slides or slidesUrl
      slides: lesson?.slidesUrl ? [
        {
          number: 1,
          titleEn: lessonTitle,
          titleAr: lessonTitleAr,
          bulletsEn: [lessonSummary, lesson?.grade || 'Class Lesson'],
          bulletsAr: [lessonSummaryAr, lesson?.grade || 'درس المرحلة الدراسية'],
          speakerNotesEn: 'Guide the children through the key points of the lesson.',
          speakerNotesAr: 'توجيه الأولاد للتأمل في النقاط الروحية للدرس.'
        }
      ] : [],
      flashcards: [],
      quizDraft: generatedQuiz
    };
  }, [lesson, versions, isOnlineAuth, lessonId]);

  if (!lesson) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <BookOpen className="w-12 h-12 text-gray-400" />
        <h2 className="text-lg font-bold text-gray-800">
          {lang === 'ar' ? 'الدرس غير موجود' : 'Lesson not found'}
        </h2>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-[var(--color-church-blue)] text-white text-xs font-bold"
        >
          {lang === 'ar' ? 'الرجوع للدروس' : 'Back to Lessons'}
        </button>
      </div>
    );
  }

  // Priority 1B: Class-based lesson access authorization
  const isStudent = userData?.role === 'student';
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
          {lang === 'ar' ? 'هذا الدرس مخصص لمرحلة دراسية أخرى' : 'Restricted Lesson Milestone'}
        </h2>
        <p className="text-xs sm:text-sm text-[var(--mousa-sand-500)] leading-relaxed">
          {lang === 'ar'
            ? `هذه المحطة مخصصة لطلاب مرحلة (${getClassGroupLabel(lessonClass, lang)})، وفصلك المسجل هو (${getClassGroupLabel(studentClass, lang)}). يمكنك فقط تصفح الدروس المخصصة لصفك الدراسي.`
            : `This milestone is assigned to ${getClassGroupLabel(lessonClass, 'en')}. You are currently registered in ${getClassGroupLabel(studentClass, 'en')}.`}
        </p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-[var(--mousa-teal)] hover:bg-[var(--mousa-teal-deep)] text-white text-xs font-black shadow-xs cursor-pointer"
        >
          {lang === 'ar' ? 'الرجوع إلى دروس صفي' : 'Back to My Class Lessons'}
        </button>
      </div>
    );
  }

  const activeSources = (lessonSources || []).filter(s => s.lessonId === lessonId);
  const userProgressKey = `${currentStudentId}_${lessonId}`;
  const currentProgress = studentProgress ? studentProgress[userProgressKey] : undefined;
  const userQuizAttempts = (quizAttempts && quizAttempts[userProgressKey]) || [];
  const currentMastery = studentMasteries ? studentMasteries[userProgressKey] : undefined;

  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [finishSuccess, setFinishSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (activePublishedVersion && !isGuest && userData) {
      startLessonProgress({
        lessonId,
        versionId: activePublishedVersion.id,
        studentId: currentStudentId
      }).then(({ data }) => {
        if (data && data.sectionsCompleted) {
          updateStudentContentProgress(currentStudentId, lessonId, data.sectionsCompleted, data.completionPercent);
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
    }
  }, [lessonId, activePublishedVersion?.id, isGuest, userData?.id, currentStudentId]);

  const handleFinishLesson = async () => {
    if (isFinishing || !activePublishedVersion) return;
    setIsFinishing(true);
    setFinishError(null);

    try {
      const res = await completeLessonProgress({
        lessonId,
        versionId: activePublishedVersion.id,
        studentId: currentStudentId
      });

      if (res.error) {
        setFinishError(res.error.message || (lang === 'ar' ? 'تعذر حفظ إتمام الدرس' : 'Failed to save lesson completion'));
        setIsFinishing(false);
        return;
      }

      const allSecIds = (activePublishedVersion.sections || []).map(s => s.id);
      updateStudentContentProgress(currentStudentId, lessonId, allSecIds, 100);
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
      } else if (res.isFirstCompletion && res.pointsEarned && res.pointsEarned > 0 && userData) {
        try {
          await addPoints(res.pointsEarned);
        } catch (e) {
          console.warn('Error applying first-time completion points:', e);
        }
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
      setFinishSuccess(true);
    } catch (err: any) {
      console.error(err);
      setFinishError(err?.message || (lang === 'ar' ? 'فشل حفظ الإتمام' : 'Error saving completion'));
      setIsFinishing(false);
    }
  };

  // Quiz View Mode: Render Tiered Sunday School Quiz View
  if (isTakingQuiz && activePublishedVersion.quizDraft) {
    return (
      <div className="px-4 pt-4 pb-20">
        <SundaySchoolQuizView
          quiz={activePublishedVersion.quizDraft}
          lessonId={lessonId}
          studentId={currentStudentId}
          onBackToLesson={() => setIsTakingQuiz(false)}
          onSubmitAttempt={async (attempt) => {
            if (activePublishedVersion) {
              const { data } = await submitStudentQuizAttempt({
                lessonId,
                versionId: activePublishedVersion.id,
                quizId: attempt.quizId,
                answers: attempt.answers.map(a => ({
                  questionId: a.questionId,
                  selectedOptionIndex: a.selectedOptionIndex
                })),
                score: attempt.score,
                percentage: attempt.percentage,
                earnedPoints: attempt.earnedPoints,
                totalPointsPossible: attempt.totalPointsPossible
              });
              if (data) {
                recordQuizAttempt(data);
              }

              // Evaluate student mastery after quiz attempt
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
            } else {
              recordQuizAttempt(attempt);
            }

            const pointsToAdd = attempt.earnedPoints || (attempt.score * 20);
            if (userData && pointsToAdd > 0) {
              try {
                await addPoints(pointsToAdd);
              } catch (e) {
                console.warn(e);
              }
            }
          }}
          onReviewSection={(secId) => {
            setTargetSectionId(secId);
            setIsTakingQuiz(false);
          }}
        />
      </div>
    );
  }

  // Playful Rich Student Lesson Story Reader Mode
  return (
    <div className="px-4 pt-4 pb-20">
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
        targetSectionId={targetSectionId}
        onFinishLesson={handleFinishLesson}
        isFinishing={isFinishing}
        finishError={finishError}
        finishSuccess={finishSuccess}
        onNavigateHome={onBack}
        onMarkSectionRead={async (sectionId, totalSections) => {
          const existingSections = currentProgress?.sectionsCompleted || [];
          const newSections = existingSections.includes(sectionId)
            ? existingSections
            : [...existingSections, sectionId];
          const pct = Math.round((newSections.length / totalSections) * 100);
          updateStudentContentProgress(currentStudentId, lessonId, newSections, pct);

          if (activePublishedVersion) {
            const { data } = await completeSectionProgress({
              lessonId,
              versionId: activePublishedVersion.id,
              sectionId,
              studentId: currentStudentId
            });
            if (data) {
              updateStudentContentProgress(currentStudentId, lessonId, data.sectionsCompleted, data.completionPercent);
              if (data.status === 'COMPLETED' || data.completionPercent >= 90) {
                markCompleted(lessonId);
                setFinishSuccess(true);
              }
            }
          }
        }}
        onCompleteContent={handleFinishLesson}
        onStartQuiz={() => {
          setTargetSectionId(undefined);
          setIsTakingQuiz(true);
        }}
      />
    </div>
  );
}
