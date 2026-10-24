import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Layers,
  Volume2,
  HelpCircle,
  Award,
  Mic,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Calendar,
  Check,
  Video,
  FileText,
  Image as ImageIcon,
  Presentation,
  Compass
} from 'lucide-react';
import {
  Lesson,
  LessonVersion,
  LessonSource,
  StudentContentProgress,
  StudentQuizAttempt,
  StudentMastery,
  PresentationSlide,
  Language
} from '../../../types';
import { SundaySchoolAudioPlayer } from '../viewers/SundaySchoolAudioPlayer';
import { InAppDocumentViewer } from '../viewers/InAppDocumentViewer';
import { formatStudentClassDisplay } from '../../../lib/classGroups';
import { useAuth } from '../../../context/AuthContext';
import { isSupabaseConfigured } from '../../../lib/supabase';

interface SundaySchoolLessonViewProps {
  lesson: Lesson;
  version: LessonVersion;
  sources: LessonSource[];
  progress?: StudentContentProgress;
  quizAttempts: StudentQuizAttempt[];
  mastery?: StudentMastery;
  onBack: () => void;
  onMarkSectionRead: (sectionId: string, totalSections: number) => void;
  onCompleteContent: () => void;
  onFinishLesson?: () => Promise<void>;
  isFinishing?: boolean;
  finishError?: string | null;
  finishSuccess?: boolean;
  onNavigateHome?: () => void;
  onStartQuiz: () => void;
  onOpenSourceViewer?: (source: LessonSource) => void;
  targetSectionId?: string;
  lang?: Language;
  isOnlineAuth?: boolean;
}

export const SundaySchoolLessonView: React.FC<SundaySchoolLessonViewProps> = ({
  lesson,
  version,
  sources,
  progress,
  quizAttempts,
  mastery,
  onBack,
  onMarkSectionRead,
  onCompleteContent,
  onFinishLesson,
  isFinishing = false,
  finishError = null,
  finishSuccess = false,
  onNavigateHome,
  onStartQuiz,
  targetSectionId,
  lang = 'ar' as Language,
  isOnlineAuth
}) => {
  const { userData, isGuest } = useAuth();
  const isAr = lang === 'ar';

  const [showDocumentModal, setShowDocumentModal] = useState<boolean>(false);
  const [activeFlashcardIndex, setActiveFlashcardIndex] = useState<number>(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState<boolean>(false);

  // Sections
  const rawSections = version.sections || [];
  const sections = [...rawSections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const completedSections = progress?.sectionsCompleted || [];
  const completionRatio = sections.length > 0 ? (completedSections.length / sections.length) : 1;
  const isAllSectionsRead = sections.length > 0 && completedSections.length >= sections.length;
  const isSubstantiallyCompleted = completionRatio >= 0.9;
  const isContentCompleted = progress?.status === 'COMPLETED' || finishSuccess || isAllSectionsRead;
  const latestQuizAttempt = quizAttempts[quizAttempts.length - 1];

  const handleFinish = () => {
    if (onFinishLesson) {
      onFinishLesson();
    } else {
      onCompleteContent();
    }
  };

  // Learning materials: only show if provided
  const rawSlides = (version as any)?.slides || [];
  const eligibleSlides = rawSlides;

  const rawFlashcards = (version as any)?.flashcards || [];
  const eligibleFlashcards = rawFlashcards;

  const classInfo = formatStudentClassDisplay(lesson.grade, lang);

  // 1. Video (strictly only if provided)
  const effectiveVideoUrl = lesson.videoUrl || sources.find(s => s.type === 'YOUTUBE_VIDEO' || s.type === 'TEACHER_VIDEO')?.fileUrl;
  const getYoutubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };
  const youtubeEmbedUrl = getYoutubeEmbedUrl(effectiveVideoUrl);

  // 2. Audio (strictly only if teacher provided, NO fake fallback, NO AI audio)
  const teacherVoiceSource = sources.find(s => s.type === 'TEACHER_VOICE');
  const effectiveAudioUrl = lesson.audioUrl || teacherVoiceSource?.fileUrl;

  // 3. Slides / Documents (strictly only if provided)
  const slideDeckSource = sources.find(s => s.type === 'PPTX' || s.type === 'PDF');
  const effectiveSlidesUrl = lesson.slidesUrl || slideDeckSource?.fileUrl;
  const hasSlidesOrDocument = Boolean(effectiveSlidesUrl || eligibleSlides.length > 0);

  // 4. Memory Verse (strictly only if provided)
  const hasMemoryVerse = Boolean(lesson.scriptureVerseAr || lesson.scriptureVerseEn || lesson.verseReference);

  // 5. Written Explanation & Pictures
  const hasWrittenExplanation = Boolean(lesson.writtenExplanation || lesson.teacherNotes || lesson.imageUrl);

  // 6. Quiz check
  const hasQuiz = Boolean(lesson.quiz && lesson.quiz.length > 0) || Boolean(version.quizDraft && version.quizDraft.questions?.length > 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Breadcrumb & Actions with Clearly Visible Finish Lesson Action */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] p-3.5 sm:p-4 rounded-3xl border-2 border-[var(--mousa-border-sand)] shadow-2xs">
        <button
          onClick={onBack}
          className="px-3.5 py-2 hover:bg-[var(--mousa-sand-100)] text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
        >
          {isAr ? <ChevronRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{isAr ? 'الرجوع إلى محطات الدروس' : 'Back to Milestones'}</span>
        </button>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Top Finish Lesson Action Button */}
          <button
            onClick={handleFinish}
            disabled={isFinishing || isContentCompleted}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-xs cursor-pointer ${
              isContentCompleted
                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : isFinishing
                ? 'bg-amber-300 text-amber-950 opacity-80 cursor-wait'
                : 'bg-gradient-to-r from-[var(--mousa-gold)] to-[var(--mousa-coral)] hover:brightness-105 text-white active:scale-95'
            }`}
          >
            {isFinishing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-amber-950 border-t-transparent rounded-full animate-spin"></div>
                <span>{isAr ? 'جاري حفظ الإتمام...' : 'Saving...'}</span>
              </>
            ) : isContentCompleted ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isAr ? 'الدرس مكتمل ✅' : 'Lesson Completed ✅'}</span>
              </>
            ) : !isAllSectionsRead && sections.length > 0 ? (
              <>
                <BookOpen className="w-3.5 h-3.5" />
                <span>{isAr ? `قراءة الأقسام (${completedSections.length}/${sections.length})` : `Read Sections (${completedSections.length}/${sections.length})`}</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isAr ? 'إنهاء محطة الدرس' : 'Finish Lesson'}</span>
              </>
            )}
          </button>

          {isContentCompleted && (
            <button
              onClick={onNavigateHome || onBack}
              className="px-3.5 py-2 bg-[var(--mousa-teal)] hover:bg-[var(--mousa-teal-deep)] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              {isAr ? 'العودة للرئيسية' : 'Go Home'}
            </button>
          )}

          {lesson.approvedServantName && (
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--mousa-sand-100)] dark:bg-stone-800 text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] border border-[var(--mousa-border-sand)] font-bold hidden sm:inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[var(--mousa-gold)]" />
              <span>{isAr ? `إعداد: ${lesson.approvedServantName}` : `By ${lesson.approvedServantName}`}</span>
            </span>
          )}
        </div>
      </div>

      {/* Top Finish Error Alert Banner */}
      {finishError && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-rose-900 dark:text-rose-200 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span className="font-bold">{finishError}</span>
          </div>
          <button
            onClick={handleFinish}
            disabled={isFinishing}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shrink-0 cursor-pointer shadow-xs min-h-[36px]"
          >
            {isAr ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      )}

      {/* Hero Banner with Title & Coptic Details */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-[var(--mousa-border-sand)] bg-gradient-to-br from-[#FFFDF9] via-[#FAF5EB] to-[#F5ECE0] dark:from-[#211B15] dark:via-[#292219] dark:to-[#32271E] p-6 sm:p-10 shadow-md">
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-[var(--mousa-gold-soft)] text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)] border border-[var(--mousa-gold)]/40 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              <span>{classInfo.icon}</span>
              <span>{classInfo.fullDisplay}</span>
            </span>
            <span className="text-xs text-[var(--mousa-sand-500)] flex items-center gap-1.5 font-bold">
              <Calendar className="w-3.5 h-3.5 text-[var(--mousa-coral)]" />
              <span>{lesson.date}</span>
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] tracking-tight leading-snug">
              {isAr ? (lesson.titleAr || lesson.title) : lesson.title}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {lesson.titleAr && !isAr && (
                <h2 className="text-base text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)] font-bold">
                  {lesson.titleAr}
                </h2>
              )}
              {lesson.title && isAr && lesson.titleAr !== lesson.title && (
                <span className="text-sm text-[var(--mousa-sand-500)] font-serif">
                  ({lesson.title})
                </span>
              )}
              {(lesson.titleCop || version.summaryCop) && (
                <span className="text-xs sm:text-sm text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)] font-serif font-bold">
                  • {lesson.titleCop || version.summaryCop}
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] leading-relaxed font-sans">
            {isAr
              ? (version.bigIdeaAr || lesson.summaryAr || version.bigIdeaEn || lesson.summary)
              : (version.bigIdeaEn || lesson.summary || lesson.summaryAr)}
          </p>

          {/* Quick Stat Strip: Content Progress vs Quiz Score vs Mastery */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Metric 1 */}
            <div className="p-3 bg-[var(--mousa-sand-50)] dark:bg-stone-900/60 rounded-2xl border border-[var(--mousa-border-sand)] text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] font-bold">{isAr ? 'قراءة محتوى المحطة' : 'Lesson Content'}</span>
                <span className="font-mono font-black text-[var(--mousa-gold)]">{progress?.completionPercent || 0}%</span>
              </div>
              <div className="w-full h-2 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--mousa-gold)] rounded-full transition-all duration-500"
                  style={{ width: `${progress?.completionPercent || 0}%` }}
                />
              </div>
            </div>

            {/* Metric 2 */}
            <div className="p-3 bg-[var(--mousa-sand-50)] dark:bg-stone-900/60 rounded-2xl border border-[var(--mousa-border-sand)] text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] font-bold">{isAr ? 'اختبار المراجعة' : 'Review Quiz'}</span>
                <span className="font-mono font-black text-[var(--mousa-coral)]">
                  {latestQuizAttempt ? `${latestQuizAttempt.percentage}%` : (isAr ? 'لم يُؤدَّ بعد' : 'Not Taken')}
                </span>
              </div>
              <div className="w-full h-2 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--mousa-coral)] rounded-full transition-all duration-500"
                  style={{ width: `${latestQuizAttempt?.percentage || 0}%` }}
                />
              </div>
            </div>

            {/* Metric 3 */}
            <div className="p-3 bg-[var(--mousa-sand-50)] dark:bg-stone-900/60 rounded-2xl border border-[var(--mousa-border-sand)] text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] font-bold">{isAr ? 'تقييم الخادم' : 'Teacher Mastery'}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                  mastery?.status === 'MASTERED' ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300' :
                  mastery?.status === 'DEVELOPING' ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300' :
                  mastery?.status === 'NEEDS_REVIEW' ? 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300' : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                }`}>
                  {mastery?.status || (isAr ? 'قيد المتابعة' : 'IN_PROGRESS')}
                </span>
              </div>
              <p className="text-[10px] text-[var(--mousa-sand-500)] truncate">
                {mastery?.teacherNotes ? mastery.teacherNotes : (isAr ? 'متابعة أسبوعية من الخادم' : 'Weekly servant review')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Scripture Memory Verse Card: ONLY IF PROVIDED BY TEACHER (No Helena / 1 Cor 1:18 fallback) */}
      {hasMemoryVerse && (
        <div className="p-6 bg-gradient-to-br from-[#FFFDF9] via-[#FAF5EB] to-[#F7EFE1] dark:from-[#251E17] dark:via-[#2F241A] dark:to-[#38281A] rounded-3xl border-2 border-[var(--mousa-gold)] shadow-md text-center space-y-3">
          <span className="text-xs font-black uppercase tracking-widest text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)] flex items-center justify-center gap-1.5">
            <span>✝</span>
            <span>{lang === 'copt' || lang === 'cop' ? 'Ⲡⲓⲥϧⲁⲓ ⲉ̀ⲧⲉⲛⲛⲁⲁⲙⲟⲛⲓ ⲙ̀ⲙⲟϥ' : isAr ? 'آية الحفظ المقررة في المحطة' : 'Holy Scripture Memory Verse'}</span>
          </span>
          {lesson.scriptureVerseAr && (
            <p className="text-lg sm:text-xl font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] font-sans leading-relaxed" dir="rtl">
              "{lesson.scriptureVerseAr}"
            </p>
          )}
          {lesson.scriptureVerseEn && (
            <blockquote className="text-sm sm:text-base font-serif italic text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] max-w-2xl mx-auto">
              "{lesson.scriptureVerseEn}"
            </blockquote>
          )}
          {lesson.verseReference && (
            <span className="inline-block text-xs font-black text-[var(--mousa-coral-dark)] dark:text-[var(--mousa-coral-glow)] font-mono bg-[var(--mousa-coral-soft)] dark:bg-[#341F18] px-3 py-1 rounded-full border border-[var(--mousa-coral)]/30">
              {lesson.verseReference}
            </span>
          )}
        </div>
      )}

      {/* 2. Slide Deck / Document Action Card: ONLY IF SLIDES/DOCUMENT ATTACHED (Opens In-App Viewer) */}
      {hasSlidesOrDocument && (
        <div className="p-5 bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] border-2 border-[var(--mousa-border-sand)] rounded-3xl flex items-center justify-between flex-wrap gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--mousa-sand-100)] dark:bg-stone-800 border border-[var(--mousa-border-sand)] flex items-center justify-center text-[var(--mousa-teal)] dark:text-[var(--mousa-gold-glow)]">
              <Presentation className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
                {isAr ? 'عرض الشرائح التقديمية والملفات المرفقة (بوربوينت / PDF / Word)' : 'Classroom Slide Deck & Presentation'}
              </h3>
              <p className="text-xs text-[var(--mousa-sand-500)]">
                {eligibleSlides.length > 0
                  ? (isAr ? `${eligibleSlides.length} شرائح تعليمية مرفقة من الخادم لشرح الدرس.` : `${eligibleSlides.length} visual slides prepared by your teacher.`)
                  : (isAr ? 'مستند العرض والوسائل التعليمية المرفقة من الخادم (عرض مباشر داخل التطبيق).' : 'Direct in-app presentation slides without downloading.')}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDocumentModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-[var(--mousa-gold)] to-[var(--mousa-coral)] hover:brightness-105 text-white rounded-xl text-xs font-black shadow-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>{isAr ? 'فتح العرض التقديمي داخل التطبيق' : 'Open In-App Presentation'}</span>
          </button>
        </div>
      )}

      {/* 3. Dedicated Part for Written Explanation & Pictures: ONLY IF PROVIDED */}
      {hasWrittenExplanation && (
        <div className="p-6 bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] border-2 border-[var(--mousa-border-sand)] rounded-3xl space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[var(--mousa-border-sand)]/60 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--mousa-teal-deep)] dark:text-[var(--mousa-gold-glow)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--mousa-coral)]" />
              <span>{isAr ? 'الشرح الكتابي وتأملات الخادم' : 'Written Explanation & Servant Commentary'}</span>
            </h3>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[var(--mousa-gold-soft)] text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)] border border-[var(--mousa-gold)]/30 font-bold">
              {isAr ? 'محتوى تعليمي' : 'Lesson Content'}
            </span>
          </div>

          {/* Picture / Illustration if provided */}
          {lesson.imageUrl && (
            <div className="rounded-2xl overflow-hidden border border-stone-800 max-h-96 bg-black flex items-center justify-center">
              <img
                src={lesson.imageUrl}
                alt={lesson.title}
                className="w-full h-full object-cover max-h-96"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Written Explanation Text */}
          <div className="space-y-3">
            {lesson.writtenExplanation && (
              <div className="text-stone-100 text-sm sm:text-base leading-relaxed font-sans whitespace-pre-wrap">
                {lesson.writtenExplanation}
              </div>
            )}
            {lesson.teacherNotes && !lesson.writtenExplanation && (
              <div className="text-stone-200 text-sm leading-relaxed font-sans whitespace-pre-wrap">
                {lesson.teacherNotes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Classroom Voice Explanation: ONLY IF TEACHER RECORDED/ATTACHED AUDIO (No fake audio, No AI) */}
      {effectiveAudioUrl && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-amber-500" />
              <span>{isAr ? 'التسجيل والشرح الصوتي للخادم' : 'Classroom Voice Audio'}</span>
            </h3>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800/60 font-mono">
              {isAr ? 'تسجيل حقيقي للخادم' : 'Teacher Audio'}
            </span>
          </div>

          <SundaySchoolAudioPlayer
            type="TEACHER_VOICE"
            title={isAr ? 'شرح الخادم الصوتي في فصل مدارس الأحد' : 'Classroom Voice Explanation'}
            titleAr="شرح الخادم الصوتي في فصل مدارس الأحد"
            subTitle={isAr ? 'تسجيل صوتي حقيقي للخادم لشرح الدرس للأولاد.' : 'Real audio recorded by Sunday School servant during session.'}
            audioUrl={effectiveAudioUrl}
            durationSeconds={teacherVoiceSource?.durationSeconds || 320}
            recordedBy={lesson.approvedServantName || lesson.teacherName || (isAr ? 'خادم الفصل' : 'Sunday School Servant')}
            transcript={teacherVoiceSource?.transcript}
          />
        </div>
      )}

      {/* 5. Video Player: ONLY IF VIDEO ATTACHED */}
      {effectiveVideoUrl && (
        <div className="p-6 bg-stone-900 border border-stone-800 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
              <Video className="w-4 h-4 text-red-500" />
              <span>{isAr ? 'فيديو الدرس وتأملات الخادم' : 'Classroom Video Lesson'}</span>
            </h3>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 font-medium">
              {youtubeEmbedUrl ? 'YouTube' : 'Video Recording'}
            </span>
          </div>

          <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-stone-800 shadow-inner">
            {youtubeEmbedUrl ? (
              <iframe
                src={youtubeEmbedUrl}
                title={lesson.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                src={effectiveVideoUrl}
                controls
                className="w-full h-full object-contain"
              />
            )}
          </div>
        </div>
      )}

      {/* 6. Lesson Sections List (Story Reading) */}
      {sections.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-amber-500" />
              <span>{isAr ? 'أقسام القراءة والقصة الإيمانية للدرس' : 'Lesson Sections & Story Reading'}</span>
            </h3>
            <span className="text-xs text-stone-400 font-mono">
              {completedSections.length} {isAr ? 'من' : 'of'} {sections.length} {isAr ? 'مقروء' : 'Sections Read'}
            </span>
          </div>

          <div className="space-y-4">
            {sections.map((section, idx) => {
              const isCompleted = completedSections.includes(section.id);
              const isTargeted = targetSectionId === section.id;

              return (
                <div
                  key={section.id}
                  id={`section-${section.id}`}
                  className={`p-6 bg-stone-900 rounded-2xl border transition-all ${
                    isTargeted
                      ? 'border-amber-500 ring-2 ring-amber-500/50 bg-amber-950/20'
                      : isCompleted
                      ? 'border-stone-800'
                      : 'border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-6 h-6 rounded-full bg-stone-800 text-amber-400 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h4 className="text-base font-bold text-white font-sans">
                          {isAr ? (section.titleAr || section.titleEn) : section.titleEn}
                        </h4>
                        {section.titleCop && (
                          <span className="text-amber-400 font-serif text-sm font-semibold">
                            {section.titleCop}
                          </span>
                        )}
                      </div>
                      {isAr && section.titleEn && section.titleAr !== section.titleEn && (
                        <p className="text-xs text-stone-400 font-serif mr-8">
                          {section.titleEn}
                        </p>
                      )}
                      {!isAr && section.titleAr && (
                        <p className="text-xs text-amber-300 font-sans ml-8" dir="rtl">
                          {section.titleAr}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => onMarkSectionRead(section.id, sections.length)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                        isCompleted
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : null}
                      <span>{isCompleted ? (isAr ? 'تمت القراءة' : 'Completed') : (isAr ? 'تحديد كمقروء' : 'Mark as Read')}</span>
                    </button>
                  </div>

                  <div className="space-y-3 text-sm text-stone-200 leading-relaxed pr-8">
                    {section.contentCop && (
                      <div className="p-3 rounded-xl bg-stone-950/60 border border-amber-900/30 text-amber-200 font-serif leading-relaxed">
                        <span className="text-[10px] text-amber-500 font-bold block mb-1 uppercase tracking-wider">
                          Ⲙⲉⲑⲣⲉⲙⲛ̀ⲭⲏⲙⲓ (Coptic)
                        </span>
                        <p>{section.contentCop}</p>
                      </div>
                    )}

                    <p className="text-stone-100 font-sans leading-relaxed text-base">
                      {isAr ? (section.contentAr || section.contentEn) : section.contentEn}
                    </p>
                    {isAr && section.contentEn && section.contentAr !== section.contentEn && (
                      <p className="text-stone-400 font-serif pt-3 border-t border-stone-800/80 leading-relaxed text-xs sm:text-sm">
                        {section.contentEn}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. Flashcards: ONLY IF PROVIDED BY TEACHER */}
      {eligibleFlashcards && eligibleFlashcards.length > 0 && (
        <div className="p-6 bg-stone-900 border border-stone-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              {isAr ? `بطاقات التذكر التفاعلية (${eligibleFlashcards.length})` : `Interactive Memory Flashcards (${eligibleFlashcards.length})`}
            </h3>
            <span className="text-xs font-mono text-stone-500">
              {isAr ? `بطاقة ${activeFlashcardIndex + 1} من ${eligibleFlashcards.length}` : `Card ${activeFlashcardIndex + 1} of ${eligibleFlashcards.length}`}
            </span>
          </div>

          <div
            onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}
            className="min-h-[160px] p-6 bg-stone-950 border-2 border-stone-800 hover:border-amber-600/60 rounded-2xl cursor-pointer flex flex-col justify-center items-center text-center transition-all shadow-inner select-none"
          >
            <span className="text-[10px] uppercase font-bold text-amber-500 mb-2">
              {isFlashcardFlipped 
                ? (isAr ? 'الإجابة (اضغط للعودة للسؤال)' : 'Answer (Click to Flip)') 
                : (isAr ? 'السؤال (اضغط لإظهار الإجابة)' : 'Question (Click to Reveal)')}
            </span>

            {isFlashcardFlipped ? (
              <p className="text-base font-bold text-emerald-400 font-sans">
                {isAr ? (eligibleFlashcards[activeFlashcardIndex]?.backAr || eligibleFlashcards[activeFlashcardIndex]?.backEn) : eligibleFlashcards[activeFlashcardIndex]?.backEn}
              </p>
            ) : (
              <p className="text-base font-bold text-white font-sans">
                {isAr ? (eligibleFlashcards[activeFlashcardIndex]?.frontAr || eligibleFlashcards[activeFlashcardIndex]?.frontEn) : eligibleFlashcards[activeFlashcardIndex]?.frontEn}
              </p>
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => {
                setIsFlashcardFlipped(false);
                setActiveFlashcardIndex(prev => Math.max(0, prev - 1));
              }}
              disabled={activeFlashcardIndex === 0}
              className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-30 rounded-xl text-xs text-stone-300 cursor-pointer"
            >
              {isAr ? 'البطاقة السابقة' : 'Previous Card'}
            </button>

            <button
              onClick={() => {
                setIsFlashcardFlipped(false);
                setActiveFlashcardIndex(prev => Math.min(eligibleFlashcards.length - 1, prev + 1));
              }}
              disabled={activeFlashcardIndex === eligibleFlashcards.length - 1}
              className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-30 rounded-xl text-xs text-stone-300 cursor-pointer"
            >
              {isAr ? 'البطاقة التالية' : 'Next Card'}
            </button>
          </div>
        </div>
      )}

      {/* 8. Completion & Quiz Action Card */}
      <div className="p-6 bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] border-2 border-[var(--mousa-gold)] rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
            {isContentCompleted
              ? (isAr ? '🎉 مبروك! اكتملت محطة هذا الدرس بنجاح' : '🎉 Congratulations! Milestone Completed!')
              : (isAr ? 'هل انتهيت من قراءة ومتابعة محطة الدرس؟' : 'Finished with this lesson milestone?')}
          </h3>
          <p className="text-xs text-[var(--mousa-sand-500)] max-w-xl">
            {isContentCompleted
              ? (isAr 
                  ? 'تم تسجيل إنجازك وحفظ النقاط بأمان. يمكنك مراجعة الأقسام أو العودة للرئيسية.' 
                  : 'Your progress is reliably saved and points awarded. You can return home or take the review quiz.')
              : (isAr 
                  ? 'سجّل إتمام قراءة ومتابعة الدرس لتحصيل نقاط البركة والتقدم في وسام رحلة الأنبا موسى.' 
                  : 'Mark your lesson completed to record your genuine progress and earn your blessing points.')}
          </p>
          {finishError && (
            <p className="text-xs font-bold text-red-600 dark:text-red-400 mt-1">
              ⚠️ {finishError}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Finish Lesson Action Button */}
          <button
            onClick={handleFinish}
            disabled={isFinishing || isContentCompleted}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shadow-xs ${
              isContentCompleted
                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : isFinishing
                ? 'bg-amber-300 text-amber-950 opacity-80 cursor-wait'
                : (sections.length === 0 || isSubstantiallyCompleted || isAllSectionsRead)
                ? 'bg-gradient-to-r from-[var(--mousa-gold)] to-[var(--mousa-coral)] hover:brightness-105 text-white cursor-pointer active:scale-95'
                : 'bg-gradient-to-r from-[var(--mousa-gold)] to-[var(--mousa-coral)] hover:brightness-105 text-white cursor-pointer active:scale-95'
            }`}
          >
            {isFinishing ? (
              <>
                <div className="w-4 h-4 border-2 border-amber-950 border-t-transparent rounded-full animate-spin"></div>
                <span>{isAr ? 'جاري حفظ الإتمام...' : 'Saving completion...'}</span>
              </>
            ) : isContentCompleted ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isAr ? 'تم إتمام الدرس بالكامل (١٠٠٪) ✅' : 'Lesson Completed (100%) ✅'}</span>
              </>
            ) : !isAllSectionsRead && sections.length > 0 ? (
              <>
                <BookOpen className="w-4 h-4" />
                <span>{isAr ? `إتمام قراءة الأقسام أولاً (${completedSections.length}/${sections.length})` : `Read All Sections First (${completedSections.length}/${sections.length})`}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{isAr ? 'إنهاء محطة الدرس' : 'Finish Lesson'}</span>
              </>
            )}
          </button>

          {/* Clear Route Back Home upon completion */}
          {isContentCompleted && (
            <button
              onClick={onNavigateHome || onBack}
              className="px-4 py-2.5 bg-[var(--mousa-teal)] hover:bg-[var(--mousa-teal-deep)] text-white text-xs sm:text-sm font-black rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>{isAr ? 'العودة للرئيسية' : 'Back to Home'}</span>
            </button>
          )}

          {/* Review Quiz button: ONLY IF QUIZ EXISTS */}
          {hasQuiz && (
            <button
              onClick={onStartQuiz}
              className="px-5 py-2.5 bg-[var(--mousa-cream-surface)] hover:bg-[var(--mousa-sand-100)] text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] border-2 border-[var(--mousa-gold)] rounded-xl text-xs sm:text-sm font-black shadow-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-[var(--mousa-gold)]" />
              <span>{isAr ? 'اختبار المراجعة' : 'Review Quiz'}</span>
              {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Embedded In-App Document & Slide Viewer Modal (No redirects, No downloads) */}
      {showDocumentModal && (
        <InAppDocumentViewer
          documentUrl={effectiveSlidesUrl}
          documentTitle={isAr && lesson.titleAr ? lesson.titleAr : lesson.title}
          slides={eligibleSlides}
          onClose={() => setShowDocumentModal(false)}
          lang={isAr ? 'ar' : 'en'}
        />
      )}
    </div>
  );
};
