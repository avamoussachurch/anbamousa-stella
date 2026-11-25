import React, { useEffect, useState } from 'react';
import { Flame, RefreshCw, Trophy } from 'lucide-react';
import { getAuthoritativeLeaderboard } from '../../lib/studentProgressService';
import { CLASS_GROUPS } from '../../lib/classGroups';
import type { Language } from '../../types';

type Result = Awaited<ReturnType<typeof getAuthoritativeLeaderboard>>;

export function ClassLeaderboardPanel({ lang, audience = 'parent', childId, childName, childOptions }: { lang: Language; audience?: 'parent' | 'staff'; childId?: string; childName?: string; childOptions?: Array<{ id: string; name: string }> }) {
  const isArabic = lang === 'ar';
  const [timeframe, setTimeframe] = useState<'weekly' | 'all_time'>('weekly');
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedChildId, setSelectedChildId] = useState(childId || '');
  const [selectedClassGroupId, setSelectedClassGroupId] = useState('');
  useEffect(() => { if (childId && !selectedChildId) setSelectedChildId(childId); }, [childId, selectedChildId]);
  const effectiveChildId = childOptions?.length ? selectedChildId : childId;
  const effectiveChildName = childOptions?.find(child => child.id === effectiveChildId)?.name || childName;
  const isParentView = audience === 'parent';
  const canLoadLeaderboard = !isParentView || Boolean(effectiveChildId);

  useEffect(() => {
    let active = true;
    if (!canLoadLeaderboard) { setResult(null); setLoading(false); return; }
    setLoading(true);
    setResult(null);
    getAuthoritativeLeaderboard({ timeframe, ...(isParentView ? { studentId: effectiveChildId } : selectedClassGroupId ? { classGroupId: selectedClassGroupId } : {}) }).then(value => {
      if (!active) return;
      setResult(value);
      setLoading(false);
    });
    return () => { active = false; };
  }, [canLoadLeaderboard, effectiveChildId, isParentView, selectedClassGroupId, timeframe, refreshTick]);

  const entries = result?.leaderboard || [];
  const streaks = result?.streakLeaderboard || [];
  const currentId = isParentView ? effectiveChildId : undefined;

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 px-3 py-5 sm:px-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4">
        <div className="flex items-center gap-3"><Trophy className="text-amber-500" size={25}/><div><h2 className="font-black">{isArabic ? 'ترتيب الفصل' : 'Class leaderboards'}</h2><p className="text-sm text-[var(--text-secondary)]">{effectiveChildName ? (isArabic ? `ترتيب ${effectiveChildName} في فصله` : `${effectiveChildName}’s class ranking`) : (isArabic ? 'ترتيب النقاط والاستمرارية للفصل المكلّف به.' : 'Points and streak rankings for your assigned class.')}</p></div></div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setTimeframe('weekly')} aria-pressed={timeframe === 'weekly'} className={`min-h-10 rounded-xl px-3 text-xs font-black ${timeframe === 'weekly' ? 'bg-[var(--action-primary)] text-[var(--action-primary-text)]' : 'border'}`}>{isArabic ? 'الأسبوع' : 'Weekly'}</button>
          <button type="button" onClick={() => setTimeframe('all_time')} aria-pressed={timeframe === 'all_time'} className={`min-h-10 rounded-xl px-3 text-xs font-black ${timeframe === 'all_time' ? 'bg-[var(--action-primary)] text-[var(--action-primary-text)]' : 'border'}`}>{isArabic ? 'الإجمالي' : 'All-time'}</button>
          <button type="button" onClick={() => setRefreshTick(value => value + 1)} aria-label={isArabic ? 'تحديث الترتيب' : 'Refresh leaderboard'} className="rounded-xl border p-2"><RefreshCw size={16}/></button>
        </div>
      </header>
      {isParentView && childOptions?.length ? <label className="block text-sm font-bold">{isArabic ? 'اختر ابنك أو بنتك' : 'Choose a child'}<select value={selectedChildId} onChange={event => setSelectedChildId(event.target.value)} className="mt-1 min-h-11 w-full max-w-sm rounded-xl border bg-[var(--surface-primary)] px-3">{childOptions.map(child => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label> : null}
      {!isParentView && (result?.availableClassGroupIds?.length || 0) > 0 ? <label className="block text-sm font-bold">{isArabic ? 'اختر الفصل' : 'Choose a class'}<select value={selectedClassGroupId || result?.classGroupId || ''} onChange={event => setSelectedClassGroupId(event.target.value)} className="mt-1 min-h-11 w-full max-w-sm rounded-xl border bg-[var(--surface-primary)] px-3">{result?.availableClassGroupIds.map(id => <option key={id} value={id}>{CLASS_GROUPS[id as keyof typeof CLASS_GROUPS]?.name?.[isArabic ? 'ar' : 'en'] || id}</option>)}</select></label> : null}
      {!canLoadLeaderboard ? <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-[var(--text-secondary)]">{isArabic ? 'اربط حساب ابنك أو بنتك أولاً لعرض ترتيبهم.' : 'Link a child account first to view their ranking.'}</p>
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
      <p className="text-xs text-[var(--text-secondary)]">{isArabic ? 'البيانات من نقاط وإنجازات موثقة على الخادم؛ الخادمون يرون الفصول المكلّفين بها فقط، وأولياء الأمور يرون الأبناء المرتبطين بشكل موثّق.' : 'Rankings use server-verified points and completions. Staff see only assigned classes; parents see only verified linked children.'}</p>
    </section>
  );
}
