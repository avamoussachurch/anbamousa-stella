import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Award, 
  ChevronRight, 
  Filter, 
  Search, 
  Star, 
  Music, 
  Scroll, 
  Heart, 
  MessageSquareQuote,
  Sparkles,
  ChevronDown,
  Plus,
  QrCode,
  Smartphone,
  Send,
  Trash2,
  Check,
  HeartHandshake,
  ShieldCheck,
  AlertTriangle,
  Activity,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { ChildProfile, ChildLessonProgress, LessonCategory } from '../../types';
import { getChildLearningReview } from '../../lib/parentChildService';
import type { StudentLearningReviewData } from '../../lib/classRosterService';

interface ChildrenLessonsProgressProps {
  childrenProfiles: ChildProfile[];
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
  onOpenAddChildModal?: () => void;
  onOpenQrScanner?: () => void;
  onUnlinkChild?: (childId: string) => void;
  onSetScreenTimeLimit?: (childId: string, limitMinutes: number) => void;
  onSendBlessing?: (childId: string, message: string) => void;
  lang: 'en' | 'ar';
}

export function ChildrenLessonsProgress({
  childrenProfiles,
  selectedChildId,
  onSelectChild,
  onOpenAddChildModal,
  onOpenQrScanner,
  onUnlinkChild,
  onSetScreenTimeLimit,
  onSendBlessing,
  lang
}: ChildrenLessonsProgressProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);

  // Blessing modal state
  const [showBlessingInput, setShowBlessingInput] = useState(false);
  const [blessingText, setBlessingText] = useState('');
  const [blessingSuccess, setBlessingSuccess] = useState(false);

  // Screen time limit dropdown / selector
  const [showLimitMenu, setShowLimitMenu] = useState(false);

  const selectedChild = childrenProfiles.find(c => c.id === selectedChildId) || childrenProfiles[0];

  // Authoritative server-side learning review
  const [reviewData, setReviewData] = useState<StudentLearningReviewData | null>(null);
  const [reviewLoading, setReviewLoading] = useState<boolean>(true);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fetchReview = (studentId: string) => {
    if (!studentId) return;
    setReviewLoading(true);
    setReviewError(null);
    setReviewData(null);
    getChildLearningReview(studentId)
      .then(({ data, error }) => {
        if (error) {
          setReviewError(lang === 'ar'
            ? 'تعذر تحميل سجل التقدم المحفوظ لهذا الطفل. حاول مرة أخرى.'
            : 'Unable to load this child’s saved learning progress. Please try again.');
        } else if (data) {
          setReviewData(data);
        }
      })
      .catch(() => {
        setReviewError(lang === 'ar'
          ? 'حدث خطأ أثناء تحميل سجل التقدم. حاول مرة أخرى.'
          : 'An error occurred while loading learning progress. Please try again.');
      })
      .finally(() => {
        setReviewLoading(false);
      });
  };

  useEffect(() => {
    if (selectedChild?.id) {
      fetchReview(selectedChild.id);
    }
  }, [selectedChild?.id, lang]);

  // Category labels and icons
  const categoryConfig: Record<LessonCategory, { en: string; ar: string; icon: React.ElementType; color: string; bg: string }> = {
    bible_stories: {
      en: 'Bible Stories',
      ar: 'قصص الكتاب المقدس',
      icon: BookOpen,
      color: 'text-amber-700',
      bg: 'bg-amber-50'
    },
    hymns_rituals: {
      en: 'Coptic Hymns & Rituals',
      ar: 'الألحان والطقوس القبطية',
      icon: Music,
      color: 'text-[var(--color-church-blue)]',
      bg: 'bg-blue-50'
    },
    church_history: {
      en: 'Church History & Saints',
      ar: 'تاريخ الكنيسة والسنكسار',
      icon: Scroll,
      color: 'text-amber-800',
      bg: 'bg-amber-50'
    },
    ethics_prayers: {
      en: 'Christian Virtues & Agpeya',
      ar: 'الفضائل والأجبية المقدسة',
      icon: Heart,
      color: 'text-[var(--color-church-burgundy)]',
      bg: 'bg-red-50'
    }
  };

  // Filter lessons
  const categoryForReview: Record<string, LessonCategory> = {
    bible: 'bible_stories',
    hymns: 'hymns_rituals',
    history: 'church_history',
    virtues: 'ethics_prayers',
    bible_stories: 'bible_stories',
    hymns_rituals: 'hymns_rituals',
    church_history: 'church_history',
    ethics_prayers: 'ethics_prayers'
  };
  const lessonsList: ChildLessonProgress[] = (reviewData?.lessons || []).map(lesson => ({
    lessonId: lesson.lessonId,
    lessonTitleEn: lesson.title,
    lessonTitleAr: lesson.titleAr || lesson.title,
    category: categoryForReview[lesson.category] || 'bible_stories',
    dateCompleted: lesson.lastActivityAt || undefined,
    status: lesson.progressStatus === 'COMPLETED' ? 'completed' : 'in_progress',
    pointsEarned: lesson.pointsEarned || 0,
    pointsMax: 0,
    memoryVerseEn: '',
    memoryVerseAr: ''
  }));
  const filteredLessons = lessonsList.filter(lesson => {
    const matchesCategory = selectedCategory === 'all' || lesson.category === selectedCategory;
    const matchesSearch = searchQuery.trim() === '' || 
      lesson.lessonTitleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.lessonTitleAr.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  // Calculate stats
  const completedCount = lessonsList.filter(l => l.status === 'completed').length;
  const inProgressCount = lessonsList.filter(l => l.status === 'in_progress').length;
  const completionPercentage = lessonsList.length ? Math.round((completedCount / lessonsList.length) * 100) : 0;

  // Category completion rates
  const categoriesList: LessonCategory[] = ['bible_stories', 'hymns_rituals', 'church_history', 'ethics_prayers'];
  const categoryStats = categoriesList.map(cat => {
    const catLessons = lessonsList.filter(l => l.category === cat);
    const catCompleted = catLessons.filter(l => l.status === 'completed').length;
    const percent = catLessons.length > 0 ? Math.round((catCompleted / catLessons.length) * 100) : 0;
    return {
      category: cat,
      config: categoryConfig[cat],
      total: catLessons.length,
      completed: catCompleted,
      percent
    };
  });

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Child Selector Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[var(--color-church-cream-dark)] shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 flex-1">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 shrink-0 px-1">
            {lang === 'ar' ? 'الأبناء:' : 'Children:'}
          </span>
          {childrenProfiles.map(child => {
            const isSelected = child.id === selectedChild.id;
            return (
              <button
                key={child.id}
                onClick={() => {
                  onSelectChild(child.id);
                  setExpandedLessonId(null);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected 
                    ? 'bg-[var(--color-church-blue)] text-white shadow-sm' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <img 
                  src={child.avatarUrl} 
                  alt={child.nameEn} 
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white object-cover border border-white/20"
                />
                <span>{lang === 'ar' ? child.nameAr : child.nameEn}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {lang === 'ar' ? child.gradeAr.split(' ')[1] || child.gradeAr : child.gradeEn.split(' ')[0]}
                </span>
              </button>
            );
          })}

          {/* Add / Link Child Button */}
          {onOpenAddChildModal && (
            <button
              type="button"
              onClick={onOpenAddChildModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-all shrink-0 cursor-pointer shadow-2xs"
            >
              <Plus size={14} className="text-amber-700" />
              <span>{lang === 'ar' ? '+ ربط طفل' : '+ Link Child'}</span>
            </button>
          )}

          {/* Scan QR Button */}
          {onOpenQrScanner && (
            <button
              type="button"
              onClick={onOpenQrScanner}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-[var(--color-church-blue)] border border-blue-200 transition-all shrink-0 cursor-pointer shadow-2xs"
            >
              <QrCode size={14} className="text-[var(--color-church-blue)]" />
              <span>{lang === 'ar' ? 'مسح كود QR' : 'Scan QR'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-2 text-xs font-semibold text-gray-500">
          {selectedChild.pointsKnown && <span className="flex items-center gap-1 text-[var(--color-church-gold-dark)]">
            <Star size={14} className="fill-current" />
            <strong>{selectedChild.points}</strong> {lang === 'ar' ? 'نقطة' : 'pts'}
          </span>}
        </div>
      </div>

      {/* Main Visual Progress Overview Card */}
      {reviewLoading && (
        <div className="mousa-card-sand p-6 text-center text-[var(--text-secondary)]" role="status">
          {lang === 'ar' ? 'جارٍ تحميل سجل التعلّم...' : 'Loading learning records...'}
        </div>
      )}
      {reviewError && (
        <div className="mousa-card-sand p-6 text-center" role="alert">
          <p className="text-[var(--feedback-error)] mb-3">{reviewError}</p>
          <button onClick={() => fetchReview(selectedChild.id)} className="mousa-btn-quest px-4 py-2 rounded-xl">
            {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      )}
      {reviewData && lessonsList.length === 0 && (
        <div className="mousa-card-sand p-6 text-center text-[var(--text-secondary)]">
          {lang === 'ar' ? 'لا توجد سجلات دروس أو اختبارات لهذا الطفل حتى الآن.' : 'No lesson or quiz activity has been recorded for this child yet.'}
        </div>
      )}
      <div hidden={!reviewData || reviewLoading || Boolean(reviewError) || lessonsList.length === 0} className="bg-white rounded-3xl p-6 md:p-8 border border-[var(--color-church-cream-dark)] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-church-cream)] border border-[var(--color-church-gold)]/20 p-1 flex items-center justify-center shrink-0">
              <img 
                src={selectedChild.avatarUrl} 
                alt={selectedChild.nameEn}
                className="w-full h-full rounded-xl object-cover" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl md:text-2xl font-bold text-[var(--color-church-blue)]">
                  {lang === 'ar' ? selectedChild.nameAr : selectedChild.nameEn}
                </h3>
                {selectedChild.rank > 0 && <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded-md">
                  {lang === 'ar' ? `المركز #${selectedChild.rank}` : `Rank #${selectedChild.rank}`}
                </span>}
                {selectedChild.linkCode && (
                  <span className="font-mono text-[11px] bg-blue-50 text-[var(--color-church-blue)] border border-blue-200 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                    <QrCode size={11} />
                    <span>{selectedChild.linkCode}</span>
                  </span>
                )}
                {selectedChild.isRealAccount ? (
                  <span className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                    <Sparkles size={11} className="text-emerald-600" />
                    <span>{lang === 'ar' ? 'متزامن حياً ✓' : 'Live Synced ✓'}</span>
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                {lang === 'ar' ? selectedChild.gradeAr : selectedChild.gradeEn}
              </p>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
              <span className="text-xs text-gray-400 font-bold block uppercase">
                {lang === 'ar' ? 'الدروس المنجزة' : 'Lessons Done'}
              </span>
              <span className="text-xl md:text-2xl font-bold text-[var(--color-church-blue)]">
                {completedCount}<span className="text-xs text-gray-400 font-normal">/{lessonsList.length}</span>
              </span>
            </div>
            <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
              <span className="text-xs text-gray-400 font-bold block uppercase">
                {lang === 'ar' ? 'محاولات الاختبار' : 'Quiz attempts'}
              </span>
              <span className="text-xl md:text-2xl font-bold text-emerald-600">
                {reviewData?.lessons.reduce((sum, lesson) => sum + lesson.quizAttemptsCount, 0) ?? '—'}
              </span>
            </div>
            <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
              <span className="text-xs text-gray-400 font-bold block uppercase">
                {lang === 'ar' ? 'الأقسام المقروءة' : 'Sections read'}
              </span>
              <span className="text-xl md:text-2xl font-bold text-[var(--color-church-burgundy)]">
                {reviewData?.lessons.reduce((sum, lesson) => sum + lesson.sectionsCompleted.length, 0) ?? '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Real-Time Parent-Child Linking & Control Bar */}
        <div hidden={selectedChild.isRealAccount === true} className="py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Daily Screen Time Limit Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-600 flex items-center gap-1.5">
              <Clock size={14} className="text-[var(--color-church-blue)]" />
              <span>{lang === 'ar' ? 'حد المذاكرة اليومي:' : 'Daily Study Limit:'}</span>
            </span>
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
              {[30, 45, 60, 90, 0].map(mins => {
                const isCurrent = (selectedChild.dailyScreenTimeLimitMinutes || 60) === mins;
                const label = mins === 0 
                  ? (lang === 'ar' ? 'مفتوح' : 'Unlimited') 
                  : `${mins}${lang === 'ar' ? 'د' : 'm'}`;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => onSetScreenTimeLimit && onSetScreenTimeLimit(selectedChild.id, mins)}
                    className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      isCurrent 
                        ? 'bg-[var(--color-church-blue)] text-white shadow-2xs' 
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parent Blessing Action */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowBlessingInput(!showBlessingInput);
                setBlessingText(selectedChild.parentBlessingMessage || '');
              }}
              className="px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-[var(--color-church-burgundy)] font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <HeartHandshake size={14} className="text-[var(--color-church-burgundy)]" />
              <span>{lang === 'ar' ? 'إرسال بركة وتشجيع' : 'Send Blessing Note'}</span>
            </button>

            {onUnlinkChild && childrenProfiles.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(lang === 'ar' ? `هل أنت متأكد من إلغاء ربط حساب ${selectedChild.nameAr}؟` : `Unlink ${selectedChild.nameEn}?`)) {
                    onUnlinkChild(selectedChild.id);
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                title={lang === 'ar' ? 'إلغاء ربط الحساب' : 'Unlink Child'}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Current Blessing Display or Input Editor */}
        {selectedChild.parentBlessingMessage && !showBlessingInput && (
          <div className="mt-3 p-3 bg-gradient-to-r from-red-50/80 to-amber-50/80 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs">
            <span className="text-lg shrink-0">🕊️</span>
            <div className="flex-1">
              <span className="font-bold text-[var(--color-church-burgundy)] block">
                {lang === 'ar' ? 'بركة وتشجيع الأب/الأم النشطة للطفل:' : 'Active Parental Blessing to Child:'}
              </span>
              <p className="text-gray-700 italic mt-0.5 font-medium">"{selectedChild.parentBlessingMessage}"</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowBlessingInput(true);
                setBlessingText(selectedChild.parentBlessingMessage || '');
              }}
              className="text-[11px] font-bold text-[var(--color-church-burgundy)] hover:underline shrink-0"
            >
              {lang === 'ar' ? 'تعديل' : 'Edit'}
            </button>
          </div>
        )}

        {showBlessingInput && (
          <div className="mt-3 p-4 bg-red-50/90 border border-red-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[var(--color-church-burgundy)] flex items-center gap-1.5">
                <HeartHandshake size={14} />
                {lang === 'ar' ? `اكتب رسالة بركة وتشجيع لـ ${selectedChild.nameAr}:` : `Send blessing note to ${selectedChild.nameEn}:`}
              </span>
              <button 
                type="button" 
                onClick={() => setShowBlessingInput(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <textarea
              value={blessingText}
              onChange={(e) => setBlessingText(e.target.value)}
              placeholder={lang === 'ar' ? 'مثال: شاطر يا بطل! ربنا يبارك حفظك للألحان وفخور بيك جداً 🙏' : 'e.g. Proud of you! May the Lord bless your hymns and study 🙏'}
              className="w-full bg-white border border-red-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:border-[var(--color-church-burgundy)] min-h-[60px]"
            />

            {/* Quick preset phrases */}
            <div className="flex flex-wrap gap-1.5">
              {[
                lang === 'ar' ? 'ربنا يبارك حفظك للألحان يا بطل! 🙏' : 'God bless your hymns!',
                lang === 'ar' ? 'فخور بيك وبحضورك القداس بانتظام ⛪' : 'Proud of your church attendance!',
                lang === 'ar' ? 'بركة صلوات العذراء مريم معك دائماً 🌸' : 'May St. Mary protect you!'
              ].map(phrase => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => setBlessingText(phrase)}
                  className="text-[10px] bg-white border border-amber-200 hover:bg-amber-100 text-amber-900 px-2 py-1 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  {phrase}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowBlessingInput(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onSendBlessing && blessingText.trim()) {
                    onSendBlessing(selectedChild.id, blessingText.trim());
                    setShowBlessingInput(false);
                    setBlessingSuccess(true);
                    setTimeout(() => setBlessingSuccess(false), 2500);
                  }
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[var(--color-church-burgundy)] hover:bg-red-900 text-white flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Send size={12} />
                <span>{lang === 'ar' ? 'إرسال للطفل الآن' : 'Send to Child'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Visual Progress Bar & Completion Summary */}
        <div className="py-6 border-b border-gray-100">
          <div className="flex justify-between items-center mb-2.5">
            <div>
              <h4 className="text-sm md:text-base font-bold text-[var(--color-church-blue)] flex items-center gap-1.5">
                <Sparkles size={16} className="text-[var(--color-church-gold)]" />
                {lang === 'ar' ? 'نسبة إكمال الدروس المسجلة' : 'Completion among recorded lessons'}
              </h4>
              <p className="text-xs text-gray-400 font-medium">
                {lang === 'ar' ? 'يعرض الدروس التي لها سجل محفوظ فقط' : 'Only lessons with persisted activity are included'}
              </p>
            </div>
            <span className="text-2xl font-extrabold text-[var(--color-church-blue)]">
              {completionPercentage}%
            </span>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-[var(--color-church-gold)] via-amber-500 to-[var(--color-church-blue)] rounded-full shadow-sm"
            />
          </div>

          <div className="flex justify-between items-center text-xs text-gray-500 font-medium mt-2">
            <span>{completedCount} {lang === 'ar' ? 'دروس مكتملة' : 'completed'}</span>
            <span>{inProgressCount} {lang === 'ar' ? 'قيد المذاكرة' : 'in progress'}</span>
            <span>{lang === 'ar' ? 'المعروض: سجل محفوظ فقط' : 'Recorded activity only'}</span>
          </div>
        </div>

        {/* Subject Pillars Breakdown */}
        <div className="pt-6">
          <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
            {lang === 'ar' ? 'التقدم بحسب المادة والفرع الكنسي' : 'Progress by Curriculum Subject'}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {categoryStats.map(item => {
              const Icon = item.config.icon;
              return (
                <div 
                  key={item.category}
                  onClick={() => setSelectedCategory(selectedCategory === item.category ? 'all' : item.category)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedCategory === item.category 
                      ? 'border-[var(--color-church-blue)] bg-blue-50/50 shadow-sm' 
                      : 'border-gray-100 bg-gray-50/70 hover:bg-white hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-xl ${item.config.bg} ${item.config.color}`}>
                      <Icon size={18} />
                    </div>
                    <span className="text-sm font-bold text-[var(--color-church-blue)]">
                      {item.percent}%
                    </span>
                  </div>
                  <h5 className="text-xs md:text-sm font-bold text-gray-800 line-clamp-1 mb-2">
                    {lang === 'ar' ? item.config.ar : item.config.en}
                  </h5>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="h-full bg-[var(--color-church-blue)] rounded-full" 
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-gray-400 font-medium block mt-1.5">
                    {item.completed}/{item.total} {lang === 'ar' ? 'دروس مكتملة' : 'lessons'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Authoritative Church Learning & Mastery Dashboard */}
      {reviewData && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[var(--color-church-cream-dark)] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs">
                <Award size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg md:text-xl font-bold text-[var(--color-church-blue)]">
                    {lang === 'ar' ? 'سجل التعلّم المحفوظ' : 'Persisted learning records'}
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck size={11} />
                    {lang === 'ar' ? 'من قاعدة البيانات' : 'Database data'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {lang === 'ar'
                    ? `الصف: ${reviewData.student.grade}`
                    : `Grade: ${reviewData.student.grade}`}
                </p>
              </div>
            </div>

            <button
              onClick={() => fetchReview(selectedChild.id)}
              disabled={reviewLoading}
              className="px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-gray-200 cursor-pointer self-start sm:self-auto disabled:opacity-50"
            >
              <RefreshCw size={13} className={reviewLoading ? 'animate-spin' : ''} />
              <span>{lang === 'ar' ? 'تحديث السجل' : 'Refresh'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: lang === 'ar' ? 'دروس مسجلة' : 'Recorded lessons', value: reviewData.summary.totalLessons },
              { label: lang === 'ar' ? 'دروس مكتملة' : 'Completed lessons', value: reviewData.summary.completedLessonsCount },
              { label: lang === 'ar' ? 'محاولات الاختبار' : 'Quiz attempts', value: reviewData.lessons.reduce((sum, lesson) => sum + lesson.quizAttemptsCount, 0) },
              { label: lang === 'ar' ? 'متوسط الاختبارات' : 'Average quiz score', value: reviewData.lessons.some(lesson => lesson.quizAttemptsCount > 0) ? `${reviewData.summary.averageQuizScore}%` : '—' }
            ].map(metric => (
              <div key={metric.label} className="bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-2xl p-4">
                <span className="text-xs font-bold text-[var(--text-secondary)]">{metric.label}</span>
                <div className="text-2xl font-black text-[var(--text-primary)] mt-1">{metric.value}</div>
              </div>
            ))}
          </div>

          {/* Needs Review Callout */}
          {reviewData.needsReviewItems.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <AlertTriangle size={16} className="text-rose-600" />
                <span>{lang === 'ar' ? 'نقاط ومفاهيم تحتاج دعم وتشجيع من الأسرة:' : 'Areas Requiring Family Attention & Review:'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {reviewData.needsReviewItems.map((item) => (
                  <div key={item.lessonId} className="bg-white border border-rose-200 rounded-xl p-3 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-gray-800 text-xs block">{item.title}</span>
                      <span className="text-[11px] text-rose-700">
                        {lang === 'ar' ? 'درجة التقييم أقل من 60% — يُنصح بإعادة القراءة سوياً' : 'Score < 60% — Review concepts together'}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 shrink-0">
                      {item.latestQuizPercentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lessons with persisted activity */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              {lang === 'ar' ? 'الدروس ذات النشاط المسجل' : 'Lessons with recorded activity'}
            </h4>
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/40">
              {reviewData.lessons.map((lesson) => (
                <div key={lesson.lessonId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[var(--color-church-blue)]">{lang === 'ar' ? (lesson.titleAr || lesson.title) : lesson.title}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                        {lesson.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-3">
                      <span>{lang === 'ar' ? `إكمال الأقسام: ${lesson.completionPercent}%` : `Sections complete: ${lesson.completionPercent}%`}</span>
                      {lesson.quizAttemptsCount > 0 && <span>{lang === 'ar' ? `آخر اختبار: ${lesson.latestQuizPercentage}%` : `Latest quiz: ${lesson.latestQuizPercentage}%`}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-[var(--border-default)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                      {lesson.progressStatus === 'COMPLETED'
                        ? (lang === 'ar' ? 'مكتمل' : 'Completed')
                        : (lang === 'ar' ? 'قيد التقدم' : 'In progress')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Log */}
          {reviewData.recentActivity.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Activity size={13} />
                <span>{lang === 'ar' ? 'سجل النشاط والتفاعل الأخير' : 'Recent Learning Activity'}</span>
              </h4>
              <div className="space-y-2">
                {reviewData.recentActivity.slice(0, 5).map((act, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        act.type === 'quiz' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {act.type === 'quiz' ? <HelpCircle size={14} /> : <CheckCircle2 size={14} />}
                      </div>
                      <div>
                        <span className="font-bold text-gray-800">{act.lessonTitle}</span>
                        <p className="text-[11px] text-gray-500">{act.description}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono shrink-0">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lesson List Header with Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div>
          <h3 className="text-lg md:text-xl font-bold text-[var(--color-church-blue)] flex items-center gap-2">
            <BookOpen className="text-[var(--color-church-gold)]" size={20} />
            {lang === 'ar' ? 'سجل الدروس والاختبارات التفصيلي' : 'Detailed Lesson & Quiz Progress'}
          </h3>
          <p className="text-xs text-gray-500 font-medium">
            {lang === 'ar' ? 'اضغط على أي درس لعرض تفاصيل الأسئلة، حفظ الآية، وملاحظات الخادم' : 'Click on any lesson to view quiz score, memory verse, and teacher feedback'}
          </p>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search size={16} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'ar' ? 'بحث في الدروس...' : 'Search lessons...'}
              className={`w-full text-xs font-medium py-2 bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-[var(--color-church-blue)] ${
                lang === 'ar' ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
              }`}
            />
          </div>

          {selectedCategory !== 'all' && (
            <button
              onClick={() => setSelectedCategory('all')}
              className="text-xs font-bold text-[var(--color-church-burgundy)] bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-colors shrink-0"
            >
              {lang === 'ar' ? 'عرض الكل' : 'Clear filter'}
            </button>
          )}
        </div>
      </div>

      {/* Lesson Cards List */}
      <div className="space-y-3">
        {filteredLessons.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 text-gray-400 font-medium text-sm">
            {lang === 'ar' ? 'لا توجد دروس مطابقة لهذا التصنيف أو البحث.' : 'No lessons found matching this filter or search query.'}
          </div>
        ) : (
          filteredLessons.map((lesson) => {
            const isExpanded = expandedLessonId === lesson.lessonId;
            const cat = categoryConfig[lesson.category];
            const CatIcon = cat.icon;

            return (
              <div 
                key={lesson.lessonId}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isExpanded ? 'border-[var(--color-church-blue)] shadow-md' : 'border-[var(--color-church-cream-dark)] hover:border-gray-300'
                }`}
              >
                <div 
                  onClick={() => setExpandedLessonId(isExpanded ? null : lesson.lessonId)}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${cat.bg} ${cat.color}`}>
                      <CatIcon size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${cat.bg} ${cat.color}`}>
                          {lang === 'ar' ? cat.ar : cat.en}
                        </span>
                        {lesson.dateCompleted && (
                          <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                            <Clock size={12} />
                            {lesson.dateCompleted}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-[var(--color-church-blue)] truncate">
                        {lang === 'ar' ? lesson.lessonTitleAr : lesson.lessonTitleEn}
                      </h4>
                    </div>
                  </div>

                  {/* Status & Score Pill */}
                  <div className="flex items-center gap-3 shrink-0">
                    {lesson.status === 'completed' && (
                      <div className="flex items-center gap-2">
                        {lesson.quizScore && (
                          <span className="hidden sm:inline-flex text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                            {lang === 'ar' 
                              ? `الاختبار: ${lesson.quizScore.correct}/${lesson.quizScore.total}` 
                              : `Quiz: ${lesson.quizScore.correct}/${lesson.quizScore.total}`}
                          </span>
                        )}
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          {lang === 'ar' ? 'مكتمل' : 'Completed'}
                        </span>
                      </div>
                    )}

                    {lesson.status === 'in_progress' && (
                      <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Clock size={13} />
                        {lang === 'ar' ? 'قيد المذاكرة' : 'In Progress'}
                      </span>
                    )}

                    {lesson.status === 'assigned' && (
                      <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                        {lang === 'ar' ? 'محدد للأسبوع' : 'Assigned'}
                      </span>
                    )}

                    <span className="text-xs font-bold text-[var(--color-church-gold-dark)] bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      +{lesson.pointsEarned} {lang === 'ar' ? 'نقطة' : 'pts'}
                    </span>

                    <button 
                      type="button"
                      aria-label="Toggle lesson details"
                      className="p-1 text-gray-400 hover:text-[var(--color-church-blue)] rounded-lg transition-colors"
                    >
                      <ChevronDown size={18} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-gray-100 bg-gray-50/60 p-4 sm:p-5 space-y-3.5"
                    >
                      {/* Memory Verse Box */}
                      <div className="bg-white rounded-xl p-3.5 border border-amber-200/70 shadow-2xs flex items-start gap-3">
                        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                          <Award size={16} />
                        </div>
                        <div className="flex-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block mb-1">
                            {lang === 'ar' ? 'الآية الذهبية المحفوظة' : 'Memorized Bible Verse'}
                          </span>
                          <p className="text-xs sm:text-sm font-semibold text-gray-800 leading-relaxed italic">
                            {lang === 'ar' ? lesson.memoryVerseAr : lesson.memoryVerseEn}
                          </p>
                        </div>
                      </div>

                      {/* Teacher's Note Box */}
                      {lesson.teacherNoteEn && (
                        <div className="bg-white rounded-xl p-3.5 border border-blue-100 shadow-2xs flex items-start gap-3">
                          <div className="p-1.5 rounded-lg bg-blue-100 text-[var(--color-church-blue)] shrink-0 mt-0.5">
                            <MessageSquareQuote size={16} />
                          </div>
                          <div className="flex-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-church-blue)] block mb-1">
                              {lang === 'ar' ? 'ملاحظة خادم الفصل لولي الأمر' : 'Sunday School Servant Feedback'}
                            </span>
                            <p className="text-xs sm:text-sm font-medium text-gray-700 leading-relaxed">
                              {lang === 'ar' ? lesson.teacherNoteAr : lesson.teacherNoteEn}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Quiz & Mastery Summary */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs font-semibold text-gray-500">
                        <div className="flex items-center gap-2">
                          <span>{lang === 'ar' ? 'الدرجة المستحقة:' : 'Points Scored:'}</span>
                          <span className="font-bold text-[var(--color-church-blue)]">
                            {lesson.pointsEarned} / {lesson.pointsMax} {lang === 'ar' ? 'نقطة' : 'pts'}
                          </span>
                        </div>
                        {lesson.quizScore && (
                          <div className="flex items-center gap-1.5 text-emerald-700">
                            <CheckCircle2 size={14} />
                            <span>
                              {lang === 'ar' 
                                ? `أجاب ${lesson.quizScore.correct} من أصل ${lesson.quizScore.total} بشكل صحيح` 
                                : `Answered ${lesson.quizScore.correct} of ${lesson.quizScore.total} questions correctly`}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
