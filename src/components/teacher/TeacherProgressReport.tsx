import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, CheckCircle2, Clock3, RefreshCw, Search, Target, Users } from 'lucide-react';
import { getServantHomeSummary, type ServantHomeSummary } from '../../lib/servantHomeService';
import type { Language } from '../../types';

export function TeacherProgressReport({ lang }: { lang: Language }) {
  const isArabic = lang === 'ar';
  const [summary, setSummary] = useState<ServantHomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState('');

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

  const students = summary?.students || [];
  const visibleStudents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return students;
    return students.filter(student =>
      student.name.toLocaleLowerCase().includes(query) ||
      student.grade.toLocaleLowerCase().includes(query) ||
      student.classNames.some(name => name.toLocaleLowerCase().includes(query)) ||
      student.classNamesAr.some(name => name.toLocaleLowerCase().includes(query))
    );
  }, [students, search]);
  const quizStudents = students.filter(student => student.averageQuizPercentage !== null);
  const averageQuiz = quizStudents.length
    ? Math.round(quizStudents.reduce((sum, student) => sum + (student.averageQuizPercentage || 0), 0) / quizStudents.length)
    : null;
  const totalCompleted = students.reduce((sum, student) => sum + student.completedLessons, 0);
  const totalAttempts = students.reduce((sum, student) => sum + student.quizAttempts, 0);
  const refresh = () => setRefreshKey(value => value + 1);
  const formatDate = (value: string | null) => value
    ? new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' }).format(new Date(value))
    : (isArabic ? '—' : '—');

  return (
    <main className="mx-auto w-full max-w-[90rem] space-y-5 px-4 py-5 sm:px-6 lg:px-8" dir={isArabic ? 'rtl' : 'ltr'}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--action-primary)]">
            {isArabic ? 'تقارير الفصل' : 'Class reporting'}
          </p>
          <h1 className="mt-1 text-2xl font-black text-[var(--text-primary)]">
            {isArabic ? 'تقدم التلاميذ والاختبارات' : 'Student progress & quizzes'}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {isArabic ? 'بيانات مباشرة من سجلات التقدم ومحاولات الاختبارات للفصول المسندة إليك.' : 'Live records from lesson progress and quiz attempts in your assigned classes.'}
          </p>
        </div>
        <button type="button" onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--state-hover)] disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {isArabic ? 'تحديث' : 'Refresh'}
        </button>
      </header>

      {loading && (
        <div role="status" className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map(item => <div key={item} className="h-24 animate-pulse rounded-2xl bg-[var(--surface-secondary)]" />)}
        </div>
      )}
      {error && !loading && (
        <section role="alert" className="rounded-2xl border border-[var(--feedback-error)]/30 bg-[var(--feedback-error)]/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5 text-[var(--feedback-error)]" />
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-[var(--text-primary)]">{isArabic ? 'تعذر تحميل التقرير' : 'Could not load the report'}</h2>
              <p className="mt-1 break-words text-sm text-[var(--text-secondary)]">{error}</p>
              <button type="button" onClick={refresh} className="mt-3 rounded-lg border border-[var(--border-default)] px-3 py-2 text-sm font-bold">{isArabic ? 'حاول مرة أخرى' : 'Try again'}</button>
            </div>
          </div>
        </section>
      )}
      {!loading && !error && summary && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Users} label={isArabic ? 'التلاميذ في فصولك' : 'Assigned students'} value={students.length.toLocaleString(isArabic ? 'ar-EG' : 'en-US')} />
            <Metric icon={BookOpen} label={isArabic ? 'الدروس المكتملة' : 'Lessons completed'} value={totalCompleted.toLocaleString(isArabic ? 'ar-EG' : 'en-US')} />
            <Metric icon={Target} label={isArabic ? 'محاولات الاختبارات' : 'Quiz attempts'} value={totalAttempts.toLocaleString(isArabic ? 'ar-EG' : 'en-US')} />
            <Metric icon={CheckCircle2} label={isArabic ? 'متوسط الاختبارات' : 'Average quiz score'} value={averageQuiz === null ? '—' : `${averageQuiz}%`} />
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] p-4">
              <div>
                <h2 className="font-black text-[var(--text-primary)]">{isArabic ? 'ملخص كل تلميذ' : 'Student-by-student summary'}</h2>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{isArabic ? `العام الكنسي: ${summary.churchYear || '—'} • آخر تحديث: ${formatDate(summary.checkedAt)}` : `Church year: ${summary.churchYear || '—'} • Updated: ${formatDate(summary.checkedAt)}`}</p>
              </div>
              <label className="relative block w-full sm:w-64">
                <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder={isArabic ? 'ابحث باسم التلميذ أو الفصل' : 'Search students or classes'} className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] py-2 ps-9 pe-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--action-primary)]" />
              </label>
            </div>

            {students.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="mx-auto mb-3 text-[var(--text-tertiary)]" size={28} />
                <p className="font-bold text-[var(--text-primary)]">{isArabic ? 'لا يوجد تلاميذ مسجلون في فصولك النشطة' : 'No students are enrolled in your active assigned classes'}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{isArabic ? 'عند تسجيل التلاميذ في فصولك ستظهر نتائجهم هنا.' : 'Student progress will appear here as students enroll and complete lessons or quizzes.'}</p>
              </div>
            ) : visibleStudents.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--text-secondary)]">{isArabic ? 'لا توجد نتائج مطابقة للبحث.' : 'No students match your search.'}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-[var(--surface-secondary)] text-xs text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-4 py-3 text-start font-bold">{isArabic ? 'التلميذ' : 'Student'}</th>
                      <th className="px-4 py-3 text-start font-bold">{isArabic ? 'الفصل / المرحلة' : 'Class / grade'}</th>
                      <th className="px-4 py-3 text-center font-bold">{isArabic ? 'الدروس' : 'Lessons'}</th>
                      <th className="px-4 py-3 text-center font-bold">{isArabic ? 'الاختبارات' : 'Quizzes'}</th>
                      <th className="px-4 py-3 text-center font-bold">{isArabic ? 'متوسط الدرجة' : 'Average score'}</th>
                      <th className="px-4 py-3 text-center font-bold">{isArabic ? 'السلسلة' : 'Streak'}</th>
                      <th className="px-4 py-3 text-end font-bold">{isArabic ? 'آخر نشاط' : 'Last activity'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {visibleStudents.map(student => (
                      <tr key={student.id} className="text-[var(--text-primary)]">
                        <td className="px-4 py-3">
                          <span className="font-bold">{student.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="block">{isArabic ? (student.classNamesAr.join('، ') || '—') : (student.classNames.join(', ') || '—')}</span>
                          <span className="text-xs text-[var(--text-secondary)]">{student.grade || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums">{student.completedLessons} / {student.progressRecords}</td>
                        <td className="px-4 py-3 text-center tabular-nums">{student.quizAttempts}</td>
                        <td className="px-4 py-3 text-center tabular-nums">{student.averageQuizPercentage === null ? '—' : `${student.averageQuizPercentage}%`}</td>
                        <td className="px-4 py-3 text-center tabular-nums">{student.currentStreak} / {student.longestStreak}</td>
                        <td className="px-4 py-3 text-end text-xs text-[var(--text-secondary)]">{formatDate(student.lastActivityAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--state-selected)] text-[var(--action-primary)]"><Icon size={19} /></span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-[var(--text-secondary)]">{label}</p>
        <p className="text-2xl font-black tabular-nums text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  );
}
