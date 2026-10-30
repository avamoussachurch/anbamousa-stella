import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarClock, CheckCircle2, Loader2, Send, XCircle } from 'lucide-react';
import { Lesson, LessonVersion } from '../../types';
import {
  canPublishVersion,
  cancelLessonPublication,
  canManageLessonVersion,
  formatPublicationTime,
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
): 'Draft' | 'Awaiting Review' | 'Scheduled' | 'Published' | 'Failed' {
  const lessonJobs = jobs.filter(job => job.lesson_id === lesson.id);
  if (lessonJobs.some(job => job.status === 'scheduled' || job.status === 'processing')) return 'Scheduled';
  if (lessonJobs.some(job => job.status === 'failed')) return 'Failed';
  if (lesson.status === 'published' || version?.status === 'PUBLISHED') return 'Published';
  if (version?.status === 'SERVANT_REVIEW') return 'Awaiting Review';
  return 'Draft';
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
      job.lesson_id === lesson.id && (job.status === 'scheduled' || job.status === 'processing')
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

  const selectedRows = rows.filter(row => selectedIds.has(row.lesson.id));
  const allEligibleSelected = selectedRows.length > 0 && selectedRows.every(row =>
    row.eligibility.canPublish && row.canManageVersion && !row.activeJob
  );
  const labels = {
    Draft: isAr ? 'مسودة' : 'Draft',
    'Awaiting Review': isAr ? 'بانتظار المراجعة' : 'Awaiting Review',
    Scheduled: isAr ? 'مجدول' : 'Scheduled',
    Published: isAr ? 'منشور' : 'Published',
    Failed: isAr ? 'فشل النشر' : 'Failed'
  };

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
    setWorking(true);
    clearResults();
    const outcome = await publishLessonsInBulk(
      selectedRows.map(row => ({ lessonId: row.lesson.id, versionId: row.version!.id })),
      publishLessonVersion
    );
    setResults(outcome.map(item => ({
      lessonId: item.lessonId,
      success: item.success,
      error: item.error
    })));
    setWorking(false);
    setSelectedIds(new Set());
    await Promise.all([onRefresh(), refreshJobs()]);
  };

  const handleSchedule = async () => {
    const scheduledDate = parsePublicationLocalDateTime(scheduledLocalTime, timezone);
    if (!allEligibleSelected || !scheduledDate || scheduledDate.getTime() <= Date.now() || working || loadingJobs || loadError) return;
    setWorking(true);
    clearResults();
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
    setWorking(false);
    setSelectedIds(new Set());
    await refreshJobs();
  };

  const handleCancel = async (job: ScheduledLessonPublication) => {
    setWorking(true);
    const response = await cancelLessonPublication(job.id);
    const success = Boolean(response.data && !response.error);
    setResults([{
      lessonId: job.lesson_id,
      success,
      error: success ? undefined : response.error?.message || (isAr ? 'لم يؤكد الخادم إلغاء الموعد.' : 'The server did not confirm cancellation.')
    }]);
    setWorking(false);
    await refreshJobs();
  };

  const handleReschedule = async (job: ScheduledLessonPublication) => {
    const scheduledDate = parsePublicationLocalDateTime(scheduledLocalTime, timezone);
    if (!scheduledDate || scheduledDate.getTime() <= Date.now()) return;
    setWorking(true);
    const response = await rescheduleLessonPublication(job.id, scheduledDate);
    setResults([{ lessonId: job.lesson_id, success: Boolean(response.data && !response.error), error: response.error?.message }]);
    setWorking(false);
    await refreshJobs();
  };

  const parsedScheduleTime = parsePublicationLocalDateTime(scheduledLocalTime, timezone);
  const validFutureTime = Boolean(parsedScheduleTime && parsedScheduleTime.getTime() > Date.now());

  if (!canManage) return null;

  return (
    <section className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-slate-700 dark:bg-slate-900/70" aria-label={isAr ? 'إدارة نشر الدروس' : 'Lesson publication management'}>
      <header className="flex items-start gap-3">
        <CalendarClock className="mt-1 shrink-0 text-[var(--color-church-blue)]" />
        <div>
          <h3 className="font-black text-[var(--color-church-blue)] dark:text-white">
            {isAr ? 'النشر الفوري والمجدول' : 'Publish now or schedule'}
          </h3>
          <p className="mt-1 text-xs leading-5 text-stone-600 dark:text-stone-300">
            {isAr
              ? 'اختار الدروس المعتمدة فقط. المواعيد محفوظة بتوقيت UTC وتُعرض حسب منطقتك الزمنية.'
              : 'Select approved lessons only. Times are stored in UTC and shown in your local timezone.'}
            {' '}<span dir="ltr">({timezone})</span>
          </p>
        </div>
      </header>

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-800">
          <span>{loadError}</span>
          <button type="button" onClick={() => void refreshJobs()} disabled={loadingJobs} className="font-black underline disabled:opacity-50">
            {isAr ? 'حاول تاني' : 'Retry'}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
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
          {isAr ? 'نشر المعتمد الآن' : 'Publish approved now'}
        </button>
        <button
          type="button"
          onClick={() => void handleSchedule()}
          disabled={!allEligibleSelected || !validFutureTime || working || loadingJobs || Boolean(loadError)}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40"
        >
          <CalendarClock size={15} />
          {isAr ? 'جدولة المعتمد' : 'Schedule approved'}
        </button>
      </div>

      <div className="max-h-72 space-y-2 overflow-auto rounded-xl border border-stone-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
        {rows.map(({ lesson, version, eligibility, activeJob, status }) => {
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
        <h4 className="text-xs font-black text-stone-700 dark:text-stone-200">{isAr ? 'المواعيد المجدولة وحالتها' : 'Scheduled publication status'}</h4>
        {loadingJobs ? (
          <p className="flex items-center gap-2 text-xs text-stone-500"><Loader2 size={14} className="animate-spin" />{isAr ? 'جارٍ تحميل المواعيد...' : 'Loading schedules...'}</p>
        ) : jobs.length === 0 ? (
          <p className="text-xs text-stone-500">{isAr ? 'لا توجد مواعيد نشر محفوظة.' : 'No saved publication schedules.'}</p>
        ) : jobs.map(job => {
          const title = lessons.find(lesson => lesson.id === job.lesson_id)?.title || job.lesson_id;
          const isScheduled = job.status === 'scheduled';
          return (
            <div key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-950">
              <div className="min-w-0">
                <p className="truncate font-bold">{title}</p>
                <p className="text-stone-500">{labels[job.status === 'failed' ? 'Failed' : job.status === 'published' ? 'Published' : isScheduled || job.status === 'processing' ? 'Scheduled' : 'Draft']} · {formatPublicationTime(job.scheduled_at, timezone, isAr ? 'ar-EG' : 'en')}</p>
                {job.error_message && <p role="alert" className="mt-1 text-red-700">{job.error_message}</p>}
              </div>
              {isScheduled && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => void handleReschedule(job)} disabled={!validFutureTime || working} className="rounded-md border border-stone-300 px-2 py-1 font-bold disabled:opacity-40">
                    {isAr ? 'إعادة جدولة' : 'Reschedule'}
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
