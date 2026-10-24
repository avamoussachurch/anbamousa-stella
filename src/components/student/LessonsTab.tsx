import React, { useState, useMemo } from 'react';
import { BookOpen, CheckCircle, Clock, Search, Plus, Sparkles, Edit3, Eye, Filter, Music, AlertCircle, Scroll, Compass, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLessons } from '../../context/LessonsContext';
import { useAuth } from '../../context/AuthContext';
import { Lesson, Language } from '../../types';
import { LessonEditModal } from '../teacher/LessonEditModal';
import { ExpressLessonPublishModal } from '../teacher/ExpressLessonPublishModal';
import { formatStudentClassDisplay, getClassGroupForGrade } from '../../lib/classGroups';
import { StudentOnboardingModal } from '../auth/StudentOnboardingModal';
import { HymnsSchoolTab } from '../hymns/HymnsSchoolTab';
import { CopticTaxisTab } from '../taxis/CopticTaxisTab';
import { StudentRoadmapView } from './StudentRoadmapView';

interface LessonsTabProps {
  onStartLesson: (id: string) => void;
  onOpenTeacherStudio?: () => void;
  lang: Language;
}

export function LessonsTab({ onStartLesson, onOpenTeacherStudio, lang }: LessonsTabProps) {
  const { userData } = useAuth();
  const { lessons, updateLesson, refreshCurriculum, contentProgress } = useLessons();
  const [selectedSchool, setSelectedSchool] = useState<'sunday_school' | 'hymns' | 'taxis'>('sunday_school');
  const [displayMode, setDisplayMode] = useState<'roadmap' | 'cards'>('roadmap');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'published' | 'drafts'>('all');
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [showClassModal, setShowClassModal] = useState<boolean>(false);
  const [showExpressPublishModal, setShowExpressPublishModal] = useState<boolean>(false);

  const isTeacher = userData?.role === 'teacher';

  const isLessonFinished = (l: Lesson) => {
    if (l.isCompleted) return true;
    if (userData?.id && contentProgress) {
      const p = contentProgress[`${userData.id}_${l.id}`];
      if (p && (p.status === 'COMPLETED' || p.completionPercent === 100)) return true;
    }
    return false;
  };

  const filteredLessons = useMemo(() => {
    let result = lessons;

    // Filter by status if teacher chooses to filter
    if (isTeacher) {
      if (filterMode === 'published') {
        result = result.filter(l => l.status === 'published');
      } else if (filterMode === 'drafts') {
        result = result.filter(l => l.status === 'draft');
      }
    } else {
      // Students only see published lessons assigned to their Sunday School class
      result = result.filter(l => l.status === 'published');
      const studentGrade = userData?.requestedGrade || userData?.grade;
      const studentGroupId = userData?.requestedClassGroupId || (studentGrade ? getClassGroupForGrade(studentGrade)?.id : null);
      if (studentGroupId) {
        result = result.filter(l => {
          const lessonGroupId = l.classGroupId || (l.grade ? getClassGroupForGrade(l.grade)?.id : null);
          return !lessonGroupId || lessonGroupId === studentGroupId;
        });
      }
    }

    if (!searchQuery.trim()) return result;
    const query = searchQuery.toLowerCase();
    return result.filter(lesson => 
      lesson.title.toLowerCase().includes(query) ||
      (lesson.titleAr && lesson.titleAr.toLowerCase().includes(query)) ||
      (lesson.summary && lesson.summary.toLowerCase().includes(query)) ||
      (lesson.summaryAr && lesson.summaryAr.toLowerCase().includes(query))
    );
  }, [lessons, searchQuery, filterMode, isTeacher, userData?.requestedGrade, userData?.grade, userData?.requestedClassGroupId]);

  const decoratedLessons = useMemo(() => {
    return filteredLessons.map(l => ({
      ...l,
      isCompleted: isLessonFinished(l)
    }));
  }, [filteredLessons, contentProgress, userData?.id]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="pb-24 pt-6 px-4 w-full max-w-7xl mx-auto space-y-6" 
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* 3-Track Switcher: Sunday School, Hymns School, Coptic Rituals / Taxis */}
      <div className="flex bg-[var(--mousa-cream-surface)] dark:bg-[#1C1712] rounded-2xl p-1.5 shadow-xs border-2 border-[var(--mousa-border-sand)] max-w-2xl mx-auto gap-1">
        <button
          onClick={() => setSelectedSchool('sunday_school')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            selectedSchool === 'sunday_school'
              ? 'bg-[var(--mousa-gold)] text-[var(--mousa-teal-deep)] shadow-xs'
              : 'text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] hover:text-[var(--mousa-teal)]'
          }`}
        >
          <BookOpen size={16} />
          <span>{lang === 'ar' ? 'مدارس الأحد' : 'Sunday School'}</span>
        </button>

        <button
          onClick={() => setSelectedSchool('hymns')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            selectedSchool === 'hymns'
              ? 'bg-[var(--mousa-teal)] text-white shadow-xs'
              : 'text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] hover:text-[var(--mousa-teal)]'
          }`}
        >
          <Music size={16} />
          <span>{lang === 'ar' ? 'مدرسة الألحان' : 'Hymns'}</span>
        </button>

        <button
          onClick={() => setSelectedSchool('taxis')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            selectedSchool === 'taxis'
              ? 'bg-[var(--mousa-coral)] text-white shadow-xs'
              : 'text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] hover:text-[var(--mousa-teal)]'
          }`}
        >
          <Scroll size={16} />
          <span>{lang === 'ar' ? 'طقوس الكنيسة' : 'Rituals / Taxis'}</span>
        </button>
      </div>

      {selectedSchool === 'hymns' ? (
        <HymnsSchoolTab lang={lang} />
      ) : selectedSchool === 'taxis' ? (
        <CopticTaxisTab lang={lang} />
      ) : (
        <>
          {/* Sunday School Coming Soon Announcement Banner */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 font-bold">
              <span>
                {lang === 'ar' 
                  ? '📅 يجري حالياً استكمال منهج دروس مدارس الأحد الأسبوعي لجميع الفصول بواسطة الخدام — الدروس المنشورة لمرحلتك متاحة أدناه للمعاينة والدراسة.' 
                  : '📅 The Sunday School weekly curriculum for each class is being finalized by servants — published lessons for your class are available below.'}
              </span>
            </div>
          </div>

          {/* Top Banner & Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-[var(--mousa-teal)] p-2.5 md:p-3 rounded-2xl text-[var(--mousa-gold-glow)] shadow-xs">
                <BookOpen size={24} className="md:w-8 md:h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] md:text-3xl">
                  {lang === 'copt' ? 'Ⲛⲓⲥⲃⲱ ⲛ̀ⲧⲉ ϯⲉⲕⲕⲗⲏⲥⲓⲁ' : lang === 'ar' ? 'محطات دروس مدارس الأحد' : 'Sunday School Milestones'}
                </h1>
                <p className="text-xs md:text-sm text-[var(--mousa-sand-500)] dark:text-[var(--mousa-sand-400)]">
                  {lang === 'copt' ? 'Ϩⲁⲛⲥⲃⲱ ⲙ̀ⲡⲛⲉⲩⲙⲁⲧⲓⲕⲟⲛ ⲛⲉⲙ ⲛⲓⲇⲟⲕⲓⲙⲏ' : lang === 'ar' ? 'مسيرة الأنبا موسى الروحية، قصص كتابية واختبارات تفاعلية' : 'Journey of Moses spiritual trail, Bible stories & interactive quizzes'}
                </p>
              </div>
            </div>

        {/* Teacher Action Controls: Primary Publish Lesson Funnel */}
        {isTeacher && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowExpressPublishModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[var(--mousa-gold)] to-[var(--mousa-coral)] hover:brightness-105 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={16} className="stroke-[3]" />
              <span>{lang === 'copt' ? '+ Ϩⲓⲱⲓϣ ⲛ̀ϯⲥⲃⲱ' : lang === 'ar' ? '+ نشر درس جديد' : '+ Publish Lesson'}</span>
            </button>

            {onOpenTeacherStudio && (
              <button
                onClick={onOpenTeacherStudio}
                className="px-3.5 py-2.5 rounded-xl bg-[var(--mousa-cream-surface)] hover:bg-[var(--mousa-sand-100)] text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] font-bold text-xs sm:text-sm flex items-center gap-1.5 border border-[var(--mousa-border-sand)] transition-all cursor-pointer shadow-2xs"
              >
                <span>⛪</span>
                <span>{lang === 'ar' ? 'استوديو الخادم' : 'Teacher Studio'}</span>
              </button>
            )}
          </div>
        )}

        {/* Student Sunday School Class Selector / Status Pill */}
        {!isTeacher && (
          <button
            onClick={() => setShowClassModal(true)}
            className="px-3.5 py-2 rounded-2xl bg-[var(--mousa-cream-surface)] border border-[var(--mousa-border-sand)] text-xs font-bold text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] hover:border-[var(--mousa-gold)] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            title={lang === 'ar' ? 'تعديل أو مراجعة فصلك الدراسي' : 'Change or review your Sunday School class'}
          >
            <span>⛪</span>
            <span>
              {userData?.grade 
                ? (userData.activationStatus === 'PENDING_APPROVAL' 
                    ? (lang === 'ar' ? `قيد المراجعة: ${userData.grade}` : `Pending: ${userData.grade}`) 
                    : (lang === 'ar' ? `فصلي: ${userData.grade}` : `Class: ${userData.grade}`))
                : (lang === 'ar' ? 'تحديد فصل مدارس الأحد' : 'Select Class')}
            </span>
            <span className="text-[10px] text-[var(--mousa-coral)] font-bold underline">
              {lang === 'ar' ? 'تعديل' : 'Change'}
            </span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <div className={`absolute inset-y-0 ${lang === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
            <Search className="h-4 w-4 text-[var(--mousa-sand-500)]" />
          </div>
          <input
            type="text"
            placeholder={lang === 'copt' ? 'Ⲕⲱϯ ⲛ̀ⲥⲁ ⲟⲩⲥⲃⲱ...' : lang === 'ar' ? 'ابحث عن محطة أو درس في البرية...' : 'Search desert milestones or Bible stories...'}
            className={`block w-full rounded-2xl border border-[var(--mousa-border-sand)] bg-[var(--mousa-cream-surface)] py-2.5 ${lang === 'ar' ? 'pr-9 pl-4' : 'pl-9 pr-4'} text-xs sm:text-sm text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] placeholder-[var(--mousa-sand-500)] focus:border-[var(--mousa-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--mousa-gold)] transition-colors shadow-2xs`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* View Mode Switcher: Winding Roadmap (Candy Crush) vs Card Grid */}
          <div className="flex bg-[var(--mousa-cream-surface)] dark:bg-[#1C1712] p-1 rounded-2xl border border-[var(--mousa-border-sand)] text-xs font-bold gap-1 shadow-2xs">
            <button
              onClick={() => setDisplayMode('roadmap')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                displayMode === 'roadmap'
                  ? 'bg-[var(--mousa-teal)] text-white font-black shadow-xs'
                  : 'text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] hover:text-[var(--mousa-teal)]'
              }`}
            >
              <Compass size={14} />
              <span>{lang === 'ar' ? '🗺️ خريطة المسيرة' : '🗺️ Roadmap'}</span>
            </button>
            <button
              onClick={() => setDisplayMode('cards')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                displayMode === 'cards'
                  ? 'bg-[var(--mousa-teal)] text-white font-black shadow-xs'
                  : 'text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] hover:text-[var(--mousa-teal)]'
              }`}
            >
              <LayoutGrid size={14} />
              <span>{lang === 'ar' ? '📋 البطاقات' : '📋 Cards'}</span>
            </button>
          </div>

          {/* Teacher status filter tabs */}
          {isTeacher && (
            <div className="flex bg-[var(--mousa-sand-100)] dark:bg-stone-900 p-1 rounded-2xl text-xs font-bold text-[var(--mousa-sand-600)] border border-[var(--mousa-border-sand)]">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${filterMode === 'all' ? 'bg-[var(--mousa-gold)] text-[var(--mousa-teal-deep)] font-black shadow-2xs' : 'hover:text-[var(--mousa-teal-deep)]'}`}
              >
                {lang === 'copt' ? 'Ⲡⲧⲏⲣϥ' : lang === 'ar' ? 'الكل' : 'All'}
              </button>
              <button
                onClick={() => setFilterMode('published')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${filterMode === 'published' ? 'bg-[var(--mousa-gold)] text-[var(--mousa-teal-deep)] font-black shadow-2xs' : 'hover:text-[var(--mousa-teal-deep)]'}`}
              >
                {lang === 'copt' ? 'Ⲉⲧϩⲓⲱⲓϣ' : lang === 'ar' ? 'المنشورة' : 'Published'}
              </button>
              <button
                onClick={() => setFilterMode('drafts')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${filterMode === 'drafts' ? 'bg-[var(--mousa-gold)] text-[var(--mousa-teal-deep)] font-black shadow-2xs' : 'hover:text-[var(--mousa-teal-deep)]'}`}
              >
                {lang === 'copt' ? 'Ϩⲁⲛⲥϧⲁⲓ' : lang === 'ar' ? 'المسودات' : 'Drafts'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Either Candy Crush Roadmap or Cards Grid */}
      {displayMode === 'roadmap' ? (
        <StudentRoadmapView
          lessons={decoratedLessons}
          onStartLesson={onStartLesson}
          lang={lang}
          isTeacher={isTeacher}
          studentName={userData?.fullName}
          studentAvatar={userData?.avatarUrl}
          studentGrade={userData?.grade || userData?.requestedGrade}
        />
      ) : (
        /* Lesson Cards Grid */
        <div className="space-y-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:space-y-0">
        <AnimatePresence mode="popLayout">
          {decoratedLessons.length > 0 ? (
            decoratedLessons.map((lesson, index) => (
              <motion.div 
                key={lesson.id} 
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className={`rounded-3xl p-5 md:p-6 shadow-xs border-2 flex flex-col justify-between transition-all hover:shadow-md ${
                  lesson.isCompleted 
                    ? 'bg-[#FDFBF7] dark:bg-[#1E1914] border-[var(--mousa-gold)]/60' 
                    : 'bg-[var(--mousa-cream-surface)] dark:bg-[#221B15] border-[var(--mousa-border-sand)] hover:border-[var(--mousa-gold)]'
                }`}
              >
                {/* Card Header with Title & Badges */}
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-base md:text-lg text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] leading-snug">
                        {lang === 'ar' 
                          ? (lesson.titleAr || lesson.title) 
                          : lang === 'copt' || lang === 'cop'
                            ? (lesson.titleCop || lesson.title)
                            : lesson.title}
                      </h3>
                      {isTeacher && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                          lesson.status === 'published'
                            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {lesson.status === 'published' 
                            ? (lang === 'copt' || lang === 'cop' ? 'Ⲉⲧϩⲓⲱⲓϣ ✅' : lang === 'ar' ? 'منشور ✅' : 'Published') 
                            : (lang === 'copt' || lang === 'cop' ? 'Ϩⲁⲛⲥϧⲁⲓ 📝' : lang === 'ar' ? 'مسودة 📝' : 'Draft')}
                        </span>
                      )}
                      {lesson.grade && (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-[var(--mousa-sand-100)] text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] border border-[var(--mousa-border-sand)] flex items-center gap-1">
                          <span>{formatStudentClassDisplay(lesson.grade, lang).icon}</span>
                          <span>{formatStudentClassDisplay(lesson.grade, lang).fullDisplay}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {lesson.isCompleted ? (
                    <CheckCircle className="text-emerald-600 shrink-0" size={22} fill="currentColor" stroke="white" />
                  ) : (
                    <div className="bg-[var(--mousa-gold-soft)] text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)] border border-[var(--mousa-gold)]/30 text-xs font-black px-2.5 py-1 rounded-full whitespace-nowrap shadow-2xs">
                      +{lesson.pointsAvailable || 150} {lang === 'copt' || lang === 'cop' ? 'ⲧⲁⲓⲟ' : 'pts'}
                    </div>
                  )}
                </div>
                
                {/* Summary */}
                <p className="text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] text-xs md:text-sm mb-5 flex-1 leading-relaxed line-clamp-3" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  {lang === 'ar' 
                    ? (lesson.summaryAr || lesson.summary) 
                    : lang === 'copt' || lang === 'cop'
                      ? (lesson.summaryCop || lesson.summary)
                      : lesson.summary}
                </p>
                
                {/* Footer Actions */}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--mousa-border-sand)]/60 gap-2">
                  <span className="text-[11px] text-[var(--mousa-sand-500)] font-medium flex items-center gap-1">
                    <Clock size={13} /> 
                    <span>{lesson.date}</span>
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {/* Teacher Quick Edit Button */}
                    {isTeacher && (
                      <button
                        onClick={() => setEditingLesson(lesson)}
                        className="px-3 py-1.5 rounded-xl bg-[var(--mousa-sand-100)] text-[var(--mousa-teal)] hover:bg-[var(--mousa-sand-200)] text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border border-[var(--mousa-border-sand)]"
                        title={lang === 'copt' ? 'Ϣⲉⲃⲓⲱ' : lang === 'ar' ? 'تعديل هذا الدرس' : 'Edit lesson'}
                      >
                        <Edit3 size={13} />
                        <span>{lang === 'copt' ? 'Ϣⲉⲃⲓⲱ' : lang === 'ar' ? 'تعديل' : 'Edit'}</span>
                      </button>
                    )}

                    {/* Start / Review Button */}
                    <button 
                      onClick={() => onStartLesson(lesson.id)}
                      className={`px-4 py-2 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                        lesson.isCompleted 
                          ? 'bg-[var(--mousa-sand-100)] dark:bg-stone-800 text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] hover:bg-[var(--mousa-sand-200)]' 
                          : 'bg-gradient-to-r from-[var(--mousa-gold)] to-[var(--mousa-coral)] text-white hover:brightness-105 active:scale-95'
                      }`}
                    >
                      {isTeacher && <Eye size={14} />}
                      <span>
                        {lesson.isCompleted 
                          ? (lang === 'copt' ? 'Ⲟⲩⲁϩⲙⲉϥ' : lang === 'ar' ? 'مراجعة' : 'Review') 
                          : (isTeacher 
                              ? (lang === 'copt' ? 'Ⲛⲁⲩ' : lang === 'ar' ? 'معاينة' : 'Preview') 
                              : (lang === 'copt' ? 'Ⲁⲣⲓϩⲏⲧⲥ' : lang === 'ar' ? 'ابدأ المحطة' : 'Begin Milestone'))}
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 bg-[var(--mousa-cream-surface)] rounded-3xl border-2 border-[var(--mousa-border-sand)] shadow-xs col-span-full space-y-2"
            >
              <div className="text-3xl mb-2">🏜️</div>
              <h3 className="text-base font-bold text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
                {lang === 'copt' ? 'Ⲙ̀ⲙⲟⲛ ϩⲁⲛⲥⲃⲱ ⲉⲩϣⲱⲡ' : lang === 'ar' ? 'لا توجد دروس أو محطات مطابقة' : 'No milestones found'}
              </h3>
              <p className="text-xs text-[var(--mousa-sand-500)]">
                {lang === 'copt' ? 'Ⲕⲱϯ ϧⲉⲛ ϩⲁⲛⲥⲁϫⲓ ⲕⲉⲭⲱⲟⲩⲛⲓ.' : lang === 'ar' ? 'جرب البحث بكلمات أخرى أو تغيير الفلتر.' : 'Try adjusting your search terms or filter mode.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}

      {/* Teacher Lesson Edit Modal */}
      {editingLesson && (
        <LessonEditModal
          lesson={editingLesson}
          isOpen={Boolean(editingLesson)}
          onClose={() => setEditingLesson(null)}
          onSave={async (updates) => {
            updateLesson(editingLesson.id, updates);
            if (refreshCurriculum) {
              await refreshCurriculum();
            }
          }}
          lang={lang}
        />
      )}

      {/* Student Onboarding & Class Selection Modal */}
      {!isTeacher && (
        <StudentOnboardingModal
          isOpen={showClassModal}
          onClose={() => setShowClassModal(false)}
          lang={lang}
          onSuccess={() => {
            setShowClassModal(false);
          }}
        />
      )}

      {/* Express Lesson Publishing Modal (AI-Free Servant Funnel) */}
      <ExpressLessonPublishModal
        isOpen={showExpressPublishModal}
        onClose={() => setShowExpressPublishModal(false)}
        lang={lang === 'ar' ? 'ar' : 'en'}
        defaultGrade={userData?.grade || '4th Grade'}
        onLessonCreated={async () => {
          if (refreshCurriculum) {
            await refreshCurriculum();
          }
        }}
      />
        </>
      )}
    </motion.div>
  );
}
