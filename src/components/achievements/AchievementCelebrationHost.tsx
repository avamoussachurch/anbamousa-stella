import React, { useEffect, useState } from 'react';
import { Award, Check, Sparkles, Trophy, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';

type CelebrationItem = { id: string; title_en?: string; title_ar?: string; points_reward?: number; category?: string; badge_count?: number };
type CelebrationPayload = { badges: CelebrationItem[]; milestones: CelebrationItem[]; pointsAwarded: number };
const confetti = Array.from({ length: 34 }, (_, index) => ({
  left: (index * 37) % 100,
  delay: (index % 9) * 0.045,
  rotate: (index * 53) % 360,
  hue: (index * 29) % 360,
}));

export function AchievementCelebrationHost({ lang = 'en' }: { lang?: 'en' | 'ar' }) {
  const { userData, setUserDirectly } = useAuth();
  const [payload, setPayload] = useState<CelebrationPayload | null>(null);
  const [index, setIndex] = useState(0);
  const isArabic = lang === 'ar';
  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<CelebrationPayload>).detail;
      if (!detail || (!detail.badges?.length && !detail.milestones?.length)) return;
      if (detail.pointsAwarded > 0 && userData) {
        setUserDirectly({ ...userData, points: (userData.points || 0) + detail.pointsAwarded });
      }
      setPayload(detail);
      setIndex(0);
    };
    window.addEventListener('anba:achievement-unlocked', receive);
    return () => window.removeEventListener('anba:achievement-unlocked', receive);
  }, [userData?.id, userData?.points, setUserDirectly]);
  if (!payload) return null;
  const items = [...(payload.badges || []), ...(payload.milestones || [])];
  const item = items[index];
  const isMilestone = index >= (payload.badges || []).length;
  const title = isArabic ? (item.title_ar || item.title_en) : (item.title_en || item.title_ar);
  const hasNext = index < items.length - 1;
  const close = () => { setPayload(null); setIndex(0); };
  return <AnimatePresence>
    <motion.div key="achievement-celebration" className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#071B20]/80 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={isArabic ? 'احتفال بإنجاز جديد' : 'Achievement unlocked celebration'}>
      <button type="button" onClick={close} aria-label={isArabic ? 'إغلاق' : 'Close'} className="absolute right-5 top-5 z-20 rounded-full bg-white/15 p-3 text-white hover:bg-white/25"><X size={22}/></button>
      {confetti.map((piece, i) => <motion.i key={i} aria-hidden="true" className="absolute top-[-8%] h-3 w-2 rounded-sm" style={{ left: piece.left+'%', background: `hsl(${piece.hue} 90% 65%)` }} initial={{ y: '-5vh', rotate: piece.rotate, opacity: 0 }} animate={{ y: '110vh', rotate: piece.rotate + 500, opacity: [0,1,1,0] }} transition={{ duration: 2.8 + (i%5)*0.2, delay: piece.delay, ease: 'easeIn' }} />)}
      <motion.div initial={{ scale: 0.45, y: 90, rotate: -8, opacity: 0 }} animate={{ scale: 1, y: 0, rotate: 0, opacity: 1 }} exit={{ scale: 0.8, y: 30, opacity: 0 }} transition={{ type: 'spring', stiffness: 170, damping: 13 }} className="relative z-10 w-full max-w-lg rounded-[2rem] border-4 border-amber-200/80 bg-gradient-to-b from-[#FFF8E8] via-white to-[#F8E8C9] p-7 text-center text-[#173E46] shadow-[0_30px_100px_rgba(0,0,0,.5)] sm:p-10">
        <motion.div className="absolute -inset-3 -z-10 rounded-[2.4rem] border border-amber-100/70" animate={{ scale: [1,1.05,1], opacity: [.35,.8,.35] }} transition={{ duration: 2, repeat: Infinity }} />
        <motion.div className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-[2rem] bg-gradient-to-br from-amber-300 via-yellow-500 to-orange-500 text-white shadow-[0_12px_35px_rgba(194,129,24,.4)] ring-8 ring-amber-100" animate={{ rotate: [0,-8,8,0], scale: [1,1.08,1] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: .5 }}>
          {isMilestone ? <Trophy size={58}/> : <Award size={58}/>}
        </motion.div>
        <motion.p initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .15 }} className="text-sm font-black uppercase tracking-[.25em] text-amber-700">{isArabic ? 'يا سلام! إنجاز جديد!' : 'Amazing! You did it!'}</motion.p>
        <motion.h2 initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .25 }} className="mt-3 text-3xl font-black sm:text-4xl">{isArabic ? 'فتحت وسام جديد!' : 'BADGE UNLOCKED!'}</motion.h2>
        <motion.p initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .35 }} className="mt-3 text-xl font-extrabold">{title}</motion.p>
        <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-amber-100 px-5 py-3 text-lg font-black text-amber-900"><Sparkles size={20}/>+{item.points_reward || 0} {isArabic ? 'نقطة' : 'points'}</div>
        {payload.milestones?.length > 0 && <p className="mt-3 text-sm font-bold text-[#477078]">{isArabic ? `مكافآت المراحل: ${payload.milestones.length}` : `Category milestones earned: ${payload.milestones.length}`}</p>}
        <div className="mt-7 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={hasNext ? () => setIndex(value=>value+1) : close} className="flex-1 rounded-2xl bg-[#15515C] px-6 py-4 text-base font-black text-white shadow-lg transition hover:bg-[#0D3C45]">{hasNext ? (isArabic ? 'الإنجاز التالي' : 'Next achievement') : (isArabic ? 'رائع! أكمل رحلتك' : 'Awesome! Keep going')}</button><button type="button" onClick={close} className="rounded-2xl border-2 border-amber-200 px-5 py-4 text-sm font-bold text-[#527078]">{isArabic ? 'إغلاق' : 'Close'}</button></div>
        <div className="mt-5 flex items-center justify-center gap-1 text-amber-500"><Sparkles/><Check/><Sparkles/></div>
      </motion.div>
    </motion.div>
  </AnimatePresence>;
}
