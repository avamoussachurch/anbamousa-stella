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
  BookOpen,
  Trophy,
  Flame,
  PartyPopper,
  Crown,
  Star,
  Heart
} from 'lucide-react';
import { QuizDraft, StudentQuizAttempt, QuizAnswer, Language } from '../../../types';
import { ConfettiCanvas } from './ConfettiCanvas';
import { RewardCelebration } from './RewardCelebration';

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
    isFirstCompletion?: boolean;
    pointsEarned?: number;
    totalPoints?: number;
    streak?: {
      currentStreak: number;
      longestStreak: number;
      streakGained: boolean;
      lastActiveCairoDate?: string;
    };
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
  const [submissionResult, setSubmissionResult] = useState<{
    attempt: StudentQuizAttempt | null;
    isDuplicate: boolean;
    isFirstCompletion: boolean;
    pointsEarned: number;
    totalPoints: number;
    streak: {
      currentStreak: number;
      longestStreak: number;
      streakGained: boolean;
      lastActiveCairoDate?: string;
    };
  } | null>(null);

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

    let correctCount = 0;

    const recordedAnswers: QuizAnswer[] = questions.map(q => {
      const selected = selectedAnswers[q.id];
      const isCorrect = selected === q.correctIndex;
      if (isCorrect) {
        correctCount += 1;
      }

      return {
        questionId: q.id,
        selectedOptionIndex: selected ?? -1,
        isCorrect,
        feedbackEn: isCorrect 
          ? (q.explanationEn || `Correct! Answer verified.`) 
          : `Review needed: ${q.explanationEn || 'See lesson text.'}`,
        feedbackAr: q.explanationAr,
        recommendedSectionId: q.sourceRef?.sectionId,
        recommendedSectionTitle: q.sourceRef?.sectionTitle
      };
    });

    const percentage = questions.length > 0 
      ? Math.round((correctCount / questions.length) * 100) 
      : 0;

    try {
      const result = await onSubmitAttempt({
        studentId,
        lessonId,
        quizId: quiz.id,
        score: correctCount,
        totalScore: questions.length,
        percentage,
        passed: percentage >= 50,
        answers: recordedAnswers
      });

      if (!result.success) {
        throw new Error(result.error || (isAr ? 'فشل حفظ نتيجة الاختبار' : 'Failed to submit quiz attempt'));
      }

      if (result.data) {
        setSubmittedAttempt(result.data);
      }
      setSubmissionResult({
        attempt: result.data || null,
        isDuplicate: Boolean(result.isDuplicate),
        isFirstCompletion: Boolean(result.isFirstCompletion),
        pointsEarned: Number(result.pointsEarned ?? 0),
        totalPoints: Number(result.totalPoints ?? 0),
        streak: result.streak || {
          currentStreak: 0,
          longestStreak: 0,
          streakGained: false
        }
      });
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
    setSubmissionResult(null);
  };

  // Result Calculation for submitted view (Authoritative & Raw Question Count)
  let calculatedCorrectCount = 0;
  questions.forEach(q => {
    if (selectedAnswers[q.id] === q.correctIndex) {
      calculatedCorrectCount += 1;
    }
  });
  const calculatedPercentage = questions.length > 0 
    ? Math.round((calculatedCorrectCount / questions.length) * 100) 
    : 0;

  const displayPercentage = submittedAttempt?.percentage ?? calculatedPercentage;
  const displayCorrectCount = submittedAttempt?.score ?? calculatedCorrectCount;
  const displayTotalQuestions = submittedAttempt?.totalScore ?? questions.length;

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
        /* Results Screen with Celebrations, Points & Streak */
        <div className="relative bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] border-2 border-[var(--mousa-border-sand)] rounded-3xl p-6 sm:p-10 space-y-7 shadow-md text-center animate-in fade-in overflow-hidden">
          {/* Confetti & Particle Celebration Styles (Always plays without reduced-motion suppression) */}
          <style>{`
            @keyframes celebrationFall {
              0% { transform: translateY(-24px) rotate(0deg) scale(0.8); opacity: 0; }
              15% { opacity: 1; transform: translateY(10px) rotate(45deg) scale(1.1); }
              85% { opacity: 0.9; }
              100% { transform: translateY(380px) rotate(360deg) scale(0.9); opacity: 0; }
            }
          `}</style>

          {/* Lightweight Canvas Confetti Component: triggers only after server confirms 100% */}
          {displayPercentage === 100 && <ConfettiCanvas />}

          {/* 100% Tier Party Particles Animation */}
          {displayPercentage === 100 && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden="true">
              {[...Array(24)].map((_, i) => (
                <span
                  key={i}
                  className="celebration-particle absolute select-none pointer-events-none"
                  style={{
                    left: `${(i * 4.1 + 3) % 94}%`,
                    animation: `celebrationFall ${2.3 + (i % 4) * 0.35}s ease-in-out infinite`,
                    animationDelay: `${(i * 0.16) % 2.4}s`,
                    fontSize: `${16 + (i % 3) * 6}px`
                  }}
                >
                  {['✨', '🎉', '🌟', '👑', '☩', '⭐', '🎊', '💛', '🕊️'][i % 9]}
                </span>
              ))}
            </div>
          )}

          {/* Duplicate Submission Recovery Notice */}
          {submissionResult?.isDuplicate && (
            <div className="p-3 bg-amber-50/90 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/80 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex items-center justify-center gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-bold">
                {isAr
                  ? 'تم استرجاع النتيجة المعتمدة مسبقاً بنجاح وفقاً لنظام حماية التكرار الدائم.'
                  : 'Your previously recorded attempt was safely returned via durable duplicate protection.'}
              </span>
            </div>
          )}

          {/* Reusable RewardCelebration with gentle pulsing trophy or star */}
          <RewardCelebration
            type={displayPercentage === 100 ? 'trophy' : 'star'}
            pulse={true}
            lang={lang}
            streakGained={submissionResult?.streak?.streakGained}
            badgeText={
              displayPercentage === 100 
                ? 'Ⲁⲝⲓⲟⲥ • Ⲡⲓⲙⲁⲑⲏⲧⲏⲥ ⲛ̀ⲧⲉ Ⲡⲭ̅ⲥ̅'
                : displayPercentage >= 80
                ? 'Ⲧⲁϫⲣⲟ ϧⲉⲛ ⲡⲓⲛⲁϩϯ • Ϣⲉⲡϩⲙⲟⲧ'
                : displayPercentage >= 50
                ? 'Ⲕⲁⲗⲱⲥ • Ⲙⲁⲣⲉⲛⲧⲁϫⲣⲟ'
                : 'Ⲙⲡⲉⲣⲉⲣϩⲟϯ • Ⲧⲁϫⲣⲟ'
            }
            titleAr={
              displayPercentage === 100
                ? 'مبارك يا بطل! علامة كاملة ١٠٠٪ وإتقان كنسي فائق! 🌟👑'
                : displayPercentage >= 80
                ? 'عمل رائع ومبارك! استيعاب متميز لمفاهيم الدرس! 🎉✨'
                : displayPercentage >= 50
                ? 'اكتمل الدرس بنجاح! أحسنت وبإمكانك تحقيق الأفضل بمزيد من المراجعة 👍📖'
                : 'محاولة طيبة يا بطل! لا تستسلم، راجع أقسام القراءة وحاول مرة أخرى! 💪✝️'
            }
            title={
              displayPercentage === 100
                ? 'Outstanding! 100% Perfect Score & Exemplary Church Mastery! 🌟👑'
                : displayPercentage >= 80
                ? 'Great Job! Impressive Mastery and Faithful Understanding! 🎉✨'
                : displayPercentage >= 50
                ? 'Lesson Completed! Well done, with room to grow through review! 👍📖'
                : 'Good Effort! Keep going — review the lesson and try once more! 💪✝️'
            }
            subtitleAr={
              displayPercentage === 100
                ? '«كُنْتَ أَمِينًا فِي الْقَلِيلِ فَأُقِيمُكَ عَلَى الْكَثِيرِ، ادْخُلْ إِلَى فَرَحِ سَيِّدِكَ» (متى ٢٥: ٢١)'
                : displayPercentage >= 80
                ? '«اِنْمُوا فِي النِّعْمَةِ وَفِي مَعْرِفَةِ رَبِّنَا وَمُخَلِّصِنَا يَسُوعَ الْمَسِيحِ» (٢ بطرس ٣: ١٨)'
                : displayPercentage >= 50
                ? 'لقد اجتزت متطلبات الاختبار بنجاح. راجع الأسئلة الموصى بها بالأسفل لتثبيت المفاهيم.'
                : `الدرجة الحالية (${displayPercentage}٪) أقل من الحد المطلوب للاجتياز (٥٠٪). أعد قراءة الأقسام بالأسفل ثم أعد الاختبار لكسب +٥٠ نقطة وتحديث حماسك!`
            }
            subtitle={
              displayPercentage === 100
                ? '“You have been faithful over a little; I will set you over much. Enter into the joy of your master.” (Matthew 25:21)'
                : displayPercentage >= 80
                ? '“Grow in the grace and knowledge of our Lord and Savior Jesus Christ.” (2 Peter 3:18)'
                : displayPercentage >= 50
                ? 'You successfully completed the review. Check the recommended sections below to deepen your knowledge.'
                : `Score (${displayPercentage}%) is below the passing completion threshold (50%). Review the recommended reading sections below, then retake the quiz to earn your 50 points and build your streak!`
            }
          />

          {/* High-Contrast 'card-church' Breakdown: Score, Total Points, and Streak Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 max-w-3xl mx-auto pt-2 text-start">
            {/* 1. Score Card (card-church) */}
            <div className="card-church p-4 sm:p-5 bg-white dark:bg-[#28211C] border-2 border-[var(--border-stone)] dark:border-[#4A3C2E] shadow-sm space-y-2 flex flex-col justify-between min-h-[140px]">
              <div className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[var(--brand-gold-dark)] dark:text-[var(--mousa-gold)]" />
                  <span>{isAr ? 'الدرجة المحققة' : 'Final Score'}</span>
                </span>
                <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                  displayPercentage >= 80
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : displayPercentage >= 50
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  {displayPercentage === 100 
                    ? (isAr ? 'كاملة 🌟' : 'Perfect 🌟')
                    : displayPercentage >= 50
                    ? (isAr ? 'اجتياز ✓' : 'Passed ✓')
                    : (isAr ? 'مراجعة 📖' : 'Review 📖')}
                </span>
              </div>
              
              <div className="space-y-0.5 my-auto">
                <div className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-stone-900 dark:text-stone-50 tracking-tight">
                  {displayPercentage}%
                </div>
                <div className="text-xs font-bold text-stone-600 dark:text-stone-300">
                  {displayCorrectCount} / {displayTotalQuestions} {isAr ? 'إجابات صحيحة' : 'correct answers'}
                </div>
              </div>

              <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 pt-1 border-t border-[var(--border-stone)]/40 dark:border-stone-800">
                {displayPercentage >= 50
                  ? (isAr ? 'تم إتمام الاختبار بنجاح' : 'Requirement met successfully')
                  : (isAr ? 'أعد المحاولة لبلوغ ٥٠٪' : 'Retake to reach 50%')}
              </div>
            </div>

            {/* 2. Total Points Card (card-church) */}
            <div className="card-church p-4 sm:p-5 bg-white dark:bg-[#28211C] border-2 border-[var(--border-stone)] dark:border-[#4A3C2E] shadow-sm space-y-2 flex flex-col justify-between min-h-[140px]">
              <div className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-[var(--brand-gold-dark)] dark:text-[var(--mousa-gold)]" />
                  <span>{isAr ? 'رصيد نقاط البركة' : 'Total Points'}</span>
                </span>
                {(submissionResult?.pointsEarned ?? 0) > 0 && (
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    +{(submissionResult?.pointsEarned ?? 0)}
                  </span>
                )}
              </div>

              <div className="space-y-0.5 my-auto">
                <div className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-[var(--brand-gold-dark)] dark:text-[var(--mousa-gold)] tracking-tight">
                  {submissionResult?.totalPoints ?? 0}
                </div>
                <div className="text-xs font-bold text-stone-600 dark:text-stone-300">
                  {(submissionResult?.pointsEarned ?? 0) > 0
                    ? (isAr ? `+${submissionResult?.pointsEarned} نقطة مكتسبة للرصيد` : `+${submissionResult?.pointsEarned} points added`)
                    : displayPercentage >= 50
                    ? (isAr ? 'مكافأة أول إتمام معتمدة مسبقاً' : 'First-time points previously claimed')
                    : (isAr ? 'أعد الاختبار لكسب +٥٠ نقطة' : 'Retake to earn +50 points')}
                </div>
              </div>

              <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 pt-1 border-t border-[var(--border-stone)]/40 dark:border-stone-800">
                {isAr ? 'رصيد التلميذ الكلي المعتمد' : 'Official student balance'}
              </div>
            </div>

            {/* 3. Streak Status Card (card-church) */}
            <div className="card-church p-4 sm:p-5 bg-white dark:bg-[#28211C] border-2 border-[var(--border-stone)] dark:border-[#4A3C2E] shadow-sm space-y-2 flex flex-col justify-between min-h-[140px]">
              <div className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>{isAr ? 'الحماس والمواظبة' : 'Daily Streak'}</span>
                </span>
                <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200">
                  {submissionResult?.streak?.streakGained 
                    ? (isAr ? '🔥 امتداد اليوم' : '🔥 Extended')
                    : (isAr ? '✓ نشط اليوم' : '✓ Active')}
                </span>
              </div>

              <div className="space-y-0.5 my-auto">
                <div className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400 tracking-tight">
                  {submissionResult?.streak?.currentStreak ?? 0} {isAr ? 'أيام' : 'Days'}
                </div>
                <div className="text-xs font-bold text-stone-600 dark:text-stone-300">
                  {submissionResult?.streak?.streakGained
                    ? (isAr ? 'تم تمديد سلسلة حماسك بنجاح اليوم! 🔥' : 'Streak extended today! 🔥')
                    : (isAr ? 'حضورك الكنسي ونشاطك مسجل لليوم' : 'Daily activity confirmed today')}
                </div>
              </div>

              <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 pt-1 border-t border-[var(--border-stone)]/40 dark:border-stone-800">
                {isAr 
                  ? `أطول مواظبة مسجلة: ${submissionResult?.streak?.longestStreak ?? submissionResult?.streak?.currentStreak ?? 0} يوم` 
                  : `Longest streak: ${submissionResult?.streak?.longestStreak ?? submissionResult?.streak?.currentStreak ?? 0} days`}
              </div>
            </div>
          </div>

          {/* Question Review & Targeted Section Jump Links */}
          <div className="space-y-3 text-start pt-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[var(--mousa-gold)]" />
              <span>{isAr ? 'مراجعة الأسئلة والأقسام المستهدفة' : 'Targeted Review & Diagnostics'}</span>
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
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px] ${
                displayPercentage < 50
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md ring-2 ring-amber-400/40'
                  : 'bg-[var(--mousa-sand-100)] dark:bg-stone-800 hover:bg-[var(--mousa-sand-200)] text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]'
              }`}
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
