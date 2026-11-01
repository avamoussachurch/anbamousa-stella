import React, { useEffect, useState } from 'react';
import { AlertCircle, BookOpen, CheckCircle2, Clock3, RefreshCw, Trophy } from 'lucide-react';
import type { ParentChildRecord } from '../../lib/parentChildService';
import { getChildLearningReview } from '../../lib/parentChildService';
import type { StudentLearningReviewData } from '../../lib/classRosterService';

interface ParentLearningJourneyProps {
  child: ParentChildRecord;
  lang: 'ar' | 'en';
}

export function ParentLearningJourney({ child, lang }: ParentLearningJourneyProps) {
  const [review, setReview] = useState<StudentLearningReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReview = async () => {
    setLoading(true);
    setError(null);
    setReview(null);
    const result = await getChildLearningReview(child.id);
    setReview(result.data);
    setError(result.error?.message || null);
    setLoading(false);
  };

  useEffect(() => {
    void loadReview();
  }, [child.id]);

  const lessons = review?.lessons || [];
  const completedLessons = lessons.filter(lesson => lesson.progressStatus === 'COMPLETED');
  const quizAttempts = lessons.reduce((count, lesson) => count + lesson.quizAttemptsCount, 0);
  const sectionsRead = lessons.reduce((count, lesson) => count + lesson.sectionsCompleted.length, 0);
  const pointsEarned = lessons.reduce((total, lesson) => total + (lesson.pointsEarned || 0), 0);

  const labels = lang === 'ar'
    ? {
        title: 'رحلة التعلّم',
        subtitle: 'ملخص من سجلات التعلّم المحفوظة للطفل.',
        refresh: 'تحديث السجل',
        loading: 'بنحمّل سجل التعلّم...',
        retry: 'حاول تاني',
        completed: 'دروس مكتملة مسجلة',
        sections: 'أقسام مقروءة ومسجلة',
        quizzes: 'محاولات اختبارات مسجلة',
        points: 'نقاط مسجلة من الدروس',
        noRecords: 'لسه مفيش نشاط تعلّم مسجل للطفل ده.',
        quiz: 'آخر نتيجة اختبار',
        noQuiz: 'مفيش نتيجة اختبار مسجلة',
        assignedLevel: 'المستوى المعيّن للألحان والطقس',
        hymnsStatus: 'حالة الالتحاق بمدرسة الألحان',
        noLevel: 'المستوى غير متاح',
        noEnrollment: 'مفيش طلب أو عضوية ألحان مسجلة',
        approved: 'مقبول',
        pending: 'قيد المراجعة',
        rejected: 'مرفوض',
        attendance: 'الحضور مش ظاهر هنا لأن مفيش سجل حضور موثوق متاح.',
        achievements: 'سجل الإنجازات مش متاح من مصدر بيانات موثوق حالياً.',
        activity: 'نشاط التعلّم',
        sectionsLabel: 'أقسام',
        tries: 'محاولات',
        complete: 'مكتمل',
        inProgress: 'قيد التعلّم'
      }
    : {
        title: 'Learning journey',
        subtitle: 'A summary from the child’s saved learning records.',
        refresh: 'Refresh records',
        loading: 'Loading learning records…',
        retry: 'Retry',
        completed: 'Recorded completed lessons',
        sections: 'Sections read and recorded',
        quizzes: 'Recorded quiz attempts',
        points: 'Points recorded from lessons',
        noRecords: 'No learning activity has been recorded for this child yet.',
        quiz: 'Latest quiz result',
        noQuiz: 'No quiz score recorded',
        assignedLevel: 'Assigned Hymns & Taxis level',
        hymnsStatus: 'Hymns School enrollment',
        noLevel: 'Level unavailable',
        noEnrollment: 'No Hymns School request or membership recorded',
        approved: 'Approved',
        pending: 'Pending review',
        rejected: 'Rejected',
        attendance: 'Attendance is not shown because no authoritative attendance record is available.',
        achievements: 'Achievement records are not currently available from an authoritative data source.',
        activity: 'Learning activity',
        sectionsLabel: 'sections',
        tries: 'attempts',
        complete: 'Completed',
        inProgress: 'In progress'
      };

  const enrollmentStatus = child.hymnsMembership
    ? child.hymnsMembership.status === 'approved' ? labels.approved
      : child.hymnsMembership.status === 'pending' ? labels.pending
        : child.hymnsMembership.status === 'rejected' ? labels.rejected
          : child.hymnsMembership.status
    : labels.noEnrollment;

  return (
    <section className="space-y-5" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <header className="mousa-card-sand p-5 sm:p-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[var(--text-primary)]">{labels.title}</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{labels.subtitle}</p>
        </div>
        <button type="button" onClick={() => void loadReview()} disabled={loading} className="rounded-xl border border-[var(--border-default)] p-2 text-[var(--text-primary)] disabled:opacity-50" aria-label={labels.refresh}>
          <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: labels.completed, value: completedLessons.length, icon: CheckCircle2 },
          { label: labels.sections, value: sectionsRead, icon: BookOpen },
          { label: labels.quizzes, value: quizAttempts, icon: Clock3 },
          { label: labels.points, value: pointsEarned, icon: Trophy }
        ].map(metric => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="mousa-card-sand p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary)]"><Icon size={16} />{metric.label}</div>
              <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{loading ? '…' : error ? '—' : metric.value}</p>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="mousa-card-sand p-6 text-center text-[var(--text-secondary)]" role="status">{labels.loading}</div>
      ) : error ? (
        <div className="mousa-card-sand p-6 text-center" role="alert">
          <div className="mb-3 flex items-center justify-center gap-2 text-[var(--feedback-error)]"><AlertCircle size={18} /><span>{error}</span></div>
          <button type="button" onClick={() => void loadReview()} className="mousa-btn-quest rounded-xl px-4 py-2">{labels.retry}</button>
        </div>
      ) : lessons.length === 0 ? (
        <div className="mousa-card-sand p-6 text-center text-[var(--text-secondary)]">{labels.noRecords}</div>
      ) : (
        <section className="mousa-card-sand p-5">
          <h3 className="font-black text-[var(--text-primary)]">{labels.activity}</h3>
          <ul className="mt-3 divide-y divide-[var(--border-default)]">
            {lessons.map(lesson => (
              <li key={lesson.lessonId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-bold text-[var(--text-primary)]">{lang === 'ar' ? lesson.titleAr || lesson.title : lesson.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {lesson.progressStatus === 'COMPLETED' ? labels.complete : labels.inProgress}
                    {lesson.totalSections > 0 ? ` · ${lesson.sectionsCompleted.length}/${lesson.totalSections} ${labels.sectionsLabel}` : ''}
                    {lesson.quizAttemptsCount > 0 ? ` · ${lesson.quizAttemptsCount} ${labels.tries}` : ''}
                  </p>
                </div>
                <span className="text-sm font-bold text-[var(--text-secondary)]">
                  {lesson.quizAttemptsCount > 0 ? `${labels.quiz}: ${lesson.latestQuizPercentage}%` : labels.noQuiz}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid md:grid-cols-2 gap-3">
        <div className="mousa-card-sand p-5">
          <h3 className="font-black text-[var(--text-primary)]">{labels.assignedLevel}</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {child.hymnsTaxisLevel ? (lang === 'ar' ? `المستوى ${child.hymnsTaxisLevel}` : `Level ${child.hymnsTaxisLevel}`) : labels.noLevel}
          </p>
          <p className="mt-3 text-xs text-[var(--text-secondary)]">{labels.hymnsStatus}: {enrollmentStatus}</p>
        </div>
        <div className="mousa-card-sand p-5 space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">{labels.attendance}</p>
          <p className="text-sm text-[var(--text-secondary)]">{labels.achievements}</p>
        </div>
      </section>
    </section>
  );
}
