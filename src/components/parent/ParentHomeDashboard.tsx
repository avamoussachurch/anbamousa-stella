import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpLeft,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Heart,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon
} from 'lucide-react';
import type { ExtendedPost } from '../../lib/feedService';
import {
  getChildLearningReview,
  type ParentChildRecord,
  type ParentRewardRequest
} from '../../lib/parentChildService';
import type { StudentLearningReviewData } from '../../lib/classRosterService';
import type { ChurchEventNotification } from '../../types';
import { getParentChildReviewState, getParentFamilyState, getParentWeeklyLearningDays } from './parentHomeModel';

type Language = 'ar' | 'en';
type ChildReview = { loading: boolean; error: string | null; data: StudentLearningReviewData | null };

interface ParentHomeDashboardProps {
  lang: Language;
  parentName: string;
  children: ParentChildRecord[];
  childrenLoading: boolean;
  childrenError: string | null;
  onRefreshChildren: () => void;
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
  onOpenJourney: (childId: string) => void;
  onAddChild: () => void;
  events: ChurchEventNotification[];
  eventsLoading: boolean;
  eventsError: string | null;
  announcements: ExtendedPost[];
  announcementsLoading: boolean;
  announcementsError: string | null;
  rewardRequests: ParentRewardRequest[];
  rewardsLoading: boolean;
  rewardsError: string | null;
  onOpenFamily: () => void;
  onOpenEvents: () => void;
}

function FamilyIllustration({ lang }: { lang: Language }) {
  return (
    <svg viewBox="0 0 440 250" role="img" aria-label={lang === 'ar' ? 'رسم للعائلة في طريقها إلى الكنيسة' : 'Illustration of a family walking toward church'} className="w-full max-w-[25rem]">
      <defs>
        <linearGradient id="family-sky" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#20565a" />
          <stop offset="1" stopColor="#102d3a" />
        </linearGradient>
        <linearGradient id="family-path" x1="0" x2="1">
          <stop offset="0" stopColor="#e9b65e" />
          <stop offset="1" stopColor="#f4dba3" />
        </linearGradient>
      </defs>
      <circle cx="345" cy="48" r="29" fill="#f3d89c" opacity=".96" />
      <path d="M0 176c55-33 91-50 144-35 47 13 70 35 116 25 51-12 94-48 180-27v111H0z" fill="#28585a" />
      <path d="M0 207c68-30 123-27 177-12 46 12 77-13 121-19 49-7 82 11 142-5v79H0z" fill="#102f39" />
      <path d="M67 161h95V93H67z" fill="url(#family-sky)" stroke="#f1d18f" strokeWidth="3" />
      <path d="m55 95 59-46 60 46z" fill="#dba85a" />
      <path d="M107 48V29h15v19m-11-18h7V18h-7z" fill="#f4d89d" />
      <path d="M101 161v-35h27v35M78 105h18v20H78zm55 0h18v20h-18z" fill="#f4d89d" />
      <path d="M150 224c40-39 80-28 115-39 43-14 91-5 143-35" fill="none" stroke="url(#family-path)" strokeWidth="8" strokeLinecap="round" />
      <g fill="#eac88c">
        <circle cx="229" cy="111" r="11" /><path d="M214 126q15-9 30 0l5 39h-39z" />
        <circle cx="269" cy="124" r="9" /><path d="M257 137q12-7 24 0l4 31h-32z" />
        <circle cx="302" cy="118" r="10" /><path d="M289 132q13-8 26 0l4 36h-34z" />
      </g>
      <path d="M224 169v16m39-17v13m38-13v13" stroke="#f0d39a" strokeWidth="4" strokeLinecap="round" />
      <path d="M182 193c23-7 36-9 53-4m57-18c27-9 42-11 60-7" fill="none" stroke="#f4d89d" strokeOpacity=".6" strokeWidth="2" strokeLinecap="round" />
      <circle cx="197" cy="68" r="3" fill="#fff3d3" /><circle cx="286" cy="76" r="3" fill="#fff3d3" />
    </svg>
  );
}

function SectionHeading({ icon: Icon, eyebrow, title, action }: { icon: LucideIcon; eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--state-selected)] text-[var(--action-primary)]"><Icon size={19} /></span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.15em] text-[var(--action-primary)]">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-black text-[var(--text-primary)] sm:text-xl">{title}</h2>
        </div>
      </div>
      {action}
    </div>
  );
}

function ReviewState({ state, lang, onRetry }: { state: ReturnType<typeof getParentChildReviewState>; lang: Language; onRetry: () => void }) {
  if (state === 'loading') {
    return <div role="status" aria-label={lang === 'ar' ? 'جارٍ تحميل رحلة التعلّم' : 'Loading learning journey'} className="mt-4 space-y-2"><div className="h-3 animate-pulse rounded-full bg-[var(--surface-secondary)]" /><div className="h-3 w-2/3 animate-pulse rounded-full bg-[var(--surface-secondary)]" /></div>;
  }
  if (state === 'error') {
    return <div role="alert" className="mt-4 rounded-xl border border-[var(--feedback-error)]/30 p-3 text-xs text-[var(--feedback-error)]"><AlertCircle size={15} className="me-1 inline" />{lang === 'ar' ? 'تعذر تحميل سجل التعلّم.' : 'Learning records could not be loaded.'}<button type="button" onClick={onRetry} className="ms-2 inline-flex items-center gap-1 font-bold underline"><RefreshCw size={12} />{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</button></div>;
  }
  if (state === 'unavailable') {
    return <p role="note" className="mt-4 text-xs text-[var(--text-secondary)]">{lang === 'ar' ? 'سجل التعلّم غير متاح حالياً.' : 'Learning records are currently unavailable.'}</p>;
  }
  if (state === 'empty') {
    return <p className="mt-4 rounded-xl bg-[var(--surface-secondary)]/70 p-3 text-xs leading-relaxed text-[var(--text-secondary)]">{lang === 'ar' ? 'لا توجد دروس منشورة لهذا الصف أو سجلات تعلّم متاحة بعد.' : 'No published lessons or learning records are available for this grade yet.'}</p>;
  }
  return null;
}

export function ParentHomeDashboard(props: ParentHomeDashboardProps) {
  const {
    lang, parentName, children, childrenLoading, childrenError, onRefreshChildren,
    selectedChildId, onSelectChild, onOpenJourney, onAddChild, events, eventsLoading,
    eventsError, announcements, announcementsLoading, announcementsError, rewardRequests,
    rewardsLoading, rewardsError, onOpenFamily, onOpenEvents
  } = props;
  const isArabic = lang === 'ar';
  const [reviews, setReviews] = useState<Record<string, ChildReview>>({});
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);
  const linkedChildIds = useMemo(() => children.map(child => child.id), [children]);

  useEffect(() => {
    let active = true;
    if (childrenLoading || childrenError || linkedChildIds.length === 0) {
      setReviews({});
      return () => { active = false; };
    }

    setReviews(Object.fromEntries(linkedChildIds.map(id => [id, { loading: true, error: null, data: null }])));
    Promise.all(linkedChildIds.map(async id => {
      const result = await getChildLearningReview(id);
      return [id, {
        loading: false,
        error: result.error?.message || null,
        data: result.error ? null : result.data
      }] as const;
    })).then(results => {
      if (active) setReviews(Object.fromEntries(results));
    });
    return () => { active = false; };
  }, [childrenLoading, childrenError, linkedChildIds, reviewRefreshKey]);

  const pendingForLinkedChildren = useMemo(() => {
    const childIds = new Set(linkedChildIds);
    return rewardRequests.filter(request => request.status === 'pending' && childIds.has(request.student_id));
  }, [linkedChildIds, rewardRequests]);
  const familyState = getParentFamilyState(childrenLoading, childrenError, children.length);

  const retryReviews = () => setReviewRefreshKey(value => value + 1);
  const eventDate = (event: ChurchEventNotification) => new Date(event.dateTime || event.date);
  const formatEventDate = (event: ChurchEventNotification) => {
    const date = eventDate(event);
    return Number.isNaN(date.getTime())
      ? event.date
      : new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-EG', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
  };
  const labels = isArabic ? {
    eyebrow: 'مساحة الأسرة',
    welcome: `أهلاً يا ${parentName}`,
    subtitle: 'كل لحظة تشجيع بتفرق. تابع رحلة أولادك من السجلات الحقيقية في مكان واحد.',
    children: 'أولادي',
    childrenIntro: 'حسابات مرتبطة بعلاقة أسرية موثّقة',
    selectChild: 'اختار ابنك لمتابعة رحلته',
    journey: 'رحلة التعلّم',
    completed: 'دروس مكتملة من المنهج المنشور',
    weekly: 'نشاط آخر ٧ أيام',
    weeklyComplete: 'إتمام مسجل هذا الأسبوع',
    className: 'فصل مدارس الأحد',
    hymns: 'مستوى الألحان والطقس',
    openJourney: 'عرض رحلة التعلّم',
    noChildren: 'لسه مفيش أطفال مرتبطين بالحساب',
    noChildrenText: 'اربط حساب الطفل بكود التوصيل الموثّق عشان تتابع بياناته الحقيقية.',
    connect: 'ربط طفل',
    connectAnother: 'ربط طفل آخر',
    retry: 'إعادة المحاولة',
    refresh: 'تحديث البيانات',
    attention: 'محتاج اهتمامك',
    rewardCount: 'طلب مكافأة بانتظار مراجعتك',
    noAttention: 'لا توجد طلبات تتطلب مراجعتك حالياً.',
    events: 'مواعيد تهم الأسرة',
    noEvents: 'لا توجد فعاليات قادمة مسجلة.',
    announcements: 'أخبار الكنيسة',
    noAnnouncements: 'لا توجد إعلانات منشورة حالياً.',
    noLearningWeek: 'لا يوجد إتمام دروس مسجل خلال الأيام السبعة الماضية.',
    achievementsUnavailable: 'سجل الإنجازات غير متاح من مصدر موثوق.',
    attendanceUnavailable: 'بيانات الحضور غير متاحة من مصدر موثوق.'
  } : {
    eyebrow: 'FAMILY PORTAL',
    welcome: `Welcome, ${parentName}`,
    subtitle: 'Every moment of encouragement matters. Follow your children’s real recorded learning in one place.',
    children: 'Your children',
    childrenIntro: 'Accounts connected through verified family relationships',
    selectChild: 'Select a child to follow their journey',
    journey: 'Learning journey',
    completed: 'Completed lessons in published curriculum',
    weekly: 'Activity over the last 7 days',
    weeklyComplete: 'Recorded completions this week',
    className: 'Sunday School class',
    hymns: 'Hymns & Taxis level',
    openJourney: 'View learning journey',
    noChildren: 'No children linked to this account yet',
    noChildrenText: 'Connect a child with a verified connection code to see their real records.',
    connect: 'Connect a child',
    connectAnother: 'Connect another child',
    retry: 'Try again',
    refresh: 'Refresh family data',
    attention: 'Needs your attention',
    rewardCount: 'reward request awaiting your review',
    noAttention: 'There are no requests requiring your review right now.',
    events: 'Coming up for your family',
    noEvents: 'There are no upcoming events on record.',
    announcements: 'Church updates',
    noAnnouncements: 'There are no published announcements right now.',
    noLearningWeek: 'No lesson completions were recorded in the last seven days.',
    achievementsUnavailable: 'Achievement records are unavailable from an authoritative source.',
    attendanceUnavailable: 'Attendance records are unavailable from an authoritative source.'
  };

  const childCards = children.map(child => {
    const result = reviews[child.id] || { loading: !childrenError, error: childrenError, data: null };
    const reviewState = getParentChildReviewState(result.loading, result.error, result.data);
    const weekly = getParentWeeklyLearningDays(result.data, new Date(), isArabic ? 'ar-EG' : 'en-EG');
    const completedLessons = result.data?.lessons.filter(lesson => lesson.progressStatus === 'COMPLETED').length;
    const publishedLessons = result.data?.lessons.length;
    const weekTotal = weekly?.reduce((sum, day) => sum + day.completedLessons, 0);
    const maxDay = Math.max(1, ...(weekly || []).map(day => day.completedLessons));
    return { child, result, reviewState, weekly, completedLessons, publishedLessons, weekTotal, maxDay };
  });

  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-[linear-gradient(120deg,#102d3a,#1b5558_58%,#286b68)] px-5 py-7 text-white shadow-[var(--shadow-card)] sm:px-8 sm:py-9 lg:px-10">
        <div aria-hidden="true" className="absolute -end-24 -top-32 -z-10 h-80 w-80 rounded-full bg-[#f0c77c]/10 blur-3xl" />
        <div className="absolute inset-0 -z-10 opacity-[.08]" aria-hidden="true" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="grid items-center gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black text-[#f2d394]"><Heart size={14} />{labels.eyebrow}</p>
            <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">{labels.welcome}</h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/75 sm:text-base">{labels.subtitle}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold"><Users size={16} />{childrenLoading ? '…' : childrenError ? '—' : children.length} {isArabic ? 'أبناء مرتبطين' : 'linked children'}</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75"><ShieldCheck size={15} />{isArabic ? 'بيانات مرتبطة موثّقة' : 'Verified linked records'}</span>
              {!childrenLoading && !childrenError && children.length > 0 && <button type="button" onClick={onAddChild} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black text-white transition hover:bg-white/20"><Plus size={15} />{labels.connectAnother}</button>}
            </div>
          </div>
          <div className="flex justify-center lg:justify-end"><FamilyIllustration lang={lang} /></div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <SectionHeading
          icon={Users}
          eyebrow={labels.childrenIntro}
          title={labels.children}
          action={<button type="button" onClick={onRefreshChildren} aria-label={labels.refresh} className="rounded-xl border border-[var(--border-default)] p-2 text-[var(--text-secondary)] transition hover:bg-[var(--state-hover)]"><RefreshCw size={17} /></button>}
        />
        {familyState === 'loading' ? (
          <div role="status" aria-label={isArabic ? 'جارٍ تحميل بيانات الأبناء' : 'Loading linked children'} className="grid gap-4 md:grid-cols-2">
            {[0, 1].map(item => <div key={item} className="h-56 animate-pulse rounded-2xl bg-[var(--surface-secondary)]" />)}
          </div>
        ) : familyState === 'error' ? (
          <div role="alert" className="rounded-2xl border border-[var(--feedback-error)]/30 bg-[var(--feedback-error)]/5 p-5">
            <p className="font-bold text-[var(--feedback-error)]">{childrenError}</p>
            <button type="button" onClick={onRefreshChildren} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] px-3 py-2 text-sm font-bold text-[var(--text-primary)]"><RefreshCw size={15} />{labels.retry}</button>
          </div>
        ) : familyState === 'empty' ? (
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-secondary)]/45 p-6 sm:p-8">
            <div className="grid items-center gap-5 sm:grid-cols-[1fr_auto]">
              <div><p className="text-lg font-black text-[var(--text-primary)]">{labels.noChildren}</p><p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">{labels.noChildrenText}</p></div>
              <button type="button" onClick={onAddChild} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--action-primary)] px-4 py-3 text-sm font-black text-[var(--action-primary-text)]"><Users size={17} />{labels.connect}</button>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-4 text-xs font-semibold text-[var(--text-secondary)]">{labels.selectChild}</p>
            <div className="grid gap-4 xl:grid-cols-2">
              {childCards.map(({ child, result, reviewState, weekly, completedLessons, publishedLessons, weekTotal, maxDay }) => {
                const isSelected = child.id === selectedChildId;
                const percentage = publishedLessons ? Math.round((completedLessons || 0) / publishedLessons * 100) : null;
                const initials = child.name.trim().slice(0, 1);
                return (
                  <article key={child.id} className={`relative overflow-hidden rounded-2xl border bg-[var(--surface-secondary)]/45 p-4 transition sm:p-5 ${isSelected ? 'border-[var(--action-primary)] ring-2 ring-[var(--action-primary)]/25' : 'border-[var(--border-default)]'}`}>
                    <div aria-hidden="true" className={`absolute inset-y-0 ${isArabic ? 'end-0' : 'start-0'} w-1 ${isSelected ? 'bg-[var(--brand-gold)]' : 'bg-[var(--brand-teal)]'}`} />
                    <button type="button" aria-pressed={isSelected} onClick={() => onSelectChild(child.id)} className="flex w-full items-center gap-3 text-start">
                      {child.avatarUrl ? <img src={child.avatarUrl} alt="" className="h-14 w-14 shrink-0 rounded-2xl bg-[var(--surface-primary)] object-cover" /> : <span aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--state-selected)] text-xl font-black text-[var(--action-primary)]">{initials}</span>}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-lg font-black text-[var(--text-primary)]">{child.name}</span>
                        <span className="mt-1 block text-xs text-[var(--text-secondary)]">{child.grade || (isArabic ? 'الصف غير مسجل' : 'Grade not recorded')}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black ${isSelected ? 'bg-[var(--action-primary)] text-[var(--action-primary-text)]' : 'bg-[var(--surface-primary)] text-[var(--text-secondary)]'}`}>{isSelected ? (isArabic ? 'محدد' : 'Selected') : (isArabic ? 'اختيار' : 'Select')}</span>
                    </button>

                    <div className="mt-4 grid grid-cols-2 gap-2 border-y border-[var(--border-default)] py-3 text-xs">
                      <div><p className="text-[var(--text-tertiary)]">{labels.className}</p><p className="mt-1 truncate font-bold text-[var(--text-primary)]">{isArabic ? child.classNameAr || 'غير مسجل' : child.className || 'Not recorded'}</p></div>
                      <div><p className="text-[var(--text-tertiary)]">{labels.hymns}</p><p className="mt-1 truncate font-bold text-[var(--text-primary)]">{child.hymnsTaxisLevel ? (isArabic ? `المستوى ${child.hymnsTaxisLevel}` : `Level ${child.hymnsTaxisLevel}`) : (isArabic ? 'غير متاح' : 'Not available')}</p></div>
                    </div>

                    {reviewState === 'ready' && result.data && (
                      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_.95fr]">
                        <div>
                          <div className="flex items-end justify-between gap-2">
                            <div><p className="text-[10px] font-bold text-[var(--text-secondary)]">{labels.journey}</p><p className="mt-1 text-xl font-black tabular-nums text-[var(--text-primary)]">{completedLessons} <span className="text-xs font-semibold text-[var(--text-tertiary)]">/ {publishedLessons}</span></p></div>
                            <span className="text-xs font-black tabular-nums text-[var(--action-primary)]">{percentage}%</span>
                          </div>
                          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--surface-primary)]" role="img" aria-label={`${completedLessons} ${labels.completed}`}>
                            <div className="h-full rounded-full bg-gradient-to-r from-[var(--brand-teal)] to-[var(--brand-gold)] transition-[width] duration-700" style={{ width: `${percentage}%` }} />
                          </div>
                          <p className="mt-2 text-[10px] leading-relaxed text-[var(--text-tertiary)]">{labels.completed}</p>
                        </div>
                        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)]/70 p-3">
                          <div className="flex items-center justify-between gap-2"><p className="text-[10px] font-bold text-[var(--text-secondary)]">{labels.weekly}</p><span className="text-xs font-black tabular-nums text-[var(--text-primary)]">{weekTotal}</span></div>
                          <div className="mt-3 flex h-12 items-end gap-1.5" role="img" aria-label={`${weekTotal} ${labels.weeklyComplete}`}>
                            {weekly?.map(day => <div key={day.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${day.label}: ${day.completedLessons}`}>
                              <div className="w-full rounded-t-sm bg-[var(--brand-teal)] transition-[height] duration-500" style={{ height: `${day.completedLessons ? Math.max(16, day.completedLessons / maxDay * 100) : 4}%`, opacity: day.completedLessons ? 1 : .25 }} />
                              <span className="text-[8px] text-[var(--text-tertiary)]">{day.label}</span>
                            </div>)}
                          </div>
                          {weekTotal === 0 && <p className="mt-2 text-[9px] leading-relaxed text-[var(--text-tertiary)]">{labels.noLearningWeek}</p>}
                        </div>
                      </div>
                    )}
                    <ReviewState
                      state={reviewState}
                      lang={lang}
                      onRetry={retryReviews}
                    />
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]"><ShieldCheck size={13} />{isArabic ? 'بيانات هذا الطفل فقط' : 'This child’s records only'}</span>
                      <button type="button" onClick={() => onOpenJourney(child.id)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-black text-[var(--action-primary)] transition hover:bg-[var(--state-hover)]">
                        {labels.openJourney}{isArabic ? <ArrowUpLeft size={14} /> : <ArrowUpRight size={14} />}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <section className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-card)] sm:p-6">
          <SectionHeading icon={Bell}           eyebrow={isArabic ? 'متابعة الأسرة' : 'FAMILY FOLLOW-UP'} title={labels.attention} />
          {rewardsLoading ? <div role="status" className="h-16 animate-pulse rounded-xl bg-[var(--surface-secondary)]" />
            : rewardsError ? <p role="alert" className="rounded-xl border border-[var(--feedback-error)]/30 p-3 text-sm text-[var(--feedback-error)]">{rewardsError}</p>
              : childrenLoading ? <p role="status" className="text-sm text-[var(--text-secondary)]">{isArabic ? 'جارٍ التحقق من الحسابات المرتبطة...' : 'Verifying linked accounts…'}</p>
                : childrenError ? <p role="note" className="text-sm text-[var(--text-secondary)]">{isArabic ? 'تعذر التحقق من الطلبات المرتبطة.' : 'Requests cannot be matched until linked accounts load.'}</p>
                  : pendingForLinkedChildren.length ? (
                    <div className="rounded-2xl border border-amber-300/40 bg-amber-50/60 p-4 dark:bg-amber-300/5">
                      <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-200/70 text-amber-900 dark:bg-amber-300/10 dark:text-amber-200"><Sparkles size={18} /></span>
                        <div><p className="font-black text-[var(--text-primary)]">{pendingForLinkedChildren.length} {labels.rewardCount}</p><p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{isArabic ? 'الطلبات المعروضة تخص الأبناء المرتبطين الموثقين فقط.' : 'Only requests for verified linked children are included.'}</p></div>
                      </div>
                      <button type="button" onClick={onOpenFamily} className="mt-4 rounded-xl bg-amber-800 px-3 py-2 text-xs font-black text-white hover:bg-amber-900">{isArabic ? 'مراجعة الطلبات' : 'Review requests'}</button>
                    </div>
                  ) : <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-secondary)]/60 p-4"><CheckCircle2 size={19} className="shrink-0 text-[var(--brand-teal)]" /><p className="text-sm text-[var(--text-secondary)]">{labels.noAttention}</p></div>}
          <div className="mt-4 grid gap-2 border-t border-[var(--border-default)] pt-4 sm:grid-cols-2">
            <p className="flex items-start gap-2 text-[10px] leading-relaxed text-[var(--text-tertiary)]"><TrophyIcon />{labels.achievementsUnavailable}</p>
            <p className="flex items-start gap-2 text-[10px] leading-relaxed text-[var(--text-tertiary)]"><Clock3 size={14} className="mt-0.5 shrink-0" />{labels.attendanceUnavailable}</p>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-card)] sm:p-6">
          <SectionHeading
            icon={CalendarDays}
            eyebrow={isArabic ? 'تقويم الأسرة' : 'FAMILY CALENDAR'}
            title={labels.events}
            action={<button type="button" onClick={onOpenEvents} className="rounded-lg px-2 py-1 text-xs font-black text-[var(--action-primary)] hover:bg-[var(--state-hover)]">{isArabic ? 'عرض التقويم' : 'Open calendar'}</button>}
          />
          {eventsLoading ? <div role="status" className="space-y-2"><div className="h-16 animate-pulse rounded-xl bg-[var(--surface-secondary)]" /><div className="h-16 animate-pulse rounded-xl bg-[var(--surface-secondary)]" /></div>
            : eventsError ? <p role="alert" className="rounded-xl border border-[var(--feedback-error)]/30 p-3 text-sm text-[var(--feedback-error)]">{eventsError}</p>
              : events.length === 0 ? <p className="rounded-xl bg-[var(--surface-secondary)]/60 p-4 text-sm text-[var(--text-secondary)]">{labels.noEvents}</p>
                : <div className="space-y-2">{events.slice(0, 3).map((event, index) => (
                  <article key={event.id} className="flex items-start gap-3 rounded-xl border border-[var(--border-default)] p-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${index === 0 ? 'bg-[var(--state-selected)] text-[var(--action-primary)]' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'}`}><CalendarDays size={17} /></span>
                    <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-black text-[var(--text-primary)]">{isArabic ? event.titleAr : event.titleEn}</h3><p className="mt-1 flex items-center gap-1 text-[10px] text-[var(--text-secondary)]"><Clock3 size={12} />{formatEventDate(event)}</p>{(event.locationAr || event.locationEn) && <p className="mt-1 truncate text-[10px] text-[var(--text-tertiary)]">{isArabic ? event.locationAr : event.locationEn}</p>}</div>
                  </article>
                ))}</div>}
        </section>
      </section>

      <section className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <SectionHeading icon={BookOpen} eyebrow={isArabic ? 'من أخبار الكنيسة' : 'FROM THE CHURCH'} title={labels.announcements} />
        {announcementsLoading ? <div role="status" className="space-y-2"><div className="h-14 animate-pulse rounded-xl bg-[var(--surface-secondary)]" /><div className="h-14 animate-pulse rounded-xl bg-[var(--surface-secondary)]" /></div>
          : announcementsError ? <p role="alert" className="rounded-xl border border-[var(--feedback-error)]/30 p-3 text-sm text-[var(--feedback-error)]">{announcementsError}</p>
            : announcements.length === 0 ? <p className="rounded-xl bg-[var(--surface-secondary)]/60 p-4 text-sm text-[var(--text-secondary)]">{labels.noAnnouncements}</p>
              : <div className="grid gap-3 md:grid-cols-2">{announcements.slice(0, 2).map(post => (
                <article key={post.id} className="relative overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)]/40 p-4">
                  <span aria-hidden="true" className={`absolute inset-y-0 ${isArabic ? 'end-0' : 'start-0'} w-1 bg-[var(--brand-gold)]`} />
                  <div className="flex items-start gap-2"><Bell size={15} className="mt-0.5 shrink-0 text-[var(--action-primary)]" /><p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-primary)]">{post.content}</p></div>
                  <p className="mt-3 text-[10px] text-[var(--text-tertiary)]">{post.authorName} · {new Date(post.createdAt).toLocaleDateString(isArabic ? 'ar-EG' : 'en-EG')}</p>
                </article>
              ))}</div>}
      </section>
    </div>
  );
}

function TrophyIcon() {
  return <Sparkles size={14} className="mt-0.5 shrink-0" />;
}
