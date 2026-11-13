import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Eye,
  GraduationCap,
  Music,
  ScrollText,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLessons } from '../../context/LessonsContext';
import { SundaySchoolLessonView } from '../sunday-school/student/SundaySchoolLessonView';
import { SundaySchoolQuizView } from '../sunday-school/student/SundaySchoolQuizView';
import type { CopticHymnItem } from '../../data/hymnsData';
import { CANONICAL_GRADES, findCanonicalGrade, findClassGroupForGrade } from '../../lib/classGroups';
import { isSupabaseConfigured } from '../../lib/supabase';
import { loadServantPreviewSchoolContent } from '../../lib/servantPreview';
import type { Language, Lesson, LessonVersion, QuizDraft, StudentContentProgress, TaxisItem } from '../../types';

type PreviewScreen = 'home' | 'lessons' | 'lesson' | 'quiz' | 'hymns' | 'taxis' | 'achievements';

const PREVIEW_STUDENT_ID = 'temporary-preview-session';
const GRADE_OPTIONS = Object.values(CANONICAL_GRADES);

function getPublishedVersion(
  lesson: Lesson,
  versions: LessonVersion[]
): LessonVersion | null {
  const activeVersionId = lesson.currentVersionId;
  if (!activeVersionId) return null;

  const version = [lesson.latestVersion, ...versions].find(candidate =>
    candidate?.id === activeVersionId && candidate.status === 'PUBLISHED'
  );
  return version && Array.isArray(version.sections) && version.sections.length > 0 ? version : null;
}

function getPreviewQuiz(lesson: Lesson | null, version: LessonVersion | null): QuizDraft | null {
  if (version?.quizDraft?.questions.length) return version.quizDraft;
  if (!lesson?.quiz?.length) return null;

  return {
    id: `preview-quiz-${lesson.id}`,
    lessonId: lesson.id,
    titleEn: `${lesson.title} Review`,
    titleAr: `مراجعة ${lesson.titleAr || lesson.title}`,
    status: 'APPROVED',
    questions: lesson.quiz.map((question, index) => ({
      id: question.id || `preview-question-${index + 1}`,
      type: 'multiple_choice',
      questionEn: question.question,
      questionAr: question.question,
      optionsEn: question.options,
      optionsAr: question.options,
      correctIndex: question.correctIndex,
      explanationEn: 'Review the published lesson content.',
      explanationAr: 'راجع محتوى الدرس المنشور.'
    }))
  };
}

interface StudentExperiencePreviewProps {
  lang: Language;
  initialLessonId?: string | null;
}

export function StudentExperiencePreview({ lang, initialLessonId }: StudentExperiencePreviewProps) {
  const isAr = lang === 'ar';
  const { userData, isGuest } = useAuth();
  const {
    lessons,
    lessonVersions,
    lessonSources,
    curriculumLoading,
    curriculumError,
    curriculumLoadedForUserId
  } = useLessons();
  const isOnlineAuth = Boolean(!isGuest && userData && isSupabaseConfigured);
  const [gradeCode, setGradeCode] = useState(CANONICAL_GRADES.grade_4.code);
  const [hymnsTaxisLevel, setHymnsTaxisLevel] = useState<1 | 2 | 3>(1);
  const [screen, setScreen] = useState<PreviewScreen>(initialLessonId ? 'lesson' : 'home');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(initialLessonId || null);
  const [readSectionsByLesson, setReadSectionsByLesson] = useState<Record<string, string[]>>({});
  const [schoolContent, setSchoolContent] = useState<{ hymns: CopticHymnItem[]; taxis: TaxisItem[] }>({
    hymns: [],
    taxis: []
  });
  const [schoolContentLoading, setSchoolContentLoading] = useState(false);
  const [schoolContentError, setSchoolContentError] = useState<string | null>(null);
  const [selectedHymnId, setSelectedHymnId] = useState<string | null>(null);
  const [selectedTaxisId, setSelectedTaxisId] = useState<string | null>(null);
  const [targetSectionId, setTargetSectionId] = useState<string | undefined>();

  const selectedGrade = findCanonicalGrade(gradeCode) || CANONICAL_GRADES.grade_4;
  const classGroupId = selectedGrade.classGroupId;
  const curriculumReady = isOnlineAuth &&
    !curriculumLoading &&
    !curriculumError &&
    curriculumLoadedForUserId === userData?.id;

  const publishedLessons = useMemo(() => {
    if (!curriculumReady) return [];
    return lessons.filter(lesson => {
      if (lesson.status !== 'published') return false;
      const lessonGroup = lesson.classGroupId
        ? lesson.classGroupId
        : lesson.grade
          ? findClassGroupForGrade(lesson.grade)?.id
          : null;
      if (lessonGroup && lessonGroup !== classGroupId) return false;
      return Boolean(getPublishedVersion(lesson, lessonVersions[lesson.id] || []));
    });
  }, [classGroupId, curriculumReady, lessonVersions, lessons]);

  const selectedLesson = publishedLessons.find(lesson => lesson.id === selectedLessonId) || null;
  const selectedVersion = selectedLesson
    ? getPublishedVersion(selectedLesson, lessonVersions[selectedLesson.id] || [])
    : null;
  const selectedQuiz = getPreviewQuiz(selectedLesson, selectedVersion);
  const completedSectionIds = selectedLesson
    ? readSectionsByLesson[selectedLesson.id] || []
    : [];
  const simulatedProgress: StudentContentProgress | undefined = selectedLesson && selectedVersion
    ? {
        studentId: PREVIEW_STUDENT_ID,
        lessonId: selectedLesson.id,
        versionId: selectedVersion.id,
        status: completedSectionIds.length > 0 ? 'IN_PROGRESS' : 'OPENED',
        sectionsCompleted: completedSectionIds,
        totalSections: selectedVersion.sections.length,
        completionPercent: Math.round((completedSectionIds.length / selectedVersion.sections.length) * 100)
      }
    : undefined;

  useEffect(() => {
    let active = true;
    if (!isOnlineAuth) {
      setSchoolContent({ hymns: [], taxis: [] });
      setSchoolContentLoading(false);
      setSchoolContentError(null);
      return () => { active = false; };
    }

    setSchoolContentLoading(true);
    setSchoolContentError(null);
    loadServantPreviewSchoolContent(hymnsTaxisLevel, selectedGrade.code)
      .then(content => {
        if (!active) return;
        setSchoolContent(content);
        setSelectedHymnId(current => content.hymns.some(item => item.id === current) ? current : content.hymns[0]?.id || null);
        setSelectedTaxisId(current => content.taxis.some(item => item.id === current) ? current : content.taxis[0]?.id || null);
      })
      .catch(error => {
        if (!active) return;
        setSchoolContent({ hymns: [], taxis: [] });
        setSchoolContentError(error instanceof Error ? error.message : (isAr ? 'تعذر تحميل المنهج المنشور.' : 'Could not load published curriculum.'));
      })
      .finally(() => {
        if (active) setSchoolContentLoading(false);
      });
    return () => { active = false; };
  }, [hymnsTaxisLevel, isAr, isOnlineAuth, selectedGrade.code]);

  useEffect(() => {
    if (!curriculumReady) return;
    if (selectedLessonId && !publishedLessons.some(lesson => lesson.id === selectedLessonId)) {
      setSelectedLessonId(null);
      setScreen('lessons');
    }
  }, [curriculumReady, publishedLessons, selectedLessonId]);

  const updateReadSection = async (sectionId: string) => {
    if (!selectedLesson) return;
    setReadSectionsByLesson(current => {
      const currentIds = current[selectedLesson.id] || [];
      const nextIds = currentIds.includes(sectionId)
        ? currentIds.filter(id => id !== sectionId)
        : [...currentIds, sectionId];
      return { ...current, [selectedLesson.id]: nextIds };
    });
  };

  const selectedHymn = schoolContent.hymns.find(item => item.id === selectedHymnId);
  const selectedTaxis = schoolContent.taxis.find(item => item.id === selectedTaxisId);
  const screens: Array<{ id: PreviewScreen; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: isAr ? 'الرئيسية' : 'Home', icon: <Sparkles size={16} /> },
    { id: 'lessons', label: isAr ? 'الدروس' : 'Lessons', icon: <BookOpen size={16} /> },
    { id: 'lesson', label: isAr ? 'قراءة الدرس' : 'Read lesson', icon: <Eye size={16} /> },
    { id: 'quiz', label: isAr ? 'الاختبار' : 'Quiz', icon: <CheckCircle2 size={16} /> },
    { id: 'hymns', label: isAr ? 'الألحان' : 'Hymns', icon: <Music size={16} /> },
    { id: 'taxis', label: isAr ? 'طقس الكنيسة' : 'Coptic Taxis', icon: <ScrollText size={16} /> },
    { id: 'achievements', label: isAr ? 'الإنجازات' : 'Achievements', icon: <Award size={16} /> }
  ];

  const previewUnavailableMessage = !isOnlineAuth
    ? (isAr ? 'المعاينة تحتاج جلسة خادم موثقة واتصالاً بالمنهج المنشور.' : 'Preview requires a verified Servant session and live published curriculum.')
    : curriculumLoading || curriculumLoadedForUserId !== userData?.id
      ? (isAr ? 'بنحمّل المنهج المنشور...' : 'Loading published curriculum...')
      : curriculumError
        ? (isAr ? `تعذر تحميل المنهج المنشور: ${curriculumError}` : `Published curriculum could not be loaded: ${curriculumError}`)
        : null;

  return (
    <section className="space-y-5" dir="rtl" aria-label={isAr ? 'معاينة رحلة التلميذ' : 'Student experience preview'}>
      <div className="sticky top-0 z-30 rounded-2xl border-2 border-amber-400 bg-amber-100 px-4 py-3 text-center text-sm font-black text-amber-950 shadow-md dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
        معاينة فقط — لن يتم حفظ أي تقدم
        <span className="mx-2 hidden sm:inline">•</span>
        <span className="block font-bold sm:inline">{isAr ? 'أي تفاعل هنا مؤقت داخل المعاينة فقط.' : 'All interactions are temporary and stay in this preview only.'}</span>
      </div>

      <header className="rounded-3xl border border-[var(--mousa-border-sand)] bg-gradient-to-br from-[var(--mousa-teal-deep)] via-[#164e50] to-[#302414] p-5 text-white shadow-lg sm:p-7">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white/10 p-3 text-amber-200"><GraduationCap size={26} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wide text-amber-200">{isAr ? 'مساحة الخادم' : 'Servant workspace'}</p>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">{isAr ? 'معاينة رحلة التلميذ' : 'Student Experience Preview'}</h2>
            <p className="mt-2 text-sm text-white/80">{isAr ? 'اختار الصف ومستوى الألحان والطقس عشان تشوف المنهج المنشور للتلميذ.' : 'Choose a grade and Hymns/Taxis level to preview the published student curriculum.'}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-bold">
            <span>{isAr ? 'الصف الدراسي' : 'Sunday School grade'}</span>
            <select value={gradeCode} onChange={event => {
              setGradeCode(event.target.value);
              setSelectedLessonId(null);
              setReadSectionsByLesson({});
              setScreen('home');
            }} className="min-h-11 w-full rounded-xl border border-white/20 bg-white px-3 text-sm font-bold text-stone-900">
              {GRADE_OPTIONS.map(grade => <option key={grade.id} value={grade.code}>{isAr ? grade.name.ar : grade.name.en}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-xs font-bold">
            <span>{isAr ? 'مستوى الألحان والطقس' : 'Hymns & Taxis level'}</span>
            <select value={hymnsTaxisLevel} onChange={event => {
              setHymnsTaxisLevel(Number(event.target.value) as 1 | 2 | 3);
              setReadSectionsByLesson({});
            }} className="min-h-11 w-full rounded-xl border border-white/20 bg-white px-3 text-sm font-bold text-stone-900">
              {[1, 2, 3].map(level => <option key={level} value={level}>{isAr ? `المستوى ${level}` : `Level ${level}`}</option>)}
            </select>
          </label>
        </div>
      </header>

      <nav aria-label={isAr ? 'أقسام معاينة التلميذ' : 'Student preview navigation'} className="flex gap-2 overflow-x-auto rounded-2xl border border-[var(--mousa-border-sand)] bg-white p-2 dark:bg-stone-900">
        {screens.map(item => (
          <button key={item.id} type="button" onClick={() => setScreen(item.id)} aria-current={screen === item.id ? 'page' : undefined}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-black transition-colors ${screen === item.id ? 'bg-[var(--mousa-teal)] text-white' : 'text-[var(--mousa-teal-deep)] hover:bg-[var(--mousa-sand-100)] dark:text-stone-100 dark:hover:bg-stone-800'}`}>
            {item.icon}{item.label}
          </button>
        ))}
      </nav>

      {previewUnavailableMessage && (
        <p role={curriculumError ? 'alert' : 'status'} className={`rounded-2xl border p-4 text-sm font-bold ${curriculumError ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-amber-300 bg-amber-50 text-amber-950'}`}>
          {previewUnavailableMessage}
        </p>
      )}

      {screen === 'home' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-[var(--mousa-border-sand)] bg-[var(--mousa-cream-surface)] p-5 shadow-sm dark:bg-[#1E1914]">
            <p className="text-xs font-black text-[var(--mousa-gold-dark)]">{isAr ? 'أهلاً يا بطل!' : 'Welcome, student!'}</p>
            <h3 className="mt-1 text-2xl font-black text-[var(--mousa-teal-deep)] dark:text-amber-100">{isAr ? 'رحلتك مع الأنبا موسى' : 'Your Journey with St. Moses'}</h3>
            <p className="mt-2 text-sm text-[var(--mousa-sand-600)] dark:text-stone-300">{isAr ? `${selectedGrade.name.ar} · المستوى ${hymnsTaxisLevel}` : `${selectedGrade.name.en} · Level ${hymnsTaxisLevel}`}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4 dark:bg-stone-900"><strong className="block text-2xl text-[var(--mousa-teal)]">{publishedLessons.length}</strong><span className="text-xs font-bold">{isAr ? 'دروس منشورة' : 'Published lessons'}</span></div>
              <div className="rounded-2xl bg-white p-4 dark:bg-stone-900"><strong className="block text-2xl text-[var(--mousa-coral)]">{simulatedProgress?.completionPercent || 0}%</strong><span className="text-xs font-bold">{isAr ? 'تقدم تجريبي' : 'Simulated progress'}</span></div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setScreen('lessons')} className="rounded-2xl border border-[var(--mousa-border-sand)] bg-white p-4 text-start shadow-sm dark:bg-stone-900">
              <span className="font-black text-[var(--mousa-teal-deep)] dark:text-amber-100">{isAr ? 'كمّل دروسك' : 'Continue your lessons'}</span>
              <span className="mt-1 block text-sm text-[var(--mousa-sand-500)]">{isAr ? 'استكشف الدروس المنشورة لصفك.' : 'Explore published lessons for this grade.'}</span>
            </button>
            <button type="button" onClick={() => setScreen('hymns')} className="rounded-2xl border border-[var(--mousa-border-sand)] bg-white p-4 text-start shadow-sm dark:bg-stone-900">
              <span className="font-black text-[var(--mousa-teal-deep)] dark:text-amber-100">{isAr ? 'مدرسة الألحان والطقس' : 'Hymns & Taxis School'}</span>
              <span className="mt-1 block text-sm text-[var(--mousa-sand-500)]">{isAr ? 'منهج المستوى المحدد.' : 'Curriculum for the selected level.'}</span>
            </button>
          </div>
        </div>
      )}

      {screen === 'lessons' && (
        <section className="space-y-3">
          <h3 className="text-lg font-black text-[var(--mousa-teal-deep)] dark:text-amber-100">{isAr ? 'دروس مدارس الأحد المنشورة' : 'Published Sunday School lessons'}</h3>
          {curriculumReady && publishedLessons.length === 0 && <p className="rounded-2xl border border-[var(--mousa-border-sand)] bg-white p-5 text-sm dark:bg-stone-900">{isAr ? 'لا توجد دروس منشورة لهذا الصف حالياً.' : 'There are no published lessons for this grade yet.'}</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {publishedLessons.map((lesson, index) => {
              const version = getPublishedVersion(lesson, lessonVersions[lesson.id] || []);
              const completedCount = readSectionsByLesson[lesson.id]?.length || 0;
              return (
                <button key={lesson.id} type="button" onClick={() => { setSelectedLessonId(lesson.id); setTargetSectionId(undefined); setScreen('lesson'); }}
                  className="rounded-2xl border border-[var(--mousa-border-sand)] bg-white p-4 text-start shadow-sm transition hover:border-[var(--mousa-teal)] dark:bg-stone-900">
                  <span className="flex items-center justify-between gap-3"><strong className="font-black text-[var(--mousa-teal-deep)] dark:text-amber-100">{isAr ? lesson.titleAr || lesson.title : lesson.title}</strong><span className="rounded-full bg-[var(--mousa-sand-100)] px-2 py-1 text-[10px] font-black dark:bg-stone-800">{isAr ? `درس ${index + 1}` : `Lesson ${index + 1}`}</span></span>
                  <span className="mt-2 block text-sm text-[var(--mousa-sand-500)]">{isAr ? version?.bigIdeaAr || lesson.summaryAr || lesson.summary : version?.bigIdeaEn || lesson.summary}</span>
                  <span className="mt-3 flex items-center gap-2 text-xs font-bold text-[var(--mousa-teal)]"><span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700"><span className="block h-full bg-[var(--mousa-gold)]" style={{ width: `${version ? Math.round((completedCount / version.sections.length) * 100) : 0}%` }} /></span>{version ? Math.round((completedCount / version.sections.length) * 100) : 0}%</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {screen === 'lesson' && (
        selectedLesson && selectedVersion ? (
          <SundaySchoolLessonView
            lesson={selectedLesson}
            version={selectedVersion}
            sources={lessonSources.filter(source => source.lessonId === selectedLesson.id)}
            progress={simulatedProgress}
            quizAttempts={[]}
            onBack={() => setScreen('lessons')}
            onMarkSectionRead={async sectionId => updateReadSection(sectionId)}
            onStartQuiz={() => setScreen('quiz')}
            onNavigateHome={() => setScreen('home')}
            lang={lang}
            isOnlineAuth={isOnlineAuth}
            readOnly
            previewMode
            targetSectionId={targetSectionId}
          />
        ) : (
          <p role="status" className="rounded-2xl border border-[var(--mousa-border-sand)] bg-white p-5 text-sm dark:bg-stone-900">
            {isAr ? 'اختار درساً منشوراً من قائمة الدروس عشان تبدأ المعاينة.' : 'Choose a published lesson from the lesson list to start the preview.'}
            <button type="button" onClick={() => setScreen('lessons')} className="ms-2 font-black text-[var(--mousa-teal)]">{isAr ? 'عرض الدروس' : 'Browse lessons'}</button>
          </p>
        )
      )}

      {screen === 'quiz' && (
        selectedLesson && selectedQuiz ? (
          <SundaySchoolQuizView
            quiz={selectedQuiz}
            lessonId={selectedLesson.id}
            studentId={PREVIEW_STUDENT_ID}
            lang={lang}
            previewMode
            onBackToLesson={() => setScreen('lesson')}
            onSubmitAttempt={async () => ({
              success: false,
              error: isAr ? 'لا يمكن إرسال الاختبار في وضع المعاينة.' : 'Quiz submissions are disabled in preview mode.'
            })}
            onReviewSection={sectionId => {
              setTargetSectionId(sectionId);
              setScreen('lesson');
            }}
          />
        ) : (
          <div className="rounded-2xl border border-[var(--mousa-border-sand)] bg-white p-5 dark:bg-stone-900">
            <h3 className="font-black text-[var(--mousa-teal-deep)] dark:text-amber-100">{isAr ? 'اختبار مراجعة الدرس' : 'Lesson review quiz'}</h3>
            <p className="mt-2 text-sm text-[var(--mousa-sand-500)]">{selectedLesson ? (isAr ? 'لا يوجد اختبار منشور لهذا الدرس.' : 'There is no published quiz for this lesson.') : (isAr ? 'اختار درساً منشوراً لعرض اختباره.' : 'Choose a published lesson to view its quiz.')}</p>
            <button type="button" onClick={() => setScreen('lessons')} className="mt-4 rounded-xl bg-[var(--mousa-teal)] px-4 py-2 text-sm font-black text-white">{isAr ? 'اختيار درس' : 'Choose a lesson'}</button>
          </div>
        )
      )}

      {screen === 'hymns' && (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="space-y-2 rounded-2xl border border-[var(--mousa-border-sand)] bg-white p-4 dark:bg-stone-900">
            <h3 className="mb-3 font-black text-[var(--mousa-teal-deep)] dark:text-amber-100">{isAr ? 'الألحان المنشورة' : 'Published Hymns'}</h3>
            {schoolContentLoading && <p role="status" className="text-sm">{isAr ? 'بنحمّل الألحان...' : 'Loading Hymns...'}</p>}
            {!schoolContentLoading && schoolContent.hymns.length === 0 && !schoolContentError && <p className="text-sm text-[var(--mousa-sand-500)]">{isAr ? 'لا توجد ألحان منشورة لهذا المستوى.' : 'No published Hymns for this level.'}</p>}
            {schoolContent.hymns.map(hymn => <button key={hymn.id} type="button" onClick={() => setSelectedHymnId(hymn.id)} className={`w-full rounded-xl p-3 text-start text-sm font-bold ${hymn.id === selectedHymnId ? 'bg-[var(--mousa-teal)] text-white' : 'bg-[var(--mousa-sand-50)] dark:bg-stone-800'}`}>{isAr ? hymn.titleAr || hymn.titleEn : hymn.titleEn}</button>)}
          </div>
          <div className="rounded-2xl border border-[var(--mousa-border-sand)] bg-[var(--mousa-cream-surface)] p-5 dark:bg-[#1E1914]">
            {selectedHymn ? <><p className="text-xs font-black uppercase text-[var(--mousa-gold-dark)]">{isAr ? `المستوى ${selectedHymn.level}` : `Level ${selectedHymn.level}`}</p><h3 className="mt-2 text-xl font-black text-[var(--mousa-teal-deep)] dark:text-amber-100">{isAr ? selectedHymn.titleAr || selectedHymn.titleEn : selectedHymn.titleEn}</h3><p className="mt-3 text-sm leading-relaxed text-[var(--mousa-sand-600)] dark:text-stone-300">{isAr ? selectedHymn.descriptionAr || selectedHymn.descriptionEn : selectedHymn.descriptionEn}</p><audio className="mt-4 w-full" controls preload="none" src={selectedHymn.audioUrl}>{isAr ? 'المتصفح لا يدعم تشغيل الصوت.' : 'Your browser does not support audio playback.'}</audio><div className="mt-4 space-y-3">{selectedHymn.lines.map(line => <article key={line.id} className="rounded-xl bg-white p-4 dark:bg-stone-900"><p className="font-serif text-lg text-[var(--mousa-teal-deep)] dark:text-amber-100">{line.coptic}</p><p className="mt-1 text-sm text-[var(--mousa-sand-600)] dark:text-stone-300">{isAr ? line.arabic : line.arabized}</p></article>)}</div></> : <p className="text-sm">{isAr ? 'اختار لحناً لعرض تفاصيله.' : 'Select a Hymn to view its details.'}</p>}
          </div>
        </section>
      )}

      {screen === 'taxis' && (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="space-y-2 rounded-2xl border border-[var(--mousa-border-sand)] bg-white p-4 dark:bg-stone-900">
            <h3 className="mb-3 font-black text-[var(--mousa-teal-deep)] dark:text-amber-100">{isAr ? 'منهج الطقس المنشور' : 'Published Coptic Taxis'}</h3>
            {schoolContentLoading && <p role="status" className="text-sm">{isAr ? 'بنحمّل الطقس...' : 'Loading Taxis...'}</p>}
            {!schoolContentLoading && schoolContent.taxis.length === 0 && !schoolContentError && <p className="text-sm text-[var(--mousa-sand-500)]">{isAr ? 'لا توجد دروس طقس منشورة لهذا المستوى والصف.' : 'No published Taxis lessons for this grade and level.'}</p>}
            {schoolContent.taxis.map(item => <button key={item.id} type="button" onClick={() => setSelectedTaxisId(item.id)} className={`w-full rounded-xl p-3 text-start text-sm font-bold ${item.id === selectedTaxisId ? 'bg-[var(--mousa-teal)] text-white' : 'bg-[var(--mousa-sand-50)] dark:bg-stone-800'}`}>{isAr ? item.titleAr : item.titleEn}</button>)}
          </div>
          <div className="rounded-2xl border border-[var(--mousa-border-sand)] bg-[var(--mousa-cream-surface)] p-5 dark:bg-[#1E1914]">
            {selectedTaxis ? <><p className="text-xs font-black uppercase text-[var(--mousa-gold-dark)]">{isAr ? `المستوى ${selectedTaxis.level || hymnsTaxisLevel}` : `Level ${selectedTaxis.level || hymnsTaxisLevel}`}</p><h3 className="mt-2 text-xl font-black text-[var(--mousa-teal-deep)] dark:text-amber-100">{isAr ? selectedTaxis.titleAr : selectedTaxis.titleEn}</h3><p className="mt-3 text-sm leading-relaxed text-[var(--mousa-sand-600)] dark:text-stone-300">{isAr ? selectedTaxis.summaryAr : selectedTaxis.summaryEn}</p><div className="mt-4 space-y-3">{selectedTaxis.sections.map(section => <article key={section.id} className="rounded-xl bg-white p-4 dark:bg-stone-900"><h4 className="font-black text-[var(--mousa-teal-deep)] dark:text-amber-100">{isAr ? section.titleAr || section.titleEn : section.titleEn}</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--mousa-sand-600)] dark:text-stone-300">{isAr ? section.contentAr || section.contentEn : section.contentEn}</p></article>)}</div></> : <p className="text-sm">{isAr ? 'اختار درس طقس لعرض تفاصيله.' : 'Select a Taxis lesson to view its details.'}</p>}
          </div>
        </section>
      )}

      {screen === 'achievements' && (
        <section className="rounded-3xl border border-[var(--mousa-border-sand)] bg-white p-6 text-center shadow-sm dark:bg-stone-900">
          <Award className="mx-auto h-12 w-12 text-stone-400" />
          <h3 className="mt-3 text-xl font-black text-[var(--mousa-teal-deep)] dark:text-amber-100">{isAr ? 'إنجازاتك في المعاينة' : 'Preview achievements'}</h3>
          <p className="mt-2 text-sm text-[var(--mousa-sand-500)]">{isAr ? 'لا يتم تحميل سجلات إنجازات التلاميذ أو تعديلها في وضع المعاينة.' : 'Student achievement records are not loaded or changed in preview mode.'}</p>
          <span className="mt-4 inline-flex rounded-full bg-stone-100 px-4 py-2 text-xs font-black text-stone-700 dark:bg-stone-800 dark:text-stone-200">{isAr ? 'المعاينة لا تحفظ تقدماً' : 'Preview does not save progress'}</span>
        </section>
      )}

      {schoolContentError && (screen === 'hymns' || screen === 'taxis') && (
        <p role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm font-bold text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100">{schoolContentError}</p>
      )}
    </section>
  );
}
