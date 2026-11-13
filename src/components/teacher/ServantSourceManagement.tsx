import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderOpen, 
  FileText, 
  Layers, 
  Mic, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  BookOpen, 
  Search, 
  Filter, 
  Eye, 
  Trash2, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Lock, 
  Globe, 
  ShieldCheck, 
  ExternalLink, 
  Play, 
  Pause, 
  Volume2, 
  RefreshCw,
  Info,
  Calendar,
  Database,
  X
} from 'lucide-react';
import { Lesson, SourceType, LessonSource } from '../../types';
import { 
  ServantManagedSource, 
  SourceEvidenceDetails, 
  fetchServantSources, 
  fetchSourceEvidence,
  getAuthorizedSourceUrl,
  uploadSourceMedia
} from '../../lib/lessonSourceService';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';

interface ServantSourceManagementProps {
  lessons: Lesson[];
  lang?: 'en' | 'ar';
  activeLessonId?: string;
  onViewSource?: (source: LessonSource) => void;
  onRefresh?: () => void;
}

export const ServantSourceManagement: React.FC<ServantSourceManagementProps> = ({
  lessons,
  lang = 'en',
  activeLessonId: initialLessonId,
  onViewSource,
  onRefresh
}) => {
  const { userData, isGuest } = useAuth();
  const isOnlineAuth = !isGuest && Boolean(userData) && isSupabaseConfigured;

  // Data states
  const [sources, setSources] = useState<ServantManagedSource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Filtering states
  const [selectedLessonId, setSelectedLessonId] = useState<string>(initialLessonId || 'ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Inspection states
  const [evidenceModalSource, setEvidenceModalSource] = useState<ServantManagedSource | null>(null);
  const [evidenceDetails, setEvidenceDetails] = useState<SourceEvidenceDetails | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState<boolean>(false);

  // Audio player modal state for voice sources
  const [audioSource, setAudioSource] = useState<ServantManagedSource | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Text reader modal state
  const [textSource, setTextSource] = useState<ServantManagedSource | null>(null);

  // Delete confirmation
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Load sources from server/service
  const loadSources = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const lessonParam = selectedLessonId === 'ALL' ? undefined : selectedLessonId;
      const typeParam = selectedType === 'ALL' ? undefined : selectedType;
      const result = await fetchServantSources(lessonParam, typeParam);

      if (result.error) {
        throw result.error;
      }
      setSources(result.data || []);
    } catch (err: any) {
      console.warn('Failed to load sources:', err);
      setErrorMsg(err?.message || (lang === 'ar' ? 'تعذر تحميل المصادر من الخادم' : 'Failed to load curriculum sources'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, [selectedLessonId, selectedType]);

  // Open Evidence Provenance Modal (Read-Only)
  const handleOpenEvidence = async (source: ServantManagedSource) => {
    setEvidenceModalSource(source);
    setEvidenceLoading(true);
    try {
      const res = await fetchSourceEvidence(source.id);
      if (res.data) {
        setEvidenceDetails(res.data);
      } else {
        // Fallback to sample in source
        setEvidenceDetails({
          sourceId: source.id,
          lessonId: source.lessonId,
          sourceFilename: source.originalFilename,
          evidenceMapAvailable: Boolean(source.evidenceMapAvailable),
          claimsCount: source.evidenceClaimsCount || 0,
          claims: (source.claimsSample || []).map(c => ({
            ...c,
            quoteEn: c.statementEn
          }))
        });
      }
    } catch (err) {
      console.warn('Evidence details error:', err);
    } finally {
      setEvidenceLoading(false);
    }
  };

  // Play audio source
  const handlePlayAudio = async (source: ServantManagedSource) => {
    setAudioSource(source);
    setIsPlaying(false);
    const resolvedUrl = await getAuthorizedSourceUrl(source.fileUrl);
    setAudioUrl(resolvedUrl);
  };

  // Safe Detach / Delete Source
  const handleDeleteSource = async (sourceId: string) => {
    setIsDeleting(true);
    setErrorMsg('');
    try {
      const headers: Record<string, string> = {};
      if (isSupabaseConfigured && userData) {
        // fetch session token
        const { supabase } = await import('../../lib/supabase');
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          }
        }
      }

      const res = await fetch(`/api/church/sources/${encodeURIComponent(sourceId)}`, {
        method: 'DELETE',
        headers
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || errJson?.error || 'Failed to remove source');
      }

      // Optimistically remove from state
      setSources(prev => prev.filter(s => s.id !== sourceId));
      setDeletingSourceId(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMsg(err?.message || (lang === 'ar' ? 'فشل حذف المصدر' : 'Failed to detach source'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter sources by search query
  const filteredSources = sources.filter(s => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.originalFilename?.toLowerCase().includes(query) ||
      s.description?.toLowerCase().includes(query) ||
      s.teacherNotes?.toLowerCase().includes(query) ||
      s.lessonTitle?.toLowerCase().includes(query) ||
      s.type?.toLowerCase().includes(query)
    );
  });

  // Calculate summary counts
  const totalCount = sources.length;
  const pdfCount = sources.filter(s => s.type === 'PDF' || s.type === 'DOCX').length;
  const voiceCount = sources.filter(s => s.type === 'TEACHER_VOICE').length;
  const slidesCount = sources.filter(s => s.type === 'PPTX').length;
  const groundedCount = sources.filter(s => s.evidenceMapAvailable).length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner & Title */}
      <div className="bg-white dark:bg-slate-900 border border-[var(--color-church-cream-dark)] dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <FolderOpen className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-[var(--color-church-blue)] dark:text-white">
              {lang === 'ar' ? 'مكتبة مصادر ووسائط المناهج' : 'Curriculum Media & Source Library'}
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {lang === 'ar' 
              ? 'إدارة واستعراض مصادر الدروس المعتمدة (مطبوعات PDF، تسجيلات صوتية، شرائح عرض، وصور أيقونات)'
              : 'Authorized servant management of verified lesson handouts, classroom voice audio, slides, and icons'}
          </p>
        </div>

        <button
          onClick={loadSources}
          disabled={loading}
          className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{lang === 'ar' ? 'تحديث المصادر' : 'Refresh Sources'}</span>
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
            {lang === 'ar' ? 'إجمالي المصادر' : 'Total Sources'}
          </span>
          <div className="text-2xl font-black text-stone-900 dark:text-white mt-1">
            {totalCount}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider block">
            {lang === 'ar' ? 'مطبوعات وكتب' : 'PDF Handouts'}
          </span>
          <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">
            {pdfCount}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block">
            {lang === 'ar' ? 'تسجيلات الخدام' : 'Servant Voice Audio'}
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {voiceCount}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">
            {lang === 'ar' ? 'مرتبطة بخريطة الأدلة' : 'Evidence Grounded'}
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {groundedCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'ar' ? 'بحث بالاسم أو الوصف أو الدرس...' : 'Search by source name, description, or lesson...'}
              className="w-full bg-stone-50 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700 rounded-xl ps-9 pe-3 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Lesson Filter */}
          <div className="w-full md:w-56 shrink-0">
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="w-full bg-stone-50 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">
                {lang === 'ar' ? '— جميع الدروس المصرحة —' : '— All Authorized Lessons —'}
              </option>
              {lessons.map(l => (
                <option key={l.id} value={l.id}>
                  {lang === 'ar' ? (l.titleAr || l.title) : l.title}
                </option>
              ))}
            </select>
          </div>

          {/* Source Type Filter */}
          <div className="w-full md:w-48 shrink-0">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-stone-50 dark:bg-slate-800/80 border border-stone-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">{lang === 'ar' ? '— جميع أنواع المصادر —' : '— All Media Types —'}</option>
              <option value="PDF">{lang === 'ar' ? 'مستندات PDF / DOCX' : 'PDF / DOCX Documents'}</option>
              <option value="TEACHER_VOICE">{lang === 'ar' ? 'تسجيلات صوتية' : 'Servant Voice Audio'}</option>
              <option value="PPTX">{lang === 'ar' ? 'شرائح عرض (PPTX)' : 'Presentation Slides'}</option>
              <option value="IMAGE">{lang === 'ar' ? 'أيقونات وصور' : 'Icons & Images'}</option>
              <option value="TEACHER_TEXT">{lang === 'ar' ? 'ملاحظات نصية' : 'Servant Text Notes'}</option>
              <option value="YOUTUBE_VIDEO">{lang === 'ar' ? 'فيديوهات يوتيوب' : 'YouTube Videos'}</option>
              <option value="OTHER_APPROVED_RESOURCE">{lang === 'ar' ? 'موارد خارجية معتمدة' : 'Approved Resources'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Source Cards List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-stone-500 dark:text-stone-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-500" />
            <p className="text-xs font-semibold">
              {lang === 'ar' ? 'جارٍ تحميل مصادر ووسائط المناهج...' : 'Loading verified curriculum sources...'}
            </p>
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-stone-200 dark:border-slate-800 rounded-3xl p-12 text-center">
            <FolderOpen className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200">
              {lang === 'ar' ? 'لم يتم العثور على مصادر مطابقة' : 'No matching curriculum sources found'}
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto mt-1">
              {lang === 'ar'
                ? 'يمكنك إضافة وتسجيل مصادر جديدة من خلال استوديو مدارس الأحد'
                : 'Upload or record teaching materials in the Sunday School Studio to populate this library.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSources.map(source => {
              const isPdf = source.type === 'PDF' || source.type === 'DOCX';
              const isVoice = source.type === 'TEACHER_VOICE';
              const isSlides = source.type === 'PPTX';
              const isImage = source.type === 'IMAGE';
              const isText = source.type === 'TEACHER_TEXT';
              const isLink = source.type === 'YOUTUBE_VIDEO' || source.type === 'OTHER_APPROVED_RESOURCE';

              return (
                <div
                  key={source.id}
                  className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-amber-400 dark:hover:border-amber-600/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Type Icon, Filename, Actions */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isVoice ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' :
                          isPdf ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400' :
                          isSlides ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400' :
                          isImage ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' :
                          isText ? 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300' :
                          'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400'
                        }`}>
                          {isVoice ? <Mic className="w-4 h-4" /> :
                           isPdf ? <FileText className="w-4 h-4" /> :
                           isSlides ? <Layers className="w-4 h-4" /> :
                           isImage ? <ImageIcon className="w-4 h-4" /> :
                           isText ? <BookOpen className="w-4 h-4" /> :
                           <LinkIcon className="w-4 h-4" />}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-stone-900 dark:text-stone-100 truncate" title={source.originalFilename}>
                            {source.originalFilename}
                          </h4>
                          <span className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                            {source.type} {source.fileSize ? `• ${Math.round(source.fileSize / 1024)} KB` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Top Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {isPdf && onViewSource && (
                          <button
                            onClick={() => onViewSource(source)}
                            className="p-1.5 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-600 dark:text-stone-300 rounded-lg transition-colors cursor-pointer"
                            title={lang === 'ar' ? 'عرض المستند' : 'View PDF Document'}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {isVoice && (
                          <button
                            onClick={() => handlePlayAudio(source)}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-400 rounded-lg transition-colors cursor-pointer"
                            title={lang === 'ar' ? 'تشغيل التسجيل الصوتي' : 'Play Audio Recording'}
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}
                        {isText && (
                          <button
                            onClick={() => setTextSource(source)}
                            className="p-1.5 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-600 dark:text-stone-300 rounded-lg transition-colors cursor-pointer"
                            title={lang === 'ar' ? 'قراءة الملاحظات' : 'Read Servant Notes'}
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>
                        )}

                        {/* Safe Delete for draft sources */}
                        {source.isPublic || source.lessonStatus === 'published' ? (
                          <span 
                            className="p-1.5 text-stone-300 dark:text-stone-600" 
                            title={lang === 'ar' ? 'مصدر معتمد في منهج منشور (غير قابل للحذف)' : 'Published curriculum source (immutable)'}
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeletingSourceId(source.id)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 rounded-lg transition-colors cursor-pointer"
                            title={lang === 'ar' ? 'فصل / إزالة المصدر' : 'Detach / Remove Source'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Metadata & Description */}
                    <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 mb-3">
                      {source.description || source.teacherNotes || (lang === 'ar' ? 'مصدر دراسي معتمد لاستخراج المحتوى والأدلة' : 'Curriculum material indexed for closed-source generation')}
                    </p>

                    {/* Tags row */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] mb-3 font-semibold">
                      {/* Lesson association */}
                      <span className="px-2 py-0.5 bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-stone-300 rounded-md">
                        {lang === 'ar' ? 'الدرس: ' : 'Lesson: '} {source.lessonTitle || source.lessonId}
                      </span>

                      {/* Visibility badge */}
                      {source.isPublic ? (
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-md flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {lang === 'ar' ? 'منهج عام منشور' : 'Published Curriculum'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-md flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          {lang === 'ar' ? 'مسودة خاصة بالخادم' : 'Private Servant Draft'}
                        </span>
                      )}

                      {/* Rights Status */}
                      <span className="px-2 py-0.5 bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-stone-400 rounded-md">
                        {source.rightsStatus || 'TEACHER_OWNED'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Footer: Evidence Map Connection */}
                  <div className="pt-2.5 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    {source.evidenceMapAvailable ? (
                      <button
                        onClick={() => handleOpenEvidence(source)}
                        className="text-[11px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                        <span>
                          {lang === 'ar' 
                            ? `الأدلة اللاهوتية (${source.evidenceClaimsCount || 1})` 
                            : `Theological Claims (${source.evidenceClaimsCount || 1})`}
                        </span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-stone-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {lang === 'ar' ? 'مفهرس ومتاح' : 'Indexed & Ready'}
                      </span>
                    )}

                    <span className="text-[10px] text-stone-400 font-mono">
                      {source.uploadedAt ? new Date(source.uploadedAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* READ-ONLY EVIDENCE PROVENANCE MODAL */}
      {evidenceModalSource && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                    {lang === 'ar' ? 'أدلة المصدر وتوثيق الادعاءات' : 'Source Evidence & Provenance Claims'}
                  </h3>
                  <p className="text-[11px] text-stone-500 font-mono">
                    {evidenceModalSource.originalFilename}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEvidenceModalSource(null);
                  setEvidenceDetails(null);
                }}
                className="p-1.5 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Read-Only Notice Banner */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                {lang === 'ar'
                  ? 'عرض استقرائي للقراءة فقط. التحقق من الادعاءات وفض النزاعات يتم حصرياً في مسار مراجعة الخدام.'
                  : 'Read-only evidence inspection. Claim verification and conflict resolution remain in the Servant Review workflow.'}
              </span>
            </div>

            {evidenceLoading ? (
              <div className="py-8 text-center text-xs text-stone-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                <span>{lang === 'ar' ? 'جارٍ تحميل الأدلة والتوثيق...' : 'Loading theological claims...'}</span>
              </div>
            ) : evidenceDetails?.claims && evidenceDetails.claims.length > 0 ? (
              <div className="space-y-3">
                {evidenceDetails.claims.map((claim, idx) => (
                  <div
                    key={claim.claimId || idx}
                    className="p-3.5 bg-stone-50 dark:bg-slate-800/60 rounded-xl border border-stone-200 dark:border-slate-700/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                        {claim.category || 'THEOLOGY'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {claim.servantReviewStatus || 'PENDING'}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                      {lang === 'ar' && claim.statementAr ? claim.statementAr : claim.statementEn}
                    </p>

                    {claim.quoteEn && (
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 italic bg-white dark:bg-slate-900/80 p-2 rounded border border-stone-200 dark:border-slate-800">
                        "{claim.quoteEn}"
                      </p>
                    )}

                    {claim.sourceLocation && (
                      <div className="text-[10px] text-stone-400 font-mono">
                        {lang === 'ar' ? 'موضع الاقتباس: ' : 'Location: '} {claim.sourceLocation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-stone-500">
                {lang === 'ar' ? 'لا توجد ادعاءات مسجلة لهذا المصدر حالياً' : 'No claims indexed for this source'}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  setEvidenceModalSource(null);
                  setEvidenceDetails(null);
                }}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIO PLAYER MODAL */}
      {audioSource && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-stone-900 dark:text-white truncate max-w-[260px]">
                  {audioSource.originalFilename}
                </h3>
              </div>
              <button
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  setAudioSource(null);
                }}
                className="p-1 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg text-stone-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Audio Element */}
            <div className="bg-stone-100 dark:bg-slate-800 rounded-2xl p-4 text-center space-y-3">
              <audio
                ref={audioRef}
                src={audioUrl}
                controls
                className="w-full"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </div>

            {/* Transcript if available */}
            {audioSource.transcript && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  {lang === 'ar' ? 'النص المكتوب للتسجيل' : 'Audio Transcript'}
                </span>
                <p className="text-xs text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-slate-800 p-3 rounded-xl border border-stone-200 dark:border-slate-700 max-h-36 overflow-y-auto">
                  {audioSource.transcript}
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  setAudioSource(null);
                }}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEXT VIEWER MODAL */}
      {textSource && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-stone-900 dark:text-white truncate max-w-[300px]">
                  {textSource.originalFilename}
                </h3>
              </div>
              <button
                onClick={() => setTextSource(null)}
                className="p-1 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg text-stone-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-stone-50 dark:bg-slate-800 p-4 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs text-stone-800 dark:text-stone-200 whitespace-pre-wrap font-sans leading-relaxed">
              {textSource.teacherNotes || textSource.extractedContent || textSource.description || 'No content available.'}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setTextSource(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingSourceId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                {lang === 'ar' ? 'هل أنت متأكد من إزالة هذا المصدر؟' : 'Detach and remove this source?'}
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                {lang === 'ar'
                  ? 'سيتم فصل هذا المصدر من مسودة الدرس دون التأثير على الدروس المنشورة.'
                  : 'This source will be safely removed from the draft lesson. Published versions are not affected.'}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeletingSourceId(null)}
                disabled={isDeleting}
                className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => handleDeleteSource(deletingSourceId)}
                disabled={isDeleting}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{lang === 'ar' ? 'تأكيد الحذف' : 'Confirm'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
