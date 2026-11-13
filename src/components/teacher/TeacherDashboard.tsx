import React, { useState, useRef } from 'react';
import { 
  Mic, 
  FileText, 
  Wand2, 
  Upload, 
  Users, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowLeft, 
  Edit3, 
  Eye, 
  Plus, 
  Trash2, 
  RotateCcw,
  Sparkles,
  Award,
  School,
  Search,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { hasRole } from '../../lib/workspaces';
import { useLessons } from '../../context/LessonsContext';
import { Lesson, QuizQuestion, LessonSource, PresentationSlide, ServantComment } from '../../types';
import { LessonEditModal } from './LessonEditModal';
import { ExpressLessonPublishModal } from './ExpressLessonPublishModal';
import { AttendanceVisitationTracker } from './AttendanceVisitationTracker';
import { isSupabaseConfigured } from '../../lib/supabase';
import { createLessonDraft } from '../../lib/lessonAuthoringService';
import { getLocalizedErrorMessage } from '../../lib/localizedErrors';

import { ManualLessonStudio } from '../sunday-school/teacher/ManualLessonStudio';
import { TeacherMasteryReview } from '../sunday-school/teacher/TeacherMasteryReview';
import { ServantClassManagement } from './ServantClassManagement';
import { ServantSourceManagement } from './ServantSourceManagement';
import { getPendingActivationRequests } from '../../lib/onboardingService';
import { EvidenceCoverageModal } from '../sunday-school/evidence/EvidenceCoverageModal';
import { PdfDocumentViewer } from '../sunday-school/viewers/PdfDocumentViewer';
import { SlideDeckViewer } from '../sunday-school/viewers/SlideDeckViewer';
import { TeacherPublishingHub, PublishingMode } from './publishing/TeacherPublishingHub';
import { LessonPublicationManager } from './LessonPublicationManager';
import { StudentExperiencePreview } from './StudentExperiencePreview';
import { FeedTab } from '../student/FeedTab';
import { ServantHomeDashboard } from './ServantHomeDashboard';

interface TeacherDashboardProps {
  onOpenParentPortal?: () => void;
  lang?: 'en' | 'ar';
  activeTab?: string;
  onNavigate?: (tab: string) => void;
}

type TeacherTab = 'overview' | 'attendance' | 'sundaySchool' | 'sources' | 'mastery' | 'classManagement' | 'ai' | 'lessons' | 'moderation' | 'preview' | 'communication';

const teacherTabTitles: Record<TeacherTab, { en: string; ar: string }> = {
  overview: { en: 'Servant Studio', ar: 'استوديو الخادم' },
  attendance: { en: 'Attendance & visits', ar: 'الحضور والافتقاد' },
  sundaySchool: { en: 'Curriculum & publishing', ar: 'المناهج والنشر' },
  sources: { en: 'Lesson sources & media', ar: 'مصادر الدروس والملفات' },
  mastery: { en: 'Student progress & quizzes', ar: 'تقدم التلاميذ والاختبارات' },
  classManagement: { en: 'Classes & students', ar: 'الفصول والطلاب' },
  ai: { en: 'Lesson creator', ar: 'إنشاء درس' },
  lessons: { en: 'Lesson library', ar: 'مكتبة الدروس' },
  moderation: { en: 'Moderation', ar: 'الإشراف' },
  preview: { en: 'Student experience preview', ar: 'معاينة تجربة التلميذ' },
  communication: { en: 'Community feed', ar: 'منشورات المجتمع' }
};

const routeToTeacherTab: Record<string, TeacherTab> = {
  home: 'overview',
  studio: 'sundaySchool',
  overview: 'overview',
  attendance: 'attendance',
  sundaySchool: 'sundaySchool',
  sources: 'sources',
  mastery: 'mastery',
  classManagement: 'classManagement',
  ai: 'ai',
  lessons: 'lessons',
  moderation: 'moderation',
  preview: 'preview',
  communication: 'communication'
};

export function TeacherDashboard({ 
  onOpenParentPortal,
  lang = 'en',
  activeTab: routeTab,
  onNavigate
}: TeacherDashboardProps) {
  const { userData, isGuest } = useAuth();
  const isOnlineAuth = !isGuest && Boolean(userData) && isSupabaseConfigured;
  const { 
    lessons, 
    addLesson, 
    updateLesson, 
    deleteLesson, 
    togglePublish,
    refreshCurriculum,
    classSessions,
    lessonSources,
    evidenceMaps,
    lessonOutlines,
    lessonVersions,
    servantComments,
    studentProgress,
    quizAttempts,
    studentMasteries,
    curriculumLoading,
    curriculumError,
    addClassSession,
    updateClassSession,
    addLessonSource,
    deleteLessonSource,
    saveEvidenceMap,
    saveLessonOutline,
    approveLessonOutline,
    saveLessonVersion,
    approveLessonVersion,
    publishLessonVersion,
    addServantComment,
    resolveServantComment,
    updateStudentMastery
  } = useLessons();

  const [localActiveTab, setLocalActiveTab] = useState<TeacherTab>('overview');
  const activeTab = routeTab ? (routeToTeacherTab[routeTab] || 'overview') : localActiveTab;
  const setActiveTab = (nextTab: TeacherTab) => {
    if (!onNavigate) {
      setLocalActiveTab(nextTab);
      return;
    }
    onNavigate(nextTab === 'overview' ? 'home' : nextTab === 'sundaySchool' ? 'studio' : nextTab);
  };
  const [previewLessonId, setPreviewLessonId] = useState<string | null>(null);
  const [publishingModeToOpen, setPublishingModeToOpen] = useState<PublishingMode>('sunday_school');
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => classSessions[0]?.id || 'cs-2026-09-27');
  
  // Active session and lesson resolution
  const activeSession = (classSessions || []).find(s => s.id === selectedSessionId) || classSessions?.[0];
  const activeLessonId = activeSession?.activeLessonId || 'l-cross-01';
  const activeLesson = (lessons || []).find(l => l.id === activeLessonId) || lessons?.[0];

  // Domain records for active lesson
  const activeSources = (lessonSources || []).filter(s => s.sessionId === activeSession?.id || s.lessonId === activeLessonId);
  const activeEvidenceMap = evidenceMaps ? evidenceMaps[activeLessonId] : undefined;
  const activeOutline = lessonOutlines ? lessonOutlines[activeLessonId] : undefined;
  const activeVersions = (lessonVersions && lessonVersions[activeLessonId]) || [];
  const activeCommentsList: ServantComment[] = Array.isArray(servantComments)
    ? servantComments
    : servantComments && typeof servantComments === 'object'
    ? Object.values(servantComments).flat()
    : [];

  // Viewer Modals
  const [viewingSource, setViewingSource] = useState<LessonSource | null>(null);
  const [viewingSlides, setViewingSlides] = useState<PresentationSlide[] | null>(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState<boolean>(false);

  const [isRecording, setIsRecording] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'recording' | 'processing' | 'done' | 'error'>('idle');
  const [generatedData, setGeneratedData] = useState<any>(null);
  
  // Lesson editing state
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [showExpressPublishModal, setShowExpressPublishModal] = useState<boolean>(false);

  // Servant lesson library filters; server services enforce the effective permissions.
  const [lessonGradeFilter, setLessonGradeFilter] = useState<string>('ALL');
  const [lessonCategoryFilter, setLessonCategoryFilter] = useState<string>('ALL');
  const [lessonStatusFilter, setLessonStatusFilter] = useState<'ALL' | 'draft' | 'published'>('ALL');
  const [lessonSearchQuery, setLessonSearchQuery] = useState<string>('');

  const filteredTeacherLessons = React.useMemo(() => {
    return (lessons || []).filter(l => {
      // Grade filter
      if (lessonGradeFilter !== 'ALL') {
        const g = (l.grade || '').toLowerCase();
        if (lessonGradeFilter === 'pre-k' && !g.includes('pre') && !g.includes('kg') && !g.includes('kindergarten') && !g.includes('حضانة')) return false;
        if (lessonGradeFilter === '1st-2nd' && !g.includes('1') && !g.includes('2') && !g.includes('أولى') && !g.includes('ثانية')) return false;
        if (lessonGradeFilter === '3rd-4th' && !g.includes('3') && !g.includes('4') && !g.includes('ثالثة') && !g.includes('رابعة')) return false;
        if (lessonGradeFilter === '5th-6th' && !g.includes('5') && !g.includes('6') && !g.includes('خامسة') && !g.includes('سادسة')) return false;
        if (lessonGradeFilter === 'prep' && !g.includes('middle') && !g.includes('prep') && !g.includes('إعدادي')) return false;
        if (lessonGradeFilter === 'sec' && !g.includes('high') && !g.includes('sec') && !g.includes('youth') && !g.includes('ثانوي') && !g.includes('شباب')) return false;
      }
      // Category filter
      if (lessonCategoryFilter !== 'ALL') {
        if ((l.category || 'bible') !== lessonCategoryFilter) return false;
      }
      if (lessonStatusFilter !== 'ALL' && l.status !== lessonStatusFilter) return false;
      // Search filter
      if (lessonSearchQuery.trim()) {
        const q = lessonSearchQuery.toLowerCase();
        const t = (l.title || '').toLowerCase();
        const ta = (l.titleAr || '').toLowerCase();
        const s = (l.summary || '').toLowerCase();
        const sa = (l.summaryAr || '').toLowerCase();
        if (!t.includes(q) && !ta.includes(q) && !s.includes(q) && !sa.includes(q)) return false;
      }
      return true;
    });
  }, [lessons, lessonGradeFilter, lessonCategoryFilter, lessonStatusFilter, lessonSearchQuery]);

  const handleAssignLessonToClass = (targetLesson: Lesson) => {
    if (activeSession) {
      updateClassSession(activeSession.id, {
        activeLessonId: targetLesson.id,
        title: targetLesson.title,
        topic: targetLesson.titleAr ? `${targetLesson.title} (${targetLesson.titleAr})` : targetLesson.title,
        grade: targetLesson.grade || activeSession.grade
      });
      alert(lang === 'ar' 
        ? `الدرس اتحدد "${targetLesson.titleAr || targetLesson.title}" كدرس الفصل الحالي في استوديو مدارس الأحد!`
        : `Lesson "${targetLesson.title}" is now active in Sunday School Class Session!`);
      setActiveTab('sundaySchool');
    }
  };

  // Pending activation requests count
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number | null>(null);
  const [pendingRequestsError, setPendingRequestsError] = useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    setPendingRequestsError(null);
    getPendingActivationRequests().then((res) => {
      if (!isMounted) return;
      if (res.success && res.requests) {
        setPendingRequestsCount(res.requests.filter(r => r.status === 'PENDING_APPROVAL').length);
      } else {
        setPendingRequestsCount(null);
        setPendingRequestsError(getLocalizedErrorMessage(res.error, lang));
      }
    }).catch((error: unknown) => {
      if (!isMounted) return;
      setPendingRequestsCount(null);
      setPendingRequestsError(getLocalizedErrorMessage(error, lang));
    });

    return () => { isMounted = false; };
  }, [activeTab, lang]);

  // Moderation state
  const openPublishing = (mode: PublishingMode) => {
    setPublishingModeToOpen(mode);
    setActiveTab('sundaySchool');
  };

  const openStudentPreview = (lessonId?: string) => {
    setPreviewLessonId(lessonId || null);
    setActiveTab('preview');
  };
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setAiStatus('recording');
      setIsRecording(true);
    } catch (err) {
      console.warn("Could not access microphone:", err);
      setAiStatus('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAiStatus('processing');
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleRecord = () => {
    if (aiStatus === 'idle' || aiStatus === 'error' || aiStatus === 'done') {
      startRecording();
    } else if (aiStatus === 'recording') {
      stopRecording();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAiStatus('processing');
      await processAudio(file);
    }
  };

  const processAudio = async (fileOrBlob: Blob | File) => {
    try {
      const formData = new FormData();
      formData.append('audio', fileOrBlob, 'recording.webm');

      const response = await fetch('/api/generate-lesson', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to process audio");
      const data = await response.json();
      setGeneratedData(data.result);
      setAiStatus('done');
    } catch (err) {
      console.warn("Audio generation warning:", err);
      setAiStatus('error');
    }
  };

  const handleSaveGeneratedDraft = async () => {
    if (!generatedData) return;
    
    // Transform AI quiz into standard QuizQuestion structure
    const formattedQuiz: QuizQuestion[] = (generatedData.quiz || []).map((q: any) => ({
      question: q.question,
      options: q.options || ['True', 'False'],
      correctIndex: q.correctIndex ?? 0,
      type: 'multiple_choice'
    }));

    if (isOnlineAuth) {
      const quizDraft = {
        id: `quiz-gen-${Date.now()}`,
        lessonId: '',
        titleEn: `Quiz: ${generatedData.title || 'New Sunday School Lesson'}`,
        titleAr: 'تقييم الدرس',
        instructionsEn: 'Complete the quiz to test your comprehension.',
        instructionsAr: 'أكمل التقييم لاختبار فهمك لمحتوى الدرس.',
        status: 'DRAFT' as const,
        questions: formattedQuiz.map((q, idx) => ({
          id: `q-${idx + 1}`,
          type: 'multiple_choice' as const,
          questionEn: q.question,
          questionAr: q.question,
          optionsEn: q.options,
          optionsAr: q.options,
          correctIndex: q.correctIndex,
          explanationEn: '',
          explanationAr: '',
          sourceRef: {
            sectionId: '',
            sectionTitle: '',
            sourceId: '',
            location: ''
          }
        }))
      };

      const result = await createLessonDraft({
        titleEn: generatedData.title || (lang === 'ar' ? 'درس جديد' : 'New Sunday School Lesson'),
        titleAr: generatedData.title || (lang === 'ar' ? 'درس جديد' : 'New Sunday School Lesson'),
        summaryEn: generatedData.summary || '',
        summaryAr: generatedData.summary || '',
        quizDraft
      });

      if (result.error) {
        alert(lang === 'ar' ? `مش قادرين نحفظ مسودة الدرس: ${getLocalizedErrorMessage(result.error.message, lang)}` : `Failed to save draft: ${result.error.message}`);
        return;
      }

      if (refreshCurriculum) {
        await refreshCurriculum();
      }

      alert(lang === 'ar' 
        ? 'مسودة الدرس اتعملت بنجاح. مش هتظهر للتلاميذ غير بعد ما تتراجع وتتوافق عليها.' 
        : 'Lesson draft created safely as AI_DRAFT! It is NOT student-visible until servant review and approval.');
      setGeneratedData(null);
      setAiStatus('idle');
      setActiveTab('lessons');
      return;
    }

    addLesson({
      title: generatedData.title || (lang === 'ar' ? 'درس جديد' : 'New Sunday School Lesson'),
      summary: generatedData.summary || '',
      status: 'draft',
      date: new Date().toISOString().split('T')[0],
      pointsAvailable: 150,
      quiz: formattedQuiz.length > 0 ? formattedQuiz : undefined
    });

    alert(lang === 'ar' ? 'مسودة الدرس اتحفظت على الجهاز.' : 'Lesson draft saved locally!');
    setGeneratedData(null);
    setAiStatus('idle');
    setActiveTab('lessons');
  };

  return (
    <div className={`${activeTab === 'overview' ? 'w-full' : 'mx-auto w-full max-w-[96rem] px-4 pt-4 sm:px-6 lg:px-8'} space-y-6 pb-28`} dir="rtl">
      {activeTab !== 'overview' && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] pb-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[.14em] text-[var(--action-primary)]">
              {lang === 'ar' ? 'استوديو الخادم' : 'Servant Studio'}
            </p>
            <h1 className="mt-1 text-xl font-black text-[var(--text-primary)] sm:text-2xl">
              {lang === 'ar' ? teacherTabTitles[activeTab].ar : teacherTabTitles[activeTab].en}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {(activeTab === 'lessons' || activeTab === 'sundaySchool') && (
              <button
                type="button"
                onClick={() => setShowExpressPublishModal(true)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-orange-300 px-3 py-2 text-sm font-black text-slate-950 shadow-sm transition hover:brightness-105"
              >
                <Plus size={16} />
                {lang === 'ar' ? 'إنشاء درس بسرعة' : 'Create a lesson'}
              </button>
            )}
            {onOpenParentPortal && (
              <button
                type="button"
                onClick={onOpenParentPortal}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-default)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--state-hover)]"
              >
                <Users size={16} />
                {lang === 'ar' ? 'بوابة الأسرة' : 'Family portal'}
              </button>
            )}
          </div>
        </header>
      )}

      {!isOnlineAuth && (
        <p role="note" className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          {lang === 'ar'
            ? 'الوضع الحالي تجريبي أو مش متصل. أي بيانات أو تغييرات على الجهاز مش معناها إنها اتحفظت في قاعدة البيانات.'
            : 'Demo or offline mode: locally available data and changes are not confirmed as saved in the database.'}
        </p>
      )}

      {curriculumError && (
        <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>{lang === 'ar'
              ? `مش قادرين نحدّث المنهج من الخادم. الدروس اللي ظاهرة ممكن تكون من نسخة قديمة ومش مؤكدة. ${curriculumError}`
              : `The curriculum could not be refreshed. Any lessons currently shown may be cached and are not confirmed as server data. ${curriculumError}`}</p>
            <button type="button" onClick={() => void refreshCurriculum()} className="shrink-0 rounded-xl bg-amber-700 px-4 py-2 font-bold text-white hover:bg-amber-800">
              {lang === 'ar' ? 'حاول تاني' : 'Retry'}
            </button>
          </div>
        </div>
      )}
      {curriculumLoading && (
        <p role="status" className="text-sm font-semibold text-[var(--mousa-sand-500)]">
          {lang === 'ar' ? 'بنحمّل المنهج...' : 'Loading curriculum...'}
        </p>
      )}

      {pendingRequestsError && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {lang === 'ar' ? 'مش قادرين نحمّل طلبات تفعيل الحسابات دلوقتي.' : 'Activation requests could not be loaded.'}
        </div>
      )}

      {/* Pending Account Activation Alert for Servant */}
      {pendingRequestsCount !== null && pendingRequestsCount > 0 && activeTab !== 'classManagement' && activeTab !== 'overview' && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-2xl p-4 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🔔</span>
            <div className="font-semibold">
              <span>
                {lang === 'ar' 
                  ? `عندك (${pendingRequestsCount}) طلب جديد لتفعيل الحسابات والانضمام للفصل، مستني موافقتك.`
                  : `You have (${pendingRequestsCount}) new student account activation requests pending approval.`}
              </span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('classManagement')}
            className="px-3.5 py-1.5 bg-white text-amber-900 hover:bg-amber-50 font-bold rounded-xl text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
          >
            {lang === 'ar' ? 'راجع وسجّل التلاميذ' : 'Review & Enroll'}
          </button>
        </div>
      )}

      {activeTab === 'overview' && (
        <ServantHomeDashboard
          lang={lang}
          servantName={userData?.fullName || (lang === 'ar' ? 'يا خادم' : 'Servant')}
          pendingRequestsCount={pendingRequestsCount}
          pendingRequestsError={pendingRequestsError}
          onPublishLesson={() => setShowExpressPublishModal(true)}
          onReviewRequests={() => setActiveTab('classManagement')}
          onOpenCurriculum={openPublishing}
          onOpenWorkspaceTab={tab => setActiveTab(tab as TeacherTab)}
        />
      )}

      {activeTab === 'preview' && (
        <StudentExperiencePreview lang={lang} initialLessonId={previewLessonId} />
      )}

      {activeTab === 'communication' && <FeedTab lang={lang} />}

      {/* Tab: Multi-Mode Publishing Hub (Sunday School, Hymns School, Coptic Rituals / Taxis) */}
      {activeTab === 'sundaySchool' && (
        <TeacherPublishingHub
          lang={lang}
          initialMode={publishingModeToOpen}
          onPreviewLesson={openStudentPreview}
          sundaySchoolContent={
            <ManualLessonStudio
              sessions={classSessions}
              activeSessionId={selectedSessionId}
              onSelectSession={(id) => setSelectedSessionId(id)}
              onCreateSession={(data) => addClassSession(data as any)}
              onUpdateSession={(id, data) => updateClassSession(id, data)}
              lessons={lessons}
              activeLessonId={activeLessonId}
              onSaveLesson={(lessonData) => {
                const existing = lessons.find(l => l.id === lessonData.id);
                if (existing) {
                  updateLesson(lessonData.id, lessonData);
                } else {
                  addLesson(lessonData);
                }
              }}
              onPublishLesson={async (lessonData, assignToSessionId) => {
                const existing = lessons.find(l => l.id === lessonData.id);
                if (existing) {
                  updateLesson(lessonData.id, { ...lessonData, status: 'published' });
                } else {
                  addLesson({ ...lessonData, status: 'published' });
                }
                if (assignToSessionId) {
                  updateClassSession(assignToSessionId, {
                    activeLessonId: lessonData.id,
                    title: lessonData.title,
                    topic: lessonData.titleAr ? `${lessonData.title} (${lessonData.titleAr})` : lessonData.title,
                    grade: lessonData.grade,
                    status: 'PUBLISHED'
                  });
                }
              }}
              onPreviewStudentLesson={openStudentPreview}
              lang={lang}
            />
          }
        />
      )}

      {/* Tab: Student Mastery Evaluation */}
      {activeTab === 'mastery' && (
        isOnlineAuth ? (
          <section role="status" className="rounded-3xl border border-amber-300 bg-amber-50 p-6 text-stone-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            <div className="flex items-start gap-3">
              <Award className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
              <div>
                <h2 className="font-black">{lang === 'ar' ? 'تقارير تقدم التلاميذ والاختبارات مش متاحة' : 'Progress and quiz reports are unavailable'}</h2>
                <p className="mt-2 text-sm leading-relaxed">
                  {lang === 'ar'
                    ? 'مش هنعرض بيانات محفوظة على المتصفح على إنها نتائج مؤكدة. التقرير ده مفيهوش قراءة مباشرة وموثوقة من سجلات التلاميذ والاختبارات في قاعدة البيانات.'
                    : 'Browser-cached values are not shown as confirmed results. This report does not yet read student progress and quiz attempts from an authoritative database-backed Servant endpoint.'}
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <p role="note" className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              {lang === 'ar'
                ? 'وضع تجريبي: الأسماء والنتائج دي أمثلة، والتغييرات على الجهاز ومش بتتحفظ على الخادم.'
                : 'Demo mode: names and results are sample data; changes are local and are not saved to the server.'}
            </p>
            <TeacherMasteryReview
              lessonId={activeLessonId}
              lessonTitle={activeLesson?.title || 'Feast of the Holy Cross'}
              contentProgress={studentProgress}
              quizAttempts={quizAttempts}
              masteries={studentMasteries}
              onUpdateMastery={updateStudentMastery}
            />
          </>
        )
      )}

      {/* Tab: Servant Class Management & Persistent Roster */}
      {activeTab === 'classManagement' && (
        <ServantClassManagement lang={lang} isOnlineAuth={isOnlineAuth} />
      )}

      {/* Tab: Servant Curriculum Media & Source Management (Phase 2E.1) */}
      {activeTab === 'sources' && (
        <ServantSourceManagement
          lessons={lessons}
          lang={lang}
          activeLessonId={activeLessonId}
          onViewSource={(src) => setViewingSource(src)}
          onRefresh={refreshCurriculum}
        />
      )}

      {/* Tab 0: Attendance & Visitation Tracker */}
      {activeTab === 'attendance' && (
        isOnlineAuth ? (
          <section role="status" className="rounded-3xl border border-amber-300 bg-amber-50 p-6 text-stone-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            <h2 className="font-black">{lang === 'ar' ? 'الحضور والافتقاد مش متاحين للحسابات المتصلة' : 'Attendance is unavailable for online accounts'}</h2>
            <p className="mt-2 text-sm leading-relaxed">
              {lang === 'ar'
                ? 'المتابعة الحالية بتستخدم أسماء تجريبية، والتغييرات بتتحفظ على المتصفح بس من غير حفظ موثوق على الخادم. عشان كده مش هنعرضها كبيانات فصل حقيقية.'
                : 'The current tracker uses sample names and stores changes only in this browser, with no trusted server persistence. It is not shown as real class attendance.'}
            </p>
          </section>
        ) : (
          <AttendanceVisitationTracker lang={lang} />
        )
      )}

      {/* Tab 1: Secondary Assistant & Lesson Generator */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-[var(--color-church-cream-dark)] dark:border-slate-800 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-2xs">
              <Sparkles size={28} />
            </div>
            <h2 className="text-xl font-bold text-[var(--color-church-blue)] dark:text-white">
              {lang === 'ar' ? 'إنشاء درس (اختيار إضافي)' : 'Generate Lesson (Secondary Option)'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
              {lang === 'ar' 
                ? 'يمكنك تسجيل صوتك أو رفع ملف صوتي لتوليد مسودة درس، أو استخدام زر "نشر درس جديد" الأساسي لإنشاء ونشر الدرس فوراً بدون ذكاء اصطناعي.' 
                : 'Record your teaching voice or upload audio to generate a draft lesson, or use the primary "Publish Lesson" button to create lessons directly without AI input.'}
            </p>

            <div className="flex justify-center items-center gap-4 pt-4">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRecord}
                className={`w-32 h-32 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                  aiStatus === 'recording' 
                    ? 'bg-red-50 text-red-500 border-2 border-red-500 animate-pulse' 
                    : 'bg-[var(--color-church-cream)] dark:bg-slate-800 text-[var(--color-church-blue)] dark:text-white hover:bg-[var(--color-church-cream-dark)]'
                }`}
              >
                <Mic size={32} />
                <span className="font-bold text-xs sm:text-sm">
                  {aiStatus === 'recording' ? (lang === 'ar' ? 'إيقاف التسجيل' : 'Stop') : (lang === 'ar' ? 'ابدأ التسجيل' : 'Record Voice')}
                </span>
              </motion.button>
              
              <input 
                type="file" 
                accept="audio/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
              />
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 rounded-3xl flex flex-col items-center justify-center gap-2 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-[var(--color-church-gold)] hover:text-[var(--color-church-gold)] transition-colors cursor-pointer"
              >
                <Upload size={32} />
                <span className="font-bold text-xs sm:text-sm">{lang === 'ar' ? 'رفع ملف صوتي' : 'Upload Audio'}</span>
              </motion.button>
            </div>
          </div>

          {aiStatus === 'error' && (
             <div className="bg-red-50 dark:bg-red-950/30 p-5 rounded-2xl border border-red-200 text-center text-red-600 dark:text-red-400 font-bold text-xs sm:text-sm">
                {lang === 'ar' ? 'حدث خطأ أثناء معالجة الصوت بالذكاء الاصطناعي. يرجى المحاولة مرة أخرى.' : 'Failed to process audio with Gemini AI. Please try again.'}
             </div>
          )}

          {aiStatus === 'processing' && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-blue-200 dark:border-blue-900 flex flex-col items-center justify-center space-y-3">
              <div className="animate-spin text-[var(--color-church-gold)]">
                <Wand2 size={36} />
              </div>
              <p className="font-bold text-[var(--color-church-blue)] dark:text-white text-sm">
                {lang === 'ar' ? 'جاري تفريغ الصوت وصياغة الأسئلة بواسطة Gemini...' : 'Gemini is transcribing audio and generating lesson draft...'}
              </p>
            </motion.div>
          )}

          {/* AI Review & Approval Panel */}
          {aiStatus === 'done' && generatedData && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-emerald-200 dark:border-emerald-800 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 size={22} />
                  <h3>{lang === 'ar' ? 'تم إنشاء مسودة الدرس بنجاح • مراجعة الخادم' : 'Draft generated successfully • Servant review'}</h3>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-bold">
                  {lang === 'ar' ? 'جاهز للاعتماد' : 'Ready for Approval'}
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500">{lang === 'ar' ? 'عنوان الدرس المقترح' : 'Suggested Title'}</label>
                  <input 
                    type="text" 
                    className="w-full font-bold text-lg text-[var(--color-church-blue)] dark:text-white border-b border-gray-200 dark:border-slate-700 focus:border-[var(--color-church-gold)] outline-none py-1.5 bg-transparent" 
                    value={generatedData.title || ''} 
                    onChange={(e) => setGeneratedData({ ...generatedData, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500">{lang === 'ar' ? 'ملخص المحتوى' : 'AI Summary'}</label>
                  <textarea 
                    className="w-full text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-slate-700 rounded-xl p-3 focus:border-[var(--color-church-gold)] outline-none resize-none h-28 text-xs sm:text-sm bg-gray-50 dark:bg-slate-800/40" 
                    value={generatedData.summary || ''} 
                    onChange={(e) => setGeneratedData({ ...generatedData, summary: e.target.value })}
                  />
                </div>
                <div className="bg-[var(--color-church-cream)] dark:bg-slate-800/60 p-5 rounded-2xl border border-[var(--color-church-gold)]/20">
                  <h4 className="font-bold text-[var(--color-church-blue)] dark:text-white mb-3 flex items-center gap-2 text-sm">
                    <FileText size={18}/> 
                    <span>{lang === 'ar' ? `الأسئلة المولدة (${generatedData.quiz?.length || 0})` : `Generated Quizzes (${generatedData.quiz?.length || 0})`}</span>
                  </h4>
                  <ul className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 space-y-2.5">
                     {generatedData.quiz?.map((q: any, i: number) => (
                       <li key={i} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
                         <strong>{i+1}. {q.question}</strong>
                         <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                           {lang === 'ar' ? 'الخيارات: ' : 'Options: '}
                           {Array.isArray(q.options) ? q.options.join(', ') : 'True / False'}
                         </p>
                       </li>
                     ))}
                  </ul>
                </div>
              </div>
              
              <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button 
                  onClick={handleSaveGeneratedDraft}
                  className="flex-1 bg-[var(--color-church-blue)] hover:bg-blue-900 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
                >
                  <FileText size={16} />
                  <span>{lang === 'ar' ? 'حفظ كمسودة بالذكاء الاصطناعي (AI_DRAFT)' : 'Save as AI Draft (AI_DRAFT)'}</span>
                </button>
                <button 
                  className="px-5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl transition-colors cursor-pointer text-xs sm:text-sm" 
                  onClick={() => {
                    setAiStatus('idle');
                    setGeneratedData(null);
                  }}
                >
                  {lang === 'ar' ? 'تجاهل المسودة' : 'Discard Draft'}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Tab 2: Full Lessons Management */}
      {/* Tab: Universal Church Curriculum & Lessons Management */}
      {activeTab === 'lessons' && (
        <div className="space-y-5">
          {/* Top Header & Publishing Actions */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-stone-200 dark:border-stone-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-[var(--color-church-blue)] dark:text-white">
                  {lang === 'ar' ? 'مكتبة ومناهج مدارس الأحد الكنسية' : 'Church Curriculum & Lessons Library'}
                </h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/60">
                  {filteredTeacherLessons.length} {lang === 'ar' ? 'درس متاح' : 'Lessons'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {lang === 'ar' 
                  ? 'الدروس المتاحة للمراجعة والإدارة حسب صلاحياتك وفصولك المسندة.'
                  : 'Lessons available for review and management under your assigned permissions.'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Direct Manual Lesson Creator */}
              <button
                type="button"
                onClick={() => {
                  setEditingLesson({
                    id: '',
                    title: '',
                    summary: '',
                    grade: activeSession?.grade || '4th Grade',
                    status: 'draft',
                    date: new Date().toISOString().split('T')[0],
                    pointsAvailable: 150,
                    quiz: [
                      {
                        question: lang === 'ar' ? 'ما الفكرة الروحية الرئيسية للدرس؟' : 'What is the main spiritual takeaway of this lesson?',
                        options: [
                          lang === 'ar' ? 'الإيمان ومحبة الله' : 'Faith and loving God',
                          lang === 'ar' ? 'الابتعاد عن الصلاة' : 'Avoiding prayer',
                          lang === 'ar' ? 'الكسل' : 'Laziness',
                          lang === 'ar' ? 'التردد' : 'Hesitation'
                        ],
                        correctIndex: 0
                      }
                    ]
                  });
                }}
                className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 text-[var(--color-church-blue)] dark:text-stone-200 font-bold text-xs flex items-center gap-1.5 border border-stone-300 dark:border-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>{lang === 'ar' ? 'مسودة يدوية' : 'Manual Draft'}</span>
              </button>

            </div>
          </div>

          <div role="status" className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
            {lang === 'ar'
              ? 'ملخص تقدم الطلاب ونتائج الاختبارات مش متاح هنا لحد ما يتوصل بقراءة موثوقة من قاعدة البيانات. مش هنعرض أرقام تجريبية أو محفوظة محلياً على إنها نتائج حقيقية.'
              : 'Student progress and quiz summaries are unavailable here until a trusted database read path is connected. Demo or browser-cached values are not presented as real results.'}
          </div>

          <LessonPublicationManager
            lessons={filteredTeacherLessons}
            lessonVersions={lessonVersions || {}}
            lang={lang}
            canManage={isOnlineAuth && (hasRole(userData, 'teacher') || hasRole(userData, 'admin'))}
            role={hasRole(userData, 'admin') ? 'admin' : hasRole(userData, 'teacher') ? 'teacher' : undefined}
            userId={userData?.id}
            onRefresh={refreshCurriculum}
          />

          {/* Universal Grade Level Filter Bar */}
          <div className="space-y-2.5 bg-stone-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-stone-200 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-600 dark:text-stone-300">
                <Filter size={14} className="text-amber-500" />
                <span>{lang === 'ar' ? 'تصفية المرحلة الدراسية:' : 'Grade Level:'}</span>
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 max-w-xs min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={lessonSearchQuery}
                  onChange={(e) => setLessonSearchQuery(e.target.value)}
                  placeholder={lang === 'ar' ? 'بحث في جميع الدروس...' : 'Search all lessons...'}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 placeholder-stone-400 outline-none focus:border-amber-500"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-stone-600 dark:text-stone-300">
                <span>{lang === 'ar' ? 'الحالة:' : 'Status:'}</span>
                <select
                  value={lessonStatusFilter}
                  onChange={event => setLessonStatusFilter(event.target.value as typeof lessonStatusFilter)}
                  aria-label={lang === 'ar' ? 'تصفية الدروس حسب الحالة' : 'Filter lessons by status'}
                  className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-700 dark:bg-slate-800"
                >
                  <option value="ALL">{lang === 'ar' ? 'كل الحالات' : 'All statuses'}</option>
                  <option value="draft">{lang === 'ar' ? 'مسودة' : 'Draft'}</option>
                  <option value="published">{lang === 'ar' ? 'منشور' : 'Published'}</option>
                </select>
              </label>
            </div>

            {/* Segmented Grade Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'ALL', labelEn: 'All Grades', labelAr: 'جميع المراحل' },
                { id: 'pre-k', labelEn: 'Pre-K & KG', labelAr: 'حضانة' },
                { id: '1st-2nd', labelEn: '1st & 2nd', labelAr: 'أولى وتانية' },
                { id: '3rd-4th', labelEn: '3rd & 4th', labelAr: 'تالتة ورابعة' },
                { id: '5th-6th', labelEn: '5th & 6th', labelAr: 'خامسة وسادسة' },
                { id: 'prep', labelEn: 'Middle School', labelAr: 'إعدادي' },
                { id: 'sec', labelEn: 'High School', labelAr: 'ثانوي وشباب' },
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => setLessonGradeFilter(g.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                    lessonGradeFilter === g.id
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-slate-700 border border-stone-200 dark:border-stone-700'
                  }`}
                >
                  {lang === 'ar' ? g.labelAr : g.labelEn}
                </button>
              ))}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-[11px] border-t border-stone-200/60 dark:border-slate-800/60">
              {[
                { id: 'ALL', labelEn: 'All Categories', labelAr: 'كل الأقسام' },
                { id: 'bible', labelEn: '📖 Bible Stories', labelAr: '📖 قصص الكتاب' },
                { id: 'hymns', labelEn: '🎵 Hymns & Liturgy', labelAr: '🎵 ألحان وطقوس' },
                { id: 'history', labelEn: '☦️ Church History', labelAr: '☦️ تاريخ الكنيسة' },
                { id: 'virtues', labelEn: '🕊️ Coptic Virtues', labelAr: '🕊️ فضائل مسيحية' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setLessonCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                    lessonCategoryFilter === cat.id
                      ? 'bg-[var(--color-church-blue)] text-white font-bold'
                      : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
                  }`}
                >
                  {lang === 'ar' ? cat.labelAr : cat.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Lessons Grid / List */}
          <div className="space-y-3">
            {filteredTeacherLessons.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-3">
                <p className="text-sm text-stone-500 font-medium">
                  {lessons.length === 0
                    ? (lang === 'ar' ? 'لسه مفيش دروس ظاهرة. ابدأ بنشر درس جديد من الزر اللي فوق.' : 'No lessons are available yet. Start by publishing a lesson with the button above.')
                    : (lang === 'ar' ? 'مفيش دروس مطابقة للبحث أو الفلاتر. جرّب تغيّر الاختيارات.' : 'No lessons match these filters. Try changing your selections.')}
                </p>
                {lessons.length > 0 && (
                  <button
                    onClick={() => {
                      setLessonGradeFilter('ALL');
                      setLessonCategoryFilter('ALL');
                      setLessonStatusFilter('ALL');
                      setLessonSearchQuery('');
                    }}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 text-stone-700 dark:text-stone-200 rounded-xl text-xs font-bold"
                  >
                    {lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
                  </button>
                )}
              </div>
            ) : (
              filteredTeacherLessons.map(lesson => (
                <div 
                  key={lesson.id} 
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xs border border-stone-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:border-amber-400/80"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-[var(--color-church-blue)] dark:text-white">
                        {lesson.title}
                      </h3>
                      {lesson.titleAr && lesson.titleAr !== lesson.title && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-bold font-sans" dir="rtl">
                          {lesson.titleAr}
                        </span>
                      )}

                      {/* Grade Badge */}
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {lesson.grade || 'All Grades'}
                      </span>

                      {/* Category Badge */}
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                        {lesson.category || 'Curriculum'}
                      </span>

                      {/* Publish Status Badge */}
                      <button
                        disabled={isOnlineAuth && Boolean(curriculumError)}
                        onClick={() => {
                          if (isOnlineAuth) {
                            alert(lang === 'ar' 
                              ? 'حماية النشر: النشر الإلكتروني محمي ومعتمد عبر استوديو الاعتماد الكنسي.' 
                              : 'Publication Protection: Online lessons require servant review and approval.');
                            return;
                          }
                          togglePublish(lesson.id);
                        }}
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-black transition-colors ${
                          isOnlineAuth && curriculumError
                            ? 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
                            : lesson.status === 'published'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                        }`}
                        title={isOnlineAuth && curriculumError
                          ? (lang === 'ar' ? 'حالة النشر غير مؤكدة بسبب تعذر تحديث المنهج' : 'Publication status is unverified because the curriculum refresh failed')
                          : (lang === 'ar' ? 'حالة النشر' : 'Publish status')}
                      >
                        {isOnlineAuth && curriculumError
                          ? (lang === 'ar' ? 'حالة غير مؤكدة' : 'Unverified')
                          : lesson.status === 'published'
                          ? (lang === 'ar' ? 'منشور ✅' : 'Published ✅') 
                          : (lang === 'ar' ? 'مسودة 📝' : 'Draft 📝')}
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {lesson.summary || lesson.summaryAr}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
                      <span>{lesson.date || 'Active Curriculum'}</span>
                      <span>•</span>
                      <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                        {lesson.pointsAvailable || 150} pts
                      </span>
                      <span>•</span>
                      <span>{lesson.quiz?.length || 3} questions</span>
                      {lesson.videoUrl && (
                        <>
                          <span>•</span>
                          <span className="text-red-500 font-semibold">🎥 Video Included</span>
                        </>
                      )}
                      {lesson.slidesUrl && (
                        <>
                          <span>•</span>
                          <span className="text-amber-600 font-semibold">📑 Slides Included</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Teacher Action Controls */}
                  <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
                    {/* Open as Student Preview */}
                    {lesson.status === 'published' && (
                      <button 
                        onClick={() => openStudentPreview(lesson.id)}
                        className="text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        title={lang === 'ar' ? 'معاينة رحلة التلميذ بدون حفظ التقدم' : 'Preview the student journey without saving progress'}
                      >
                        <Eye size={14} className="text-blue-500" />
                        <span>{lang === 'ar' ? 'معاينة التلميذ' : 'Student preview'}</span>
                      </button>
                    )}

                    {/* Teach in Class (Assign to active class session) */}
                    <button
                      onClick={() => handleAssignLessonToClass(lesson)}
                      className="text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      title={lang === 'ar' ? 'تعيين هذا الدرس لتدريسه في فصلي النشط' : 'Assign to teach in active Sunday School session'}
                    >
                      <School size={14} className="text-amber-700 dark:text-amber-400" />
                      <span>{lang === 'ar' ? 'تدريس في فصلي' : 'Teach in Class'}</span>
                    </button>

                    {/* Edit Lesson */}
                    <button 
                      onClick={() => setEditingLesson(lesson)}
                      className="text-xs font-bold text-[var(--color-church-blue)] dark:text-blue-300 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit3 size={14} />
                      <span>{lang === 'ar' ? 'تعديل' : 'Edit'}</span>
                    </button>

                    {/* Delete Lesson */}
                    <button 
                      onClick={() => {
                        if (confirm(lang === 'ar' ? 'هل تريد حذف هذا الدرس؟' : 'Delete this lesson?')) {
                          deleteLesson(lesson.id);
                        }
                      }}
                      className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-xl transition-colors cursor-pointer"
                      title={lang === 'ar' ? 'حذف الدرس' : 'Delete Lesson'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Moderation Queue */}
      {activeTab === 'moderation' && (
        <div role="status" className="rounded-3xl border border-amber-300 bg-amber-50 p-6 text-stone-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
            <div>
              <h2 className="font-black">{lang === 'ar' ? 'قائمة الإشراف مش متاحة' : 'Moderation queue unavailable'}</h2>
              <p className="mt-2 text-sm leading-relaxed">
                {lang === 'ar'
                  ? 'مفيش اتصال موثوق ببيانات البلاغات أو بإجراءات الإشراف. مش هنعرض منشورات تجريبية أو نقول إن مفيش بلاغات من غير ما نقدر نتحقق.'
                  : 'There is no trusted connection to moderation reports or actions. Demo posts are not shown, and we cannot claim the queue is empty without checking its data source.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Edit Modal (Edit or Direct Manual Creation) */}
      {editingLesson && (
        <LessonEditModal
          lesson={editingLesson}
          isNew={!editingLesson.id}
          isOpen={Boolean(editingLesson)}
          onClose={() => setEditingLesson(null)}
          onSave={async (updates) => {
            if (!editingLesson.id) {
              addLesson({
                id: updates.id,
                title: updates.title || (lang === 'ar' ? 'درس جديد' : 'New Sunday School Lesson'),
                summary: updates.summary || '',
                status: 'draft',
                date: new Date().toISOString().split('T')[0],
                pointsAvailable: 150,
                grade: editingLesson.grade || '4th Grade',
                quiz: updates.quiz
              });
            } else {
              updateLesson(editingLesson.id, updates);
            }
            if (isOnlineAuth && refreshCurriculum) {
              await refreshCurriculum();
            }
          }}
          lang={lang}
        />
      )}

      {/* Built-in PDF Document Viewer Modal */}
      {viewingSource && viewingSource.type === 'PDF' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md p-4 sm:p-8 flex items-center justify-center">
          <div className="w-full max-w-4xl">
            <PdfDocumentViewer
              source={viewingSource}
              onClose={() => setViewingSource(null)}
            />
          </div>
        </div>
      )}

      {/* Built-in PPTX Slide Deck Viewer Modal */}
      {(viewingSlides || (viewingSource && viewingSource.type === 'PPTX')) && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 sm:p-8 flex items-center justify-center">
          <div className="w-full max-w-5xl">
            <SlideDeckViewer
              slides={viewingSlides || activeVersions[0]?.slides || []}
              source={viewingSource || undefined}
              onClose={() => {
                setViewingSlides(null);
                setViewingSource(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Evidence Coverage & Grounding Modal */}
      {showEvidenceModal && (
        <EvidenceCoverageModal
          evidenceMap={activeEvidenceMap}
          sources={activeSources}
          allowInternetSearch={activeSession?.allowInternetSearch ?? false}
          onClose={() => setShowEvidenceModal(false)}
          onOpenSourceViewer={(src) => {
            setShowEvidenceModal(false);
            setViewingSource(src);
          }}
        />
      )}

      {/* Express Lesson Publishing Modal (AI-Free Servant Funnel) */}
      <ExpressLessonPublishModal
        isOpen={showExpressPublishModal}
        onClose={() => setShowExpressPublishModal(false)}
        lang={lang}
        defaultGrade={activeSession?.grade || '4th Grade'}
        onLessonCreated={async (newLesson) => {
          addLesson(newLesson);
          if (isOnlineAuth && refreshCurriculum) {
            await refreshCurriculum();
          }
        }}
      />
    </div>
  );
}
