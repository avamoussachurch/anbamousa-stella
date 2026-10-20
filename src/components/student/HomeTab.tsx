import React, { useState, useEffect } from 'react';
import { Flame, Medal, ChevronRight, Play, Cross, Sparkles, BookOpen, Compass, MapPin, Award, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { mockLessons } from '../../data';
import { BibleVerseCard } from '../shared/BibleVerseCard';
import { FamilyAltarCard } from './FamilyAltarCard';
import { useAuth } from '../../context/AuthContext';
import { useLessons } from '../../context/LessonsContext';
import { useStage } from '../../context/StageContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { getUserRank } from '../../lib/pointsService';
import { getClassGroupForGrade } from '../../lib/classGroups';
import { Language, Lesson } from '../../types';
import {
  MosesDuneHeroBanner,
  MosesStreakCard,
  MosesPointsTreasuryCard,
  MosesJourneyBadge
} from './JourneyOfMosesVisuals';
import { MosesLessonProgressBar } from './MosesLessonProgressBar';
import { MosesLiveJourneyIllustration } from './MosesLiveJourneyIllustration';

interface HomeTabProps {
  onNavigate: (tab: string, lessonId?: string) => void;
  onOpenTeacherStudio?: () => void;
  onOpenParentPortal?: () => void;
  lang: Language;
}

export function HomeTab({ onNavigate, onOpenTeacherStudio, onOpenParentPortal, lang }: HomeTabProps) {
  const { userData, isGuest } = useAuth();
  const { lessons, curriculumLoading, curriculumError, refreshCurriculum, contentProgress, refreshProgressSummary } = useLessons();
  const { currentStage } = useStage();
  const [badgeDismissed, setBadgeDismissed] = useState(false);

  useEffect(() => {
    if (refreshProgressSummary && userData?.id) {
      refreshProgressSummary().catch(() => {});
    }
  }, [userData?.id]);

  const isOnlineAuth = Boolean(!isGuest && userData && isSupabaseConfigured);

  // Fallback Rule (Phase 2A.2 correction):
  // mockLessons are used as fallback ONLY for Demo, Guest, or Offline/local mode.
  // For an authenticated online user, a Supabase/curriculum failure must NOT silently replace real curriculum with mockLessons.
  // If the online query fails, preserve the existing curriculumError/loading behavior instead.
  const isLessonFinished = (l: Lesson) => {
    if (l.isCompleted) return true;
    if (userData && contentProgress) {
      const p = contentProgress[`${userData.id}_${l.id}`];
      if (p && (p.status === 'COMPLETED' || p.completionPercent === 100)) return true;
    }
    return false;
  };

  const isCoptic = lang === 'copt' || lang === 'cop';
  const isTeacher = userData?.role === 'teacher';
  const isParent = userData?.role === 'parent';

  // Resolve student class group from requested or saved grade/class
  const studentGrade = userData?.requestedGrade || userData?.grade;
  const studentGroupId = userData?.requestedClassGroupId || (studentGrade ? getClassGroupForGrade(studentGrade)?.id : null) || 'primary_2';

  const rawLessons = (!isOnlineAuth ? mockLessons : (lessons || []));
  const activeLessonsList = isTeacher 
    ? rawLessons 
    : rawLessons.filter(l => {
        const lessonGroupId = l.classGroupId || (l.grade ? getClassGroupForGrade(l.grade)?.id : null);
        return !lessonGroupId || lessonGroupId === studentGroupId;
      });

  const nextLesson = activeLessonsList.find(l => !isLessonFinished(l)) || activeLessonsList[0] || null;
  const completedLessons = activeLessonsList.filter(isLessonFinished);
  const lastCompleted = completedLessons[completedLessons.length - 1];
  const hasCompletedMilestone = completedLessons.length > 0 || (userData?.points ?? 0) >= 100;

  const userRank = userData ? getUserRank(userData.id, userData) : null;

  if (!userData) return null;

  const totalLessonsCount = activeLessonsList.length;
  const completedCount = completedLessons.length;
  const progressPercentage = totalLessonsCount > 0 ? Math.round((completedCount / totalLessonsCount) * 100) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="pb-24 pt-6 px-4 w-full max-w-7xl mx-auto space-y-6"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* 1. Welcome Section: Illustrated Desert Dune Hero Banner ("Welcome, [name]") */}
      <motion.div 
        initial={{ y: -15, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: -10, opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <MosesDuneHeroBanner
          studentName={userData.fullName}
          stageName={lang === 'ar' ? currentStage?.nameAr : currentStage?.nameEn}
          stageIcon={currentStage?.icon}
          isTeacher={isTeacher}
          isParent={isParent}
          lang={lang}
          avatarUrl={userData.avatarUrl}
          streakDays={userData.currentStreak}
          totalPoints={userData.points}
        />
      </motion.div>

      {/* 2. Curriculum Milestones Completion (Placed directly below Welcome section) */}
      <motion.div 
        initial={{ y: -10, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        <MosesLessonProgressBar
          totalLessons={totalLessonsCount}
          completedLessons={completedCount}
          isLoading={isOnlineAuth && curriculumLoading}
          error={isOnlineAuth ? curriculumError : null}
          lang={lang}
          onExploreLessons={() => onNavigate('lessons')}
        />
      </motion.div>

      {/* The Journey of Moses: Milestone Completion Badge (using mousa-gold & mousa-coral) */}
      {hasCompletedMilestone && !badgeDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.3 }}
        >
          <MosesJourneyBadge
            completedLessonsCount={completedLessons.length || 1}
            lastCompletedLessonTitle={
              lastCompleted 
                ? (lang === 'ar' ? (lastCompleted.titleAr || lastCompleted.title) : lastCompleted.title)
                : (lang === 'ar' ? 'محطة برية شيهيت الأولى' : 'First Scetis Milestone')
            }
            pointsEarned={lastCompleted?.pointsAvailable || 50}
            lang={lang}
            onExploreMore={() => onNavigate('lessons')}
            onDismiss={() => setBadgeDismissed(true)}
            isRecentCompletion={Boolean(lastCompleted)}
          />
        </motion.div>
      )}

      {/* 3. Streak & Points Row: Desert Flame & Blessing Treasury */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <MosesStreakCard
          streakDays={userData.currentStreak}
          lang={lang}
        />
        <MosesPointsTreasuryCard
          points={userData.points}
          onNavigatePoints={() => onNavigate('points')}
          lang={lang}
        />
      </motion.div>

      {/* 4. The Journey of Moses: Live Journey Responsive Landscape (Time-of-day & Progress linked) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25, delay: 0.17 }}
      >
        <MosesLiveJourneyIllustration
          progressPercentage={progressPercentage}
          completedLessonsCount={completedCount}
          totalLessonsCount={totalLessonsCount}
          streakDays={userData.currentStreak}
          lang={lang}
        />
      </motion.div>

      {/* Quick Role Privilege Cards for Teachers / Parents */}
      {(isTeacher || isParent) && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }} 
          animate={{ opacity: 1, scale: 1 }} 
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.25, delay: 0.18 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {isTeacher && onOpenTeacherStudio && (
            <div className="bg-[#FAF5EB] dark:bg-[#25201A] border-2 border-[var(--mousa-gold)]/40 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <span className="text-2xl p-2 bg-white dark:bg-[#1C1814] rounded-xl shadow-2xs border border-[var(--mousa-border-sand)]">⛪</span>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-[var(--mousa-teal-deep)] dark:text-[var(--mousa-gold-light)]">
                    {lang === 'copt' ? 'Ⲡⲓⲙⲁⲛ̀ⲥⲃⲱ ⲛ̀ⲧⲉ ⲡⲓⲇⲓⲁⲕⲟⲛ' : lang === 'ar' ? 'استوديو الخادم وتحضير الدروس' : 'Sunday School Servant Studio'}
                  </h4>
                  <p className="text-[11px] text-[var(--mousa-sand-500)] dark:text-[var(--mousa-sand-400)]">
                    {lang === 'copt' ? 'Ⲑⲁⲙⲓⲟ ⲛ̀ⲛⲓⲥⲃⲱ ⲛⲉⲙ ⲛⲓⲇⲟⲕⲓⲙⲏ' : lang === 'ar' ? 'نشر الدروس، متابعة تقدم الطلاب والإشراف' : 'Publish manual lessons, monitor progress & moderate'}
                  </p>
                </div>
              </div>
              <button 
                onClick={onOpenTeacherStudio}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[var(--mousa-gold)] to-[var(--mousa-coral)] hover:brightness-110 text-white font-black text-xs shadow-xs transition-all cursor-pointer shrink-0"
              >
                {lang === 'copt' ? 'Ϣⲉ ⲉ̀ϧⲟⲩⲛ' : lang === 'ar' ? 'دخول الاستوديو' : 'Launch Studio'}
              </button>
            </div>
          )}

          {(isParent || isTeacher) && onOpenParentPortal && (
            <div className="bg-[#FAF5EB] dark:bg-[#25201A] border-2 border-[var(--mousa-coral)]/30 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <span className="text-2xl p-2 bg-white dark:bg-[#1C1814] rounded-xl shadow-2xs border border-[var(--mousa-border-sand)]">👨‍👩‍👧</span>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-[var(--mousa-coral-dark)] dark:text-[var(--mousa-coral-glow)]">
                    {lang === 'copt' ? 'Ⲡⲓⲡⲩⲗⲏ ⲛ̀ⲧⲉ ⲛⲓⲓⲟϯ' : lang === 'ar' ? 'بوابة متابعة الأبناء' : 'Parent Portal & Child Tracking'}
                  </h4>
                  <p className="text-[11px] text-[var(--mousa-sand-500)] dark:text-[var(--mousa-sand-400)]">
                    {lang === 'copt' ? 'Ⲛⲓⲁⲗⲱⲟⲩⲓ ⲛⲉⲙ ⲡⲟⲩⲧⲁⲓⲟ' : lang === 'ar' ? 'أوقات الشاشة، الحضور، وموافقة الجوائز' : 'Screen time, attendance & reward approvals'}
                  </p>
                </div>
              </div>
              <button 
                onClick={onOpenParentPortal}
                className="px-3.5 py-1.5 rounded-xl bg-[var(--mousa-teal)] hover:bg-[var(--mousa-teal-deep)] text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
              >
                {lang === 'copt' ? 'Ⲛⲁⲩ ⲉ̀ⲛⲓⲁⲗⲱⲟⲩⲓ' : lang === 'ar' ? 'عرض الأبناء' : 'View Children'}
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Bible Verse */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25, delay: 0.2 }}
        className="rounded-3xl border-2 border-[var(--mousa-border-sand)] overflow-hidden bg-[var(--mousa-cream-surface)] shadow-xs"
      >
        <BibleVerseCard lang={lang} />
      </motion.div>

      {/* Weekly Family Altar Prompt */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25, delay: 0.22 }}
        className="rounded-3xl border-2 border-[var(--mousa-border-sand)] overflow-hidden bg-[var(--mousa-cream-surface)] shadow-xs"
      >
        <FamilyAltarCard lang={lang} />
      </motion.div>

      {/* Main Grid: Today's Quest (Lesson) + Weekly Caravan Leaderboard */}
      <div className="md:grid md:grid-cols-2 md:gap-8 space-y-6 md:space-y-0 items-stretch">
        {/* Main Action - Today's Desert Milestone Quest */}
        {isOnlineAuth ? (
          curriculumLoading ? (
            <div className="mousa-quest-card p-6 md:p-8 flex flex-col justify-center items-center text-center space-y-3 min-h-[260px]">
              <div className="w-10 h-10 border-4 border-[var(--mousa-gold)] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-[var(--mousa-teal)] dark:text-[var(--mousa-sand-400)]">
                {lang === 'copt' || lang === 'cop'
                  ? 'Ⲥⲉⲓⲛⲓ ⲛ̀ⲛⲓⲥⲃⲱ ⲉ̀ⲃⲟⲗ...'
                  : lang === 'ar'
                    ? 'جاري تحميل محطة اليوم في البرية...'
                    : 'Loading online curriculum...'}
              </p>
            </div>
          ) : curriculumError ? (
            <div className="mousa-card-sand p-6 md:p-8 border-2 border-red-300 dark:border-red-900/60 flex flex-col justify-center items-center text-center space-y-3 min-h-[260px]">
              <div className="text-3xl">🏜️</div>
              <h3 className="text-base font-bold text-red-900 dark:text-red-300">
                {lang === 'copt' || lang === 'cop'
                  ? 'Ⲡⲓⲥⲱⲣⲉⲙ ϧⲉⲛ ⲡⲓⲱϣ'
                  : lang === 'ar'
                    ? 'تعذر تحميل منهج الخدام أونلاين'
                    : 'Unable to Load Online Curriculum'}
              </h3>
              <p className="text-xs text-[var(--mousa-sand-600)] dark:text-stone-400 max-w-sm">
                {curriculumError}
              </p>
              {refreshCurriculum && (
                <button
                  onClick={() => refreshCurriculum()}
                  className="px-4 py-2 rounded-xl bg-[var(--mousa-coral)] hover:brightness-110 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  {lang === 'copt' || lang === 'cop' ? 'Ⲟⲩⲁϩⲙⲉϥ' : lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                </button>
              )}
            </div>
          ) : nextLesson ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              transition={{ duration: 0.3, delay: 0.25 }} 
              className="mousa-quest-card p-6 md:p-8 flex flex-col justify-between h-full group"
            >
              {/* Illustrated Dune Backdrop Watermark */}
              <div className="absolute top-0 right-0 w-44 h-44 rounded-full bg-[var(--mousa-gold)]/10 blur-2xl pointer-events-none"></div>
              <div className="absolute -bottom-8 -left-8 text-[var(--mousa-gold)] opacity-10 pointer-events-none select-none">
                <Cross size={180} strokeWidth={1} />
              </div>
              
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[var(--mousa-gold)]/20 text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)] border border-[var(--mousa-gold)]/40">
                    <Compass size={14} className="text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)]" />
                    <span>{lang === 'copt' || lang === 'cop' ? 'Ϯⲥⲃⲱ ⲙ̀ⲫⲟⲟⲩ' : lang === 'ar' ? 'محطة اليوم في البرية' : "Today's Desert Quest"}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-[var(--mousa-coral-soft)] text-[var(--mousa-coral-dark)] dark:text-[var(--mousa-coral-glow)] border border-[var(--mousa-coral)]/30">
                    <Sparkles size={12} />
                    <span>+{nextLesson.pointsAvailable} {lang === 'copt' || lang === 'cop' ? 'ⲧⲁⲓⲟ' : lang === 'ar' ? 'نقطة بركة' : 'pts'}</span>
                  </span>
                </div>

                <h3 className="text-2xl md:text-3xl font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] leading-tight">
                  {lang === 'ar' ? (nextLesson.titleAr || nextLesson.title) : (lang === 'copt' || lang === 'cop' ? (nextLesson.titleCop || nextLesson.title) : nextLesson.title)}
                </h3>

                <p className="text-[var(--mousa-teal)] dark:text-[var(--mousa-sand-400)] text-sm md:text-base leading-relaxed line-clamp-3" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  {lang === 'ar' ? (nextLesson.summaryAr || nextLesson.summary) : (lang === 'copt' || lang === 'cop' ? (nextLesson.summaryCop || nextLesson.summary) : nextLesson.summary)}
                </p>
              </div>
              
              <div className="pt-6 relative z-10 mt-auto">
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onNavigate('lessons', nextLesson.id)}
                  className="w-full mousa-btn-quest py-4 md:py-4.5 px-6 text-base md:text-lg flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <Play size={20} className="fill-current" />
                  <span>
                    {lang === 'copt' || lang === 'cop' ? 'Ⲁⲣⲓϩⲏⲧⲥ ⲉ̀ϯⲥⲃⲱ' : lang === 'ar' ? 'انطلق في محطة اليوم' : 'Begin Milestone'}
                  </span>
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <div className="mousa-card-sand p-6 md:p-8 flex flex-col justify-center items-center text-center space-y-3 min-h-[260px]">
              <div className="w-14 h-14 rounded-2xl bg-[var(--mousa-sand-100)] dark:bg-stone-800 flex items-center justify-center text-2xl border border-[var(--mousa-border-sand)]">
                ⛪
              </div>
              <h3 className="text-lg font-bold text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
                {lang === 'copt' || lang === 'cop'
                  ? 'Ⲙ̀ⲙⲟⲛ ϩⲁⲛⲥⲃⲱ ⲉⲧϩⲓⲱⲓϣ'
                  : lang === 'ar'
                    ? 'في انتظار محطة الأحد القادمة'
                    : 'Awaiting Next Sunday Milestone'}
              </h3>
              <p className="text-xs text-[var(--mousa-sand-500)] dark:text-[var(--mousa-sand-400)] max-w-xs">
                {lang === 'copt' || lang === 'cop'
                  ? 'Ⲛⲓⲇⲓⲁⲕⲟⲛ ⲥⲉⲥⲟⲃϯ ⲛ̀ⲛⲓⲥⲃⲱ ⲛ̀ⲧⲉ ⲡⲉⲕⲧⲁⲝⲓⲥ.'
                  : lang === 'ar'
                    ? 'يقوم خدامك الكنسيون بتحضير المحطة التالية لمرحلتك قريباً.'
                    : 'Your Sunday School servants will publish lessons for your class soon.'}
              </p>
            </div>
          )
        ) : (
          /* Demo / Guest / Offline mode nextLesson */
          nextLesson && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              transition={{ duration: 0.3, delay: 0.25 }} 
              className="mousa-quest-card p-6 md:p-8 flex flex-col justify-between h-full group"
            >
              <div className="absolute top-0 right-0 w-44 h-44 rounded-full bg-[var(--mousa-gold)]/10 blur-2xl pointer-events-none"></div>
              <div className="absolute -bottom-8 -left-8 text-[var(--mousa-gold)] opacity-10 pointer-events-none select-none">
                <Cross size={180} strokeWidth={1} />
              </div>
              
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[var(--mousa-gold)]/20 text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)] border border-[var(--mousa-gold)]/40">
                    <Compass size={14} className="text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)]" />
                    <span>{lang === 'copt' || lang === 'cop' ? 'Ϯⲥⲃⲱ ⲙ̀ⲫⲟⲟⲩ' : lang === 'ar' ? 'محطة اليوم في البرية' : "Today's Desert Quest"}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-[var(--mousa-coral-soft)] text-[var(--mousa-coral-dark)] dark:text-[var(--mousa-coral-glow)] border border-[var(--mousa-coral)]/30">
                    <Sparkles size={12} />
                    <span>+{nextLesson.pointsAvailable} {lang === 'copt' || lang === 'cop' ? 'ⲧⲁⲓⲟ' : lang === 'ar' ? 'نقطة بركة' : 'pts'}</span>
                  </span>
                </div>

                <h3 className="text-2xl md:text-3xl font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] leading-tight">
                  {lang === 'ar' ? (nextLesson.titleAr || nextLesson.title) : (lang === 'copt' || lang === 'cop' ? (nextLesson.titleCop || nextLesson.title) : nextLesson.title)}
                </h3>

                <p className="text-[var(--mousa-teal)] dark:text-[var(--mousa-sand-400)] text-sm md:text-base leading-relaxed line-clamp-3" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  {lang === 'ar' ? (nextLesson.summaryAr || nextLesson.summary) : (lang === 'copt' || lang === 'cop' ? (nextLesson.summaryCop || nextLesson.summary) : nextLesson.summary)}
                </p>
              </div>
              
              <div className="pt-6 relative z-10 mt-auto">
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onNavigate('lessons', nextLesson.id)}
                  className="w-full mousa-btn-quest py-4 md:py-4.5 px-6 text-base md:text-lg flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <Play size={20} className="fill-current" />
                  <span>
                    {lang === 'copt' || lang === 'cop' ? 'Ⲁⲣⲓϩⲏⲧⲥ ⲉ̀ϯⲥⲃⲱ' : lang === 'ar' ? 'انطلق في محطة اليوم' : 'Begin Milestone'}
                  </span>
                </motion.button>
              </div>
            </motion.div>
          )
        )}

        {/* Weekly Caravan of Light - Leaderboard Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -10 }} 
          transition={{ duration: 0.3, delay: 0.3 }} 
          className="mousa-card-sand p-5 sm:p-7 flex flex-col justify-between h-full"
        >
          <div>
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-[var(--mousa-border-sand)]/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[var(--mousa-gold)] text-white shadow-xs">
                  <Trophy size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
                    {lang === 'copt' ? 'Ⲡⲓⲧⲁⲝⲓⲥ ⲛ̀ⲧⲉ ϯⲉⲃⲇⲟⲙⲁⲥ' : lang === 'ar' ? 'قافلة الأسبوع (الترتيب)' : 'Weekly Caravan Ranking'}
                  </h3>
                  <p className="text-xs text-[var(--mousa-sand-500)] dark:text-[var(--mousa-sand-400)]">
                    {lang === 'ar' ? 'رفقاء المسيرة في برية شيهيت' : 'Fellow travelers on the road'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => onNavigate('points')} 
                className="text-xs sm:text-sm font-extrabold text-[var(--mousa-coral)] dark:text-[var(--mousa-coral-glow)] flex items-center gap-0.5 hover:underline cursor-pointer"
              >
                <span>{lang === 'copt' ? 'Ⲛⲁⲩ ⲉ̀ⲡⲧⲏⲣϥ' : lang === 'ar' ? 'عرض القافلة' : 'View Caravan'}</span>
                <ChevronRight size={15} />
              </button>
            </div>
            
            {userRank && (
              <div className="flex items-center gap-3.5 p-3.5 sm:p-4 bg-gradient-to-r from-[#FFFDF9] to-[#FAF5EB] dark:from-[#25201A] dark:to-[#1C1814] rounded-2xl border-2 border-[var(--mousa-gold)]/40 shadow-xs mb-4">
                <div className="font-black text-lg sm:text-xl text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)] w-8 text-center">
                  #{userRank.rank}
                </div>
                <img 
                  src={userData.avatarUrl} 
                  alt="You" 
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-[var(--mousa-gold)] bg-white object-cover shadow-2xs" 
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-extrabold text-base text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] truncate">
                      {lang === 'copt' ? 'Ⲛ̀ⲑⲟⲕ' : lang === 'ar' ? 'أنت (مسافر النور)' : 'You'}
                    </p>
                    <span className="text-[10px] bg-[var(--mousa-gold)] text-[var(--mousa-teal-deep)] font-black px-1.5 py-0.5 rounded-md">
                      {isCoptic ? 'Ⲛ̀ⲑⲟⲕ' : lang === 'ar' ? 'أنت' : 'You'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--mousa-sand-500)] dark:text-[var(--mousa-sand-400)]">
                    {lang === 'ar' ? 'نقاط السعي هذا الأسبوع' : 'Points this week'}
                  </p>
                </div>
                <div className="font-black text-base sm:text-lg text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)]">
                  {userRank.pointsThisWeek} <span className="text-xs font-bold text-[var(--mousa-sand-500)]">pts</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--mousa-border-sand)]/60 text-center">
            <p className="text-xs sm:text-sm text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] font-medium">
              {lang === 'copt' ? 'Ⲁⲣⲓϩⲟⲧⲡ! ϯⲥⲃⲱ ⲛⲓⲃⲉⲛ ⲥⲱⲕ ⲙ̀ⲙⲟⲕ ⲉ̀ⲡϣⲱⲓ.' : lang === 'ar' ? 'عاش! كل محطة بتكملها بتقربك أكتر لنور البركة.' : 'Keep going! Every milestone brings you closer to the crown.'}
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
