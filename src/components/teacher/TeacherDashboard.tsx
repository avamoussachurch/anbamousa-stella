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
  ExternalLink,
  ShieldCheck,
  Globe,
  Award,
  BookOpen,
  School,
  FolderOpen,
  Search,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useLessons } from '../../context/LessonsContext';
import { Lesson, QuizQuestion, LessonSource, PresentationSlide, ServantComment } from '../../types';
import { LessonEditModal } from './LessonEditModal';
import { ExpressLessonPublishModal } from './ExpressLessonPublishModal';
import { AttendanceVisitationTracker } from './AttendanceVisitationTracker';
import { UserCheck } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { createLessonDraft } from '../../lib/lessonAuthoringService';

import { ManualLessonStudio } from '../sunday-school/teacher/ManualLessonStudio';
import { TeacherMasteryReview } from '../sunday-school/teacher/TeacherMasteryReview';
import { ServantClassManagement } from './ServantClassManagement';
import { ServantSourceManagement } from './ServantSourceManagement';
import { getPendingActivationRequests } from '../../lib/onboardingService';
import { EvidenceCoverageModal } from '../sunday-school/evidence/EvidenceCoverageModal';
import { LessonEngagementSummary } from './LessonEngagementSummary';
import { PdfDocumentViewer } from '../sunday-school/viewers/PdfDocumentViewer';
import { SlideDeckViewer } from '../sunday-school/viewers/SlideDeckViewer';
import { TeacherPublishingHub } from './publishing/TeacherPublishingHub';

interface TeacherDashboardProps {
  onBackToApp?: () => void;
  onOpenParentPortal?: () => void;
  onPreviewLesson?: (lessonId: string) => void;
  lang?: 'en' | 'ar';
}

export function TeacherDashboard({ 
  onBackToApp, 
  onOpenParentPortal,
  onPreviewLesson,
  lang = 'en' 
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

  const [activeTab, setActiveTab] = useState<'attendance' | 'sundaySchool' | 'sources' | 'mastery' | 'classManagement' | 'ai' | 'lessons' | 'moderation'>('sundaySchool');
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

  // Universal Teacher Lesson Library Filters (Unrestricted site-wide access)
  const [lessonGradeFilter, setLessonGradeFilter] = useState<string>('ALL');
  const [lessonCategoryFilter, setLessonCategoryFilter] = useState<string>('ALL');
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
  }, [lessons, lessonGradeFilter, lessonCategoryFilter, lessonSearchQuery]);

  const handleAssignLessonToClass = (targetLesson: Lesson) => {
    if (activeSession) {
      updateClassSession(activeSession.id, {
        activeLessonId: targetLesson.id,
        title: targetLesson.title,
        topic: targetLesson.titleAr ? `${targetLesson.title} (${targetLesson.titleAr})` : targetLesson.title,
        grade: targetLesson.grade || activeSession.grade
      });
      alert(lang === 'ar' 
        ? `تم تعيين درس "${targetLesson.titleAr || targetLesson.title}" ليكون درس الفصل النشط في استوديو مدارس الأحد!`
        : `Lesson "${targetLesson.title}" is now active in Sunday School Class Session!`);
      setActiveTab('sundaySchool');
    }
  };

  // Pending activation requests count
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  React.useEffect(() => {
    let isMounted = true;
    getPendingActivationRequests().then((res) => {
      if (!isMounted) return;
      if (res.success && res.requests) {
        setPendingRequestsCount(res.requests.filter(r => r.status === 'PENDING_APPROVAL').length);
      }
    }).catch(() => {});

    return () => { isMounted = false; };
  }, [activeTab]);

  // Moderation state
  const [flaggedPosts, setFlaggedPosts] = useState<Array<{ id: string; author: string; content: string; flagReason: string }>>([
    {
      id: 'flag-1',
      author: 'George N.',
      content: 'Can someone share their homework answers before Sunday service?',
      flagReason: lang === 'ar' ? 'طلب إجابات الواجب' : 'Requesting homework answers'
    }
  ]);
  
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
        alert(lang === 'ar' ? `تعذر حفظ مسودة الدرس: ${result.error.message}` : `Failed to save draft: ${result.error.message}`);
        return;
      }

      if (refreshCurriculum) {
        await refreshCurriculum();
      }

      alert(lang === 'ar' 
        ? 'تم إنشاء مسودة الدرس بنجاح بحالة (AI_DRAFT). لن يظهر الدرس للطلاب حتى يتم مراجعته واعتماده رسمياً.' 
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

    alert(lang === 'ar' ? 'تم حفظ مسودة الدرس محلياً!' : 'Lesson draft saved locally!');
    setGeneratedData(null);
    setAiStatus('idle');
    setActiveTab('lessons');
  };

  return (
    <div className="pb-28 pt-4 px-4 max-w-5xl mx-auto space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Top Header with Back to Church App & Logout Button */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 shadow-sm border border-[var(--color-church-cream-dark)] dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="p-2.5 rounded-2xl bg-[var(--mousa-sand-100)] dark:bg-stone-800 hover:bg-[var(--mousa-sand-200)] text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] transition-colors flex items-center justify-center shrink-0 border border-[var(--mousa-border-sand)] cursor-pointer"
              title={lang === 'ar' ? 'العودة للتطبيق الرئيسي' : 'Return to Main App'}
            >
              <ArrowLeft size={20} className={lang === 'ar' ? 'rotate-180' : ''} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
                {lang === 'ar' ? 'استوديو الخادم ومدارس الأحد' : 'Teacher & Servant Studio'}
              </h1>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-black bg-[var(--mousa-gold-soft)] text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)] border border-[var(--mousa-gold)]/30">
                {lang === 'ar' ? 'صلاحيات المعلم' : 'Teacher Access'}
              </span>
            </div>
            <p className="text-xs md:text-sm text-[var(--mousa-sand-500)] mt-0.5 font-bold">
              {lang === 'ar' 
                ? `مرحباً ${userData?.fullName || 'بالخادم'} • رحلة القديس الأنبا موسى لمدارس الأحد` 
                : `Welcome, ${userData?.fullName || 'Servant'} • The Journey of Moses Sunday School`}
            </p>
          </div>
        </div>

        {/* Action Controls: Direct Lesson Funnel, Dual-Role Switcher & Student View */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          {/* Primary Action: Publish Lesson */}
          <button
            type="button"
            onClick={() => setShowExpressPublishModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[var(--mousa-gold)] to-[var(--mousa-coral)] hover:opacity-95 text-white text-xs font-black transition-all flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>{lang === 'ar' ? '+ نشر درس جديد' : '+ Publish Lesson'}</span>
          </button>

          {/* Secondary Action: Generate Lesson */}
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className="px-3.5 py-2 rounded-2xl bg-[var(--mousa-cream-surface)] dark:bg-stone-800 hover:bg-[var(--mousa-sand-100)] text-[var(--mousa-teal-deep)] dark:text-stone-300 text-xs font-bold transition-colors flex items-center gap-1.5 border border-[var(--mousa-border-sand)] cursor-pointer shadow-2xs"
            title={lang === 'ar' ? 'توليد درس كخيار ثانوي' : 'Generate Lesson (Secondary option)'}
          >
            <Sparkles size={14} className="text-[var(--mousa-gold)]" />
            <span>{lang === 'ar' ? 'توليد درس' : 'Generate Lesson'}</span>
          </button>

          {onOpenParentPortal && (
            <button
              onClick={onOpenParentPortal}
              className="px-3.5 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-[var(--mousa-teal-deep)] dark:text-amber-300 text-xs font-bold transition-colors flex items-center gap-1.5 border border-[var(--mousa-border-sand)] cursor-pointer shadow-2xs"
            >
              <span>👨‍👩‍👧</span>
              <span>{lang === 'ar' ? 'بوابة ولي الأمر (أولادي)' : 'Parent Portal (My Kids)'}</span>
            </button>
          )}

          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-3.5 py-2 rounded-2xl bg-[var(--mousa-sand-100)] hover:bg-[var(--mousa-sand-200)] dark:bg-stone-800 text-[var(--mousa-sand-600)] dark:text-gray-200 text-xs font-bold transition-colors cursor-pointer border border-[var(--mousa-border-sand)]"
            >
              {lang === 'ar' ? 'عرض كطالب' : 'Student View'}
            </button>
          )}
        </div>
      </div>

      {/* Pending Account Activation Alert for Servant */}
      {pendingRequestsCount > 0 && activeTab !== 'classManagement' && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-2xl p-4 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🔔</span>
            <div className="font-semibold">
              <span>
                {lang === 'ar' 
                  ? `لديك (${pendingRequestsCount}) طلبات جديدة لتفعيل الحسابات والانضمام للفصل تحتاج لموافقتك.`
                  : `You have (${pendingRequestsCount}) new student account activation requests pending approval.`}
              </span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('classManagement')}
            className="px-3.5 py-1.5 bg-white text-amber-900 hover:bg-amber-50 font-bold rounded-xl text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
          >
            {lang === 'ar' ? 'مراجعة وتسكين الطلاب' : 'Review & Enroll'}
          </button>
        </div>
      )}

      {/* Navigation tabs within Teacher Studio */}
      <div className="flex bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] p-1.5 rounded-2xl max-w-4xl mx-auto shadow-xs border-2 border-[var(--mousa-border-sand)] overflow-x-auto">
        <button 
          onClick={() => setActiveTab('sundaySchool')}
          className={`flex-1 min-w-[140px] py-2.5 font-black text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'sundaySchool' 
              ? 'bg-[var(--mousa-teal)] text-white shadow-xs font-black' 
              : 'text-[var(--mousa-sand-500)] hover:text-[var(--mousa-teal)]'
          }`}
        >
          <School size={16} />
          <span>{lang === 'ar' ? 'منصة النشر (مدارس الأحد • الألحان • الطقس)' : 'Publishing Hub (Lessons • Hymns • Taxis)'}</span>
        </button>
        <button 
          onClick={() => setActiveTab('mastery')}
          className={`flex-1 min-w-[130px] py-2.5 font-black text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'mastery' 
              ? 'bg-[var(--mousa-teal)] text-white shadow-xs font-black' 
              : 'text-[var(--mousa-sand-500)] hover:text-[var(--mousa-teal)]'
          }`}
        >
          <Award size={16} className="text-[var(--mousa-gold)]" />
          <span>{lang === 'ar' ? 'تقييم وإتقان الطلاب' : 'Student Mastery'}</span>
        </button>
        <button 
          onClick={() => setActiveTab('classManagement')}
          className={`flex-1 min-w-[130px] py-2.5 font-black text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
            activeTab === 'classManagement' 
              ? 'bg-[var(--mousa-teal)] text-white shadow-xs font-black' 
              : 'text-[var(--mousa-sand-500)] hover:text-[var(--mousa-teal)]'
          }`}
        >
          <Users size={16} />
          <span>{lang === 'ar' ? 'فصلي وقائمة الطلاب' : 'My Class & Roster'}</span>
          {pendingRequestsCount > 0 && (
            <span className="px-1.5 py-0.2 bg-[var(--mousa-coral)] text-white text-[10px] font-black rounded-full shadow-xs">
              {pendingRequestsCount}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('sources')}
          className={`flex-1 min-w-[130px] py-2.5 font-black text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'sources' 
              ? 'bg-[var(--mousa-teal)] text-white shadow-xs font-black' 
              : 'text-[var(--mousa-sand-500)] hover:text-[var(--mousa-teal)]'
          }`}
        >
          <FolderOpen size={16} />
          <span>{lang === 'ar' ? 'المصادر والوسائط' : 'Media & Sources'}</span>
        </button>
        <button 
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 min-w-[120px] py-2.5 font-black text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'attendance' 
              ? 'bg-[var(--mousa-teal)] text-white shadow-xs font-black' 
              : 'text-[var(--mousa-sand-500)] hover:text-[var(--mousa-teal)]'
          }`}
        >
          <UserCheck size={16} className="text-emerald-600" />
          <span>{lang === 'ar' ? 'الافتقاد والحضور' : 'Attendance & Visits'}</span>
        </button>
        <button 
          onClick={() => setActiveTab('lessons')}
          className={`flex-1 min-w-[110px] py-2.5 font-black text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'lessons' 
              ? 'bg-[var(--mousa-teal)] text-white shadow-xs font-black' 
              : 'text-[var(--mousa-sand-500)] hover:text-[var(--mousa-teal)]'
          }`}
        >
          <FileText size={16} />
          <span>{lang === 'ar' ? `الدروس (${lessons.length})` : `Lessons (${lessons.length})`}</span>
        </button>
        <button 
          onClick={() => setActiveTab('moderation')}
          className={`flex-1 min-w-[110px] py-2.5 font-black text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'moderation' 
              ? 'bg-[var(--mousa-teal)] text-white shadow-xs font-black' 
              : 'text-[var(--mousa-sand-500)] hover:text-[var(--mousa-teal)]'
          }`}
        >
          <ShieldAlert size={16} />
          <span>{lang === 'ar' ? 'الرقابة والإشراف' : 'Moderation'}</span>
        </button>
      </div>

      {/* Tab: Multi-Mode Publishing Hub (Sunday School, Hymns School, Coptic Rituals / Taxis) */}
      {activeTab === 'sundaySchool' && (
        <TeacherPublishingHub
          lang={lang}
          onPreviewLesson={onPreviewLesson}
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
              onPreviewStudentLesson={onPreviewLesson}
              lang={lang}
            />
          }
        />
      )}

      {/* Tab: Student Mastery Evaluation */}
      {activeTab === 'mastery' && (
        <TeacherMasteryReview
          lessonId={activeLessonId}
          lessonTitle={activeLesson?.title || 'Feast of the Holy Cross'}
          contentProgress={studentProgress}
          quizAttempts={quizAttempts}
          masteries={studentMasteries}
          onUpdateMastery={updateStudentMastery}
        />
      )}

      {/* Tab: Servant Class Management & Persistent Roster */}
      {activeTab === 'classManagement' && (
        <ServantClassManagement lang={lang} />
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
        <AttendanceVisitationTracker lang={lang} />
      )}

      {/* Tab 1: Secondary Assistant & Lesson Generator */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-[var(--color-church-cream-dark)] dark:border-slate-800 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-2xs">
              <Sparkles size={28} />
            </div>
            <h2 className="text-xl font-bold text-[var(--color-church-blue)] dark:text-white">
              {lang === 'ar' ? 'توليد درس (خيار مساعد ثانوي)' : 'Generate Lesson (Secondary Option)'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
              {lang === 'ar' 
                ? 'يمكنك تسجيل صوتك أو رفع ملف صوتي لتوليد مسودة درس، أو استخدام زر "نشر درس جديد" الأساسي لإنشاء ونشر الدرس فوراً بدون ذكاء اصطناعي.' 
                : 'Record your teaching voice or upload audio to generate a draft lesson, or use the primary "Publish Lesson" button to create lessons directly without AI input.'}
            </p>

            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setShowExpressPublishModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Plus size={16} className="stroke-[3]" />
                <span>{lang === 'ar' ? 'المسار الأساسي: نشر درس' : 'Primary: Publish Lesson'}</span>
              </button>
            </div>
            
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
                  <h3>{lang === 'ar' ? 'تم إنشاء مسودة الدرس بنجاح • مراجعة المعلم' : 'Draft Generated Successfully • Review & Approve'}</h3>
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
                  ? 'صلاحيات مفتوحة للخادم لمعاينة وتعديل وتدريس أي درس في مناهج الكنيسة لجميع المراحل الدراسية.' 
                  : 'Unrestricted teacher access to preview, edit, and teach any lesson across all church grades.'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Default Primary Action: Publish Lesson (AI-Free) */}
              <button
                type="button"
                onClick={() => setShowExpressPublishModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                title={lang === 'ar' ? 'نشر درس جديد لمدارس الأحد مع الفيديو والشرائح والتسجيل والامتحان (بدون ذكاء اصطناعي)' : 'Publish Lesson directly with slides, video, audio, and tiered quiz (AI-Free)'}
              >
                <Plus size={16} className="stroke-[3]" />
                <span>{lang === 'ar' ? '+ نشر درس جديد' : '+ Publish Lesson'}</span>
              </button>

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

              {/* Secondary Generate Lesson Action */}
              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 font-bold text-xs flex items-center gap-1.5 border border-stone-300 dark:border-stone-700 transition-colors cursor-pointer"
                title={lang === 'ar' ? 'توليد درس كخيار ثانوي' : 'Generate Lesson (Secondary option)'}
              >
                <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
                <span>{lang === 'ar' ? 'توليد درس' : 'Generate Lesson'}</span>
              </button>
            </div>
          </div>

          {/* Visual Student Engagement Summary for Published Lessons */}
          <LessonEngagementSummary
            lessons={lessons}
            studentProgress={studentProgress}
            quizAttempts={quizAttempts}
            studentMasteries={studentMasteries}
            activeGradeFilter={lessonGradeFilter !== 'ALL' ? lessonGradeFilter : undefined}
            lang={lang === 'ar' ? 'ar' : 'en'}
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
                  {lang === 'ar' ? 'لا توجد دروس تطابق هذا الفلتر أو البحث.' : 'No lessons found matching this filter.'}
                </p>
                <button
                  onClick={() => {
                    setLessonGradeFilter('ALL');
                    setLessonCategoryFilter('ALL');
                    setLessonSearchQuery('');
                  }}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 text-stone-700 dark:text-stone-200 rounded-xl text-xs font-bold"
                >
                  {lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
                </button>
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
                        onClick={() => {
                          if (isOnlineAuth) {
                            alert(lang === 'ar' 
                              ? 'حماية النشر: النشر الإلكتروني محمي ومعتمد عبر استوديو الاعتماد الكنسي.' 
                              : 'Publication Protection: Online lessons require servant review and approval.');
                            return;
                          }
                          togglePublish(lesson.id);
                        }}
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-black cursor-pointer transition-colors ${
                          lesson.status === 'published' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
                        }`}
                        title={lang === 'ar' ? 'حالة النشر' : 'Publish status'}
                      >
                        {lesson.status === 'published' 
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
                    {onPreviewLesson && (
                      <button 
                        onClick={() => onPreviewLesson(lesson.id)}
                        className="text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        title={lang === 'ar' ? 'معاينة تجربة قراءة وقصة الطالب' : 'Preview student story reader & quiz'}
                      >
                        <Eye size={14} className="text-blue-500" />
                        <span>{lang === 'ar' ? 'معاينة كطالب' : 'Open as Student'}</span>
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
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-[var(--color-church-cream-dark)] dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={24} className="text-emerald-600" />
                <h3 className="font-bold text-base text-[var(--color-church-blue)] dark:text-white">
                  {lang === 'ar' ? 'طابور الرقابة وإشراف الخادم' : 'Community Moderation Queue'}
                </h3>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-[var(--color-church-blue)]">
                {flaggedPosts.length} {lang === 'ar' ? 'منشورات للمراجعة' : 'to review'}
              </span>
            </div>

            {flaggedPosts.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <ShieldAlert size={40} className="text-gray-300 mx-auto" />
                <p className="font-bold text-gray-700 dark:text-gray-300 text-sm">
                  {lang === 'ar' ? 'لا توجد منشورات مخالفة معلقة' : 'No pending posts to review. Great job!'}
                </p>
                <p className="text-xs text-gray-400">
                  {lang === 'ar' ? 'جميع مشاركات الطلاب ملتزمة بالآداب الكنسية' : 'All student community discussions are clean and polite.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {flaggedPosts.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-amber-50/60 dark:bg-slate-800 border border-amber-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-900 dark:text-white">{item.author}</span>
                      <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">{item.flagReason}</span>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 italic">"{item.content}"</p>
                    <div className="flex gap-2 pt-2 justify-end">
                      <button 
                        onClick={() => setFlaggedPosts(prev => prev.filter(f => f.id !== item.id))}
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer"
                      >
                        {lang === 'ar' ? 'موافقة ونشر' : 'Approve'}
                      </button>
                      <button 
                        onClick={() => setFlaggedPosts(prev => prev.filter(f => f.id !== item.id))}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 font-bold hover:bg-red-200 cursor-pointer"
                      >
                        {lang === 'ar' ? 'حذف المنشور' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
