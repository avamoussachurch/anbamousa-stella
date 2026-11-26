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

const SYMBOL_BY_KEY: Record<string, string> = {
  'present-heart':'heart-calendar','attendance-ten':'calendar-check','attendance-twenty-five':'church-crown',
  'community-light':'speech-spark','kind-reaction':'heart-spark','community-voice':'voice-wave','community-heart':'heart-crown',
  'poll-participant':'ballot','poll-regular':'ballot-check','event-supporter':'calendar-flag','event-regular':'calendar-heart',
  'profile-stylist':'palette','cosmetic-collector':'jewel-crown','first-follow':'linked-hearts','community-connector':'community-nodes',
  'first-bookmark':'bookmark','bookmark-keeper':'open-bookmark',
  'steady-learner':'book-path','learning-regular':'calendar-book','learning-devotee':'graduation',
  'first-hymn':'music-note','hymn-explorer':'lyre','hymn-heart':'heart-note','hymn-devotee':'music-staff','hymn-master':'lyre-crown',
  'first-steps':'footsteps','curious-mind':'compass','lesson-legend':'scroll-star','faithful-finisher':'scroll-check',
  'knowledge-builder':'book-stack','memory-keeper':'bookmark-brain','lesson-scout':'compass-lantern','lesson-master':'open-book-star',
  'prayer-beginning':'prayer-heart','prayer-seven':'prayer-calendar','prayer-thirty':'church-rays','prayer-steadfast':'cross-rays',
  'quiz-spark':'brain-spark','quiz-champion':'trophy','quiz-pro':'laurel-trophy','class-helper':'hand-heart',
  'taxis-starter':'ritual-scroll','taxis-scholar':'book-cross','taxis-practitioner':'censer','taxis-journey':'church-path',
  'badge-prayer-flame':'prayer-heart','badge-hymn-wreath':'lyre-crown','badge-cross-shield':'cross-rays',
  'badge-gospel-light':'open-book-star','badge-servant-heart':'hand-heart','badge-cross-victory':'church-crown'
};

function Emblem({ category, light, designKey }: { category: CopticAchievementCategory; light: string; designKey: string }) {
  const stroke = light;
  const symbol = SYMBOL_BY_KEY[designKey] || category;
  const line = { fill: 'none', stroke, strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (symbol) {
    case 'heart-calendar': return <g {...line}><rect x="30" y="29" width="40" height="42" rx="6"/><path d="M39 23v12m22-12v12M30 42h40"/><path d="M50 65c-8-6-12-10-12-15 0-6 8-8 12-2 4-6 12-4 12 2 0 5-4 9-12 15Z" fill={stroke} fillOpacity=".22"/></g>;
    case 'calendar-check': return <g {...line}><rect x="29" y="28" width="42" height="43" rx="6"/><path d="M39 22v12m22-12v12M29 42h42m-30 14 7 7 16-17"/></g>;
    case 'church-crown': return <g {...line}><path d="M28 70V42l22-17 22 17v28H28Z"/><path d="M43 70V53h14v17M50 11l5 8 9 1-7 7 2 9-9-5-9 5 2-9-7-7 9-1Z" fill={stroke} fillOpacity=".22"/></g>;
    case 'speech-spark': return <g {...line}><path d="M24 31q0-8 9-8h34q9 0 9 8v22q0 8-9 8H48L34 72v-11q-10-1-10-9Z"/><path d="M39 39h23M39 48h15M75 18l3 6 7 2-7 3-3 6-3-6-7-3 7-2Z" fill={stroke} fillOpacity=".3"/></g>;
    case 'heart-spark': case 'heart-crown': case 'heart-note': case 'linked-hearts':
      return <g {...line}><path d="M50 72C34 59 25 50 25 39c0-12 15-17 25-4 10-13 25-8 25 4 0 11-9 20-25 33Z" fill={stroke} fillOpacity=".18"/>{symbol==='heart-note'?<path d="M60 23v25q-4-4-10-1-8 5 0 10 11 3 11-8V31l9-3"/>:symbol==='linked-hearts'?<path d="M18 47c0-8 11-12 17-3 6-9 17-5 17 3 0 7-6 13-17 22-11-9-17-15-17-22Zm30-9c0-8 11-12 17-3 6-9 17-5 17 3 0 7-6 13-17 22-6-5-10-9-13-13"/>:symbol==='heart-crown'?<path d="m32 29 8 9 10-13 10 13 8-9-3 17H35Z" fill={stroke} fillOpacity=".35"/>:symbol==='heart-spark'?<path d="M75 18l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill={stroke}/>:null}</g>;
    case 'voice-wave': return <g {...line}>{Array.from({length:9},(_,i)=><path key={i} d={'M'+(26+i*6)+' '+(50-(i%3)*7)+'v'+(14+(i%3)*14)} strokeWidth={i%3===0?4:2.5}/>)}</g>;
    case 'ballot': case 'ballot-check': return <g {...line}><rect x="31" y="22" width="38" height="53" rx="5"/><path d="M41 35h18M41 45h18M41 55h9"/>{symbol==='ballot-check'?<path d="m48 64 6 6 14-16" strokeWidth="4"/>:<path d="M50 14v15m-7-8h14"/>}</g>;
    case 'calendar-flag': case 'calendar-heart': case 'prayer-calendar': return <g {...line}><rect x="29" y="27" width="42" height="45" rx="6"/><path d="M40 20v14m20-14v14M29 41h42"/>{symbol==='calendar-heart'?<path d="M50 65c-7-5-10-8-10-12 0-5 7-7 10-2 3-5 10-3 10 2 0 4-3 7-10 12Z" fill={stroke} fillOpacity=".25"/>:symbol==='prayer-calendar'?<><path d="M50 48v17m-7-10h14"/><circle cx="50" cy="56" r="13" strokeDasharray="2 3"/></>:<><path d="M55 24v-9l14 5-14 5"/></>}</g>;
    case 'palette': return <g {...line}><path d="M50 20c-19 0-31 12-31 28 0 16 13 29 30 29 8 0 11-5 8-10-3-5-1-9 5-9h8c9 0 12-7 9-17-4-13-15-21-29-21Z"/><circle cx="37" cy="40" r="3" fill={stroke}/><circle cx="50" cy="33" r="3" fill={stroke}/><circle cx="64" cy="40" r="3" fill={stroke}/><circle cx="38" cy="55" r="3" fill={stroke}/></g>;
    case 'jewel-crown': return <g {...line}><path d="m25 38 13-14 12 11 12-11 13 14-8 31H33Z"/><path d="m25 38 50 0M38 24l12 45 12-45" /><path d="M50 12l6 8-6 8-6-8Z" fill={stroke} fillOpacity=".35"/></g>;
    case 'community-nodes': return <g {...line}><circle cx="30" cy="50" r="9"/><circle cx="70" cy="31" r="9"/><circle cx="70" cy="69" r="9"/><path d="m39 46 22-11M39 54l22 11"/></g>;
    case 'bookmark': case 'open-bookmark': case 'bookmark-brain': return <g {...line}><path d="M34 22h32v53L50 63 34 75Z"/>{symbol==='open-bookmark'?<path d="M50 30q-10-8-21-4v31q11-4 21 4 10-8 21-4V26q-11-4-21 4Zm0 0v31"/>:symbol==='bookmark-brain'?<><path d="M43 35q-8-8-11 1-7 10 2 14-5 11 8 12m16-27q8-8 11 1 7 10-2 14 5 11-8 12"/></>:null}</g>;
    case 'book-path': case 'calendar-book': case 'book-stack': case 'open-book-star': case 'book-cross':
      return <g {...line}><path d="M50 69q-14-10-27-5V29q14-5 27 5 13-10 27-5v35q-13-5-27 5Z"/><path d="M50 34v35"/>{symbol==='book-cross'?<path d="M50 43v17m-8-9h16"/>:symbol==='open-book-star'?<path d="m50 38 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z" fill={stroke} fillOpacity=".3"/>:symbol==='book-stack'?<path d="M34 24h32M29 20h42"/>:symbol==='calendar-book'?<path d="M39 21v11m22-11v11"/>:null}</g>;
    case 'footsteps': return <g {...line}><path d="M35 31q-8 3-6 16t10 13q9 0 8-12t-12-17Z" fill={stroke} fillOpacity=".22"/><path d="M65 43q-8 3-6 16t10 13q9 0 8-12T65 43Z" fill={stroke} fillOpacity=".22"/><circle cx="31" cy="25" r="3" fill={stroke}/><circle cx="40" cy="23" r="3" fill={stroke}/><circle cx="61" cy="37" r="3" fill={stroke}/><circle cx="70" cy="36" r="3" fill={stroke}/></g>;
    case 'compass': case 'compass-lantern': return <g {...line}><circle cx="50" cy="50" r="27"/><path d="m62 35-8 21-21 9 8-21Z" fill={stroke} fillOpacity=".35"/>{symbol==='compass-lantern'?<><path d="M50 9v11m-8-6h16M50 76v15m-8-7h16"/><path d="M39 18h22l-3 10H42Z"/></>:null}</g>;
    case 'scroll-star': case 'scroll-check': case 'ritual-scroll': return <g {...line}><path d="M33 23h34v48H33q-8-7 0-14-8-7 0-14-8-8 0-20Z"/><path d="M42 37h16m-16 9h16"/>{symbol==='scroll-check'?<path d="m43 60 5 5 12-13" strokeWidth="4"/>:symbol==='scroll-star'?<path d="m60 56 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill={stroke} fillOpacity=".3"/>:null}</g>;
    case 'graduation': return <g {...line}><path d="m18 39 32-17 32 17-32 17Z" fill={stroke} fillOpacity=".2"/><path d="M32 48v17q18 14 36 0V48M82 39v22"/><circle cx="82" cy="65" r="3" fill={stroke}/></g>;
    case 'music-note': case 'music-staff': case 'lyre': case 'lyre-crown':
      return <g {...line}>{symbol==='lyre'||symbol==='lyre-crown'?<><path d="M34 27v20q0 24 16 24t16-24V27M34 27q16 15 32 0M40 36v31m7-27v31m7-31v31m7-35v31"/></>:<><path d="M59 25v34q-4-5-12-2-10 4-3 12 12 5 15-8V34l15-4"/></>}{symbol==='lyre-crown'&&<path d="m38 18 6 6 6-10 6 10 6-6 2 13H36Z" fill={stroke} fillOpacity=".35"/>}{symbol==='music-staff'&&<path d="M26 39h48M26 48h48M26 57h48" strokeWidth="1.5"/>}</g>;
    case 'prayer-heart': case 'prayer':
      return <g {...line}><path d="M50 20c-5 12-17 17-17 31a17 17 0 0 0 34 0c0-14-12-19-17-31Z" fill={stroke} fillOpacity=".16"/><path d="M50 37v24M41 46h18M39 70h22"/></g>;
    case 'church-rays': case 'church-path': return <g {...line}><path d="M28 70V42l22-18 22 18v28H28Z"/><path d="M43 70V53h14v17M50 24V11m-8 7h16"/>{symbol==='church-path'&&<path d="M18 80q12-12 24 0t24 0t24 0" strokeWidth="2"/>}{symbol==='church-rays'&&<path d="M50 5v-5M24 16l-5-5m57 5 5-5" strokeWidth="2"/>}</g>;
    case 'cross-rays': return <g {...line}><path d="M50 18v55M32 36h36" strokeWidth="5"/><path d="M50 6v8m0 66v8M19 36h8m46 0h8M28 14l6 6m32 32 6 6M72 14l-6 6m-32 32-6 6" strokeWidth="2"/></g>;
    case 'brain-spark': return <g {...line}><path d="M50 24q-13-13-20 1-12 1-8 17-8 14 8 20 0 15 16 9 4 8 10 0 16 5 16-10 13-7 4-20 5-16-8-17-7-14-20 0Z"/><path d="m50 37-6 12h10l-5 13 16-20H55l5-5Z" fill={stroke} fillOpacity=".3"/></g>;
    case 'trophy': case 'laurel-trophy': return <g {...line}><path d="M37 22h26v18q0 18-13 18T37 40Z"/><path d="M37 29H25q-2 17 15 19m23-19h12q2 17-15 19M50 58v13m-12 0h24"/>{symbol==='laurel-trophy'&&<><path d="M25 66q-12-22 2-42 0 14 10 16M75 66q12-22-2-42 0 14-10 16"/></>}</g>;
    case 'censer': return <g {...line}><path d="M50 13v25m-15-17 15 17 15-17"/><path d="M35 44q0 26 15 26t15-26Z"/><path d="M42 44q8 8 16 0M50 70v9m-7 0h14"/><path d="M40 28q-8 8 0 13m20-13q8 8 0 13" strokeWidth="2"/></g>;
    case 'hand-heart': case 'service': return <g {...line}><path d="M22 62q10-12 22-5l9 5q6 4 12 0l12-8q7-4 10 3-16 19-32 20H38q-10-4-16-15Z"/><path d="M50 48c-8-7-13-11-13-16 0-7 9-9 13-2 4-7 13-5 13 2 0 5-5 9-13 16Z" fill={stroke} fillOpacity=".2"/></g>;
    default: return <g {...line}><path d="M50 18v50m-16-34h32M36 70h28"/><circle cx="50" cy="50" r="26" strokeDasharray="2 4"/></g>;
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
        <Emblem category={category} light={light} designKey={designKey}/>
        <path d="M19 50q-8 0-8-7M81 50q8 0 8-7" fill="none" stroke={light} strokeWidth="2" strokeLinecap="round"/>
        <circle cx="50" cy="50" r="2.2" fill={light}/>
      </svg>
    </span>
  );
}
