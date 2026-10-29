import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileAudio,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  Video
} from 'lucide-react';
import { Language, SourceType } from '../../../types';
import { CANONICAL_GRADE_LIST } from '../../../lib/classGroups';
import {
  addLessonSource,
  listLessonSources,
  uploadSourceMedia
} from '../../../lib/lessonSourceService';
import { createLessonDraft } from '../../../lib/lessonAuthoringService';
import { getHymnById, getHymns, createHymn, updateHymn } from '../../../lib/hymnsService';
import { createTaxisDraft, getTaxisItems, saveTaxisItem } from '../../../lib/taxisService';
import { useAuth } from '../../../context/AuthContext';
import { isSupabaseConfigured, supabase } from '../../../lib/supabase';
import {
  CurriculumImportCategory,
  CurriculumImportCheckpoint,
  CurriculumImportStage,
  createTaxisAttachment,
  getImportFileFingerprint,
  getImportFileExtension,
  isDuplicateImportTitle,
  isAuthorizedCurriculumImporter,
  normalizeImportTitle,
  runCurriculumImport,
  validateImportFile
} from '../../../lib/curriculumImport';

interface ImportItem {
  id: string;
  draftId: string;
  versionId: string;
  file: File;
  previewUrl: string;
  titleAr: string;
  titleEn: string;
  description: string;
  checkpoint: CurriculumImportCheckpoint;
  stage: CurriculumImportStage;
  error?: string;
  duplicate?: boolean;
}

interface CurriculumImportCenterProps {
  lang?: Language;
}

const ACCEPT = '.pdf,.docx,.pptx,.doc,.ppt,.jpg,.jpeg,.png,.webp,.gif,.mp3,.wav,.m4a,.aac,.ogg,.mp4,.webm,.mov';

function titleFromFilename(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function sourceTypeForFile(file: File): SourceType {
  const extension = getImportFileExtension(file.name);
  if (file.type.startsWith('audio/')) return 'TEACHER_VOICE';
  if (file.type.startsWith('video/')) return 'TEACHER_VIDEO';
  if (file.type.startsWith('image/')) return 'IMAGE';
  if (extension === '.pdf') return 'PDF';
  if (extension === '.doc' || extension === '.docx') return 'DOCX';
  if (extension === '.ppt' || extension === '.pptx') return 'PPTX';
  return 'OTHER_APPROVED_RESOURCE';
}

function stageText(stage: CurriculumImportStage, isAr: boolean): string {
  const labels: Record<CurriculumImportStage, [string, string]> = {
    ready: ['جاهز للاستيراد', 'Ready to import'],
    creating: ['إنشاء المسودة', 'Creating draft'],
    uploading: ['رفع الملف إلى التخزين الآمن', 'Uploading to secure storage'],
    saving: ['حفظ بيانات الملف', 'Saving attachment metadata'],
    success: ['تم الاستيراد كمسودة', 'Imported as a draft'],
    error: ['تعذر إكمال الاستيراد', 'Import failed']
  };
  return labels[stage][isAr ? 0 : 1];
}

export function CurriculumImportCenter({ lang = 'ar' }: CurriculumImportCenterProps) {
  const isAr = lang === 'ar';
  const { userData, isGuest } = useAuth();
  const authorized = isAuthorizedCurriculumImporter(userData, isGuest, isSupabaseConfigured);
  const [category, setCategory] = useState<CurriculumImportCategory>('sunday_school');
  const [grade, setGrade] = useState(CANONICAL_GRADE_LIST.find(item => item.code === 'Grade 4')?.code || CANONICAL_GRADE_LIST[0].code);
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicateCheckError, setDuplicateCheckError] = useState<string | null>(null);
  const [existingTitles, setExistingTitles] = useState<Set<string>>(new Set());
  const [duplicateCheckAttempt, setDuplicateCheckAttempt] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const counts = useMemo(() => ({
    success: items.filter(item => item.stage === 'success').length,
    failed: items.filter(item => item.stage === 'error').length,
    ready: items.filter(item => item.stage === 'ready').length
  }), [items]);

  useEffect(() => {
    let active = true;
    async function checkExistingTitles() {
      setIsCheckingDuplicates(true);
      setDuplicateCheckError(null);
      setExistingTitles(new Set());
      if (!authorized) {
        setIsCheckingDuplicates(false);
        return;
      }

      try {
        if (category === 'sunday_school') {
          if (!supabase) throw new Error('Supabase is not configured; duplicate lesson checks are unavailable.');
          const { data, error } = await supabase
            .from('lessons')
            .select('title_ar')
            .eq('grade_level', grade);
          if (error) throw new Error(`Could not check existing lesson titles: ${error.message}`);
          if (active) setExistingTitles(new Set((data || []).map(lesson => normalizeImportTitle(lesson.title_ar || ''))));
        } else if (category === 'hymns') {
          const result = await getHymns(undefined, undefined, 'all');
          if (!result.success) throw new Error(result.error || 'تعذر التحقق من مكتبة الألحان.');
          if (active) {
            setExistingTitles(new Set((result.items || []).map(hymn => normalizeImportTitle(hymn.titleAr))));
          }
        } else {
          const result = await getTaxisItems();
          if (!result.success) throw new Error(result.error || 'تعذر التحقق من مكتبة الطقس.');
          if (active) {
            setExistingTitles(new Set((result.items || []).map(item => normalizeImportTitle(item.titleAr))));
          }
        }
      } catch (error) {
        if (active) setDuplicateCheckError(error instanceof Error ? error.message : 'تعذر التحقق من العناصر الموجودة.');
      } finally {
        if (active) setIsCheckingDuplicates(false);
      }
    }

    checkExistingTitles();
    return () => { active = false; };
  }, [authorized, category, duplicateCheckAttempt, grade, userData?.id]);

  useEffect(() => () => {
    itemsRef.current.forEach(item => URL.revokeObjectURL(item.previewUrl));
  }, []);

  const updateItem = (id: string, updates: Partial<ImportItem>) => {
    setItems(current => current.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleSelectFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    const selected: File[] = [];
    if (fileList) {
      for (let index = 0; index < fileList.length; index += 1) {
        const file = fileList.item(index);
        if (file) selected.push(file);
      }
    }
    event.target.value = '';
    if (selected.length === 0) return;

    const seen = new Set(items.map(item => getImportFileFingerprint(item.file)));
    const additions: ImportItem[] = selected.map(file => {
      const fingerprint = getImportFileFingerprint(file);
      const duplicate = seen.has(fingerprint);
      seen.add(fingerprint);
      return {
        id: `import_${crypto.randomUUID()}`,
        draftId: crypto.randomUUID(),
        versionId: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        titleAr: titleFromFilename(file.name),
        titleEn: titleFromFilename(file.name),
        description: '',
        checkpoint: {},
        stage: 'ready',
        duplicate
      };
    });
    setItems(current => [...current, ...additions]);
    setNotice(null);
  };

  const validationMessage = (item: ImportItem): string | null => {
    if (item.duplicate) return isAr ? 'هذا الملف مضاف بالفعل في الدفعة.' : 'This file is already in this batch.';
    const fileError = validateImportFile(category, item.file);
    if (fileError) return fileError;
    if (!item.titleAr.trim()) return isAr ? 'اكتب عنواناً واضحاً للعنصر.' : 'Enter a clear title for this item.';
    if (category === 'sunday_school' && !grade) return isAr ? 'اختار الصف الدراسي.' : 'Choose a Sunday School grade.';
    if (category !== 'sunday_school' && !level) return isAr ? 'اختار المستوى.' : 'Choose a level.';
    const normalizedTitle = normalizeImportTitle(item.titleAr);
    if (existingTitles.has(normalizedTitle)) {
      return isAr ? 'يوجد عنصر بهذا العنوان بالفعل في المكتبة.' : 'An item with this title already exists in the library.';
    }
    if (isDuplicateImportTitle(
      item.titleAr,
      existingTitles,
      items.filter(other => other.id !== item.id).map(other => other.titleAr)
    )) {
      return isAr ? 'يوجد عنصر آخر في الدفعة بنفس العنوان.' : 'Another item in this batch has the same title.';
    }
    return null;
  };

  const removeItem = (item: ImportItem) => {
    if (item.stage === 'success' || isImporting || item.checkpoint.recordId || item.checkpoint.mediaReference) return;
    URL.revokeObjectURL(item.previewUrl);
    setItems(current => current.filter(candidate => candidate.id !== item.id));
  };

  const importItem = async (item: ImportItem) => {
    if (duplicateCheckError) {
      updateItem(item.id, {
        error: isAr ? 'تعذر التحقق من المكتبة. أعد المحاولة قبل الاستيراد.' : 'The library could not be checked. Retry the check before importing.',
        stage: 'error'
      });
      return;
    }
    const validationError = validationMessage(item);
    if (validationError) {
      updateItem(item.id, { error: validationError, stage: 'error' });
      return;
    }
    if (!userData) {
      updateItem(item.id, { error: isAr ? 'انتهت الجلسة. سجل الدخول مرة أخرى.' : 'Your session expired. Sign in again.', stage: 'error' });
      return;
    }
    let serverToken: string | null = null;
    try {
      serverToken = localStorage.getItem('church_auth_token');
    } catch (error) {
      updateItem(item.id, {
        error: error instanceof Error ? error.message : 'تعذر قراءة جلسة الدخول.',
        stage: 'error'
      });
      return;
    }
    if (!serverToken) {
      updateItem(item.id, {
        error: isAr ? 'انتهت الجلسة. سجل الدخول مرة أخرى.' : 'Your session expired. Sign in again.',
        stage: 'error'
      });
      return;
    }

    const stage = (nextStage: CurriculumImportStage, checkpoint: CurriculumImportCheckpoint) => {
      updateItem(item.id, {
        stage: nextStage,
        checkpoint: { ...checkpoint },
        error: nextStage === 'error' ? item.error : undefined
      });
    };
    const sourceUpload = async (lessonId?: string) => {
      const uploaded = await uploadSourceMedia(item.file, lessonId);
      if (!uploaded.success || !uploaded.fileUrl) {
        throw new Error(uploaded.error || (isAr ? 'تعذر حفظ الملف في التخزين الآمن.' : 'The file could not be saved to secure storage.'));
      }
      return uploaded.fileUrl;
    };

    const ensureDraft = async (recordId?: string): Promise<string> => {
      if (category === 'sunday_school') {
        if (recordId) return recordId;
        const titleEn = item.titleEn.trim() || item.titleAr.trim();
        const titleAr = item.titleAr.trim();
        if (!supabase) throw new Error('Supabase is not configured; lesson drafts cannot be saved.');
        const { data: existingDraft, error: existingDraftError } = await supabase
          .from('lessons')
          .select('id, created_by, title_en, title_ar, grade_level, lesson_status, active_version_id')
          .eq('id', item.draftId)
          .maybeSingle();
        if (existingDraftError) throw new Error(`Could not check the import draft checkpoint: ${existingDraftError.message}`);
        if (existingDraft) {
          if (
            existingDraft.created_by !== userData.id ||
            existingDraft.title_en !== titleEn ||
            existingDraft.title_ar !== titleAr ||
            existingDraft.grade_level !== grade ||
            existingDraft.lesson_status !== 'draft' ||
            existingDraft.active_version_id
          ) {
            throw new Error('The saved lesson checkpoint does not match this import. Do not retry; contact an administrator.');
          }
          const { data: existingVersion, error: versionCheckError } = await supabase
            .from('lesson_versions')
            .select('id')
            .eq('id', item.versionId)
            .eq('lesson_id', item.draftId)
            .maybeSingle();
          if (versionCheckError) throw new Error(`Could not verify the lesson draft version: ${versionCheckError.message}`);
          if (!existingVersion) throw new Error('An incomplete lesson draft exists for this import. Contact an administrator before retrying.');
          return item.draftId;
        }

        const { data: titleDuplicate, error: titleCheckError } = await supabase
          .from('lessons')
          .select('id')
          .eq('created_by', userData.id)
          .eq('title_en', titleEn)
          .eq('title_ar', titleAr)
          .eq('grade_level', grade)
          .neq('id', item.draftId)
          .maybeSingle();
        if (titleCheckError) throw new Error(`Could not check for duplicate lesson drafts: ${titleCheckError.message}`);
        if (titleDuplicate) throw new Error('A draft with this title already exists. Choose a different title to avoid a duplicate.');

        const created = await createLessonDraft({
          id: item.draftId,
          versionId: item.versionId,
          titleEn,
          titleAr,
          gradeLevel: grade,
          summaryEn: item.description.trim() || '',
          summaryAr: item.description.trim() || ''
        });
        if (!created.data || created.error) throw created.error || new Error('تعذر إنشاء مسودة الدرس.');
        return created.data.lesson.id;
      }

      if (category === 'hymns') {
        const recordKey = recordId || item.id;
        const existing = await getHymnById(recordKey);
        if (existing.success && existing.hymn) {
          if (existing.hymn.createdBy !== userData.id || existing.hymn.status !== 'draft') {
            throw new Error('لا يمكن استكمال عنصر لا تملكه أو لم يعد مسودة.');
          }
          return recordKey;
        }
        const created = await createHymn({
          id: recordKey,
          titleAr: item.titleAr.trim(),
          titleEn: item.titleEn.trim() || item.titleAr.trim(),
          titleCoptic: '',
          seasonAr: 'طقس سنوي',
          seasonEn: 'Annual',
          occasionTag: 'annual',
          difficulty: 'easy',
          level,
          audioUrl: '',
          pdfUrl: '',
          durationSec: 0,
          status: 'draft',
          lines: []
        });
        if (!created.success || !created.hymn) {
          const afterFailure = await getHymnById(recordKey);
          if (afterFailure.success && afterFailure.hymn?.createdBy === userData.id && afterFailure.hymn.status === 'draft') {
            return recordKey;
          }
          throw new Error(created.error || 'تعذر إنشاء مسودة اللحن.');
        }
        return recordKey;
      }

      const recordKey = recordId || item.id;
      const currentItems = await getTaxisItems();
      if (!currentItems.success) throw new Error(currentItems.error || 'تعذر تحميل مكتبة الطقس.');
      const existing = currentItems.items?.find(current => current.id === recordKey);
      if (existing) {
        if (existing.createdBy !== userData.id || existing.status !== 'draft') {
          throw new Error('لا يمكن استكمال عنصر لا تملكه أو لم يعد مسودة.');
        }
        return recordKey;
      }
      const created = await createTaxisDraft({
        id: recordKey,
        titleAr: item.titleAr.trim(),
        titleEn: item.titleEn.trim() || item.titleAr.trim(),
        titleCopt: '',
        category: 'liturgy',
        level,
        audience: 'all',
        status: 'draft',
        summaryAr: item.description.trim(),
        summaryEn: item.description.trim(),
        sections: [],
        references: [],
        documents: []
      });
      if (!created.success || !created.item) {
        const afterFailure = await getTaxisItems();
        const recovered = afterFailure.items?.find(current =>
          current.id === recordKey && current.createdBy === userData.id && current.status === 'draft'
        );
        if (recovered) return recordKey;
        throw new Error(created.error || 'تعذر إنشاء مسودة الطقس.');
      }
      return recordKey;
    };

    const attach = async (recordId: string, mediaReference: string) => {
      if (category === 'sunday_school') {
        const sources = await listLessonSources(recordId);
        if (sources.error) throw sources.error;
        if (sources.data?.some(source => source.fileUrl === mediaReference && source.originalFilename === item.file.name)) return;
        const result = await addLessonSource({
          lessonId: recordId,
          type: sourceTypeForFile(item.file),
          originalFilename: item.file.name,
          mimeType: item.file.type || 'application/octet-stream',
          fileUrl: mediaReference,
          fileSize: item.file.size,
          description: item.description.trim() || `Imported from ${item.file.name}`,
          rightsStatus: 'TEACHER_OWNED',
          processingStatus: 'PENDING',
          priority: 'SUPPLEMENTARY'
        });
        if (!result.data || result.error) throw result.error || new Error('تعذر حفظ بيانات مصدر الدرس.');
        return;
      }

      if (category === 'hymns') {
        const current = await getHymnById(recordId);
        if (!current.success || !current.hymn) throw new Error(current.error || 'تعذر استعادة مسودة اللحن.');
        if (current.hymn.createdBy !== userData.id || current.hymn.status !== 'draft') {
          throw new Error('لا يمكن تعديل مسودة لحن لا تملكها.');
        }
        const isAudio = item.file.type.startsWith('audio/');
        const mediaAlreadyAttached = isAudio
          ? current.hymn.audioUrl === mediaReference
          : current.hymn.pdfUrl === mediaReference;
        if (mediaAlreadyAttached) return;
        const updated = await updateHymn(recordId, {
          audioUrl: isAudio ? mediaReference : current.hymn.audioUrl,
          pdfUrl: isAudio ? current.hymn.pdfUrl : mediaReference
        });
        if (!updated.success || !updated.hymn) throw new Error(updated.error || 'تعذر ربط الملف بمسودة اللحن.');
        return;
      }

      const currentItems = await getTaxisItems();
      if (!currentItems.success) throw new Error(currentItems.error || 'تعذر استعادة مسودة الطقس.');
      const current = currentItems.items?.find(candidate => candidate.id === recordId);
      if (!current || current.createdBy !== userData.id || current.status !== 'draft') {
        throw new Error('لا يمكن تعديل مسودة طقس لا تملكها.');
      }
      if (current.documents.some(document => document.fileUrl === mediaReference)) return;
      const attachment = createTaxisAttachment(item.file, mediaReference, `import_${item.id}`);
      const updated = await saveTaxisItem({
        ...current,
        documents: [...current.documents, attachment],
        status: 'draft'
      }, userData);
      if (!updated.success || !updated.item) throw new Error(updated.error || 'تعذر ربط الملف بمسودة الطقس.');
    };

    const result = await runCurriculumImport(item.checkpoint, {
      ensureDraft,
      upload: () => category === 'sunday_school'
        ? sourceUpload(item.checkpoint.recordId)
        : sourceUpload(),
      attach
    }, stage);
    updateItem(item.id, {
      checkpoint: result.checkpoint,
      stage: result.stage,
      error: result.error
    });
  };

  const handleImportBatch = async () => {
    if (!authorized || isImporting || isCheckingDuplicates) return;
    if (duplicateCheckError) {
      setNotice(isAr ? 'تعذر التحقق من العناصر الموجودة. أعد المحاولة قبل الاستيراد.' : 'Existing items could not be checked. Retry before importing.');
      return;
    }
    setIsImporting(true);
    setNotice(null);
    try {
      for (const item of items) {
        if (item.stage === 'success') continue;
        await importItem(item);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const retryDuplicateLookup = () => {
    setDuplicateCheckError(null);
    setIsCheckingDuplicates(true);
    setDuplicateCheckAttempt(current => current + 1);
  };

  const removeAllCompleted = () => {
    const completed = items.filter(item => item.stage === 'success');
    completed.forEach(item => URL.revokeObjectURL(item.previewUrl));
    setItems(current => current.filter(item => item.stage !== 'success'));
  };

  if (!authorized) {
    return (
      <section dir={isAr ? 'rtl' : 'ltr'} className="mx-auto max-w-4xl rounded-3xl border border-amber-300 bg-amber-50 p-6 text-stone-900 dark:bg-amber-950/30 dark:text-amber-100">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-1 shrink-0" />
          <div>
            <h2 className="font-black">{isAr ? 'مركز تجهيز المنهج' : 'Curriculum Import Center'}</h2>
            <p className="mt-1 text-sm">{isAr ? 'الاستيراد متاح للخادم أو المسؤول بعد تسجيل الدخول والاتصال الآمن.' : 'Importing is available to authenticated teachers and administrators when secure storage is configured.'}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section dir={isAr ? 'rtl' : 'ltr'} className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-3xl border-2 border-[var(--mousa-border-sand)] bg-gradient-to-br from-white to-amber-50 p-5 shadow-sm dark:from-slate-900 dark:to-slate-800 md:p-7">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[var(--mousa-teal-deep)] p-3 text-white"><Upload size={23} /></div>
          <div>
            <h2 className="text-xl font-black text-[var(--mousa-teal-deep)] dark:text-amber-100 md:text-2xl">
              {isAr ? 'مركز تجهيز المنهج' : 'Curriculum Import Center'}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-600 dark:text-stone-300">
              {isAr
                ? 'جهّز ملفات المنهج دفعة واحدة. كل ملف يتحول لمسودة منفصلة، ولن يظهر للطلاب قبل المراجعة والاعتماد.'
                : 'Prepare curriculum files in one batch. Each file becomes a separate draft and stays hidden from students until reviewed and approved.'}
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-100/70 p-3 text-xs leading-5 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          {isAr
            ? 'مهم: ملفات مدارس الأحد تُحفظ في Supabase Storage الخاص. بيانات الألحان والطقس تستخدم حالياً خدمات الخادم الموجودة؛ تأكد من مزامنة قاعدة البيانات قبل الاعتماد عليها في بيئة إنتاج.'
            : 'Note: Sunday School files are uploaded to private Supabase Storage. Hymns and Taxis records currently use the existing server services; verify database synchronization before relying on them in production.'}
        </div>
      </header>

      <div className="grid gap-4 rounded-3xl border border-[var(--mousa-border-sand)] bg-white p-4 shadow-xs dark:bg-slate-900 md:grid-cols-3 md:p-5">
        <label className="space-y-2 text-sm font-bold text-stone-700 dark:text-stone-200">
          <span>{isAr ? '١. نوع المحتوى' : '1. Content category'}</span>
          <select
            value={category}
            onChange={event => {
              const next = event.target.value as CurriculumImportCategory;
              setCategory(next);
              setNotice(null);
              setItems(current => current.map(item => ({
                ...item,
                stage: item.stage === 'error' ? 'ready' : item.stage,
                error: undefined
              })));
            }}
            disabled={isImporting || items.length > 0}
            className="w-full rounded-xl border border-stone-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="sunday_school">{isAr ? 'دروس مدارس الأحد' : 'Sunday School lessons'}</option>
            <option value="hymns">{isAr ? 'الألحان' : 'Hymns'}</option>
            <option value="taxis">{isAr ? 'الطقس القبطي (التاكسيس)' : 'Coptic Taxis'}</option>
          </select>
        </label>

        {category === 'sunday_school' ? (
          <label className="space-y-2 text-sm font-bold text-stone-700 dark:text-stone-200">
            <span>{isAr ? '٢. الصف الدراسي' : '2. Sunday School grade'}</span>
            <select
              value={grade}
              onChange={event => setGrade(event.target.value)}
              disabled={isImporting || items.length > 0}
              className="w-full rounded-xl border border-stone-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              {CANONICAL_GRADE_LIST.map(item => (
                <option key={item.id} value={item.code}>{isAr ? item.name.ar : item.name.en}</option>
              ))}
            </select>
          </label>
        ) : (
          <label className="space-y-2 text-sm font-bold text-stone-700 dark:text-stone-200">
            <span>{isAr ? '٢. المستوى المشترك' : '2. Shared level'}</span>
            <select
              value={level}
              onChange={event => setLevel(Number(event.target.value) as 1 | 2 | 3)}
              disabled={isImporting || items.length > 0}
              className="w-full rounded-xl border border-stone-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              {[1, 2, 3].map(value => <option key={value} value={value}>{isAr ? `المستوى ${value}` : `Level ${value}`}</option>)}
            </select>
          </label>
        )}

        <div className="flex items-end">
          <input ref={fileInputRef} type="file" multiple accept={ACCEPT} onChange={handleSelectFiles} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--mousa-teal-deep)] px-4 py-3 font-black text-white shadow-sm transition hover:bg-[var(--mousa-teal)] disabled:opacity-50"
          >
            <Upload size={18} />
            {isAr ? 'اختار ملفات متعددة' : 'Choose multiple files'}
          </button>
        </div>
      </div>

      {category === 'hymns' && (
        <p className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          {isAr
            ? 'مكتبة الألحان تقبل التسجيل الصوتي وملفات PDF فقط حالياً، لأن نموذج اللحن الحالي لا يوفر مرفقات عامة لباقي أنواع الملفات.'
            : 'Hymns currently accepts audio recordings and PDFs only because its existing model has no general attachment collection.'}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900">
        <span className="text-stone-600 dark:text-stone-300">
          {isCheckingDuplicates
            ? (isAr ? 'جارٍ التحقق من المكتبة لتجنب تكرار العناوين...' : 'Checking the library for duplicate titles...')
            : duplicateCheckError || (isAr ? 'سيتم فحص العناوين قبل الاستيراد.' : 'Titles are checked before importing.')}
        </span>
        {duplicateCheckError && (
          <button type="button" onClick={retryDuplicateLookup} className="flex shrink-0 items-center gap-1 font-bold text-[var(--mousa-teal-deep)]">
            <RefreshCw size={13} />{isAr ? 'إعادة المحاولة' : 'Retry check'}
          </button>
        )}
      </div>

      {notice && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{notice}</p>}

      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-stone-100 p-3 text-sm dark:bg-slate-800">
            <p className="font-bold text-stone-700 dark:text-stone-200">
              {isAr
                ? `${items.length} ملف · ${counts.success} تم · ${counts.failed} يحتاج مراجعة`
                : `${items.length} files · ${counts.success} complete · ${counts.failed} need attention`}
            </p>
            <div className="flex gap-2">
              {counts.success > 0 && (
                <button type="button" onClick={removeAllCompleted} disabled={isImporting} className="rounded-lg px-3 py-2 text-xs font-bold text-stone-600 hover:bg-white disabled:opacity-50">
                  {isAr ? 'إخفاء المكتمل' : 'Hide completed'}
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleImportBatch()}
                disabled={isImporting || isCheckingDuplicates || items.every(item => item.stage === 'success') || Boolean(duplicateCheckError)}
                className="flex items-center gap-2 rounded-xl bg-[var(--mousa-coral)] px-4 py-2.5 text-xs font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isImporting ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
                {isAr ? 'استيراد كمسودات' : 'Import as drafts'}
              </button>
            </div>
          </div>

          {items.map(item => {
            const validationError = validationMessage(item);
            const previewIsImage = item.file.type.startsWith('image/');
            const previewIsVideo = item.file.type.startsWith('video/');
            const previewIsAudio = item.file.type.startsWith('audio/');
            return (
              <article key={item.id} className="grid gap-4 rounded-2xl border border-[var(--mousa-border-sand)] bg-white p-3 shadow-xs dark:bg-slate-900 md:grid-cols-[180px_1fr] md:p-4">
                <div className="flex min-h-32 items-center justify-center overflow-hidden rounded-xl bg-stone-100 dark:bg-slate-800">
                  {previewIsImage ? (
                    <img src={item.previewUrl} alt={item.file.name} className="h-full max-h-48 w-full object-contain" />
                  ) : previewIsVideo ? (
                    <video src={item.previewUrl} controls className="max-h-48 w-full" />
                  ) : previewIsAudio ? (
                    <div className="w-full p-3 text-center">
                      <FileAudio className="mx-auto mb-2 text-[var(--mousa-teal)]" />
                      <audio src={item.previewUrl} controls className="w-full" />
                    </div>
                  ) : getImportFileExtension(item.file.name) === '.pdf' ? (
                    <iframe title={item.file.name} src={item.previewUrl} className="h-48 w-full rounded-xl" />
                  ) : (
                    <div className="p-4 text-center text-stone-600 dark:text-stone-300">
                      <FileText className="mx-auto mb-2 text-[var(--mousa-teal)]" />
                      <span className="break-all text-xs font-bold">{item.file.name}</span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs text-stone-500" title={item.file.name}>{item.file.name} · {(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                      <p className={`mt-1 flex items-center gap-1.5 text-xs font-black ${item.stage === 'success' ? 'text-emerald-700' : item.stage === 'error' ? 'text-red-700' : 'text-[var(--mousa-teal-deep)]'}`}>
                        {item.stage === 'success'
                          ? <CheckCircle2 size={14} />
                          : item.stage === 'error'
                          ? <AlertCircle size={14} />
                          : item.stage === 'ready'
                          ? <Upload size={14} />
                          : <Loader2 size={14} className="animate-spin" />}
                        {stageText(item.stage, isAr)}
                      </p>
                    </div>
                    {item.stage !== 'success' && (
                      <button type="button" onClick={() => removeItem(item)} disabled={isImporting || Boolean(item.checkpoint.recordId || item.checkpoint.mediaReference)} aria-label={isAr ? 'إزالة الملف' : 'Remove file'} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-40">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="space-y-1 text-xs font-bold text-stone-600 dark:text-stone-300">
                      <span>{isAr ? 'العنوان بالعربية' : 'Arabic title'}</span>
                      <input value={item.titleAr} onChange={event => updateItem(item.id, { titleAr: event.target.value, error: undefined })} disabled={isImporting || item.stage === 'success'} className="w-full rounded-lg border border-stone-300 bg-white p-2.5 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800" />
                    </label>
                    <label className="space-y-1 text-xs font-bold text-stone-600 dark:text-stone-300">
                      <span>{isAr ? 'العنوان بالإنجليزية (اختياري)' : 'English title (optional)'}</span>
                      <input value={item.titleEn} onChange={event => updateItem(item.id, { titleEn: event.target.value })} disabled={isImporting || item.stage === 'success'} className="w-full rounded-lg border border-stone-300 bg-white p-2.5 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800" />
                    </label>
                  </div>
                  <label className="block space-y-1 text-xs font-bold text-stone-600 dark:text-stone-300">
                    <span>{isAr ? 'ملاحظة للخادم (اختياري)' : 'Servant note (optional)'}</span>
                    <input value={item.description} onChange={event => updateItem(item.id, { description: event.target.value })} disabled={isImporting || item.stage === 'success'} className="w-full rounded-lg border border-stone-300 bg-white p-2.5 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800" />
                  </label>

                  {(validationError || item.error) && item.stage !== 'success' && (
                    <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-red-300 bg-red-50 p-2.5 text-xs leading-5 text-red-800">
                      <span>{item.error || validationError}</span>
                      {item.stage === 'error' && !validationError && (
                        <button type="button" onClick={() => void importItem(item)} disabled={isImporting} className="flex shrink-0 items-center gap-1 font-black underline disabled:opacity-50">
                          <RefreshCw size={12} />{isAr ? 'إعادة المحاولة' : 'Retry'}
                        </button>
                      )}
                    </div>
                  )}
                  {item.stage !== 'success' && (item.checkpoint.recordId || item.checkpoint.mediaReference) && (
                    <p className="text-xs leading-5 text-amber-800 dark:text-amber-200">
                      {isAr
                        ? 'تم بدء الحفظ؛ حالة المسودة وأي ملف تم رفعه محفوظة للمحاولة مرة أخرى. استخدم «إعادة المحاولة» لإكمال المسودة.'
                        : 'Saving has started; the draft and any uploaded-file checkpoint are retained for retry. Use Retry to complete the draft.'}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {items.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-stone-300 bg-white/70 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/70">
          <Video className="mx-auto mb-3 text-stone-400" size={32} />
          <p className="font-black text-stone-700 dark:text-stone-200">{isAr ? 'ابدأ باختيار الملفات من جهازك' : 'Start by choosing files from your device'}</p>
          <p className="mt-1 text-sm text-stone-500">{isAr ? 'هنراجع كل ملف وعنوانه قبل ما يتحول لمسودة.' : 'Review each file and title before creating its draft.'}</p>
        </div>
      )}
    </section>
  );
}
