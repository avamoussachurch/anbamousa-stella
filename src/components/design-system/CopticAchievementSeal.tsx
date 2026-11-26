import React from 'react';

export type CopticAchievementCategory =
  | 'learning' | 'hymns' | 'taxis' | 'prayer' | 'quizzes'
  | 'community' | 'attendance' | 'consistency' | 'service';

const PALETTES: Record<CopticAchievementCategory, [string, string, string]> = {
  learning: ['#123F48', '#E7BD65', '#FFF0BD'],
  hymns: ['#3C254E', '#C49BE7', '#F6E9FF'],
  taxis: ['#572D2D', '#E1AD61', '#FFF0C4'],
  prayer: ['#243D59', '#9ED8E6', '#F4F7FF'],
  quizzes: ['#3C4A2B', '#C8D98B', '#F7FFD9'],
  community: ['#5B2E46', '#F2A8C5', '#FFF0F6'],
  attendance: ['#3F3A27', '#E6C36E', '#FFF4C9'],
  consistency: ['#234638', '#8FD0A3', '#E8FFF0'],
  service: ['#553D27', '#E7B47B', '#FFF1DC'],
};

function Emblem({ category, light }: { category: CopticAchievementCategory; light: string }) {
  const stroke = light;
  switch (category) {
    case 'prayer':
      return <g fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M50 19c-5 12-17 17-17 31a17 17 0 0 0 34 0c0-14-12-19-17-31Z" fill={stroke} fillOpacity=".16"/><path d="M50 37v24M41 46h18M39 70h22"/></g>;
    case 'hymns':
      return <g fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M36 67V40q14-13 28 0v27M36 49q14-10 28 0M42 42v25M50 37v30M58 42v25"/><path d="M31 27q5-7 10 0M64 24q7-5 10 2"/></g>;
    case 'taxis':
      return <g fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M50 22v43M35 36h30M40 29h20M31 70h38"/><path d="M36 68q14 9 28 0M39 77h22"/><circle cx="50" cy="17" r="4" fill={stroke}/></g>;
    case 'quizzes':
      return <g fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M34 30h32v40H34z"/><path d="M41 42h18M41 51h18M41 60h11"/><path d="m60 64 5 5 10-13"/></g>;
    case 'community':
      return <g fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="50" cy="35" r="8"/><circle cx="31" cy="43" r="6"/><circle cx="69" cy="43" r="6"/><path d="M35 70q0-17 15-17t15 17M20 68q0-13 11-13 5 0 8 4M80 68q0-13-11-13-5 0-8 4"/><path d="M50 64c-8-7-13-11-13-16 0-7 9-9 13-2 4-7 13-5 13 2 0 5-5 9-13 16Z" fill={stroke} fillOpacity=".2"/></g>;
    case 'attendance':
      return <g fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M29 68V43l21-17 21 17v25H29Z"/><path d="M43 68V51h14v17M24 72h52"/><path d="m50 15 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill={stroke} fillOpacity=".2"/></g>;
    case 'consistency':
      return <g fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M50 68V36M50 47 34 35M50 55l17-15"/><path d="M31 70q-8-12 0-24M69 70q8-12 0-24M25 74h50"/><path d="M50 18v9M35 23l5 7M65 23l-5 7"/></g>;
    case 'service':
      return <g fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M25 60q8-10 18-3l7 5q5 4 10 0l12-9q8-5 12 3-14 19-30 21H39q-8-3-14-17Z"/><path d="M50 48c-8-7-13-11-13-16 0-7 9-9 13-2 4-7 13-5 13 2 0 5-5 9-13 16Z" fill={stroke} fillOpacity=".25"/></g>;
    case 'learning':
    default:
      return <g fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M50 68q-14-10-27-5V33q14-5 27 5 13-10 27-5v30q-13-5-27 5Z"/><path d="M50 38v30M34 44q7 0 11 4M66 44q-7 0-11 4"/><path d="M50 17v7M33 21l4 6M67 21l-4 6"/></g>;
  }
}

export function CopticAchievementSeal({
  category,
  designKey,
  size = 64,
  earned = true,
  title,
  className = '',
}: {
  category: CopticAchievementCategory;
  designKey: string;
  size?: number;
  earned?: boolean;
  title?: string;
  className?: string;
}) {
  const [base, accent, light] = PALETTES[category] || PALETTES.learning;
  const safeKey = designKey.replace(/[^a-zA-Z0-9_-]/g, '-');
  const seed = Array.from(designKey).reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7);
  const rotation = seed % 18;
  const instanceId = React.useId().replace(/:/g, '');
  const id = 'seal-' + safeKey + '-' + instanceId;
  return (
    <span className={'inline-grid shrink-0 place-items-center ' + className} style={{ width: size, height: size, opacity: earned ? 1 : 0.48 }} title={title}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label={title || category}>
        <defs>
          <radialGradient id={id + '-metal'} cx="35%" cy="25%" r="80%"><stop offset="0" stopColor={light}/><stop offset=".38" stopColor={accent}/><stop offset="1" stopColor={base}/></radialGradient>
          <linearGradient id={id + '-edge'} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={light}/><stop offset=".5" stopColor={accent}/><stop offset="1" stopColor={base}/></linearGradient>
          <filter id={id + '-shadow'} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter>
        </defs>
        <path d="M50 4 61 10 74 8 81 20 93 28 90 43 96 55 86 67 85 82 70 86 60 96 47 91 33 96 24 84 10 79 12 64 4 52 11 39 8 25 22 18 30 7Z" fill="#080E16" opacity=".34" filter={'url(#' + id + '-shadow)'} transform="translate(0 2)"/>
        <path d="M50 3 61 9 74 7 81 19 93 27 90 42 96 54 86 66 85 81 70 85 60 95 47 90 33 95 24 83 10 78 12 63 4 51 11 38 8 24 22 17 30 6Z" fill={'url(#' + id + '-metal)'} stroke={light} strokeWidth="2.5"/>
        <path d="M50 11 60 16 71 15 77 25 86 31 83 43 88 54 79 64 78 76 67 79 59 88 48 84 36 88 29 78 18 74 20 62 13 52 19 41 17 30 28 24 34 15Z" fill="none" stroke={light} strokeWidth="1.5" opacity=".9"/>
        {Array.from({length:12},(_,index)=><circle key={index} cx="50" cy="9" r="1.7" fill={light} transform={'rotate(' + (index*30+rotation) + ' 50 50)'}/>)}
        <circle cx="50" cy="50" r="31" fill={base} fillOpacity=".92" stroke={light} strokeWidth="2.4"/>
        <circle cx="50" cy="50" r="26" fill="none" stroke={accent} strokeWidth="1.2" strokeDasharray="2 3" transform={'rotate(' + rotation + ' 50 50)'}/>
        <Emblem category={category} light={light}/>
        <path d="M19 50q-8 0-8-7M81 50q8 0 8-7" fill="none" stroke={light} strokeWidth="2" strokeLinecap="round"/>
        <circle cx="50" cy="50" r="2.2" fill={light}/>
      </svg>
    </span>
  );
}
