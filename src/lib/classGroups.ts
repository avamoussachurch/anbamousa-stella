import { 
  ClassGroup, 
  ClassGroupId, 
  CanonicalGradeId, 
  GradeItem, 
  Language, 
  MultilingualText 
} from '../types';

// ============================================================================
// CANONICAL GRADE DEFINITIONS
// ============================================================================

export const CANONICAL_GRADES: Record<CanonicalGradeId, GradeItem> = {
  kg_1: {
    id: 'kg_1',
    code: 'KG1',
    classGroupId: 'angels',
    numericLevel: 0,
    name: {
      en: 'KG1',
      ar: 'حضانة صغرى (KG1)',
      cop: 'ⲔⲄ ⲁ̅'
    },
    aliases: ['kg1', 'kg 1', 'kindergarten 1', 'حضانة 1', 'حضانة صغرى', 'كي جي 1']
  },
  kg_2: {
    id: 'kg_2',
    code: 'KG2',
    classGroupId: 'angels',
    numericLevel: 0,
    name: {
      en: 'KG2',
      ar: 'حضانة كبرى (KG2)',
      cop: 'ⲔⲄ ⲃ̅'
    },
    aliases: ['kg2', 'kg 2', 'kindergarten 2', 'حضانة 2', 'حضانة كبرى', 'كي جي 2']
  },
  grade_1: {
    id: 'grade_1',
    code: 'Grade 1',
    classGroupId: 'primary_1',
    numericLevel: 1,
    name: {
      en: 'Grade 1',
      ar: 'الصف الأول الابتدائي',
      cop: 'ϯⲧⲁⲝⲓⲥ ⲁ̅'
    },
    aliases: ['grade 1', '1st grade', 'grade 1 elementary', 'أولى ابتدائي', 'الصف الأول الابتدائي', '1 ابتدائي']
  },
  grade_2: {
    id: 'grade_2',
    code: 'Grade 2',
    classGroupId: 'primary_1',
    numericLevel: 2,
    name: {
      en: 'Grade 2',
      ar: 'الصف الثاني الابتدائي',
      cop: 'ϯⲧⲁⲝⲓⲥ ⲃ̅'
    },
    aliases: ['grade 2', '2nd grade', 'grade 2 elementary', 'تانية ابتدائي', 'الصف الثاني الابتدائي', '2 ابتدائي']
  },
  grade_3: {
    id: 'grade_3',
    code: 'Grade 3',
    classGroupId: 'primary_1',
    numericLevel: 3,
    name: {
      en: 'Grade 3',
      ar: 'الصف الثالث الابتدائي',
      cop: 'ϯⲧⲁⲝⲓⲥ ⲅ̅'
    },
    aliases: ['grade 3', '3rd grade', 'grade 3 elementary', 'تالتة ابتدائي', 'الصف الثالث الابتدائي', '3 ابتدائي']
  },
  grade_4: {
    id: 'grade_4',
    code: 'Grade 4',
    classGroupId: 'primary_2',
    numericLevel: 4,
    name: {
      en: 'Grade 4',
      ar: 'الصف الرابع الابتدائي',
      cop: 'ϯⲧⲁⲝⲓⲥ ⲇ̅'
    },
    aliases: [
      'grade 4', 
      '4th grade', 
      '4th grade elementary', 
      'رابعة ابتدائي', 
      'الصف الرابع الابتدائي', 
      'الصف الرابع', 
      '4 ابتدائي',
      'الابتدائي - المرحلة الثالثة' // Legacy mock auth string
    ]
  },
  grade_5: {
    id: 'grade_5',
    code: 'Grade 5',
    classGroupId: 'primary_2',
    numericLevel: 5,
    name: {
      en: 'Grade 5',
      ar: 'الصف الخامس الابتدائي',
      cop: 'ϯⲧⲁⲝⲓⲥ ⲉ̅'
    },
    aliases: ['grade 5', '5th grade', 'grade 5 elementary', 'خامسة ابتدائي', 'الصف الخامس الابتدائي', 'الصف الخامس', '5 ابتدائي']
  },
  grade_6: {
    id: 'grade_6',
    code: 'Grade 6',
    classGroupId: 'primary_2',
    numericLevel: 6,
    name: {
      en: 'Grade 6',
      ar: 'الصف السادس الابتدائي',
      cop: 'ϯⲧⲁⲝⲓⲥ ⲋ̅'
    },
    aliases: ['grade 6', '6th grade', 'grade 6 elementary', 'ساتة ابتدائي', 'الصف السادس الابتدائي', 'الصف السادس', '6 ابتدائي']
  },
  prep_1: {
    id: 'prep_1',
    code: 'Prep 1',
    classGroupId: 'preparatory',
    numericLevel: 7,
    name: {
      en: 'Prep 1 (Grade 7)',
      ar: 'الصف الأول الإعدادي',
      cop: 'ϯⲥⲟⲃϯ ⲁ̅'
    },
    aliases: ['prep 1', 'grade 7', '7th grade', 'أولى إعدادي', 'الصف الأول الإعدادي', '1 إعدادي', 'preparatory 1']
  },
  prep_2: {
    id: 'prep_2',
    code: 'Prep 2',
    classGroupId: 'preparatory',
    numericLevel: 8,
    name: {
      en: 'Prep 2 (Grade 8)',
      ar: 'الصف الثاني الإعدادي',
      cop: 'ϯⲥⲟⲃϯ ⲃ̅'
    },
    aliases: ['prep 2', 'grade 8', '8th grade', 'تانية إعدادي', 'الصف الثاني الإعدادي', '2 إعدادي', 'preparatory 2']
  },
  prep_3: {
    id: 'prep_3',
    code: 'Prep 3',
    classGroupId: 'preparatory',
    numericLevel: 9,
    name: {
      en: 'Prep 3 (Grade 9)',
      ar: 'الصف الثالث الإعدادي',
      cop: 'ϯⲥⲟⲃϯ ⲅ̅'
    },
    aliases: ['prep 3', 'grade 9', '9th grade', 'تالتة إعدادي', 'الصف الثالث الإعدادي', '3 إعدادي', 'preparatory 3']
  },
  sec_1: {
    id: 'sec_1',
    code: 'Secondary 1',
    classGroupId: 'secondary',
    numericLevel: 10,
    name: {
      en: 'Secondary 1 (Grade 10)',
      ar: 'الصف الأول الثانوي',
      cop: 'ϯⲙⲁϩⲥⲛⲟⲩϯ ⲁ̅'
    },
    aliases: ['secondary 1', 'sec 1', 'grade 10', '10th grade', 'أولى ثانوي', 'الصف الأول الثانوي', '1 ثانوي']
  },
  sec_2: {
    id: 'sec_2',
    code: 'Secondary 2',
    classGroupId: 'secondary',
    numericLevel: 11,
    name: {
      en: 'Secondary 2 (Grade 11)',
      ar: 'الصف الثاني الثانوي',
      cop: 'ϯⲙⲁϩⲥⲛⲟⲩϯ ⲃ̅'
    },
    aliases: ['secondary 2', 'sec 2', 'grade 11', '11th grade', 'تانية ثانوي', 'الصف الثاني الثانوي', '2 ثانوي']
  },
  sec_3: {
    id: 'sec_3',
    code: 'Secondary 3',
    classGroupId: 'secondary',
    numericLevel: 12,
    name: {
      en: 'Secondary 3 (Grade 12)',
      ar: 'الصف الثالث الثانوي',
      cop: 'ϯⲙⲁϩⲥⲛⲟⲩϯ ⲅ̅'
    },
    aliases: ['secondary 3', 'sec 3', 'grade 12', '12th grade', 'تالتة ثانوي', 'الصف الثالث الثانوي', '3 ثانوي']
  },
  university: {
    id: 'university',
    code: 'University',
    classGroupId: 'university',
    numericLevel: 13,
    name: {
      en: 'University',
      ar: 'المرحلة الجامعية',
      cop: 'Ⲡⲓⲡⲁⲛⲉⲡⲓⲥⲧⲏⲙⲓⲟⲛ'
    },
    aliases: ['university', 'college', 'جامعة', 'جامعي', 'المرحلة الجامعية', 'شباب جامعة']
  }
};

export const CANONICAL_GRADE_LIST: GradeItem[] = Object.values(CANONICAL_GRADES);

// ============================================================================
// CENTRALIZED CLASS GROUPS DEFINITION
// ============================================================================

export const CLASS_GROUPS: Record<ClassGroupId, ClassGroup> = {
  angels: {
    id: 'angels',
    order: 1,
    name: {
      en: 'Angels',
      ar: 'فصل الملايكة',
      cop: 'Ⲛⲓⲁⲅⲅⲉⲗⲟⲥ'
    },
    description: {
      en: 'Kindergarten 1 & 2',
      ar: 'مرحلة حضانة صغرى وكبرى (KG1 & KG2)',
      cop: 'ⲔⲄ ⲁ̅ ⲛⲉⲙ ⲔⲄ ⲃ̅'
    },
    grades: [CANONICAL_GRADES.kg_1, CANONICAL_GRADES.kg_2],
    icon: '👼'
  },
  primary_1: {
    id: 'primary_1',
    order: 2,
    name: {
      en: 'Primary 1–3',
      ar: 'فصل ابتدائي 1–3',
      cop: 'ϯⲧⲁⲝⲓⲥ ⲁ̅-ⲅ̅'
    },
    description: {
      en: 'Grades 1 to 3',
      ar: 'المرحلة الابتدائية الأولى (الصف الأول إلى الثالث)',
      cop: 'Ⲛⲓⲧⲁⲝⲓⲥ ⲁ̅-ⲅ̅'
    },
    grades: [CANONICAL_GRADES.grade_1, CANONICAL_GRADES.grade_2, CANONICAL_GRADES.grade_3],
    icon: '🛡️'
  },
  primary_2: {
    id: 'primary_2',
    order: 3,
    name: {
      en: 'Primary 4–6',
      ar: 'فصل ابتدائي 4–6',
      cop: 'ϯⲧⲁⲝⲓⲥ ⲇ̅-ⲋ̅'
    },
    description: {
      en: 'Grades 4 to 6',
      ar: 'المرحلة الابتدائية الثانية (الصف الرابع إلى السادس)',
      cop: 'Ⲛⲓⲧⲁⲝⲓⲥ ⲇ̅-ⲋ̅'
    },
    grades: [CANONICAL_GRADES.grade_4, CANONICAL_GRADES.grade_5, CANONICAL_GRADES.grade_6],
    icon: '⛪'
  },
  preparatory: {
    id: 'preparatory',
    order: 4,
    name: {
      en: 'Preparatory',
      ar: 'فصل إعدادي',
      cop: 'ϯⲧⲁⲝⲓⲥ ⲛ̀ⲥⲟⲃϯ'
    },
    description: {
      en: 'Prep 1 to 3 (Grades 7 to 9)',
      ar: 'المرحلة الإعدادية (أولى إلى تالتة إعدادي)',
      cop: 'Ⲛⲓⲥⲟⲃϯ ⲁ̅-ⲅ̅'
    },
    grades: [CANONICAL_GRADES.prep_1, CANONICAL_GRADES.prep_2, CANONICAL_GRADES.prep_3],
    icon: '🕯️'
  },
  secondary: {
    id: 'secondary',
    order: 5,
    name: {
      en: 'Secondary',
      ar: 'فصل ثانوي',
      cop: 'ϯⲧⲁⲝⲓⲥ ⲙ̀ⲙⲁϩⲥⲛⲟⲩϯ'
    },
    description: {
      en: 'Secondary 1 to 3 (Grades 10 to 12)',
      ar: 'المرحلة الثانوية (أولى إلى تالتة ثانوي)',
      cop: 'Ⲛⲓⲙⲁϩⲥⲛⲟⲩϯ ⲁ̅-ⲅ̅'
    },
    grades: [CANONICAL_GRADES.sec_1, CANONICAL_GRADES.sec_2, CANONICAL_GRADES.sec_3],
    icon: '📜'
  },
  university: {
    id: 'university',
    order: 6,
    name: {
      en: 'University',
      ar: 'فصل جامعة',
      cop: 'Ⲡⲓⲡⲁⲛⲉⲡⲓⲥⲧⲏⲙⲓⲟⲛ'
    },
    description: {
      en: 'University & College Youth',
      ar: 'مرحلة الشباب والتعليم الجامعي',
      cop: 'Ⲛⲓϧⲉⲗϣⲓⲣⲓ ⲙ̀ⲡⲁⲛⲉⲡⲓⲥⲧⲏⲙⲓⲟⲛ'
    },
    grades: [CANONICAL_GRADES.university],
    icon: '🎓'
  }
};

export const CLASS_GROUP_LIST: ClassGroup[] = [
  CLASS_GROUPS.angels,
  CLASS_GROUPS.primary_1,
  CLASS_GROUPS.primary_2,
  CLASS_GROUPS.preparatory,
  CLASS_GROUPS.secondary,
  CLASS_GROUPS.university
];

// ============================================================================
// GRADE RESOLUTION & MAPPING UTILITIES
// ============================================================================

/**
 * Normalizes input string for robust matching across Arabic diacritics,
 * English casing, numerals, and whitespace.
 */
function normalizeGradeQuery(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove Arabic tashkeel
    .replace(/[أإآء]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/١/g, '1')
    .replace(/٢/g, '2')
    .replace(/٣/g, '3')
    .replace(/٤/g, '4')
    .replace(/٥/g, '5')
    .replace(/٦/g, '6')
    .replace(/٧/g, '7')
    .replace(/٨/g, '8')
    .replace(/٩/g, '9')
    .replace(/٠/g, '0')
    .replace(/[\-‐‑‒–—_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves a raw grade string (from DB, user profile, or UI) to its canonical GradeItem.
 * Returns null if no match can be established.
 */
export function findCanonicalGrade(rawGrade?: string | null): GradeItem | null {
  if (!rawGrade || !rawGrade.trim()) {
    return null;
  }

  const query = normalizeGradeQuery(rawGrade);

  // 1. Direct match on code or id
  for (const grade of CANONICAL_GRADE_LIST) {
    if (grade.id.toLowerCase() === query || grade.code.toLowerCase() === query) {
      return grade;
    }
  }

  // 2. Direct match against alias list
  for (const grade of CANONICAL_GRADE_LIST) {
    for (const alias of grade.aliases) {
      if (normalizeGradeQuery(alias) === query) {
        return grade;
      }
    }
  }

  // 3. Substring matching with stage context
  const isKindergarten = query.includes('kg') || query.includes('حضانه') || query.includes('kindergarten') || query.includes('كي جي');
  const isPrep = query.includes('prep') || query.includes('اعداد') || query.includes('preparatory');
  const isSecondary = query.includes('sec') || query.includes('ثانو') || query.includes('secondary') || query.includes('high school');
  const isUniversity = query.includes('univ') || query.includes('جامع') || query.includes('college') || query.includes('youth');

  if (isUniversity) {
    return CANONICAL_GRADES.university;
  }

  if (isKindergarten) {
    if (query.includes('2') || query.includes('كبري') || query.includes('كبير')) {
      return CANONICAL_GRADES.kg_2;
    }
    return CANONICAL_GRADES.kg_1;
  }

  if (isPrep) {
    if (query.includes('1') || query.includes('اول')) return CANONICAL_GRADES.prep_1;
    if (query.includes('2') || query.includes('تان')) return CANONICAL_GRADES.prep_2;
    if (query.includes('3') || query.includes('تالت')) return CANONICAL_GRADES.prep_3;
    return CANONICAL_GRADES.prep_1;
  }

  if (isSecondary) {
    if (query.includes('1') || query.includes('اول')) return CANONICAL_GRADES.sec_1;
    if (query.includes('2') || query.includes('تان')) return CANONICAL_GRADES.sec_2;
    if (query.includes('3') || query.includes('تالت')) return CANONICAL_GRADES.sec_3;
    return CANONICAL_GRADES.sec_1;
  }

  // Numerical extraction for standard grade representations (e.g. "Grade 4", "4th Grade Elementary")
  // Accept ordinal grade labels and ranges such as "5th-6th Grade".
  // Both endpoints in a normal school-grade range belong to the same class group.
  const numMatch = query.match(/(?:^|\D)([0-9]{1,2})(?:st|nd|rd|th)?(?=\D|$)/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    switch (num) {
      case 1: return CANONICAL_GRADES.grade_1;
      case 2: return CANONICAL_GRADES.grade_2;
      case 3: return CANONICAL_GRADES.grade_3;
      case 4: return CANONICAL_GRADES.grade_4;
      case 5: return CANONICAL_GRADES.grade_5;
      case 6: return CANONICAL_GRADES.grade_6;
      case 7: return CANONICAL_GRADES.prep_1;
      case 8: return CANONICAL_GRADES.prep_2;
      case 9: return CANONICAL_GRADES.prep_3;
      case 10: return CANONICAL_GRADES.sec_1;
      case 11: return CANONICAL_GRADES.sec_2;
      case 12: return CANONICAL_GRADES.sec_3;
      default: break;
    }
  }

  // Word matching for Arabic primary grades
  if (query.includes('اول') || query.includes('1')) return CANONICAL_GRADES.grade_1;
  if (query.includes('تان') || query.includes('2')) return CANONICAL_GRADES.grade_2;
  if (query.includes('تالت') || query.includes('3')) return CANONICAL_GRADES.grade_3;
  if (query.includes('رابع') || query.includes('4')) return CANONICAL_GRADES.grade_4;
  if (query.includes('خامس') || query.includes('5')) return CANONICAL_GRADES.grade_5;
  if (query.includes('سادس') || query.includes('سات') || query.includes('6')) return CANONICAL_GRADES.grade_6;

  return null;
}

/**
 * 2. getClassGroupForGrade(grade)
 * 
 * Maps any grade identifier or raw stored grade string to exactly one of the 6 Church Class Groups:
 * - KG1, KG2              -> Angels
 * - Grade 1-3             -> Primary 1
 * - Grade 4-6             -> Primary 2
 * - Grade 7-9 (Prep 1-3)  -> Preparatory
 * - Grade 10-12 (Sec 1-3) -> Secondary
 * - University            -> University
 * 
 * Defaults gracefully to 'Primary 2' (the project's standard 4th-grade baseline) if unresolvable.
 */
function findClassGroupIdentifier(rawGrade?: string | null): ClassGroup | null {
  if (!rawGrade || !rawGrade.trim()) return null;

  // Database records may already contain a class-group ID (or a church-year
  // class-instance ID ending in one). Resolve these before parsing grade numbers:
  // "primary_2" must never be interpreted as "grade 2".
  const raw = rawGrade.trim().toLowerCase();
  const directId = raw.match(/^(angels|primary_1|primary_2|preparatory|secondary|university)$/);
  const instanceId = raw.match(/(?:^|_)(angels|primary_1|primary_2|preparatory|secondary|university)$/);
  const groupId = directId?.[1] || instanceId?.[1];

  if (groupId && Object.prototype.hasOwnProperty.call(CLASS_GROUPS, groupId)) {
    return CLASS_GROUPS[groupId as ClassGroupId];
  }

  const canonical = findCanonicalGrade(rawGrade);
  return canonical ? CLASS_GROUPS[canonical.classGroupId] : null;
}

export function getClassGroupForGrade(grade?: string | null): ClassGroup {
  return findClassGroupIdentifier(grade) || CLASS_GROUPS.primary_2;
}

/**
 * Safe version of getClassGroupForGrade that returns null if grade is completely unrecognized.
 */
export function findClassGroupForGrade(grade?: string | null): ClassGroup | null {
  return findClassGroupIdentifier(grade);
}

/**
 * Retrieves a ClassGroup directly by its stable internal ID.
 */
export function getClassGroupById(id: ClassGroupId): ClassGroup {
  return CLASS_GROUPS[id] || CLASS_GROUPS.primary_2;
}

// ============================================================================
// TRILINGUAL DISPLAY HELPERS (EN, AR, COP)
// ============================================================================

/**
 * Returns localized string from a MultilingualText object based on current Language.
 */
export function getLocalizedText(text: MultilingualText, lang: Language): string {
  if (lang === 'cop' || lang === 'copt') {
    return text.cop || text.ar || text.en;
  }
  if (lang === 'ar') {
    return text.ar || text.en;
  }
  return text.en;
}

/**
 * Returns localized display label for a class group.
 */
export function getClassGroupLabel(
  groupOrId: ClassGroup | ClassGroupId, 
  lang: Language = 'en'
): string {
  const group = typeof groupOrId === 'string' ? getClassGroupById(groupOrId) : groupOrId;
  return getLocalizedText(group.name, lang);
}

/**
 * Returns localized display label for a specific grade.
 */
export function getGradeLabel(
  gradeRaw: string, 
  lang: Language = 'en'
): string {
  const canonical = findCanonicalGrade(gradeRaw);
  if (canonical) {
    return getLocalizedText(canonical.name, lang);
  }
  return gradeRaw || '';
}

/**
 * UI composite helper: Returns structured labels for displaying Class Group, Grade,
 * and localized compound tags without duplicating mapping logic in UI components.
 */
export function formatStudentClassDisplay(
  gradeRaw?: string | null, 
  lang: Language = 'en'
): {
  classGroupId: ClassGroupId;
  classGroupName: string;
  gradeName: string;
  fullDisplay: string;
  icon: string;
} {
  const group = getClassGroupForGrade(gradeRaw);
  const canonical = findCanonicalGrade(gradeRaw);

  const classGroupName = getClassGroupLabel(group, lang);
  const gradeName = canonical 
    ? getLocalizedText(canonical.name, lang) 
    : (gradeRaw || classGroupName);

  const fullDisplay = lang === 'cop' || lang === 'copt'
    ? `${classGroupName} • ${gradeName}`
    : lang === 'ar'
      ? `${classGroupName} (${gradeName})`
      : `${classGroupName} - ${gradeName}`;

  return {
    classGroupId: group.id,
    classGroupName,
    gradeName,
    fullDisplay,
    icon: group.icon
  };
}

/**
 * Calculates the next canonical grade for yearly promotion.
 * Handles class-group transitions (e.g. Primary 3 -> Primary 4 changes group to Primary 4–6).
 */
export function getNextGrade(gradeRaw?: string | null): {
  nextGrade: GradeItem | null;
  nextClassGroupId: ClassGroupId | null;
  isGraduated: boolean;
  explanation: string;
} {
  const canonical = findCanonicalGrade(gradeRaw);
  if (!canonical) {
    return {
      nextGrade: null,
      nextClassGroupId: null,
      isGraduated: false,
      explanation: 'Unrecognized grade'
    };
  }

  const ladder: Record<CanonicalGradeId, CanonicalGradeId | 'graduated'> = {
    kg_1: 'kg_2',
    kg_2: 'grade_1',
    grade_1: 'grade_2',
    grade_2: 'grade_3',
    grade_3: 'grade_4',
    grade_4: 'grade_5',
    grade_5: 'grade_6',
    grade_6: 'prep_1',
    prep_1: 'prep_2',
    prep_2: 'prep_3',
    prep_3: 'sec_1',
    sec_1: 'sec_2',
    sec_2: 'sec_3',
    sec_3: 'university',
    university: 'graduated'
  };

  const nextId = ladder[canonical.id];
  if (nextId === 'graduated') {
    return {
      nextGrade: canonical, // stays in university / graduated
      nextClassGroupId: 'university',
      isGraduated: true,
      explanation: 'Student has completed Sunday School curriculum (University/Graduate)'
    };
  }

  const nextItem = CANONICAL_GRADES[nextId];
  return {
    nextGrade: nextItem,
    nextClassGroupId: nextItem.classGroupId,
    isGraduated: false,
    explanation: `Promoted from ${canonical.code} to ${nextItem.code}`
  };
}

// ============================================================================
// HYMNS SCHOOL CLASS LEVELS (مدرسة الشمامسة والألحان)
// Explicit verified 3-level canonical mapping from Sunday School grades
// Level 1: Angels & Primary 1–3
// Level 2: Primary 4–6
// Level 3: Preparatory, Secondary & University
// ============================================================================

export type HymnLevelId = 'level_1' | 'level_2' | 'level_3';

export interface HymnLevelInfo {
  id: HymnLevelId;
  numericLevel: number;
  nameEn: string;
  nameAr: string;
  stageEn: string;
  stageAr: string;
  classGroupIds: ClassGroupId[];
}

export const HYMN_LEVELS: Record<HymnLevelId, HymnLevelInfo> = {
  level_1: {
    id: 'level_1',
    numericLevel: 1,
    nameEn: 'Level 1',
    nameAr: 'مستوى أول',
    stageEn: 'Angels & Primary 1–3',
    stageAr: 'حضانة وابتدائي صغرى (١-٣)',
    classGroupIds: ['angels', 'primary_1']
  },
  level_2: {
    id: 'level_2',
    numericLevel: 2,
    nameEn: 'Level 2',
    nameAr: 'مستوى ثاني',
    stageEn: 'Primary 4–6',
    stageAr: 'ابتدائي كبرى (٤-٦)',
    classGroupIds: ['primary_2']
  },
  level_3: {
    id: 'level_3',
    numericLevel: 3,
    nameEn: 'Level 3',
    nameAr: 'مستوى ثالث',
    stageEn: 'Preparatory, Secondary & University',
    stageAr: 'إعدادي وثانوي وجامعة',
    classGroupIds: ['preparatory', 'secondary', 'university']
  }
};

export function getHymnLevelForStudent(gradeRaw?: string | null, classGroupId?: ClassGroupId | null): HymnLevelInfo {
  if (classGroupId) {
    if (classGroupId === 'angels' || classGroupId === 'primary_1') return HYMN_LEVELS.level_1;
    if (classGroupId === 'primary_2') return HYMN_LEVELS.level_2;
    return HYMN_LEVELS.level_3;
  }
  const canonical = findCanonicalGrade(gradeRaw);
  if (canonical) {
    if (canonical.classGroupId === 'angels' || canonical.classGroupId === 'primary_1') return HYMN_LEVELS.level_1;
    if (canonical.classGroupId === 'primary_2') return HYMN_LEVELS.level_2;
    return HYMN_LEVELS.level_3;
  }
  return HYMN_LEVELS.level_2; // default
}


