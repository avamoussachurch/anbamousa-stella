import React, { useState, useEffect, useRef } from 'react';
import {
  School,
  Calendar,
  Users,
  BookOpen,
  Plus,
  Trash2,
  Video,
  FileText,
  Mic,
  Square,
  Eye,
  Save,
  Upload,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  Flame,
  ArrowRight,
  ExternalLink,
  Volume2,
  Sparkles,
  ChevronRight,
  Layers,
  FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lesson, ClassSession, QuizQuestion, QuestionDifficulty, PresentationSlide } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { isSupabaseConfigured } from '../../../lib/supabase';
import { publishExpressLesson } from '../../../lib/lessonAuthoringService';
import { getAuthorizedSourceUrl, uploadSourceMedia } from '../../../lib/lessonSourceService';
import { InAppDocumentViewer } from '../viewers/InAppDocumentViewer';

interface ManualLessonStudioProps {
  sessions: ClassSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onCreateSession: (data: Partial<ClassSession>) => void;
  onUpdateSession: (id: string, updates: Partial<ClassSession>) => void;
  lessons: Lesson[];
  activeLessonId?: string;
  onSaveLesson: (lessonData: Lesson) => void;
  onPublishLesson: (lessonData: Lesson, assignToSessionId?: string) => Promise<void> | void;
  onPreviewStudentLesson?: (lessonId: string) => void;
  lang?: 'en' | 'ar';
}

export const ManualLessonStudio: React.FC<ManualLessonStudioProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onUpdateSession,
  lessons,
  activeLessonId,
  onSaveLesson,
  onPublishLesson,
  onPreviewStudentLesson,
  lang = 'en'
}) => {
  const isAr = lang === 'ar';
  const { userData, isGuest } = useAuth();
  const isOnlineAuth = !isGuest && Boolean(userData) && isSupabaseConfigured;

  // Active session resolution
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  // Active or selected curriculum lesson resolution
  const initialLesson = lessons.find(l => l.id === activeLessonId) ||
    lessons.find(l => l.id === activeSession?.activeLessonId) ||
    lessons[0];

  // View Mode: 'split' (side-by-side on desktop), 'editor', 'preview'
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');

  // Quick session creator modal
  const [showCreateSessionModal, setShowCreateSessionModal] = useState<boolean>(false);
  const [newSessionTitle, setNewSessionTitle] = useState<string>('');
  const [newSessionGrade, setNewSessionGrade] = useState<string>('4th Grade');
  const [newSessionDate, setNewSessionDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Load lesson modal
  const [showLoadLessonModal, setShowLoadLessonModal] = useState<boolean>(false);

  // Core Lesson Editor State
  const [currentLessonId, setCurrentLessonId] = useState<string>(initialLesson?.id || 'l-manual-1');
  const [title, setTitle] = useState<string>(initialLesson?.title || '');
  const [titleAr, setTitleAr] = useState<string>(initialLesson?.titleAr || '');
  const [category, setCategory] = useState<'bible' | 'hymns' | 'history' | 'virtues'>(initialLesson?.category || 'bible');
  const [gradeLevel, setGradeLevel] = useState<string>(initialLesson?.grade || activeSession?.grade || '4th Grade');
  const [summary, setSummary] = useState<string>(initialLesson?.summary || '');
  const [summaryAr, setSummaryAr] = useState<string>(initialLesson?.summaryAr || '');

  // Scripture Memory Verse
  const [scriptureVerse, setScriptureVerse] = useState<string>(initialLesson?.scriptureVerseEn || '');
  const [scriptureVerseAr, setScriptureVerseAr] = useState<string>(initialLesson?.scriptureVerseAr || '');
  const [verseReference, setVerseReference] = useState<string>(initialLesson?.verseReference || '');
  const [versePoints, setVersePoints] = useState<number>(50);

  // Media & Teaching Materials
  const [videoUrl, setVideoUrl] = useState<string>(initialLesson?.videoUrl || '');
  const [slidesUrl, setSlidesUrl] = useState<string>(initialLesson?.slidesUrl || '');
  const [slidesPreviewUrl, setSlidesPreviewUrl] = useState<string>('');
  const [slidesFileName, setSlidesFileName] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>(initialLesson?.audioUrl || '');
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string>('');
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [teacherNotes, setTeacherNotes] = useState<string>(initialLesson?.teacherNotes || '');
  const [writtenExplanation, setWrittenExplanation] = useState<string>(initialLesson?.writtenExplanation || '');
  const [imageUrl, setImageUrl] = useState<string>(initialLesson?.imageUrl || '');
  const [showPreviewDocumentModal, setShowPreviewDocumentModal] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    if (audioUrl) {
      getAuthorizedSourceUrl(audioUrl).then(url => {
        if (!cancelled) setAudioPreviewUrl(url);
      });
    } else {
      setAudioPreviewUrl('');
    }
    return () => { cancelled = true; };
  }, [audioUrl]);

  useEffect(() => {
    let cancelled = false;
    if (slidesUrl) {
      getAuthorizedSourceUrl(slidesUrl).then(url => {
        if (!cancelled) setSlidesPreviewUrl(url);
      });
    } else {
      setSlidesPreviewUrl('');
    }
    return () => { cancelled = true; };
  }, [slidesUrl]);

  // Live voice recording
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Upload status
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);
  const [uploadNote, setUploadNote] = useState<string>('');

  // Tiered Quizzes (Easy, Medium, Hard)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(() => {
    if (initialLesson?.quiz && initialLesson.quiz.length > 0) {
      return initialLesson.quiz;
    }
    return [
      {
        id: 'q-1',
        question: isAr ? 'ما الفكرة الروحية الرئيسية المستفادة من هذا الدرس؟' : 'What is the main spiritual lesson taught today?',
        options: [
          isAr ? 'محبة الله والأمانة في الصلاة' : 'Loving God and faithful prayer',
          isAr ? 'الابتعاد عن الكنيسة' : 'Neglecting church and sacraments',
          isAr ? 'الكسل والتردد' : 'Laziness and doubt',
          isAr ? 'التذمر المستمر' : 'Complaining without gratitude'
        ],
        correctIndex: 0,
        difficulty: 'EASY',
        points: 10
      }
    ];
  });

  // Secondary Assistant Question Helper (Optional)
  const [isAiGeneratingQuiz, setIsAiGeneratingQuiz] = useState<boolean>(false);
  const [aiHelperMessage, setAiHelperMessage] = useState<string | null>(null);

  // Notification Banner
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Interactive Live Preview State (for student quiz testing)
  const [previewSelectedAnswers, setPreviewSelectedAnswers] = useState<Record<number, number>>({});
  const [previewRevealed, setPreviewRevealed] = useState<Record<number, boolean>>({});

  // When a different initial lesson is loaded
  const handleLoadLesson = (targetLesson: Lesson) => {
    setCurrentLessonId(targetLesson.id);
    setTitle(targetLesson.title || '');
    setTitleAr(targetLesson.titleAr || '');
    setCategory(targetLesson.category || 'bible');
    setGradeLevel(targetLesson.grade || '4th Grade');
    setSummary(targetLesson.summary || '');
    setSummaryAr(targetLesson.summaryAr || '');
    setScriptureVerse(targetLesson.scriptureVerseEn || '');
    setScriptureVerseAr(targetLesson.scriptureVerseAr || '');
    setVerseReference(targetLesson.verseReference || '');
    setVideoUrl(targetLesson.videoUrl || '');
    setSlidesUrl(targetLesson.slidesUrl || '');
    setAudioUrl(targetLesson.audioUrl || '');
    setTeacherNotes(targetLesson.teacherNotes || '');
    setWrittenExplanation(targetLesson.writtenExplanation || '');
    setImageUrl(targetLesson.imageUrl || '');
    if (targetLesson.quiz && targetLesson.quiz.length > 0) {
      setQuizQuestions(targetLesson.quiz);
    }
    setShowLoadLessonModal(false);
    setFeedbackMessage({
      type: 'success',
      text: isAr ? `تم تحميل درس "${targetLesson.titleAr || targetLesson.title}" إلى استوديو النشر!` : `Loaded "${targetLesson.title}" into the Manual Studio!`
    });
  };

  // Audio recording handlers
  const startRecording = () => {
    setIsRecording(true);
    setRecordDuration(0);
    recordTimerRef.current = setInterval(() => {
      setRecordDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecording(false);
    const simulatedAudioUrl = 'https://cdn.freesound.org/previews/560/560446_12398463-lq.mp3';
    setAudioUrl(simulatedAudioUrl);
    setAudioFileName(`Sermon_Recording_${recordDuration}s.m4a`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'SLIDES' | 'AUDIO' | 'VIDEO') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedia(true);
    setUploadNote(isAr ? `جاري رفع الملف: ${file.name}...` : `Uploading ${file.name}...`);

    try {
      const upload = await uploadSourceMedia(file, `manual-${Date.now()}`);
      if (!upload.success || !upload.fileUrl) {
        setFeedbackMessage({
          type: 'error',
          text: upload.error || (isAr ? 'تعذر حفظ الملف بشكل دائم. حاول مرة أخرى.' : 'The file could not be saved persistently. Please try again.')
        });
        return;
      }
      const fileUrl = upload.fileUrl;

      if (type === 'SLIDES') {
        setSlidesUrl(fileUrl);
        setSlidesPreviewUrl(upload.previewUrl || '');
        setSlidesFileName(file.name);
      } else if (type === 'AUDIO') {
        setAudioUrl(fileUrl);
        setAudioPreviewUrl(upload.previewUrl || '');
        setAudioFileName(file.name);
      } else if (type === 'VIDEO') {
        setVideoUrl(fileUrl);
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err?.message || (isAr ? 'تعذر رفع الملف. حاول مرة أخرى.' : 'The file upload failed. Please try again.')
      });
    } finally {
      setIsUploadingMedia(false);
      setUploadNote('');
      e.target.value = '';
    }
  };

  // Quiz question management
  const handleAddQuestion = () => {
    const nextIdx = quizQuestions.length + 1;
    setQuizQuestions([
      ...quizQuestions,
      {
        id: `q-${Date.now()}-${nextIdx}`,
        question: isAr ? `سؤال تعليمي جديد #${nextIdx}` : `New Quiz Question #${nextIdx}`,
        options: [
          isAr ? 'الخيار الأول (الصحيح)' : 'Option 1 (Correct)',
          isAr ? 'الخيار الثاني' : 'Option 2',
          isAr ? 'الخيار الثالث' : 'Option 3',
          isAr ? 'الخيار الرابع' : 'Option 4'
        ],
        correctIndex: 0,
        difficulty: nextIdx % 3 === 0 ? 'HARD' : nextIdx % 2 === 0 ? 'MEDIUM' : 'EASY',
        points: nextIdx % 3 === 0 ? 30 : nextIdx % 2 === 0 ? 20 : 10
      }
    ]);
  };

  const handleDifficultyChange = (qIndex: number, diff: QuestionDifficulty) => {
    const pts = diff === 'HARD' ? 30 : diff === 'MEDIUM' ? 20 : 10;
    setQuizQuestions(prev => prev.map((q, idx) => idx === qIndex ? { ...q, difficulty: diff, points: pts } : q));
  };

  const handleQuestionTextChange = (qIndex: number, text: string) => {
    setQuizQuestions(prev => prev.map((q, idx) => idx === qIndex ? { ...q, question: text } : q));
  };

  const handleOptionChange = (qIndex: number, oIndex: number, optText: string) => {
    setQuizQuestions(prev => prev.map((q, idx) => {
      if (idx !== qIndex) return q;
      const nextOpts = [...q.options];
      nextOpts[oIndex] = optText;
      return { ...q, options: nextOpts };
    }));
  };

  const handleCorrectOptionChange = (qIndex: number, oIndex: number) => {
    setQuizQuestions(prev => prev.map((q, idx) => idx === qIndex ? { ...q, correctIndex: oIndex } : q));
  };

  const handleDeleteQuestion = (qIndex: number) => {
    if (quizQuestions.length <= 1) return;
    setQuizQuestions(prev => prev.filter((_, idx) => idx !== qIndex));
  };

  // Secondary Assistant Question Suggester (Optional)
  const handleAskAssistant = async () => {
    setIsAiGeneratingQuiz(true);
    setAiHelperMessage(null);
    try {
      await new Promise(r => setTimeout(r, 600));
      const newSuggested: QuizQuestion[] = [
        {
          id: `q-${Date.now()}-s1`,
          question: isAr 
            ? `كيف نطبق آية (${scriptureVerse || title || 'الدرس'}) في تعاملاتنا اليومية؟`
            : `How do we apply the golden verse of "${title || 'the lesson'}" in daily church life?`,
          options: [
            isAr ? 'بالصلاة من القلب والعمل بوصايا الإنجيل' : 'Through heartfelt prayer and living by Gospel commandments',
            isAr ? 'بالتظاهر أمام الآخرين' : 'Pretending in front of people',
            isAr ? 'بالحزن وفقدان الرجاء' : 'Despairing and losing hope',
            isAr ? 'بالانعزال عن الكنيسة' : 'Isolating away from church'
          ],
          correctIndex: 0,
          difficulty: 'MEDIUM',
          points: 20
        }
      ];
      setQuizQuestions(prev => [...prev, ...newSuggested]);
      setAiHelperMessage(isAr ? '✨ تم اقتراح سؤال تطبيقي إضافي يمكنك تعديله بالكامل.' : '✨ Added 1 practical application question suggestion. You can customize it freely.');
    } catch {
      setAiHelperMessage(isAr ? 'تعذر استدعاء الاقتراح.' : 'Could not generate suggestion.');
    } finally {
      setIsAiGeneratingQuiz(false);
    }
  };

  // Total points calculation
  const totalQuizPoints = quizQuestions.reduce((sum, q) => sum + (q.points || 10), 0);
  const totalLessonPoints = 100 + totalQuizPoints;

  // Build the unified Lesson payload
  const buildLessonPayload = (status: 'published' | 'draft'): Lesson => {
    return {
      id: currentLessonId,
      classSessionId: activeSession?.id,
      title: title.trim() || 'Sunday School Lesson',
      titleAr: titleAr.trim() || title.trim() || 'درس مدارس الأحد',
      summary: summary.trim() || teacherNotes.trim() || title.trim(),
      summaryAr: summaryAr.trim() || summary.trim() || teacherNotes.trim() || titleAr.trim(),
      grade: gradeLevel,
      category,
      status,
      date: activeSession?.date || new Date().toISOString().split('T')[0],
      pointsAvailable: totalLessonPoints,
      scriptureVerseEn: scriptureVerse.trim() || undefined,
      scriptureVerseAr: scriptureVerseAr.trim() || scriptureVerse.trim() || undefined,
      verseReference: verseReference.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      slidesUrl: slidesUrl || undefined,
      audioUrl: audioUrl || undefined,
      teacherNotes: teacherNotes.trim() || undefined,
      writtenExplanation: writtenExplanation.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      quiz: quizQuestions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        difficulty: q.difficulty || 'EASY',
        points: q.points || 10
      }))
    };
  };

  // Save as Draft
  const handleSaveDraft = async () => {
    if (!title.trim()) {
      setFeedbackMessage({ type: 'error', text: isAr ? 'يرجى إدخال عنوان الدرس' : 'Please provide a lesson title' });
      return;
    }
    setIsSaving(true);
    const draftPayload = buildLessonPayload('draft');
    onSaveLesson(draftPayload);
    setIsSaving(false);
    setFeedbackMessage({
      type: 'success',
      text: isAr ? 'تم حفظ مسودة الدرس بنجاح!' : 'Lesson draft saved successfully!'
    });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // 1-Click Publish to Class Session & Universal Curriculum
  const handlePublishToClass = async () => {
    if (!title.trim()) {
      setFeedbackMessage({ type: 'error', text: isAr ? 'يرجى كتابة عنوان الدرس أولاً' : 'Please enter a lesson title before publishing' });
      return;
    }

    setIsSaving(true);
    setFeedbackMessage(null);

    try {
      const lessonPayload = buildLessonPayload('published');

      // Call express publishing service if Supabase configured
      if (isOnlineAuth) {
        await publishExpressLesson({
          titleEn: lessonPayload.title,
          titleAr: lessonPayload.titleAr,
          category: lessonPayload.category,
          gradeLevel: lessonPayload.grade,
          summaryEn: lessonPayload.summary,
          summaryAr: lessonPayload.summaryAr,
          scriptureVerseEn: lessonPayload.scriptureVerseEn,
          scriptureVerseAr: lessonPayload.scriptureVerseAr,
          verseReference: lessonPayload.verseReference,
          videoUrl: lessonPayload.videoUrl,
          slidesUrl: lessonPayload.slidesUrl,
          audioUrl: lessonPayload.audioUrl,
          teacherNotes: lessonPayload.teacherNotes,
          publishDirectly: true,
          quiz: lessonPayload.quiz || []
        });
      }

      // Link directly to current active session
      if (activeSession) {
        onUpdateSession(activeSession.id, {
          activeLessonId: lessonPayload.id,
          title: lessonPayload.title,
          topic: lessonPayload.titleAr ? `${lessonPayload.title} (${lessonPayload.titleAr})` : lessonPayload.title,
          grade: lessonPayload.grade || activeSession.grade,
          status: 'PUBLISHED'
        });
      }

      // Broadcast and persist in curriculum
      await onPublishLesson(lessonPayload, activeSession?.id);

      setFeedbackMessage({
        type: 'success',
        text: isAr
          ? `🎉 تم نشر الدرس بنجاح وربطه بحصة الأحد (${activeSession?.date || 'اليوم'}) وجاهز لجميع الطلاب!`
          : `🎉 Lesson published successfully & directly assigned to Sunday Session (${activeSession?.date || 'Today'})!`
      });
    } catch (err: any) {
      console.error('Publish error:', err);
      // Fallback local publish
      const fallbackPayload = buildLessonPayload('published');
      if (activeSession) {
        onUpdateSession(activeSession.id, {
          activeLessonId: fallbackPayload.id,
          title: fallbackPayload.title,
          status: 'PUBLISHED'
        });
      }
      onPublishLesson(fallbackPayload, activeSession?.id);
      setFeedbackMessage({
        type: 'success',
        text: isAr ? 'تم نشر الدرس لجميع الطلاب بنجاح!' : 'Lesson published and ready for Sunday students!'
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  // Handle new Sunday session creation
  const handleCreateSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionTitle.trim()) return;

    onCreateSession({
      title: newSessionTitle.trim(),
      topic: newSessionTitle.trim(),
      grade: newSessionGrade,
      date: newSessionDate,
      status: 'DRAFT',
      teacherName: userData?.fullName || 'Sunday School Servant',
      teacherId: userData?.id || 'servant-1'
    });

    setNewSessionTitle('');
    setShowCreateSessionModal(false);
    setFeedbackMessage({
      type: 'success',
      text: isAr ? 'تم إنشاء حصة مدارس الأحد الجديدة!' : 'New Sunday School session created!'
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. SUNDAY MORNING CLASS SESSION BAR */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-stone-800 relative z-10">
          {/* Active Session Identity */}
          <div className="flex items-center gap-3.5 flex-wrap">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                  {isAr ? 'حصة مدارس الأحد المستهدفة' : 'Target Sunday Morning Session'}
                </span>
                <span className="text-xs text-stone-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-stone-500" />
                  {activeSession?.date || new Date().toISOString().split('T')[0]}
                </span>
                <span className="text-xs text-stone-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-stone-500" />
                  {activeSession?.grade || gradeLevel}
                </span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">
                {activeSession?.title || (isAr ? 'فصل مدارس الأحد' : 'Sunday School Class')}
              </h2>
            </div>
          </div>

          {/* Quick Session Switcher & Action Controls */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
            {/* Session selector */}
            <select
              value={activeSessionId}
              onChange={(e) => onSelectSession(e.target.value)}
              className="px-3 py-2 bg-stone-800 text-stone-200 border border-stone-700 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-amber-500 cursor-pointer"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.date} · {s.grade} · {s.title}
                </option>
              ))}
            </select>

            {/* New Session Button */}
            <button
              type="button"
              onClick={() => setShowCreateSessionModal(true)}
              className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'حصة جديدة' : 'New Session'}</span>
            </button>

            {/* Load Existing Lesson */}
            <button
              type="button"
              onClick={() => setShowLoadLessonModal(true)}
              className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'تحميل درس من الموقع' : 'Load Site Lesson'}</span>
            </button>
          </div>
        </div>

        {/* Studio Primary Action Strip */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* View Mode Toggle */}
            <div className="p-1 bg-stone-800/80 border border-stone-700/60 rounded-xl flex items-center gap-1 text-xs font-bold text-stone-300">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'split' ? 'bg-amber-500 text-stone-950 shadow-xs' : 'hover:text-white'
                }`}
              >
                {isAr ? 'شاشة مقسمة' : 'Split Studio'}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('editor')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'editor' ? 'bg-amber-500 text-stone-950 shadow-xs' : 'hover:text-white'
                }`}
              >
                {isAr ? 'المحرر فقط' : 'Editor'}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'preview' ? 'bg-amber-500 text-stone-950 shadow-xs' : 'hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5 inline mr-1" />
                {isAr ? 'معاينة الطالب' : 'Student Preview'}
              </button>
            </div>

            {onPreviewStudentLesson && (
              <button
                type="button"
                onClick={() => onPreviewStudentLesson(currentLessonId)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                <span>{isAr ? 'فتح كطالب' : 'Open as Student'}</span>
              </button>
            )}
          </div>

          {/* Core Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Save Draft */}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveDraft}
              className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-stone-400" />
              <span>{isAr ? 'حفظ كمسودة' : 'Save Draft'}</span>
            </button>

            {/* Direct 1-Click Publish to Sunday Session (Primary Golden CTA) */}
            <button
              type="button"
              disabled={isSaving}
              onClick={handlePublishToClass}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-stone-950 stroke-[2.5]" />
              <span>{isAr ? '🚀 نشر الدرس لحصة الأحد' : '🚀 Publish Lesson to Sunday Class'}</span>
            </button>
          </div>
        </div>

        {/* Live Feedback Toast */}
        <AnimatePresence>
          {feedbackMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`mt-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                feedbackMessage.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
              }`}
            >
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. FULL-SCREEN STUDIO WORKSPACE (Authoring + Live Student Preview) */}
      <div className={`grid gap-6 ${
        viewMode === 'split' ? 'grid-cols-1 xl:grid-cols-12' : 'grid-cols-1'
      }`}>
        {/* LEFT / MAIN COLUMN: Manual Authoring Controls */}
        {(viewMode === 'split' || viewMode === 'editor') && (
          <div className={`space-y-6 ${viewMode === 'split' ? 'xl:col-span-7' : 'w-full'}`}>
            {/* Step A: Core Metadata & Categorization */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
                    {isAr ? 'بيانات الدرس الأساسية' : 'Core Lesson Details'}
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800/40">
                  {isAr ? 'تأليف يدوي حر' : 'Manual Authoring'}
                </span>
              </div>

              {/* Title Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                    {isAr ? 'عنوان الدرس (إنجليزي)' : 'Lesson Title (English)'} *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Feast of the Holy Cross & Queen Helena"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                    {isAr ? 'عنوان الدرس (عربي)' : 'Lesson Title (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    placeholder="مثال: عيد الصليب المجيد والملكة هيلانة"
                    dir="rtl"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Category & Grade Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                    {isAr ? 'تصنيف المنهج' : 'Curriculum Category'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="bible">{isAr ? '📖 قصص الكتاب المقدس' : '📖 Bible Stories'}</option>
                    <option value="history">{isAr ? '⛪ تاريخ الكنيسة والسنكسار' : '⛪ Church History & Synaxarium'}</option>
                    <option value="hymns">{isAr ? '🎶 الألحان والطقوس القبطية' : '🎶 Coptic Hymns & Liturgy'}</option>
                    <option value="virtues">{isAr ? '🕊️ الفضائل المسيحية وسير القديسين' : '🕊️ Christian Virtues'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                    {isAr ? 'المرحلة الدراسية' : 'Grade Level'}
                  </label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="Pre-K & Kindergarten">{isAr ? 'حضانة (Pre-K / Kindergarten)' : 'Pre-K & Kindergarten'}</option>
                    <option value="1st-2nd Grade">{isAr ? 'أولى وثانية ابتدائي (Grades 1-2)' : '1st-2nd Grade'}</option>
                    <option value="3rd Grade">{isAr ? 'ثالثة ابتدائي (Grade 3)' : '3rd Grade'}</option>
                    <option value="4th Grade">{isAr ? 'رابعة ابتدائي (Grade 4)' : '4th Grade'}</option>
                    <option value="5th-6th Grade">{isAr ? 'خامسة وسادسة ابتدائي (Grades 5-6)' : '5th-6th Grade'}</option>
                    <option value="Prep (Middle School)">{isAr ? 'إعدادي (Middle School)' : 'Prep (Middle School)'}</option>
                    <option value="High School & Youth">{isAr ? 'ثانوي وشباب (High School)' : 'High School & Youth'}</option>
                  </select>
                </div>
              </div>

              {/* Summary / Core Takeaway */}
              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                  {isAr ? 'الملخص والفكرة الروحية' : 'Spiritual Lesson Summary & Core Takeaway'}
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={2}
                  placeholder={isAr ? 'ملخص الفكرة التي سيتعلمها مخدوموك هذا الأسبوع...' : 'Short overview of what the children will learn this Sunday...'}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-white text-xs font-medium focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            {/* Step B: Scripture Memory Verse */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
                    {isAr ? 'آية الحفظ الذهبية' : 'Scripture Memory Verse'}
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  +{versePoints} {isAr ? 'نقطة للطالب' : 'pts recital'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                    {isAr ? 'نص الآية (عربي)' : 'Verse Text (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={scriptureVerseAr}
                    onChange={(e) => setScriptureVerseAr(e.target.value)}
                    placeholder="أَمَّا أَنَا فَحَاشَا لِي أَنْ أَفْتَخِرَ إِلاَّ بِصَلِيبِ رَبِّنَا يَسُوعَ الْمَسِيحِ"
                    dir="rtl"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                    {isAr ? 'نص الآية (إنجليزي)' : 'Verse Text (English)'}
                  </label>
                  <input
                    type="text"
                    value={scriptureVerse}
                    onChange={(e) => setScriptureVerse(e.target.value)}
                    placeholder="God forbid that I should boast except in the cross of our Lord Jesus Christ"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                    {isAr ? 'الشاهد الكتابي' : 'Scripture Citation Reference'}
                  </label>
                  <input
                    type="text"
                    value={verseReference}
                    onChange={(e) => setVerseReference(e.target.value)}
                    placeholder="Galatians 6:14 (غلاطية ٦: ١٤)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                    {isAr ? 'نقاط تسميع الآية' : 'Recital Points'}
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={200}
                    step={10}
                    value={versePoints}
                    onChange={(e) => setVersePoints(Number(e.target.value) || 50)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-white text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Step C: Teaching Media & Materials (Video, Slides, Audio, Voice) */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
                    {isAr ? 'وسائط الشرح والمواد التعليمية' : 'Classroom Media & Learning Materials'}
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-stone-400">
                  {isAr ? 'فيديو · سلايدات · تسجيل صوتي' : 'Video · Slides · Sermon Audio'}
                </span>
              </div>

              {/* Video URL */}
              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                  {isAr ? 'رابط فيديو الدرس (يوتيوب أو MP4)' : 'Lesson Video URL (YouTube or MP4)'}
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-white text-xs font-medium focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                  {videoUrl && (
                    <button
                      type="button"
                      onClick={() => setVideoUrl('')}
                      className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Slides & Presentation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                    {isAr ? 'شرائح العرض (PPTX أو PDF)' : 'Slide Deck (PPTX or PDF)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-slate-800/60 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-600 dark:text-stone-300 text-xs font-semibold cursor-pointer transition-all">
                      <Upload className="w-4 h-4 text-amber-500" />
                      <span className="truncate">{slidesFileName || (isAr ? 'رفع ملف شرائح...' : 'Upload Slides...')}</span>
                      <input
                        type="file"
                        accept=".pdf,.pptx,.ppt"
                        onChange={(e) => handleFileUpload(e, 'SLIDES')}
                        className="hidden"
                      />
                    </label>
                    {slidesUrl && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowPreviewDocumentModal(true)}
                          className="px-2.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          title={isAr ? 'عرض الملف المرفوع داخل التطبيق' : 'Preview Document In-App'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{isAr ? 'معاينة' : 'Preview'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSlidesUrl(''); setSlidesFileName(''); }}
                          className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-rose-500 cursor-pointer"
                          title={isAr ? 'حذف الملف' : 'Delete file'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sermon Audio Recording or File */}
                <div>
                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                    {isAr ? 'التسجيل الصوتي للخادم' : 'Teacher Sermon Audio'}
                  </label>
                  <div className="flex items-center gap-2">
                    {/* Live microphone recording toggle */}
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isRecording
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>{isAr ? `إيقاف التسجيل (${recordDuration}ث)` : `Stop (${recordDuration}s)`}</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5 text-amber-500" />
                          <span>{audioFileName ? audioFileName : (isAr ? 'تسجيل شرح مباشر' : 'Record Voice')}</span>
                        </>
                      )}
                    </button>

                    <label className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 cursor-pointer" title="Upload Audio File">
                      <Upload className="w-4 h-4" />
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleFileUpload(e, 'AUDIO')}
                        className="hidden"
                      />
                    </label>

                    {audioUrl && (
                      <button
                        type="button"
                        onClick={() => { setAudioUrl(''); setAudioFileName(''); }}
                        className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {uploadNote && (
                <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                  {uploadNote}
                </p>
              )}

              {/* Written Lesson Explanation */}
              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                  {isAr ? 'الشرح الكتابي للدرس وتفاصيل القصة' : 'Written Lesson Explanation & Story Content'}
                </label>
                <textarea
                  value={writtenExplanation}
                  onChange={(e) => setWrittenExplanation(e.target.value)}
                  rows={4}
                  placeholder={isAr ? 'اكتب الشرح الإيماني التفصيلي للدرس ليقرأه الطلاب بوضوح...' : 'Detailed narrative, biblical explanation, and story content for students to read...'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-white text-xs font-medium focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Lesson Illustration / Picture URL */}
              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                  {isAr ? 'رابط صورة أو أيقونة توضيحية للدرس' : 'Lesson Illustration / Image URL'}
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or icon image URL"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-white text-xs font-medium focus:outline-hidden focus:border-amber-500"
                />
                {imageUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 max-h-36 bg-black flex items-center justify-center">
                    <img src={imageUrl} alt="Preview" className="h-36 w-full object-cover" onError={(e) => (e.target as HTMLElement).style.display = 'none'} />
                  </div>
                )}
              </div>

              {/* Teacher Classroom Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                  {isAr ? 'ملاحظات وتأملات الخادم الإضافية' : 'Additional Servant Teaching Notes'}
                </label>
                <textarea
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  rows={2}
                  placeholder={isAr ? 'ملاحظات إضافية أو نقاط مناقشة في الفصل...' : 'Extra discussion points or sermon takeaways...'}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-white text-xs font-medium focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            {/* Step D: Interactive Tiered Quiz Builder */}
            <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
                    {isAr ? 'أسئلة مسابقة الدرس التفاعلية' : 'Interactive Tiered Quiz'}
                  </h3>
                  <span className="text-xs text-stone-400">({quizQuestions.length})</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Secondary Assistant Question Suggester */}
                  <button
                    type="button"
                    onClick={handleAskAssistant}
                    disabled={isAiGeneratingQuiz}
                    className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    <span>{isAiGeneratingQuiz ? (isAr ? 'جاري الاقتراح...' : 'Suggesting...') : (isAr ? 'اقتراح سؤال (ثانوي)' : 'Suggest Question (Secondary)')}</span>
                  </button>

                  {/* Add Question Button */}
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-black flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{isAr ? '+ إضافة سؤال' : '+ Add Question'}</span>
                  </button>
                </div>
              </div>

              {aiHelperMessage && (
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs font-semibold text-purple-700 dark:text-purple-300">
                  {aiHelperMessage}
                </div>
              )}

              {/* Questions List */}
              <div className="space-y-4">
                {quizQuestions.map((q, qIdx) => (
                  <div
                    key={q.id || `q-${qIdx}`}
                    className="p-4 rounded-2xl bg-stone-50 dark:bg-slate-800/60 border border-stone-200 dark:border-stone-700 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-black text-stone-700 dark:text-stone-300">
                        {isAr ? `سؤال #${qIdx + 1}` : `Question #${qIdx + 1}`}
                      </span>

                      {/* Difficulty Selector */}
                      <div className="flex items-center gap-1 text-[11px]">
                        {(['EASY', 'MEDIUM', 'HARD'] as QuestionDifficulty[]).map((diff) => (
                          <button
                            key={diff}
                            type="button"
                            onClick={() => handleDifficultyChange(qIdx, diff)}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                              q.difficulty === diff
                                ? diff === 'EASY'
                                  ? 'bg-emerald-500 text-white shadow-xs'
                                  : diff === 'MEDIUM'
                                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                                  : 'bg-rose-500 text-white shadow-xs'
                                : 'bg-stone-200 dark:bg-slate-700 text-stone-600 dark:text-stone-400 hover:bg-stone-300'
                            }`}
                          >
                            {diff === 'EASY' ? '10 pts (Easy)' : diff === 'MEDIUM' ? '20 pts (Med)' : '30 pts (Hard)'}
                          </button>
                        ))}

                        {quizQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(qIdx)}
                            className="p-1 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer ml-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Question text */}
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                      placeholder={isAr ? 'اكتب نص السؤال هنا...' : 'Enter question text...'}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-600 bg-white dark:bg-slate-900 text-stone-900 dark:text-white text-xs font-bold focus:outline-hidden focus:border-amber-500"
                    />

                    {/* Options list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                            q.correctIndex === oIdx
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/50'
                              : 'bg-white dark:bg-slate-900 border-stone-200 dark:border-stone-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`correct-${qIdx}`}
                            checked={q.correctIndex === oIdx}
                            onChange={() => handleCorrectOptionChange(qIdx, oIdx)}
                            className="accent-emerald-600 cursor-pointer shrink-0"
                            title={isAr ? 'حدد كإجابة صحيحة' : 'Mark as correct answer'}
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                            placeholder={`Option ${oIdx + 1}`}
                            className="w-full bg-transparent text-xs font-semibold text-stone-800 dark:text-stone-200 focus:outline-hidden"
                          />
                          {q.correctIndex === oIdx && (
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                              ✓ {isAr ? 'صحيح' : 'Correct'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: Real-Time Interactive Live Student Preview */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div className={`space-y-4 ${viewMode === 'split' ? 'xl:col-span-5' : 'w-full max-w-3xl mx-auto'}`}>
            <div className="sticky top-6">
              {/* Header Badge */}
              <div className="flex items-center justify-between pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    {isAr ? 'المعاينة الحية لتجربة الطالب' : 'Live Student Experience Preview'}
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  ● {isAr ? 'تحديث لحظي' : 'Real-time Live'}
                </span>
              </div>

              {/* Student Viewer Device Frame */}
              <div className="bg-slate-950 border border-stone-800 rounded-3xl p-5 shadow-2xl text-stone-100 space-y-5 overflow-hidden">
                {/* 1. Header & Thematic Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {gradeLevel}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-800 text-stone-300">
                        {category === 'bible' ? '📖 Bible' : category === 'history' ? '⛪ History' : category === 'hymns' ? '🎶 Hymns' : '🕊️ Virtues'}
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-white leading-tight">
                      {isAr ? (titleAr || title || 'عنوان الدرس') : (title || 'Lesson Title')}
                    </h2>
                    {summary && (
                      <p className="text-xs text-stone-400 line-clamp-2">
                        {isAr ? (summaryAr || summary) : summary}
                      </p>
                    )}
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                </div>

                {/* 2. Scripture Memory Verse Card */}
                {(scriptureVerse || scriptureVerseAr) && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-stone-900 to-amber-950/20 border border-amber-500/30 space-y-2 shadow-inner">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-400">
                      <span className="flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        {isAr ? 'آية الحفظ الذهبية' : 'Scripture Memory Verse'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300">
                        +{versePoints} pts
                      </span>
                    </div>
                    <blockquote className="text-xs font-serif italic text-amber-100 leading-relaxed border-l-2 border-amber-500/50 pl-3">
                      "{isAr ? (scriptureVerseAr || scriptureVerse) : scriptureVerse}"
                    </blockquote>
                    {verseReference && (
                      <p className="text-[11px] font-bold text-stone-400 text-right">
                        — {verseReference}
                      </p>
                    )}
                  </div>
                )}

                {/* 3. Media Preview (Video / Audio / Slides) */}
                <div className="space-y-3">
                  {videoUrl ? (
                    <div className="rounded-2xl overflow-hidden border border-stone-800 bg-stone-900 aspect-video relative flex items-center justify-center">
                      {videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                        <iframe
                          src={videoUrl.replace('watch?v=', 'embed/')}
                          title="Lesson Video Preview"
                          className="w-full h-full"
                          allowFullScreen
                        />
                      ) : (
                        <div className="text-center p-4">
                          <Video className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                          <p className="text-xs text-stone-300 font-semibold truncate max-w-xs">{videoUrl}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-stone-900/60 border border-dashed border-stone-800 text-center text-xs text-stone-500">
                      <Video className="w-5 h-5 mx-auto mb-1 text-stone-600" />
                      <span>{isAr ? 'لم تتم إضافة فيديو بعد' : 'No video attached'}</span>
                    </div>
                  )}

                  {/* Audio Player Preview */}
                  {audioUrl && (
                    <div className="p-3 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                          <Volume2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">
                            {audioFileName || (isAr ? 'تسجيل شرح الخادم' : 'Teacher Sermon Audio')}
                          </p>
                          <p className="text-[10px] text-stone-400">{isAr ? 'صوت الفصل المباشر' : 'Classroom Voice'}</p>
                        </div>
                      </div>
                      <audio controls src={audioPreviewUrl || undefined} className="h-8 max-w-[150px]" />
                    </div>
                  )}

                  {/* Slides Preview */}
                  {slidesUrl && (
                    <div className="p-3 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">
                            {slidesFileName || (isAr ? 'شرائح العرض المرفقة' : 'Classroom Presentation')}
                          </p>
                          <p className="text-[10px] text-stone-400">{isAr ? 'جاهز للعرض' : 'Ready to present'}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPreviewDocumentModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-all cursor-pointer"
                      >
                        {isAr ? 'عرض مدمج' : 'View'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Written Explanation & Illustration Preview */}
                {(imageUrl || writtenExplanation) && (
                  <div className="p-4 rounded-2xl bg-stone-900 border border-amber-900/40 space-y-3">
                    <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      {isAr ? 'الشرح الكتابي للدرس' : 'Written Explanation & Pictures'}
                    </h4>
                    {imageUrl && (
                      <div className="rounded-xl overflow-hidden max-h-48 border border-stone-800">
                        <img src={imageUrl} alt="Lesson illustration" className="w-full h-full object-cover max-h-48" onError={(e) => (e.target as HTMLElement).style.display = 'none'} />
                      </div>
                    )}
                    {writtenExplanation && (
                      <p className="text-xs text-stone-200 leading-relaxed whitespace-pre-wrap">
                        {writtenExplanation}
                      </p>
                    )}
                  </div>
                )}

                {/* 4. Sermon Notes & Takeaway */}
                {teacherNotes && (
                  <div className="p-4 rounded-2xl bg-stone-900/90 border border-stone-800 space-y-1.5">
                    <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      {isAr ? 'تأملات ونقاط الخادم' : 'Classroom Sermon Notes'}
                    </h4>
                    <p className="text-xs text-stone-300 leading-relaxed whitespace-pre-wrap">
                      {teacherNotes}
                    </p>
                  </div>
                )}

                {/* 5. Interactive Quiz Preview */}
                <div className="space-y-3 pt-2 border-t border-stone-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                      {isAr ? 'مسابقة الدرس (تجربة تفاعلية)' : 'Lesson Quiz (Interactive Preview)'}
                    </h4>
                    <span className="text-[10px] text-stone-400 font-bold">
                      {totalQuizPoints} {isAr ? 'نقطة' : 'pts total'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {quizQuestions.slice(0, 3).map((q, idx) => {
                      const selected = previewSelectedAnswers[idx];
                      const isRevealed = previewRevealed[idx];

                      return (
                        <div key={idx} className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 space-y-2.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-stone-300">
                              #{idx + 1} {q.question}
                            </span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-stone-800 text-amber-400">
                              {q.points || 10} pts
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {q.options.map((opt, oIdx) => {
                              const isCorrect = q.correctIndex === oIdx;
                              const isChosen = selected === oIdx;

                              let btnStyle = 'bg-stone-800/80 text-stone-300 hover:bg-stone-800 border-stone-700/50';
                              if (isRevealed) {
                                if (isCorrect) {
                                  btnStyle = 'bg-emerald-950/80 text-emerald-300 border-emerald-500 font-bold';
                                } else if (isChosen && !isCorrect) {
                                  btnStyle = 'bg-rose-950/80 text-rose-300 border-rose-500';
                                }
                              } else if (isChosen) {
                                btnStyle = 'bg-amber-500/20 text-amber-300 border-amber-500';
                              }

                              return (
                                <button
                                  key={oIdx}
                                  type="button"
                                  onClick={() => {
                                    setPreviewSelectedAnswers(prev => ({ ...prev, [idx]: oIdx }));
                                    setPreviewRevealed(prev => ({ ...prev, [idx]: true }));
                                  }}
                                  className={`w-full text-left p-2 rounded-xl text-xs border transition-all cursor-pointer flex items-center justify-between ${btnStyle}`}
                                >
                                  <span>{opt}</span>
                                  {isRevealed && isCorrect && (
                                    <span className="text-emerald-400 text-[10px] font-black">✓ Correct</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {quizQuestions.length > 3 && (
                      <p className="text-center text-[11px] text-stone-500">
                        +{quizQuestions.length - 3} {isAr ? 'أسئلة إضافية في المسابقة' : 'more quiz questions in lesson'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Create New Class Session */}
      <AnimatePresence>
        {showCreateSessionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-stone-900 border border-stone-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">
                    {isAr ? 'إنشاء حصة أحد جديدة' : 'New Sunday Class Session'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateSessionModal(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateSessionSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-400 mb-1">
                    {isAr ? 'عنوان الحصة أو موضوع الأحد' : 'Session Title or Topic'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSessionTitle}
                    onChange={(e) => setNewSessionTitle(e.target.value)}
                    placeholder="e.g. 1st Sunday of Hatour · Parable of the Sower"
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-400 mb-1">
                      {isAr ? 'تاريخ الأحد' : 'Sunday Date'}
                    </label>
                    <input
                      type="date"
                      value={newSessionDate}
                      onChange={(e) => setNewSessionDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-400 mb-1">
                      {isAr ? 'المرحلة' : 'Grade'}
                    </label>
                    <select
                      value={newSessionGrade}
                      onChange={(e) => setNewSessionGrade(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white text-xs font-semibold focus:outline-hidden focus:border-amber-500"
                    >
                      <option value="Pre-K & Kindergarten">Pre-K</option>
                      <option value="1st-2nd Grade">1st-2nd Grade</option>
                      <option value="3rd Grade">3rd Grade</option>
                      <option value="4th Grade">4th Grade</option>
                      <option value="5th-6th Grade">5th-6th Grade</option>
                      <option value="Prep (Middle School)">Middle School</option>
                      <option value="High School & Youth">High School</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateSessionModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-stone-400 hover:text-white"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md cursor-pointer"
                  >
                    {isAr ? 'إنشاء الحصة' : 'Create Session'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Load Existing Lesson from Site */}
      <AnimatePresence>
        {showLoadLessonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-stone-900 border border-stone-800 rounded-3xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">
                    {isAr ? 'تحميل درس من مكتبة المنهج إلى الاستوديو' : 'Load Curriculum Lesson into Studio'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLoadLessonModal(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-2">
                {lessons.map(les => (
                  <div
                    key={les.id}
                    onClick={() => handleLoadLesson(les)}
                    className="p-3.5 rounded-2xl bg-stone-800/60 hover:bg-stone-800 border border-stone-700/60 hover:border-amber-500/50 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-700 text-stone-300">
                          {les.grade || 'General'}
                        </span>
                        <span className="text-xs font-black text-white group-hover:text-amber-400 transition-colors">
                          {isAr ? (les.titleAr || les.title) : les.title}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 line-clamp-1">{les.summary}</p>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 group-hover:bg-amber-500 text-amber-400 group-hover:text-stone-950 text-xs font-bold transition-all shrink-0"
                    >
                      {isAr ? 'تحميل' : 'Load'}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* In-App Document Viewer for Presentation Preview */}
      {showPreviewDocumentModal && slidesPreviewUrl && (
        <InAppDocumentViewer
          documentUrl={slidesPreviewUrl}
          documentTitle={isAr && titleAr ? titleAr : title}
          onClose={() => setShowPreviewDocumentModal(false)}
          lang={isAr ? 'ar' : 'en'}
        />
      )}
    </div>
  );
};
