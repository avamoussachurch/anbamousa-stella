import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Save,
  Send,
  Layers,
  RotateCcw,
  ShieldCheck,
  FolderOpen,
  FileText,
  Upload,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { TaxisItem, TaxisSection, TaxisCategory, TaxisAudience, TaxisStatus, TaxisAttachment, Language } from '../../../types';
import {
  getTaxisItems,
  saveTaxisItem,
  executeTaxisStatusAction,
  computeTaxisPermissions,
  INITIAL_TAXIS_COLLECTION
} from '../../../lib/taxisService';
import { useAuth } from '../../../context/AuthContext';
import { parseHymnsTaxisLevel, type HymnsTaxisLevel } from '../../../lib/hymnsTaxisLevel';

interface TaxisPublishingStudioProps {
  lang?: Language;
}

export function TaxisPublishingStudio({ lang = 'ar' }: TaxisPublishingStudioProps) {
  const isAr = lang === 'ar';
  const { userData } = useAuth();

  const [items, setItems] = useState<TaxisItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form Fields
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [titleCopt, setTitleCopt] = useState('');
  const [category, setCategory] = useState<TaxisCategory>('liturgy');
  const [audience, setAudience] = useState<TaxisAudience>('all');
  const [level, setLevel] = useState<HymnsTaxisLevel | ''>('');
  const [summaryAr, setSummaryAr] = useState('');
  const [summaryEn, setSummaryEn] = useState('');
  const [sections, setSections] = useState<TaxisSection[]>([]);
  const [references, setReferences] = useState<string[]>([]);
  const [documents, setDocuments] = useState<TaxisAttachment[]>([]);
  const [status, setStatus] = useState<TaxisStatus>('draft');
  const [version, setVersion] = useState<number>(1);
  const [history, setHistory] = useState<any[]>([]);

  // Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  // Active Item Permissions
  const activeItem = items.find(i => i.id === selectedItemId);
  const permissions = computeTaxisPermissions(userData, activeItem);

  const loadItems = async () => {
    setLoading(true);
    const res = await getTaxisItems();
    if (res.success && res.items) {
      setItems(res.items);
      if (!selectedItemId && res.items.length > 0) {
        populateForm(res.items[0]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const populateForm = (item: TaxisItem) => {
    setSelectedItemId(item.id);
    setTitleAr(item.titleAr || '');
    setTitleEn(item.titleEn || '');
    setTitleCopt(item.titleCopt || '');
    setCategory(item.category || 'liturgy');
    setAudience(item.audience || 'all');
    setLevel(item.level || '');
    setSummaryAr(item.summaryAr || '');
    setSummaryEn(item.summaryEn || '');
    setSections(item.sections || []);
    setReferences(item.references || []);
    setDocuments(item.documents || []);
    setStatus(item.status || 'draft');
    setVersion(item.version || 1);
    setHistory(item.history || []);
    setHasUnsavedChanges(false);
  };

  const startNewRitual = () => {
    if (hasUnsavedChanges && !window.confirm(isAr ? 'تجاهل التعديلات غير المحفوظة؟' : 'Discard unsaved changes?')) return;
    const newId = `taxis_${Date.now()}`;
    setSelectedItemId(newId);
    setTitleAr('');
    setTitleEn('');
    setTitleCopt('');
    setCategory('liturgy');
    setAudience('all');
    setLevel('');
    setSummaryAr('');
    setSummaryEn('');
    setSections([
      {
        id: 'sec_1',
        order: 1,
        titleAr: 'الخطوة الأولى',
        titleEn: 'Step 1',
        contentAr: '',
        contentEn: '',
        priestAction: '',
        deaconResponse: '',
        rubricNotes: ''
      }
    ]);
    setReferences(['الخلاجي المقدس']);
    setDocuments([]);
    setStatus('draft');
    setVersion(1);
    setHistory([]);
    setHasUnsavedChanges(false);
  };

  const handleFieldChange = (setter: any) => (e: any) => {
    setter(e.target.value);
    setHasUnsavedChanges(true);
  };

  // Section Management
  const addSection = () => {
    const nextOrder = sections.length + 1;
    setSections([
      ...sections,
      {
        id: `sec_${Date.now()}`,
        order: nextOrder,
        titleAr: `الخطوة ${nextOrder}`,
        titleEn: `Step ${nextOrder}`,
        contentAr: '',
        contentEn: '',
        priestAction: '',
        deaconResponse: '',
        rubricNotes: ''
      }
    ]);
    setHasUnsavedChanges(true);
  };

  const updateSection = (idx: number, field: keyof TaxisSection, val: any) => {
    const updated = [...sections];
    updated[idx] = { ...updated[idx], [field]: val };
    setSections(updated);
    setHasUnsavedChanges(true);
  };

  const removeSection = (idx: number) => {
    const updated = sections.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 }));
    setSections(updated);
    setHasUnsavedChanges(true);
  };

  const moveSection = (idx: number, dir: 'up' | 'down') => {
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === sections.length - 1) return;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    const updated = [...sections];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    const reordered = updated.map((s, i) => ({ ...s, order: i + 1 }));
    setSections(reordered);
    setHasUnsavedChanges(true);
  };

  // Document attachments
  const addDocument = () => {
    const docTitle = prompt(isAr ? 'عنوان الملف المرفق (PDF):' : 'Document Title (PDF):');
    if (!docTitle) return;
    const docUrl = prompt(isAr ? 'رابط الملف:' : 'Document URL:', '/uploads/sample_cross_lesson_handout.pdf');
    if (!docUrl) return;

    setDocuments([
      ...documents,
      {
        id: `doc_${Date.now()}`,
        title: docTitle,
        fileUrl: docUrl,
        fileType: 'pdf',
        mimeType: 'application/pdf'
      }
    ]);
    setHasUnsavedChanges(true);
  };

  const removeDocument = (docId: string) => {
    setDocuments(documents.filter(d => d.id !== docId));
    setHasUnsavedChanges(true);
  };

  // Save changes
  const handleSaveDraft = async () => {
    if (!titleAr.trim()) {
      alert(isAr ? 'برجاء كتابة عنوان الطقس بالعربية' : 'Please provide Arabic title');
      return;
    }
    if (!level) {
      setStatusMessage({ text: isAr ? 'اختار مستوى للطقس قبل حفظه.' : 'Select a curriculum level before saving this item.', type: 'error' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const payload: Partial<TaxisItem> & { titleAr: string; titleEn: string } = {
      id: selectedItemId || `taxis_${Date.now()}`,
      titleAr,
      titleEn: titleEn || titleAr,
      titleCopt,
      category,
      ...(level ? { level } : {}),
      audience,
      summaryAr,
      summaryEn,
      sections,
      references,
      documents,
      status
    };

    const res = await saveTaxisItem(payload, userData!);
    setIsSaving(false);
    if (res.success && res.item) {
      setHasUnsavedChanges(false);
      populateForm(res.item);
      setStatusMessage({
        text: isAr ? `تم حفظ مسودة الطقس بأمان (v${res.item.version})` : `Ritual saved safely (v${res.item.version})`,
        type: 'success'
      });
      await loadItems();
    } else {
      setStatusMessage({
        text: res.error || (isAr ? 'تعذر حفظ الطقس' : 'Failed to save ritual'),
        type: 'error'
      });
    }
  };

  // Workflow Action (Submit for review, Approve, Publish, Unpublish, Restore)
  const handleAction = async (action: 'SUBMIT_REVIEW' | 'APPROVE' | 'PUBLISH' | 'UNPUBLISH' | 'RESTORE', vNum?: number) => {
    if (!selectedItemId) return;
    setIsSaving(true);
    setStatusMessage(null);

    const res = await executeTaxisStatusAction(selectedItemId, action, { restoreVersion: vNum });
    setIsSaving(false);

    if (res.success && res.item) {
      populateForm(res.item);
      const actionLabels: Record<string, string> = {
        SUBMIT_REVIEW: isAr ? 'تم إرسال الطقس للمراجعة والاعتماد الكنسي.' : 'Ritual submitted for review.',
        APPROVE: isAr ? 'تم اعتماد مراجعة الطقس بنجاح (جاهز للنشر).' : 'Ritual approved for publishing.',
        PUBLISH: isAr ? 'تم نشر الطقس رسمياً للرعية والشمامسة!' : 'Ritual published successfully!',
        UNPUBLISH: isAr ? 'تم إلغاء نشر الطقس وإعادته لمسودة خاصة.' : 'Ritual unpublished to draft.',
        RESTORE: isAr ? `تم استرجاع النسخة ${vNum} بنجاح.` : `Restored version ${vNum}.`
      };
      setStatusMessage({
        text: actionLabels[action] || 'Action completed',
        type: 'success'
      });
      await loadItems();
    } else {
      setStatusMessage({
        text: res.error || 'Failed to execute status action',
        type: 'error'
      });
    }
  };

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#2B1B17] via-[#3E2723] to-[#795548] text-white p-5 md:p-6 rounded-3xl shadow-sm border border-amber-600/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-400/20 text-amber-300 rounded-2xl border border-amber-300/30">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black">
                {isAr ? 'استوديو تأليف ونشر الطقوس الكنسية (التاكسيس)' : 'Coptic Rituals & Taxis Publishing'}
              </h2>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                status === 'published'
                  ? 'bg-emerald-500 text-white'
                  : status === 'under_review'
                  ? 'bg-blue-500 text-white'
                  : status === 'approved'
                  ? 'bg-purple-500 text-white'
                  : 'bg-amber-500 text-amber-950'
              }`}>
                {status === 'published' ? (isAr ? 'منشور للرعية' : 'Published')
                  : status === 'under_review' ? (isAr ? 'قيد المراجعة' : 'Under Review')
                  : status === 'approved' ? (isAr ? 'معتمد (بانتظار النشر)' : 'Approved')
                  : (isAr ? 'مسودة' : 'Draft')}
              </span>
              <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full">
                v{version}
              </span>
            </div>
            <p className="text-xs text-stone-200 mt-0.5 font-bold">
              {isAr
                ? 'إدارة وترتيب الصلوات الطقسية، أفعال الكاهن، مردات الشماس، الإرشادات الطقسية، والمصادر المعتمدة.'
                : 'Ordered liturgical sections, priest actions, deacon responses, rubric notes, and source documents.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={startNewRitual}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} />
            <span>{isAr ? 'طقس جديد' : 'New Ritual'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-amber-400/30 cursor-pointer"
          >
            <Eye size={15} />
            <span>{isAr ? 'معاينة' : 'Preview'}</span>
          </button>

          {permissions.canEdit && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="px-3.5 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save size={15} />
              <span>{isAr ? 'حفظ مسودة' : 'Save Draft'}</span>
            </button>
          )}

          {/* Workflow Transitions */}
          {status === 'draft' && permissions.canSubmitReview && (
            <button
              type="button"
              onClick={() => handleAction('SUBMIT_REVIEW')}
              disabled={isSaving}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Send size={14} />
              <span>{isAr ? 'إرسال للمراجعة' : 'Submit Review'}</span>
            </button>
          )}

          {status === 'under_review' && permissions.canApprove && (
            <button
              type="button"
              onClick={() => handleAction('APPROVE')}
              disabled={isSaving}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ShieldCheck size={14} />
              <span>{isAr ? 'اعتماد المراجعة' : 'Approve Review'}</span>
            </button>
          )}

          {status !== 'published' && permissions.canPublish && (
            <button
              type="button"
              onClick={() => handleAction('PUBLISH')}
              disabled={isSaving}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-105 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={15} />
              <span>{isAr ? 'نشر الطقس للرعية' : 'Publish to Congregation'}</span>
            </button>
          )}

          {status === 'published' && permissions.canUnpublish && (
            <button
              type="button"
              onClick={() => handleAction('UNPUBLISH')}
              disabled={isSaving}
              className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>{isAr ? 'إلغاء النشر' : 'Unpublish'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Unsaved Changes Banner */}
      {hasUnsavedChanges && (
        <div className="bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 p-3 rounded-2xl flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <span>{isAr ? 'لديك تعديلات غير محفوظة في نص الطقس.' : 'You have unsaved changes.'}</span>
          </div>
          <button
            onClick={handleSaveDraft}
            className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[11px] font-black cursor-pointer"
          >
            {isAr ? 'حفظ الآن' : 'Save Now'}
          </button>
        </div>
      )}

      {/* Status Alert */}
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

      {/* Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Taxis Library */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-[var(--mousa-border-sand)] space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-[var(--mousa-teal-deep)] dark:text-amber-300 flex items-center gap-1.5">
              <FolderOpen size={16} />
              <span>{isAr ? 'الطقوس المسجلة' : 'Rituals Library'}</span>
            </h3>
            <span className="text-[11px] font-bold text-stone-500">
              ({items.length})
            </span>
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {items.map((item) => {
              const isSelected = item.id === selectedItemId;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (hasUnsavedChanges && !window.confirm(isAr ? 'تجاهل التعديلات؟' : 'Discard changes?')) return;
                    populateForm(item);
                  }}
                  className={`p-3 rounded-2xl text-xs cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-[var(--mousa-teal)] text-white border-[var(--mousa-teal)] shadow-xs'
                      : 'bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span className="truncate max-w-[170px]">{item.titleAr || item.titleEn}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                      item.status === 'published' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 text-amber-900 dark:bg-stone-700 dark:text-amber-300'
                    }`}>
                      {item.status === 'published' ? (isAr ? 'منشور' : 'Pub') : (isAr ? 'مسودة' : 'Draft')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] opacity-80">
                    <span>{item.category}</span>
                    <span>{item.sections?.length || 0} {isAr ? 'خطوات' : 'steps'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Taxis Form */}
        <div className="lg:col-span-3 space-y-6">
          {/* Metadata Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-[var(--mousa-border-sand)] space-y-4 shadow-xs">
            <h3 className="font-black text-sm text-[var(--mousa-teal-deep)] dark:text-amber-300 flex items-center gap-2">
              <FileText size={16} />
              <span>{isAr ? '١. بيانات الطقس الكنسي والجمهور المستهدف' : '1. Ritual Metadata & Audience'}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {isAr ? 'عنوان الطقس بالعربية *' : 'Title (Arabic) *'}
                </label>
                <input
                  type="text"
                  value={titleAr}
                  onChange={handleFieldChange(setTitleAr)}
                  placeholder="مثال: طقس رفع بخور عشية وباكر"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {isAr ? 'عنوان الطقس بالقبطية' : 'Title (Coptic)'}
                </label>
                <input
                  type="text"
                  value={titleCopt}
                  onChange={handleFieldChange(setTitleCopt)}
                  placeholder="مثال: Ⲡⲓⲧⲁⲝⲓⲥ ⲛ̀ⲧⲉ ⲡⲓⲟⲩⲱϣⲧ..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-serif"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {isAr ? 'عنوان الطقس بالإنجليزية' : 'Title (English)'}
                </label>
                <input
                  type="text"
                  value={titleEn}
                  onChange={handleFieldChange(setTitleEn)}
                  placeholder="e.g. Offering of Incense"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {isAr ? 'تصنيف الطقس الكنسي' : 'Category'}
                </label>
                <select
                  value={category}
                  onChange={handleFieldChange(setCategory)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                >
                  <option value="liturgy">{isAr ? 'القداس الإلهي والأنافورا (Liturgy)' : 'Liturgy'}</option>
                  <option value="incense">{isAr ? 'رفع بخور عشية وباكر (Incense)' : 'Incense'}</option>
                  <option value="sacraments">{isAr ? 'الأسرار الكنسية السبعة (Sacraments)' : 'Sacraments'}</option>
                  <option value="feasts">{isAr ? 'الأعياد السيدية والمناسبات (Feasts)' : 'Feasts'}</option>
                  <option value="pascha">{isAr ? 'أسبوع الآلام والبصخة المقدسة (Pascha)' : 'Pascha'}</option>
                  <option value="occasions">{isAr ? 'مناسبات خاصة وتدشين (Occasions)' : 'Occasions'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  {isAr ? 'الجمهور المصرّح له بالعرض (Audience)' : 'Authorized Audience'}
                </label>
                <select
                  value={audience}
                  onChange={handleFieldChange(setAudience)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                >
                  <option value="all">{isAr ? 'كافة الشعب والطلاب (General Parish)' : 'All Congregation'}</option>
                  <option value="deacons">{isAr ? 'مدرسة الشمامسة والمرتلين (Deacons)' : 'Deacons'}</option>
                  <option value="preparatory">{isAr ? 'مرحلة إعدادي فما فوق (Preparatory+)' : 'Preparatory+'}</option>
                  <option value="servants">{isAr ? 'الخدام والمعلمون فقط (Servants Only)' : 'Servants Only'}</option>
                  <option value="clergy">{isAr ? 'الكهنة والإكليروس (Clergy Only)' : 'Clergy Only'}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                {isAr ? 'مستوى المنهج المشترك *' : 'Shared curriculum level *'}
              </label>
              <select
                required={!activeItem}
                value={level}
                onChange={event => {
                  const parsedLevel = parseHymnsTaxisLevel(event.target.value);
                  setLevel(parsedLevel || '');
                  setHasUnsavedChanges(true);
                }}
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-white"
              >
                <option value="">{isAr ? 'اختار مستوى' : 'Select level'}</option>
                <option value={1}>{isAr ? 'المستوى الأول' : 'Level 1'}</option>
                <option value={2}>{isAr ? 'المستوى الثاني' : 'Level 2'}</option>
                <option value={3}>{isAr ? 'المستوى الثالث' : 'Level 3'}</option>
              </select>
              {!level && activeItem && (
                <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                  {isAr ? 'الطقس ده لسه مش متصنف لمستوى؛ الطلاب مش هيشوفوه لحد ما تختار مستواه.' : 'This item is not assigned to a level, so students will not see it until a level is selected.'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                {isAr ? 'مقدمة وملخص الطقس' : 'Liturgical Summary'}
              </label>
              <textarea
                rows={2}
                value={summaryAr}
                onChange={handleFieldChange(setSummaryAr)}
                placeholder="شرح موجز للطقس وأهميته الروحية والليتورجية..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
              />
            </div>
          </div>

          {/* Ordered Liturgical Sections */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-[var(--mousa-border-sand)] space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm text-[var(--mousa-teal-deep)] dark:text-amber-300 flex items-center gap-2">
                  <Layers size={16} />
                  <span>{isAr ? '٢. خطوات وترتيب الطقس (أفعال الكاهن، مردات الشماس، الإرشادات)' : '2. Ordered Liturgical Steps & Rubrics'}</span>
                </h3>
                <p className="text-[11px] text-stone-500 font-bold mt-0.5">
                  {isAr ? 'ترتيب دقيق للخطوات مع تحديد حركات الكاهن ومردات الشماس المناسبة لكل خطوة.' : 'Order of steps with priest actions and deacon responses.'}
                </p>
              </div>
              <button
                type="button"
                onClick={addSection}
                className="px-3 py-1.5 bg-[var(--mousa-teal)] text-white text-xs font-black rounded-xl hover:opacity-90 flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} />
                <span>{isAr ? 'إضافة خطوة' : 'Add Step'}</span>
              </button>
            </div>

            <div className="space-y-4">
              {sections.map((sec, idx) => (
                <div
                  key={sec.id}
                  className="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center">
                        {sec.order}
                      </span>
                      <input
                        type="text"
                        value={sec.titleAr}
                        onChange={(e) => updateSection(idx, 'titleAr', e.target.value)}
                        placeholder="عنوان الخطوة بالعربية..."
                        className="font-bold text-xs px-2.5 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveSection(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-stone-500 hover:text-stone-800 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(idx, 'down')}
                        disabled={idx === sections.length - 1}
                        className="p-1 text-stone-500 hover:text-stone-800 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSection(idx)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-0.5">
                      {isAr ? 'شرح وترتيب الخطوة الكنسية:' : 'Step description:'}
                    </label>
                    <textarea
                      rows={2}
                      value={sec.contentAr}
                      onChange={(e) => updateSection(idx, 'contentAr', e.target.value)}
                      placeholder="يقف الكاهن أمام الهيكل خاشعاً، ويفتح الستر قائلاً صلاة الشكر..."
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-black text-amber-800 dark:text-amber-400 mb-0.5">
                        ✝️ {isAr ? 'حركات وأفعال الكاهن (Priest Actions):' : 'Priest Action:'}
                      </label>
                      <input
                        type="text"
                        value={sec.priestAction || ''}
                        onChange={(e) => updateSection(idx, 'priestAction', e.target.value)}
                        placeholder="يسجد أمام باب الهيكل، يضع البخور ۳ دفعات..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-stone-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-blue-800 dark:text-blue-400 mb-0.5">
                        🔔 {isAr ? 'مردات وتنبيهات الشماس (Deacon Response):' : 'Deacon Response:'}
                      </label>
                      <input
                        type="text"
                        value={sec.deaconResponse || ''}
                        onChange={(e) => updateSection(idx, 'deaconResponse', e.target.value)}
                        placeholder='مرد الشماس: "صلوا من أجل صلاة الشكر المقدسة..."'
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-blue-300 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 text-stone-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 mb-0.5">
                      📜 {isAr ? 'إرشادات طقسية وتنبيهات إضافية (Rubric Notes):' : 'Rubric Notes:'}
                    </label>
                    <input
                      type="text"
                      value={sec.rubricNotes || ''}
                      onChange={(e) => updateSection(idx, 'rubricNotes', e.target.value)}
                      placeholder="تنبيه: لا تقال أوشية المسافرين في أيام الآحاد والأعياد السيدية..."
                      className="w-full px-2.5 py-1 text-[11px] rounded-lg border border-stone-200 dark:border-stone-700 bg-white/70 dark:bg-stone-800/70 text-stone-600 dark:text-stone-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* References & Attachments */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-[var(--mousa-border-sand)] space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-[var(--mousa-teal-deep)] dark:text-amber-300 flex items-center gap-2">
                <FileText size={16} />
                <span>{isAr ? '٣. المراجع المعتمدة والملفات المرفقة (PDF)' : '3. References & PDF Handouts'}</span>
              </h3>
              <button
                type="button"
                onClick={addDocument}
                className="px-3 py-1 bg-amber-500/20 text-amber-900 dark:text-amber-300 text-xs font-bold rounded-xl border border-amber-300/40 hover:bg-amber-500/30 cursor-pointer"
              >
                + {isAr ? 'إرفاق ملف' : 'Attach PDF'}
              </button>
            </div>

            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="p-2.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl flex items-center justify-between text-xs border border-stone-200 dark:border-stone-700">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-amber-600" />
                    <span className="font-bold text-stone-800 dark:text-stone-200">{doc.title}</span>
                    <span className="text-[10px] text-stone-400 font-mono">({doc.fileUrl})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDocument(doc.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Version History & Restoration */}
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
                        v{snap.version} ({snap.status})
                      </span>
                      <span className="text-stone-400 mx-2">•</span>
                      <span className="font-bold text-stone-700 dark:text-stone-300">{snap.titleAr}</span>
                      <span className="text-[10px] text-stone-400 block mt-0.5">
                        {snap.savedAt ? new Date(snap.savedAt).toLocaleString(isAr ? 'ar-EG' : 'en-US') : ''} • {snap.savedByName}
                      </span>
                    </div>
                    {permissions.canRestore && (
                      <button
                        type="button"
                        onClick={() => handleAction('RESTORE', snap.version)}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-black cursor-pointer shadow-xs"
                      >
                        {isAr ? 'استرجاع النسخة' : 'Restore'}
                      </button>
                    )}
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-4 border-2 border-amber-500/40 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs px-2.5 py-0.5 bg-amber-400/20 text-amber-900 dark:text-amber-300 rounded-full font-bold">
                {isAr ? 'معاينة الطقس في التطبيق' : 'Ritual Preview'}
              </span>
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
                {titleAr}
              </h2>
              {titleCopt && (
                <p className="text-lg font-serif text-amber-800 dark:text-amber-400">
                  {titleCopt}
                </p>
              )}
              {summaryAr && (
                <p className="text-xs text-stone-600 dark:text-stone-300 max-w-xl mx-auto">
                  {summaryAr}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {sections.map((s, idx) => (
                <div key={idx} className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-2">
                  <div className="flex items-center gap-2 font-black text-sm text-[var(--mousa-teal-deep)] dark:text-amber-300">
                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center">
                      {s.order}
                    </span>
                    <span>{s.titleAr}</span>
                  </div>
                  {s.contentAr && (
                    <p className="text-xs text-stone-700 dark:text-stone-200 leading-relaxed">
                      {s.contentAr}
                    </p>
                  )}
                  {s.priestAction && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-xs border border-amber-200 dark:border-amber-900/50">
                      <span className="font-black text-amber-900 dark:text-amber-300">✝️ فعل الكاهن: </span>
                      <span className="text-stone-800 dark:text-stone-200">{s.priestAction}</span>
                    </div>
                  )}
                  {s.deaconResponse && (
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-xs border border-blue-200 dark:border-blue-900/50">
                      <span className="font-black text-blue-900 dark:text-blue-300">🔔 مرد الشماس: </span>
                      <span className="text-stone-800 dark:text-stone-200">{s.deaconResponse}</span>
                    </div>
                  )}
                  {s.rubricNotes && (
                    <div className="text-[11px] text-stone-500 italic">
                      📜 إرشاد طقسي: {s.rubricNotes}
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
