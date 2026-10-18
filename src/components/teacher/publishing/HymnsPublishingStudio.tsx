import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  Plus,
  Trash2,
  Play,
  Pause,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  Eye,
  Save,
  Send,
  Layers,
  Sparkles,
  Sliders,
  ChevronRight,
  ShieldCheck,
  FolderOpen
} from 'lucide-react';
import { CopticHymnItem, HymnLyricLine } from '../../../data/hymnsData';
import { HYMNS_LEVEL_DEFINITIONS } from '../../../lib/hymnsEnrollmentService';
import { getHymns, createHymn, updateHymn, unpublishHymn, restoreHymnVersion } from '../../../lib/hymnsService';
import { Language } from '../../../types';

interface HymnsPublishingStudioProps {
  lang?: Language;
  onPreviewHymn?: (hymn: CopticHymnItem) => void;
}

export function HymnsPublishingStudio({ lang = 'ar', onPreviewHymn }: HymnsPublishingStudioProps) {
  const isAr = lang === 'ar';

  const [hymns, setHymns] = useState<CopticHymnItem[]>([]);
  const [selectedHymnId, setSelectedHymnId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form Fields for Active Hymn
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleCoptic, setTitleCoptic] = useState('');
  const [seasonAr, setSeasonAr] = useState('طقس سنوي');
  const [seasonEn, setSeasonEn] = useState('Annual');
  const [occasionTag, setOccasionTag] = useState<'annual' | 'kiahk' | 'lent' | 'pascha' | 'resurrection' | 'st_mary'>('annual');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'advanced'>('easy');
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [audioUrl, setAudioUrl] = useState('');
  const [durationSec, setDurationSec] = useState(120);
  const [hazatExplanationAr, setHazatExplanationAr] = useState('');
  const [hazatExplanationEn, setHazatExplanationEn] = useState('');
  const [sheetMusicUrl, setSheetMusicUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [lines, setLines] = useState<HymnLyricLine[]>([]);
  const [version, setVersion] = useState<number>(1);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [history, setHistory] = useState<any[]>([]);

  // Studio Audio Player
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  // Unsaved changes confirmation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Load Hymns Library
  const loadLibrary = async () => {
    setLoading(true);
    const res = await getHymns();
    if (res.success && res.items) {
      setHymns(res.items);
      if (!selectedHymnId && res.items.length > 0) {
        populateForm(res.items[0]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  const populateForm = (h: CopticHymnItem) => {
    setSelectedHymnId(h.id);
    setTitleAr(h.titleAr || '');
    setTitleEn(h.titleEn || '');
    setTitleCoptic(h.titleCoptic || '');
    setSeasonAr(h.seasonAr || 'طقس سنوي');
    setSeasonEn(h.seasonEn || 'Annual');
    setOccasionTag(h.occasionTag || 'annual');
    setDifficulty(h.difficulty || 'easy');
    setLevel(h.level || 1);
    setAudioUrl(h.audioUrl || '');
    setDurationSec(h.durationSec || 120);
    setHazatExplanationAr(h.hazatExplanationAr || '');
    setHazatExplanationEn(h.hazatExplanationEn || '');
    setSheetMusicUrl((h as any).sheetMusicUrl || '');
    setPdfUrl((h as any).pdfUrl || '');
    setLines(h.lines || []);
    setVersion((h as any).version || 1);
    setStatus((h as any).status || 'published');
    setHistory((h as any).history || []);
    setHasUnsavedChanges(false);
  };

  const startNewHymn = () => {
    if (hasUnsavedChanges && !window.confirm(isAr ? 'لديك تعديلات غير محفوظة، هل تريد المتابعة؟' : 'You have unsaved changes. Discard?')) {
      return;
    }
    const newId = `hymn_${Date.now()}`;
    setSelectedHymnId(newId);
    setTitleAr('');
    setTitleEn('');
    setTitleCoptic('');
    setSeasonAr('طقس سنوي');
    setSeasonEn('Annual');
    setOccasionTag('annual');
    setDifficulty('easy');
    setLevel(1);
    setAudioUrl('');
    setDurationSec(120);
    setHazatExplanationAr('');
    setHazatExplanationEn('');
    setSheetMusicUrl('');
    setPdfUrl('');
    setLines([
      {
        id: 1,
        coptic: '',
        arabized: '',
        arabic: '',
        hazatNotes: '',
        startTimeSec: 0
      }
    ]);
    setVersion(1);
    setStatus('draft');
    setHistory([]);
    setHasUnsavedChanges(false);
  };

  const handleFieldChange = (setter: any) => (e: any) => {
    setter(e.target.value);
    setHasUnsavedChanges(true);
  };

  // Add line to lyrics editor
  const addLyricLine = () => {
    const nextId = lines.length > 0 ? Math.max(...lines.map(l => l.id)) + 1 : 1;
    const lastTime = lines.length > 0 ? (lines[lines.length - 1].startTimeSec || 0) + 20 : 0;
    setLines([
      ...lines,
      {
        id: nextId,
        coptic: '',
        arabized: '',
        arabic: '',
        hazatNotes: '',
        startTimeSec: lastTime
      }
    ]);
    setHasUnsavedChanges(true);
  };

  const removeLyricLine = (idx: number) => {
    const updated = lines.filter((_, i) => i !== idx);
    setLines(updated);
    setHasUnsavedChanges(true);
  };

  const updateLyricLine = (idx: number, field: keyof HymnLyricLine, val: any) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: val };
    setLines(updated);
    setHasUnsavedChanges(true);
  };

  // Save / Publish
  const handleSave = async (publishImmediate = false) => {
    if (!titleAr.trim()) {
      alert(isAr ? 'برجاء كتابة عنوان اللحن بالعربية' : 'Please provide Arabic title');
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const payload: Partial<CopticHymnItem> = {
      id: selectedHymnId || `hymn_${Date.now()}`,
      titleAr,
      titleEn: titleEn || titleAr,
      titleCoptic,
      seasonAr,
      seasonEn,
      occasionTag,
      difficulty,
      level,
      audioUrl,
      durationSec: Number(durationSec),
      hazatExplanationAr,
      hazatExplanationEn,
      lines,
      status: publishImmediate ? 'published' : status
    };
    (payload as any).sheetMusicUrl = sheetMusicUrl;
    (payload as any).pdfUrl = pdfUrl;

    const isExisting = hymns.some(h => h.id === selectedHymnId);
    let res;
    if (isExisting) {
      res = await updateHymn(selectedHymnId!, payload);
    } else {
      res = await createHymn(payload);
    }

    setIsSaving(false);
    if (res.success && res.hymn) {
      setHasUnsavedChanges(false);
      populateForm(res.hymn);
      setStatusMessage({
        text: isAr
          ? `تم ${publishImmediate ? 'نشر اللحن بنجاح وتحديث الصلاحيات' : 'حفظ المسودة بأمان'} (v${res.hymn.version || 1})`
          : `Hymn ${publishImmediate ? 'published successfully' : 'draft saved'} (v${res.hymn.version || 1})`,
        type: 'success'
      });
      await loadLibrary();
    } else {
      setStatusMessage({
        text: res.error || (isAr ? 'حدث خطأ أثناء الحفظ' : 'Failed to save hymn'),
        type: 'error'
      });
    }
  };

  const handleUnpublish = async () => {
    if (!selectedHymnId) return;
    if (!window.confirm(isAr ? 'هل تريد إلغاء نشر هذا اللحن وإعادته لمسودة؟' : 'Unpublish this hymn to draft?')) return;

    setIsSaving(true);
    const res = await unpublishHymn(selectedHymnId);
    setIsSaving(false);
    if (res.success && res.hymn) {
      setStatus('draft');
      populateForm(res.hymn);
      setStatusMessage({
        text: isAr ? 'تم إلغاء نشر اللحن وإعادته كمسودة.' : 'Hymn unpublished to draft.',
        type: 'success'
      });
      await loadLibrary();
    }
  };

  const handleRestore = async (vNumber: number) => {
    if (!selectedHymnId) return;
    if (!window.confirm(isAr ? `استعادة النسخة ${vNumber}؟` : `Restore version ${vNumber}?`)) return;

    setIsSaving(true);
    const res = await restoreHymnVersion(selectedHymnId, vNumber);
    setIsSaving(false);
    if (res.success && res.hymn) {
      populateForm(res.hymn);
      setStatusMessage({
        text: isAr ? `تمت استعادة اللحن من النسخة ${vNumber}.` : `Restored hymn from v${vNumber}.`,
        type: 'success'
      });
      await loadLibrary();
    }
  };

  // Audio Playback in Studio
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.warn(e));
      setIsPlaying(true);
    }
  };

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Banner & Mode Indicator */}
      <div className="bg-gradient-to-r from-[#1B365D] via-[#0F223D] to-[#8B1E2E] text-white p-5 md:p-6 rounded-3xl shadow-sm border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-400/20 text-amber-300 rounded-2xl border border-amber-300/30">
            <Music size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black">
                {isAr ? 'استوديو تأليف ونشر مدرسة الألحان' : 'Hymns School Publishing Studio'}
              </h2>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                status === 'published' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-amber-950'
              }`}>
                {status === 'published' ? (isAr ? 'منشور للشمامسة' : 'Published') : (isAr ? 'مسودة خاصة' : 'Draft')}
              </span>
              <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full">
                v{version}
              </span>
            </div>
            <p className="text-xs text-stone-200 mt-0.5 font-bold">
              {isAr
                ? 'تحكم كامل في نصوص الألحان الثلاثية (قبطي، معرب، عربي)، رفع الصوت، دليل الهزات، والمستوى الشماسي المستهدف.'
                : 'Full authoring for 3-language hymn lyrics, audio playback, hazat guides, and target deacon level.'}
            </p>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={startNewHymn}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>{isAr ? 'لحن جديد' : 'New Hymn'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-amber-400/30 cursor-pointer"
          >
            <Eye size={15} />
            <span>{isAr ? 'معاينة كطالب' : 'Student Preview'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="px-3.5 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save size={15} />
            <span>{isAr ? 'حفظ مسودة' : 'Save Draft'}</span>
          </button>

          {status === 'published' ? (
            <button
              type="button"
              onClick={handleUnpublish}
              disabled={isSaving}
              className="px-3.5 py-2 bg-amber-700/80 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>{isAr ? 'إلغاء النشر' : 'Unpublish'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send size={15} />
              <span>{isAr ? 'نشر اللحن الآن' : 'Publish Hymn'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Unsaved Changes Banner */}
      {hasUnsavedChanges && (
        <div className="bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 p-3 rounded-2xl flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <span>{isAr ? 'لديك تعديلات غير محفوظة. لا تنس حفظ المسودة أو نشر اللحن.' : 'You have unsaved changes.'}</span>
          </div>
          <button
            onClick={() => handleSave(false)}
            className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[11px] font-black cursor-pointer"
          >
            {isAr ? 'حفظ الآن' : 'Save Now'}
          </button>
        </div>
      )}

      {/* Status Feedback */}
      {statusMessage && (
        <div className={`p-3 rounded-2xl flex items-center gap-2 text-xs font-bold ${
          statusMessage.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
            : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-300'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Grid: Left Library Selector & Right Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Hymns Library Column */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-[var(--mousa-border-sand)] space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-[var(--mousa-teal-deep)] dark:text-amber-300 flex items-center gap-1.5">
              <FolderOpen size={16} />
              <span>{isAr ? 'قائمة الألحان' : 'Hymns Library'}</span>
            </h3>
            <span className="text-[11px] font-bold text-stone-500">
              ({hymns.length})
            </span>
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {hymns.map((h) => {
              const isSelected = h.id === selectedHymnId;
              const isHymnDraft = (h as any).status === 'draft';
              return (
                <div
                  key={h.id}
                  onClick={() => {
                    if (hasUnsavedChanges && !window.confirm(isAr ? 'تجاهل التعديلات؟' : 'Discard changes?')) return;
                    populateForm(h);
                  }}
                  className={`p-3 rounded-2xl text-xs cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-[var(--mousa-teal)] text-white border-[var(--mousa-teal)] shadow-xs'
                      : 'bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span className="truncate max-w-[170px]">{h.titleAr || h.titleEn}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900 dark:bg-stone-700 dark:text-amber-300'
                    }`}>
                      {isAr ? `مستوى ${h.level}` : `Lvl ${h.level}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] opacity-80">
                    <span>{h.seasonAr || h.seasonEn}</span>
                    {isHymnDraft && (
                      <span className="text-amber-300 font-black">
                        {isAr ? 'مسودة' : 'Draft'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hymn Authoring Form */}
        <div className="lg:col-span-3 space-y-6">
          {/* Card 1: Core Titles & Target Level */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-[var(--mousa-border-sand)] space-y-4 shadow-xs">
            <h3 className="font-black text-sm text-[var(--mousa-teal-deep)] dark:text-amber-300 flex items-center gap-2">
              <FileText size={16} />
              <span>{isAr ? '١. البيانات الأساسية والمستوى المستهدف' : '1. Core Metadata & Target Level'}</span>
            </h3>

            {/* Target Level Switcher */}
            <div>
              <label className="block text-xs font-black text-stone-600 dark:text-stone-300 mb-2">
                {isAr ? 'المستوى الشماسي المستهدف:' : 'Target Deacon Level:'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {HYMNS_LEVEL_DEFINITIONS.map(def => (
                  <button
                    key={def.level}
                    type="button"
                    onClick={() => { setLevel(def.level); setHasUnsavedChanges(true); }}
                    className={`p-3 rounded-2xl text-start border transition-all cursor-pointer ${
                      level === def.level
                        ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 shadow-xs ring-2 ring-amber-400/40'
                        : 'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between font-black text-xs text-amber-950 dark:text-amber-200 mb-1">
                      <span>{isAr ? def.nameAr : def.nameEn}</span>
                      {level === def.level && <CheckCircle2 size={14} className="text-amber-600" />}
                    </div>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium line-clamp-2">
                      {isAr ? def.subAr : def.subEn}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* 3 Title Inputs: Arabic, Coptic, English */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {isAr ? 'اسم اللحن بالعربية *' : 'Hymn Title (Arabic) *'}
                </label>
                <input
                  type="text"
                  value={titleAr}
                  onChange={handleFieldChange(setTitleAr)}
                  placeholder="مثال: لحن إبؤورو (يا ملك السلام)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {isAr ? 'اسم اللحن بالقبطية' : 'Hymn Title (Coptic)'}
                </label>
                <input
                  type="text"
                  value={titleCoptic}
                  onChange={handleFieldChange(setTitleCoptic)}
                  placeholder="مثال: Ⲉⲡⲟⲩⲣⲟ ⲛ̀ⲧⲉ ϯϩⲓⲣⲏⲛⲏ"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-serif"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {isAr ? 'اسم اللحن بالإنجليزية' : 'Hymn Title (English)'}
                </label>
                <input
                  type="text"
                  value={titleEn}
                  onChange={handleFieldChange(setTitleEn)}
                  placeholder="e.g. Ep-Oro (O King of Peace)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>
            </div>

            {/* Liturgical Season & Occasion */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {isAr ? 'الموسم الطقسي' : 'Liturgical Season'}
                </label>
                <input
                  type="text"
                  value={seasonAr}
                  onChange={handleFieldChange(setSeasonAr)}
                  placeholder="مثال: طقس سنوي وفرايحي"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {isAr ? 'المناسبة الكنسية' : 'Occasion Tag'}
                </label>
                <select
                  value={occasionTag}
                  onChange={handleFieldChange(setOccasionTag)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                >
                  <option value="annual">{isAr ? 'سنوي (Annual)' : 'Annual'}</option>
                  <option value="kiahk">{isAr ? 'كيهك وتسابيح السيدة العذراء' : 'Kiahk'}</option>
                  <option value="lent">{isAr ? 'الصوم الكبير (Great Lent)' : 'Great Lent'}</option>
                  <option value="pascha">{isAr ? 'أسبوع الآلام والبصخة المقدسة' : 'Pascha'}</option>
                  <option value="resurrection">{isAr ? 'عيد القيامة والخماسين المقدسة' : 'Resurrection'}</option>
                  <option value="st_mary">{isAr ? 'أعياد السيدة العذراء والشهداء' : 'St. Mary / Saints'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {isAr ? 'درجة الصعوبة' : 'Difficulty'}
                </label>
                <select
                  value={difficulty}
                  onChange={handleFieldChange(setDifficulty)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                >
                  <option value="easy">{isAr ? 'سهل (للمبتدئين)' : 'Easy (Novice)'}</option>
                  <option value="medium">{isAr ? 'متوسط (للشمامسة)' : 'Medium (Intermediate)'}</option>
                  <option value="advanced">{isAr ? 'متقدم (طويل/حزايني/أسبوع آلام)' : 'Advanced (Solemn)'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Audio Reference, Playback & Attachments */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-[var(--mousa-border-sand)] space-y-4 shadow-xs">
            <h3 className="font-black text-sm text-[var(--mousa-teal-deep)] dark:text-amber-300 flex items-center gap-2">
              <Music size={16} />
              <span>{isAr ? '٢. التسجيل الصوتي، النوتة الموسيقية ودليل الهزات' : '2. Audio, Sheet Music & Hazat Guidance'}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {isAr ? 'رابط ملف الصوت (MP3 / Audio URL) *' : 'Audio URL (MP3) *'}
                </label>
                <input
                  type="text"
                  value={audioUrl}
                  onChange={handleFieldChange(setAudioUrl)}
                  placeholder="https://example.com/hymn.mp3"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {isAr ? 'رابط النوتة الموسيقية / كراسة الألحان (PDF)' : 'Sheet Music / Handout URL (PDF)'}
                </label>
                <input
                  type="text"
                  value={pdfUrl || sheetMusicUrl}
                  onChange={(e) => {
                    setPdfUrl(e.target.value);
                    setSheetMusicUrl(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="/uploads/sample_cross_lesson_handout.pdf"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-mono"
                />
              </div>
            </div>

            {/* In-Studio Audio Player */}
            {audioUrl && (
              <div className="bg-stone-50 dark:bg-stone-800/60 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
                  onEnded={() => setIsPlaying(false)}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlayAudio}
                    className="p-3 bg-[var(--mousa-teal)] hover:opacity-90 text-white rounded-2xl cursor-pointer shadow-xs"
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <div className="text-xs font-bold">
                    <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60) < 10 ? '0' : ''}{Math.floor(currentTime % 60)}</span>
                    <span className="text-stone-400 mx-1">/</span>
                    <span className="text-stone-500">{Math.floor(durationSec / 60)}:{Math.floor(durationSec % 60) < 10 ? '0' : ''}{Math.floor(durationSec % 60)}</span>
                  </div>
                </div>

                {/* Speed Controls */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-stone-500 font-bold">{isAr ? 'السرعة:' : 'Speed:'}</span>
                  {[0.75, 1.0, 1.25].map(sp => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => {
                        setPlaybackSpeed(sp);
                        if (audioRef.current) audioRef.current.playbackRate = sp;
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                        playbackSpeed === sp
                          ? 'bg-amber-500 text-white'
                          : 'bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {sp}x
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Hazat & Memorization Guidance Notes */}
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                {isAr ? 'توجيهات الهزات وطريقة الأداء والتقاسيم (عربي)' : 'Hazat Rhythm & Memorization Guidance'}
              </label>
              <textarea
                rows={2}
                value={hazatExplanationAr}
                onChange={handleFieldChange(setHazatExplanationAr)}
                placeholder="مثال: لحن شجي بهزات ثلاثية هادئة، يراعى الوقوف عند نهاية المقاطع والحرص على النطق البوهيري السليم..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
              />
            </div>
          </div>

          {/* Card 3: Structured 3-Language Lyrics & Timed Syllable Editor */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-[var(--mousa-border-sand)] space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm text-[var(--mousa-teal-deep)] dark:text-amber-300 flex items-center gap-2">
                  <Layers size={16} />
                  <span>{isAr ? '٣. نصوص وكلمات اللحن (قبطي، معرب، عربي، توقيت)' : '3. 3-Language Lyrics & Audio Sync'}</span>
                </h3>
                <p className="text-[11px] text-stone-500 font-bold mt-0.5">
                  {isAr ? 'أدخل مقاطع اللحن مرتبة، ليتمكن الشماس من متابعة الكلمات تزامناً مع الصوت.' : 'Enter ordered lines with Coptic, Arabic transliteration, and meaning.'}
                </p>
              </div>
              <button
                type="button"
                onClick={addLyricLine}
                className="px-3 py-1.5 bg-[var(--mousa-teal)] text-white text-xs font-black rounded-xl hover:opacity-90 flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} />
                <span>{isAr ? 'إضافة مقطع' : 'Add Line'}</span>
              </button>
            </div>

            {/* Lines List */}
            <div className="space-y-3">
              {lines.map((line, idx) => (
                <div
                  key={line.id}
                  className="p-3.5 bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-2 relative"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-stone-600 dark:text-stone-300">
                    <span className="font-black text-amber-700 dark:text-amber-400">
                      {isAr ? `المقطع ${idx + 1}` : `Line ${idx + 1}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-stone-400">
                        {isAr ? 'يبدأ عند (ثانية):' : 'Starts at (s):'}
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={line.startTimeSec || 0}
                        onChange={(e) => updateLyricLine(idx, 'startTimeSec', parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-0.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-mono text-center"
                      />
                      <button
                        type="button"
                        onClick={() => removeLyricLine(idx)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg cursor-pointer"
                        title={isAr ? 'حذف المقطع' : 'Delete line'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-0.5">
                        {isAr ? 'النص القبطي (Coptic Text):' : 'Coptic:'}
                      </label>
                      <input
                        type="text"
                        value={line.coptic}
                        onChange={(e) => updateLyricLine(idx, 'coptic', e.target.value)}
                        placeholder="Ⲉⲡⲟⲩⲣⲟ ⲛ̀ⲧⲉ ϯϩⲓⲣⲏⲛⲏ..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-serif"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-0.5">
                        {isAr ? 'النطق المعرب (Arabized Pronunciation):' : 'Arabized Pronunciation:'}
                      </label>
                      <input
                        type="text"
                        value={line.arabized}
                        onChange={(e) => updateLyricLine(idx, 'arabized', e.target.value)}
                        placeholder="إبـؤورو إنتي تي هيريني..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-0.5">
                        {isAr ? 'المعنى بالعربية (Arabic Translation):' : 'Arabic Translation:'}
                      </label>
                      <input
                        type="text"
                        value={line.arabic}
                        onChange={(e) => updateLyricLine(idx, 'arabic', e.target.value)}
                        placeholder="يا ملك السلام، أعطنا سلامك..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={line.hazatNotes || ''}
                      onChange={(e) => updateLyricLine(idx, 'hazatNotes', e.target.value)}
                      placeholder={isAr ? 'ملاحظة الهزات (اختياري، مثلاً: ٣ هزات متدرجة مع مد الصوت)' : 'Hazat note (optional)'}
                      className="w-full px-2.5 py-1 text-[11px] rounded-lg border border-stone-200 dark:border-stone-700 bg-white/70 dark:bg-stone-800/70 text-stone-600 dark:text-stone-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Version History & Restoration */}
          {history && history.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-[var(--mousa-border-sand)] space-y-3 shadow-xs">
              <h3 className="font-black text-sm text-[var(--mousa-teal-deep)] dark:text-amber-300 flex items-center gap-2">
                <RotateCcw size={16} />
                <span>{isAr ? 'سجل النسخ السابقة والاسترجاع' : 'Version History & Restoration'}</span>
              </h3>
              <div className="space-y-2">
                {history.map((snap: any, i: number) => (
                  <div
                    key={i}
                    className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-2xl flex items-center justify-between text-xs border border-stone-200 dark:border-stone-700"
                  >
                    <div>
                      <span className="font-black text-amber-700 dark:text-amber-300">
                        v{snap.version} ({snap.status === 'published' ? (isAr ? 'منشور' : 'Published') : (isAr ? 'مسودة' : 'Draft')})
                      </span>
                      <span className="text-stone-400 mx-2">•</span>
                      <span className="font-bold text-stone-700 dark:text-stone-300">{snap.titleAr}</span>
                      <span className="text-[10px] text-stone-400 block mt-0.5">
                        {snap.savedAt ? new Date(snap.savedAt).toLocaleString(isAr ? 'ar-EG' : 'en-US') : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestore(snap.version)}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-black cursor-pointer shadow-xs"
                    >
                      {isAr ? 'استرجاع النسخة' : 'Restore'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Student Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 border-2 border-amber-500/40 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 bg-amber-400/20 text-amber-900 dark:text-amber-300 rounded-full font-bold">
                  {isAr ? 'معاينة تجربة الشماس' : 'Student View Preview'}
                </span>
                <span className="text-xs font-black text-stone-500">
                  {isAr ? `مستوى ${level}` : `Level ${level}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 text-stone-500 hover:text-stone-800 rounded-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-center py-2 space-y-1">
              <h2 className="text-2xl font-black text-[var(--mousa-teal-deep)] dark:text-amber-300">
                {titleAr || 'لحن جديد'}
              </h2>
              {titleCoptic && (
                <p className="text-lg font-serif text-amber-800 dark:text-amber-400">
                  {titleCoptic}
                </p>
              )}
              {titleEn && (
                <p className="text-xs text-stone-500">
                  {titleEn}
                </p>
              )}
            </div>

            {/* Hazat note in preview */}
            {hazatExplanationAr && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-300 dark:border-amber-800 text-xs text-stone-800 dark:text-stone-200 font-medium">
                💡 <span className="font-bold">{isAr ? 'توجيه الهزات:' : 'Hazat Note:'}</span> {hazatExplanationAr}
              </div>
            )}

            {/* Syllables list */}
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200 dark:border-stone-700 text-center space-y-1">
                  <div className="text-base font-serif font-black text-[var(--mousa-teal-deep)] dark:text-amber-200">
                    {l.coptic || '—'}
                  </div>
                  <div className="text-xs font-bold text-amber-800 dark:text-amber-400">
                    {l.arabized || '—'}
                  </div>
                  <div className="text-xs text-stone-600 dark:text-stone-300">
                    {l.arabic || '—'}
                  </div>
                  {l.hazatNotes && (
                    <div className="text-[10px] text-stone-400">
                      🎵 {l.hazatNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowPreviewModal(false)}
              className="w-full py-2.5 bg-[var(--mousa-teal)] text-white font-black rounded-xl text-xs cursor-pointer"
            >
              {isAr ? 'إغلاق المعاينة' : 'Close Preview'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
