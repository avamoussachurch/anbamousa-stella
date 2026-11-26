import React, { useCallback, useEffect, useState } from 'react';
import { Clock, Headphones, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { FeedVoiceMessage } from '../student/FeedVoiceMessage';

type Submission = {
  id: string;
  student_id: string;
  student_name: string;
  hymn_title: string;
  recording_path: string;
  mime_type: string;
  duration_seconds: number;
  status: 'submitted' | 'reviewed';
  submitted_at: string;
  signedUrl?: string;
};

export function HymnPracticeInbox({ lang }: { lang: 'ar' | 'en' }) {
  const { userData } = useAuth();
  const isArabic = lang === 'ar';
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) { setError(isArabic ? 'الخدمة غير متاحة حالياً.' : 'Practice inbox is unavailable.'); setLoading(false); return; }
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('hymn_practice_submissions')
      .select('id,student_id,student_name,hymn_title,recording_path,mime_type,duration_seconds,status,submitted_at')
      .order('submitted_at', { ascending: false })
      .limit(40);
    if (queryError) {
      setError(queryError.message);
      setItems([]);
      setLoading(false);
      return;
    }
    const rows = data || [];
    const withUrls = await Promise.all(rows.map(async row => {
      const { data: signed, error: signError } = await supabase.storage
        .from('hymn-practice-recordings')
        .createSignedUrl(row.recording_path, 60 * 60);
      return { ...row, signedUrl: signError ? undefined : signed?.signedUrl };
    }));
    setItems(withUrls as Submission[]);
    setLoading(false);
  }, [isArabic]);

  useEffect(() => { void refresh(); }, [refresh]);

  const markReviewed = async (id: string) => {
    if (!supabase || !userData?.id) return;
    setBusyId(id);
    const { error: updateError } = await supabase.from('hymn_practice_submissions')
      .update({ status: 'reviewed', reviewed_by: userData.id, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) setError(updateError.message);
    else setItems(previous => previous.map(item => item.id === id ? { ...item, status: 'reviewed' } : item));
    setBusyId(null);
  };

  return (
    <section className="space-y-3 rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"><Headphones size={19}/></span><div><h3 className="font-black text-[var(--text-primary)]">{isArabic ? 'تسميعات الألحان من التلاميذ' : 'Student hymn practice'}</h3><p className="text-xs text-[var(--text-secondary)]">{isArabic ? 'اسمع تسجيلات التلاميذ المرتبطين بفصولك.' : 'Listen to recordings from students in your assigned classes.'}</p></div></div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-default)] px-3 text-xs font-bold text-[var(--text-primary)] disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>{isArabic ? 'تحديث' : 'Refresh'}</button>
      </header>
      {error && <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950/30 dark:text-red-200"><AlertCircle size={15}/>{error}</p>}
      {loading ? <p role="status" className="p-5 text-center text-sm text-[var(--text-secondary)]">{isArabic ? 'بنحمّل التسجيلات...' : 'Loading recordings…'}</p>
        : items.length === 0 ? <p className="rounded-2xl border border-dashed border-[var(--border-default)] p-5 text-center text-sm text-[var(--text-secondary)]">{isArabic ? 'لسه مفيش تسميعات وصلت من التلاميذ.' : 'No student recordings have been submitted yet.'}</p>
        : <div className="grid gap-3 md:grid-cols-2">{items.map(item => <article key={item.id} className="space-y-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black text-[var(--text-primary)]">{item.student_name}</p><p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">{item.hymn_title}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-[var(--text-secondary)]"><Clock size={11}/>{new Date(item.submitted_at).toLocaleString(isArabic ? 'ar-EG' : 'en-US')} · {Math.max(0,Math.floor(item.duration_seconds/60))}:{String(Math.max(0,item.duration_seconds%60)).padStart(2,'0')}</p></div><span className={'shrink-0 rounded-full px-2 py-1 text-[9px] font-black ' + (item.status === 'reviewed' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/15 text-amber-700 dark:text-amber-200')}>{item.status === 'reviewed' ? (isArabic ? 'تمت المراجعة' : 'Reviewed') : (isArabic ? 'جديد' : 'New')}</span></div>
          {item.signedUrl ? <FeedVoiceMessage src={item.signedUrl} lang={isArabic ? 'ar' : 'en'} /> : <p className="text-xs text-red-600 dark:text-red-300">{isArabic ? 'تعذر فتح التسجيل.' : 'Could not open this recording.'}</p>}
          {item.status !== 'reviewed' && <button type="button" disabled={busyId === item.id} onClick={() => void markReviewed(item.id)} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-emerald-700 px-3 text-xs font-black text-white disabled:opacity-50"><CheckCircle2 size={14}/>{isArabic ? 'تمت المراجعة' : 'Mark reviewed'}</button>}
        </article>)}</div>}
    </section>
  );
}
