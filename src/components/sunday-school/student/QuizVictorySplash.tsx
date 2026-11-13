import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Award, Flame, Sparkles, Star, Trophy, X } from 'lucide-react';
import { ConfettiCanvas } from './ConfettiCanvas';
import { useGlobalAudio } from '../../../context/AudioContext';
import type { Language } from '../../../types';

interface QuizVictorySplashProps {
  percentage: number;
  correctCount: number;
  totalQuestions: number;
  pointsEarned: number;
  totalPoints: number;
  streakDays: number;
  lang: Language;
  onContinue: () => void;
}

export function QuizVictorySplash({
  percentage,
  correctCount,
  totalQuestions,
  pointsEarned,
  totalPoints,
  streakDays,
  lang,
  onContinue
}: QuizVictorySplashProps) {
  const isAr = lang === 'ar';
  const { playSound } = useGlobalAudio();
  const reduceMotion = useReducedMotion();
  const played = useRef(false);
  const passed = percentage >= 50;
  const perfect = percentage === 100;

  useEffect(() => {
    if (!played.current) {
      played.current = true;
      playSound(perfect ? 'celebration' : passed ? 'reward' : 'success');
    }
  }, [passed, perfect, playSound]);

  const title = perfect
    ? (isAr ? 'يا سلام! جبت الدرجة النهائية! 👑' : 'YOU DID IT! PERFECT SCORE! 👑')
    : passed
      ? (isAr ? 'برافو عليك يا بطل! 🌟' : 'AMAZING WORK, CHAMP! 🌟')
      : (isAr ? 'كل مرة بتحاول فيها بتبقى أقوى! 💪' : 'EVERY TRY MAKES YOU STRONGER! 💪');

  const message = perfect
    ? (isAr ? 'إتقان رائع! كمّل تعلّم وشارك النور اللي جواك.' : 'A brilliant result. Keep learning and sharing your light.')
    : passed
      ? (isAr ? 'تقدم جميل! كل خطوة بتقرّبك من فهم أكتر.' : 'That is real progress. Every step helps you grow.')
      : (isAr ? 'إنت بتتعلّم، وده أهم حاجة. راجع الحاجات اللي محتاجة تدريب وجرّب تاني.' : 'You are learning, and that matters most. Review the tricky parts and try again.');

  return (
    <motion.div
      className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-[#092b35]/95 px-4 py-6 text-center text-white backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-victory-title"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
    >
      {(passed || perfect) && <ConfettiCanvas layer="behind" />}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="quiz-victory-orbit quiz-victory-orbit--one" />
        <div className="quiz-victory-orbit quiz-victory-orbit--two" />
        <span className="quiz-victory-star quiz-victory-star--one">✦</span>
        <span className="quiz-victory-star quiz-victory-star--two">✧</span>
        <span className="quiz-victory-star quiz-victory-star--three">✦</span>
        <span className="quiz-victory-star quiz-victory-star--four">✧</span>
      </div>

      <motion.section
        className="relative z-10 my-auto w-full max-w-2xl rounded-[2rem] border-2 border-amber-200/50 bg-[linear-gradient(155deg,#174c55_0%,#0e3540_58%,#172d3a_100%)] p-5 shadow-[0_30px_100px_rgba(0,0,0,.42)] sm:p-9"
        initial={reduceMotion ? false : { y: 45, scale: .88, rotateX: 8 }}
        animate={{ y: 0, scale: 1, rotateX: 0 }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 170, damping: 17 }}
      >
        <button type="button" data-sfx="off" onClick={onContinue} aria-label={isAr ? 'اقفل' : 'Close'} className="absolute end-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20">
          <X size={19} />
        </button>

        <motion.div
          className="mx-auto mb-4 grid h-24 w-24 place-items-center rounded-[2rem] border-4 border-amber-100 bg-gradient-to-br from-amber-200 via-amber-400 to-orange-500 text-amber-950 shadow-[0_0_55px_rgba(246,196,94,.45)]"
          animate={reduceMotion ? undefined : { y: [0, -9, 0], rotate: [0, -4, 4, 0] }}
          transition={reduceMotion ? { duration: 0 } : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          {perfect ? <Trophy size={48} /> : passed ? <Award size={48} /> : <Star size={48} />}
        </motion.div>

        <p className="text-xs font-black uppercase tracking-[.24em] text-amber-200">{isAr ? 'إنجاز جديد في رحلتك' : 'A NEW MILESTONE IN YOUR JOURNEY'}</p>
        <h2 id="quiz-victory-title" className="mt-2 text-2xl font-black leading-tight text-white sm:text-4xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm font-semibold leading-7 text-teal-50/90 sm:text-base">{message}</p>

        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
            <Award className="mx-auto mb-2 text-amber-200" size={21} />
            <p className="text-2xl font-black tabular-nums">{percentage}%</p>
            <p className="mt-1 text-[11px] font-bold text-teal-50/85">{isAr ? 'أداؤك' : 'Performance'}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
            <Star className="mx-auto mb-2 text-amber-200" size={21} />
            <p className="text-2xl font-black tabular-nums">{correctCount}/{totalQuestions}</p>
            <p className="mt-1 text-[11px] font-bold text-teal-50/85">{isAr ? 'إجابات صح' : 'Correct'}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
            <Sparkles className="mx-auto mb-2 text-amber-200" size={21} />
            <p className="text-2xl font-black tabular-nums">+{pointsEarned}</p>
            <p className="mt-1 text-[11px] font-bold text-teal-50/85">{isAr ? 'النقاط اللي كسبتها' : 'Points earned'}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
            <Flame className="mx-auto mb-2 text-orange-300" size={21} />
            <p className="text-2xl font-black tabular-nums">{streakDays}</p>
            <p className="mt-1 text-[11px] font-bold text-teal-50/85">{isAr ? 'أيام مواظبتك' : 'Day streak'}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-bold text-amber-100">
          <span>{isAr ? 'مجموع نقاطك' : 'Total points'}: {totalPoints}</span>
          <span aria-hidden="true">✦</span>
          <span>{isAr ? 'كمّل تقدمك على مهلك' : 'Keep growing at your own pace'}</span>
        </div>

        <button type="button" data-sfx="success" onClick={onContinue} className="mt-7 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-amber-100 bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-300 px-6 py-3 text-base font-black text-[#30200a] shadow-[0_10px_35px_rgba(237,177,73,.28)] transition hover:-translate-y-1 hover:brightness-105 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transform-none sm:w-auto sm:min-w-64">
          {isAr ? 'شوف تفاصيل نتيجتك' : 'See my full results'} <Sparkles size={18} />
        </button>
      </motion.section>
    </motion.div>
  );
}
