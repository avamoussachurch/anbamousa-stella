import React, { useState, useEffect } from 'react';
import { Sun, Moon, Sunrise, Sunset, Sparkles, MapPin, Compass } from 'lucide-react';
import { Language } from '../../types';

interface LiveJourneyProps {
  progressPercentage: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  streakDays: number;
  lang: Language;
}

type TimeOfDay = 'morning' | 'day' | 'sunset' | 'night';

/**
 * The Journey of Moses: Live Journey Responsive SVG
 * - Automatically adapts to the user's local time-of-day (morning sunrise, bright day, sunset twilight, starry night).
 * - Live responds to authoritative lesson progress:
 *    * 0-24%: Scetis dunes with first desert seedling.
 *    * 25-49%: Blooming Desert Rose flowers (ورد البرية) & Wilderness Well.
 *    * 50-74%: Tall Date Palms, oasis spring, and resting caravan tent.
 *    * 75-100%: Ancient Scetis Coptic Monastery illuminated with shining cross & victory garland.
 * - Dynamic traveler position moves across the trail as progress increases.
 */
export const MosesLiveJourneyIllustration: React.FC<LiveJourneyProps> = ({
  progressPercentage,
  completedLessonsCount,
  totalLessonsCount,
  streakDays,
  lang
}) => {
  const isAr = lang === 'ar';
  const isCop = lang === 'copt' || lang === 'cop';

  // Determine local time of day deterministically
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 17) return 'day';
    if (hour >= 17 && hour < 20) return 'sunset';
    return 'night';
  });

  useEffect(() => {
    const checkTime = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 11) setTimeOfDay('morning');
      else if (hour >= 11 && hour < 17) setTimeOfDay('day');
      else if (hour >= 17 && hour < 20) setTimeOfDay('sunset');
      else setTimeOfDay('night');
    };
    const timer = setInterval(checkTime, 60000);
    return () => clearInterval(timer);
  }, []);

  // Clamp percentage between 0 and 100
  const pct = Math.min(Math.max(0, progressPercentage), 100);

  // Time-of-day theme configurations
  const timeConfig = {
    morning: {
      labelAr: 'فجر برية شيهيت',
      labelEn: 'Scetis Dawn & Sunrise',
      labelCop: 'Ⲡⲓⲟⲩⲱⲓⲛⲓ ⲛ̀ⲧⲉ ⲧⲟⲟⲩⲓ',
      skyFrom: '#FDF7EB',
      skyVia: '#F7E6CE',
      skyTo: '#EDD1AE',
      sunColor: '#F6C45E',
      sunAura: '#E5A638',
      textColor: 'text-amber-900 dark:text-amber-200',
      icon: Sunrise
    },
    day: {
      labelAr: 'شمس البرية الذهبية',
      labelEn: 'Desert Midday Sun',
      labelCop: 'Ⲡⲓⲣⲏ ⲙ̀ⲙⲉⲣⲓ',
      skyFrom: '#FBF5E8',
      skyVia: '#F3E5CB',
      skyTo: '#DEC4A6',
      sunColor: '#EAA838',
      sunAura: '#C68B23',
      textColor: 'text-amber-950 dark:text-[#FAF5EB]',
      icon: Sun
    },
    sunset: {
      labelAr: 'غروب الشفق الكنسي',
      labelEn: 'Ecclesiastical Twilight',
      labelCop: 'Ⲡⲓⲣⲟⲩϩⲓ ⲛ̀ⲧⲉ ϯⲉⲕⲕⲗⲏⲥⲓⲁ',
      skyFrom: '#FBE9DC',
      skyVia: '#E8A382',
      skyTo: '#8F4632',
      sunColor: '#D95D39',
      sunAura: '#A5391C',
      textColor: 'text-stone-900 dark:text-[#FAF5EB]',
      icon: Sunset
    },
    night: {
      labelAr: 'سهر وصلوات الليل',
      labelEn: 'Night Vigil Under Desert Stars',
      labelCop: 'Ⲡⲓⲉ̀ϫⲱⲣϩ ⲛ̀ⲧⲉ ⲛⲓⲉⲩⲭⲏ',
      skyFrom: '#0E1724',
      skyVia: '#17243A',
      skyTo: '#233652',
      sunColor: '#F5EAC8',
      sunAura: '#A3B4CC',
      textColor: 'text-sky-100',
      icon: Moon
    }
  }[timeOfDay];

  const TimeIcon = timeConfig.icon;

  // Milestone stages unlocked based on real progress
  const hasSprout = true; // Always present at the start of faith
  const hasDesertRose = pct >= 25 || completedLessonsCount >= 1;
  const hasWildernessWell = pct >= 40 || completedLessonsCount >= 2;
  const hasDatePalms = pct >= 60 || completedLessonsCount >= 3;
  const hasCaravanTent = pct >= 75 || completedLessonsCount >= 4;
  const hasMonasterySummit = pct >= 90 || (totalLessonsCount > 0 && completedLessonsCount >= totalLessonsCount);

  // Traveler position along trail (interpolated from 70px to 880px)
  const travelerX = 70 + (pct * 8.1);

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-[var(--mousa-border-sand)] bg-[var(--mousa-cream-surface)] dark:bg-[#1C1814] p-4 sm:p-6 shadow-sm transition-all">
      {/* Top Controls: Time-of-day indicator & Live Progress Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[var(--mousa-border-sand)]/60 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[var(--mousa-gold)] to-[var(--mousa-coral)] text-white shadow-xs">
            <Compass size={18} />
          </div>
          <div>
            <h4 className="font-extrabold text-xs sm:text-sm text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB] flex items-center gap-1.5">
              <span>{isCop ? 'Ⲡⲓⲙⲱⲓⲧ ⲉⲧⲟⲛϧ ⲛ̀ⲧⲉ Ⲙⲱⲩⲥⲏⲥ' : isAr ? 'المسار الحي لرحلة الأنبا موسى' : 'Live Journey of Moses Landscape'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--mousa-gold-soft)] text-[var(--mousa-gold-dark)] dark:text-[var(--mousa-gold-light)] border border-[var(--mousa-gold)]/30 font-bold">
                {isAr ? 'بيتغير حسب الوقت وتقدمك' : 'Real-time & Progress Linked'}
              </span>
            </h4>
            <p className="text-[11px] text-[var(--mousa-sand-500)] dark:text-[#C5B5A0] font-medium">
              {isAr
                ? 'كل ما تكمّل دروس أكتر، أزهار البرية تتفتح ومعالم الدير تنور'
                : 'Desert flora blossoms and landmarks awaken as you complete real lessons'}
            </p>
          </div>
        </div>

        {/* Time of day pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[var(--mousa-sand-100)] dark:bg-[#25201A] border border-[var(--mousa-border-sand)] text-xs font-bold self-start sm:self-auto">
          <TimeIcon size={14} className="text-[var(--mousa-gold)]" />
          <span className="text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
            {isCop ? timeConfig.labelCop : isAr ? timeConfig.labelAr : timeConfig.labelEn}
          </span>
        </div>
      </div>

      {/* Main Responsive SVG Landscape */}
      <div className="relative mt-4 w-full rounded-2xl overflow-hidden border border-[var(--mousa-border-sand)]/70 shadow-inner bg-stone-100 dark:bg-stone-900">
        <svg
          viewBox="0 0 1000 360"
          className="w-full h-auto block select-none"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={
            isAr
              ? `مشهد حي لبرية شيهيت، إنت خلّصت ${pct}٪ من الرحلة`
              : `Live Scetis landscape illustrating ${pct}% lesson completion`
          }
        >
          <defs>
            {/* Dynamic Sky Gradient */}
            <linearGradient id="liveSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={timeConfig.skyFrom} />
              <stop offset="50%" stopColor={timeConfig.skyVia} />
              <stop offset="100%" stopColor={timeConfig.skyTo} />
            </linearGradient>

            {/* Dunes Gradients */}
            <linearGradient id="backDuneGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#DFC3A0" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#C49F75" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="midDuneGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EAD3B3" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#D4B48D" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="frontDuneGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F5E4CE" />
              <stop offset="100%" stopColor="#E2C5A2" />
            </linearGradient>

            {/* Sun / Moon Radiant Aura */}
            <radialGradient id="celestialGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={timeConfig.sunColor} stopOpacity="1" />
              <stop offset="50%" stopColor={timeConfig.sunAura} stopOpacity="0.35" />
              <stop offset="100%" stopColor={timeConfig.sunAura} stopOpacity="0" />
            </radialGradient>

            {/* Golden Ripple Filter */}
            <linearGradient id="waterRipple" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3895A9" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#71C7D6" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#3895A9" stopOpacity="0.7" />
            </linearGradient>
          </defs>

          {/* 1. Sky Canvas */}
          <rect width="1000" height="360" fill="url(#liveSky)" />

          {/* 2. Celestial Body (Sun or Moon depending on local time) */}
          {timeOfDay === 'night' ? (
            /* Night Mode: Moon & Twinkling Stars */
            <g>
              {/* Twinkling Stars */}
              <circle cx="120" cy="45" r="2" fill="#FAF5EB" className="mousa-twinkle" />
              <circle cx="210" cy="70" r="1.5" fill="#FAF5EB" className="mousa-twinkle" style={{ animationDelay: '0.4s' }} />
              <circle cx="340" cy="35" r="2.5" fill="#F6C45E" className="mousa-twinkle" style={{ animationDelay: '0.9s' }} />
              <circle cx="480" cy="60" r="1.5" fill="#FAF5EB" className="mousa-twinkle" style={{ animationDelay: '1.2s' }} />
              <circle cx="620" cy="40" r="2" fill="#FAF5EB" className="mousa-twinkle" style={{ animationDelay: '0.7s' }} />
              <circle cx="750" cy="80" r="2" fill="#F6C45E" className="mousa-twinkle" style={{ animationDelay: '1.5s' }} />
              <circle cx="880" cy="45" r="1.5" fill="#FAF5EB" className="mousa-twinkle" style={{ animationDelay: '0.3s' }} />

              {/* Glowing Crescent Moon */}
              <circle cx="830" cy="85" r="42" fill="url(#celestialGlow)" />
              <path
                d="M830 55 A 30 30 0 1 0 860 85 A 25 25 0 1 1 830 55 Z"
                fill="#FDF8E8"
                filter="drop-shadow(0 0 10px rgba(246,196,94,0.6))"
              />
            </g>
          ) : (
            /* Day / Dawn / Sunset Sun with radiant rays */
            <g>
              <circle cx="840" cy="95" r="75" fill="url(#celestialGlow)" />
              <circle
                cx="840"
                cy="95"
                r="35"
                fill={timeConfig.sunColor}
                filter="drop-shadow(0 0 14px rgba(246,196,94,0.8))"
              />
              {/* Sun Rays */}
              <g stroke={timeConfig.sunColor} strokeWidth="2.5" strokeLinecap="round" opacity="0.45">
                <line x1="840" y1="45" x2="840" y2="30" />
                <line x1="840" y1="145" x2="840" y2="160" />
                <line x1="790" y1="95" x2="775" y2="95" />
                <line x1="890" y1="95" x2="905" y2="95" />
                <line x1="805" y1="60" x2="794" y2="49" />
                <line x1="875" y1="130" x2="886" y2="141" />
                <line x1="875" y1="60" x2="886" y2="49" />
                <line x1="805" y1="130" x2="794" y2="141" />
              </g>
            </g>
          )}

          {/* 3. Distant Scetis Monastery Silhouette on the horizon (Summit) */}
          <g opacity={hasMonasterySummit ? '0.95' : pct >= 50 ? '0.6' : '0.35'} transition-all="true">
            {/* Monastery Walls & Fortress */}
            <rect x="760" y="110" width="70" height="75" rx="3" fill="#6B4F32" />
            <rect x="835" y="85" width="45" height="100" rx="3" fill="#5A4128" />
            <rect x="885" y="120" width="55" height="65" rx="3" fill="#6B4F32" />

            {/* Bell Tower Dome */}
            <path d="M835 85 Q 857 60 880 85 Z" fill="#8F5E10" />
            {/* Cross on top of Tower */}
            <line x1="857.5" y1="45" x2="857.5" y2="62" stroke="#E5A638" strokeWidth="4" strokeLinecap="round" />
            <line x1="849" y1="52" x2="866" y2="52" stroke="#E5A638" strokeWidth="4" strokeLinecap="round" />

            {/* If Summit unlocked: Golden cross radiance */}
            {hasMonasterySummit && (
              <g className="mousa-float">
                <circle cx="857.5" cy="52" r="18" fill="#F6C45E" fillOpacity="0.4" />
                <circle cx="857.5" cy="52" r="28" fill="#F6C45E" fillOpacity="0.2" />
              </g>
            )}

            {/* Lit Monastery Windows */}
            <rect x="780" y="135" width="12" height="18" rx="6" fill={hasMonasterySummit ? '#F6C45E' : '#DEC4A6'} />
            <rect x="805" y="135" width="12" height="18" rx="6" fill={hasMonasterySummit ? '#F6C45E' : '#DEC4A6'} />
            <rect x="850" y="105" width="14" height="22" rx="7" fill={hasMonasterySummit ? '#F6C45E' : '#DEC4A6'} />
          </g>

          {/* 4. Background Sand Dunes */}
          <path
            d="M0 210 C180 160 360 230 560 175 C740 125 870 180 1000 150 L1000 360 L0 360 Z"
            fill="url(#backDuneGrad)"
          />

          {/* 5. Middle Sand Dunes */}
          <path
            d="M0 245 C190 200 410 270 630 215 C800 175 910 220 1000 195 L1000 360 L0 360 Z"
            fill="url(#midDuneGrad)"
          />

          {/* 6. Foreground Dunes & Main Path */}
          <path
            d="M0 280 C200 240 430 300 660 255 C820 225 930 260 1000 240 L1000 360 L0 360 Z"
            fill="url(#frontDuneGrad)"
          />

          {/* 7. The Golden Caravan Trail Path Curve */}
          <path
            d="M50 320 Q 280 290 500 305 T 920 265"
            stroke="#C68B23"
            strokeWidth="4"
            strokeDasharray="8 10"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* 8. Progress-Responsive Living Elements along the Trail */}

          {/* Station 1: The Wilderness Sprout (Faith Seed) - At x=100 */}
          {hasSprout && (
            <g transform="translate(100, 305)">
              <ellipse cx="0" cy="5" rx="14" ry="4" fill="#C49F75" opacity="0.6" />
              {/* Green seedling stem */}
              <path d="M0 5 Q -2 -12 0 -22" stroke="#2F6B4F" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              {/* Leaves */}
              <path d="M0 -15 Q 12 -22 14 -12 Q 8 -6 0 -12" fill="#3E8B67" />
              <path d="M0 -18 Q -12 -26 -14 -16 Q -8 -10 0 -15" fill="#2F6B4F" />
            </g>
          )}

          {/* Station 2: Blooming Desert Rose (ورد البرية) - Unlocks at 25% progress - At x=280 */}
          {hasDesertRose ? (
            <g transform="translate(280, 285)" className="mousa-float">
              <ellipse cx="0" cy="12" rx="18" ry="5" fill="#C49F75" opacity="0.5" />
              {/* Bush base */}
              <path d="M-12 12 Q 0 -6 12 12" stroke="#7F5E3B" strokeWidth="3" fill="none" />
              {/* Blooming Coral/Gold Flower Petals */}
              <circle cx="0" cy="-10" r="12" fill="#D95D39" filter="drop-shadow(0 2px 4px rgba(217,93,57,0.4))" />
              <circle cx="-7" cy="-14" r="9" fill="#EB7958" />
              <circle cx="7" cy="-14" r="9" fill="#EB7958" />
              <circle cx="0" cy="-18" r="9" fill="#F6C45E" />
              <circle cx="0" cy="-10" r="4.5" fill="#FAF5EB" />
              {/* Sparkle badge above bloom */}
              <circle cx="15" cy="-22" r="2" fill="#F6C45E" className="mousa-twinkle" />
            </g>
          ) : (
            /* Locked station marker */
            <g transform="translate(280, 295)" opacity="0.4">
              <circle cx="0" cy="0" r="6" fill="#A88155" />
              <circle cx="0" cy="0" r="10" stroke="#A88155" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
            </g>
          )}

          {/* Station 3: Wilderness Well & Water Ripple (ينبوع الكلمة) - Unlocks at 40% - At x=450 */}
          {hasWildernessWell ? (
            <g transform="translate(450, 292)">
              {/* Stone Well Foundation */}
              <ellipse cx="0" cy="6" rx="26" ry="10" fill="#7F5E3B" />
              <ellipse cx="0" cy="3" rx="22" ry="8" fill="url(#waterRipple)" />
              {/* Well Stone Edge */}
              <path d="M-22 3 L-22 15 Q 0 24 22 15 L22 3" fill="#937B63" stroke="#5A4128" strokeWidth="1.5" />
              {/* Well Wooden Canopy Frame */}
              <line x1="-15" y1="3" x2="-15" y2="-22" stroke="#5A4128" strokeWidth="3" strokeLinecap="round" />
              <line x1="15" y1="3" x2="15" y2="-22" stroke="#5A4128" strokeWidth="3" strokeLinecap="round" />
              <line x1="-18" y1="-22" x2="18" y2="-22" stroke="#5A4128" strokeWidth="3" strokeLinecap="round" />
              <path d="M-20 -22 L0 -34 L20 -22 Z" fill="#C68B23" />
              {/* Water droplet glow */}
              <circle cx="0" cy="-12" r="3" fill="#3895A9" className="mousa-float" />
            </g>
          ) : (
            <g transform="translate(450, 302)" opacity="0.4">
              <circle cx="0" cy="0" r="6" fill="#A88155" />
              <circle cx="0" cy="0" r="10" stroke="#A88155" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
            </g>
          )}

          {/* Station 4: Tall Date Palms & Flying Dove (نخلة الشجاعة) - Unlocks at 60% - At x=640 */}
          {hasDatePalms ? (
            <g transform="translate(640, 240)">
              {/* Palm Trunk 1 */}
              <path d="M0 60 Q 10 20 5 -20" stroke="#7F5E3B" strokeWidth="6" strokeLinecap="round" fill="none" />
              {/* Palm Fronds / Leaves */}
              <path d="M5 -20 Q -25 -40 -40 -20" stroke="#2F6B4F" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <path d="M5 -20 Q 0 -50 20 -45" stroke="#3E8B67" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <path d="M5 -20 Q 35 -35 45 -10" stroke="#2F6B4F" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <path d="M5 -20 Q -20 -10 -35 5" stroke="#3E8B67" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M5 -20 Q 25 -5 35 15" stroke="#2F6B4F" strokeWidth="3" fill="none" strokeLinecap="round" />
              {/* Golden Dates Cluster */}
              <circle cx="2" cy="-15" r="3" fill="#E5A638" />
              <circle cx="7" cy="-14" r="3" fill="#C68B23" />
              <circle cx="4" cy="-10" r="2.5" fill="#E5A638" />

              {/* Flying Peace Dove in the sky */}
              <g transform="translate(-40, -60)" className="mousa-float">
                <path d="M0 0 Q 8 -10 16 -4 Q 8 -2 0 0" fill="#FAF5EB" />
                <path d="M6 -4 Q 12 -16 20 -10 Q 14 -6 6 -4" fill="#FFFFFF" />
              </g>
            </g>
          ) : (
            <g transform="translate(640, 275)" opacity="0.4">
              <circle cx="0" cy="0" r="6" fill="#A88155" />
              <circle cx="0" cy="0" r="10" stroke="#A88155" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
            </g>
          )}

          {/* Station 5: Traveler Caravan Tent / Rest Canopy - Unlocks at 75% - At x=780 */}
          {hasCaravanTent && (
            <g transform="translate(750, 275)">
              {/* Tent Canopy in Coptic Stripe Colors */}
              <polygon points="0,0 25,-26 50,0" fill="#D95D39" />
              <polygon points="12,-13 25,-26 38,-13" fill="#F6C45E" />
              {/* Tent Poles */}
              <line x1="25" y1="-26" x2="25" y2="0" stroke="#5A4128" strokeWidth="2" />
              <line x1="25" y1="-26" x2="25" y2="-32" stroke="#E5A638" strokeWidth="2" />
              {/* Small banner flag on tent */}
              <polygon points="25,-32 35,-29 25,-26" fill="#144E5B" />
            </g>
          )}

          {/* 9. Live Moving Traveler Marker (Follows real percentage) */}
          <g
            transform={`translate(${travelerX}, 285)`}
            className="transition-transform duration-700 ease-out"
          >
            {/* Soft Shadow under traveler */}
            <ellipse cx="0" cy="22" rx="14" ry="4" fill="#5A4128" opacity="0.4" />

            {/* Glowing Golden Ring Pulse for Active Node */}
            <circle cx="0" cy="0" r="18" fill="none" stroke="#C68B23" strokeWidth="2" opacity="0.75" />
            <circle cx="0" cy="0" r="14" fill="#FAF5EB" filter="drop-shadow(0 4px 8px rgba(198,139,35,0.5))" />

            {/* Traveler Avatar / Icon */}
            <circle cx="0" cy="0" r="12" fill="url(#celestialGlow)" />
            <text
              x="0"
              y="4.5"
              textAnchor="middle"
              fontSize="12"
              fontWeight="900"
              fill="#0D373F"
            >
              🧭
            </text>

            {/* Progress Label Flag above traveler */}
            <g transform="translate(0, -22)" className="mousa-float">
              <rect x="-18" y="-12" width="36" height="15" rx="7.5" fill="#0D373F" stroke="#F6C45E" strokeWidth="1.5" />
              <text x="0" y="-1.5" textAnchor="middle" fontSize="9" fontWeight="900" fill="#FAF5EB">
                {pct}%
              </text>
            </g>
          </g>
        </svg>
      </div>

      {/* Footer State Caption */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[var(--mousa-sand-600)] dark:text-[#C5B5A0] px-1">
        <div className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-[var(--mousa-gold)]" />
          <span>
            {pct === 100
              ? (isCop ? 'Ⲁⲕⲫⲟϩ ⲉ̀ⲡⲓⲙⲟⲛⲁⲥⲧⲏⲣⲓⲟⲛ' : isAr ? 'وصلت لدير القديسين في برية شيهيت ⛪' : 'Arrived at the Sanctuary of Scetis ⛪')
              : pct >= 50
                ? (isCop ? 'Ⲫⲁϣⲓ ⲛ̀ⲧⲉ ⲡⲓⲙⲱⲓⲧ ⲉⲧⲧⲁⲓⲏⲟⲩⲧ' : isAr ? 'واحة النخيل والينابيع بقت مزهرة 🌴' : 'Palm Oasis & Springs in Full Bloom 🌴')
                : (isCop ? 'Ⲁⲣⲓϩⲏⲧⲥ ϧⲉⲛ ⲡⲓⲙⲱⲓⲧ' : isAr ? 'ورد البرية بيتفتح مع كل محطة جديدة 🌸' : 'Desert Flora Awakens with Each Milestone 🌸')}
          </span>
        </div>
        <div className="text-[11px] text-[var(--mousa-sand-500)] dark:text-[#A89885]">
          {completedLessonsCount} / {totalLessonsCount} {isAr ? 'محطات خلّصتها' : 'completed milestones'}
        </div>
      </div>
    </div>
  );
};
