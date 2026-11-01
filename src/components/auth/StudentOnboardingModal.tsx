import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  Send, 
  ShieldCheck, 
  X, 
  User, 
  Phone, 
  MessageSquare,
  AlertCircle,
  RefreshCw,
  School,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';
import { CLASS_GROUPS, CANONICAL_GRADE_LIST, getClassGroupForGrade, CANONICAL_GRADES } from '../../lib/classGroups';
import { ClassGroupId, Language, OnboardingActivationRequest } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { requestAccountActivation, getMyActivationStatus } from '../../lib/onboardingService';

interface StudentOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSuccess?: () => void;
}

export const StudentOnboardingModal: React.FC<StudentOnboardingModalProps> = ({
  isOpen,
  onClose,
  lang,
  onSuccess
}) => {
  const isAr = lang === 'ar';
  const { userData, updateUserProfile } = useAuth();

  // Selected exact grade (canonical grade code, e.g. 'Grade 2' or 'Primary 2')
  const [selectedGradeCode, setSelectedGradeCode] = useState<string>(() => {
    if (userData?.requestedGrade) return userData.requestedGrade;
    if (userData?.grade) return userData.grade;
    return 'Grade 4';
  });

  const [fullName, setFullName] = useState(userData?.fullName || '');
  const [phone, setPhone] = useState(userData?.phone || '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Status of existing request
  const [existingRequest, setExistingRequest] = useState<OnboardingActivationRequest | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Fetch status of current request
  useEffect(() => {
    if (!isOpen || !userData?.id) return;
    let isMounted = true;
    setLoadingStatus(true);
    getMyActivationStatus(userData.id).then((res) => {
      if (!isMounted) return;
      if (res.success && res.request) {
        setExistingRequest(res.request);
        setSelectedGradeCode(res.request.requestedGrade);
        if (res.request.notes) setNotes(res.request.notes);
      }
      setLoadingStatus(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, userData?.id]);

  if (!isOpen) return null;

  // Derive Church Class Group automatically from the selected exact grade
  const derivedClassGroup = getClassGroupForGrade(selectedGradeCode) || CLASS_GROUPS.primary_2;
  const derivedClassGroupId: ClassGroupId = (derivedClassGroup.id as ClassGroupId) || 'primary_2';

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.id) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      const submittedName = fullName.trim() || userData.fullName || 'Student';
      if (submittedName !== userData.fullName) {
        const profileResult = await updateUserProfile({ fullName: submittedName });
        if (!profileResult.success) {
          setErrorMessage(profileResult.error || (isAr ? 'تعذر حفظ الاسم.' : 'Could not save your name.'));
          setSubmitting(false);
          return;
        }
      }

      const res = await requestAccountActivation({
        studentId: userData.id,
        studentName: submittedName,
        email: userData.parentEmail || (userData as any).email || '',
        phone: phone.trim(),
        requestedClassGroupId: derivedClassGroupId,
        requestedGrade: selectedGradeCode,
        notes: notes.trim()
      });

      if (!res.success || !res.request) {
        setErrorMessage(res.error || (isAr ? 'فشل إرسال طلب التفعيل' : 'Failed to submit activation request'));
        setSubmitting(false);
        return;
      }

      setExistingRequest(res.request);
      setIsEditing(false);
      setSuccessMessage(
        isAr 
          ? 'تم إرسال طلب تفعيل الحساب وتحديد الصف بنجاح! تم إشعار الخدام المسؤولين للموافقة اليدوية وتسكينك في كشف الفصل.'
          : 'Activation request submitted successfully! Your class servants have been notified for manual approval and roster assignment.'
      );

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || (isAr ? 'حدث خطأ في الاتصال' : 'Connection error'));
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = existingRequest?.status === 'PENDING_APPROVAL' && !isEditing;

  // Grade clusters for canonical selection
  const gradeClusters = [
    {
      group: CLASS_GROUPS.angels,
      grades: [
        { id: 'kg_1', code: 'KG1', label: { en: 'KG 1', ar: 'حضانة صغرى (KG1)' } },
        { id: 'kg_2', code: 'KG2', label: { en: 'KG 2', ar: 'حضانة كبرى (KG2)' } }
      ]
    },
    {
      group: CLASS_GROUPS.primary_1,
      grades: [
        { id: 'grade_1', code: 'Grade 1', label: { en: 'Primary 1', ar: 'الصف الأول الابتدائي' } },
        { id: 'grade_2', code: 'Grade 2', label: { en: 'Primary 2', ar: 'الصف الثاني الابتدائي' } },
        { id: 'grade_3', code: 'Grade 3', label: { en: 'Primary 3', ar: 'الصف الثالث الابتدائي' } }
      ]
    },
    {
      group: CLASS_GROUPS.primary_2,
      grades: [
        { id: 'grade_4', code: 'Grade 4', label: { en: 'Primary 4', ar: 'الصف الرابع الابتدائي' } },
        { id: 'grade_5', code: 'Grade 5', label: { en: 'Primary 5', ar: 'الصف الخامس الابتدائي' } },
        { id: 'grade_6', code: 'Grade 6', label: { en: 'Primary 6', ar: 'الصف السادس الابتدائي' } }
      ]
    },
    {
      group: CLASS_GROUPS.preparatory,
      grades: [
        { id: 'prep_1', code: 'Prep 1', label: { en: 'Prep 1 (Grade 7)', ar: 'الصف الأول الإعدادي' } },
        { id: 'prep_2', code: 'Prep 2', label: { en: 'Prep 2 (Grade 8)', ar: 'الصف الثاني الإعدادي' } },
        { id: 'prep_3', code: 'Prep 3', label: { en: 'Prep 3 (Grade 9)', ar: 'الصف الثالث الإعدادي' } }
      ]
    },
    {
      group: CLASS_GROUPS.secondary,
      grades: [
        { id: 'sec_1', code: 'Secondary 1', label: { en: 'Secondary 1', ar: 'الصف الأول الثانوي' } },
        { id: 'sec_2', code: 'Secondary 2', label: { en: 'Secondary 2', ar: 'الصف الثاني الثانوي' } },
        { id: 'sec_3', code: 'Secondary 3', label: { en: 'Secondary 3', ar: 'الصف الثالث الثانوي' } }
      ]
    },
    {
      group: CLASS_GROUPS.university,
      grades: [
        { id: 'university', code: 'University', label: { en: 'University & Youth', ar: 'المرحلة الجامعية والخريجون' } }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-xl bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] border-2 border-[var(--mousa-border-sand)] rounded-3xl shadow-2xl p-6 relative overflow-hidden my-8"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[var(--mousa-sand-500)] hover:text-[var(--mousa-coral)] hover:bg-[var(--mousa-sand-100)] transition-colors cursor-pointer"
          title={isAr ? 'إغلاق' : 'Close'}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-[var(--mousa-border-sand)]">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[var(--mousa-teal-deep)] to-[var(--mousa-teal)] text-[var(--mousa-gold)] flex items-center justify-center shadow-md shrink-0 border border-[var(--mousa-gold)]/30">
            <School size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
                {isAr ? 'أهلاً بك في رحلة القديس الأنبا موسى!' : 'Welcome to The Journey of Moses!'}
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
              {isAr 
                ? 'لنقم بإعداد حسابك لمدارس الأحد وتحديد صفك الدراسي'
                : "Let's set up your Sunday School account."}
            </p>
          </div>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2 border border-red-200 dark:border-red-900/50">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:border-emerald-900/50">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* If user already has a pending request */}
        {isPending ? (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300/50">
                  <Clock size={13} className="animate-pulse" />
                  {isAr ? 'الطلب قيد المراجعة لدى الخادم' : 'Pending Servant Approval'}
                </span>
                <span className="text-[11px] text-gray-400 font-medium">
                  {new Date(existingRequest.requestedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="text-xs text-gray-700 dark:text-gray-300 space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{isAr ? 'الصف الدراسي المحدد:' : 'Exact Grade:'}</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {existingRequest.requestedGrade}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{isAr ? 'فصل مدارس الأحد الكنسي:' : 'Church Class Group:'}</span>
                  <span className="font-bold text-[var(--mousa-teal)] dark:text-amber-300">
                    {CLASS_GROUPS[existingRequest.requestedClassGroupId]?.name[isAr ? 'ar' : 'en'] || existingRequest.requestedClassGroupId}
                  </span>
                </div>
                {existingRequest.notes && (
                  <div className="pt-1 text-[11px] text-gray-500 italic">
                    "{existingRequest.notes}"
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-amber-200/50 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200/80 leading-relaxed flex items-start gap-1.5">
                <Sparkles size={14} className="shrink-0 text-amber-600 mt-0.5" />
                <span>
                  {isAr 
                    ? 'سيقوم الخادم المسؤول بمراجعة طلبك واعتماد تسكينك في كشف الفصل، لتظهر لك دروس مدارس الأحد فوراً.'
                    : 'Your Sunday School servant will review and approve your enrollment to unlock your curriculum lessons and quizzes.'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {isAr ? 'تعديل الصف الدراسي' : 'Change Exact Grade'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-[var(--mousa-teal)] hover:bg-[var(--color-church-blue-light)] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                {isAr ? 'حسناً، فهمت' : 'Got it'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitRequest} className="space-y-5">
            {/* Core Question: Exact Grade */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs sm:text-sm font-black text-gray-900 dark:text-white">
                  {isAr ? 'ما هي مرحلتك/سنتك الدراسية المحددة في مدارس الأحد؟' : 'What is your exact school/Sunday-School grade?'}
                </label>
                <span className="text-[11px] text-gray-400">
                  {isAr ? 'تحديد دقيق' : 'Exact Grade'}
                </span>
              </div>

              {/* Exact grade clusters */}
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {gradeClusters.map((cluster) => (
                  <div key={cluster.group.id} className="p-2.5 bg-gray-50/80 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1.5 mb-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                      <span>{cluster.group.icon}</span>
                      <span>{cluster.group.name[isAr ? 'ar' : 'en']}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {cluster.grades.map((g) => {
                        const isSelected = selectedGradeCode === g.code || selectedGradeCode === g.id;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setSelectedGradeCode(g.code)}
                            className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                              isSelected
                                ? 'bg-[var(--mousa-teal)] text-white border-[var(--mousa-teal)] shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/60'
                            }`}
                          >
                            <span>{g.label[isAr ? 'ar' : 'en']}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Deterministic Church Class Group Card */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{derivedClassGroup.icon}</span>
                <div>
                  <div className="text-[11px] text-amber-800 dark:text-amber-400 font-bold uppercase tracking-wider">
                    {isAr ? 'فصل مدارس الأحد الكنسي المحسوب تلقائياً:' : 'Derived Church Class Group:'}
                  </div>
                  <div className="font-extrabold text-[var(--mousa-teal)] dark:text-amber-300 text-sm">
                    {derivedClassGroup.name[isAr ? 'ar' : 'en']}
                  </div>
                </div>
              </div>
              <div className="text-end text-[11px] text-gray-500 dark:text-gray-400">
                <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{selectedGradeCode}</span>
                <div>{derivedClassGroup.description[isAr ? 'ar' : 'en']}</div>
              </div>
            </div>

            {/* Student Full Name & Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {isAr ? 'الاسم بالكامل:' : 'Full Name:'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isAr ? 'مثال: يوسف مينا' : 'e.g. Youssef Mina'}
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--mousa-teal)] pl-9"
                  />
                  <User size={15} className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {isAr ? 'الهاتف للتواصل مع الخادم (اختياري):' : 'Phone / Contact (Optional):'}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+20 100 000 0000"
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--mousa-teal)] pl-9"
                  />
                  <Phone size={15} className="absolute left-3 top-3 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Note to Servant */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                {isAr ? 'ملاحظة للخادم المسؤول (اختياري):' : 'Note to Servant (Optional):'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isAr ? 'مثال: أحضر مع الأستاذ مينا يوم الجمعة' : 'e.g. I attend Friday class with Servant Mina'}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--mousa-teal)] pl-9"
                />
                <MessageSquare size={15} className="absolute left-3 top-3 text-gray-400" />
              </div>
            </div>

            {/* Explanatory notification badge */}
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 rounded-xl text-[11px] text-blue-900 dark:text-blue-300 flex items-start gap-2">
              <Info size={15} className="shrink-0 text-blue-600 mt-0.5" />
              <span>
                {isAr
                  ? 'عند إرسال الطلب، سيصل إشعار إلى خادم الفصل والإدارة للموافقة اليدوية وتسكينك في كشف الفصل الرسمي لمدارس الأحد.'
                  : 'Submitting will send a notification to your Sunday School servants and admin for manual approval and roster assignment.'}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedGradeCode}
                className="px-5 py-2.5 rounded-xl bg-[var(--mousa-teal)] hover:bg-[var(--color-church-blue-light)] text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>{isAr ? 'جاري الإرسال...' : 'Submitting...'}</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>{isAr ? 'إرسال طلب التفعيل والتسكين' : 'Submit Activation Request'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
