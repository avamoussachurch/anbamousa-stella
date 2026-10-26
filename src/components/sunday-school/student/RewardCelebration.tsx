import React from 'react';
import { Trophy, Star, Crown, Flame, Sparkles } from 'lucide-react';
import { Language } from '../../../types';

export interface RewardCelebrationProps {
  type?: 'trophy' | 'star';
  title?: string;
  titleAr?: string;
  subtitle?: string;
  subtitleAr?: string;
  scorePercentage?: number;
  pointsEarned?: number;
  totalPoints?: number;
  streakDays?: number;
  streakGained?: boolean;
  badgeText?: string;
  badgeTextAr?: string;
  verseText?: string;
  verseRef?: string;
  lang?: Language;
  pulse?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const RewardCelebration: React.FC<RewardCelebrationProps> = ({
  type = 'trophy',
  title,
  titleAr,
  subtitle,
  subtitleAr,
  scorePercentage,
  pointsEarned,
  totalPoints,
  streakDays,
  streakGained,
  badgeText,
  badgeTextAr,
  verseText,
  verseRef,
  lang = 'ar',
  pulse = true,
  className = '',
  children
}) => {
  const isAr = lang === 'ar';

  const displayTitle = isAr
    ? titleAr || title || 'أحسنت صنعاً ومبارك الإتمام!'
    : title || titleAr || 'Outstanding Achievement!';

  const displaySubtitle = isAr
    ? subtitleAr || subtitle
    : subtitle || subtitleAr;

  const displayBadge = isAr
    ? badgeTextAr || badgeText
    : badgeText || badgeTextAr;

  return (
    <div 
      className={`relative text-center space-y-4 max-w-xl mx-auto py-2 select-none ${className}`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Gentle Pulsing Glow Ambient Aura */}
      <div 
        className={`relative inline-flex items-center justify-center mx-auto ${
          pulse ? 'animate-pulse' : ''
        }`}
        aria-hidden="true"
      >
        {/* Ambient Halo */}
        <div 
          className="absolute inset-0 rounded-full blur-xl opacity-60 bg-gradient-to-tr from-[var(--mousa-gold)] via-[var(--mousa-gold-glow)] to-[var(--mousa-coral)] scale-125 pointer-events-none" 
        />

        {/* Central Icon Orb */}
        <div 
          className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white shadow-xl border-2 border-white/50 bg-gradient-to-tr from-[var(--mousa-gold-dark)] via-[var(--mousa-gold)] to-[var(--mousa-coral)] transition-transform duration-300"
          style={{
            boxShadow: '0 10px 25px -5px rgba(198, 139, 35, 0.45), 0 8px 10px -6px rgba(217, 93, 57, 0.3)'
          }}
        >
          {type === 'star' ? (
            <Star 
              className="w-10 h-10 sm:w-12 sm:h-12 fill-white text-white drop-shadow-md" 
            />
          ) : (
            <Trophy 
              className="w-10 h-10 sm:w-12 sm:h-12 fill-white/20 text-white drop-shadow-md stroke-[2.2]" 
            />
          )}

          {/* Sparkle micro-insignia */}
          <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-[var(--mousa-gold-glow)] text-amber-950 flex items-center justify-center border-2 border-white shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-900 fill-amber-900" />
          </div>

          {streakGained && (
            <div className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-[var(--mousa-coral)] text-white flex items-center justify-center border-2 border-white shadow-xs">
              <Flame className="w-3.5 h-3.5 fill-white" />
            </div>
          )}
        </div>
      </div>

      {/* Title & Metadata Hierarchy */}
      <div className="space-y-1.5 px-2">
        {displayBadge && (
          <div className="text-xs font-black tracking-wide text-[var(--brand-gold-dark)] dark:text-[var(--mousa-gold)]">
            {displayBadge}
          </div>
        )}

        <h2 className="text-2xl sm:text-3xl font-black text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] font-sans leading-tight">
          {displayTitle}
        </h2>

        {displaySubtitle && (
          <p className="text-xs sm:text-sm text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] leading-relaxed max-w-md mx-auto font-medium">
            {displaySubtitle}
          </p>
        )}
      </div>

      {/* Scriptural Verse / Encouraging Word */}
      {verseText && (
        <div className="max-w-md mx-auto p-3 sm:p-3.5 rounded-2xl bg-[var(--mousa-gold-soft)] dark:bg-[#2B2313]/60 border border-[var(--mousa-gold)]/30 text-xs sm:text-sm font-bold text-[var(--mousa-teal-deep)] dark:text-amber-200">
          <p className="font-serif leading-relaxed italic">
            «{verseText}»
          </p>
          {verseRef && (
            <span className="block text-[11px] font-sans font-bold text-[var(--brand-gold-dark)] dark:text-[var(--mousa-gold-light)] pt-1 opacity-90">
              {verseRef}
            </span>
          )}
        </div>
      )}

      {children && (
        <div className="pt-2">
          {children}
        </div>
      )}
    </div>
  );
};
