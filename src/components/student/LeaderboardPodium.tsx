import React from 'react';
import { motion } from 'motion/react';
import { Crown, Flame, Star, Sparkles, Award } from 'lucide-react';
import { Language } from '../../types';

export interface PodiumItem {
  id: string;
  studentId: string;
  studentName: string;
  studentNameAr?: string;
  avatarUrl: string;
  score: number;
  rank: number;
  secondaryLabel?: string;
}

interface LeaderboardPodiumProps {
  items: PodiumItem[];
  type: 'streak' | 'points';
  lang: Language;
  currentUserId?: string;
}

export function LeaderboardPodium({ items, type, lang, currentUserId }: LeaderboardPodiumProps) {
  const isAr = lang === 'ar';
  
  if (!items || items.length < 1) return null;

  const first = items.find(i => i.rank === 1) || items[0];
  const second = items.find(i => i.rank === 2) || items[1];
  const third = items.find(i => i.rank === 3) || items[2];

  const renderPodiumSpot = (
    item: PodiumItem | undefined,
    place: 1 | 2 | 3,
    pedestalHeightClass: string,
    pedestalBgClass: string,
    ringColorClass: string,
    medalEmoji: string,
    numeralColor: string
  ) => {
    if (!item) return <div className="flex-1 opacity-20" />;

    const isCurrent = currentUserId && (
      item.studentId === currentUserId || 
      (currentUserId.startsWith('guest_') && item.studentId === 'u1')
    );

    const displayName = isAr 
      ? (item.studentNameAr || item.studentName)
      : item.studentName;

    return (
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20, 
          delay: place === 1 ? 0.15 : place === 2 ? 0.05 : 0.25 
        }}
        className={`flex-1 flex flex-col items-center justify-end relative z-10 ${
          place === 1 ? 'order-2 -mt-4' : place === 2 ? 'order-1' : 'order-3'
        }`}
      >
        {/* Crown on 1st place */}
        {place === 1 && (
          <motion.div
            initial={{ scale: 0, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: 0.35, type: 'spring' }}
            className="mb-1 text-amber-500 drop-shadow-md flex items-center justify-center"
          >
            <Crown className="w-8 h-8 fill-amber-400 stroke-amber-600 animate-bounce" />
          </motion.div>
        )}

        {/* Avatar with Ring & Rank Medal */}
        <div className="relative mb-2">
          <div className={`relative rounded-full p-1 ${ringColorClass} ${isCurrent ? 'ring-4 ring-offset-2 ring-[var(--mousa-coral)]' : ''}`}>
            <img 
              src={item.avatarUrl} 
              alt={displayName} 
              className={`rounded-full object-cover bg-white ${
                place === 1 ? 'w-20 h-20 sm:w-24 sm:h-24' : place === 2 ? 'w-16 h-16 sm:w-18 sm:h-18' : 'w-14 h-14 sm:w-16 sm:h-16'
              }`}
            />
          </div>

          {/* Place Medal Icon */}
          <span className={`absolute -bottom-1 -right-1 text-lg sm:text-xl rounded-full bg-white dark:bg-stone-800 shadow-md px-1 flex items-center justify-center border ${
            place === 1 ? 'border-amber-400' : place === 2 ? 'border-slate-300' : 'border-amber-700'
          }`}>
            {medalEmoji}
          </span>
        </div>

        {/* Name & Highlight */}
        <div className="text-center px-1 mb-2 max-w-[110px] sm:max-w-[140px]">
          <p className="font-black text-xs sm:text-sm text-stone-900 dark:text-stone-100 truncate">
            {displayName}
          </p>
          {isCurrent && (
            <span className="inline-block mt-0.5 text-[10px] font-black bg-[var(--mousa-gold)] text-[var(--mousa-teal-deep)] px-2 py-0.5 rounded-full shadow-2xs">
              {isAr ? 'أنت 🌟' : 'You 🌟'}
            </span>
          )}
        </div>

        {/* Score Pill */}
        <div className="mb-2">
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black shadow-xs ${
            type === 'streak' 
              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700' 
              : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
          }`}>
            {type === 'streak' ? (
              <>
                <Flame size={13} className="text-amber-600 fill-amber-500" />
                <span>{item.score} {isAr ? 'يوم' : 'd'}</span>
              </>
            ) : (
              <>
                <Sparkles size={13} className="text-emerald-600 fill-emerald-500" />
                <span>{item.score} {isAr ? 'نقطة' : 'pts'}</span>
              </>
            )}
          </div>
        </div>

        {/* 3D Podium Block */}
        <div 
          className={`w-full rounded-t-2xl sm:rounded-t-3xl flex flex-col items-center justify-start pt-3 shadow-md border-t-2 border-x-2 border-white/40 dark:border-white/10 ${pedestalHeightClass} ${pedestalBgClass}`}
        >
          <span className={`font-black text-3xl sm:text-4xl ${numeralColor} opacity-90 drop-shadow-sm`}>
            {place}
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/80 mt-0.5">
            {place === 1 ? (isAr ? 'الأول' : '1ST') : place === 2 ? (isAr ? 'الثاني' : '2ND') : (isAr ? 'الثالث' : '3RD')}
          </span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="relative pt-4 pb-2 px-2 max-w-lg mx-auto w-full">
      {/* Decorative ambient rays */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Podium Trio: 2nd (Left), 1st (Center, Elevated), 3rd (Right) */}
      <div className="flex items-end justify-center gap-2 sm:gap-4 relative z-10">
        {/* 2nd Place */}
        {renderPodiumSpot(
          second,
          2,
          'h-28 sm:h-32',
          'bg-gradient-to-t from-slate-400 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-500',
          'bg-gradient-to-tr from-slate-400 to-slate-200',
          '🥈',
          'text-slate-700 dark:text-slate-100'
        )}

        {/* 1st Place (Center) */}
        {renderPodiumSpot(
          first,
          1,
          'h-36 sm:h-44',
          'bg-gradient-to-t from-amber-600 via-amber-500 to-amber-300 dark:from-amber-800 dark:via-amber-600 dark:to-amber-400',
          'bg-gradient-to-tr from-amber-500 to-amber-300 ring-2 ring-amber-300',
          '🥇',
          'text-amber-950 dark:text-amber-50'
        )}

        {/* 3rd Place */}
        {renderPodiumSpot(
          third,
          3,
          'h-22 sm:h-24',
          'bg-gradient-to-t from-amber-900 via-amber-800 to-amber-700 dark:from-stone-800 dark:via-stone-700 dark:to-stone-600',
          'bg-gradient-to-tr from-amber-800 to-amber-600',
          '🥉',
          'text-amber-200 dark:text-stone-200'
        )}
      </div>

      {/* Ground Shadow Base */}
      <div className="h-3 w-full bg-gradient-to-r from-transparent via-stone-400/40 dark:via-stone-700 to-transparent rounded-full -mt-1 blur-xs" />
    </div>
  );
}
