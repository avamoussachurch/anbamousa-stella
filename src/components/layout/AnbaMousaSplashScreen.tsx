import React from 'react';
import { Church, Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { Language } from '../../types';

interface AnbaMousaSplashScreenProps {
  lang?: Language;
}

export const AnbaMousaSplashScreen: React.FC<AnbaMousaSplashScreenProps> = ({ lang = 'ar' }) => {
  const isAr = lang === 'ar';
  const reduceMotion = useReducedMotion();

  return (
    <main
      role="status"
      aria-live="polite"
      aria-label={isAr ? 'بنجهّز أنبا موسى' : 'Loading Anba Mousa'}
      className="min-h-[100svh] w-full overflow-hidden flex items-center justify-center px-6 py-10 bg-[radial-gradient(ellipse_at_top,_#1D4650_0%,_#102A34_58%,_#0B2029_100%)] text-[#FFF9ED]"
    >
      <div className="relative w-full max-w-sm text-center">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <motion.span
            className="absolute top-5 start-8 text-[#E5C47A] text-xl"
            animate={reduceMotion ? undefined : { y: [0, -7, 0], opacity: [0.55, 1, 0.55] }}
            transition={reduceMotion ? undefined : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          >✦</motion.span>
          <motion.span
            className="absolute top-16 end-7 text-[#E5C47A] text-sm"
            animate={reduceMotion ? undefined : { y: [0, 6, 0], opacity: [0.4, 0.9, 0.4] }}
            transition={reduceMotion ? undefined : { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          >✧</motion.span>
          <span className="absolute bottom-24 start-3 text-[#B9D4C8] text-xs">✧</span>
          <span className="absolute bottom-16 end-5 text-[#B9D4C8] text-lg">✦</span>
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.45, ease: 'easeOut' }}
          className="relative mx-auto mb-7 flex h-24 w-24 items-center justify-center rounded-[1.8rem] border-2 border-[#D6B66D] bg-[#F6EBD1] text-[#173B45] shadow-[0_0_0_7px_rgba(214,182,109,0.12),0_18px_48px_rgba(0,0,0,0.28)]"
        >
          <Church className="h-12 w-12" strokeWidth={1.7} />
          <span className="absolute -bottom-2 -end-2 flex h-8 w-8 items-center justify-center rounded-xl border-2 border-[#173B45] bg-[#D6B66D] text-lg font-black text-[#173B45]">✥</span>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : 0.12 }}
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.34em] text-[#D6B66D]">Coptic Orthodox Learning</p>
          <h1 className="text-4xl font-black tracking-tight text-[#FFF9ED]">Anba Mousa</h1>
          <p className="mt-3 text-sm font-semibold text-[#DCE9E3]">
            {isAr ? 'نكبر في الإيمان ونتعلّم بالمحبة' : 'Growing in Faith, Learning in Love'}
          </p>
        </motion.div>

        <div className="mx-auto mt-10 flex items-center justify-center gap-2 text-xs font-semibold text-[#B9D4C8]">
          <Sparkles className="h-4 w-4 text-[#D6B66D]" />
          <span>{isAr ? 'بنجهّز عالم التعلّم...' : 'Preparing your learning world...'}</span>
        </div>
        <div className="mx-auto mt-4 h-1.5 w-40 overflow-hidden rounded-full bg-white/15">
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-[#D6B66D] to-[#F5E4B5]"
            animate={reduceMotion ? undefined : { x: ['-120%', '320%'] }}
            transition={reduceMotion ? undefined : { duration: 1.35, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>
    </main>
  );
};
