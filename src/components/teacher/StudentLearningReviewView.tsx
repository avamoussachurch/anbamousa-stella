import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  HelpCircle, 
  RefreshCw,
  ShieldCheck,
  Calendar,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getStudentLearningReview, 
  StudentLearningReviewData, 
  StudentLessonReview 
} from '../../lib/classRosterService';

interface StudentLearningReviewViewProps {
  studentId: string;
  onBack: () => void;
  lang?: 'en' | 'ar';
}

export const StudentLearningReviewView: React.FC<StudentLearningReviewViewProps> = ({
  studentId,
  onBack,
  lang = 'en'
}) => {
  const isAr = lang === 'ar';
  const [data, setData] = useState<StudentLearningReviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadReview = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: reviewData, error: err } = await getStudentLearningReview(studentId);
      if (err || !reviewData) {
        setError(err?.message || (isAr ? 'مش قادرين نحمّل تقرير التلميذ.' : 'Failed to load student learning review'));
        return;
      }
      setData(reviewData);
    } catch (e: any) {
      setError(e?.message || (isAr ? 'حصلت مشكلة وإحنا بنحمّل التقرير.' : 'Unexpected error loading review'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReview();
  }, [studentId]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header with Back Button */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors border border-stone-700 cursor-pointer flex items-center justify-center"
            title={isAr ? 'ارجع لقائمة الفصل' : 'Back to Class Roster'}
          >
            <ArrowLeft size={18} className={isAr ? 'rotate-180' : ''} />
          </button>

          {data ? (
            <div className="flex items-center gap-3">
              <img 
                src={data.student.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.student.id}`} 
                alt={data.student.name}
                className="w-12 h-12 rounded-full bg-stone-800 border-2 border-amber-500/40 object-cover" 
              />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-stone-100">{data.student.name}</h2>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <ShieldCheck size={11} />
                    {isAr ? 'سجل رسمي' : 'Authoritative'}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  {data.student.grade} • <span className="font-mono text-stone-500">{data.student.id}</span>
                </p>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-stone-100">{isAr ? 'تقرير الطالب' : 'Student Learning Review'}</h2>
              <p className="text-xs text-stone-400 mt-0.5 font-mono">{studentId}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-stone-400 bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800">
            {isAr ? 'للمراجعة والمتابعة بس 🔒' : 'Read-Only Pastoral Review 🔒'}
          </span>
          <button
            onClick={loadReview}
            disabled={loading}
            className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold flex items-center justify-center transition-colors border border-stone-700 cursor-pointer disabled:opacity-50"
            title={isAr ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 text-rose-200 text-xs flex items-center gap-2.5">
          <AlertCircle size={16} className="text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !data && (
        <div className="py-20 text-center text-stone-500 text-xs flex flex-col items-center gap-3">
          <RefreshCw size={24} className="animate-spin text-amber-500" />
          <span>{isAr ? 'بنحمّل سجل التعلّم ومستوى الإتقان...' : 'Loading learning review & mastery metrics...'}</span>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* 1. Summary Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-emerald-400 mb-2">
                <span className="text-xs font-medium text-stone-400">{isAr ? 'المُتقن' : 'Mastered'}</span>
                <Award size={18} />
              </div>
              <div className="text-2xl font-bold text-stone-100">{data.summary.masteredCount}</div>
              <p className="text-[11px] text-stone-500 mt-1">{isAr ? 'دروس التلميذ أتقنها بالكامل' : 'Fully mastered lessons'}</p>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-amber-400 mb-2">
                <span className="text-xs font-medium text-stone-400">{isAr ? 'قيد التطوير' : 'Developing'}</span>
                <Clock size={18} />
              </div>
              <div className="text-2xl font-bold text-stone-100">{data.summary.developingCount}</div>
              <p className="text-[11px] text-stone-500 mt-1">{isAr ? 'قراءة أو اختبار لسه مخلصش' : 'In progress / partial'}</p>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-rose-400 mb-2">
                <span className="text-xs font-medium text-stone-400">{isAr ? 'يحتاج مراجعة' : 'Needs Review'}</span>
                <AlertTriangle size={18} />
              </div>
              <div className="text-2xl font-bold text-stone-100">{data.summary.needsReviewCount}</div>
              <p className="text-[11px] text-stone-500 mt-1">{isAr ? 'محتاج متابعة وتشجيع من الخادم' : 'Needs pastoral follow-up'}</p>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-blue-400 mb-2">
                <span className="text-xs font-medium text-stone-400">{isAr ? 'الدروس المكتملة' : 'Completed'}</span>
                <BookOpen size={18} />
              </div>
              <div className="text-2xl font-bold text-stone-100">
                {data.summary.completedLessonsCount} / {data.summary.totalLessons}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">{isAr ? 'من الدروس المنشورة' : 'Published lessons'}</p>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-purple-400 mb-2">
                <span className="text-xs font-medium text-stone-400">{isAr ? 'متوسط التقييمات' : 'Avg. Quiz'}</span>
                <HelpCircle size={18} />
              </div>
              <div className="text-2xl font-bold font-mono text-stone-100">{data.summary.averageQuizScore}%</div>
              <p className="text-[11px] text-stone-500 mt-1">{isAr ? 'متوسط درجات الاختبارات' : 'Average quiz score'}</p>
            </div>
          </div>

          {/* 2. Needs Review Callout (if any) */}
          {data.needsReviewItems.length > 0 && (
            <div className="bg-rose-950/30 border border-rose-800/60 rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                <AlertTriangle size={18} className="text-rose-400" />
                <span>{isAr ? 'نقاط محتاجة متابعة وتشجيع من الخادم' : 'Areas Requiring Servant Attention & Review'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.needsReviewItems.map((item) => (
                  <div key={item.lessonId} className="bg-stone-950/80 border border-rose-900/50 rounded-xl p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-200 text-xs">{item.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-900/40 text-rose-300 border border-rose-800">
                        {item.latestQuizPercentage}% Quiz
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-300/80">
                      {item.masteryStatus === 'NEEDS_REVIEW' 
                        ? (isAr ? 'النتيجة أقل من ٦٠٪. الأفضل تراجع معاه الأفكار الأساسية في الدرس.' : 'Assessment score below 60%. Recommended to review core lesson concepts together.')
                        : (isAr ? 'التلميذ محتاج يكمّل قراءة الدرس والاختبار.' : 'Incomplete reading and quiz.')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Published Lessons Progress & Mastery Breakdown */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-amber-400" />
                <h3 className="text-sm font-bold text-stone-200">
                  {isAr ? 'سجل دروس المنهج المنشور' : 'Published Curriculum Lessons Progress'}
                </h3>
              </div>
              <span className="text-xs text-stone-400 font-medium">
                {data.lessons.length} {isAr ? 'دروس رسمية' : 'Published Lessons'}
              </span>
            </div>

            {data.lessons.length === 0 ? (
              <div className="py-10 text-center text-stone-500 text-xs">
                {isAr ? 'مفيش دروس منشورة متسجلة دلوقتي.' : 'No published lessons found.'}
              </div>
            ) : (
              <div className="divide-y divide-stone-800/80">
                {data.lessons.map((lesson) => {
                  const mastery = lesson.masteryStatus;
                  return (
                    <div key={lesson.lessonId} className="py-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-stone-200 text-sm flex items-center gap-2">
                            <span>{lesson.title}</span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700">
                              {lesson.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                            {lesson.lessonId} • Ver: {lesson.versionId}
                          </p>
                        </div>

                        {/* Mastery status badge */}
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                            mastery === 'MASTERED'
                              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-400'
                              : mastery === 'DEVELOPING'
                              ? 'bg-amber-950/70 border-amber-800 text-amber-400'
                              : mastery === 'NEEDS_REVIEW'
                              ? 'bg-rose-950/70 border-rose-800 text-rose-400'
                              : 'bg-stone-800 border-stone-700 text-stone-400'
                          }`}>
                            <Award size={12} />
                            <span>{mastery}</span>
                          </span>
                        </div>
                      </div>

                      {/* Progress and Quiz metrics row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-950/60 p-3 rounded-xl border border-stone-800/80 text-xs">
                        {/* Reading Progress */}
                        <div>
                          <div className="flex items-center justify-between text-stone-400 text-[11px] mb-1">
                            <span>{isAr ? 'تقدم القراءة' : 'Reading Progress'}</span>
                            <span className="font-mono text-stone-300">{lesson.completionPercent}%</span>
                          </div>
                          <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                lesson.completionPercent === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${lesson.completionPercent}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-stone-500 mt-1">
                            {lesson.sectionsCompleted.length} / {lesson.totalSections} {isAr ? 'أجزاء خلص قراءتها' : 'sections read'}
                          </p>
                        </div>

                        {/* Quiz Attempt & Score */}
                        <div>
                          <div className="flex items-center justify-between text-stone-400 text-[11px] mb-1">
                            <span>{isAr ? 'نتيجة التقييم' : 'Quiz Assessment'}</span>
                            <span className="font-mono text-stone-300">{lesson.latestQuizPercentage}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              lesson.quizAttemptsCount === 0
                                ? 'bg-stone-800 text-stone-400'
                                : lesson.quizPassed
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}>
                              {lesson.quizAttemptsCount === 0 
                                ? (isAr ? 'لسه ممتحنش' : 'Not Attempted')
                                : lesson.quizPassed 
                                ? (isAr ? 'ناجح ✅' : 'Passed') 
                                : (isAr ? 'يحتاج إعادة ⚠️' : 'Review Needed')}
                            </span>
                            <span className="text-[10px] text-stone-500">
                              ({lesson.quizAttemptsCount} {isAr ? 'محاولات' : 'attempts'})
                            </span>
                          </div>
                        </div>

                        {/* Last Activity */}
                        <div>
                          <div className="text-stone-400 text-[11px] mb-1">
                            {isAr ? 'آخر نشاط' : 'Last Activity'}
                          </div>
                          <div className="text-[11px] text-stone-300 flex items-center gap-1.5">
                            <Clock size={12} className="text-stone-500" />
                            <span>
                              {lesson.lastActivityAt 
                                ? new Date(lesson.lastActivityAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : (isAr ? 'لا يوجد نشاط' : 'No recorded activity')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Recent Activity Log */}
          {data.recentActivity && data.recentActivity.length > 0 && (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-stone-800">
                <Activity size={18} className="text-amber-400" />
                <h3 className="text-sm font-bold text-stone-200">
                  {isAr ? 'سجل النشاط والتفاعل الأخير' : 'Recent Learning Activity Log'}
                </h3>
              </div>

              <div className="space-y-2">
                {data.recentActivity.map((act, idx) => (
                  <div key={idx} className="bg-stone-950/70 border border-stone-800/80 rounded-xl p-3 flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        act.type === 'quiz' ? 'bg-purple-950 text-purple-300' : 'bg-emerald-950 text-emerald-300'
                      }`}>
                        {act.type === 'quiz' ? <HelpCircle size={14} /> : <CheckCircle2 size={14} />}
                      </div>
                      <div>
                        <div className="font-semibold text-stone-200">{act.lessonTitle}</div>
                        <p className="text-[11px] text-stone-400">{act.description}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-stone-500 font-mono shrink-0">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
