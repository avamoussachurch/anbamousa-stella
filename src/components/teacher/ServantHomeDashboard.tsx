import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Music2,
  RefreshCw,
  ScrollText,
  Sparkles,
  Users,
  type LucideIcon
} from 'lucide-react';
import { getServantHomeSummary, type ServantHomeSummary } from '../../lib/servantHomeService';
import type { Language } from '../../types';

type CurriculumMode = 'sunday_school' | 'hymns' | 'taxis';

interface ServantHomeDashboardProps {
  lang: Language;
  servantName: string;
  pendingRequestsCount: number | null;
  pendingRequestsError: string | null;
  onPublishLesson: () => void;
  onReviewRequests: () => void;
  onOpenCurriculum: (mode: CurriculumMode) => void;
  onOpenWorkspaceTab: (tab: string) => void;
}

function formatDate(value: string, lang: Language): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function DataState({
  loading,
  error,
  hasData,
  emptyTitle,
  emptyDescription,
  errorTitle,
  lang,
  onRetry
}: {
  loading: boolean;
  error: string | null;
  hasData: boolean;
  emptyTitle: string;
  emptyDescription: string;
  errorTitle: string;
  lang: Language;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div role="status" className="space-y-3" aria-label={lang === 'ar' ? 'جارٍ تحميل بيانات الخدمة' : 'Loading service data'}>
        <div className="h-20 animate-pulse rounded-2xl bg-[var(--surface-secondary)]" />
        <div className="h-20 animate-pulse rounded-2xl bg-[var(--surface-secondary)]" />
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-[var(--feedback-error)]/30 bg-[var(--feedback-error)]/5 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle size={19} className="mt-0.5 shrink-0 text-[var(--feedback-error)]" />
          <div className="min-w-0 flex-1">
            <p className="font-black text-[var(--text-primary)]">{errorTitle}</p>
            <p className="mt-1 break-words text-sm text-[var(--text-secondary)]">{error}</p>
            <button type="button" onClick={onRetry} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--state-hover)]">
              <RefreshCw size={15} />{lang === 'ar' ? 'إعادة المحاولة' : 'Try again'}
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (!hasData) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-secondary)]/50 p-5">
        <p className="font-black text-[var(--text-primary)]">{emptyTitle}</p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{emptyDescription}</p>
      </div>
    );
  }
  return null;
}

function ServiceIllustration({ lang }: { lang: Language }) {
  return (
    <svg viewBox="0 0 360 220" role="img" aria-label={lang === 'ar' ? 'رسم توضيحي لطريق خدمة ومدرسة أحد' : 'Illustration of the Sunday School service journey'} className="w-full max-w-[23rem]">
      <defs>
        <linearGradient id="servant-sky" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#0d3540" />
          <stop offset="1" stopColor="#1c5960" />
        </linearGradient>
        <linearGradient id="servant-path" x1="0" x2="1">
          <stop offset="0" stopColor="#d99d46" />
          <stop offset="1" stopColor="#f4d18c" />
        </linearGradient>
      </defs>
      <circle cx="286" cy="51" r="32" fill="#f3ce88" opacity=".92" />
      <path d="M25 168c44-40 76-53 117-43 38 9 52 43 90 40 36-3 56-32 103-45v73H25z" fill="#164a53" />
      <path d="M0 193c53-29 89-28 123-14 40 17 70-12 103-18 46-8 80 13 134-13v72H0z" fill="#092b35" />
      <path d="M59 159h83V96h-83z" fill="url(#servant-sky)" stroke="#f3ce88" strokeWidth="3" />
      <path d="M49 98 100 59l52 39z" fill="#e1ae5c" />
      <path d="M93 60V42h14v18M98 41h5v-9h-5z" fill="#f9e3b1" />
      <path d="M83 158v-31h34v31M71 112h14v18H71zM117 112h14v18h-14z" fill="#f5d89d" />
      <path d="M150 177c29-17 42-18 64-9 23 10 41 8 64-4 22-12 37-17 62-8" fill="none" stroke="url(#servant-path)" strokeWidth="8" strokeLinecap="round" />
      <path d="M200 119h29M214 105v28" stroke="#f3ce88" strokeWidth="4" strokeLinecap="round" />
      <circle cx="188" cy="90" r="5" fill="#fff3d3" opacity=".8" />
      <circle cx="248" cy="130" r="4" fill="#fff3d3" opacity=".8" />
      <circle cx="318" cy="96" r="3" fill="#fff3d3" opacity=".8" />
      <path d="M28 202h28m10 0h8m227-8h24" stroke="#f3ce88" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SummaryMetric({ icon: Icon, label, value, note }: { icon: LucideIcon; label: string; value: string; note: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-s border-[var(--border-default)] px-4 first:border-s-0 first:ps-0">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--state-selected)] text-[var(--action-primary)]"><Icon size={19} /></span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-[var(--text-secondary)]">{label}</p>
        <p className="truncate text-xl font-black tabular-nums text-[var(--text-primary)]">{value}</p>
        <p className="truncate text-[10px] text-[var(--text-tertiary)]">{note}</p>
      </div>
    </div>
  );
}

function CurriculumArtwork({ mode }: { mode: CurriculumMode }) {
  if (mode === 'hymns') {
    return (
      <svg viewBox="0 0 220 100" aria-hidden="true" className="h-20 w-44 text-amber-300">
        <path d="M12 63h18l10-25 14 48 13-34 10 17h17l10-35 14 44 12-28 9 13h20l8-21 12 31 10-19h16" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="55" cy="24" r="4" fill="currentColor" opacity=".8" />
        <circle cx="165" cy="20" r="3" fill="currentColor" opacity=".65" />
        <path d="M28 88h162" stroke="currentColor" strokeWidth="1" opacity=".35" />
      </svg>
    );
  }

  if (mode === 'taxis') {
    return (
      <svg viewBox="0 0 220 100" aria-hidden="true" className="h-20 w-44 text-sky-200">
        <path d="M26 73c0-22 17-39 39-39s39 17 39 39M116 73c0-22 17-39 39-39s39 17 39 39" fill="none" stroke="currentColor" strokeWidth="3" opacity=".7" />
        <path d="M53 59h24M65 47v24M143 59h24M155 47v24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M31 82h158" stroke="currentColor" strokeWidth="2" opacity=".35" />
        <circle cx="65" cy="24" r="4" fill="#f3cf87" />
        <circle cx="155" cy="24" r="4" fill="#f3cf87" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 220 100" aria-hidden="true" className="h-20 w-44 text-amber-200">
      <path d="M25 25c22-8 43-6 62 4v52c-19-10-40-12-62-4zM195 25c-22-8-43-6-62 4v52c19-10 40-12 62-4z" fill="currentColor" opacity=".12" stroke="currentColor" strokeWidth="2" />
      <path d="M110 31v51M43 40c13-3 25-2 36 2M43 51c13-3 25-2 36 2M43 62c13-3 25-2 36 2M141 42c11-4 23-5 36-2M141 53c11-4 23-5 36-2M141 64c11-4 23-5 36-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".8" />
      <path d="M110 13v13m-7-7h14" stroke="#f3cf87" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function ServantHomeDashboard({
  lang,
  servantName,
  pendingRequestsCount,
  pendingRequestsError,
  onPublishLesson,
  onReviewRequests,
  onOpenCurriculum,
  onOpenWorkspaceTab
}: ServantHomeDashboardProps) {
  const isArabic = lang === 'ar';
  const [summary, setSummary] = useState<ServantHomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getServantHomeSummary().then(result => {
      if (!active) return;
      setSummary(result.data);
      setError(result.error?.message || null);
      setLoading(false);
    });
    return () => { active = false; };
  }, [refreshKey]);

  const completionRate = summary && summary.totals.progressRecords > 0
    ? Math.round((summary.totals.completedLessons / summary.totals.progressRecords) * 100)
    : null;
  const classNameByGroup = useMemo(
    () => new Map((summary?.classes || []).map(item => [item.classGroupId, isArabic ? item.nameAr : item.name])),
    [summary?.classes, isArabic]
  );
  const refresh = () => setRefreshKey(key => key + 1);
  const classesExist = Boolean(summary && summary.classes.length > 0);

  return (
    <main className="mx-auto w-full max-w-[90rem] space-y-5 px-4 pb-8 pt-5 sm:px-6 lg:px-8" dir={isArabic ? 'rtl' : 'ltr'}>
      {!summary && !loading && error ? (
        <section className="rounded-[2rem] border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-card)] sm:p-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[var(--action-primary)]">{isArabic ? 'مركز خدمة مدارس الأحد' : 'Sunday School service desk'}</p>
              <h1 className="mt-1 text-2xl font-black text-[var(--text-primary)]">{isArabic ? `أهلاً يا ${servantName}` : `Welcome, ${servantName}`}</h1>
            </div>
            <button type="button" onClick={refresh} aria-label={isArabic ? 'تحديث لوحة الخدمة' : 'Refresh service dashboard'} className="rounded-xl border border-[var(--border-default)] p-2 text-[var(--text-secondary)] hover:bg-[var(--state-hover)]"><RefreshCw size={18} /></button>
          </div>
          <DataState loading={loading} error={error} hasData={false} emptyTitle="" emptyDescription="" errorTitle={isArabic ? 'تعذر تحميل بيانات خدمتك' : 'Service data could not be loaded'} lang={lang} onRetry={refresh} />
        </section>
      ) : (
        <>
          <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(120deg,#0b2028_0%,#123b45_55%,#1d514f_100%)] p-5 text-white shadow-[0_24px_70px_-35px_rgba(8,28,36,.75)] sm:p-8 lg:p-9">
            <div aria-hidden="true" className="pointer-events-none absolute -end-24 -top-32 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(242,198,120,.2),transparent_68%)]" />
            <div className="relative grid items-center gap-6 lg:grid-cols-[1.1fr_.9fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-100/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-amber-100">
                  <Sparkles size={14} />{isArabic ? 'مركز خدمة مدارس الأحد' : 'Sunday School service desk'}
                  {summary?.churchYear && <span className="border-s border-white/25 ps-2 text-white/75">{summary.churchYear}</span>}
                </div>
                <h1 className="mt-4 max-w-2xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                  {isArabic ? `أهلاً يا ${servantName}، خدمتك بتصنع فرق` : `Welcome, ${servantName}. Your service makes a difference.`}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-7 text-teal-50/80 sm:text-base">
                  {isArabic ? 'نظرة موثوقة على الفصول، رحلة التعلّم، والمهام التي تحتاج لمتابعتك.' : 'A trusted view of your classes, learning progress, and the work that needs your attention.'}
                </p>
                <button type="button" onClick={onPublishLesson} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-orange-300 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:brightness-105">
                  <BookOpen size={17} />{isArabic ? 'تجهيز درس للنشر' : 'Prepare a lesson'}
                  {isArabic ? <ArrowUpLeft size={16} /> : <ArrowUpRight size={16} />}
                </button>
              </div>
              <div className="flex items-center justify-center lg:justify-end">
                <ServiceIllustration lang={lang} />
              </div>
            </div>
            <div className="relative mt-5 grid grid-cols-2 gap-y-4 rounded-2xl border border-white/10 bg-black/10 p-4 sm:grid-cols-4 sm:gap-0 sm:p-5">
              <SummaryMetric icon={GraduationCap} label={isArabic ? 'الفصول المسندة' : 'Assigned classes'} value={loading ? '—' : error ? '—' : String(summary?.classes.length ?? 0)} note={isArabic ? 'للسنة الكنسية النشطة' : 'Active church year'} />
              <SummaryMetric icon={Users} label={isArabic ? 'التلاميذ المسجلون' : 'Enrolled students'} value={loading ? '—' : error ? '—' : String(summary?.totals.students ?? 0)} note={isArabic ? 'في فصولك المسندة' : 'In your assigned classes'} />
              <SummaryMetric icon={CheckCircle2} label={isArabic ? 'إتمام الدروس المسجل' : 'Recorded completions'} value={loading ? '—' : error ? '—' : String(summary?.totals.completedLessons ?? 0)} note={isArabic ? 'من سجلات قاعدة البيانات' : 'Persisted lesson records'} />
              <SummaryMetric icon={BookOpen} label={isArabic ? 'المنهج المنشور' : 'Published curriculum'} value={loading ? '—' : error ? '—' : String(summary?.totals.curriculumCount ?? 0)} note={isArabic ? 'للصفوف المسندة' : 'For assigned grade groups'} />
            </div>
          </section>

          <section aria-labelledby="curriculum-areas-heading" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <p className="text-xs font-black uppercase tracking-[.15em] text-[var(--action-primary)]">{isArabic ? 'مساحات بناء المنهج' : 'Curriculum studios'}</p>
                <h2 id="curriculum-areas-heading" className="mt-1 text-xl font-black text-[var(--text-primary)] sm:text-2xl">{isArabic ? 'ثلاثة مسارات للتعليم والخدمة' : 'Three paths for teaching and service'}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
                  {isArabic ? 'افتح مساحة المنهج المناسبة لمتابعة التأليف والمراجعة والنشر بأدواتها المتخصصة.' : 'Enter a curriculum area to work with its dedicated authoring, review, and publishing tools.'}
                </p>
              </div>
              <span className="hidden items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] sm:inline-flex">
                <BookOpen size={14} />{isArabic ? 'محتوى الكنيسة' : 'Church curriculum'}
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <button
                type="button"
                onClick={() => onOpenCurriculum('sunday_school')}
                className="group relative min-h-56 overflow-hidden rounded-[1.75rem] border border-amber-200/70 bg-[linear-gradient(145deg,#173b42,#235b59_70%,#6a5939)] p-5 text-start text-white shadow-[0_20px_50px_-32px_rgba(12,40,44,.8)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_55px_-30px_rgba(12,40,44,.78)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                <div aria-hidden="true" className="pointer-events-none absolute -end-10 -top-8 h-40 w-40 rounded-full border border-white/10" />
                <div className="relative flex h-full flex-col justify-between gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10 text-amber-200"><BookOpen size={24} /></span>
                    <CurriculumArtwork mode="sunday_school" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-amber-200">{isArabic ? 'التأليف والتعلّم' : 'AUTHORING & LEARNING'}</p>
                    <h3 className="mt-1 text-xl font-black">{isArabic ? 'مدارس الأحد' : 'Sunday School'}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-white/75">{isArabic ? 'الدروس، الجلسات، المصادر، مراجعة الأدلة، والنشر للفصول المسندة.' : 'Lessons, sessions, sources, evidence review, and publishing for assigned classes.'}</p>
                    {!loading && !error && summary && (
                      <p className="mt-3 text-xs font-bold text-amber-100">
                        {summary.totals.curriculumCount} {isArabic ? 'درس منشور للفصول المسندة' : 'published lessons for assigned grades'}
                      </p>
                    )}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onOpenCurriculum('hymns')}
                className="group relative min-h-56 overflow-hidden rounded-[1.75rem] border border-amber-300/30 bg-[linear-gradient(145deg,#3b2c26,#684536_60%,#9b6941)] p-5 text-start text-white shadow-[0_20px_50px_-32px_rgba(57,36,26,.8)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_55px_-30px_rgba(57,36,26,.78)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                <div aria-hidden="true" className="pointer-events-none absolute -end-10 -top-8 h-40 w-40 rounded-full border border-white/10" />
                <div className="relative flex h-full flex-col justify-between gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10 text-amber-200"><Music2 size={24} /></span>
                    <CurriculumArtwork mode="hymns" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-amber-200">{isArabic ? 'التسبيح والصوت' : 'CHANT & SOUND'}</p>
                    <h3 className="mt-1 text-xl font-black">{isArabic ? 'مدرسة الألحان' : 'Hymns School'}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-white/75">{isArabic ? 'إدارة الألحان، مستويات التعلّم، التسجيلات، وطلبات الالتحاق.' : 'Manage hymns, learning levels, recordings, and enrollment requests.'}</p>
                    <p className="mt-3 text-xs font-bold text-amber-100">{isArabic ? 'محتوى صوتي ومراجعة متخصصة' : 'Audio curriculum & dedicated review'}</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onOpenCurriculum('taxis')}
                className="group relative min-h-56 overflow-hidden rounded-[1.75rem] border border-sky-200/20 bg-[linear-gradient(145deg,#172e3e,#20516a_62%,#356e78)] p-5 text-start text-white shadow-[0_20px_50px_-32px_rgba(14,39,54,.8)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_55px_-30px_rgba(14,39,54,.78)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
              >
                <div aria-hidden="true" className="pointer-events-none absolute -end-10 -top-8 h-40 w-40 rounded-full border border-white/10" />
                <div className="relative flex h-full flex-col justify-between gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10 text-sky-100"><ScrollText size={24} /></span>
                    <CurriculumArtwork mode="taxis" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-sky-100">{isArabic ? 'الطقس والترتيب' : 'RITES & ORDER'}</p>
                    <h3 className="mt-1 text-xl font-black">{isArabic ? 'طقوس الكنيسة — التاكسيس' : 'Coptic Rituals — Taxis'}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-white/75">{isArabic ? 'تنظيم الطقوس والأقسام والمردات والمواد التعليمية.' : 'Organize rites, sections, responses, and supporting learning materials.'}</p>
                    <p className="mt-3 text-xs font-bold text-sky-100">{isArabic ? 'مرجع طقسي قابل للتصفح' : 'Browseable liturgical reference'}</p>
                  </div>
                </div>
              </button>
            </div>
          </section>

          <section aria-label={isArabic ? 'اختصارات مساحات العمل' : 'Workspace shortcuts'} className="grid gap-4 md:grid-cols-3">
            <article className="flex flex-col justify-between gap-4 rounded-[1.5rem] border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-card)]">
              <div>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-300/10 dark:text-amber-200"><Sparkles size={19} /></span>
                <h3 className="mt-3 font-black text-[var(--text-primary)]">{isArabic ? 'إنتاج المحتوى' : 'Content production'}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{isArabic ? 'أنشئ درسًا يدويًا أو جهّز مسودة من تسجيل صوتي.' : 'Author a lesson manually or prepare a draft from a voice recording.'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onPublishLesson} className="rounded-xl bg-[var(--action-primary)] px-3 py-2 text-xs font-black text-[var(--action-primary-text)] hover:brightness-110">{isArabic ? 'إنشاء درس' : 'Create lesson'}</button>
                <button type="button" onClick={() => onOpenWorkspaceTab('ai')} className="rounded-xl border border-[var(--border-default)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--state-hover)]">{isArabic ? 'إنشاء بمساعدة الصوت' : 'Voice-assisted draft'}</button>
              </div>
            </article>
            <article className="flex flex-col justify-between gap-4 rounded-[1.5rem] border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-card)]">
              <div>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--state-selected)] text-[var(--action-primary)]"><GraduationCap size={19} /></span>
                <h3 className="mt-3 font-black text-[var(--text-primary)]">{isArabic ? 'رعاية الفصول' : 'Class stewardship'}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{isArabic ? 'تابع الفصول المسندة وطلبات تسجيل التلاميذ من السجل المعتمد.' : 'Manage assigned classes and student enrollment requests against the authorized roster.'}</p>
              </div>
              <button type="button" onClick={() => onOpenWorkspaceTab('classManagement')} className="self-start rounded-xl border border-[var(--border-default)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--state-hover)]">{isArabic ? 'فتح إدارة الفصول' : 'Open class management'}</button>
            </article>
            <article className="flex flex-col justify-between gap-4 rounded-[1.5rem] border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-card)]">
              <div>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-900 dark:bg-emerald-300/10 dark:text-emerald-200"><CheckCircle2 size={19} /></span>
                <h3 className="mt-3 font-black text-[var(--text-primary)]">{isArabic ? 'المراجعة والنشر' : 'Review & publishing'}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {summary && !error
                    ? `${summary.lessonsAwaitingReview} ${isArabic ? 'عنصر منهج بانتظار المراجعة للفصول المسندة.' : 'curriculum items awaiting review for assigned classes.'}`
                    : isArabic ? 'مراجعة الأدلة، المصادر، الاختبارات، وحالة النشر.' : 'Review evidence, sources, assessments, and publication status.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onOpenWorkspaceTab('lessons')} className="rounded-xl border border-[var(--border-default)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--state-hover)]">{isArabic ? 'مكتبة ومراجعة الدروس' : 'Lesson library & review'}</button>
                <button type="button" onClick={() => onOpenWorkspaceTab('sources')} className="rounded-xl border border-[var(--border-default)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--state-hover)]">{isArabic ? 'المصادر والأدلة' : 'Sources & evidence'}</button>
              </div>
            </article>
          </section>

          {error && summary && (
            <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              {isArabic ? `تعذر تحديث بعض البيانات: ${error}` : `Some dashboard data could not be refreshed: ${error}`}
            </p>
          )}

          <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
            <section aria-labelledby="servant-classes-heading" className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-card)] sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.15em] text-[var(--action-primary)]">{isArabic ? 'مجتمع الفصل' : 'Your classrooms'}</p>
                  <h2 id="servant-classes-heading" className="mt-1 text-xl font-black text-[var(--text-primary)]">{isArabic ? 'الفصول المسندة ورحلة التلاميذ' : 'Assigned classes & student journey'}</h2>
                </div>
                <button type="button" onClick={refresh} aria-label={isArabic ? 'تحديث بيانات الفصول' : 'Refresh class data'} className="rounded-xl border border-[var(--border-default)] p-2 text-[var(--text-secondary)] hover:bg-[var(--state-hover)]"><RefreshCw size={17} /></button>
              </div>
              <DataState
                loading={loading}
                error={error}
                hasData={classesExist}
                emptyTitle={isArabic ? 'لا توجد فصول مسندة حالياً' : 'No assigned classes yet'}
                emptyDescription={isArabic ? 'عند تكليفك بفصل للسنة الكنسية النشطة، ستظهر بياناته الحقيقية هنا.' : 'When a class is assigned to you for the active church year, its verified information will appear here.'}
                errorTitle={isArabic ? 'بيانات الفصول غير متاحة' : 'Class data is unavailable'}
                lang={lang}
                onRetry={refresh}
              />
              {!loading && !error && summary && summary.classes.length > 0 && (
                <div className="space-y-3">
                  {summary.classes.map((classroom, index) => {
                    const rate = classroom.progressRecords > 0
                      ? Math.round(classroom.completedLessons / classroom.progressRecords * 100)
                      : null;
                    return (
                      <article key={classroom.id} className="group relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-secondary)]/55 p-4 sm:p-5">
                        <div aria-hidden="true" className={`absolute inset-y-0 ${isArabic ? 'end-0' : 'start-0'} w-1 ${index % 2 ? 'bg-[var(--brand-teal)]' : 'bg-[var(--brand-gold)]'}`} />
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--surface-primary)] text-[var(--action-primary)] shadow-sm"><GraduationCap size={21} /></span>
                            <div className="min-w-0">
                              <h3 className="truncate text-lg font-black text-[var(--text-primary)]">{isArabic ? classroom.nameAr : classroom.name}</h3>
                              <p className="mt-1 text-xs text-[var(--text-secondary)]">{classroom.studentCount} {isArabic ? 'تلميذ مسجل' : classroom.studentCount === 1 ? 'enrolled student' : 'enrolled students'}</p>
                            </div>
                          </div>
                          <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1 text-xs font-bold text-[var(--text-secondary)]">{classroom.curriculumCount} {isArabic ? 'درس منشور' : classroom.curriculumCount === 1 ? 'published lesson' : 'published lessons'}</span>
                        </div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                          <div>
                            <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-[var(--text-secondary)]">{isArabic ? 'إتمام من سجلات التقدم' : 'Completion in recorded progress'}</span>
                              <span className="font-black tabular-nums text-[var(--text-primary)]">{rate === null ? (isArabic ? 'لا توجد بيانات بعد' : 'No progress records yet') : `${rate}%`}</span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-primary)]">
                              {rate !== null && <div className="h-full rounded-full bg-gradient-to-r from-[var(--brand-teal)] to-[var(--brand-gold)] transition-[width] duration-700" style={{ width: `${rate}%` }} />}
                            </div>
                          </div>
                          <div className="text-start sm:text-end">
                            <p className="text-xl font-black tabular-nums text-[var(--text-primary)]">{classroom.completedLessons}</p>
                            <p className="text-[10px] font-bold text-[var(--text-tertiary)]">{isArabic ? 'إتمام مسجل' : 'completions recorded'}</p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section aria-labelledby="servant-progress-heading" className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-card)] sm:p-6">
              <p className="text-xs font-black uppercase tracking-[.15em] text-[var(--action-primary)]">{isArabic ? 'مؤشر رحلة التعلّم' : 'Learning pulse'}</p>
              <h2 id="servant-progress-heading" className="mt-1 text-xl font-black text-[var(--text-primary)]">{isArabic ? 'التقدم المسجل فعلياً' : 'Persisted learning progress'}</h2>
              {loading ? <div role="status" className="mt-5 h-44 animate-pulse rounded-2xl bg-[var(--surface-secondary)]" />
                : error ? <p role="note" className="mt-5 text-sm text-[var(--text-secondary)]">{isArabic ? 'الرسم غير متاح بسبب تعذر تحميل بيانات التقدم.' : 'The visualization is unavailable because progress data could not be loaded.'}</p>
                  : completionRate === null ? <div className="mt-5 grid min-h-44 place-items-center rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-secondary)]/40 p-5 text-center"><div><BookOpen className="mx-auto text-[var(--text-tertiary)]" size={27} /><p className="mt-3 font-black text-[var(--text-primary)]">{isArabic ? 'لسه مفيش سجلات تقدم' : 'No progress records yet'}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{isArabic ? 'سيظهر المؤشر عند تسجيل أول تقدم للتلاميذ.' : 'The chart will appear once student progress is recorded.'}</p></div></div>
                    : (
                      <div className="mt-5 rounded-2xl bg-[linear-gradient(145deg,var(--surface-secondary),transparent)] p-5">
                        <div className="flex flex-col items-center gap-5 sm:flex-row">
                          <div className="relative grid h-36 w-36 shrink-0 place-items-center">
                            <svg viewBox="0 0 120 120" className="-rotate-90" aria-label={isArabic ? `إتمام ${completionRate}% من سجلات التقدم` : `${completionRate}% of progress records completed`}>
                              <circle cx="60" cy="60" r="48" fill="none" stroke="var(--border-default)" strokeWidth="10" />
                              <circle cx="60" cy="60" r="48" fill="none" stroke="var(--brand-gold)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${completionRate * 3.016} 301.6`} />
                              <circle cx="60" cy="60" r="34" fill="none" stroke="var(--brand-teal)" strokeWidth="3" strokeDasharray="2 7" opacity=".65" />
                            </svg>
                            <div className="absolute text-center">
                              <p className="text-3xl font-black tabular-nums text-[var(--text-primary)]">{completionRate}%</p>
                              <p className="text-[10px] font-bold text-[var(--text-secondary)]">{isArabic ? 'مكتمل' : 'completed'}</p>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-[var(--text-primary)]">{isArabic ? 'سجلات إتمام الدروس مقابل كل سجلات التقدم المحفوظة.' : 'Completed lesson records compared with all persisted progress records.'}</p>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3"><p className="text-[10px] font-bold text-[var(--text-secondary)]">{isArabic ? 'إتمام' : 'Completed'}</p><p className="mt-1 text-xl font-black tabular-nums text-[var(--text-primary)]">{summary?.totals.completedLessons}</p></div>
                              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3"><p className="text-[10px] font-bold text-[var(--text-secondary)]">{isArabic ? 'سجلات تقدم' : 'Progress records'}</p><p className="mt-1 text-xl font-black tabular-nums text-[var(--text-primary)]">{summary?.totals.progressRecords}</p></div>
                            </div>
                          </div>
                        </div>
                        <p className="mt-4 border-t border-[var(--border-default)] pt-3 text-[10px] leading-relaxed text-[var(--text-tertiary)]">{isArabic ? 'المؤشر يصف السجلات المتاحة فقط، ولا يمثل نسبة إتمام كل تلميذ للمنهج.' : 'This reflects available records only; it is not the percentage of each student’s curriculum completed.'}</p>
                      </div>
                    )}
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--border-default)] px-3 py-3">
                <Clock3 size={17} className="mt-0.5 shrink-0 text-[var(--text-tertiary)]" />
                <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{isArabic ? 'الحضور غير معروض هنا لعدم وجود سجل حضور موثوق متاح لهذا الملخص.' : 'Attendance is not shown because no authoritative attendance record is available to this summary.'}</p>
              </div>
            </section>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section aria-labelledby="servant-attention-heading" className="overflow-hidden rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3 border-b border-[var(--border-default)] p-5 sm:p-6">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200"><AlertCircle size={20} /></span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[.14em] text-[var(--text-tertiary)]">{isArabic ? 'متابعة الخدمة' : 'Service attention'}</p>
                  <h2 id="servant-attention-heading" className="text-lg font-black text-[var(--text-primary)]">{isArabic ? 'ما يحتاج لمتابعتك' : 'Items needing follow-up'}</h2>
                </div>
              </div>
              <div className="space-y-3 p-5 sm:p-6">
                {pendingRequestsError ? (
                  <div role="alert" className="rounded-xl border border-[var(--feedback-error)]/30 p-3 text-sm text-[var(--feedback-error)]">{pendingRequestsError}</div>
                ) : pendingRequestsCount === null ? (
                  <div role="status" className="h-14 animate-pulse rounded-xl bg-[var(--surface-secondary)]" />
                ) : pendingRequestsCount > 0 ? (
                  <article className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/50 bg-amber-50 p-4 dark:border-amber-300/15 dark:bg-amber-300/5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-200/70 text-amber-900 dark:bg-amber-300/10 dark:text-amber-200"><Users size={18} /></span>
                      <div><p className="font-black text-[var(--text-primary)]">{pendingRequestsCount} {isArabic ? 'طلب تفعيل معلّق' : 'pending activation requests'}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{isArabic ? 'تحتاج مراجعة قبل ضم التلاميذ.' : 'Review before enrolling students.'}</p></div>
                    </div>
                    <button type="button" onClick={onReviewRequests} className="rounded-xl bg-amber-800 px-3 py-2 text-xs font-black text-white hover:bg-amber-900">{isArabic ? 'مراجعة الطلبات' : 'Review requests'}</button>
                  </article>
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-secondary)]/50 p-4">
                    <CheckCircle2 size={19} className="text-[var(--brand-teal)]" />
                    <p className="text-sm font-bold text-[var(--text-secondary)]">{isArabic ? 'لا توجد طلبات تفعيل معلّقة.' : 'There are no pending activation requests.'}</p>
                  </div>
                )}
                {summary && !error && summary.studentsWithoutProgress > 0 && (
                  <div className="flex items-start gap-3 rounded-2xl border border-[var(--border-default)] p-4">
                    <BookOpen size={18} className="mt-0.5 shrink-0 text-[var(--action-primary)]" />
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)]"><strong className="text-[var(--text-primary)]">{summary.studentsWithoutProgress}</strong> {isArabic ? 'تلميذ مسجل لا توجد له سجلات تقدم دروس بعد.' : 'enrolled students have no lesson progress records yet.'}</p>
                  </div>
                )}
                {summary && !error && summary.lessonsAwaitingReview > 0 && (
                  <div className="flex items-start gap-3 rounded-2xl border border-[var(--border-default)] p-4">
                    <BookOpen size={18} className="mt-0.5 shrink-0 text-[var(--action-primary)]" />
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)]"><strong className="text-[var(--text-primary)]">{summary.lessonsAwaitingReview}</strong> {isArabic ? 'منهج بانتظار مراجعة الخادم للصفوف المسندة.' : 'curriculum items are awaiting servant review for your assigned grade groups.'}</p>
                  </div>
                )}
                {summary && !error && summary.classes.some(item => item.studentCount === 0) && (
                  <div className="flex items-start gap-3 rounded-2xl border border-[var(--border-default)] p-4">
                    <GraduationCap size={18} className="mt-0.5 shrink-0 text-[var(--action-primary)]" />
                    <p className="text-sm text-[var(--text-secondary)]">{summary.classes.filter(item => item.studentCount === 0).length} {isArabic ? 'فصل مسند ليس به تلاميذ مسجلون بعد.' : 'assigned classes have no enrolled students yet.'}</p>
                  </div>
                )}
                {summary && !error && pendingRequestsCount === 0 && summary.studentsWithoutProgress === 0 && summary.lessonsAwaitingReview === 0 && summary.classes.every(item => item.studentCount > 0) && (
                  <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-secondary)]/50 p-4">
                    <CheckCircle2 size={19} className="text-[var(--brand-teal)]" />
                    <p className="text-sm font-bold text-[var(--text-secondary)]">{isArabic ? 'لا توجد تنبيهات متابعة من البيانات المتاحة حالياً.' : 'No follow-up indicators from the available records.'}</p>
                  </div>
                )}
              </div>
            </section>

            <section aria-labelledby="servant-events-heading" className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-card)] sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--state-selected)] text-[var(--action-primary)]"><CalendarDays size={19} /></span>
                <div><p className="text-xs font-black uppercase tracking-[.14em] text-[var(--text-tertiary)]">{isArabic ? 'على الأجندة' : 'On the calendar'}</p><h2 id="servant-events-heading" className="text-lg font-black text-[var(--text-primary)]">{isArabic ? 'فعاليات قادمة' : 'Upcoming events'}</h2></div>
              </div>
              <DataState
                loading={loading}
                error={error}
                hasData={Boolean(summary?.upcomingEvents.length)}
                emptyTitle={isArabic ? 'لا توجد فعاليات قادمة مسجلة' : 'No upcoming events on record'}
                emptyDescription={isArabic ? 'ستظهر هنا الفعاليات المنشورة في تقويم الكنيسة.' : 'Published church calendar events will appear here.'}
                errorTitle={isArabic ? 'الفعاليات غير متاحة' : 'Events are unavailable'}
                lang={lang}
                onRetry={refresh}
              />
              {!loading && !error && summary && summary.upcomingEvents.length > 0 && (
                <div className="space-y-2">
                  {summary.upcomingEvents.map((event, index) => (
                    <article key={event.id} className="flex gap-3 rounded-xl border border-[var(--border-default)] p-3">
                      <div className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-lg ${index === 0 ? 'bg-[var(--action-primary)] text-[var(--action-primary-text)]' : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'}`}>
                        <span className="text-[9px] font-black uppercase">{new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-US', { month: 'short' }).format(new Date(event.dateTime))}</span>
                        <span className="text-xl font-black tabular-nums">{new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-US', { day: 'numeric' }).format(new Date(event.dateTime))}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-black text-[var(--text-primary)]">{isArabic ? event.titleAr : event.title}</h3>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">{formatDate(event.dateTime, lang)}{(isArabic ? event.locationAr : event.location) ? ` · ${isArabic ? event.locationAr : event.location}` : ''}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <div className="mt-4 border-t border-[var(--border-default)] pt-4">
                <h3 className="mb-3 text-sm font-black text-[var(--text-primary)]">{isArabic ? 'مواعيد النشر المجدولة' : 'Scheduled publishing'}</h3>
                {loading ? <div role="status" className="h-14 animate-pulse rounded-xl bg-[var(--surface-secondary)]" />
                  : error ? <p className="text-xs text-[var(--text-secondary)]">{isArabic ? 'مواعيد النشر غير متاحة حالياً.' : 'Publishing schedules are currently unavailable.'}</p>
                    : summary && !summary.publicationScheduleAvailable ? <p role="note" className="rounded-xl border border-amber-300/40 bg-amber-50/60 p-3 text-xs leading-relaxed text-amber-950 dark:bg-amber-300/5 dark:text-amber-100">{summary.publicationScheduleError || (isArabic ? 'ميزة جدولة النشر غير متاحة.' : 'Scheduled publishing is unavailable.')}</p>
                      : summary?.scheduledPublications.length ? (
                        <ul className="space-y-2">
                          {summary.scheduledPublications.slice(0, 3).map(item => (
                            <li key={`${item.lessonId}-${item.scheduledAt}`} className="flex items-start gap-3 rounded-xl border border-[var(--border-default)] p-3">
                              <Clock3 size={16} className="mt-0.5 shrink-0 text-[var(--action-primary)]" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[var(--text-primary)]">{isArabic ? item.titleAr : item.title}</p>
                                <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">{classNameByGroup.get(item.classGroupId) || item.classGroupId} · {formatDate(item.scheduledAt, lang)}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-xs text-[var(--text-secondary)]">{isArabic ? 'لا توجد مواعيد نشر قادمة مسجلة.' : 'No upcoming publication deadlines are scheduled.'}</p>}
              </div>
              <div className="mt-4 border-t border-[var(--border-default)] pt-4">
                <h3 className="mb-3 text-sm font-black text-[var(--text-primary)]">{isArabic ? 'آخر إتمام مسجل' : 'Recent recorded completions'}</h3>
                {loading ? <div role="status" className="h-16 animate-pulse rounded-xl bg-[var(--surface-secondary)]" />
                  : error ? <p className="text-xs text-[var(--text-secondary)]">{isArabic ? 'سجل النشاط غير متاح حالياً.' : 'Activity history is currently unavailable.'}</p>
                    : summary?.recentActivity.length ? (
                      <ol className="space-y-3">
                        {summary.recentActivity.slice(0, 3).map(activity => (
                          <li key={`${activity.lessonId}-${activity.completedAt}`} className="relative flex gap-3">
                            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200"><CheckCircle2 size={15} /></span>
                            <div className="min-w-0 flex-1 border-b border-[var(--border-default)] pb-2 last:border-0">
                              <p className="truncate text-sm font-bold text-[var(--text-primary)]">{isArabic ? activity.titleAr : activity.title}</p>
                              <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">{classNameByGroup.get(activity.classGroupId) || activity.classGroupId} · {formatDate(activity.completedAt, lang)}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : <p className="text-xs text-[var(--text-secondary)]">{isArabic ? 'لا توجد إتمامات دروس مسجلة حديثاً.' : 'No recent lesson completions are recorded.'}</p>}
              </div>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
