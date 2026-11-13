import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Star, BookOpen, ChevronRight, ChevronLeft, Sparkles, AlertCircle, Info, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getCopticDate, 
  COPTIC_MONTHS, 
  COPTIC_FEASTS, 
  CopticFeast, 
  CopticDateResult 
} from '../../data/copticCalendarData';
import { Language } from '../../types';

export function CopticCalendarTab({ lang }: { lang: Language }) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [copticDate, setCopticDate] = useState<CopticDateResult>(getCopticDate(new Date()));
  const [activeFilter, setActiveFilter] = useState<'all' | 'feasts' | 'fasts'>('all');

  // Real-time countdown calculation
  const [timeRemaining, setTimeRemaining] = useState<Record<string, { days: number; hours: number; minutes: number }>>({});

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const updated: Record<string, { days: number; hours: number; minutes: number }> = {};

      COPTIC_FEASTS.forEach((feast) => {
        let target = feast.targetDateThisYear(currentYear);
        if (target.getTime() < now.getTime() - 86400000) {
          // If already passed this year, point to next year
          target = feast.targetDateThisYear(currentYear + 1);
        }

        const diffMs = target.getTime() - now.getTime();
        if (diffMs <= 0) {
          updated[feast.id] = { days: 0, hours: 0, minutes: 0 };
        } else {
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
          updated[feast.id] = { days, hours, minutes };
        }
      });

      setTimeRemaining(updated);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // every minute
    return () => clearInterval(interval);
  }, []);

  const changeDateByDays = (delta: number) => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + delta);
    setCurrentDate(next);
    const newCoptic = getCopticDate(next);
    setCopticDate(newCoptic);
  };

  const filteredFeasts = COPTIC_FEASTS.filter(f => {
    if (activeFilter === 'feasts') return f.type === 'major_feast' || f.type === 'minor_feast';
    if (activeFilter === 'fasts') return f.type === 'fast';
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="pb-28 pt-6 px-4 w-full max-w-7xl mx-auto space-y-8"
    >
      {/* Page Header with Coptic Date Banner */}
      <div className="bg-linear-to-br from-[var(--color-church-burgundy)] via-[#701622] to-[#0B2E5C] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 text-white pointer-events-none transform translate-x-10 -translate-y-10">
          <Calendar size={260} />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-bold mb-3">
            <Sparkles size={14} className="text-amber-300" />
            <span>{lang === 'ar' ? 'التقويم القبطي الكنسي وسنكسار الشهداء' : 'Coptic Orthodox Ecclesiastical Calendar'}</span>
          </div>

          <div className="flex flex-wrap items-baseline gap-3 mb-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-amber-300">
              {lang === 'ar' ? copticDate.formattedAr : copticDate.formattedEn}
            </h1>
            <span className="text-lg font-bold text-amber-100 opacity-90">
              ({copticDate.month.nameCopt})
            </span>
          </div>

          <p className="text-sm sm:text-base text-gray-200 leading-relaxed max-w-2xl font-medium">
            {lang === 'ar' 
              ? `شهر ${copticDate.month.nameAr}: ${copticDate.month.seasonAr}. التقويم المعتمد في طقوس وألحان وأعياد الكنيسة القبطية الأرثوذكسية عبر القرون.`
              : `Month of ${copticDate.month.nameEn}: ${copticDate.month.seasonEn}. Preserving the ancient apostolic calendar and liturgical rites.`}
          </p>

          {/* Quick Date Stepper to browse any day */}
          <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/15">
            <span className="text-xs text-gray-300 font-bold">{lang === 'ar' ? 'تاريخ النهارده الميلادي:' : 'Gregorian:'}</span>
            <button
              onClick={() => changeDateByDays(-1)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="اليوم السابق"
            >
              <ChevronRight size={18} />
            </button>
            <span className="text-xs sm:text-sm font-bold bg-white/20 px-3 py-1 rounded-lg">
              {currentDate.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
            <button
              onClick={() => changeDateByDays(1)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="اليوم التالي"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => {
                const now = new Date();
                setCurrentDate(now);
                const curCoptic = getCopticDate(now);
                setCopticDate(curCoptic);
              }}
              className="text-xs font-bold text-amber-300 hover:text-white underline ml-auto mr-0 px-2 py-1"
            >
              {lang === 'ar' ? 'ارجع لنهارده' : 'Today'}
            </button>
          </div>
        </div>
      </div>

      {/* Coptic Feasts & Fasting Countdown Engine */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-church-blue)] dark:text-amber-200 flex items-center gap-2">
              <Clock className="text-amber-500" size={24} />
              <span>{lang === 'ar' ? 'العد التنازلي للأعياد والأصوام الجاية' : 'Feasts & Fasting Countdown'}</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {lang === 'ar' ? 'تابع فاضل قد إيه على الأعياد والأصوام بالأيام والساعات والدقايق، واعرف طقوسها وقواعد الصيام.' : 'Live countdown with liturgical tones and fasting regulations'}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeFilter === 'all' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'}`}
            >
              {lang === 'ar' ? 'الكل' : 'All'}
            </button>
            <button
              onClick={() => setActiveFilter('feasts')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeFilter === 'feasts' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'}`}
            >
              {lang === 'ar' ? 'الأعياد الكنسية' : 'Feasts'}
            </button>
            <button
              onClick={() => setActiveFilter('fasts')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeFilter === 'fasts' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'}`}
            >
              {lang === 'ar' ? 'الأصوام المقدسة' : 'Fasts'}
            </button>
          </div>
        </div>

        {/* Feasts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFeasts.map((feast) => {
            const time = timeRemaining[feast.id] || { days: 0, hours: 0, minutes: 0 };
            const isToday = time.days === 0 && time.hours === 0 && time.minutes === 0;

            return (
              <div
                key={feast.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-amber-200/60 dark:border-slate-800 shadow-sm hover:border-amber-400 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Tone and Type Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      feast.type === 'fast' 
                        ? 'bg-red-50 text-[var(--color-church-burgundy)] border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900' 
                        : 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {feast.toneNameAr}
                    </span>
                    <span className="text-xs font-bold text-gray-400">
                      {feast.copticDateAr}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-[var(--color-church-blue)] dark:text-amber-200 mb-1 leading-snug">
                    {lang === 'ar' ? feast.nameAr : feast.nameEn}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                    {lang === 'ar' ? feast.descriptionAr : feast.descriptionEn}
                  </p>

                  {/* Fasting Guideline Pill */}
                  <div className="mb-4 p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/70 border border-gray-100 dark:border-slate-700 text-xs">
                    <span className="font-bold text-gray-700 dark:text-gray-300 block mb-0.5">
                      {lang === 'ar' ? 'قواعد الصوم والأكل:' : 'Dietary Fasting Rule:'}
                    </span>
                    <span className={feast.isFishPermitted ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-rose-700 dark:text-rose-400 font-semibold'}>
                      {lang === 'ar' ? feast.fastingRuleAr : feast.fastingRuleEn}
                    </span>
                  </div>
                </div>

                {/* Live Countdown Clock Badge */}
                <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">
                    {lang === 'ar' ? 'فاضل:' : 'Time Left:'}
                  </span>
                  {isToday ? (
                    <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-extrabold text-xs animate-pulse">
                      {lang === 'ar' ? 'النهارده بنحتفل بالعيد!' : 'Celebrating Today!'}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 font-bold text-sm">
                      <span className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200">
                        {time.days} <span className="text-[10px] opacity-70">{lang === 'ar' ? 'يوم' : 'd'}</span>
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200">
                        {time.hours} <span className="text-[10px] opacity-70">{lang === 'ar' ? 'ساعة' : 'h'}</span>
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200">
                        {time.minutes} <span className="text-[10px] opacity-70">{lang === 'ar' ? 'د' : 'm'}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coptic Months Overview */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-amber-200/60 dark:border-slate-800 shadow-sm">
        <h3 className="text-lg sm:text-xl font-bold text-[var(--color-church-blue)] dark:text-amber-200 mb-4 flex items-center gap-2">
          <span>{lang === 'ar' ? 'شهور السنة القبطية الـ١٣' : 'The 13 Coptic Months'}</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {COPTIC_MONTHS.map((m) => (
            <div
              key={m.number}
              className={`p-3.5 rounded-2xl border transition-all ${
                copticDate.month.number === m.number
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                  : 'bg-gray-50 dark:bg-slate-800/60 text-gray-800 dark:text-gray-200 border-gray-200/60 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold opacity-80">#{m.number}</span>
                <span className="text-xs font-extrabold">{m.daysCount} {lang === 'ar' ? 'يوم' : 'days'}</span>
              </div>
              <h4 className="font-bold text-base">{lang === 'ar' ? m.nameAr : m.nameEn}</h4>
              <p className="text-[11px] opacity-80 mt-0.5">{m.nameCopt}</p>
              <p className="text-[10px] opacity-70 mt-1 line-clamp-1">{lang === 'ar' ? m.seasonAr : m.seasonEn}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
