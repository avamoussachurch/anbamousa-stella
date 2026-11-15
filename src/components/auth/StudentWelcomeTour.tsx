import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Flame, Sparkles, Trophy, X } from 'lucide-react';
import type { Language } from '../../types';

const steps = [
  { icon: Sparkles, titleEn: 'Welcome to Anba Mousa!', titleAr: 'أهلاً بيك في الأنبا موسى!', bodyEn: 'Stella will help you find your way. This is your home base for learning and growing.', bodyAr: 'ستيلا هتساعدك تكتشف المكان. دي محطتك الأساسية للتعلّم والنمو.' },
  { icon: BookOpen, titleEn: 'Explore your lessons', titleAr: 'اكتشف دروسك', bodyEn: 'Open Lessons to find the Sunday School lessons published for your class.', bodyAr: 'افتح الدروس علشان تلاقي دروس مدارس الأحد المنشورة لفصلك.' },
  { icon: Trophy, titleEn: 'Celebrate your progress', titleAr: 'احتفل بتقدمك', bodyEn: 'Your points, completed lessons, achievements and class rankings live in Achievements & ranking.', bodyAr: 'نقاطك ودروسك المكتملة وإنجازاتك وترتيب فصلك موجودين في الإنجازات والترتيب.' },
  { icon: Flame, titleEn: 'Grow at your own pace', titleAr: 'اتقدم براحتك', bodyEn: 'Your streak is a friendly reminder, not a punishment. Missing a day does not take away your worth. Ask for help whenever you need it.', bodyAr: 'الستريك تذكير لطيف مش عقاب. لو فاتك يوم ده مش بيقلل منك. اطلب المساعدة في أي وقت.' }
] as const;

export function StudentWelcomeTour({ lang, onClose }: { lang: Language; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const isArabic = lang === 'ar';
  const current = steps[step];
  const Icon = current.icon;
  const next = () => step === steps.length - 1 ? onClose() : setStep(value => value + 1);
  const PreviousIcon = isArabic ? ArrowRight : ArrowLeft;
  const NextIcon = isArabic ? ArrowLeft : ArrowRight;
  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:items-center sm:p-5">
      <section role="dialog" aria-modal="true" aria-labelledby="student-welcome-title" className="w-full max-w-md rounded-[2rem] border-2 border-[var(--mousa-border-sand)] bg-[var(--mousa-cream-surface)] p-5 text-stone-900 shadow-2xl dark:bg-[#211a14] dark:text-stone-50 sm:p-7">
        <div className="flex items-center justify-between"><span className="text-xs font-black text-[var(--mousa-gold)]">{isArabic ? `خطوة ${step + 1} من ${steps.length}` : `STEP ${step + 1} OF ${steps.length}`}</span>
          <button type="button" onClick={onClose} aria-label={isArabic ? 'تخطي الجولة' : 'Skip tour'} className="rounded-xl p-2 hover:bg-black/5 dark:hover:bg-white/10"><X size={18} /></button></div>
        <div className="my-7 flex justify-center"><div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"><Icon size={38} /></div></div>
        <h2 id="student-welcome-title" className="text-center text-2xl font-black">{isArabic ? current.titleAr : current.titleEn}</h2>
        <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-7 text-stone-700 dark:text-stone-200">{isArabic ? current.bodyAr : current.bodyEn}</p>
        <div className="mt-7 flex items-center justify-between gap-3">
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl px-3 text-sm font-bold text-stone-600 underline dark:text-stone-300">{isArabic ? 'تخطي الجولة' : 'Skip tour'}</button>
          <div className="flex gap-1.5" aria-label={isArabic ? 'تقدم الجولة' : 'Tour progress'}>{steps.map((_, index) => <span key={index} className={`h-2 rounded-full transition-all ${index === step ? 'w-6 bg-[var(--mousa-gold)]' : 'w-2 bg-stone-300 dark:bg-stone-600'}`} />)}</div>
          <button type="button" onClick={next} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-church-blue)] px-4 text-sm font-black text-white">{step === steps.length - 1 ? (isArabic ? 'ابدأ' : 'Let’s go') : (isArabic ? 'التالي' : 'Next')}<NextIcon size={16} /></button>
        </div>
      </section>
    </div>
  );
}
