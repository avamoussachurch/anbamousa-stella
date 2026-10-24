import React from 'react';
import { Sparkles, Trophy, CheckCircle2, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Language } from '../../types';

interface MosesLessonProgressBarProps {
  totalLessons: number;
  completedLessons: number;
  isLoading?: boolean;
  error?: string | null;
  lang: Language;
  onExploreLessons?: () => void;
}

/**
 * Reusable Moses Lesson Progress Bar component
 * Utilizes a smooth gradient transition between mousa-teal and mousa-gold for a 'sunrise' effect.
 * Authoritative, handles 0 lessons, loading, error, and partial progress gracefully.
 */
export const MosesLessonProgressBar: React.FC<MosesLessonProgressBarProps> = ({
  totalLessons,
  completedLessons,
  isLoading = false,
  error = null,
  lang,
  onExploreLessons
}) => {
  const isAr = lang === 'ar';
  const isCop = lang === 'copt' || lang === 'cop';

  // Handle zero lessons or edge states safely
  const safeTotal = Math.max(0, totalLessons);
  const safeCompleted = Math.min(Math.max(0, completedLessons), safeTotal);
  const percentage = safeTotal > 0 ? Math.round((safeCompleted / safeTotal) * 100) : 0;

  // Spiritual encouragement message depending on real progress state
  const getEncouragement = () => {
    if (isLoading) {
      return isCop ? 'Ⲥⲉⲓⲛⲓ ⲛ̀ⲛⲓⲥⲃⲱ...' : isAr ? 'جاري تحميل مسيرتك الروحية...' : 'Loading your journey progress...';
    }
    if (error) {
      return isCop ? 'Ⲡⲓⲥⲱⲣⲉⲙ ϧⲉⲛ ⲡⲓⲱϣ' : isAr ? 'حفظ التقدم متاح محلياً على جهازك' : 'Progress saved locally on your device';
    }
    if (safeTotal === 0) {
      return isCop ? 'Ⲙ̀ⲙⲟⲛ ϩⲁⲛⲥⲃⲱ ϯⲛⲟⲩ' : isAr ? 'في انتظار نشر المحطات الجديدة من الخدام' : 'Awaiting new milestones from your servants';
    }
    if (percentage === 100) {
      return isCop ? 'Ⲁⲕϫⲱⲕ ⲉ̀ⲃⲟⲗ ⲛ̀ⲧⲉ ⲡⲓⲙⲱⲓⲧ ⲧⲏⲣϥ! Ⲁⲝⲓⲟⲥ 👑' : isAr ? 'مبارك! أتممت جميع محطات المنهج بنجاح 👑' : 'Axios! You completed all milestones on the path 👑';
    }
    if (percentage >= 75) {
      return isCop ? 'Ϩⲱⲗ ⲉ̀ϧⲟⲩⲛ ⲉ̀ⲡⲓⲙⲟⲛⲁⲥⲧⲏⲣⲓⲟⲛ ⛪' : isAr ? 'اقتربت جداً من بلوغ دير القديسين! استمر ⛪' : 'Nearing the Sanctuary of Scetis! Keep going ⛪';
    }
    if (percentage >= 50) {
      return isCop ? 'Ⲁⲕⲫⲟϩ ⲉ̀ⲧⲫⲁϣⲓ ⲛ̀ⲧⲉ ⲡⲓⲙⲱⲓⲧ 💧' : isAr ? 'عاش يا بطل! قطعت نصف طريق البرية 💧' : 'Well done! Halfway through the desert journey 💧';
    }
    if (percentage > 0) {
      return isCop ? 'Ⲁⲣⲓϩⲏⲧⲥ ϧⲉⲛ ⲟⲩϫⲟⲙ 🌅' : isAr ? 'خطوات مباركة في نور البرية 🌅' : 'Blessed first steps in the morning light 🌅';
    }
    return isCop ? 'Ⲁⲣⲓϩⲏⲧⲥ ⲉ̀ⲧⲉⲕⲥⲃⲱ ⲛ̀ϣⲟⲣⲡ' : isAr ? 'ابدأ أولى محطات رحلة الأنبا موسى اليوم' : 'Begin your first milestone in the Journey of Moses today';
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-[var(--mousa-border-sand)] bg-[var(--mousa-cream-surface)] dark:bg-[#1C1814] p-5 sm:p-6 shadow-sm transition-all">
      {/* Decorative Warm Ambient Glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-[var(--mousa-gold)]/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-[var(--mousa-teal)]/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-3.5">
        {/* Top Header: Title & Ratio Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--mousa-teal)] to-[var(--mousa-teal-deep)] text-white flex items-center justify-center shadow-xs shrink-0">
              {isLoading ? (
                <Loader2 size={20} className="animate-spin text-[var(--mousa-gold-glow)]" />
              ) : percentage === 100 ? (
                <Trophy size={20} className="text-[var(--mousa-gold-glow)]" />
              ) : (
                <Sparkles size={20} className="text-[var(--mousa-gold-glow)]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
                  {isCop ? 'Ⲡⲓϫⲱⲕ ⲛ̀ⲧⲉ ⲛⲓⲥⲃⲱ ⲧⲏⲣⲟⲩ' : isAr ? 'إنجاز محطات دروس المنهج' : 'Curriculum Milestones Completion'}
                </h3>
                {percentage === 100 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                    <CheckCircle2 size={11} />
                    <span>{isAr ? 'مكتمل' : 'Completed'}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--mousa-sand-600)] dark:text-[#D5C7B5] font-medium mt-0.5">
                {getEncouragement()}
              </p>
            </div>
          </div>

          {/* Ratio & Percentage Pill */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {error && (
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 px-2.5 py-1 rounded-xl flex items-center gap-1">
                <AlertCircle size={12} />
                <span>{isAr ? 'وضع عدم الاتصال' : 'Offline Mode'}</span>
              </span>
            )}
            <div className="flex items-baseline gap-1 px-3 py-1.5 rounded-2xl bg-[var(--mousa-sand-100)] dark:bg-[#25201A] border border-[var(--mousa-border-sand)] text-xs font-black shadow-2xs">
              <span className="text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
                {safeCompleted}
              </span>
              <span className="text-[var(--mousa-sand-500)] dark:text-[#A89885]">
                {isAr ? 'من' : '/'}
              </span>
              <span className="text-[var(--mousa-sand-600)] dark:text-[#D5C7B5]">
                {safeTotal}
              </span>
              <span className="text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)] ml-1 mr-1">
                ({percentage}%)
              </span>
            </div>
          </div>
        </div>

        {/* Sunrise Effect Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-3.5 sm:h-4 rounded-full bg-[var(--mousa-sand-100)] dark:bg-[#2A231C] p-0.5 border border-[var(--mousa-border-sand)] overflow-hidden shadow-inner relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full mousa-sunrise-bar relative overflow-hidden"
              style={{
                background: 'linear-gradient(90deg, var(--mousa-teal) 0%, #1F7181 35%, var(--mousa-gold) 75%, var(--mousa-gold-glow) 100%)'
              }}
            >
              {/* Animated Sunrise Shimmer Wave */}
              <div className="absolute inset-0 mousa-sunrise-shimmer pointer-events-none" />
            </motion.div>
          </div>

          {/* Bottom Trail Guide Marks */}
          <div className="flex justify-between items-center text-[9px] sm:text-[10px] text-[var(--mousa-sand-500)] dark:text-[#A89885] font-bold px-1 gap-1">
            <span className="truncate">{isCop ? 'Ϩⲏⲧⲥ' : isAr ? 'البداية' : 'Start'} <span className="hidden sm:inline">{isAr ? '(بئر البرية)' : '(Well)'}</span></span>
            <span className="truncate text-center">{isCop ? 'Ⲫⲁϣⲓ' : isAr ? 'المنتصف' : 'Halfway'} <span className="hidden sm:inline">{isAr ? '(الينبوع)' : '(Fountain)'}</span></span>
            <span className="truncate text-end">{isCop ? 'Ϫⲱⲕ' : isAr ? 'القمة' : 'Summit'} <span className="hidden sm:inline">{isAr ? '(الدير)' : '(Monastery)'}</span></span>
          </div>
        </div>

        {onExploreLessons && (
          <div className="pt-2 flex justify-end border-t border-[var(--mousa-border-sand)]/60">
            <button
              onClick={onExploreLessons}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[var(--mousa-gold)]/20 to-[var(--mousa-teal)]/20 hover:from-[var(--mousa-gold)]/30 hover:to-[var(--mousa-teal)]/30 text-[var(--mousa-teal-deep)] dark:text-[var(--mousa-gold-light)] font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-[var(--mousa-border-sand)] shadow-2xs active:scale-95"
            >
              <span>🗺️</span>
              <span>{isAr ? 'عرض خريطة مسيرة الأنبا موسى' : 'View Journey Roadmap'}</span>
              <ChevronRight size={13} className={isAr ? 'rotate-180' : ''} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
