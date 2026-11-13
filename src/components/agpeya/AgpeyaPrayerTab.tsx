import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Sun, 
  Moon, 
  Clock, 
  CheckCircle2, 
  Circle,
  BookOpen, 
  Sparkles, 
  Flame, 
  Award, 
  Edit3, 
  Save, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw,
  CloudCheck,
  CheckCheck,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AGPEYA_HOURS, AgpeyaHourData } from '../../data/agpeyaData';
import { useAuth } from '../../context/AuthContext';
import { awardPoints } from '../../lib/pointsService';
import { 
  saveAgpeyaProgressToSupabase, 
  getAgpeyaProgressFromSupabase,
  AgpeyaProgressRecord 
} from '../../lib/supabaseDatabase';
import { Language } from '../../types';

export function AgpeyaPrayerTab({ lang }: { lang: Language }) {
  const { userData, updateUserData } = useAuth();
  const [selectedHourId, setSelectedHourId] = useState<string>('prime');
  const [viewMode, setViewMode] = useState<'guided' | 'full'>('guided');
  const [completedHoursToday, setCompletedHoursToday] = useState<Record<string, boolean>>({});
  const [streakDays, setStreakDays] = useState<number>(4);
  const [personalPrayer, setPersonalPrayer] = useState<string>('');
  const [isSavedPersonal, setIsSavedPersonal] = useState(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  const selectedHour = AGPEYA_HOURS.find(h => h.id === selectedHourId) || AGPEYA_HOURS[0];
  const todayKey = new Date().toISOString().slice(0, 10);

  // Load progress from Supabase & localStorage on mount
  useEffect(() => {
    let isMounted = true;
    async function loadProgress() {
      if (!userData?.id) return;
      setIsSyncing(true);
      const res = await getAgpeyaProgressFromSupabase(userData.id, todayKey);
      if (isMounted) {
        if (res.data) {
          setCompletedHoursToday(res.data.completedHours || {});
          if (res.data.streakDays) setStreakDays(res.data.streakDays);
          if (res.data.personalPrayer) setPersonalPrayer(res.data.personalPrayer);
          setLastSyncedTime(new Date().toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }));
        } else if (typeof window !== 'undefined') {
          // Fallback to local
          const savedChecks = localStorage.getItem(`agpeya_checks_${todayKey}`);
          if (savedChecks) {
            try { setCompletedHoursToday(JSON.parse(savedChecks)); } catch (e) {}
          }
        }
        setIsSyncing(false);
      }
    }
    loadProgress();
    return () => { isMounted = false; };
  }, [userData?.id, todayKey, lang]);

  const toggleHourCompleted = async (hourId: string) => {
    const isNowCompleted = !completedHoursToday[hourId];
    const updated = { ...completedHoursToday, [hourId]: isNowCompleted };
    setCompletedHoursToday(updated);

    // Save to Supabase and resilient local storage
    if (userData?.id) {
      setIsSyncing(true);
      const record: AgpeyaProgressRecord = {
        date: todayKey,
        completedHours: updated,
        streakDays,
        personalPrayer,
        lastUpdated: new Date().toISOString()
      };
      await saveAgpeyaProgressToSupabase(userData.id, record);
      setLastSyncedTime(new Date().toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }));
      setIsSyncing(false);
    }

    if (isNowCompleted && userData) {
      const targetHour = AGPEYA_HOURS.find(h => h.id === hourId);
      const u = awardPoints(userData.id, 25, `صلاة ${targetHour?.nameAr || 'الأجبية'}`);
      updateUserData(u);
    }
  };

  const savePersonalPrayer = async () => {
    setIsSavedPersonal(true);
    if (userData?.id) {
      setIsSyncing(true);
      const record: AgpeyaProgressRecord = {
        date: todayKey,
        completedHours: completedHoursToday,
        streakDays,
        personalPrayer,
        lastUpdated: new Date().toISOString()
      };
      await saveAgpeyaProgressToSupabase(userData.id, record);
      setLastSyncedTime(new Date().toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }));
      setIsSyncing(false);
    } else if (typeof window !== 'undefined') {
      localStorage.setItem('agpeya_personal_intentions', personalPrayer);
    }
    setTimeout(() => setIsSavedPersonal(false), 2500);
  };

  const totalCompleted = Object.values(completedHoursToday).filter(Boolean).length;
  const progressPercent = Math.round((totalCompleted / 7) * 100);

  const daysOfWeek = lang === 'ar' 
    ? ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const currentDayIndex = new Date().getDay();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="pb-28 pt-4 px-3 sm:px-6 w-full max-w-7xl mx-auto space-y-6"
    >
      {/* Header Banner */}
      <div className="bg-linear-to-r from-[#1B365D] via-[#0B2E5C] to-[#8B1E2E] text-white rounded-3xl p-5 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-8 -translate-y-8">
          <BookOpen size={240} />
        </div>

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-bold">
              <Sparkles size={14} className="text-amber-300" />
              <span>{lang === 'ar' ? 'كتاب صلوات السواعي القبطية • الأجبية الأرثوذكسية' : 'The Coptic Agpeya • Canonical Hours'}</span>
            </div>

            {/* Cloud Sync Status */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 border border-white/10 text-[11px] font-semibold text-emerald-300">
              <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              <span>
                {isSyncing 
                  ? (lang === 'ar' ? 'بنحفظ على Supabase...' : 'Syncing to Supabase...')
                  : (lang === 'ar' ? `متزامن مع السحابة ${lastSyncedTime ? `(${lastSyncedTime})` : ''}` : `Synced with Supabase ${lastSyncedTime ? `(${lastSyncedTime})` : ''}`)
                }
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-amber-300 mb-2">
            {lang === 'ar' ? 'صلوات الأجبية ومتابعة صلاتك كل يوم' : 'Daily Agpeya & Prayer Tracker'}
          </h1>
          <p className="text-xs sm:text-base text-gray-200 leading-relaxed max-w-2xl font-medium">
            {lang === 'ar'
              ? '«سَبْعَ مَرَّاتٍ فِي النَّهَارِ سَبَّحْتُكَ عَلَى أَحْكَامِ عَدْلِكَ» (مزمور ١١٩: ١٦٤). رافق الرب في ساعات النهار والليل بالصلاة والشكر.'
              : '"Seven times a day I praise You, because of Your righteous judgments" (Psalm 119:164). Track and deepen your daily prayer life.'}
          </p>
        </div>
      </div>

      {/* Visual Progress Dashboard & Check-off Tracker */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-amber-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[var(--color-church-blue)] dark:text-amber-200 flex items-center gap-2">
              <TrendingUp size={20} className="text-amber-600" />
              <span>{lang === 'ar' ? 'متابعة صلاتك' : 'Personal Prayer Progress Dashboard'}</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {lang === 'ar' ? 'سجّل السواعي اللي صليتها النهارده واكسب نقاط تشجيعية تتحفظ في حسابك.' : 'Check off hours you prayed today to earn points saved to your account'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Streak Counter */}
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-2xl">
              <Flame size={20} className="text-amber-500 fill-amber-500 animate-pulse" />
              <div>
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                  {streakDays} {lang === 'ar' ? 'يوم ورا يوم' : 'Day Streak'}
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400">
                  {lang === 'ar' ? 'مواظبتك على الصلاة' : 'Faithful habit'}
                </span>
              </div>
            </div>

            {/* Total Points Awarded */}
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-2xl">
              <Award size={20} className="text-emerald-600" />
              <div>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 block">
                  +{totalCompleted * 25} {lang === 'ar' ? 'نقطة النهارده' : 'Pts Today'}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                  {lang === 'ar' ? 'بركة الصلاة' : 'Prayer blessings'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center text-xs font-bold mb-2">
            <span className="text-gray-700 dark:text-gray-300">
              {lang === 'ar' ? `الصلوات اللي خلصتها النهارده (${totalCompleted} من ٧)` : `Today's Completed Hours (${totalCompleted} of 7)`}
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-extrabold">{progressPercent}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-gray-200/50 dark:border-slate-700">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"
            />
          </div>
        </div>

        {/* Weekly Consistency Row */}
        <div className="p-3.5 bg-gray-50/70 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">
            <span>{lang === 'ar' ? 'مواظبتك طول الأسبوع:' : 'Weekly Consistency:'}</span>
            <span className="text-[11px] text-amber-700 dark:text-amber-300">{lang === 'ar' ? 'النهارده متحدد' : 'Current day highlighted'}</span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {daysOfWeek.map((day, idx) => {
              const isToday = idx === currentDayIndex;
              const hasPrayed = idx <= currentDayIndex && totalCompleted > 0;
              return (
                <div 
                  key={day}
                  className={`flex flex-col items-center py-2 rounded-xl text-center border transition-all ${
                    isToday
                      ? 'bg-amber-500/15 border-amber-400 text-amber-900 dark:text-amber-200 font-black'
                      : 'bg-white dark:bg-slate-800/80 border-gray-200/60 dark:border-slate-700 text-gray-600 dark:text-gray-400 text-xs'
                  }`}
                >
                  <span className="text-[10px] font-semibold">{day}</span>
                  <div className="mt-1">
                    {hasPrayed ? (
                      <CheckCircle2 size={15} className="text-emerald-500" />
                    ) : (
                      <Circle size={15} className="text-gray-300 dark:text-gray-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 7 Canonical Hours Check-off Grid */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
            {lang === 'ar' ? 'السواعي السبعة • اضغط عشان تسجّل الصلاة أو القراءة:' : 'The 7 Hours • Tap to check-off or read:'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {AGPEYA_HOURS.slice(0, 7).map((hour) => {
              const isDone = completedHoursToday[hour.id];
              const isSelected = selectedHourId === hour.id;

              return (
                <div
                  key={hour.id}
                  onClick={() => setSelectedHourId(hour.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-start ${
                    isSelected
                      ? 'bg-amber-50 dark:bg-slate-800 border-amber-500 shadow-xs ring-1 ring-amber-400/40'
                      : isDone
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900'
                        : 'bg-gray-50/50 dark:bg-slate-800/40 border-gray-200/70 dark:border-slate-800 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{hour.icon}</span>
                    <div className="truncate">
                      <p className="font-bold text-xs sm:text-sm text-[var(--color-church-blue)] dark:text-amber-200 truncate">
                        {lang === 'ar' ? hour.nameAr : hour.nameEn}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {hour.recommendedTime}
                      </p>
                    </div>
                  </div>

                  {/* Interactive Check-off Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleHourCompleted(hour.id);
                    }}
                    title={isDone ? (lang === 'ar' ? 'إلغاء الاختيار' : 'Unmark') : (lang === 'ar' ? 'سجّل إنك صليت' : 'Check off')}
                    className={`p-1.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                      isDone
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'bg-gray-200 dark:bg-slate-700 text-gray-500 hover:bg-amber-200 hover:text-amber-900'
                    }`}
                  >
                    {isDone ? <CheckCheck size={18} /> : <Circle size={18} />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Prayer Reader Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 border border-amber-200/80 dark:border-slate-800 shadow-sm space-y-6">
        {/* Hour Header with Mark as Prayed */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
          <div className="text-start">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{selectedHour.icon}</span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--color-church-blue)] dark:text-amber-200">
                {lang === 'ar' ? selectedHour.nameAr : selectedHour.nameEn}
              </h2>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 font-bold">
              {lang === 'ar' ? selectedHour.themeAr : selectedHour.themeEn}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher: Guided vs Full */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
              <button
                onClick={() => setViewMode('guided')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'guided' 
                    ? 'bg-white dark:bg-slate-700 text-amber-800 dark:text-amber-300 shadow-xs' 
                    : 'text-gray-500'
                }`}
              >
                {lang === 'ar' ? 'صلاة مبسطة للأولاد' : 'Youth Guided'}
              </button>
              <button
                onClick={() => setViewMode('full')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'full' 
                    ? 'bg-white dark:bg-slate-700 text-amber-800 dark:text-amber-300 shadow-xs' 
                    : 'text-gray-500'
                }`}
              >
                {lang === 'ar' ? 'النص الليتورجي الكامل' : 'Full Agpeya'}
              </button>
            </div>

            {/* Checkmark Completion Button */}
            <button
              onClick={() => toggleHourCompleted(selectedHour.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer ${
                completedHoursToday[selectedHour.id]
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 hover:bg-amber-200'
              }`}
            >
              <CheckCircle2 size={16} />
              <span>
                {completedHoursToday[selectedHour.id]
                  ? (lang === 'ar' ? 'صليت الساعة دي النهارده ✓' : 'Prayed Today ✓')
                  : (lang === 'ar' ? 'سجّل الصلاة واكسب ٢٥ نقطة' : 'Check off (+25 Pts)')}
              </span>
            </button>
          </div>
        </div>

        {/* GUIDED MODE FOR SUNDAY SCHOOL */}
        {viewMode === 'guided' && (
          <div className="space-y-4 text-start">
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-slate-800/80 border border-amber-200/50 dark:border-slate-700">
              <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 mb-1">
                {lang === 'ar' ? 'إيه اللي بنتعلمه وبنفتكره في الساعة دي؟' : 'What do we commemorate at this hour?'}
              </h4>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-relaxed">
                {lang === 'ar' ? selectedHour.summaryAr : selectedHour.summaryEn}
              </p>
            </div>

            {/* Guided Youth Prayer Box */}
            <div className="bg-linear-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10 dark:bg-slate-800/60 p-5 rounded-2xl border border-amber-300/60 dark:border-slate-700">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300 mb-2">
                <Heart size={16} className="text-rose-500 fill-rose-500" />
                <span>{lang === 'ar' ? 'صلاة بسيطة من القلب لربنا يسوع:' : 'A simple heartfelt prayer for Jesus:'}</span>
              </div>
              <p className="text-base sm:text-lg font-bold text-amber-950 dark:text-amber-100 leading-relaxed">
                "{lang === 'ar' ? selectedHour.childGuidedAr : selectedHour.childGuidedEn}"
              </p>
            </div>

            {/* Gospel Excerpt */}
            <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-slate-800/60 border border-sky-200/60 dark:border-slate-700">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800 dark:text-sky-400 mb-1.5">
                <BookOpen size={14} />
                <span>{lang === 'ar' ? 'جزء من الإنجيل المقدس للساعة دي:' : 'Gospel Excerpt:'}</span>
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 italic leading-relaxed">
                {lang === 'ar' ? selectedHour.gospelAr : selectedHour.gospelEn}
              </p>
            </div>
          </div>
        )}

        {/* FULL LITURGICAL TEXT MODE */}
        {viewMode === 'full' && (
          <div className="space-y-5 text-start">
            {/* Gospel */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/70 border border-gray-200 dark:border-slate-700">
              <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">
                {lang === 'ar' ? 'قراءة الإنجيل المقدس:' : 'Holy Gospel Reading:'}
              </h4>
              <p className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100 leading-relaxed">
                {lang === 'ar' ? selectedHour.gospelAr : selectedHour.gospelEn}
              </p>
            </div>

            {/* Troparia (قطع الصلاة) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400">
                {lang === 'ar' ? 'قطع الصلاة (التروباريات):' : 'Troparia (Liturgy Chants):'}
              </h4>
              {(lang === 'ar' ? selectedHour.tropariaAr : selectedHour.tropariaEn).map((t, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-amber-50/60 dark:bg-slate-800/50 border border-amber-100 dark:border-slate-700 text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed">
                  <span className="font-bold text-amber-700 dark:text-amber-400 ml-2">[{idx + 1}]</span>
                  {t}
                </div>
              ))}
            </div>

            {/* Absolution */}
            <div className="p-4 rounded-2xl bg-red-50/60 dark:bg-slate-800/50 border border-red-100 dark:border-slate-700">
              <h4 className="text-xs font-bold text-[var(--color-church-burgundy)] dark:text-red-300 mb-2">
                {lang === 'ar' ? 'شرح الصلاة والبركة في الختام:' : 'Concluding Absolution:'}
              </h4>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed">
                {lang === 'ar' ? selectedHour.absolutionAr : selectedHour.absolutionEn}
              </p>
            </div>
          </div>
        )}

        {/* Personal Prayer Intentions Notepad */}
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-800 text-start">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h4 className="text-xs sm:text-sm font-bold text-[var(--color-church-blue)] dark:text-amber-200 flex items-center gap-1.5">
              <Edit3 size={15} className="text-amber-600" />
              <span>{lang === 'ar' ? 'طلبات صلاتي الخاصة لربنا (بتتحفظ على السحابة):' : 'My Personal Intentions & Prayer Requests (Cloud Saved):'}</span>
            </h4>
            {isSavedPersonal && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                ✓ {lang === 'ar' ? 'اتحفظت على Supabase والجهاز' : 'Saved to Supabase & Device'}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <textarea
              value={personalPrayer}
              onChange={(e) => setPersonalPrayer(e.target.value)}
              placeholder={lang === 'ar' ? 'اكتب طلباتك لربنا (صلّي لأهلك، أصحابك، المدرسة، المرضى...)' : 'Write your personal prayers for family, school, health, repentance...'}
              className="w-full text-xs sm:text-sm p-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-100 focus:outline-hidden focus:border-amber-500 min-h-[70px]"
            />
            <button
              onClick={savePersonalPrayer}
              className="px-4 py-2 rounded-2xl bg-[var(--color-church-burgundy)] hover:bg-[#6e1623] text-white font-bold text-xs flex flex-col items-center justify-center shrink-0 cursor-pointer shadow-xs transition-colors"
            >
              <Save size={16} />
              <span className="mt-1">{lang === 'ar' ? 'حفظ' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
