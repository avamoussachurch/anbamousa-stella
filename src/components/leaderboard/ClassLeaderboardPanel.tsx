import React, { useEffect, useState } from 'react';
import { Flame, RefreshCw, Trophy } from 'lucide-react';
import { getAuthoritativeLeaderboard } from '../../lib/studentProgressService';
import type { Language } from '../../types';

type Result = Awaited<ReturnType<typeof getAuthoritativeLeaderboard>>;

export function ClassLeaderboardPanel({ lang, childId, childName }: { lang: Language; childId?: string; childName?: string }) {
  const isArabic = lang === 'ar';
  const [timeframe, setTimeframe] = useState<'weekly' | 'all_time'>('weekly');
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (childId === '') { setResult(null); return; }
    setLoading(true);
    getAuthoritativeLeaderboard({ timeframe, studentId: childId }).then(value => {
      if (!active) return;
      setResult(value);
      setLoading(false);
    });
    return () => { active = false; };
  }, [childId, timeframe]);

  const entries = result?.leaderboard || [];
  const streaks = result?.streakLeaderboard || [];
  const currentId = childId || result?.currentUserEntry?.studentId;

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 px-3 py-5 sm:px-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4">
        <div className="flex items-center gap-3"><Trophy className="text-amber-500" size={25}/><div><h2 className="font-black">{isArabic ? 'ترتيب الفصل' : 'Class leaderboards'}</h2><p className="text-sm text-[var(--text-secondary)]">{childName ? (isArabic ? `ترتيب ${childName} في فصله` : `${childName}’s class ranking`) : (isArabic ? 'ترتيب النقاط والاستمرارية للفصل المكلّف به.' : 'Points and streak rankings for your assigned class.')}</p></div></div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setTimeframe('weekly')} aria-pressed={timeframe === 'weekly'} className={`min-h-10 rounded-xl px-3 text-xs font-black ${timeframe === 'weekly' ? 'bg-[var(--action-primary)] text-[var(--action-primary-text)]' : 'border'}`}>{isArabic ? 'الأسبوع' : 'Weekly'}</button>
          <button type="button" onClick={() => setTimeframe('all_time')} aria-pressed={timeframe === 'all_time'} className={`min-h-10 rounded-xl px-3 text-xs font-black ${timeframe === 'all_time' ? 'bg-[var(--action-primary)] text-[var(--action-primary-text)]' : 'border'}`}>{isArabic ? 'الإجمالي' : 'All-time'}</button>
          <button type="button" onClick={() => { setResult(null); setTimeframe(value => value); }} aria-label={isArabic ? 'تحديث الترتيب' : 'Refresh leaderboard'} className="rounded-xl border p-2"><RefreshCw size={16}/></button>
        </div>
      </header>
      {childId === '' ? <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-[var(--text-secondary)]">{isArabic ? 'اربط حساب ابنك أو بنتك أولاً لعرض ترتيبهم.' : 'Link a child account first to view their ranking.'}</p>
        : loading ? <p role="status" className="p-8 text-center text-sm">{isArabic ? 'بنحمّل الترتيب الرسمي...' : 'Loading verified rankings...'}</p>
        : result?.error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{result.error}</p>
        : !result || entries.length === 0 ? <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-[var(--text-secondary)]">{isArabic ? 'الترتيب غير متاح حالياً؛ لازم يكون فيه فصل نشط وتلاميذ مسجلين.' : 'Rankings are not available yet. An active class and enrolled students are required.'}</p>
        : <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4">
            <h3 className="mb-3 flex items-center gap-2 font-black"><Trophy size={18} className="text-amber-500"/>{isArabic ? 'ترتيب النقاط' : 'Points ranking'}</h3>
            <ol className="space-y-2">{entries.map((entry: any) => <li key={entry.studentId} className={`flex items-center gap-3 rounded-xl p-3 ${entry.studentId === currentId ? 'bg-amber-100/70 dark:bg-amber-950/30 ring-1 ring-amber-400' : 'bg-[var(--surface-secondary)]'}`}>
              <span className="w-8 text-center text-sm font-black">#{entry.rank}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{entry.studentName}</p><p className="text-xs text-[var(--text-secondary)]">{entry.grade || ''}</p></div>
              <span className="text-sm font-black tabular-nums">{timeframe === 'weekly' ? entry.pointsThisWeek : entry.totalPoints} {isArabic ? 'نقطة' : 'pts'}</span>
            </li>)}</ol>
          </section>
          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4">
            <h3 className="mb-3 flex items-center gap-2 font-black"><Flame size={18} className="text-orange-500"/>{isArabic ? 'ترتيب الاستمرارية' : 'Streak ranking'}</h3>
            <ol className="space-y-2">{streaks.map((entry: any) => <li key={entry.studentId} className={`flex items-center gap-3 rounded-xl p-3 ${entry.studentId === currentId ? 'bg-amber-100/70 dark:bg-amber-950/30 ring-1 ring-amber-400' : 'bg-[var(--surface-secondary)]'}`}>
              <span className="w-8 text-center text-sm font-black">#{entry.rank}</span>
              <p className="min-w-0 flex-1 truncate text-sm font-bold">{entry.studentName}</p>
              <span className="text-sm font-black tabular-nums">{entry.streakDays} {isArabic ? 'يوم' : 'days'}</span>
            </li>)}</ol>
          </section>
        </div>}
      <p className="text-xs text-[var(--text-secondary)]">{isArabic ? 'البيانات من نقاط وإنجازات موثقة على الخادم، والوصول محكوم بصلاحيات الفصل أو علاقة الأسرة الموثقة.' : 'Rankings use server-verified points and completions. Access is limited to assigned classes or verified family links.'}</p>
    </section>
  );
}
