import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, AlertCircle, BookOpen, Lock, Loader2 } from 'lucide-react';
import { Lesson, QuizQuestion, Language, QuizDraft } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { getEditableLessonVersion, updateLessonDraft, createLessonDraft } from '../../lib/lessonAuthoringService';

interface LessonEditModalProps {
  lesson: Lesson;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Partial<Lesson>) => void;
  lang: Language;
  isNew?: boolean;
}

export function LessonEditModal({ lesson, isOpen, onClose, onSave, lang, isNew = false }: LessonEditModalProps) {
  if (!isOpen) return null;

  const { userData, isGuest } = useAuth();
  const isOnlineAuth = !isGuest && Boolean(userData) && isSupabaseConfigured;

  const [title, setTitle] = useState(lesson.title || '');
  const [summary, setSummary] = useState(lesson.summary || '');
  const [pointsAvailable, setPointsAvailable] = useState(lesson.pointsAvailable || 150);
  const [status, setStatus] = useState(lesson.status || 'draft');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(() => {
    if (lesson.quiz && lesson.quiz.length > 0) return lesson.quiz;
    return [
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
    ];
  });

  const [editableVersionId, setEditableVersionId] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // For online lessons, fetch the authorized editable draft version if not a brand new lesson
  useEffect(() => {
    let isMounted = true;
    if (isOnlineAuth && lesson.id && !isNew) {
      setLoadingDraft(true);
      setErrorMsg(null);
      getEditableLessonVersion(lesson.id)
        .then((res) => {
          if (!isMounted) return;
          setLoadingDraft(false);
          if (res.error) {
            setErrorMsg(res.error.message);
          } else if (res.data) {
            setEditableVersionId(res.data.id);
            if (res.data.summaryEn) {
              setSummary(res.data.summaryEn);
            }
            if (res.data.quizDraft?.questions && res.data.quizDraft.questions.length > 0) {
              const adaptedQuestions: QuizQuestion[] = res.data.quizDraft.questions.map((q) => ({
                question: q.questionEn,
                options: q.optionsEn,
                correctIndex: q.correctIndex,
                type: 'multiple_choice'
              }));
              setQuizQuestions(adaptedQuestions);
            }
          }
        })
        .catch((err) => {
          if (isMounted) {
            setLoadingDraft(false);
            setErrorMsg(err?.message || 'Failed to load editable draft');
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [lesson.id, isOnlineAuth, isNew]);

  const handleAddQuestion = () => {
    setQuizQuestions([
      ...quizQuestions,
      {
        question: lang === 'ar' ? 'سؤال جديد' : 'New Question',
        options: [
          lang === 'ar' ? 'الإجابة الأولى (صحيحة)' : 'Option 1 (Correct)',
          lang === 'ar' ? 'الإجابة الثانية' : 'Option 2',
          lang === 'ar' ? 'الإجابة الثالثة' : 'Option 3',
          lang === 'ar' ? 'الإجابة الرابعة' : 'Option 4'
        ],
        correctIndex: 0
      }
    ]);
  };

  const handleQuestionChange = (qIndex: number, newText: string) => {
    const updated = [...quizQuestions];
    updated[qIndex].question = newText;
    setQuizQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, newOption: string) => {
    const updated = [...quizQuestions];
    updated[qIndex].options[oIndex] = newOption;
    setQuizQuestions(updated);
  };

  const handleCorrectIndexChange = (qIndex: number, correctIdx: number) => {
    const updated = [...quizQuestions];
    updated[qIndex].correctIndex = correctIdx;
    setQuizQuestions(updated);
  };

  const handleDeleteQuestion = (qIndex: number) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== qIndex));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert(lang === 'ar' ? 'يرجى إدخال عنوان الدرس' : 'Please provide a lesson title');
      return;
    }

    // Online authenticated authoring path
    if (isOnlineAuth) {
      setSaving(true);
      setErrorMsg(null);

      const quizDraft: QuizDraft = {
        id: `quiz-${editableVersionId || lesson.id}`,
        lessonId: lesson.id,
        titleEn: `Quiz: ${title}`,
        titleAr: `تقييم: ${title}`,
        instructionsEn: 'Complete the quiz to test your comprehension.',
        instructionsAr: 'أكمل التقييم لاختبار فهمك لمحتوى الدرس.',
        status: 'DRAFT',
        questions: quizQuestions.map((q, idx) => ({
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

      let result;
      if (isNew) {
        result = await createLessonDraft({
          titleEn: title.trim(),
          titleAr: title.trim(),
          summaryEn: summary.trim(),
          summaryAr: summary.trim(),
          category: 'bible',
          gradeLevel: lesson.grade || '4th Grade',
          quizDraft
        });
      } else {
        result = await updateLessonDraft(lesson.id, {
          versionId: editableVersionId || undefined,
          titleEn: title.trim(),
          summaryEn: summary.trim(),
          quizDraft
        });
      }

      setSaving(false);

      if (result.error) {
        setErrorMsg(result.error.message);
        return;
      }

      // Safe update to parent state without mutating publication fields
      const createdLessonId = (result.data && 'lesson' in result.data) ? (result.data as any).lesson.id : lesson.id;
      onSave({
        id: createdLessonId,
        title: title.trim(),
        summary: summary.trim(),
        quiz: quizQuestions,
        status: 'draft' // Safe draft status for online curriculum
      });
      onClose();
      return;
    }

    // Legacy Demo / Guest / Offline mode authoring (untouched)
    onSave({
      title,
      summary,
      pointsAvailable: Number(pointsAvailable) || 150,
      status: status as any,
      quiz: quizQuestions
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto text-start my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-church-cream)] dark:bg-slate-800 text-[var(--color-church-blue)] flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--color-church-blue)] dark:text-white">
                {isNew 
                  ? (lang === 'ar' ? 'إعداد درس جديد (مسار يدوي مباشر)' : 'Create New Lesson (Direct Manual)')
                  : (lang === 'ar' ? 'تعديل مسودة الدرس وإدارتها' : 'Edit & Manage Lesson Draft')}
              </h3>
              <p className="text-xs text-gray-500">
                {isOnlineAuth 
                  ? (lang === 'ar' ? 'مسودة الإصدار المحمية • تعديل آمن وحفظ في Supabase' : 'Versioned Draft Foundation • Safe Supabase Storage')
                  : (lang === 'ar' ? 'صلاحيات خادم مدارس الأحد' : 'Servant permissions')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Loading Draft Indicator */}
        {loadingDraft && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2 font-medium">
            <Loader2 size={16} className="animate-spin shrink-0" />
            <span>{lang === 'ar' ? 'جاري تحميل مسودة الإصدار القابلة للتعديل...' : 'Loading authorized editable draft version...'}</span>
          </div>
        )}

        {/* Error notification */}
        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2 font-bold">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                {lang === 'ar' ? 'عنوان الدرس (بيانات المسودة)' : 'Lesson Title (Draft Metadata)'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full text-sm font-semibold px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-church-gold)] text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                {lang === 'ar' ? 'حالة النشر' : 'Publication Status'}
              </label>
              {isOnlineAuth ? (
                <div>
                  <div className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Lock size={12} className="shrink-0" />
                    <span>{lang === 'ar' ? 'مسودة قيد الإعداد 📝' : 'Draft 📝'}</span>
                  </div>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block mt-1">
                    {lang === 'ar' ? 'النشر محمي بنظام الاعتماد' : 'Publication protected'}
                  </span>
                </div>
              ) : (
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full text-sm font-semibold px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-church-gold)] text-gray-900 dark:text-white"
                >
                  <option value="published">{lang === 'ar' ? 'منشور للطلاب ✅' : 'Published ✅'}</option>
                  <option value="draft">{lang === 'ar' ? 'مسودة قيد الإعداد 📝' : 'Draft 📝'}</option>
                </select>
              )}
            </div>
          </div>

          {/* Points Available */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              {lang === 'ar' ? 'النقاط الممنوحة' : 'Points Available'}
            </label>
            {isOnlineAuth ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={100}
                  disabled
                  className="w-36 text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-500 cursor-not-allowed"
                />
                <span className="text-[11px] text-gray-400 italic">
                  {lang === 'ar' ? '(محددة بنظام الاعتماد الرسمي)' : '(Governed by publication rules)'}
                </span>
              </div>
            ) : (
              <input
                type="number"
                min={10}
                max={500}
                step={10}
                value={pointsAvailable}
                onChange={(e) => setPointsAvailable(Number(e.target.value))}
                className="w-36 text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 text-gray-900 dark:text-white"
              />
            )}
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              {lang === 'ar' ? 'ملخص ومحتوى الإصدار (محتوى الدرس)' : 'Version Summary & Content (Curriculum)'}
            </label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-church-gold)] text-gray-900 dark:text-white leading-relaxed"
            />
          </div>

          {/* Quizzes & Questions */}
          <div className="space-y-4 pt-3 border-t border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                {lang === 'ar' ? `أسئلة الاختبار (${quizQuestions.length})` : `Quiz Questions (${quizQuestions.length})`}
              </span>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 text-[var(--color-church-blue)] hover:bg-blue-100 flex items-center gap-1 transition-colors"
              >
                <Plus size={14} />
                <span>{lang === 'ar' ? 'إضافة سؤال' : 'Add Question'}</span>
              </button>
            </div>

            <div className="space-y-4">
              {quizQuestions.map((q, qIdx) => (
                <div key={qIdx} className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="w-6 h-6 rounded-full bg-[var(--color-church-blue)] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {qIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => handleQuestionChange(qIdx, e.target.value)}
                      placeholder={lang === 'ar' ? 'نص السؤال...' : 'Question prompt...'}
                      className="flex-1 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(qIdx)}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      title={lang === 'ar' ? 'حذف السؤال' : 'Delete Question'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${qIdx}`}
                          checked={q.correctIndex === oIdx}
                          onChange={() => handleCorrectIndexChange(qIdx, oIdx)}
                          title={lang === 'ar' ? 'حدد كإجابة صحيحة' : 'Mark as correct answer'}
                          className="accent-[var(--color-church-gold)] shrink-0 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                          placeholder={`Option ${oIdx + 1}`}
                          className={`flex-1 text-xs px-2.5 py-1.5 rounded-lg border ${
                            q.correctIndex === oIdx 
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 font-bold' 
                              : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 px-4 rounded-xl bg-[var(--color-church-blue)] hover:opacity-95 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{saving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ مسودة الدرس' : 'Save Lesson Draft')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm font-bold transition-all cursor-pointer"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
