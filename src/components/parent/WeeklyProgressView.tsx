import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, Calendar, ChevronLeft, ChevronRight, RefreshCw, Star } from 'lucide-react';
import { ChildProfile } from '../../types';
import { getChildLearningReview } from '../../lib/parentChildService';
import type { StudentLearningReviewData } from '../../lib/classRosterService';

interface WeeklyProgressViewProps {
  childrenProfiles: ChildProfile[];
  lang: 'en' | 'ar';
  onOpenAddChildModal?: () => void;
  onOpenQrScanner?: () => void;
}

export function WeeklyProgressView({
  childrenProfiles,
  lang,
  onOpenAddChildModal,
  onOpenQrScanner
}: WeeklyProgressViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [reviews, setReviews] = useState<Array<{ child: ChildProfile; data: StudentLearningReviewData | null; error: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = async () => {
    setLoading(true);
    const results = await Promise.all(childrenProfiles.map(async child => {
      const { data, error } = await getChildLearningReview(child.id);
      return { child, data, error: error?.message || null };
    }));
    setReviews(results);
    setLoading(false);
  };

  useEffect(() => {
    void loadReviews();
  }, [childrenProfiles]);

  const week = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + weekOffset * 7);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    const asDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const locale = lang === 'ar' ? 'ar-EG' : 'en-EG';
    const format = (date: Date) => date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    return { start, end, startKey: asDate(start), endKey: asDate(end), label: `${format(start)} — ${format(end)}` };
  }, [weekOffset, lang]);

  const weeklyRows = reviews.map(({ child, data, error }) => ({
    child,
    error,
    lessons: (data?.lessons || []).filter(lesson => {
      if (lesson.progressStatus !== 'COMPLETED' || !lesson.lastActivityAt) return false;
      const activityDate = new Date(lesson.lastActivityAt);
      const dateKey = `${activityDate.getFullYear()}-${String(activityDate.getMonth() + 1).padStart(2, '0')}-${String(activityDate.getDate()).padStart(2, '0')}`;
      return dateKey >= week.startKey && dateKey <= week.endKey;
    })
  }));
  const allLessons = weeklyRows.flatMap(row => row.lessons);
  const totalPoints = allLessons.reduce((total, lesson) => total + (lesson.pointsEarned || 0), 0);
  const quizLessons = allLessons.filter(lesson => lesson.quizAttemptsCount > 0);
  const averageQuiz = quizLessons.length
    ? Math.round(quizLessons.reduce((total, lesson) => total + lesson.latestQuizPercentage, 0) / quizLessons.length)
    : null;

  if (!childrenProfiles.length) {
    return (
      <div className="mousa-card-sand p-8 text-center space-y-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <UsersIcon />
        <h3 className="text-lg font-bold text-[var(--text-primary)]">
          {lang === 'ar' ? 'لا يوجد أبناء مرتبطون بعد' : 'No children linked yet'}
        </h3>
        <p className="text-sm text-[var(--text-secondary)]">
          {lang === 'ar' ? 'اربط حساب الطفل لعرض سجلاته الأسبوعية الحقيقية.' : 'Link a student account to see its real weekly records.'}
        </p>
        <div className="flex justify-center gap-3">
          {onOpenQrScanner && <button onClick={onOpenQrScanner} className="mousa-btn-quest px-4 py-2 rounded-xl">{lang === 'ar' ? 'مسح QR' : 'Scan QR'}</button>}
          {onOpenAddChildModal && <button onClick={onOpenAddChildModal} className="px-4 py-2 rounded-xl border border-[var(--border-default)] text-[var(--text-primary)]">{lang === 'ar' ? 'إدخال الرمز' : 'Enter code'}</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <section className="mousa-card-sand p-5 sm:p-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[var(--action-primary)] mb-1">
            <Calendar size={18} />
            <span className="text-xs font-bold">{lang === 'ar' ? 'ملخص أسبوعي من السجلات المحفوظة' : 'Weekly summary from persisted records'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">{week.label}</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {lang === 'ar' ? 'لا يتم احتساب الحضور أو وقت الدراسة لعدم توفر سجلات موثوقة لهما.' : 'Attendance and study time are omitted because no reliable records are available.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(offset => offset - 1)} aria-label={lang === 'ar' ? 'الأسبوع السابق' : 'Previous week'} className="p-2 rounded-xl border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--state-hover)]">
            {lang === 'ar' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button onClick={() => setWeekOffset(offset => Math.min(0, offset + 1))} disabled={weekOffset === 0} aria-label={lang === 'ar' ? 'الأسبوع التالي' : 'Next week'} className="p-2 rounded-xl border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--state-hover)] disabled:opacity-50">
            {lang === 'ar' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
          <button onClick={() => void loadReviews()} disabled={loading} className="p-2 rounded-xl border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--state-hover)] disabled:opacity-50" aria-label={lang === 'ar' ? 'تحديث السجل' : 'Refresh records'}>
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </section>

      {loading ? (
        <div className="mousa-card-sand p-8 text-center text-[var(--text-secondary)]" role="status">{lang === 'ar' ? 'جارٍ تحميل السجلات...' : 'Loading records...'}</div>
      ) : (
        <>
          {weeklyRows.some(row => row.error) && (
            <div className="mousa-card-sand p-4 text-[var(--feedback-error)] flex items-center gap-2" role="alert">
              <AlertCircle size={18} />
              <span>{lang === 'ar' ? 'تعذر تحميل سجل واحد أو أكثر. حاول التحديث.' : 'One or more records could not be loaded. Please retry.'}</span>
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: lang === 'ar' ? 'دروس مكتملة' : 'Completed lessons', value: allLessons.length, icon: BookOpen },
              { label: lang === 'ar' ? 'نقاط مسجلة' : 'Recorded points', value: totalPoints, icon: Star },
              { label: lang === 'ar' ? 'اختبارات مسجلة' : 'Quiz records', value: quizLessons.length, icon: Calendar },
              { label: lang === 'ar' ? 'متوسط آخر نتيجة' : 'Average latest score', value: averageQuiz === null ? '—' : `${averageQuiz}%`, icon: RefreshCw }
            ].map(metric => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="mousa-card-sand p-4">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs font-bold"><Icon size={16} />{metric.label}</div>
                  <div className="text-2xl font-black text-[var(--text-primary)] mt-2">{metric.value}</div>
                </div>
              );
            })}
          </div>
          {weeklyRows.map(({ child, lessons, error }) => (
            <section key={child.id} className="mousa-card-sand p-5">
              <h3 className="font-bold text-[var(--text-primary)]">{lang === 'ar' ? child.nameAr : child.nameEn}</h3>
              {error ? (
                <p className="text-sm text-[var(--feedback-error)] mt-2">{error}</p>
              ) : lessons.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)] mt-2">{lang === 'ar' ? 'لا توجد دروس مكتملة مسجلة خلال هذا الأسبوع.' : 'No completed lessons were recorded this week.'}</p>
              ) : (
                <ul className="mt-3 divide-y divide-[var(--border-default)]">
                  {lessons.map(lesson => (
                    <li key={lesson.lessonId} className="py-3 flex items-center justify-between gap-3">
                      <span className="font-medium text-[var(--text-primary)]">{lang === 'ar' ? lesson.titleAr || lesson.title : lesson.title}</span>
                      <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                        {lesson.pointsEarned || 0} {lang === 'ar' ? 'نقطة' : 'pts'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function UsersIcon() {
  return <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--surface-secondary)] text-[var(--action-primary)] flex items-center justify-center"><BookOpen size={26} /></div>;
}
