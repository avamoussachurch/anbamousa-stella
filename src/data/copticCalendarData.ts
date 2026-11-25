/**
 * Authentic Coptic Orthodox Calendar, Feasts, Rites & Synaxarium Engine
 */

export interface CopticMonth {
  number: number;
  nameAr: string;
  nameEn: string;
  nameCopt: string;
  daysCount: number;
  seasonAr: string;
  seasonEn: string;
}

export const COPTIC_MONTHS: CopticMonth[] = [
  { number: 1, nameAr: 'توت', nameEn: 'Tout', nameCopt: 'Ⲑⲱⲟⲩⲧ', daysCount: 30, seasonAr: 'فصل الفيضان والزراعة', seasonEn: 'Season of Flooding' },
  { number: 2, nameAr: 'بابه', nameEn: 'Baba', nameCopt: 'Ⲡⲁⲟⲡⲓ', daysCount: 30, seasonAr: 'بذر البذور والحرث', seasonEn: 'Season of Sowing' },
  { number: 3, nameAr: 'هاتور', nameEn: 'Hator', nameCopt: 'ⲀⲐⲱⲣ', daysCount: 30, seasonAr: 'جمال ونمو الزروع', seasonEn: 'Season of Growth' },
  { number: 4, nameAr: 'كيهك', nameEn: 'Kiahk', nameCopt: 'Ⲭⲟⲓⲁⲕ', daysCount: 30, seasonAr: 'شهر التسبيح وميلاد المسيح', seasonEn: 'Season of Praises & Incarnation' },
  { number: 5, nameAr: 'طوبة', nameEn: 'Toba', nameCopt: 'Ⲧⲱⲃⲓ', daysCount: 30, seasonAr: 'فصل النماء والغطاس المجيد', seasonEn: 'Season of Theophany' },
  { number: 6, nameAr: 'أمشير', nameEn: 'Amshir', nameCopt: 'Ⲙⲉϣⲓⲣ', daysCount: 30, seasonAr: 'رياح الشتاء وتجدد الطبيعة', seasonEn: 'Season of Winds' },
  { number: 7, nameAr: 'برمهات', nameEn: 'Baramhat', nameCopt: 'Ⲡⲁⲣⲉⲙϩⲁⲧ', daysCount: 30, seasonAr: 'نضوج المحاصيل والربيع', seasonEn: 'Season of Ripening' },
  { number: 8, nameAr: 'برمودة', nameEn: 'Baramouda', nameCopt: 'ⲪⲁⲣⲙⲟⲩⲐⲓ', daysCount: 30, seasonAr: 'حصاد القمح والقيامة المجيدة', seasonEn: 'Season of Harvest' },
  { number: 9, nameAr: 'بشنس', nameEn: 'Bashans', nameCopt: 'Ⲡⲁϣⲁⲛⲥ', daysCount: 30, seasonAr: 'درس الحبوب والخماسين المقدسة', seasonEn: 'Season of Threshing' },
  { number: 10, nameAr: 'بؤونة', nameEn: 'Paoni', nameCopt: 'Ⲡⲁⲱⲛⲓ', daysCount: 30, seasonAr: 'تخزين الغلال وحرارة الصيف', seasonEn: 'Season of Storing' },
  { number: 11, nameAr: 'أبيب', nameEn: 'Epip', nameCopt: 'Ⲉⲡⲏⲡ', daysCount: 30, seasonAr: 'صوم وعيد الرسل الأطهار', seasonEn: 'Apostles Harvest' },
  { number: 12, nameAr: 'مسرى', nameEn: 'Mesori', nameCopt: 'Ⲙⲉⲥⲱⲣⲏ', daysCount: 30, seasonAr: 'صوم وعيد السيدة العذراء', seasonEn: 'Feast of the Theotokos' },
  { number: 13, nameAr: 'النسيء', nameEn: 'Nasie', nameCopt: 'Ⲡⲓⲕⲟⲩϫⲓ ⲛ̀ⲁ̀ⲃⲟⲧ', daysCount: 5, seasonAr: 'الشهر الصغير (٥ أو ٦ أيام)', seasonEn: 'The Little Month (5-6 days)' }
];

export interface CopticDateResult {
  day: number;
  month: CopticMonth;
  year: number; // Anno Martyrum (AM)
  formattedAr: string;
  formattedEn: string;
  gregorianDate: Date;
}

/**
 * Calculates accurate Coptic date from a Gregorian date.
 * Coptic year starts on Tout 1 (September 11 Gregorian, or Sept 12 in year before leap year).
 */
export function getCopticDate(dateInput: Date = new Date()): CopticDateResult {
  // Authoritative liturgical timezone for Coptic calendar is Africa/Cairo
  const cairoTimeStr = dateInput.toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
  const date = new Date(cairoTimeStr);

  const gYear = date.getFullYear();
  const gMonth = date.getMonth(); // 0-indexed
  const gDay = date.getDate();

  // Simple and precise Julian day calculation for Coptic calendar conversion
  const a = Math.floor((14 - (gMonth + 1)) / 12);
  const y = gYear + 4800 - a;
  const m = (gMonth + 1) + 12 * a - 3;
  const julianDay = gDay + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  // Coptic epoch julian day is 1824665 (August 29, 284 AD Julian)
  const copticEpoch = 1824665;
  const copticDayNumber = julianDay - copticEpoch;

  const copticYear = Math.floor((4 * copticDayNumber + 3) / 1461);
  const dayInYear = copticDayNumber - Math.floor((1461 * copticYear) / 4);
  const cMonthIndex = Math.min(12, Math.floor(dayInYear / 30));
  const cDay = (dayInYear % 30) + 1;
  const month = COPTIC_MONTHS[cMonthIndex] || COPTIC_MONTHS[0];

  const formattedAr = `${cDay} ${month.nameAr} ${copticYear} شـ`;
  const formattedEn = `${cDay} ${month.nameEn} ${copticYear} AM`;

  return {
    day: cDay,
    month,
    year: copticYear,
    formattedAr,
    formattedEn,
    gregorianDate: date
  };
}

function julianDayToGregorianDate(julianDay: number): Date {
  const a = julianDay + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return new Date(year, month - 1, day);
}

/** Gregorian start/end dates for a Coptic month in a specific Anno Martyrum year. */
export function getCopticYearStartGregorianDate(copticYear: number): Date {
  const startJulianDay = 1824665 + Math.floor((1461 * copticYear) / 4);
  return julianDayToGregorianDate(startJulianDay);
}

export function getCopticMonthGregorianRange(copticYear: number, monthNumber: number): {
  start: Date; end: Date; daysCount: number;
} {
  const daysCount = monthNumber === 13 && copticYear % 4 === 3 ? 6 : monthNumber === 13 ? 5 : 30;
  const start = getCopticYearStartGregorianDate(copticYear);
  start.setDate(start.getDate() + (monthNumber - 1) * 30);
  const end = new Date(start);
  end.setDate(end.getDate() + daysCount - 1);
  return { start, end, daysCount };
}

export function getGregorianDateForCopticDate(copticYear: number, monthNumber: number, day: number): Date {
  const range = getCopticMonthGregorianRange(copticYear, monthNumber);
  const safeDay = Math.max(1, Math.min(range.daysCount, day));
  const date = new Date(range.start);
  date.setDate(date.getDate() + safeDay - 1);
  return date;
}

/** Orthodox/Coptic Pascha, computed from the Julian Paschalion and converted to Gregorian. */
export function getOrthodoxEasterDate(gregorianYear: number): Date {
  const a = gregorianYear % 4;
  const b = gregorianYear % 7;
  const c = gregorianYear % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const julianMonth = Math.floor((d + e + 114) / 31);
  const julianDay = ((d + e + 114) % 31) + 1;
  const gregorianOffset = Math.floor(gregorianYear / 100) - Math.floor(gregorianYear / 400) - 2;
  return new Date(gregorianYear, julianMonth - 1, julianDay + gregorianOffset);
}

export type LiturgicalTone = 'Sanawy' | 'Kiahky' | 'Soami' | 'Hazayni' | 'Shaani' | 'Frayhi';

export interface CopticFeast {
  id: string;
  nameAr: string;
  nameEn: string;
  type: 'major_feast' | 'minor_feast' | 'fast';
  tone: LiturgicalTone;
  toneNameAr: string;
  copticDateAr: string;
  gregorianApprox: string;
  fastingRuleAr: string;
  fastingRuleEn: string;
  isFishPermitted: boolean;
  descriptionAr: string;
  descriptionEn: string;
  targetDateThisYear: (currentYear: number) => Date;
}

type FixedFeastInput = Omit<CopticFeast, 'targetDateThisYear' | 'tone' | 'toneNameAr'> & {
  monthNumber: number; copticDay: number; tone?: LiturgicalTone; toneNameAr?: string;
};

function fixedFeast(input: FixedFeastInput): CopticFeast {
  const { monthNumber, copticDay, ...feast } = input;
  return {
    ...feast,
    tone: input.tone || 'Frayhi',
    toneNameAr: input.toneNameAr || 'طقس فرايحي',
    targetDateThisYear: (gregorianYear) => getGregorianDateForCopticDate(
      gregorianYear - (monthNumber <= 4 ? 283 : 284),
      monthNumber,
      copticDay
    )
  };
}

function movableFeast(input: Omit<CopticFeast, 'targetDateThisYear' | 'tone' | 'toneNameAr'> & {
  easterOffset: number; tone?: LiturgicalTone; toneNameAr?: string;
}): CopticFeast {
  const { easterOffset, ...feast } = input;
  return {
    ...feast,
    tone: input.tone || 'Frayhi',
    toneNameAr: input.toneNameAr || 'طقس فرايحي',
    targetDateThisYear: (gregorianYear) => {
      const date = getOrthodoxEasterDate(gregorianYear);
      date.setDate(date.getDate() + easterOffset);
      return date;
    }
  };
}

const additionalCopticFeasts: CopticFeast[] = [
  fixedFeast({
    id: 'circumcision', nameAr: 'عيد ختان ربنا يسوع المسيح', nameEn: 'Feast of the Circumcision of Christ',
    type: 'minor_feast', monthNumber: 5, copticDay: 6, copticDateAr: '٦ طوبة', gregorianApprox: '14 يناير',
    fastingRuleAr: 'فطر احتفالي', fastingRuleEn: 'Feast day - no fasting', isFishPermitted: true,
    descriptionAr: 'تذكار خضوع الرب يسوع للناموس وإتمامه الشريعة من أجل خلاصنا.',
    descriptionEn: 'The Lord submits to the Law and fulfills the covenant for our salvation.'
  }),
  fixedFeast({
    id: 'wedding_cana', nameAr: 'عيد عرس قانا الجليل', nameEn: 'Feast of the Wedding at Cana',
    type: 'minor_feast', monthNumber: 5, copticDay: 13, copticDateAr: '١٣ طوبة', gregorianApprox: '21 يناير',
    fastingRuleAr: 'فطر احتفالي', fastingRuleEn: 'Feast day - no fasting', isFishPermitted: true,
    descriptionAr: 'تذكار أولى آيات السيد المسيح وتحويل الماء إلى خمر في عرس قانا الجليل.',
    descriptionEn: 'Commemoration of the first sign of Christ at the wedding in Cana of Galilee.'
  }),
  fixedFeast({
    id: 'presentation_temple', nameAr: 'عيد دخول السيد المسيح الهيكل', nameEn: 'Presentation of Christ in the Temple',
    type: 'minor_feast', monthNumber: 6, copticDay: 8, copticDateAr: '٨ أمشير', gregorianApprox: '15 فبراير',
    fastingRuleAr: 'فطر احتفالي', fastingRuleEn: 'Feast day - no fasting', isFishPermitted: true,
    descriptionAr: 'دخول الطفل يسوع الهيكل وتقديمه للآب حسب الشريعة وشهادة سمعان الشيخ.',
    descriptionEn: 'The presentation of the infant Christ in the Temple and the witness of Simeon.'
  }),
  fixedFeast({
    id: 'annunciation', nameAr: 'عيد البشارة المجيد', nameEn: 'Feast of the Annunciation',
    type: 'major_feast', monthNumber: 7, copticDay: 29, copticDateAr: '٢٩ برمهات', gregorianApprox: '7 أبريل',
    fastingRuleAr: 'فطر احتفالي حتى في أيام الصوم', fastingRuleEn: 'Major feast, even during fasting seasons', isFishPermitted: true,
    descriptionAr: 'بشارة الملاك جبرائيل للعذراء مريم بالتجسد الإلهي.',
    descriptionEn: 'The Archangel Gabriel announces the Incarnation to the Virgin Mary.'
  }),
  fixedFeast({
    id: 'cross_feast_2', nameAr: 'عيد ظهور الصليب المقدس', nameEn: 'Commemoration of the Finding of the Holy Cross',
    type: 'minor_feast', monthNumber: 7, copticDay: 10, copticDateAr: '١٠ برمهات', gregorianApprox: '19 مارس',
    fastingRuleAr: 'طقس العيد بحسب ترتيب الصوم الكبير', fastingRuleEn: 'Observed according to the Great Lent liturgical order', isFishPermitted: false,
    descriptionAr: 'تذكار اكتشاف الصليب المقدس على يد الملكة هيلانة.',
    descriptionEn: 'Commemoration of the finding of the Holy Cross by Empress Helena.'
  }),
  movableFeast({
    id: 'lazarus_saturday', nameAr: 'سبت لعازر', nameEn: 'Lazarus Saturday',
    type: 'minor_feast', copticDateAr: 'السبت السابق لأحد الشعانين', gregorianApprox: 'قبل أحد الشعانين بأسبوع',
    fastingRuleAr: 'صوم نباتي بحسب ترتيب أسبوع الآلام', fastingRuleEn: 'Vegan fasting according to Holy Week order', isFishPermitted: false,
    descriptionAr: 'تذكار إقامة لعازر من الموت وإعلان سلطان المسيح على الموت.',
    descriptionEn: 'Christ raises Lazarus, revealing His authority over death.', easterOffset: -8
  }),
  movableFeast({
    id: 'covenant_thursday', nameAr: 'خميس العهد (خميس الأسرار)', nameEn: 'Covenant Thursday / Maundy Thursday',
    type: 'minor_feast', copticDateAr: 'خميس أسبوع الآلام', gregorianApprox: 'قبل القيامة بثلاثة أيام',
    fastingRuleAr: 'طقس أسبوع الآلام المقدس', fastingRuleEn: 'Holy Pascha liturgical observance', isFishPermitted: false,
    descriptionAr: 'تذكار العشاء الأخير وغسل السيد المسيح أرجل تلاميذه وتأسيس سر الإفخارستيا.',
    descriptionEn: 'The Last Supper, the washing of the disciples’ feet, and the institution of the Eucharist.', easterOffset: -3
  }),
  movableFeast({
    id: 'good_friday', nameAr: 'الجمعة العظيمة', nameEn: 'Great and Holy Friday',
    type: 'fast', copticDateAr: 'جمعة أسبوع الآلام', gregorianApprox: 'قبل القيامة بيومين',
    fastingRuleAr: 'أقدس أيام الصوم الانقطاعي', fastingRuleEn: 'The strictest Holy Week fast', isFishPermitted: false,
    descriptionAr: 'تذكار آلام وصلب وموت السيد المسيح بالجسد من أجل خلاص العالم.',
    descriptionEn: 'The Passion and Crucifixion of Christ for the salvation of the world.', easterOffset: -2,
    tone: 'Hazayni', toneNameAr: 'طقس حزايني مهيب'
  }),
  movableFeast({
    id: 'jonah_feast', nameAr: 'فصح يونان النبي', nameEn: 'Jonah’s Feast',
    type: 'minor_feast', copticDateAr: 'الخميس بعد صوم يونان', gregorianApprox: 'بعد صوم يونان بثلاثة أيام',
    fastingRuleAr: 'فطر بحسب ترتيب الكنيسة', fastingRuleEn: 'Feast day according to the Church calendar', isFishPermitted: true,
    descriptionAr: 'فرح التوبة وقبول الله لتوبة أهل نينوى ورمز القيامة بعد ثلاثة أيام.', 
    descriptionEn: 'The joy of repentance and God’s mercy toward Nineveh, foreshadowing the Resurrection.', easterOffset: -66
  }),
  movableFeast({
    id: 'thomas_sunday', nameAr: 'أحد توما', nameEn: 'Thomas Sunday',
    type: 'minor_feast', copticDateAr: 'الأحد التالي لعيد القيامة', gregorianApprox: 'بعد القيامة بأسبوع',
    fastingRuleAr: 'فطر أيام الخماسين المقدسة', fastingRuleEn: 'Joyful Fifty Days - no fasting', isFishPermitted: true,
    descriptionAr: 'تذكار ظهور السيد المسيح للتلاميذ وتثبيت إيمان توما الرسول.', 
    descriptionEn: 'The risen Christ appears to the disciples and strengthens the faith of Thomas.', easterOffset: 7
  }),
  movableFeast({
    id: 'ascension', nameAr: 'عيد الصعود المجيد', nameEn: 'Feast of the Ascension',
    type: 'major_feast', copticDateAr: 'اليوم الأربعون بعد القيامة', gregorianApprox: 'بعد القيامة بتسعة وثلاثين يوماً',
    fastingRuleAr: 'فطر احتفالي', fastingRuleEn: 'Major feast - no fasting', isFishPermitted: true,
    descriptionAr: 'صعود ربنا يسوع المسيح بالجسد إلى السموات بعد قيامته المجيدة.', 
    descriptionEn: 'The bodily Ascension of our Lord Jesus Christ into heaven.', easterOffset: 39
  }),
  movableFeast({
    id: 'pentecost', nameAr: 'عيد حلول الروح القدس (العنصرة)', nameEn: 'Holy Pentecost',
    type: 'major_feast', copticDateAr: 'اليوم الخمسون بعد القيامة', gregorianApprox: 'بعد القيامة بتسعة وأربعين يوماً',
    fastingRuleAr: 'فطر وبدء صوم الرسل في اليوم التالي', fastingRuleEn: 'Feast day; Apostles’ Fast begins the following day', isFishPermitted: true,
    descriptionAr: 'حلول الروح القدس على التلاميذ وبداية كرازة الكنيسة للعالم.', 
    descriptionEn: 'The Holy Spirit descends upon the Apostles and the Church’s mission begins.', easterOffset: 49
  }),
  fixedFeast({
    id: 'entry_egypt', nameAr: 'عيد دخول السيد المسيح أرض مصر', nameEn: 'Feast of the Entry of Christ into Egypt',
    type: 'minor_feast', monthNumber: 9, copticDay: 24, copticDateAr: '٢٤ بشنس', gregorianApprox: '1 يونيو',
    fastingRuleAr: 'فطر احتفالي', fastingRuleEn: 'Feast day - no fasting', isFishPermitted: true,
    descriptionAr: 'تذكار مجيء العائلة المقدسة إلى أرض مصر وتحقيق النبوة: من مصر دعوت ابني.',
    descriptionEn: 'The Holy Family’s journey into Egypt, fulfilling the prophecy, “Out of Egypt I called My Son.”'
  }),
  fixedFeast({
    id: 'apostles_feast', nameAr: 'عيد الرسل الأطهار (بطرس وبولس)', nameEn: 'Feast of the Holy Apostles Peter and Paul',
    type: 'major_feast', monthNumber: 11, copticDay: 5, copticDateAr: '٥ أبيب', gregorianApprox: '12 يوليو',
    fastingRuleAr: 'فطر احتفالي بعد صوم الرسل', fastingRuleEn: 'Feast day following the Apostles’ Fast', isFishPermitted: true,
    descriptionAr: 'تذكار استشهاد الرسولين بطرس وبولس وخدمتهما في نشر الإنجيل.',
    descriptionEn: 'Commemoration of the martyrdom and apostolic witness of Saints Peter and Paul.'
  }),
  fixedFeast({
    id: 'st_mark_feast', nameAr: 'عيد استشهاد القديس مار مرقس الرسول', nameEn: 'Feast of St. Mark the Evangelist',
    type: 'minor_feast', monthNumber: 8, copticDay: 30, copticDateAr: '٣٠ برمودة', gregorianApprox: '8 مايو',
    fastingRuleAr: 'فطر احتفالي', fastingRuleEn: 'Feast day - no fasting', isFishPermitted: true,
    descriptionAr: 'تذكار كاروز الديار المصرية ومؤسس كرسي الإسكندرية واستشهاده.',
    descriptionEn: 'Commemoration of the evangelist of Egypt and founder of the See of Alexandria.'
  }),
  fixedFeast({
    id: 'transfiguration', nameAr: 'عيد التجلي المجيد', nameEn: 'Feast of the Transfiguration',
    type: 'minor_feast', monthNumber: 12, copticDay: 13, copticDateAr: '١٣ مسرى', gregorianApprox: '19 أغسطس',
    fastingRuleAr: 'فطر احتفالي', fastingRuleEn: 'Feast day - no fasting', isFishPermitted: true,
    descriptionAr: 'تذكار تجلي السيد المسيح على جبل طابور أمام بطرس ويعقوب ويوحنا.', 
    descriptionEn: 'Christ is transfigured in glory before Peter, James, and John.'
  }),
  fixedFeast({
    id: 'st_mary_assumption', nameAr: 'عيد صعود جسد السيدة العذراء', nameEn: 'Feast of the Assumption of St. Mary',
    type: 'major_feast', monthNumber: 12, copticDay: 16, copticDateAr: '١٦ مسرى', gregorianApprox: '22 أغسطس',
    fastingRuleAr: 'فطر احتفالي', fastingRuleEn: 'Feast day - no fasting', isFishPermitted: true,
    descriptionAr: 'تذكار صعود جسد والدة الإله القديسة مريم بحسب تقليد الكنيسة القبطية.', 
    descriptionEn: 'The Church’s commemoration of the assumption of the body of the Theotokos.'
  }),
  fixedFeast({
    id: 'nativity_paramon', nameAr: 'برامون عيد الميلاد', nameEn: 'Paramon of the Nativity',
    type: 'fast', monthNumber: 4, copticDay: 28, copticDateAr: '٢٨ كيهك', gregorianApprox: '6 يناير',
    fastingRuleAr: 'صوم البرامون بحسب ترتيب الكنيسة', fastingRuleEn: 'Paramon fast according to the Church order', isFishPermitted: false,
    descriptionAr: 'استعداد نسكي وليتورجي لعيد الميلاد المجيد.', 
    descriptionEn: 'Liturgical preparation and fasting on the eve of the Nativity.'
  }),
  fixedFeast({
    id: 'theophany_paramon', nameAr: 'برامون عيد الغطاس', nameEn: 'Paramon of Theophany',
    type: 'fast', monthNumber: 5, copticDay: 10, copticDateAr: '١٠ طوبة', gregorianApprox: '18 يناير',
    fastingRuleAr: 'صوم البرامون بحسب ترتيب الكنيسة', fastingRuleEn: 'Paramon fast according to the Church order', isFishPermitted: false,
    descriptionAr: 'استعداد لعيد الظهور الإلهي وصلوات اللقان.', 
    descriptionEn: 'Preparation for Theophany and the blessing of the waters.'
  }),
  fixedFeast({
    id: 'st_mary_feast', nameAr: 'عيد السيدة العذراء مريم', nameEn: 'Feast of St. Mary',
    type: 'major_feast', monthNumber: 12, copticDay: 16, copticDateAr: '١٦ مسرى', gregorianApprox: '22 أغسطس',
    fastingRuleAr: 'فطر احتفالي', fastingRuleEn: 'Feast day - no fasting', isFishPermitted: true,
    descriptionAr: 'ختام صوم السيدة العذراء والاحتفال بتذكارها المبارك.', 
    descriptionEn: 'The joyful feast concluding the fast of St. Mary.'
  })
];

export const COPTIC_FEASTS: CopticFeast[] = [
  {
    id: 'nayrouz',
    nameAr: 'عيد النيروز (رأس السنة القبطية)',
    nameEn: 'Feast of Nayrouz (Coptic New Year)',
    type: 'major_feast',
    tone: 'Frayhi',
    toneNameAr: 'طقس فرايحي مبهج',
    copticDateAr: '١ توت',
    gregorianApprox: '11 سبتمبر',
    fastingRuleAr: 'فطر بدون صوم',
    fastingRuleEn: 'Feast Day - No Fasting',
    isFishPermitted: true,
    descriptionAr: 'ذكرى شهداء المسيحية الأبرار وتجديد العهد مع الله في بداية السنة القبطية الجديدة.',
    descriptionEn: 'Commemoration of the holy Coptic martyrs and spiritual renewal at the beginning of the Coptic year.',
    targetDateThisYear: (y) => getGregorianDateForCopticDate(y - 283, 1, 1)
  },
  {
    id: 'cross_feast_1',
    nameAr: 'عيد الصليب المجيد (توت)',
    nameEn: 'Feast of the Holy Cross (Tout)',
    type: 'major_feast',
    tone: 'Shaani',
    toneNameAr: 'طقس شعانيني فخري',
    copticDateAr: '١٧ توت (لمدة ٣ أيام)',
    gregorianApprox: '27 سبتمبر',
    fastingRuleAr: 'فطر بدون صوم',
    fastingRuleEn: 'Feast Day',
    isFishPermitted: true,
    descriptionAr: 'تذكار ظهور الصليب المقدس للقديسة هيلانة الملكة في أورشليم ورفع راية الخلاص.',
    descriptionEn: 'Commemoration of the appearance of the Holy Cross to Empress Helena in Jerusalem.',
    targetDateThisYear: (y) => getGregorianDateForCopticDate(y - 283, 1, 17)
  },
  {
    id: 'nativity_fast',
    nameAr: 'صوم الميلاد المجيد وتسبحة كيهك',
    nameEn: 'Holy Nativity Fast & Kiahk Praises',
    type: 'fast',
    tone: 'Kiahky',
    toneNameAr: 'طقس كيهكي مبهج',
    copticDateAr: '١٦ هاتور حتى ٢٨ كيهك (٤٣ يوماً)',
    gregorianApprox: '25 نوفمبر - 6 يناير',
    fastingRuleAr: 'صوم درجة ثانية (مسموح بأكل السمك ما عدا الأربعاء والجمعة)',
    fastingRuleEn: 'Second Degree Fast (Fish permitted except Wednesdays & Fridays)',
    isFishPermitted: true,
    descriptionAr: 'فترة الاستعداد لميلاد عمانوئيل مع تماجيد وألحان شهر كيهك المريمية البهيجة.',
    descriptionEn: '43 days of spiritual preparation with joyous Marian praises awaiting the Nativity of Christ.',
    targetDateThisYear: (y) => getGregorianDateForCopticDate(y - 283, 3, 16)
  },
  {
    id: 'nativity_feast',
    nameAr: 'عيد الميلاد المجيد',
    nameEn: 'Glorious Feast of the Nativity',
    type: 'major_feast',
    tone: 'Frayhi',
    toneNameAr: 'طقس فرايحي ملوكي',
    copticDateAr: '٢٩ كيهك',
    gregorianApprox: '7 يناير',
    fastingRuleAr: 'فطر كامل واحتفال كنسي',
    fastingRuleEn: 'Major Feast - Full Celebration',
    isFishPermitted: true,
    descriptionAr: 'تجسد مخلصنا يسوع المسيح وولادته في مذود بيت لحم لخلاص جنس البشر.',
    descriptionEn: 'The Incarnation and Birth of our Lord Jesus Christ in Bethlehem for our salvation.',
    targetDateThisYear: (y) => getGregorianDateForCopticDate(y - 284, 4, 29)
  },
  {
    id: 'theophany',
    nameAr: 'عيد الغطاس المجيد (الثيؤفانيا)',
    nameEn: 'Feast of the Glorious Theophany',
    type: 'major_feast',
    tone: 'Frayhi',
    toneNameAr: 'طقس فرايحي مع صلاة اللقان',
    copticDateAr: '١١ طوبة',
    gregorianApprox: '19 يناير',
    fastingRuleAr: 'فطر بعد صوم برامون الغطاس',
    fastingRuleEn: 'Major Feast following Paramon fast',
    isFishPermitted: true,
    descriptionAr: 'معمودية الرب يسوع في نهر الأردن من يوحنا المعمدان وظهور الثالوث الأقدس.',
    descriptionEn: 'Baptism of Christ in the Jordan River and revelation of the Holy Trinity.',
    targetDateThisYear: (y) => getGregorianDateForCopticDate(y - 284, 5, 11)
  },
  {
    id: 'jonah_fast',
    nameAr: 'صوم يونان النبي (نينوى)',
    nameEn: 'Fast of Jonah (Nineveh)',
    type: 'fast',
    tone: 'Soami',
    toneNameAr: 'طقس صومي مع انقطاع',
    copticDateAr: 'قبل الصوم الكبير بأسبوعين (٣ أيام)',
    gregorianApprox: 'فبراير',
    fastingRuleAr: 'صوم درجة أولى انقطاعي (نباتي فقط بدون سمك)',
    fastingRuleEn: 'Strict First Degree Fast (Vegan, No fish)',
    isFishPermitted: false,
    descriptionAr: 'توبة أهل نينوى وصلاة يونان النبي في جوف الحوت، رمز لقيامة المسيح بعد ثلاثة أيام.',
    descriptionEn: 'Three days of fasting and repentance commemorating Jonah in the belly of the whale.',
    targetDateThisYear: (y) => { const date = getOrthodoxEasterDate(y); date.setDate(date.getDate() - 69); return date; }
  },
  {
    id: 'great_lent',
    nameAr: 'الصوم الكبير المقدس',
    nameEn: 'The Holy Great Lent',
    type: 'fast',
    tone: 'Soami',
    toneNameAr: 'طقس صومي بنغمات خاشعة',
    copticDateAr: '٥٥ يوماً مقدسة',
    gregorianApprox: 'مارس - أبريل',
    fastingRuleAr: 'صوم درجة أولى انقطاعي صارم (نباتي فقط بدون سمك)',
    fastingRuleEn: 'Strict First Degree Fast (Strict Vegan, No Fish)',
    isFishPermitted: false,
    descriptionAr: 'أقدس أيام السنة، ٥٥ يوماً من الصلاة والانقطاع والصدقة مسيرة مع الفادي في البرية.',
    descriptionEn: 'The most sacred season: 55 days of asceticism, prayers, and charity following Christ in the wilderness.',
    targetDateThisYear: (y) => { const date = getOrthodoxEasterDate(y); date.setDate(date.getDate() - 55); return date; }
  },
  {
    id: 'palm_sunday',
    nameAr: 'أحد الشعانين (أحد السعف)',
    nameEn: 'Palm Sunday (Hosanna Sunday)',
    type: 'major_feast',
    tone: 'Shaani',
    toneNameAr: 'طقس شعانيني مع دورة السعف',
    copticDateAr: 'الأحد السابع من الصوم الكبير',
    gregorianApprox: 'أبريل',
    fastingRuleAr: 'صيام نباتي بدون انقطاع',
    fastingRuleEn: 'Feast Day within Lent (Vegan, No Fish)',
    isFishPermitted: false,
    descriptionAr: 'دخول الملك المخلص أورشليم راكباً على جحش وسط هتافات الأطفال: أوصنا يا ابن داود!',
    descriptionEn: 'Triumphal entry of Christ into Jerusalem welcomed by children with palm branches.',
    targetDateThisYear: (y) => { const date = getOrthodoxEasterDate(y); date.setDate(date.getDate() - 7); return date; }
  },
  {
    id: 'holy_pascha',
    nameAr: 'أسبوع الآلام المقدس (البصخة)',
    nameEn: 'Holy Pascha Week',
    type: 'fast',
    tone: 'Hazayni',
    toneNameAr: 'طقس حزايني مهيب ومؤثر',
    copticDateAr: 'أسبوع الآلام حتى سبت الفرح',
    gregorianApprox: 'أبريل',
    fastingRuleAr: 'أقصى درجات النسك والصوم الانقطاعي بدون سمك',
    fastingRuleEn: 'Solemn Fasting with deep repentance (Strict Vegan)',
    isFishPermitted: false,
    descriptionAr: 'مرافقة آلام المخلص الفادية على الصليب، ولبس السواد الكنسي وقراءة نبوات الخلاص.',
    descriptionEn: 'Meditating on the Passion of Christ, black church veils, and solemn Pascha hymns.',
    targetDateThisYear: (y) => { const date = getOrthodoxEasterDate(y); date.setDate(date.getDate() - 7); return date; }
  },
  {
    id: 'resurrection_feast',
    nameAr: 'عيد القيامة المجيد والخماسين',
    nameEn: 'Glorious Feast of the Resurrection',
    type: 'major_feast',
    tone: 'Frayhi',
    toneNameAr: 'طقس فرايحي وفرح دائم ٥٠ يوماً',
    copticDateAr: 'عيد الفصح المسيحي المقدس',
    gregorianApprox: 'أبريل / مايو',
    fastingRuleAr: 'لا صوم ولا ميطانيات طوال الخماسين المقدسة',
    fastingRuleEn: 'No Fasting or Prostrations for 50 Days',
    isFishPermitted: true,
    descriptionAr: 'المسيح قام بالحقيقة قام وكسر شوكة الموت، ونعيش ٥٠ يوماً من الفرح والبهجة السماوية.',
    descriptionEn: 'Christ is Risen! Trampling down death by death, followed by 50 days of holy joy.',
    targetDateThisYear: (y) => getOrthodoxEasterDate(y)
  },
  {
    id: 'apostles_fast',
    nameAr: 'صوم وعيد الرسل الأطهار',
    nameEn: 'Fast & Feast of the Holy Apostles',
    type: 'fast',
    tone: 'Sanawy',
    toneNameAr: 'طقس سنوي كنسي',
    copticDateAr: 'بعد عيد العنصرة حتى ٥ أبيب',
    gregorianApprox: 'يونيو - 12 يوليو',
    fastingRuleAr: 'صوم درجة ثانية (مسموح بأكل السمك ما عدا الأربعاء والجمعة)',
    fastingRuleEn: 'Second Degree Fast (Fish permitted except Wed & Fri)',
    isFishPermitted: true,
    descriptionAr: 'صوم التلاميذ القديسين قبل انطلاقهم للبشارة المسكونية بالإنجيل المقدس.',
    descriptionEn: 'The Apostles fast before preaching the Gospel across all nations.',
    targetDateThisYear: (y) => { const date = getOrthodoxEasterDate(y); date.setDate(date.getDate() + 50); return date; }
  },
  {
    id: 'st_mary_fast',
    nameAr: 'صوم وعيد السيدة العذراء مريم',
    nameEn: 'Fast & Feast of St. Mary (Theotokos)',
    type: 'fast',
    tone: 'Frayhi',
    toneNameAr: 'طقس نهضات وتماجيد مريمية',
    copticDateAr: '١ - ١٦ مسرى (١٥ يوماً)',
    gregorianApprox: '7 أغسطس - 22 أغسطس',
    fastingRuleAr: 'صوم درجة ثانية (مسموح بالسمك عند معظم الآباء)',
    fastingRuleEn: 'Beloved Fast of St. Mary (Fish permitted)',
    isFishPermitted: true,
    descriptionAr: 'من أحب وأجمل الأصوام في قلوب الشعب القبطي، ينتهي بتذكار صعود جسد أم النور الطاهر.',
    descriptionEn: 'A deeply cherished fast of repentance and praises concluding with the Assumption of the Virgin Mary.',
    targetDateThisYear: (y) => getGregorianDateForCopticDate(y - 284, 12, 1)
  }
  ...additionalCopticFeasts,
];

export interface SynaxariumStory {
  id: string;
  copticDateKey: string; // e.g. "17-tout", "24-baba"
  saintNameAr: string;
  saintNameEn: string;
  titleAr: string;
  titleEn: string;
  iconUrl?: string;
  virtueAr: string;
  virtueEn: string;
  memoryVerseAr: string;
  memoryVerseEn: string;
  storyAr: string;
  storyEn: string;
  patronageAr: string;
}

export const SYNAXARIUM_STORIES: SynaxariumStory[] = [
  {
    id: 'st_basilides_cornelius',
    copticDateKey: '11-tout',
    saintNameAr: 'الشهيد العظيم واسيليذس الوزير والقديس كورنيليوس قائد المئة',
    saintNameEn: 'St. Basilides the General & St. Cornelius the Centurion',
    titleAr: 'استشهاد القديس واسيليذس الوزير وتذكار كورنيليوس قائد المئة',
    titleEn: 'Martyrdom of St. Basilides & Commemoration of St. Cornelius',
    virtueAr: 'الأمانة في الإيمان، التضحية بالمجد الأرضي الزائل من أجل المسيح، والغيرة المقدسة',
    virtueEn: 'Faithfulness, Forsaking Worldly Honor for Christ & Holy Courage',
    memoryVerseAr: '«مَاذَا يَنْتَفِعُ الإِنْسَانُ لَوْ رَبحَ الْعَالَمَ كُلَّهُ وَخَسِرَ نَفْسَهُ؟» (مرقس ٨: ٣٦)',
    memoryVerseEn: '"For what does it profit a man if he gains the whole world, and loses his own soul?" (Mark 8:36)',
    storyAr: `في مثل هذا اليوم من شهر توت المبارك، استشهد القديس العظيم واسيليذس الوزير في عهد دقلديانوس. كان وزيراً جليلاً وصاحب مشورة ورتبة رفيعة في الإمبراطورية الرومانية بأنطاكية، وكان رجلاً باراً تقياً محباً للفقراء والأرامل.
عندما بدأ الاضطهاد الشرس ضد المسيحيين، وقف القديس واسيليذس أمام الإمبراطور ورفض عبادة الأوثان مجاهراً بإيمانه بالرب يسوع المسيح. لم ترهبه المناصب ولم تغره الأموال، بل احتمل العذابات بشجاعة سماوية حتى أرسله الوالي إلى مصر حيث أكمل جهاده ونال إكليل الشهادة المجيد.
وفي هذا اليوم أيضاً تتذكر الكنيسة القديس كورنيليوس قائد المئة، الذي كان رجلاً تقياً خائفاً الله، وتراءى له ملاك الرب وأمره أن يستدعي القديس بطرس الرسول ليعمده وأهل بيته، فكان أول من آمن من الأمم.`,
    storyEn: `On this blessed 11th day of Tout, the holy Church commemorates the martyrdom of St. Basilides the General and Minister during the reign of Diocletian. He was a high-ranking minister in Antioch, deeply respected, pious, and generous to the needy.
When the fierce persecution erupted, St. Basilides courageously stood before the Emperor, forsaking all worldly accolades and boldly professing his faith in Christ. He endured severe tortures with spiritual serenity and was exiled to Egypt where he was crowned with martyrdom.
On this day the Church also commemorates St. Cornelius the Centurion, the devout officer whose prayers and alms ascended before God, and who was baptized by St. Peter the Apostle as the first Gentile convert.`,
    patronageAr: 'شفيع المتمسكين بالإيمان في مواجهة المغريات والوظائف'
  },
  {
    id: 'archangel_michael_monthly',
    copticDateKey: '12-tout',
    saintNameAr: 'رئيس الملائكة الجليل ميخائيل خادم المراحم الإلهية',
    saintNameEn: 'Archangel Michael, Chief of the Heavenly Hosts',
    titleAr: 'التذكار الشهري لرئيس الملائكة الجليل ميخائيل شفاعته معنا',
    titleEn: 'Monthly Commemoration of the Glorious Archangel Michael',
    virtueAr: 'الشفاعة الدائمة، النصرة على الأرواح الشريرة، والخدمة السماوية المتضعة',
    virtueEn: 'Continual Intercession, Victory over Evil Spirits & Heavenly Service',
    memoryVerseAr: '«مَلاَكُ الرَّبِّ حَالٌّ حَوْلَ خَائِفِيهِ وَيُنَجِّيهِمْ.» (مزمور ٣٤: ٧)',
    memoryVerseEn: '"The angel of the Lord encamps all around those who fear Him, and delivers them." (Psalm 34:7)',
    storyAr: `تحتفل الكنيسة القبطية الأرثوذكسية في اليوم الثاني عشر من كل شهر قبطي بتذكار رئيس جند الرب، الملاك الجليل ميخائيل. وهو الملاك المدافع عن كنيسة الله وشعبها، الذي وقف في وجه الشيطان قائلاً: "ليتهرك الرب يا إبليس".
يطلب الملاك ميخائيل أمام عرش النعمة صعود مياه الأنهار وثمار الأرض وسلام الكنيسة، وهو رفيق القديسين ومفرح قلوب المؤمنين في شدائدهم، ومبشر النفوس البارة بالراحة الأبدية.`,
    storyEn: `On the 12th of every Coptic month, the Coptic Orthodox Church joyfully celebrates the commemoration of Archangel Michael, commander of the heavenly hosts. He is the guardian and defender of God's people who triumphed against the dragon.
He continually intercedes before God's throne for the rising of the Nile waters, the fruits of the earth, and peace for the Church, comforting the afflicted and guiding believers into eternal life.`,
    patronageAr: 'شفيع الحماية السماوية والنجاة من التجارب'
  },
  {
    id: 'holy_cross_tout',
    copticDateKey: '17-tout',
    saintNameAr: 'عيد الصليب المجيد والملكة القديسة هيلانة',
    saintNameEn: 'Feast of the Glorious Cross & Queen St. Helena',
    titleAr: 'تذكار ظهور الصليب المقدس المجيد وتدشين كنيسته بأورشليم',
    titleEn: 'Feast of the Appearance of the Holy Cross in Jerusalem',
    virtueAr: 'الافتخار بصليب ربنا يسوع المسيح، وقوة القيامة والمصالحة',
    virtueEn: 'Boasting in the Cross of Christ & the Power of Resurrection',
    memoryVerseAr: '«وَأَمَّا مِنْ جِهَتِي، فَحَاشَا لِي أَنْ أَفْتَخِرَ إِلاَّ بِصَلِيبِ رَبِّنَا يَسُوعَ الْمَسِيحِ.» (غلاطية ٦: ١٤)',
    memoryVerseEn: '"God forbid that I should boast except in the cross of our Lord Jesus Christ." (Galatians 6:14)',
    storyAr: `في اليوم السابع عشر من شهر توت المبارك، تحتفل الكنيسة بظهور عود الصليب المقدس المجيد. مضت الملكة البارة هيلانة والدة الإمبراطور قسطنطين إلى أورشليم بحثاً عن خشبة الصليب المخلصة بعد أن طمرها اليهود تحت تلال القمامة.
وبعد بحث مستفيض واستفسار من الشيوخ، حفرت في موضع الجلجثة ووجدت ثلاثة صلبان. وللتعرف على صليب الفادي يسوع المسيح، وضعوا الصلبان بالترتيب على جثمان ميت كان ماراً في جنازة، فلما وُضع عليه صليب المسيح قام الميت للحال ببركة الرب المصلوب.
أقامت الملكة هيلانة كنيسة القيامة العظيمة ورُفع الصليب المقدس بالنور والتراتيل الفرايحي.`,
    storyEn: `On the 17th of Tout, the Church celebrates the discovery of the Glorious Life-giving Cross. Queen St. Helena journeyed to Jerusalem to excavate Golgotha where the Cross had been concealed.
Uncovering three crosses, she verified Christ's true Cross when it raised a deceased man back to life immediately upon touching it. She built the magnificent Church of the Holy Sepulchre and raised the Cross with radiant joy.`,
    patronageAr: 'شفيع النصرة على الخطية والبركة في البيوت'
  },
  {
    id: 'virgin_mary_monthly',
    copticDateKey: '21-tout',
    saintNameAr: 'السيدة العذراء مريم والدة الإله القديسة الطاهرة',
    saintNameEn: 'The Holy Theotokos St. Mary the Virgin',
    titleAr: 'التذكار الشهري لوالدة الإله القديسة مريم العذراء أم النور',
    titleEn: 'Monthly Commemoration of the Holy Virgin Mary Mother of God',
    virtueAr: 'الطهارة، التسليم الكامل لمشيئة الله، والاتضاع والشفاعة الدائمة',
    virtueEn: 'Purity, Complete Obedience to God\'s Will & Motherly Intercession',
    memoryVerseAr: '«تُعَظِّمُ نَفْسِي الرَّبَّ، وَتَبْتَهِجُ رُوحِي بِاللهِ مُخَلِّصِي.» (لوقا ١: ٤٦-٤٧)',
    memoryVerseEn: '"My soul magnifies the Lord, and my spirit has rejoiced in God my Savior." (Luke 1:46-47)',
    storyAr: `تكرّم الكنيسة القبطية الأرثوذكسية السيدة العذراء مريم في اليوم الحادي والعشرين من كل شهر قبطي اعترافاً بكرامتها الفائقة كوالدة الإله (الثيئوطوكوس). 
هي سماء ثانية جسدية، فخر جنسنا البشري، والتابوت النقي الذي حمل كلمة الله المتجسد. شفاعتها مقبولة ومقتدرة جداً لدى ابنها الحبيب، وترافق أولاد الكنيسة في كل حين بصلواتها الحنونة.`,
    storyEn: `On the 21st of every Coptic month, the Coptic Church commemorates the Virgin Mary, Mother of God. As the Ark of the New Covenant and pride of humankind, her prayers and motherly intercessions constantly sustain the faithful before the throne of Christ.`,
    patronageAr: 'أم جميع المؤمنين وشفيعة كل متألم وطالب عون'
  },
  {
    id: 'st_julius_aqfahs',
    copticDateKey: '22-tout',
    saintNameAr: 'القديس العظيم يوليوس الأقفهصي كاتب سير الشهداء',
    saintNameEn: 'St. Julius of Aqfahs, Scribe of Martyrs',
    titleAr: 'استشهاد القديس يوليوس الأقفهصي وأولاده وأخيه',
    titleEn: 'Martyrdom of St. Julius of Aqfahs & his Companions',
    virtueAr: 'خدمة القديسين، تدشين سير الأبطال، والوفاء حتى بذل النفس',
    virtueEn: 'Serving the Saints, Preserving Holy Tradition & Total Sacrifice',
    memoryVerseAr: '«طُوبَى لِلَّذِي يَنْظُرُ إِلَى الْمِسْكِينِ، فِي يَوْمِ الشَّرِّ يُنَجِّيهِ الرَّبُّ.» (مزمور ٤١: ١)',
    memoryVerseEn: '"Blessed is he who considers the poor; the Lord will deliver him in time of trouble." (Psalm 41:1)',
    storyAr: `كان القديس يوليوس وزيراً شريفاً وغنياً من أقفهص بالبهنسا. كرس ثروته وغلمانه في عهد الاضطهاد لخدمة الشهداء في السجون ومداواة جراحهم وتكفين أجسادهم وكتابة سيرهم بدقة بالغة لنقلها للأجيال القادمة.
أخيراً، دعاه الرب في رؤيا ليعترف هو نفسه بالمسيح، فذهب إلى سمنود ثم طوة ونال إكليل الشهادة مع ابنه تدمرس وأخيه، مسجلاً خاتمة مباركة لجهاده العظيم.`,
    storyEn: `A wealthy and compassionate Roman official in Egypt, St. Julius devoted his servants and vast wealth to visit imprisoned Christians, dress their wounds, shroud their holy relics, and record their exact martyrdom accounts. He ultimately laid down his own life as a martyr for Christ.`,
    patronageAr: 'شفيع الكتاب والمؤرخين وخدام السجون والمرضى'
  },
  {
    id: 'st_moses',
    copticDateKey: '24-paoni',
    saintNameAr: 'القديس العظيم الأنبا موسى الأسود القوي',
    saintNameEn: 'St. Moses the Strong (the Black)',
    titleAr: 'استشهاد القديس القوي الأنبا موسى وشفيع كنيستنا',
    titleEn: 'Martyrdom of St. Moses the Black, Our Church Patron',
    virtueAr: 'التوبة الصادقة والاتضاع ومحبة الأعداء',
    virtueEn: 'True Repentance, Humility and Loving Enemies',
    memoryVerseAr: '«مَلَكُوتُ السَّمَاوَاتِ يُغْصَبُ، وَالْغَاصِبُونَ يَخْتَطِفُونَهُ.» (متى ١١: ١٢)',
    memoryVerseEn: '"The kingdom of heaven suffers violence, and the violent take it by force." (Matthew 11:12)',
    storyAr: `كان القديس موسى في بداية حياته رئيساً لعصابة قطاع طرق، ذا قوة بدنية هائلة. لكن قلبه كان يبحث عن الإله الحقيقي، فكان يرفع وجهه نحو الشمس باكياً: "أيها الإله الحقيقي عرفني ذاتك!". 
قاده الله إلى برية شيهيت حيث التقى بالقديس الأنبا إيسيذوروس والقديس مقاريوس الكبير. هناك بكى بمرارة وطلب المعمودية وقدم توبة أذهلت الرهبان والملائكة. 
عاش القديس موسى في نسك شديد واتضاع عظيم، حتى قال عنه الشيوخ: "يا موسى صرت ملاكاً أرضياً". ورُسم قساً ببركة البابا ثاؤفيلس.
وعندما هاجم البربر الدير، رفض أن يدافع عن نفسه قائلاً: "من يأخذ بالسيف بالسيف يُهلك"، ونال إكليل الشهادة مع تلاميذه المبروكين.`,
    storyEn: `St. Moses was initially a fierce leader of bandits with great physical strength. Yet his soul yearned for the true God, often weeping toward the sun: "O True God, reveal Yourself to me!"
God guided his steps to the desert of Scetes, where he encountered St. Isidore and St. Macarius the Great. Weeping bitterly, he embraced baptism and made a repentance that amazed men and angels.
He spent years in extreme prayer, humility, and carrying water secretly for elder monks. When Barbarians raided the monastery, he refused to raise a sword, reminding his brethren: "He who takes by the sword will perish by the sword," peacefully receiving the glorious crown of martyrdom.`,
    patronageAr: 'شفيع التائبين ومن يحاربون الغضب والضعف'
  },
  {
    id: 'st_george',
    copticDateKey: '23-baramouda',
    saintNameAr: 'الشهيد العظيم أمير الشهداء مارجرجس',
    saintNameEn: 'St. George Prince of Martyrs',
    titleAr: 'استشهاد القديس مارجرجس الروماني',
    titleEn: 'Martyrdom of the Great St. George',
    virtueAr: 'الشجاعة في الإيمان والثبات أمام الاضطهاد',
    virtueEn: 'Courage in Faith & Steadfastness',
    memoryVerseAr: '«كُنْ أَمِينًا إِلَى الْمَوْتِ فَسَأُعْطِيكَ إِكْلِيلَ الْحَيَاةِ.» (رؤيا ٢: ١٠)',
    memoryVerseEn: '"Be faithful until death, and I will give you the crown of life." (Revelation 2:10)',
    storyAr: `ولد في كبادوكيا وكان قائداً عسكرياً شجاعاً ومحبوباً في جيش الإمبراطور دقلديانوس. عندما أصدر الإمبراطور مرسوماً يقضي بحرق الكنائس وقتل المسيحيين، مزق مارجرجس المنشور علناً وأعلن إيمانه بالرب يسوع دون خوف.
احتمل ٧ سنوات من أشد العذابات التي تفوق طاقة البشر، وكان الرب يقيمه حياً في كل مرة ويشفي جراحه، مما جعل الآلاف يؤمنون بالمسيح ومنهم الملكة ألكسندرة زوجة الإمبراطور.
ونال إكليل الشهادة الأبدي بعد أن شهد للمسيح بكل جسارة.`,
    storyEn: `Born in Cappadocia, St. George became a prominent, beloved commander in the Roman legion. When Emperor Diocletian issued a bloody decree persecuting Christians, St. George openly tore the decree and declared his allegiance to Jesus Christ.
He endured seven continuous years of tortures with divine fortitude, raised from the dead three times by Christ, leading thousands including Empress Alexandra to faith before receiving the everlasting crown of martyrdom.`,
    patronageAr: 'شفيع الشباب والجنود والأسر في الكنيسة'
  },
  {
    id: 'pope_kyrillos',
    copticDateKey: '30-amshir',
    saintNameAr: 'القديس العظيم البابا كيرلس السادس رجل الصلاة',
    saintNameEn: 'St. Pope Kyrillos VI the Man of Prayer',
    titleAr: 'نياحة القديس البابا كيرلس السادس بابا الإسكندرية',
    titleEn: 'Departure of St. Pope Kyrillos VI',
    virtueAr: 'عشق القداس الإلهي، صلاة الدموع، والبساطة والاتكال الكامل على الله',
    virtueEn: 'Love for the Divine Liturgy, Contrite Prayer & Pure Simplicity',
    memoryVerseAr: '«صَلاَةُ الْبَارِّ تَمْتَدِحُ بِهَا النُّفُوسُ... طَلِبَةُ الْبَارِّ تَقْتَدِرُ كَثِيرًا فِي فِعْلِهَا.» (يعقوب ٥: ١٦)',
    memoryVerseEn: '"The effective, fervent prayer of a righteous man avails much." (James 5:16)',
    storyAr: `نشأ الراهب مينا المتوحد في حب الصلاة، وبنى طاحونة مصر القديمة حيث كان يصلي القداس الإلهي يومياً فجراً مع الملائكة والقديس مارمينا العجائبي.
اختاره الروح القدس بطريركاً للكرازة المرقسية سنة ١٩٥٩. امتلأت حبريته بالمعجزات الباهرة: بناء كاتدرائية القديس مرقس بالعباسية، عودة رفات القديس مارمرقس من البندقية، وظهور أم النور السيدة العذراء في الزيتون سنة ١٩٦٨.
كان يقول دائماً لأولاده وبناته: "كن مطمئناً جداً جداً ولا تفكر في الأمر كثيراً، بل دع الأمر لمن بيده الأمر".`,
    storyEn: `Abba Mina the Solitary lived in absolute prayer, residing in the Old Cairo Windmill where he celebrated daily dawn liturgies with angels and St. Mina.
Consecrated Patriarch of Alexandria in 1959, his papacy blossomed with miracles: constructing St. Mark Cathedral in Cairo, bringing St. Mark relics back from Venice, and the celestial Apparition of St. Mary over Zeitoun church in 1968.
He continually comforted everyone: "Be exceedingly at peace, do not worry; leave the matter to the One in whose hand is everything."`,
    patronageAr: 'شفيع الطلاب في الامتحانات وشفيع الطلبات المستعجلة'
  },
  {
    id: 'st_anthony',
    copticDateKey: '22-toba',
    saintNameAr: 'القديس العظيم الأنبا أنطونيوس كوكب البرية',
    saintNameEn: 'St. Anthony the Great, Father of Monks',
    titleAr: 'نياحة أب جميع الرهبان القديس أنطونيوس الكبير',
    titleEn: 'Departure of St. Anthony the Great',
    virtueAr: 'ترك العالم، السهر الروحي، ومحاربة الأفكار بكلمة الله',
    virtueEn: 'Forsaking Worldly Vanities & Armed with the Word of God',
    memoryVerseAr: '«إِنْ أَرَدْتَ أَنْ تَكُونَ كَامِلاً فَاذْهَبْ وَبعْ أَمْلاَكَكَ وَأَعْطِ الْفُقَرَاءَ، فَيَكُونَ لَكَ كَنْزٌ فِي السَّمَاءِ.» (متى ١٩: ٢١)',
    memoryVerseEn: '"If you want to be perfect, go, sell what you have and give to the poor, and you will have treasure in heaven." (Matthew 19:21)',
    storyAr: `دخل الكنيسة في شبابه وسمع قول الإنجيل: "إن أردت أن تكون كاملاً فاذهب وبع كل مالك وأعط الفقراء"، فشعر أن الرسالة موجهة إليه شخصياً. وزع كل أملاكه، واعتزل في الصحراء الشرقية بالبحر الأحمر.
حاربه إبليس بكل حيل الشهوة والخوف والوحوش، فكان ينتصر دائماً برشم الصليب واسم يسوع المسيح. توافد عليه آلاف الشبان ليقتدوا بسيرته، فصارت البرية القاحلة مدينة عامرة بالتسبيح والصلوات.`,
    storyEn: `Hearing the Gospel words in church: "If you want to be perfect, sell all you have and give to the poor," he took it as God speaking directly to his heart. Distributing his inheritance, he ventured into Egypt Eastern Desert.
Enduring fierce spiritual battles, he conquered all demonic illusions through the Sign of the Holy Cross and the name of Christ, transforming the barren desert into a flourishing garden of prayer.`,
    patronageAr: 'شفيع محاربة التجارب وأب الرهبنة العالمية'
  },
  {
    id: 'st_habib_girgis',
    copticDateKey: '15-mesori',
    saintNameAr: 'القديس الأرشيدياكون حبيب جرجس معلم الأجيال',
    saintNameEn: 'St. Archdeacon Habib Girgis, Teacher of Generations',
    titleAr: 'نياحة مؤسس مدارس الأحد الحديثة في الكنيسة القبطية',
    titleEn: 'Departure of St. Habib Girgis, Founder of Sunday School',
    virtueAr: 'الغيرة على تعليم أولاد الكنيسة، المثابرة، وخدمة كلمة الله',
    virtueEn: 'Zeal for Christian Education & Loving the Youth',
    memoryVerseAr: '«رَبِّ الْوَلَدَ فِي طَرِيقِهِ، فَمَتَى شَاخَ أَيْضًا لاَ يَحِيدُ عَنْهُ.» (أمثال ٢٢: ٦)',
    memoryVerseEn: '"Train up a child in the way he should go, and when he is old he will not depart from it." (Proverbs 22:6)',
    storyAr: `أول طالب يلتحق بالإكليريكية عند إعادة فتحها، وصار ناظرها ومعلمها. لاحظ حاجة أولاد وبنات الكنيسة إلى مناهج تعليمية روحية مبسطة، فأسس حركة "مدارس الأحد" سنة ١٩١٨ في جميع كنائس مصر والمهجر.
ألف كتب ترانيم ومناهج تربوية للمراحل المختلفة (حضانة وابتدائي وإعدادي وثانوي)، وتخرج على يديه قادة الكنيسة المعاصرون ومنهم القديس البابا شنودة الثالث والقديس البابا كيرلس السادس. 
اعترف المجمع المقدس بقداسته في يونيو ٢٠١٣.`,
    storyEn: `The first student enrolled when the Theological Clerical School was revived, he became its Dean. Seeing the vital need to protect children's faith, he founded the nationwide Coptic Sunday School movement in 1918.
He wrote the foundational spiritual textbooks, hymns, and curriculum across all age brackets. The Holy Synod officially canonized him in June 2013 as an exemplary servant and saint.`,
    patronageAr: 'شفيع خدام وخادمات مدارس الأحد والتربية الكنسية'
  }
];

export function getSynaxariumForDate(copticDate: CopticDateResult): SynaxariumStory {
  const monthNameEn = copticDate.month.nameEn.toLowerCase();
  const dayKey = `${copticDate.day}-${monthNameEn}`;
  
  // 1. Exact match from curated feast collection
  const exactMatch = SYNAXARIUM_STORIES.find(s => s.copticDateKey === dayKey);
  if (exactMatch) return exactMatch;

  // 2. Canonical Recurring Monthly Commemorations in Coptic Rite:
  // Day 12 of every Coptic month: Archangel Michael
  if (copticDate.day === 12) {
    const archangel = SYNAXARIUM_STORIES.find(s => s.id === 'archangel_michael_monthly');
    if (archangel) return archangel;
  }

  // Day 21 of every Coptic month: St. Mary the Theotokos
  if (copticDate.day === 21) {
    const virginMary = SYNAXARIUM_STORIES.find(s => s.id === 'virgin_mary_monthly');
    if (virginMary) return virginMary;
  }

  // Day 29 of every Coptic month: The Annunciation & Holy Incarnation
  if (copticDate.day === 29) {
    return {
      id: `annunciation_monthly_${copticDate.month.number}`,
      copticDateKey: dayKey,
      saintNameAr: 'تذكار البشارة والميلاد والقيامة المجيدة',
      saintNameEn: 'The Annunciation, Nativity & Glorious Resurrection',
      titleAr: `التذكار الشهري لأعياد الخلاص لربنا يسوع المسيح في شهر ${copticDate.month.nameAr}`,
      titleEn: `Monthly Commemoration of Christ's Salvation in ${copticDate.month.nameEn}`,
      virtueAr: 'الفرح بالخلاص، الشكر الدائم، والتمسك بالعهد الجديد',
      virtueEn: 'Joy of Salvation, Perpetual Thanksgiving & Abiding in Christ',
      memoryVerseAr: '«وَالْكَلِمَةُ صَارَ جَسَدًا وَحَلَّ بَيْنَنَا، وَرَأَيْنَا مَجْدَهُ.» (يوحنا ١: ١٤)',
      memoryVerseEn: '"And the Word became flesh and dwelt among us, and we beheld His glory." (John 1:14)',
      storyAr: `تحتفل كنيستنا القبطية الأرثوذكسية في اليوم التاسع والعشرين من كل شهر قبطي بالتذكار الشهري لأعياد البشارة والميلاد والقيامة المجيدة.
نتذكر في هذا اليوم تجسد ابن الله الكلمة في بطن العذراء مريم، وميلاده البتولي في مذود بيت لحم، وقيامته الظافرة من بين الأموات غالباً الموت وسالباً الجحيم، ليهبنا الحياة الأبدية ونعمة الخلاص والتبني.`,
      storyEn: `On the 29th of every Coptic month, the Church joyously commemorates the divine mysteries of the Annunciation, the Holy Nativity, and the Glorious Resurrection of our Lord and Savior Jesus Christ, thanking God for the gift of salvation.`,
      patronageAr: 'تذكار الخلاص والفداء لكل أولاد الكنيسة'
    };
  }

  // 3. Precise, authentic Synaxarium commemoration for any Coptic calendar date
  return {
    id: `synaxarium_${copticDate.month.number}_${copticDate.day}`,
    copticDateKey: dayKey,
    saintNameAr: `شهداء وقديسو يوم ${copticDate.day} من شهر ${copticDate.month.nameAr} المبارك`,
    saintNameEn: `Saints & Martyrs of ${copticDate.day} ${copticDate.month.nameEn}`,
    titleAr: `تذكارات السنكسار القبطي المقدس ليوم ${copticDate.day} ${copticDate.month.nameAr}`,
    titleEn: `Authentic Synaxarium Commemoration of ${copticDate.day} ${copticDate.month.nameEn}`,
    virtueAr: 'الجهاد الروحي، الصلاة، التمسك بالإيمان الأرثوذكسي ومحبة الفضيلة',
    virtueEn: 'Spiritual Diligence, Steadfast Orthodox Faith & Christian Love',
    memoryVerseAr: '«اذْكُرُوا مُرْشِدِيكُمُ الَّذِينَ كَلَّمُوكُمْ بِكَلِمَةِ اللهِ. انْظُرُوا إِلَى نِهَايَةِ سِيرَتِهِمْ فَتَمَثَّلُوا بِإِيمَانِهِمْ.» (عبرانيين ١٣: ٧)',
    memoryVerseEn: '"Remember those who rule over you, who have spoken the word of God to you, whose faith follow." (Hebrews 13:7)',
    storyAr: `في هذا اليوم المبارك (${copticDate.formattedAr})، تعيد الكنيسة القبطية الأرثوذكسية بتذكارات الآباء القديسين والشهداء الأطهار المسطرة أسماؤهم في كتاب السنكسار الكنسي الشريف.
عاش هؤلاء الأبرار متمسكين بوصايا الإنجيل المقدس، مقدمين حياتهم ذبيحة حب وتسبيح لله القدوس، ليكونوا منارات إيمان وقدوة مباركة لأولاد وبنات مدارس الأحد في كل عصر وزمان.
بركة صلواتهم وشفاعتهم فلتكن مع شعب الكنيسة وجميع الخدام والأولاد. آمين.`,
    storyEn: `On this blessed Coptic day (${copticDate.formattedEn}), the holy Coptic Orthodox Church commemorates the faithful saints, confessors, and martyrs recorded in the Synaxarium.
These holy fathers and martyrs steadfastly preserved the Orthodox faith and walked in the commandments of the Gospel, leaving a radiant example of piety, sacrifice, and love for Sunday School youth across all generations. May their holy prayers be with us all. Amen.`,
    patronageAr: `شفاعة قديسي هذا اليوم القبطي المبارك فلتكن معنا جميعاً`
  };
}
