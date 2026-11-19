import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, EyeOff, LoaderCircle, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { Language } from '../../types';
import { supabase } from '../../lib/supabase';

type FeedPostReport = {
  id: string;
  post_id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: 'spam' | 'harassment' | 'inappropriate' | 'privacy' | 'other';
  details: string | null;
  status: 'open' | 'actioned' | 'dismissed';
  created_at: string;
};

type ReportCard = FeedPostReport & {
  post?: { id: string; author_name: string; content: string; is_hidden: boolean } | null;
  reporter?: { id: string; name: string; grade: string | null } | null;
};

const reasonLabels: Record<FeedPostReport['reason'], { en: string; ar: string }> = {
  spam: { en: 'Spam or repeated content', ar: 'رسائل مزعجة أو محتوى مكرر' },
  harassment: { en: 'Bullying or harassment', ar: 'تنمّر أو مضايقة' },
  inappropriate: { en: 'Inappropriate content', ar: 'محتوى غير مناسب' },
  privacy: { en: 'Personal information or privacy', ar: 'معلومات شخصية أو خصوصية' },
  other: { en: 'Other', ar: 'سبب آخر' }
};

export function TeacherModerationQueue({ lang }: { lang: Language }) {
  const isArabic = lang === 'ar';
  const [reports, setReports] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setError(isArabic ? 'اتصال قاعدة البيانات غير متاح.' : 'The database connection is unavailable.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: reportError } = await supabase
      .from('feed_post_reports')
      .select('id, post_id, reporter_id, reported_user_id, reason, details, status, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(100);

    if (reportError) {
      setError(isArabic ? 'تعذر تحميل البلاغات. تأكد من صلاحية الفصل واتصال قاعدة البيانات.' : 'Reports could not be loaded. Check your class assignment and database connection.');
      setReports([]);
      setLoading(false);
      return;
    }

    const rows = (data || []) as FeedPostReport[];
    if (!rows.length) {
      setReports([]);
      setLoading(false);
      return;
    }

    const postIds = [...new Set(rows.map(row => row.post_id))];
    const reporterIds = [...new Set(rows.map(row => row.reporter_id))];
    const [postsResult, reportersResult] = await Promise.all([
      supabase.from('feed_posts').select('id, author_name, content, is_hidden').in('id', postIds),
      supabase.from('profiles').select('id, name, grade').in('id', reporterIds)
    ]);

    const postMap = new Map((postsResult.data || []).map(post => [post.id, post]));
    const reporterMap = new Map((reportersResult.data || []).map(profile => [profile.id, profile]));
    setReports(rows.map(row => ({
      ...row,
      post: postMap.get(row.post_id) || null,
      reporter: reporterMap.get(row.reporter_id) || null
    })));
    if (postsResult.error || reportersResult.error) {
      setError(isArabic ? 'تم تحميل البلاغات، لكن بعض تفاصيل المنشورات أو التلاميذ غير متاحة.' : 'Reports loaded, but some post or student details could not be loaded.');
    }
    setLoading(false);
  }, [isArabic]);

  useEffect(() => { void refresh(); }, [refresh]);

  const review = async (reportId: string, action: 'hide' | 'dismiss') => {
    if (!supabase) return;
    setBusyId(reportId);
    setError(null);
    const { data, error: reviewError } = await supabase.rpc('review_feed_post_report', {
      p_report_id: reportId,
      p_action: action,
      p_resolution_note: action === 'hide'
        ? (isArabic ? 'تم إخفاء المنشور بعد المراجعة.' : 'Post hidden after review.')
        : (isArabic ? 'تمت مراجعة البلاغ ولم يتم اتخاذ إجراء.' : 'Report reviewed; no action was needed.')
    });
    setBusyId(null);
    if (reviewError || !data?.success) {
      setError(isArabic ? 'تعذر حفظ قرار المراجعة. حاول مرة أخرى.' : 'The moderation action could not be saved. Please try again.');
      return;
    }
    await refresh();
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5 px-4 pb-28 pt-5 sm:px-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-amber-700 dark:text-amber-300">{isArabic ? 'سلامة المجتمع' : 'Community safety'}</p>
          <h2 className="mt-1 text-2xl font-black text-[var(--text-primary)]">{isArabic ? 'مراجعة بلاغات المجتمع' : 'Community moderation'}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{isArabic ? 'البلاغات التي يرسلها تلاميذ فصولك تظهر هنا بشكل خاص. يمكنك إخفاء منشور مخالف أو إغلاق بلاغ بعد مراجعته.' : 'Private reports submitted by students in your assigned classes appear here. You can hide a post that breaks community guidelines or dismiss a report after review.'}</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] disabled:opacity-50">
          {loading ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {isArabic ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {error && <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-10 text-sm text-[var(--text-secondary)]"><LoaderCircle className="animate-spin" size={18} />{isArabic ? 'جارٍ تحميل البلاغات…' : 'Loading reports…'}</div>
      ) : reports.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--surface-primary)] p-10 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-emerald-600" />
          <h3 className="mt-3 text-lg font-black text-[var(--text-primary)]">{isArabic ? 'كل شيء هادئ حالياً' : 'No reports to review'}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">{isArabic ? 'لا توجد بلاغات مفتوحة من التلاميذ في الفصول المسندة إليك. ستظهر البلاغات الجديدة هنا.' : 'There are no open reports from students in your assigned classes. New reports will appear here when submitted.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <article key={report.id} className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"><AlertTriangle size={19} /></span>
                  <div>
                    <p className="text-sm font-black text-[var(--text-primary)]">{reasonLabels[report.reason]?.[isArabic ? 'ar' : 'en'] || report.reason}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{isArabic ? 'أرسله' : 'Reported by'}: {report.reporter?.name || (isArabic ? 'تلميذ' : 'Student')}{report.reporter?.grade ? ` · ${report.reporter.grade}` : ''}</p>
                    <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">{new Date(report.created_at).toLocaleString(isArabic ? 'ar-EG' : 'en-GB')}</p>
                  </div>
                </div>
                {report.post?.is_hidden && <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{isArabic ? 'المنشور مخفي' : 'Post hidden'}</span>}
              </div>
              <div className="mt-4 rounded-2xl bg-[var(--surface-secondary)] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">{isArabic ? 'المنشور المُبلّغ عنه' : 'Reported post'}</p>
                <p className="mt-1 text-xs font-bold text-[var(--text-primary)]">{report.post?.author_name || (isArabic ? 'مستخدم' : 'User')}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-primary)]">{report.post?.content || (isArabic ? 'محتوى المنشور غير متاح.' : 'Post content is unavailable.')}</p>
              </div>
              {report.details && <p className="mt-3 rounded-xl border border-[var(--border-default)] p-3 text-sm leading-6 text-[var(--text-secondary)]">{report.details}</p>}
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => void review(report.id, 'dismiss')} disabled={busyId === report.id} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-default)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] disabled:opacity-50">
                  {busyId === report.id ? <LoaderCircle size={14} className="animate-spin" /> : <XCircle size={14} />}
                  {isArabic ? 'إغلاق البلاغ' : 'Dismiss report'}
                </button>
                {!report.post?.is_hidden && <button type="button" onClick={() => void review(report.id, 'hide')} disabled={busyId === report.id} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-700 px-3 py-2 text-xs font-black text-white disabled:opacity-50">
                  {busyId === report.id ? <LoaderCircle size={14} className="animate-spin" /> : <EyeOff size={14} />}
                  {isArabic ? 'إخفاء المنشور وإغلاق البلاغ' : 'Hide post & resolve'}
                </button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
