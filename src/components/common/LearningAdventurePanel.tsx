import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, Circle, Flag, Sparkles, Trophy, Zap } from 'lucide-react';

export type AdventureStep = {
  id: string;
  title: string;
  detail: string;
  complete: boolean;
  optional?: boolean;
};

type LearningAdventurePanelProps = {
  title: string;
  subtitle: string;
  steps: AdventureStep[];
  lang?: 'ar' | 'en';
  accent?: 'teal' | 'gold' | 'violet';
};

const accents = {
  teal: {
    shell: 'from-[#102F35] via-[#164B4B] to-[#183D45]',
    glow: 'bg-teal-300/20',
    active: 'border-teal-200/60 bg-teal-300/15 text-teal-50',
    complete: 'border-emerald-300/50 bg-emerald-300/15 text-emerald-100',
    progress: 'from-teal-300 to-emerald-300',
    icon: 'text-teal-200'
  },
  gold: {
    shell: 'from-[#39220D] via-[#684018] to-[#3A2A16]',
    glow: 'bg-amber-300/20',
    active: 'border-amber-200/60 bg-amber-300/15 text-amber-50',
    complete: 'border-emerald-300/50 bg-emerald-300/15 text-emerald-100',
    progress: 'from-amber-300 to-orange-300',
    icon: 'text-amber-200'
  },
  violet: {
    shell: 'from-[#251747] via-[#39266A] to-[#1F315B]',
    glow: 'bg-violet-300/20',
    active: 'border-violet-200/60 bg-violet-300/15 text-violet-50',
    complete: 'border-emerald-300/50 bg-emerald-300/15 text-emerald-100',
    progress: 'from-violet-300 to-fuchsia-300',
    icon: 'text-violet-200'
  }
};

export function LearningAdventurePanel({
  title,
  subtitle,
  steps,
  lang = 'en',
  accent = 'teal'
}: LearningAdventurePanelProps) {
  const reduceMotion = useReducedMotion();
  const isAr = lang === 'ar';
  const theme = accents[accent];
  const completed = steps.filter(step => step.complete).length;
  const percent = steps.length ? Math.round((completed / steps.length) * 100) : 0;

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 180, damping: 22 }}
      className={`relative isolate overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br ${theme.shell} p-4 text-white shadow-xl sm:p-6`}
      dir={isAr ? 'rtl' : 'ltr'}
      aria-label={title}
    >
      <div className={`pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full blur-3xl ${theme.glow}`} />
      <div className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={`mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.16em] ${theme.icon}`}>
              <Sparkles size={12} />
              {isAr ? 'مغامرتك التعليمية' : 'YOUR LEARNING QUEST'}
            </div>
            <h3 className="text-lg font-black tracking-tight sm:text-xl">{title}</h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/70 sm:text-sm">{subtitle}</p>
          </div>
          <div className="flex shrink-0 flex-col items-center rounded-2xl border border-white/15 bg-black/15 px-3 py-2">
            {percent === 100 ? <Trophy className="mb-1 text-amber-200" size={20} /> : <Flag className="mb-1 text-white/80" size={20} />}
            <span className="font-mono text-lg font-black tabular-nums">{percent}%</span>
            <span className="text-[9px] font-bold text-white/55">{isAr ? 'إنجاز' : 'COMPLETE'}</span>
          </div>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-black/25 ring-1 ring-white/10">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${theme.progress}`}
            initial={reduceMotion ? false : { width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.7, ease: 'easeOut' }}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduceMotion ? { duration: 0 } : { delay: Math.min(index * 0.06, 0.24) }}
              className={`flex min-w-0 items-start gap-2.5 rounded-2xl border p-3 ${step.complete ? theme.complete : theme.active}`}
            >
              <span className="mt-0.5 shrink-0">
                {step.complete ? <CheckCircle2 size={18} /> : <Circle size={18} className="opacity-65" />}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-black leading-snug">{step.title}</span>
                <span className="mt-1 block text-[10px] leading-relaxed opacity-70">{step.detail}</span>
              </span>
              {!step.complete && index === steps.findIndex(item => !item.complete) && (
                <Zap size={14} className="ms-auto mt-0.5 shrink-0 opacity-75" />
              )}
            </motion.div>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-[10px] font-bold text-white/55">
          <Trophy size={12} />
          {isAr
            ? `${completed} من ${steps.length} مهام مكتملة — كمل عشان تفتح المحطة الجاية`
            : `${completed} of ${steps.length} quests complete — keep going to unlock the next milestone`}
        </p>
      </div>
    </motion.section>
  );
}
