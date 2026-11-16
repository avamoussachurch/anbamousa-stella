import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, BookOpen, Flame, Sparkles, Trophy, X } from 'lucide-react';
import type { Language } from '../../types';

const steps = [
  { icon: Sparkles, titleEn: 'Welcome to Anba Mousa!', titleAr: 'أهلاً بيك في الأنبا موسى!', bodyEn: 'Stella is your guide. Your learning world is full of stories, discoveries and little victories.', bodyAr: 'ستيلا هتكون دليلك. عالم التعلّم مليان حكايات واكتشافات وانتصارات صغيرة.' },
  { icon: BookOpen, titleEn: 'Open your learning portals', titleAr: 'افتح بوابات التعلّم', bodyEn: 'Your lessons, hymns and Coptic church learning spaces are ready to explore. Tap a place to enter its world.', bodyAr: 'دروسك وألحانك ومساحات تعلّم الكنيسة القبطية مستنياك. دوس على المكان علشان تدخل عالمه.' },
  { icon: Trophy, titleEn: 'Every step counts', titleAr: 'كل خطوة بتفرق', bodyEn: 'Your completed lessons, points and achievements celebrate your effort. Your class ranking is only a friendly game.', bodyAr: 'الدروس اللي خلصتها ونقاطك وإنجازاتك بتحتفل بمجهودك. ترتيب الفصل مجرد لعبة لطيفة.' },
  { icon: Flame, titleEn: 'Grow at your own pace', titleAr: 'اتقدم براحتك', bodyEn: 'Your streak is a friendly reminder, never a punishment. Missing a day does not take away your worth. Ask for help whenever you need it.', bodyAr: 'الستريك تذكير لطيف مش عقاب. لو فاتك يوم ده مش بيقلل منك. اطلب المساعدة في أي وقت.' }
] as const;

export function StudentWelcomeTour({ lang, onClose }: { lang: Language; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const reduceMotion = useReducedMotion();
  const isArabic = lang === 'ar';
  const current = steps[step];
  const Icon = current.icon;
  const next = () => step === steps.length - 1 ? onClose() : setStep(value => value + 1);
  const NextIcon = isArabic ? ArrowLeft : ArrowRight;

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="fixed inset-0 z-[105] flex items-center justify-center overflow-hidden bg-slate-950/75 p-3 backdrop-blur-md sm:p-6">
      <motion.div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[min(85vw,620px)] w-[min(85vw,620px)] -translate-x-1/2 -translate-y-1/2 rounded-full border-[18px] border-amber-300/15 shadow-[0_0_100px_rgba(251,191,36,0.2)]"
        animate={reduceMotion ? {} : { rotate: 360, scale: [0.96, 1.04, 0.96] }}
        transition={{ rotate: { duration: 34, repeat: Infinity, ease: 'linear' }, scale: { duration: 5, repeat: Infinity } }} />
      <motion.div role="dialog" aria-modal="true" aria-labelledby="student-welcome-title"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.78, y: 28 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 180, damping: 19 }}
        className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-amber-200/50 bg-[#fffaf0] text-stone-900 shadow-[0_25px_100px_rgba(0,0,0,0.5)] dark:bg-[#211a14] dark:text-stone-50">
        <div className="h-2 bg-stone-200 dark:bg-stone-700"><motion.div className="h-full bg-gradient-to-r from-amber-400 to-yellow-200" animate={{ width: ((step + 1) / steps.length * 100) + '%' }} transition={{ duration: 0.4 }} /></div>
        <div className="flex items-center justify-between px-5 pt-4 sm:px-7">
          <span className="text-[10px] font-black tracking-[0.2em] text-amber-700 dark:text-amber-300">{isArabic ? `خطوة ${step + 1} من ${steps.length}` : `STELLA'S GUIDE · ${step + 1}/${steps.length}`}</span>
          <button type="button" onClick={onClose} aria-label={isArabic ? 'تخطي الجولة' : 'Skip tour'} className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10"><X size={18} /></button>
        </div>
        <div className="px-5 pb-6 pt-3 sm:px-8 sm:pb-8">
          <div className="relative mx-auto mb-5 flex h-36 w-36 items-center justify-center">
            <motion.div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-200 to-orange-100 dark:from-amber-800/50 dark:to-orange-950/50"
              animate={reduceMotion ? {} : { scale: [0.9, 1.07, 0.9], rotate: [0, 8, -8, 0] }} transition={{ duration: 4, repeat: Infinity }} />
            <motion.div className="absolute inset-2 rounded-full border-2 border-dashed border-amber-500/50"
              animate={reduceMotion ? {} : { rotate: -360 }} transition={{ duration: 24, repeat: Infinity, ease: 'linear' }} />
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={reduceMotion ? false : { opacity: 0, scale: 0.45, rotate: -25 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.45, rotate: 25 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }} className="relative z-10 flex h-24 w-24 items-center justify-center rounded-[2rem] border-4 border-white bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl">
                <Icon size={46} />
              </motion.div>
            </AnimatePresence>
            <motion.span className="absolute -right-1 top-3 text-2xl" animate={reduceMotion ? {} : { y: [0, -9, 0], rotate: [0, 12, 0] }} transition={{ duration: 2.2, repeat: Infinity }}>✦</motion.span>
            <motion.span className="absolute -bottom-1 left-1 text-xl" animate={reduceMotion ? {} : { y: [0, 7, 0], rotate: [0, -12, 0] }} transition={{ duration: 2.7, repeat: Infinity }}>✧</motion.span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.24 }}>
              <h2 id="student-welcome-title" className="text-center text-2xl font-black sm:text-3xl">{isArabic ? current.titleAr : current.titleEn}</h2>
              <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-7 text-stone-700 dark:text-stone-200">{isArabic ? current.bodyAr : current.bodyEn}</p>
            </motion.div>
          </AnimatePresence>
          <div className="mt-7 flex items-center justify-between gap-3">
            <button type="button" onClick={onClose} className="min-h-11 rounded-xl px-3 text-sm font-bold text-stone-600 underline dark:text-stone-300">{isArabic ? 'تخطي' : 'Skip'}</button>
            <div className="flex gap-1.5" aria-label={isArabic ? 'تقدم الجولة' : 'Tour progress'}>{steps.map((_, index) => <span key={index} className={`h-2 rounded-full transition-all ${index === step ? 'w-6 bg-amber-500' : 'w-2 bg-stone-300 dark:bg-stone-600'}`} />)}</div>
            <button type="button" onClick={next} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#173b55] px-4 text-sm font-black text-white shadow-lg hover:bg-[#225575]">{step === steps.length - 1 ? (isArabic ? 'يلا نبدأ!' : 'Let’s go!') : (isArabic ? 'التالي' : 'Next')}<NextIcon size={16} /></button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
