// Curated high-resolution Coptic Orthodox avatars for Sunday School students, parents, and teachers
export interface CopticAvatarPreset {
  id: string;
  nameEn: string;
  nameAr: string;
  category: 'saints' | 'students' | 'deacons';
  svgDataUri: string;
}

// Generate sharp, beautiful SVG data URIs with rich gradients, halos, and Coptic motifs
function createSvgAvatar(bgGradient: [string, string], haloColor: string, iconEmoji: string, accessoryEmoji: string, crossColor: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" shape-rendering="crispEdges">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bgGradient[0]}"/><stop offset="1" stop-color="${bgGradient[1]}"/></linearGradient>
      <radialGradient id="light"><stop offset="0" stop-color="${haloColor}" stop-opacity=".8"/><stop offset="1" stop-color="${haloColor}" stop-opacity="0"/></radialGradient>
      <pattern id="tiles" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 6H12M6 0V12" stroke="#fff" stroke-opacity=".07" stroke-width="1"/></pattern>
    </defs>
    <rect x="3" y="3" width="114" height="114" rx="25" fill="url(#bg)" stroke="${crossColor}" stroke-width="4"/>
    <rect x="9" y="9" width="102" height="102" rx="19" fill="url(#tiles)"/>
    <path d="M18 94V54a42 42 0 0 1 84 0v40" fill="none" stroke="${crossColor}" stroke-opacity=".28" stroke-width="5"/>
    <circle cx="60" cy="43" r="33" fill="url(#light)"/>
    <circle cx="60" cy="39" r="25" fill="none" stroke="${haloColor}" stroke-width="3" stroke-opacity=".9"/>
    <circle cx="60" cy="39" r="20" fill="#f4d7ad" stroke="#553c35" stroke-width="3"/>
    <path d="M39 37Q37 14 60 15Q83 14 81 39L75 31 69 27 60 30 49 26Z" fill="#352b2b" stroke="#241f25" stroke-width="3"/>
    <rect x="47" y="39" width="5" height="5" fill="#342b2a"/><rect x="68" y="39" width="5" height="5" fill="#342b2a"/>
    <path d="M54 51Q60 56 66 51" fill="none" stroke="#9d5548" stroke-width="3" stroke-linecap="square"/>
    <path d="M28 106Q31 68 49 64L60 72 71 64Q89 68 92 106Z" fill="${crossColor}" stroke="#292b31" stroke-width="4"/>
    <path d="M49 65L60 78 71 65" fill="#f7ead3" stroke="#292b31" stroke-width="3"/>
    <path d="M60 79V99M53 86H67" stroke="#f8df9b" stroke-width="4" stroke-linecap="square"/>
    <rect x="9" y="9" width="20" height="20" rx="5" fill="#fff" fill-opacity=".92" stroke="${crossColor}" stroke-width="2"/>
    <text x="19" y="24" text-anchor="middle" font-size="13">${iconEmoji}</text>
    <rect x="82" y="82" width="28" height="28" rx="8" fill="#fff" stroke="${crossColor}" stroke-width="3"/>
    <text x="96" y="102" text-anchor="middle" font-size="16">${accessoryEmoji}</text>
    <path d="M60 5v9m-5-5h10" stroke="${crossColor}" stroke-width="3" stroke-linecap="square"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const COPTIC_AVATARS: CopticAvatarPreset[] = [
  {
    id: 'st-mark',
    nameEn: 'St. Mark the Apostle',
    nameAr: 'مارمرقس الرسول كاروز الديار المصرية',
    category: 'saints',
    svgDataUri: createSvgAvatar(['#881337', '#4c0519'], '#fbbf24', '🦁', '📜', '#f59e0b')
  },
  {
    id: 'st-george',
    nameEn: 'St. George the Prince of Martyrs',
    nameAr: 'الشهيد العظيم مارجرجس الروماني',
    category: 'saints',
    svgDataUri: createSvgAvatar(['#1e3a8a', '#172554'], '#fde047', '⚔️', '🐎', '#fbbf24')
  },
  {
    id: 'st-demiana',
    nameEn: 'St. Demiana and the 40 Virgins',
    nameAr: 'القديسة العفيفة دميانة',
    category: 'saints',
    svgDataUri: createSvgAvatar(['#831843', '#500724'], '#fbcfe8', '👑', '🕊️', '#f472b6')
  },
  {
    id: 'archangel-michael',
    nameEn: 'Archangel Michael',
    nameAr: 'رئيس الملائكة الجليل ميخائيل',
    category: 'saints',
    svgDataUri: createSvgAvatar(['#0f766e', '#134e4a'], '#fef08a', '🪽', '⚖️', '#2dd4bf')
  },
  {
    id: 'virgin-mary',
    nameEn: 'The Holy Virgin Mary (Theotokos)',
    nameAr: 'أم النور القديسة مريم العذراء',
    category: 'saints',
    svgDataUri: createSvgAvatar(['#1d4ed8', '#1e1b4b'], '#fef9c3', '✨', '🌹', '#60a5fa')
  },
  {
    id: 'st-philopateer',
    nameEn: 'St. Philopateer Abu Seifein',
    nameAr: 'الشهيد فيلوباتير مرقوريوس (أبو سيفين)',
    category: 'saints',
    svgDataUri: createSvgAvatar(['#701a75', '#4a044e'], '#fef08a', '🛡️', '🗡️', '#e879f9')
  },
  {
    id: 'st-mina',
    nameEn: 'St. Mina the Wonderworker',
    nameAr: 'الشهيد مارمينا العجائبي',
    category: 'saints',
    svgDataUri: createSvgAvatar(['#9a3412', '#431407'], '#fed7aa', '🐪', '🌿', '#fb923c')
  },
  {
    id: 'deacon-boy',
    nameEn: 'Coptic Deacon in Tunic',
    nameAr: 'شماس قبطي بالتونية والبطرشيل',
    category: 'deacons',
    svgDataUri: createSvgAvatar(['#0369a1', '#082f49'], '#fed7aa', '👦', '✝️', '#38bdf8')
  },
  {
    id: 'sunday-school-boy',
    nameEn: 'Sunday School Student (Boy)',
    nameAr: 'فتى مدارس الأحد مبتسم بالصليب',
    category: 'students',
    svgDataUri: createSvgAvatar(['#047857', '#064e3b'], '#a7f3d0', '👦', '📖', '#34d399')
  },
  {
    id: 'sunday-school-girl',
    nameEn: 'Sunday School Student (Girl)',
    nameAr: 'فتاة مدارس الأحد بالضفائر والصليب',
    category: 'students',
    svgDataUri: createSvgAvatar(['#b45309', '#78350f'], '#fef3c7', '👧', '🌸', '#f59e0b')
  },
  {
    id: 'david-shepherd',
    nameEn: 'Young David the Psalmist',
    nameAr: 'داود الراعي المرنم الصغير',
    category: 'saints',
    svgDataUri: createSvgAvatar(['#4d7c0f', '#1a2e05'], '#ecfccb', '🎶', '🐑', '#84cc16')
  },
  {
    id: 'coptic-cross-dove',
    nameEn: 'Holy Cross & Peaceful Dove',
    nameAr: 'الصليب القبطي وحمامة الروح القدس',
    category: 'saints',
    svgDataUri: createSvgAvatar(['#6b21a8', '#3b0764'], '#f3e8ff', '☩', '🕊️', '#c084fc')
  }
];

export const DEFAULT_STUDENT_AVATAR = COPTIC_AVATARS[7].svgDataUri; // Deacon Boy
export const DEFAULT_PARENT_AVATAR = COPTIC_AVATARS[0].svgDataUri; // St. Mark
export const DEFAULT_TEACHER_AVATAR = COPTIC_AVATARS[3].svgDataUri; // Archangel Michael
