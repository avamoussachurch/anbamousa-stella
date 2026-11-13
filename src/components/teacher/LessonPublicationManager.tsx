import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarClock, CheckCircle2, Filter, Loader2, Search, Send, XCircle } from 'lucide-react';
import { Lesson, LessonVersion } from '../../types';
import { CANONICAL_GRADE_LIST } from '../../lib/classGroups';
import {
  canPublishVersion,
  cancelLessonPublication,
  canManageLessonVersion,
  formatPublicationTime,
  getPublicationCalendarDays,
  getPublicationTimezone,
  listScheduledLessonPublications,
  parsePublicationLocalDateTime,
  publishLessonVersion,
  publishLessonsInBulk,
  rescheduleLessonPublication,
  scheduleLessonsInBulk,
  ScheduledLessonPublication,
  scheduleLessonPublication
} from '../../lib/lessonPublishingService';

interface LessonPublicationManagerProps {
  lessons: Lesson[];
  lessonVersions: Record<string, LessonVersion[]>;
  lang: 'en' | 'ar';
  canManage: boolean;
  role?: string;
  userId?: string;
  onRefresh: () => Promise<void>;
}

interface OperationResult {
  lessonId: string;
  success: boolean;
  error?: string;
}

function currentVersion(lesson: Lesson, versions: LessonVersion[]): LessonVersion | undefined {
  return [...(versions || [])]
    .sort((left, right) => right.versionNumber - left.versionNumber)[0] || lesson.latestVersion;
}

export function getPublicationLabel(
  lesson: Lesson,
  version: LessonVersion | undefined,
  jobs: ScheduledLessonPublication[]
): 'Draft' | 'Awaiting Review' | 'Revision Requested' | 'Approved' | 'Scheduled' | 'Published' | 'Failed' | 'Cancelled' {
  const lessonJobs = jobs.filter(job => job.lesson_id === lesson.id && (!version || job.version_id === version.id));
  if (lessonJobs.some(job => job.status === 'scheduled' || job.status === 'processing')) return 'Scheduled';
  if (lessonJobs.some(job => job.status === 'failed')) return 'Failed';
  if (lessonJobs.some(job => job.status === 'cancelled')) return 'Cancelled';
  if (version?.status === 'PUBLISHED') return 'Published';
  if (version?.status === 'SERVANT_REVIEW') return 'Awaiting Review';
  if (version?.status === 'REVISION_REQUESTED') return 'Revision Requested';
  if (version?.status === 'APPROVED') return 'Approved';
  if (lesson.status === 'published') return 'Published';
  return 'Draft';
}

function getPublicationStatusText(status: ScheduledLessonPublication['status'], isAr: boolean): string {
  const labels: Record<ScheduledLessonPublication['status'], [string, string]> = {
    scheduled: ['مجدول', 'Scheduled'],
    processing: ['جارٍ النشر', 'Processing'],
    published: ['تم النشر', 'Published'],
    failed: ['فشل', 'Failed'],
    cancelled: ['ملغى', 'Cancelled']
  };
  return labels[status][isAr ? 0 : 1];
}

export function LessonPublicationManager({
  lessons,
  lessonVersions,
  lang,
  canManage,
  role,
  userId,
  onRefresh
}: LessonPublicationManagerProps) {
  const isAr = lang === 'ar';
  const timezone = getPublicationTimezone();
  const [jobs, setJobs] = useState<ScheduledLessonPublication[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scheduledLocalTime, setScheduledLocalTime] = useState('');
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [working, setWorking] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [results, setResults] = useState<OperationResult[]>([]);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const refreshJobs = useCallback(async () => {
    setLoadingJobs(true);
    const response = await listScheduledLessonPublications();
    setJobs(response.data || []);
    setLoadError(response.error?.message || null);
    setLoadingJobs(false);
  }, []);

  useEffect(() => {
    void refreshJobs();
  }, [refreshJobs]);

  const rows = useMemo(() => lessons.map(lesson => {
    const version = currentVersion(lesson, lessonVersions[lesson.id] || []);
    const eligibility = version ? canPublishVersion(version, lesson.id) : { canPublish: false, reason: 'No lesson version is available.' };
    const activeJob = jobs.find(job =>
      job.lesson_id === lesson.id &&
      (!version || job.version_id === version.id) &&
      (job.status === 'scheduled' || job.status === 'processing')
    );
    return {
      lesson,
      version,
      eligibility,
      activeJob,
      canManageVersion: canManageLessonVersion(role, userId, version),
      status: getPublicationLabel(lesson, version, jobs)
    };
  }), [jobs, lessonVersions, lessons, role, userId]);

  const gradeOptions = useMemo(() => {
    const observed = new Set(rows.map(row => row.lesson.grade).filter((grade): grade is string => Boolean(grade)));
    return [
      ...CANONICAL_GRADE_LIST.filter(grade => observed.has(grade.code)).map(grade => ({
        value: grade.code,
        label: lang === 'ar' ? grade.name.ar : grade.name.en
      })),
      ...Array.from(observed)
        .filter(grade => !CANONICAL_GRADE_LIST.some(option => option.code === grade))
        .map(grade => ({ value: grade, label: grade }))
    ];
  }, [lang, rows]);
  const filteredRows = useMemo(() => {
    const normalizedQuery = search.trim().toLocaleLowerCase();
    return rows.filter(row => {
      const matchesQuery = !normalizedQuery || [
        row.lesson.title,
        row.lesson.titleAr,
        row.lesson.summary,
        row.lesson.summaryAr,
        row.lesson.grade
      ].some(value => String(value || '').toLocaleLowerCase().includes(normalizedQuery));
      return matchesQuery &&
        (gradeFilter === 'all' || row.lesson.grade === gradeFilter) &&
        (statusFilter === 'all' || row.status === statusFilter);
    });
  }, [gradeFilter, rows, search, statusFilter]);
  const selectedRows = rows.filter(row => selectedIds.has(row.lesson.id));
  const allEligibleSelected = selectedRows.length > 0 && selectedRows.every(row =>
    row.eligibility.canPublish && row.canManageVersion && !row.activeJob
  );
  const labels = {
    Draft: isAr ? 'مسودة' : 'Draft',
    'Awaiting Review': isAr ? 'مستني المراجعة' : 'Awaiting Review',
    'Revision Requested': isAr ? 'محتاج تعديل' : 'Revision requested',
    Approved: isAr ? 'معتمد وجاهز للنشر' : 'Approved',
    Scheduled: isAr ? 'مجدول' : 'Scheduled',
    Published: isAr ? 'منشور' : 'Published',
    Failed: isAr ? 'النشر فشل' : 'Failed',
    Cancelled: isAr ? 'الموعد اتلغى' : 'Cancelled'
  };
  const statusCounts = filteredRows.reduce<Record<string, number>>((counts, row) => {
    counts[row.status] = (counts[row.status] || 0) + 1;
    return counts;
  }, {});

  const toggleSelection = (lessonId: string) => {
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

  const clearResults = () => setResults([]);

  const handlePublish = async () => {
    if (!allEligibleSelected || working) return;
    const affectedItems = selectedRows.map(row =>
      `${row.lesson.title} (v${row.version!.versionNumber})`
    );
    const confirmation = isAr
      ? `النسخ المعتمدة دي هتتنشر دلوقتي:\n${affectedItems.join('\n')}\n\nهل تريد المتابعة؟`
      : `These approved versions will be published now:\n${affectedItems.join('\n')}\n\nContinue?`;
    if (!window.confirm(confirmation)) return;

    setWorking(true);
    clearResults();
    try {
      const outcome = await publishLessonsInBulk(
        selectedRows.map(row => ({ lessonId: row.lesson.id, versionId: row.version!.id })),
        publishLessonVersion
      );
      setResults(outcome.map(item => ({
        lessonId: item.lessonId,
        success: item.success,
        error: item.error
      })));
      setSelectedIds(new Set());
      void Promise.all([onRefresh(), refreshJobs()]).catch(error => {
        console.warn('Post-publish refresh failed:', error);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bulk publication failed';
      setResults(selectedRows.map(row => ({ lessonId: row.lesson.id, success: false, error: message })));
    } finally {
      setWorking(false);
    }
  };

  const handleSchedule = async () => {
    const scheduledDate = parsePublicationLocalDateTime(scheduledLocalTime, timezone);
    if (!allEligibleSelected || !scheduledDate || scheduledDate.getTime() <= Date.now() || working || loadingJobs || loadError) return;
    const affectedItems = selectedRows.map(row =>
      `${row.lesson.title} (v${row.version!.versionNumber})`
    );
    const confirmation = isAr
      ? `ستُجدول النسخ المعتمدة التالية للنشر في ${formatPublicationTime(scheduledDate.toISOString(), timezone, 'ar-EG')} (${timezone}):\n${affectedItems.join('\n')}\n\nهل تريد المتابعة؟`
      : `These approved versions will be scheduled for ${formatPublicationTime(scheduledDate.toISOString(), timezone, 'en')} (${timezone}):\n${affectedItems.join('\n')}\n\nContinue?`;
    if (!window.confirm(confirmation)) return;

    setWorking(true);
    clearResults();
    try {
      const outcome = await scheduleLessonsInBulk(
        selectedRows.map(row => ({ lessonId: row.lesson.id, versionId: row.version!.id })),
        scheduledDate,
        scheduleLessonPublication
      );
      setResults(outcome.map(item => ({
        lessonId: item.lessonId,
        success: item.success,
        error: item.error
      })));
      setSelectedIds(new Set());
      void refreshJobs().catch(error => console.warn('Post-schedule refresh failed:', error));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bulk scheduling failed';
      setResults(selectedRows.map(row => ({ lessonId: row.lesson.id, success: false, error: message })));
    } finally {
      setWorking(false);
    }
  };

  const handleCancel = async (job: ScheduledLessonPublication) => {
    const title = lessons.find(lesson => lesson.id === job.lesson_id)?.title || job.lesson_id;
    const confirmation = isAr
      ? `تلغي موعد نشر "${title}" في ${formatPublicationTime(job.scheduled_at, timezone, 'ar-EG')}؟`
      : `Cancel the scheduled publication for "${title}" at ${formatPublicationTime(job.scheduled_at, timezone, 'en')}?`;
    if (!window.confirm(confirmation)) return;

    setWorking(true);
    try {
      const response = await cancelLessonPublication(job.id);
      const success = Boolean(response.data && !response.error);
      setResults([{
        lessonId: job.lesson_id,
        success,
        error: success ? undefined : response.error?.message || (isAr ? 'الخادم مأكّدش إلغاء الموعد.' : 'The server did not confirm cancellation.')
      }]);
      void refreshJobs().catch(error => console.warn('Post-cancel refresh failed:', error));
    } catch (error) {
      setResults([{
        lessonId: job.lesson_id,
        success: false,
        error: error instanceof Error ? error.message : 'Cancellation failed'
      }]);
    } finally {
      setWorking(false);
    }
  };

  const handleReschedule = async (job: ScheduledLessonPublication) => {
    const scheduledDate = parsePublicationLocalDateTime(scheduledLocalTime, timezone);
    if (!scheduledDate || scheduledDate.getTime() <= Date.now()) return;
    const title = lessons.find(lesson => lesson.id === job.lesson_id)?.title || job.lesson_id;
    const confirmation = isAr
      ? `تغيّر موعد نشر "${title}" إلى ${formatPublicationTime(scheduledDate.toISOString(), timezone, 'ar-EG')} (${timezone})؟`
      : `Reschedule "${title}" to ${formatPublicationTime(scheduledDate.toISOString(), timezone, 'en')} (${timezone})?`;
    if (!window.confirm(confirmation)) return;

    setWorking(true);
    try {
      const response = await rescheduleLessonPublication(job.id, scheduledDate);
      setResults([{ lessonId: job.lesson_id, success: Boolean(response.data && !response.error), error: response.error?.message }]);
      void refreshJobs().catch(error => console.warn('Post-reschedule refresh failed:', error));
    } catch (error) {
      setResults([{
        lessonId: job.lesson_id,
        success: false,
        error: error instanceof Error ? error.message : 'Rescheduling failed'
      }]);
    } finally {
      setWorking(false);
    }
  };

  const parsedScheduleTime = parsePublicationLocalDateTime(scheduledLocalTime, timezone);
  const validFutureTime = Boolean(parsedScheduleTime && parsedScheduleTime.getTime() > Date.now());
  const calendarDays = useMemo(
    () => getPublicationCalendarDays(jobs, timezone, new Date(), 14, isAr ? 'ar-EG' : 'en'),
    [isAr, jobs, timezone]
  );

  if (!canManage) return null;

  return (
    <section className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-700 dark:bg-slate-900/70" aria-label={isAr ? 'إدارة نشر الدروس' : 'Lesson publication management'}>
      <header className="flex items-start gap-3">
        <CalendarClock className="mt-1 shrink-0 text-[var(--color-church-blue)]" />
        <div>
          <h3 className="font-black text-[var(--color-church-blue)] dark:text-white">
            {isAr ? 'النشر الفوري أو بموعد' : 'Publish now or schedule'}
          </h3>
          <p className="mt-1 text-xs leading-5 text-stone-600 dark:text-stone-300">
            {isAr
              ? 'اختار الدروس المعتمدة بس. مواعيد النشر بتتحفظ بتوقيت UTC وبتظهر حسب منطقتك الزمنية.'
              : 'Select approved lessons only. Times are stored in UTC and shown in your local timezone.'}
            {' '}<span dir="ltr">({timezone})</span>
          </p>
        </div>
      </header>

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-800">
          <span>{loadError}</span>
          <button type="button" onClick={() => void refreshJobs()} disabled={loadingJobs} className="font-black underline disabled:opacity-50">
            {isAr ? 'جرّب تاني' : 'Retry'}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex items-center gap-2 sm:me-2">
          <p className="text-xs font-bold text-stone-600 dark:text-stone-300">
            {isAr ? `المحدد: ${selectedIds.size}` : `Selected: ${selectedIds.size}`}
          </p>
          {selectedIds.size > 0 && (
            <button type="button" onClick={() => setSelectedIds(new Set())} disabled={working} className="text-xs font-bold text-stone-500 underline disabled:opacity-50">
              {isAr ? 'إلغاء التحديد' : 'Clear selection'}
            </button>
          )}
        </div>
        <label className="flex-1 space-y-1 text-xs font-bold text-stone-700 dark:text-stone-200">
          <span>{isAr ? 'موعد النشر' : 'Publication time'}</span>
          <input
            type="datetime-local"
            value={scheduledLocalTime}
            onChange={event => setScheduledLocalTime(event.target.value)}
            disabled={working}
            className="w-full rounded-lg border border-stone-300 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </label>
        <button
          type="button"
          onClick={() => void handlePublish()}
          disabled={!allEligibleSelected || working}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--color-church-blue)] px-4 py-2 text-xs font-black text-white disabled:opacity-40"
        >
          {working ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {isAr ? 'انشر الدروس المعتمدة دلوقتي' : 'Publish approved now'}
        </button>
        <button
          type="button"
          onClick={() => void handleSchedule()}
          disabled={!allEligibleSelected || !validFutureTime || working || loadingJobs || Boolean(loadError)}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40"
        >
          <CalendarClock size={15} />
          {isAr ? 'حدّد موعد نشر الدروس المعتمدة' : 'Schedule approved'}
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="relative block">
          <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={isAr ? 'دوّر بالعنوان أو الملخص أو الصف' : 'Search title, summary, or grade'}
            aria-label={isAr ? 'دوّر في مكتبة المناهج' : 'Search curriculum library'}
            className="w-full rounded-xl border border-stone-300 bg-white py-2.5 ps-9 pe-3 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-900">
          <Filter size={14} />
          <span>{isAr ? 'الصف' : 'Grade'}</span>
          <select value={gradeFilter} onChange={event => setGradeFilter(event.target.value)} aria-label={isAr ? 'تصفية حسب الصف' : 'Filter by grade'} className="min-w-24 bg-transparent py-2.5">
            <option value="all">{isAr ? 'كل الصفوف' : 'All grades'}</option>
            {gradeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-900">
          <span>{isAr ? 'الحالة' : 'Status'}</span>
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label={isAr ? 'تصفية حسب حالة النشر' : 'Filter by publication status'} className="min-w-28 bg-transparent py-2.5">
            <option value="all">{isAr ? 'كل الحالات' : 'All statuses'}</option>
            {Object.entries(labels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
          </select>
        </label>
      </div>

      <div aria-label={isAr ? 'توزيع حالات المنهج الظاهرة' : 'Visible curriculum status distribution'} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(['Draft', 'Awaiting Review', 'Approved', 'Published'] as const).map(status => (
          <div key={status} className="rounded-xl border border-stone-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-[10px] font-bold text-stone-500">{labels[status]}</p>
            <p className="text-lg font-black tabular-nums text-stone-900 dark:text-white">{statusCounts[status] || 0}</p>
          </div>
        ))}
      </div>

      <div className="max-h-72 space-y-2 overflow-auto rounded-xl border border-stone-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
        {filteredRows.map(({ lesson, version, eligibility, activeJob, status }) => {
          const selectable = Boolean(
            version &&
            eligibility.canPublish &&
            canManageLessonVersion(role, userId, version) &&
            !activeJob
          );
          return (
            <label key={lesson.id} className={`flex items-start gap-3 rounded-lg p-2.5 ${selectable ? 'cursor-pointer hover:bg-stone-50 dark:hover:bg-slate-900' : 'opacity-80'}`}>
              <input
                type="checkbox"
                checked={selectedIds.has(lesson.id)}
                disabled={!selectable || working}
                onChange={() => toggleSelection(lesson.id)}
                className="mt-1 size-4 accent-amber-600"
                aria-label={`${isAr ? 'اختيار' : 'Select'} ${lesson.title}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-stone-800 dark:text-stone-100">{lesson.title}</span>
                <span className="mt-0.5 block text-xs text-stone-500">
                  {labels[status]}
                  {lesson.grade && <> · {lesson.grade}</>}
                  {!selectable && eligibility.reason && status !== 'Scheduled' && status !== 'Published' && (
                    <> · {eligibility.reason}</>
                  )}
                  {activeJob && (
                    <> · {isAr ? 'موعد النشر:' : 'Publishes:'} {formatPublicationTime(activeJob.scheduled_at, timezone, isAr ? 'ar-EG' : 'en')}</>
                  )}
                </span>
              </span>
            </label>
          );
        })}
        {!filteredRows.length && (
          <p role="status" className="rounded-lg p-4 text-center text-xs text-stone-500">
            {isAr ? 'لا توجد دروس تطابق البحث والتصفية.' : 'No lessons match the search and filters.'}
          </p>
        )}
      </div>

      {results.length > 0 && (
        <div aria-live="polite" className="space-y-1 rounded-xl border border-stone-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
          <p className="mb-2 text-xs font-black">{isAr ? 'نتيجة كل عنصر' : 'Result for every item'}</p>
          {results.map(result => (
            <p key={result.lessonId} className={`flex items-start gap-2 text-xs ${result.success ? 'text-emerald-700' : 'text-red-700'}`}>
              {result.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              <span className="break-all">{lessons.find(lesson => lesson.id === result.lessonId)?.title || result.lessonId}{result.error ? ` — ${result.error}` : ''}</span>
            </p>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-black text-stone-700 dark:text-stone-200">{isAr ? 'تقويم النشر · ١٤ يوماً' : 'Publishing calendar · 14 days'}</h4>
          <span dir="ltr" className="text-[10px] text-stone-500">{timezone}</span>
        </div>
        {loadingJobs ? (
          <p className="text-xs text-stone-500">{isAr ? 'جارٍ تحميل التقويم...' : 'Loading calendar...'}</p>
        ) : loadError ? (
          <p role="status" className="text-xs text-stone-500">{isAr ? 'التقويم غير متاح حتى نجاح تحميل المواعيد.' : 'Calendar unavailable until schedules load successfully.'}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {calendarDays.map(day => (
              <div key={day.dateKey} className={`min-h-20 rounded-lg border p-2 ${day.isToday ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : 'border-stone-200 bg-white dark:border-slate-700 dark:bg-slate-950'}`}>
                <p className="text-[10px] font-black text-stone-600 dark:text-stone-300">{day.label}</p>
                {day.jobs.length === 0 ? (
                  <p className="mt-2 text-[10px] text-stone-400">—</p>
                ) : (
                  <div className="mt-1 space-y-1">
                    {day.jobs.slice(0, 2).map(job => {
                      const title = lessons.find(lesson => lesson.id === job.lesson_id)?.title || job.lesson_id;
                      const statusColor = job.status === 'published'
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : job.status === 'failed'
                          ? 'text-red-700 dark:text-red-300'
                          : job.status === 'cancelled'
                            ? 'text-stone-500'
                            : 'text-amber-800 dark:text-amber-300';
                      return (
                        <p key={job.id} className={`truncate text-[10px] font-bold ${statusColor}`} title={`${title} · ${job.status}`}>
                          {formatPublicationTime(job.scheduled_at, timezone, isAr ? 'ar-EG' : 'en').split(',').pop()?.trim()} · {title} · {getPublicationStatusText(job.status, isAr)}
                        </p>
                      );
                    })}
                    {day.jobs.length > 2 && <p className="text-[10px] text-stone-500">+{day.jobs.length - 2}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-black text-stone-700 dark:text-stone-200">{isAr ? 'المواعيد المجدولة وحالتها' : 'Scheduled publication status'}</h4>
        {loadingJobs ? (
          <p className="flex items-center gap-2 text-xs text-stone-500"><Loader2 size={14} className="animate-spin" />{isAr ? 'جارٍ تحميل المواعيد...' : 'Loading schedules...'}</p>
        ) : loadError ? (
          <p role="status" className="text-xs text-stone-500">{isAr ? 'تعذر تحميل حالة مواعيد النشر.' : 'Publication statuses are unavailable because schedules did not load.'}</p>
        ) : jobs.length === 0 ? (
          <p className="text-xs text-stone-500">{isAr ? 'لا توجد مواعيد نشر محفوظة.' : 'No saved publication schedules.'}</p>
        ) : jobs.map(job => {
          const title = lessons.find(lesson => lesson.id === job.lesson_id)?.title || job.lesson_id;
          const isScheduled = job.status === 'scheduled';
          return (
            <div key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-950">
              <div className="min-w-0">
                <p className="truncate font-bold">{title}</p>
                <p className="text-stone-500">{getPublicationStatusText(job.status, isAr)} · {formatPublicationTime(job.scheduled_at, timezone, isAr ? 'ar-EG' : 'en')}</p>
                {job.error_message && <p role="alert" className="mt-1 text-red-700">{job.error_message}</p>}
              </div>
              {isScheduled && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => void handleReschedule(job)} disabled={!validFutureTime || working} className="rounded-md border border-stone-300 px-2 py-1 font-bold disabled:opacity-40">
                    {isAr ? 'تغيّر موعد نشر' : 'Reschedule'}
                  </button>
                  <button type="button" onClick={() => void handleCancel(job)} disabled={working} className="rounded-md border border-red-300 px-2 py-1 font-bold text-red-700 disabled:opacity-40">
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {loadError && <p className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200"><AlertCircle size={14} />{isAr ? 'قد تكون الجدولة غير متاحة قبل تطبيق ترحيل Phase 11 وتفعيل pg_cron.' : 'Scheduling requires the Phase 11 migration and enabled pg_cron.'}</p>}
    </section>
  );
}
