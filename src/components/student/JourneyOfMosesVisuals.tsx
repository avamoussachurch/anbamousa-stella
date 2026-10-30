import React, { useState, useEffect } from 'react';
import { Flame, Star, Trophy, Sparkles, Compass, MapPin, CheckCircle2, ChevronRight, Shield, Sun, Moon, Sunrise, Clock, BookOpen, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { Language } from '../../types';

interface DuneHeroBannerProps {
  studentName: string;
  stageName?: string;
  stageIcon?: string;
  isTeacher?: boolean;
  isParent?: boolean;
  lang: Language;
  avatarUrl?: string;
  streakDays: number;
  totalPoints: number;
  onNavigatePoints?: () => void;
}

/**
 * Illustrated Hero Banner for "The Journey of Moses" (رحلة القديس الأنبا موسى)
 * Featuring Scetis desert dunes, sunrise gold, ancient Coptic monastery silhouette, and traveler trail.
 */
export const MosesDuneHeroBanner: React.FC<DuneHeroBannerProps> = ({
  studentName,
  stageName,
  stageIcon,
  isTeacher,
  isParent,
  lang,
  avatarUrl,
  streakDays,
  totalPoints,
  onNavigatePoints
}) => {
  const isAr = lang === 'ar';
  const isCop = lang === 'copt' || lang === 'cop';

  // Determine playful journey title based on points and streak
  const getTravelerTitle = () => {
    if (isTeacher) {
      return isCop ? 'Ⲡⲓⲇⲓⲁⲕⲟⲛ ⲙ̀ⲡⲓⲙⲱⲓⲧ' : isAr ? 'مرشد القافلة وخادم البرية' : 'Caravan Guide & Servant';
    }
    if (isParent) {
      return isCop ? 'Ⲡⲓⲓⲱⲧ ⲛ̀ⲧⲉ ⲡⲓⲏⲓ' : isAr ? 'راعي الأسرة ومسافر المحبة' : 'Family Shepherd & Guardian';
    }
    if (totalPoints >= 500) {
      return isCop ? 'Ⲡⲓⲅⲉⲛⲛⲉⲟⲥ ⲛ̀ϣⲓⲏⲧ' : isAr ? 'فارس برية شيهيت 🛡️' : 'Scetis Desert Champion 🛡️';
    }
    if (totalPoints >= 200 || streakDays >= 3) {
      return isCop ? 'Ⲡⲓⲙⲱⲓⲧ ⲛ̀ⲧⲉ ⲡⲓⲟⲩⲱⲓⲛⲓ' : isAr ? 'مسافر النور والبركة 🌅' : 'Traveler of Light 🌅';
    }
    return isCop ? 'Ⲡⲓⲥⲁⲃⲉ ⲛ̀ⲃⲉⲣⲓ' : isAr ? 'مستكشف طريق الإيمان 🧭' : 'Faith Explorer 🧭';
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-[var(--mousa-border-sand)] bg-gradient-to-b from-[#FAF5EB] via-[#F6EFE1] to-[#EBDCC6] dark:from-[#1C1814] dark:via-[#25201A] dark:to-[#332B22] p-5 sm:p-7 shadow-md transition-all">
      {/* Background Illustrated Desert SVG: Layered Dunes, Sunrise Rays & Coptic Monastery Silhouette */}
      <svg
        className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-40 dark:opacity-20 select-none"
        viewBox="0 0 1000 320"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="mousaSun" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F6C45E" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#E5A638" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="duneBack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E5C79E" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#C7A279" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="duneFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F4DEC3" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#DEC4A6" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        {/* Sunrise Orb */}
        <circle cx="820" cy="90" r="85" fill="url(#mousaSun)" />
        <circle cx="820" cy="90" r="125" fill="#F6C45E" fillOpacity="0.08" />

        {/* Monastery of Scetis Silhouette on the Horizon */}
        <g opacity="0.35" fill="#7F5E3B">
          <rect x="740" y="80" width="36" height="42" rx="2" />
          <rect x="782" y="65" width="28" height="57" rx="3" />
          <path d="M796 50 L796 65 M791 57 L801 57" stroke="#7F5E3B" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="758" cy="92" r="3" fill="#FAF5EB" />
          <rect x="748" y="104" width="20" height="18" rx="8" fill="#FAF5EB" />
        </g>

        {/* Distant Dunes */}
        <path
          d="M0 210 C160 170 330 230 520 185 C680 148 830 195 1000 160 L1000 320 L0 320 Z"
          fill="url(#duneBack)"
        />

        {/* Foreground Sand Dunes */}
        <path
          d="M0 245 C180 205 390 270 600 220 C770 180 890 230 1000 200 L1000 320 L0 320 Z"
          fill="url(#duneFront)"
        />

        {/* Dotted Caravan Trail in the Sand */}
        <path
          d="M40 295 Q 260 270 480 280 T 940 245"
          stroke="#C68B23"
          strokeWidth="3"
          strokeDasharray="6 8"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>

      {/* Decorative Coptic Cross Watermark */}
      <div className="absolute top-2 left-3 sm:left-6 opacity-15 dark:opacity-10 text-[var(--mousa-gold-dark)] pointer-events-none select-none">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2v20M2 12h20M7 7l10 10M17 7L7 17" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-2.5 max-w-2xl">
          {/* Journey Header & Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide bg-[#144E5B] text-white shadow-xs">
              <Compass size={13} className="text-[#F6C45E]" />
              <span>{isCop ? 'Ⲡⲓⲙⲱⲓⲧ ⲛ̀ⲧⲉ Ⲙⲱⲩⲥⲏⲥ' : isAr ? 'رحلة الأنبا موسى' : 'The Journey of Moses'}</span>
            </span>

            {stageName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.8 rounded-full text-xs font-bold bg-[var(--mousa-gold)]/15 text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)] border border-[var(--mousa-gold)]/30">
                <span>{stageIcon || '⛪'}</span>
                <span>{stageName}</span>
              </span>
            )}

            {isTeacher && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300">
                <span>⛪</span>
                <span>{isAr ? 'خادم كنسي' : 'Servant'}</span>
              </span>
            )}

            {isParent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300">
                <span>👨‍👩‍👧</span>
                <span>{isAr ? 'ولي أمر' : 'Parent'}</span>
              </span>
            )}
          </div>

          {/* Student Welcome & Traveler Title */}
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] tracking-tight">
              {isCop ? 'Ⲭⲉⲣⲉ' : isAr ? 'يا أهلاً' : 'Welcome'}, {studentName.split(' ')[0]} 👋
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm sm:text-base font-extrabold text-[var(--mousa-coral)] dark:text-[var(--mousa-coral-glow)]">
                {getTravelerTitle()}
              </span>
              <span className="text-xs text-[var(--mousa-sand-600)] dark:text-[#D5C7B5] hidden sm:inline font-bold">
                • {isCop ? 'ϧⲉⲛ ϯϣⲁϥⲉ ⲉ̀ⲡⲓⲟⲩⲱⲓⲛⲓ' : isAr ? 'من البرية إلى القداسة والنور' : 'Walking in grace and wisdom'}
              </span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[var(--mousa-teal-deep)] dark:text-[#E8DAC8] font-bold leading-relaxed max-w-xl">
            {isTeacher
              ? (isCop ? 'Ⲡⲓⲥⲙⲟⲩ ⲛ̀ⲧⲉ ϯⲇⲓⲁⲕⲟⲛⲓⲁ ⲛⲉⲙⲁⲕ ⲙ̀ⲫⲟⲟⲩ' : isAr ? 'بركة الخدمة والتعليم ترشد خطواتك وأولادك اليوم في طريق المحبة.' : 'Blessings on your ministry & guiding the children today.')
              : (isCop ? 'Ⲁⲕⲥⲉⲃⲧⲱⲧ ⲉ̀ⲡⲓⲙⲱⲓⲧ ⲛ̀ⲧⲉ ⲡⲓⲛⲁϩϯ ⲙ̀ⲫⲟⲟⲩ;' : isAr ? 'خطوة جديدة في برية الإيمان.. جهز قلبك لمحطة اليوم لتكسب نقاط البركة!' : 'Another step in faith & courage. Ready for today’s milestone?')}
          </p>
        </div>

        {/* Student Avatar with Desert Golden Aura */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end md:self-center">
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-[82px] rounded-xl border border-[var(--mousa-coral)]/30 bg-white/70 dark:bg-[#1A1713]/75 px-2.5 py-2 text-center">
              <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-[var(--mousa-coral-dark)] dark:text-[var(--mousa-coral-glow)]">
                <Flame size={12} />
                {isCop ? 'Ⲭⲣⲱⲙ ⲛ̀ⲥⲃⲱ' : isAr ? 'المواظبة' : 'Streak'}
              </span>
              <span className="mt-0.5 block text-lg font-black leading-tight text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
                {streakDays} <span className="text-[10px] font-bold">{isCop ? 'Ⲛ̀ⲉϩⲟⲟⲩ' : isAr ? 'يوم' : 'days'}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={onNavigatePoints}
              className="min-w-[82px] rounded-xl border border-[var(--mousa-gold)]/40 bg-white/70 dark:bg-[#1A1713]/75 px-2.5 py-2 text-center transition-colors hover:bg-[var(--mousa-gold-soft)] dark:hover:bg-[#30271A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mousa-gold)]"
              aria-label={isCop
                ? `Ⲛⲁⲕ ${totalPoints} ⲧⲁⲓⲟ`
                : isAr
                  ? `رصيدك ${totalPoints} نقطة، افتح النقاط والمكافآت`
                  : `You have ${totalPoints} points. Open points and rewards`}
            >
              <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)]">
                <Star size={12} />
                {isCop ? 'Ⲡⲓⲧⲁⲓⲟ' : isAr ? 'النقاط' : 'Points'}
              </span>
              <span className="mt-0.5 block text-lg font-black leading-tight text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
                {totalPoints}{isCop && <span className="text-[10px]"> ⲧⲁⲓⲟ</span>}
              </span>
            </button>
          </div>
          <div className="relative group">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[var(--mousa-gold)] via-[var(--mousa-coral)] to-[var(--mousa-teal)] opacity-70 blur-xs group-hover:opacity-100 transition-opacity"></div>
            <img
              src={avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
              alt={studentName}
              className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full border-3 border-white dark:border-[#2C241D] bg-white shadow-md object-cover"
            />
            <div className="absolute -bottom-1 -right-1 bg-[var(--mousa-gold)] text-[var(--mousa-teal-deep)] p-1 rounded-full border border-white dark:border-[#2C241D] shadow-xs">
              <Sparkles size={13} className="fill-current" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StreakCardProps {
  streakDays: number;
  lang: Language;
}

/**
 * Illustrated "شعلة السعي" (Desert Flame Streak Card)
 */
export const MosesStreakCard: React.FC<StreakCardProps> = ({ streakDays, lang }) => {
  const isAr = lang === 'ar';
  const isCop = lang === 'copt' || lang === 'cop';

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-[var(--mousa-border-sand)] bg-gradient-to-br from-[#FFFDF9] via-[#FAF5EB] to-[#F2E8D5] dark:from-[#221C16] dark:via-[#25201A] dark:to-[#1C1814] p-4 sm:p-5 shadow-xs hover:border-[var(--mousa-coral)] transition-all">
      {/* Background Soft Glow */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-[var(--mousa-coral)]/10 blur-xl pointer-events-none"></div>

      <div className="flex items-center gap-3.5 relative z-10">
        <div className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[var(--mousa-coral-soft)] to-[var(--mousa-gold-soft)] border border-[var(--mousa-coral)]/30 text-[var(--mousa-coral)] shadow-xs shrink-0">
          <Flame size={28} className="fill-[var(--mousa-coral)] drop-shadow-xs" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--mousa-coral)] opacity-60"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--mousa-coral)]"></span>
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--mousa-coral-dark)] dark:text-[var(--mousa-coral-glow)] uppercase tracking-wider">
              {isCop ? 'Ⲭⲣⲱⲙ ⲛ̀ⲥⲃⲱ' : isAr ? 'شعلة المواظبة' : 'Faith Streak'}
            </span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-[var(--mousa-coral)]/15 text-[var(--mousa-coral)]">
              {streakDays > 0 ? (isAr ? 'مشتعلة' : 'Active') : (isAr ? 'ابدأ اليوم' : 'Start')}
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-2xl sm:text-3xl font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
              {streakDays}
            </span>
            <span className="text-xs sm:text-sm font-bold text-[var(--mousa-sand-500)] dark:text-[var(--mousa-sand-400)]">
              {isCop ? 'Ⲛ̀ⲉϩⲟⲟⲩ' : isAr ? 'أيام متتالية' : 'Days'}
            </span>
          </div>
          <p className="text-[11px] text-[var(--mousa-sand-500)] dark:text-[var(--mousa-sand-400)] truncate mt-0.5">
            {streakDays >= 3
              ? (isAr ? 'عاش يا بطل! نورك بيزيد كل يوم.' : 'Burning bright in Scetis!')
              : (isAr ? 'واظب يومياً لتحافظ على الشعلة.' : 'Keep the desert flame alive!')}
          </p>
        </div>
      </div>
    </div>
  );
};

interface PointsTreasuryCardProps {
  points: number;
  onNavigatePoints: () => void;
  lang: Language;
}

/**
 * Illustrated "كنز النقاط" (Treasury Card with Sunrise Gold)
 */
export const MosesPointsTreasuryCard: React.FC<PointsTreasuryCardProps> = ({
  points,
  onNavigatePoints,
  lang
}) => {
  const isAr = lang === 'ar';
  const isCop = lang === 'copt' || lang === 'cop';

  return (
    <div
      onClick={onNavigatePoints}
      className="relative overflow-hidden rounded-2xl border-2 border-[var(--mousa-border-sand)] bg-gradient-to-br from-[#FFFDF9] via-[#FAF5EB] to-[#F2E8D5] dark:from-[#221C16] dark:via-[#25201A] dark:to-[#1C1814] p-4 sm:p-5 shadow-xs hover:border-[var(--mousa-gold)] transition-all cursor-pointer group"
    >
      {/* Background Soft Glow */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-[var(--mousa-gold)]/15 blur-xl pointer-events-none"></div>

      <div className="flex items-center gap-3.5 relative z-10">
        <div className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[var(--mousa-gold-soft)] to-[#EBDCC6] border border-[var(--mousa-gold)]/30 text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)] shadow-xs shrink-0 group-hover:scale-105 transition-transform">
          <Star size={28} className="fill-[var(--mousa-gold)] drop-shadow-xs" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)] uppercase tracking-wider">
              {isCop ? 'Ⲡⲓⲧⲁⲓⲟ ⲛ̀ⲧⲉ ⲡⲓⲙⲱⲓⲧ' : isAr ? 'كنز البركة' : 'Blessing Points'}
            </span>
            <span className="text-[10px] font-extrabold flex items-center gap-0.5 text-[var(--mousa-teal)] dark:text-[var(--mousa-teal-glow)] group-hover:translate-x-0.5 transition-transform">
              <span>{isAr ? 'المتجر' : 'Store'}</span>
              <ChevronRight size={12} />
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-2xl sm:text-3xl font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
              {points}
            </span>
            <span className="text-xs sm:text-sm font-bold text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)]">
              {isCop ? 'ⲧⲁⲓⲟ' : isAr ? 'نقطة' : 'pts'}
            </span>
          </div>
          <p className="text-[11px] text-[var(--mousa-sand-500)] dark:text-[var(--mousa-sand-400)] truncate mt-0.5">
            {isAr ? 'استبدلها بهدايا كنسية وأيقونات الأحد.' : 'Redeem for church icons & gifts.'}
          </p>
        </div>
      </div>
    </div>
  );
};

interface JourneyTrailProps {
  currentStreak: number;
  totalPoints: number;
  completedLessonsCount?: number;
  totalLessonsCount?: number;
  activeNextMilestoneIndex?: number;
  lang: Language;
}

/**
 * Illustrated 5-Milestone Journey Trail ("محطات طريق البرية")
 * Determines the next available lesson node using authoritative completion state.
 * Applies a restrained CSS pulse animation in mousa-gold (mousa-node-pulse-gold)
 * to the next available node only, keeping completed, locked, and current nodes clearly distinguishable.
 */
export const MosesJourneyTrail: React.FC<JourneyTrailProps> = ({
  currentStreak,
  totalPoints,
  completedLessonsCount = 0,
  totalLessonsCount = 5,
  activeNextMilestoneIndex,
  lang
}) => {
  const isAr = lang === 'ar';
  const isCop = lang === 'copt' || lang === 'cop';

  // Authoritatively calculate the next available milestone index (0 to 4)
  const activeIndex = activeNextMilestoneIndex !== undefined 
    ? activeNextMilestoneIndex 
    : Math.min(4, Math.max(0, completedLessonsCount));

  const milestones = [
    {
      id: 1,
      titleAr: 'بئر البداية',
      titleEn: 'Wilderness Well',
      titleCop: 'Ⲡⲓϣⲱⲧ',
      descAr: 'أولى خطوات المعرفة ونور الإيمان',
      descEn: 'First steps of faith and knowledge',
      icon: '💧',
    },
    {
      id: 2,
      titleAr: 'ينبوع الكلمة',
      titleEn: 'Fountain of the Word',
      titleCop: 'Ϯⲡⲏⲅⲏ',
      descAr: 'حفظ الآيات وقصص الإنجيل',
      descEn: 'Memorizing verses & Scripture stories',
      icon: '📜',
    },
    {
      id: 3,
      titleAr: 'صخرة الثبات',
      titleEn: 'Rock of Steadfastness',
      titleCop: 'Ϯⲡⲉⲧⲣⲁ',
      descAr: 'صلاة الأجبية ومواظبة الأيام',
      descEn: 'Daily Agpeya prayers & perseverance',
      icon: '⛰️',
    },
    {
      id: 4,
      titleAr: 'نخلة الشجاعة',
      titleEn: 'Palm of Courage',
      titleCop: 'Ϯⲃⲉⲛⲓ',
      descAr: 'قوة الأنبا موسى في التوبة والمحبة',
      descEn: 'Strength of St. Moses in repentance',
      icon: '🌴',
    },
    {
      id: 5,
      titleAr: 'دير القديسين',
      titleEn: 'Monastery of Saints',
      titleCop: 'Ⲡⲓⲙⲟⲛⲁⲥⲧⲏⲣⲓⲟⲛ',
      descAr: 'إكليل المحبة وقمة الإيمان الكنسي',
      descEn: 'Crown of love & summit of Scetis',
      icon: '⛪',
    }
  ];

  return (
    <div className="rounded-3xl border-2 border-[var(--mousa-border-sand)] bg-[var(--mousa-cream-surface)] dark:bg-[#1C1814] p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--mousa-border-sand)]/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[var(--mousa-teal)] text-white shadow-xs">
            <MapPin size={20} className="text-[var(--mousa-gold-glow)]" />
          </div>
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
              {isCop ? 'Ⲛⲓⲙⲁⲛ̀ⲥⲉⲙⲛⲓ ⲛ̀ⲧⲉ ⲡⲓⲙⲱⲓⲧ' : isAr ? 'محطات طريق البرية' : 'Wilderness Journey Milestones'}
            </h3>
            <p className="text-xs text-[var(--mousa-sand-600)] dark:text-[#D5C7B5] font-medium">
              {isAr ? 'تقدمك في مسيرة الأنبا موسى الروحية مع كل درس ومواظبة' : 'Your steps along the path of faith and virtue'}
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1 rounded-full text-xs font-black bg-[var(--mousa-gold)]/15 text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)] border border-[var(--mousa-gold)]/40">
          <Shield size={13} />
          <span>{isAr ? 'مسيرة مستمرة' : 'Active Trail'}</span>
        </span>
      </div>

      {/* Responsive Horizontal / Vertical Milestone Step Track */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
        {milestones.map((m, idx) => {
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const isLocked = idx > activeIndex;

          return (
            <div
              key={m.id}
              className={`relative rounded-2xl p-3 border transition-all flex flex-col items-center text-center ${
                isCurrent
                  ? 'bg-gradient-to-b from-[#FFFDF9] via-[#FAF3E5] to-[#F5ECE0] dark:from-[#2B2313] dark:via-[#292219] dark:to-[#221C16] border-[var(--mousa-gold)] shadow-md scale-102 ring-2 ring-[var(--mousa-gold)]/50 mousa-node-pulse-gold z-10'
                  : isCompleted
                  ? 'bg-[#FDFBF7] dark:bg-[#1E1914] border-emerald-400/50 dark:border-emerald-700/60 shadow-2xs'
                  : 'bg-stone-50 dark:bg-stone-900/40 border-stone-200 dark:border-stone-800 opacity-60'
              }`}
            >
              {/* Station Badge Marker */}
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl mb-2 shadow-2xs transition-all ${
                  isCurrent
                    ? 'bg-gradient-to-br from-[var(--mousa-gold)] to-[var(--mousa-gold-dark)] text-white ring-2 ring-white dark:ring-stone-800 shadow-md scale-110'
                    : isCompleted
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-stone-800 dark:text-[#FAF5EB]'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-400'
                }`}
              >
                <span>{m.icon}</span>
              </div>

              <div className="space-y-0.5 w-full">
                <span className={`text-[10px] font-black block ${
                  isCurrent 
                    ? 'text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)]' 
                    : isCompleted
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-[var(--mousa-sand-500)] dark:text-[#C5B5A0]'
                }`}>
                  {isCurrent 
                    ? (isAr ? 'المحطة القادمة ⏳' : 'Next Available')
                    : isCompleted 
                    ? (isAr ? 'تم الإنجاز ✅' : 'Completed') 
                    : (isAr ? `المحطة ${idx + 1}` : `Stage ${idx + 1}`)}
                </span>
                <h4 className="font-extrabold text-xs text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] leading-tight">
                  {isCop ? m.titleCop : isAr ? m.titleAr : m.titleEn}
                </h4>
                <p className="text-[10px] text-[var(--mousa-sand-600)] dark:text-[#D5C7B5] hidden sm:block line-clamp-1 font-medium">
                  {isAr ? m.descAr : m.descEn}
                </p>
              </div>

              {isCompleted ? (
                <div className="mt-2 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[10px] font-bold">
                  <CheckCircle2 size={13} className="fill-emerald-100 dark:fill-emerald-950" />
                  <span>{isAr ? 'منجز' : 'Done'}</span>
                </div>
              ) : isCurrent ? (
                <div className="mt-2 text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)] text-[10px] font-black">
                  <span>{isAr ? 'ابدأ الآن' : 'Start'}</span>
                </div>
              ) : (
                <div className="mt-2 text-stone-400 text-[10px] font-medium">
                  <span>🔒 {isAr ? 'مغلق' : 'Locked'}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface MosesJourneyBadgeProps {
  completedLessonsCount: number;
  lastCompletedLessonTitle?: string;
  pointsEarned?: number;
  lang: Language;
  onExploreMore?: () => void;
  onDismiss?: () => void;
  isRecentCompletion?: boolean;
}

/**
 * The Journey of Moses: "Journey Badge" (وسام رحلة القديس الأنبا موسى)
 * Renders an illustrated celebratory badge using `var(--mousa-gold)` and `var(--mousa-coral)` tokens.
 * Displayed on the student dashboard when a lesson, task, or milestone is completed.
 */
export const MosesJourneyBadge: React.FC<MosesJourneyBadgeProps> = ({
  completedLessonsCount,
  lastCompletedLessonTitle,
  pointsEarned = 50,
  lang,
  onExploreMore,
  onDismiss,
  isRecentCompletion = true
}) => {
  const isAr = lang === 'ar';
  const isCop = lang === 'copt' || lang === 'cop';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-3xl border-2 border-[var(--mousa-gold)] bg-gradient-to-br from-[#FFFDF9] via-[#FAF3E5] to-[#F7E7D0] dark:from-[#251E17] dark:via-[#2F241A] dark:to-[#38281A] p-5 sm:p-6 shadow-md"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Radiant Golden-Coral Background Glows */}
      <div 
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none blur-3xl opacity-35"
        style={{ backgroundColor: 'var(--mousa-coral)' }}
      />
      <div 
        className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full pointer-events-none blur-3xl opacity-30"
        style={{ backgroundColor: 'var(--mousa-gold)' }}
      />

      {/* Decorative Coptic Pattern SVG Border Accent */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-10 select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <pattern id="mousaCrossPattern" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M20 5 L20 35 M5 20 L35 20" stroke="var(--mousa-gold)" strokeWidth="1" />
          <circle cx="20" cy="20" r="3" fill="var(--mousa-coral)" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#mousaCrossPattern)" />
      </svg>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5">
        {/* Left/Start: Medallion Visual with Gold and Coral Ribbons */}
        <div className="flex items-center gap-4.5 self-start sm:self-center">
          <div className="relative shrink-0">
            {/* Pulsing Aura */}
            <div 
              className="absolute inset-0 rounded-2xl animate-pulse blur-md opacity-60"
              style={{ background: 'linear-gradient(135deg, var(--mousa-gold) 0%, var(--mousa-coral) 100%)' }}
            />
            {/* Badge Medallion Frame */}
            <div 
              className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-1 shadow-lg flex items-center justify-center transition-transform hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, var(--mousa-gold) 0%, var(--mousa-gold-light) 40%, var(--mousa-coral) 100%)',
                border: '2px solid var(--mousa-gold-glow)'
              }}
            >
              <div className="w-full h-full rounded-xl bg-[#261E16] dark:bg-[#1A140F] flex flex-col items-center justify-center text-center p-1">
                <Trophy size={26} className="text-[var(--mousa-gold-glow)] filter drop-shadow-sm mb-0.5" />
                <span className="text-[9px] font-black uppercase tracking-wider text-[var(--mousa-coral-glow)]">
                  {isCop ? 'Ⲁⲝⲓⲟⲥ' : isAr ? 'مبارك' : 'AXIOS'}
                </span>
              </div>
            </div>

            {/* Coral Ribbon Bookmark Notch */}
            <div 
              className="absolute -bottom-2 inset-x-3 h-3 rounded-b-md shadow-xs flex items-center justify-center"
              style={{ backgroundColor: 'var(--mousa-coral)' }}
            >
              <span className="text-[8px] font-black text-white leading-none">★ ★ ★</span>
            </div>
          </div>

          {/* Badge Copy & Congratulatory Text */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span 
                className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide text-white shadow-2xs inline-flex items-center gap-1"
                style={{ backgroundColor: 'var(--mousa-coral)' }}
              >
                <Sparkles size={11} />
                <span>{isCop ? 'Ⲡⲓⲕⲗⲟⲙ ⲛ̀ⲧⲉ ⲡⲓⲙⲱⲓⲧ' : isAr ? 'وسام رحلة الأنبا موسى' : 'Journey Milestone Badge'}</span>
              </span>

              <span 
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 shadow-2xs"
                style={{
                  backgroundColor: 'var(--mousa-gold-soft)',
                  color: 'var(--mousa-gold-dark)',
                  borderColor: 'var(--mousa-gold)'
                }}
              >
                <Star size={11} className="fill-current text-[var(--mousa-gold)]" />
                <span>+{pointsEarned} {isAr ? 'نقطة بركة مكتسبة' : 'blessing points'}</span>
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black leading-tight text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
              {isRecentCompletion
                ? (isCop
                    ? `Ⲁⲕϫⲱⲕ ⲉ̀ⲃⲟⲗ: ${lastCompletedLessonTitle || 'Ϯⲥⲃⲱ ⲙ̀ⲫⲟⲟⲩ'}`
                    : isAr
                      ? `أحسنت! أتممت محطة: ${lastCompletedLessonTitle || 'درس اليوم بنجاح'}`
                      : `Great job! Completed: ${lastCompletedLessonTitle || "Today's Milestone"}`)
                : (isCop
                    ? `Ⲁⲕϫⲱⲕ ⲉ̀ⲃⲟⲗ ⲛ̀${completedLessonsCount} ⲛ̀ⲥⲃⲱ ϧⲉⲛ ⲡⲓⲙⲱⲓⲧ`
                    : isAr
                      ? `بطل شجاع! أتممت ${completedLessonsCount} محطات في مسيرة الأنبا موسى`
                      : `Champion! You have completed ${completedLessonsCount} milestones in the Journey of Moses`)}
            </h3>

            <p className="text-xs text-[var(--mousa-sand-600)] dark:text-[#E2D5C4] leading-relaxed max-w-xl font-medium">
              {isAr
                ? '«كُونُوا مُثَبَّتِينَ، غَيْرَ مُتَزَعْزِعِينَ، مُتَفَاضِلِينَ فِي عَمَلِ الرَّبِّ كُلَّ حِينٍ» — كل مهمة تنجزها تضيء لك شمعة في دير القديسين.'
                : '"Be steadfast, immovable, always abounding in the work of the Lord." Each lesson completed lights a lantern on the path of Scetis.'}
            </p>
          </div>
        </div>

        {/* Right/End: Action Buttons */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--mousa-border-sand)]/60">
          {onExploreMore && (
            <button
              onClick={onExploreMore}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-xs transition-transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, var(--mousa-gold) 0%, var(--mousa-coral) 100%)'
              }}
            >
              <span>{isCop ? 'Ⲟⲩⲱϣ ⲉ̀ⲃⲟⲗ' : isAr ? 'تابع الرحلة والدروس' : 'Continue Journey'}</span>
              <ChevronRight size={16} className={isAr ? 'rotate-180' : ''} />
            </button>
          )}

          {onDismiss && (
            <button
              onClick={onDismiss}
              aria-label="Dismiss badge notification"
              className="p-2 rounded-xl text-[var(--mousa-sand-500)] hover:text-[var(--mousa-coral)] hover:bg-[var(--mousa-coral-soft)] transition-colors cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
