import { BookOpen, CalendarDays, Clock, Cross, MoveUpLeft, MoveUpRight } from 'lucide-react';
import type { Language } from '../../types';
import { AGPEYA_HOURS, type AgpeyaHourData } from '../../data/agpeyaData';
import { COPTIC_FEASTS, type CopticFeast } from '../../data/copticCalendarData';

export function getNextAgpeyaHour(now: Date): AgpeyaHourData {
  const next = AGPEYA_HOURS
    .map(hour => {
      const [hourOfDay, minute] = hour.recommendedTime.split(' - ')[0].split(':').map(Number);
      const scheduledTime = new Date(now);
      scheduledTime.setHours(hourOfDay, minute, 0, 0);
      if (scheduledTime < now) scheduledTime.setDate(scheduledTime.getDate() + 1);
      return { hour, scheduledTime };
    })
    .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime())[0];

  return next.hour;
}

export function getNextCopticFeast(now: Date): { feast: CopticFeast; date: Date } {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const candidates = COPTIC_FEASTS.map(feast => {
    let date = feast.targetDateThisYear(now.getFullYear());
    date.setHours(0, 0, 0, 0);
    if (date < today) {
      date = feast.targetDateThisYear(now.getFullYear() + 1);
      date.setHours(0, 0, 0, 0);
    }
    return { feast, date };
  });
  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  return candidates[0];
}

export function StudentFeatureLinks({ lang, onNavigate }: { lang: Language; onNavigate: (tab: string) => void }) {
  const isArabic = lang === 'ar';
  const EntryIcon = isArabic ? MoveUpLeft : MoveUpRight;
  const nextHour = getNextAgpeyaHour(new Date());
  const nextFeast = getNextCopticFeast(new Date());
  const feastDate = new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-US', {
    month: 'short',
    day: 'numeric'
  }).format(nextFeast.date);

  return (
    <section aria-label={isArabic ? 'اكتشف المزيد من المحتوى' : 'Discover more'} className="grid gap-4 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onNavigate('agpeya')}
        className="group relative flex min-h-40 flex-col justify-between overflow-hidden rounded-3xl border border-teal-200/70 bg-gradient-to-br from-teal-50 via-white to-emerald-100 p-5 text-start shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-[#315B62] dark:from-[#12313B] dark:via-[#153944] dark:to-[#17453F]"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -end-5 -top-7 text-teal-700/10 dark:text-teal-100/10">
          <BookOpen size={124} strokeWidth={1.2} />
        </div>
        <div className="relative flex items-center justify-between gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-md dark:bg-teal-300 dark:text-teal-950">
            <BookOpen size={21} />
          </span>
          <EntryIcon size={17} className="text-teal-800 transition-transform group-hover:-translate-y-0.5 dark:text-teal-200" />
        </div>
        <div className="relative mt-5">
          <p className="text-xs font-black uppercase tracking-wide text-teal-800 dark:text-teal-200">
            {isArabic ? 'صلوات الأجبية' : 'Agpeya prayer book'}
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
            {isArabic ? 'الصلاة القادمة' : 'Next canonical hour'}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Clock size={14} />
            {isArabic ? nextHour.nameAr : nextHour.nameEn}
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('calendar')}
        className="group relative flex min-h-40 flex-col justify-between overflow-hidden rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-orange-100 p-5 text-start shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-[#65563D] dark:from-[#27323A] dark:via-[#26313A] dark:to-[#3C382A]"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -end-4 -top-5 text-amber-800/10 dark:text-amber-100/10">
          <Cross size={112} strokeWidth={1.1} />
        </div>
        <div className="relative flex items-center justify-between gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-md dark:bg-amber-300 dark:text-amber-950">
            <CalendarDays size={21} />
          </span>
          <EntryIcon size={17} className="text-amber-800 transition-transform group-hover:-translate-y-0.5 dark:text-amber-200" />
        </div>
        <div className="relative mt-5">
          <p className="text-xs font-black uppercase tracking-wide text-amber-800 dark:text-amber-200">
            {isArabic ? 'التقويم القبطي' : 'Coptic calendar'}
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
            {isArabic ? 'الاحتفال القادم' : 'Next feast'}
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {isArabic ? nextFeast.feast.nameAr : nextFeast.feast.nameEn} · {feastDate}
          </p>
        </div>
      </button>
    </section>
  );
}
