import React, { useState } from 'react';
import { 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ArrowLeft, 
  Award, 
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  AlertCircle,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import { QuizDraft, StudentQuizAttempt, QuizAnswer, Language } from '../../../types';

interface SundaySchoolQuizViewProps {
  quiz: QuizDraft;
  lessonId: string;
  studentId: string;
  lang?: Language;
  previousAttempts?: StudentQuizAttempt[];
  onBackToLesson: () => void;
  onSubmitAttempt: (attempt: Omit<StudentQuizAttempt, 'id' | 'attemptedAt'>) => Promise<{
    success: boolean;
    data?: StudentQuizAttempt | null;
    isDuplicate?: boolean;
    error?: string;
  }>;
  onReviewSection: (sectionId: string) => void;
}

export const SundaySchoolQuizView: React.FC<SundaySchoolQuizViewProps> = ({
  quiz,
  lessonId,
  studentId,
  lang = 'ar',
  previousAttempts = [],
  onBackToLesson,
  onSubmitAttempt,
  onReviewSection
}) => {
  const isAr = lang === 'ar';
  const questions = quiz.questions || [];

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [submittedAttempt, setSubmittedAttempt] = useState<StudentQuizAttempt | null>(null);

  const currentQuestion = questions[currentQuestionIndex];

  // Best recorded score from previous attempts
  const highestPreviousAttempt = previousAttempts.length > 0
    ? [...previousAttempts].sort((a, b) => (b.percentage || 0) - (a.percentage || 0))[0]
    : null;

  const handleSelectOption = (index: number) => {
    if (isSubmitted || isSubmitting) return;
    setValidationWarning(null);
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: index
    }));
    setShowExplanation(true);
  };

  const handlePrev = () => {
    setValidationWarning(null);
    setShowExplanation(selectedAnswers[questions[currentQuestionIndex - 1]?.id] !== undefined);
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    setValidationWarning(null);
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setShowExplanation(selectedAnswers[questions[nextIndex]?.id] !== undefined);
    } else {
      handleFinalSubmission();
    }
  };

  const handleJumpToQuestion = (idx: number) => {
    if (isSubmitting) return;
    setValidationWarning(null);
    setCurrentQuestionIndex(idx);
    setShowExplanation(selectedAnswers[questions[idx]?.id] !== undefined);
  };

  const handleFinalSubmission = async () => {
    if (isSubmitting || isSubmitted) return;

    // Check for incomplete questions
    const unansweredIndices: number[] = [];
    questions.forEach((q, idx) => {
      if (selectedAnswers[q.id] === undefined) {
        unansweredIndices.push(idx);
      }
    });

    if (unansweredIndices.length > 0) {
      setValidationWarning(
        isAr
          ? `يرجى الإجابة عن جميع الأسئلة أولاً (متبقي ${unansweredIndices.length} من ${questions.length} أسئلة).`
          : `Please answer all questions before submitting (${unansweredIndices.length} of ${questions.length} remaining).`
      );
      // Auto jump to first unanswered question
      setCurrentQuestionIndex(unansweredIndices[0]);
      setShowExplanation(false);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setValidationWarning(null);

    let earnedPoints = 0;
    let totalPossiblePoints = 0;
    let correctCount = 0;

    const recordedAnswers: QuizAnswer[] = questions.map(q => {
      const qDiff = q.difficulty || 'EASY';
      const qPts = q.points || (qDiff === 'HARD' ? 30 : qDiff === 'MEDIUM' ? 20 : 10);
      totalPossiblePoints += qPts;

      const selected = selectedAnswers[q.id];
      const isCorrect = selected === q.correctIndex;
      if (isCorrect) {
        correctCount += 1;
        earnedPoints += qPts;
      }

      return {
        questionId: q.id,
        selectedOptionIndex: selected ?? -1,
        isCorrect,
        feedbackEn: isCorrect 
          ? (q.explanationEn || `Correct! +${qPts} points earned.`) 
          : `Review needed: ${q.explanationEn || 'See lesson text.'}`,
        feedbackAr: q.explanationAr,
        recommendedSectionId: q.sourceRef?.sectionId,
        recommendedSectionTitle: q.sourceRef?.sectionTitle
      };
    });

    const percentage = totalPossiblePoints > 0 
      ? Math.round((earnedPoints / totalPossiblePoints) * 100) 
      : Math.round((correctCount / questions.length) * 100);

    try {
      const result = await onSubmitAttempt({
        studentId,
        lessonId,
        quizId: quiz.id,
        score: earnedPoints,
        totalScore: totalPossiblePoints || questions.length,
        percentage,
        passed: percentage >= 70,
        answers: recordedAnswers
      });

      if (!result.success) {
        throw new Error(result.error || (isAr ? 'فشل حفظ نتيجة الاختبار' : 'Failed to submit quiz attempt'));
      }

      if (result.data) {
        setSubmittedAttempt(result.data);
      }
      setIsSubmitted(true);
      setIsSubmitting(false);
    } catch (err: any) {
      console.error('Quiz submission error:', err);
      setSubmitError(err?.message || (isAr ? 'حدث خطأ أثناء حفظ الإجابات. يرجى المحاولة ثانية.' : 'Submission failed. Please retry.'));
      setIsSubmitting(false);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setIsSubmitted(false);
    setShowExplanation(false);
    setSubmitError(null);
    setValidationWarning(null);
    setSubmittedAttempt(null);
  };

  // Result Calculation for submitted view
  let finalPoints = 0;
  let finalMaxPoints = 0;
  let finalCorrectCount = 0;
  questions.forEach(q => {
    const qDiff = q.difficulty || 'EASY';
    const qPts = q.points || (qDiff === 'HARD' ? 30 : qDiff === 'MEDIUM' ? 20 : 10);
    finalMaxPoints += qPts;
    if (selectedAnswers[q.id] === q.correctIndex) {
      finalCorrectCount += 1;
      finalPoints += qPts;
    }
  });
  const calculatedPercentage = finalMaxPoints > 0 
    ? Math.round((finalPoints / finalMaxPoints) * 100) 
    : Math.round((finalCorrectCount / questions.length) * 100);

  const displayPercentage = submittedAttempt?.percentage ?? calculatedPercentage;

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] border-2 border-[var(--mousa-border-sand)] rounded-3xl text-center space-y-4">
        <HelpCircle className="w-12 h-12 text-[var(--mousa-gold)] mx-auto" />
        <h2 className="text-lg font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
          {isAr ? 'لا يوجد اختبار مراجعة متاح لهذا الدرس حالياً' : 'No review quiz currently available for this lesson'}
        </h2>
        <button
          onClick={onBackToLesson}
          className="px-5 py-2.5 bg-gradient-to-r from-[var(--mousa-gold)] to-[var(--mousa-coral)] text-white font-bold rounded-xl text-xs cursor-pointer"
        >
          {isAr ? 'العودة للدرس' : 'Return to Lesson'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-16">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={onBackToLesson}
          disabled={isSubmitting}
          className="px-4 py-2 bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] hover:bg-[var(--mousa-sand-100)] text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] rounded-2xl text-xs font-black flex items-center gap-2 border-2 border-[var(--mousa-border-sand)] transition-all cursor-pointer shadow-2xs min-h-[44px]"
        >
          {isAr ? <ChevronRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{isAr ? 'العودة للدرس' : 'Back to Lesson'}</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {highestPreviousAttempt && !isSubmitted && (
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isAr ? `الدرجة السابقة: ${highestPreviousAttempt.percentage}%` : `Best Score: ${highestPreviousAttempt.percentage}%`}</span>
            </span>
          )}

          <span className="text-xs px-3.5 py-1 rounded-full bg-[var(--mousa-gold-soft)] text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)] border border-[var(--mousa-gold)]/30 font-black flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[var(--mousa-gold)]" />
            <span>{isAr ? 'اختبار مراجعة الدرس' : 'Lesson Review Quiz'}</span>
          </span>
        </div>
      </div>

      {/* Overview Intro Banner */}
      <div className="p-4 bg-[var(--mousa-sand-50)] dark:bg-stone-900/80 rounded-2xl border border-[var(--mousa-border-sand)] text-xs text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] space-y-1">
        <div className="flex items-center gap-1.5 font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
          <BookOpen className="w-4 h-4 text-[var(--mousa-gold)]" />
          <span>{isAr ? 'تثبيت المفاهيم الإيمانية والكنسية' : 'Comprehension & Milestone Practice'}</span>
        </div>
        <p className="leading-relaxed">
          {isAr
            ? 'يقيس هذا الاختبار استيعابك للنقاط الجوهرية في الدرس. الإجابات والدرجة تُحفظ تلقائياً على الخادم.'
            : 'This review quiz checks your understanding of the lesson taught. Answers and scores are saved to the backend.'}
        </p>
      </div>

      {/* Validation Warning Alert (Incomplete Quiz State) */}
      {validationWarning && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/70 border-2 border-amber-400 dark:border-amber-700 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="font-bold flex-1">{validationWarning}</span>
        </div>
      )}

      {/* Network Failure & Retry Banner */}
      {submitError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/70 border-2 border-rose-400 dark:border-rose-700 rounded-2xl text-xs text-rose-900 dark:text-rose-200 flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span className="font-bold">{submitError}</span>
          </div>
          <button
            onClick={handleFinalSubmission}
            disabled={isSubmitting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shrink-0 cursor-pointer shadow-xs min-h-[40px] flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'إعادة المحاولة' : 'Retry'}</span>
          </button>
        </div>
      )}

      {!isSubmitted ? (
        <div className="bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] border-2 border-[var(--mousa-border-sand)] rounded-3xl p-5 sm:p-8 space-y-6 shadow-sm">
          {/* Question Counter & Difficulty Level */}
          <div className="flex items-center justify-between text-xs flex-wrap gap-2.5">
            <div className="flex items-center gap-2">
              <span className="font-black text-[var(--mousa-gold)] uppercase tracking-wider text-xs">
                {isAr
                  ? `السؤال ${currentQuestionIndex + 1} من ${questions.length}`
                  : `Question ${currentQuestionIndex + 1} of ${questions.length}`}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border font-mono ${
                (currentQuestion.difficulty || 'EASY') === 'HARD'
                  ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40'
                  : (currentQuestion.difficulty || 'EASY') === 'MEDIUM'
                  ? 'bg-[var(--mousa-gold-soft)] text-[var(--mousa-gold-dark)] border-[var(--mousa-gold)]/40'
                  : 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40'
              }`}>
                {(currentQuestion.difficulty || 'EASY') === 'HARD'
                  ? (isAr ? '🔴 صعب • ٣٠ نقطة' : '🔴 Hard • 30 pts')
                  : (currentQuestion.difficulty || 'EASY') === 'MEDIUM'
                  ? (isAr ? '🟡 متوسط • ٢٠ نقطة' : '🟡 Medium • 20 pts')
                  : (isAr ? '🟢 سهل • ١٠ نقاط' : '🟢 Easy • 10 pts')}
              </span>
            </div>

            {/* Clickable Question Navigation Indicators */}
            <div className="flex gap-1.5 flex-wrap items-center">
              {questions.map((q, i) => {
                const isAnswered = selectedAnswers[q.id] !== undefined;
                const isCurrent = i === currentQuestionIndex;
                return (
                  <button
                    key={q.id || i}
                    onClick={() => handleJumpToQuestion(i)}
                    disabled={isSubmitting}
                    aria-label={`Jump to question ${i + 1}`}
                    className={`w-7 h-7 rounded-xl text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[var(--mousa-gold)] text-amber-950 shadow-xs ring-2 ring-[var(--mousa-gold)]/50 scale-105'
                        : isAnswered
                        ? 'bg-[var(--mousa-teal)] text-white hover:brightness-110'
                        : 'bg-[var(--mousa-sand-200)] dark:bg-stone-800 text-[var(--mousa-sand-600)] dark:text-stone-400 hover:bg-[var(--mousa-sand-300)]'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Text */}
          <div className="space-y-2.5">
            {currentQuestion.questionAr && (
              <h2 className="text-lg sm:text-xl font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] font-sans leading-relaxed" dir="rtl">
                {currentQuestion.questionAr}
              </h2>
            )}
            {currentQuestion.questionEn && (!currentQuestion.questionAr || !isAr) && (
              <h3 className="text-base text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-300)] font-serif leading-snug">
                {currentQuestion.questionEn}
              </h3>
            )}
          </div>

          {/* Answer Options */}
          <div className="space-y-3 pt-2">
            {currentQuestion.optionsEn.map((opt, oIdx) => {
              const isSelected = selectedAnswers[currentQuestion.id] === oIdx;
              const hasAnswered = selectedAnswers[currentQuestion.id] !== undefined;
              const isCorrectAnswer = oIdx === currentQuestion.correctIndex;
              const optionArText = currentQuestion.optionsAr && currentQuestion.optionsAr[oIdx];

              return (
                <button
                  key={oIdx}
                  onClick={() => handleSelectOption(oIdx)}
                  disabled={hasAnswered || isSubmitting}
                  className={`w-full p-4 rounded-2xl border-2 text-start transition-all flex items-center justify-between text-sm cursor-pointer min-h-[52px] ${
                    hasAnswered && isCorrectAnswer
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 text-emerald-900 dark:text-emerald-100 font-bold'
                      : hasAnswered && isSelected && !isCorrectAnswer
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-[var(--mousa-coral)] text-rose-950 dark:text-rose-100 font-medium'
                      : isSelected
                      ? 'bg-[var(--mousa-sand-100)] border-[var(--mousa-gold)] text-[var(--mousa-teal-deep)] font-bold'
                      : 'bg-[var(--mousa-cream)] dark:bg-stone-900/60 border-[var(--mousa-border-sand)] hover:border-[var(--mousa-gold)] text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]'
                  }`}
                >
                  <div className="space-y-1 pr-2">
                    {optionArText && (
                      <span className="font-sans font-bold text-sm sm:text-base block" dir="rtl">
                        {optionArText}
                      </span>
                    )}
                    {(!optionArText || !isAr) && (
                      <span className="font-serif text-xs sm:text-sm text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-300)] block">
                        {opt}
                      </span>
                    )}
                  </div>

                  {hasAnswered && isCorrectAnswer && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  )}
                  {hasAnswered && isSelected && !isCorrectAnswer && (
                    <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Box when an option is selected */}
          {showExplanation && (
            <div className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in ${
              selectedAnswers[currentQuestion.id] === currentQuestion.correctIndex
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
            }`}>
              <div className="flex items-center gap-1.5 font-bold">
                {selectedAnswers[currentQuestion.id] === currentQuestion.correctIndex ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{isAr ? 'إجابة صحيحة وممتازة! ✨' : 'Correct Answer! ✨'}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>{isAr ? 'إجابة تحتاج لمراجعة 📖' : 'Not quite right 📖'}</span>
                  </>
                )}
              </div>

              {currentQuestion.explanationAr && (
                <p className="font-sans leading-relaxed text-sm pt-1" dir="rtl">
                  {currentQuestion.explanationAr}
                </p>
              )}
              {currentQuestion.explanationEn && (!currentQuestion.explanationAr || !isAr) && (
                <p className="font-serif leading-relaxed text-xs pt-1 border-t border-black/10 dark:border-white/10">
                  {currentQuestion.explanationEn}
                </p>
              )}
            </div>
          )}

          {/* Bottom Navigation & Submission Buttons */}
          <div className="pt-4 border-t border-[var(--mousa-border-sand)] flex items-center justify-between gap-3 flex-wrap">
            <button
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0 || isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] bg-[var(--mousa-sand-100)] dark:bg-stone-800 hover:bg-[var(--mousa-sand-200)]"
            >
              {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              <span>{isAr ? 'السابق' : 'Previous'}</span>
            </button>

            <div className="flex items-center gap-2">
              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={selectedAnswers[currentQuestion.id] === undefined || isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-[var(--mousa-gold)] to-[var(--mousa-coral)] hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer min-h-[44px]"
                >
                  <span>{isAr ? 'السؤال التالي' : 'Next Question'}</span>
                  {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <button
                  onClick={handleFinalSubmission}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer min-h-[44px]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{isAr ? 'جاري تسجيل الإجابات...' : 'Submitting Quiz...'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isAr ? 'تسليم الاختبار وحفظ النتيجة' : 'Finish Assessment'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Results Screen */
        <div className="bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] border-2 border-[var(--mousa-border-sand)] rounded-3xl p-6 sm:p-10 space-y-6 shadow-md text-center animate-in fade-in">
          <div className="w-16 h-16 rounded-3xl bg-[var(--mousa-gold-soft)] border-2 border-[var(--mousa-gold)]/40 flex items-center justify-center text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)] mx-auto shadow-inner">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] font-sans">
              {isAr ? 'اكتمل الاختبار وحُفظت النتيجة بنجاح!' : 'Assessment Completed!'}
            </h2>
            <p className="text-xs text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)]">
              {isAr
                ? 'تم تسجيل نتيجتك وإجاباتك على الخادم وربطها بسجلك الكنسي.'
                : 'Your answers and score have been saved to the server.'}
            </p>
          </div>

          {/* Big Score Box */}
          <div className="p-6 bg-[var(--mousa-cream)] dark:bg-stone-900/80 rounded-2xl border-2 border-[var(--mousa-border-sand)] max-w-sm mx-auto space-y-2">
            <div className="text-5xl font-black font-mono text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold)]">
              {displayPercentage}%
            </div>
            <p className="text-xs font-bold text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
              {isAr
                ? `${finalCorrectCount} من ${questions.length} إجابات صحيحة`
                : `${finalCorrectCount} of ${questions.length} Questions Correct`}
            </p>
            <p className="text-[11px] text-[var(--mousa-sand-500)] font-bold">
              {displayPercentage >= 70
                ? (isAr ? '✨ إتقان ممتاز للمفاهيم الإيمانية' : '✨ High Milestone Mastery')
                : (isAr ? '📖 يوصى بمراجعة أقسام القراءة لترسيخ المفاهيم' : '📖 Review Recommended')}
            </p>
          </div>

          {/* Question Review & Targeted Section Jump Links */}
          <div className="space-y-3 text-start pt-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
              {isAr ? 'مراجعة الأسئلة والأقسام المستهدفة' : 'Targeted Review & Diagnostics'}
            </h3>

            {questions.map((q, idx) => {
              const selected = selectedAnswers[q.id];
              const isCorrect = selected === q.correctIndex;

              return (
                <div
                  key={q.id || idx}
                  className={`p-4 rounded-2xl border text-xs flex items-start justify-between gap-3 ${
                    isCorrect 
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' 
                      : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-bold text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]" dir={isAr ? 'rtl' : 'ltr'}>
                        {isAr && q.questionAr ? q.questionAr : q.questionEn}
                      </span>
                    </div>

                    {!isCorrect && (q.explanationAr || q.explanationEn) && (
                      <p className="text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] text-[11px] pt-1" dir={isAr ? 'rtl' : 'ltr'}>
                        💡 {isAr && q.explanationAr ? q.explanationAr : q.explanationEn}
                      </p>
                    )}
                  </div>

                  {!isCorrect && q.sourceRef?.sectionId && (
                    <button
                      onClick={() => onReviewSection(q.sourceRef!.sectionId)}
                      className="px-3 py-1.5 bg-[var(--mousa-gold-soft)] hover:bg-[var(--mousa-gold)]/30 text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)] border border-[var(--mousa-gold)]/40 rounded-xl text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer min-h-[36px]"
                    >
                      <span>{isAr ? 'مراجعة القسم' : 'Review Section'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[var(--mousa-border-sand)] flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={handleRetake}
              className="px-4 py-2.5 bg-[var(--mousa-sand-100)] dark:bg-stone-800 hover:bg-[var(--mousa-sand-200)] text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isAr ? 'إعادة الاختبار' : 'Retake Quiz'}</span>
            </button>

            <button
              onClick={onBackToLesson}
              className="px-5 py-2.5 bg-gradient-to-r from-[var(--mousa-gold)] to-[var(--mousa-coral)] hover:brightness-105 text-white rounded-xl text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer min-h-[44px]"
            >
              {isAr ? 'العودة للدرس' : 'Return to Lesson'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
