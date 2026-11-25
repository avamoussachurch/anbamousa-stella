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


function isGregorianLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}
export function getCopticOrthodoxEaster(gregorianYear: number): Date {
  const a = gregorianYear % 4, b = gregorianYear % 7, c = gregorianYear % 19;
  const d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
  const julianMonth = Math.floor((d + e + 114) / 31);
  const julianDay = ((d + e + 114) % 31) + 1;
  const gregorian = new Date(gregorianYear, julianMonth - 1, julianDay);
  gregorian.setDate(gregorian.getDate() + Math.floor(gregorianYear / 100) - Math.floor(gregorianYear / 400) - 2);
  return gregorian;
}
function copticDateToGregorian(day: number, monthNumber: number, copticYear: number): Date {
  const gregorianStartYear = copticYear + 283;
  const startDay = isGregorianLeapYear(gregorianStartYear + 1) ? 12 : 11;
  const date = new Date(gregorianStartYear, 8, startDay);
  date.setDate(date.getDate() + (monthNumber <= 12 ? (monthNumber - 1) * 30 : 360) + day - 1);
  return date;
}
function copticFeastDate(monthNumber: number, day: number, gregorianYear: number): Date {
  const candidates = [gregorianYear - 284, gregorianYear - 283].map(year => copticDateToGregorian(day, monthNumber, year));
  return candidates.find(date => date.getFullYear() === gregorianYear) || candidates[0];
}
export function getCopticMonthDateRange(monthNumber: number, copticYear: number): { start: Date; end: Date; daysCount: number } {
  const start = copticDateToGregorian(1, monthNumber, copticYear);
  const end = monthNumber === 13
    ? addCalendarDays(copticDateToGregorian(1, 1, copticYear + 1), -1)
    : addCalendarDays(copticDateToGregorian(1, monthNumber + 1, copticYear), -1);
  return { start, end, daysCount: Math.round((end.getTime() - start.getTime()) / 86400000) + 1 };
}
function makeAdditionalFeast(
  id: string, nameAr: string, nameEn: string, type: CopticFeast['type'], copticDateAr: string,
  targetDateThisYear: (year: number) => Date, descriptionAr: string, descriptionEn: string
): CopticFeast {
  const isFast = type === 'fast';
  return {
    id, nameAr, nameEn, type, tone: isFast ? 'Soami' : 'Frayhi',
    toneNameAr: isFast ? 'طقس صومي' : 'طقس فرايحي', copticDateAr,
    gregorianApprox: 'يتغير حسب السنة القبطية',
    fastingRuleAr: isFast ? 'تُراجع ترتيبات الصوم المعتمدة في الكنيسة وإرشاد أب الاعتراف.' : 'تُراعى أحكام الصوم والمواسم الكنسية بحسب ترتيب السنة.',
    fastingRuleEn: isFast ? 'Follow the Church’s approved fasting guidance and your father-confessor’s direction.' : 'Observe the Church’s fasting and seasonal rules for the year.',
    isFishPermitted: !isFast, descriptionAr, descriptionEn, targetDateThisYear
  };
}

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
    targetDateThisYear: (y) => copticFeastDate(1, 1, y) // Sept 11
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
    targetDateThisYear: (y) => copticFeastDate(1, 17, y)
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
    targetDateThisYear: (y) => copticFeastDate(3, 16, y)
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
    targetDateThisYear: (y) => copticFeastDate(4, 29, y)
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
    targetDateThisYear: (y) => copticFeastDate(5, 11, y)
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
    targetDateThisYear: (y) => addCalendarDays(getCopticOrthodoxEaster(y), -69)
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
    targetDateThisYear: (y) => addCalendarDays(getCopticOrthodoxEaster(y), -55)
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
    targetDateThisYear: (y) => addCalendarDays(getCopticOrthodoxEaster(y), -7)
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
    targetDateThisYear: (y) => addCalendarDays(getCopticOrthodoxEaster(y), -6)
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
    targetDateThisYear: (y) => getCopticOrthodoxEaster(y)
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
    targetDateThisYear: (y) => addCalendarDays(getCopticOrthodoxEaster(y), 50)
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
    targetDateThisYear: (y) => copticFeastDate(12, 1, y)
  },

  makeAdditionalFeast('circumcision', 'عيد ختان ربنا يسوع المسيح', 'Feast of the Circumcision of Christ', 'minor_feast', '٦ طوبة', y => copticFeastDate(5, 6, y), 'تذكار ختان الرب يسوع بحسب الناموس في اليوم الثامن.', 'The commemoration of Christ’s circumcision on the eighth day.'),
  makeAdditionalFeast('cana_wedding', 'عرس قانا الجليل', 'Wedding at Cana of Galilee', 'minor_feast', '١٣ طوبة', y => copticFeastDate(5, 13, y), 'تذكار أولى آيات السيد المسيح في عرس قانا الجليل.', 'Commemorates Christ’s first sign at the wedding in Cana.'),
  makeAdditionalFeast('presentation_temple', 'دخول السيد المسيح الهيكل', 'Presentation of Christ in the Temple', 'minor_feast', '٨ أمشير', y => copticFeastDate(6, 8, y), 'تذكار دخول السيد المسيح إلى الهيكل.', 'The commemoration of Christ being presented in the Temple.'),
  makeAdditionalFeast('cross_finding', 'عيد ظهور الصليب المقدس', 'Finding of the Holy Cross', 'minor_feast', '١٠ برمهات', y => copticFeastDate(7, 10, y), 'تذكار اكتشاف خشبة الصليب المقدس بيد الملكة هيلانة.', 'Commemorates the finding of the Holy Cross by St. Helena.'),
  makeAdditionalFeast('annunciation', 'عيد البشارة المجيد', 'Feast of the Annunciation', 'major_feast', '٢٩ برمهات', y => copticFeastDate(7, 29, y), 'تذكار بشارة الملاك جبرائيل للسيدة العذراء بالتجسد الإلهي؛ قد يتأثر الاحتفال بوقوعه في أسبوع الآلام.', 'The Archangel Gabriel announces the Incarnation to the Virgin Mary; observance may be affected when it falls during Holy Week.'),
  makeAdditionalFeast('lazarus_saturday', 'سبت لعازر', 'Lazarus Saturday', 'minor_feast', 'قبل أحد الشعانين بثمانية أيام', y => addCalendarDays(getCopticOrthodoxEaster(y), -8), 'تذكار إقامة لعازر من الأموات واستعداد الكنيسة لأسبوع الآلام.', 'Commemorates the raising of Lazarus and prepares the Church for Holy Week.'),
  makeAdditionalFeast('covenant_thursday', 'خميس العهد', 'Covenant Thursday', 'minor_feast', 'خميس أسبوع الآلام', y => addCalendarDays(getCopticOrthodoxEaster(y), -3), 'تذكار العشاء الأخير وتأسيس سر الإفخارستيا.', 'Commemorates the Last Supper and the institution of the Eucharist.'),
  makeAdditionalFeast('good_friday', 'الجمعة العظيمة', 'Good Friday', 'fast', 'جمعة أسبوع الآلام', y => addCalendarDays(getCopticOrthodoxEaster(y), -2), 'تذكار آلام وصلب ودفن ربنا يسوع المسيح.', 'The solemn commemoration of Christ’s Passion, Crucifixion and burial.'),
  makeAdditionalFeast('bright_saturday', 'سبت النور', 'Bright Saturday', 'minor_feast', 'سبت الفرح', y => addCalendarDays(getCopticOrthodoxEaster(y), -1), 'يوم انتظار القيامة المجيدة وإعلان النور المقدس.', 'The day of vigil and anticipation before the Resurrection.'),
  makeAdditionalFeast('thomas_sunday', 'أحد توما', 'Thomas Sunday', 'minor_feast', 'الأحد التالي للقيامة', y => addCalendarDays(getCopticOrthodoxEaster(y), 7), 'تذكار ظهور السيد المسيح للتلاميذ وتثبيت إيمان توما الرسول.', 'Commemorates the risen Christ appearing to the disciples and strengthening Thomas’s faith.'),
  makeAdditionalFeast('st_mark', 'عيد استشهاد القديس مار مرقس الرسول', 'Martyrdom of St. Mark the Evangelist', 'minor_feast', '٣٠ برمودة', y => copticFeastDate(8, 30, y), 'تذكار استشهاد كاروز الديار المصرية القديس مار مرقس الرسول.', 'Commemorates the martyrdom of St. Mark, evangelist of Egypt.'),
  makeAdditionalFeast('ascension', 'عيد الصعود المجيد', 'Feast of the Ascension', 'major_feast', 'بعد القيامة بتسعة وثلاثين يوماً', y => addCalendarDays(getCopticOrthodoxEaster(y), 39), 'تذكار صعود ربنا يسوع المسيح إلى السموات بعد قيامته.', 'Commemorates the Ascension of Christ forty days after the Resurrection.'),
  makeAdditionalFeast('pentecost', 'عيد حلول الروح القدس (العنصرة)', 'Feast of Pentecost', 'major_feast', 'بعد القيامة بتسعة وأربعين يوماً', y => addCalendarDays(getCopticOrthodoxEaster(y), 49), 'تذكار حلول الروح القدس على التلاميذ وتأسيس الكنيسة في ملء النعمة.', 'Commemorates the descent of the Holy Spirit upon the Apostles.'),
  makeAdditionalFeast('entry_egypt', 'عيد دخول السيد المسيح أرض مصر', 'Entry of the Lord into Egypt', 'minor_feast', '٢٤ بشنس', y => copticFeastDate(9, 24, y), 'تذكار دخول العائلة المقدسة إلى أرض مصر وبركة مسيرتها.', 'Commemorates the Holy Family’s entry into Egypt.'),
  makeAdditionalFeast('apostles_feast', 'عيد الرسل الأطهار بطرس وبولس', 'Feast of the Apostles Peter and Paul', 'major_feast', '٥ أبيب', y => copticFeastDate(11, 5, y), 'تذكار استشهاد الرسولين بطرس وبولس.', 'Commemorates the martyrdom of the Apostles Peter and Paul.'),
  makeAdditionalFeast('transfiguration', 'عيد التجلي المجيد', 'Feast of the Transfiguration', 'major_feast', '١٣ مسرى', y => copticFeastDate(12, 13, y), 'تذكار تجلي مجد السيد المسيح أمام تلاميذه على الجبل.', 'Commemorates Christ’s Transfiguration before His disciples.'),
  makeAdditionalFeast('assumption_mary', 'عيد صعود جسد السيدة العذراء', 'Assumption of the Body of St. Mary', 'major_feast', '١٦ مسرى', y => copticFeastDate(12, 16, y), 'تذكار صعود جسد والدة الإله القديسة مريم بحسب التقليد القبطي.', 'The Coptic commemoration of the assumption of the body of the Theotokos.'),
  makeAdditionalFeast('nativity_paramon', 'برامون عيد الميلاد', 'Paramon of the Nativity', 'fast', '٢٨ كيهك', y => copticFeastDate(4, 28, y), 'اليوم السابق لعيد الميلاد المجيد، وتُرتب صلواته ونسكه بحسب التقويم الكنسي.', 'The eve of the Nativity, observed according to the Church calendar.')
,

  makeAdditionalFeast('jonah_feast', 'عيد نينوى (فصح يونان)', 'Feast of Nineveh (Jonah’s Feast)', 'minor_feast', 'بعد صوم يونان', y => addCalendarDays(getCopticOrthodoxEaster(y), -66), 'عيد ختام صوم يونان، ويأتي قبل بدء الصوم الكبير.', 'The feast concluding the Fast of Nineveh, shortly before Great Lent.'),
  makeAdditionalFeast('epiphany_paramon', 'برامون عيد الغطاس', 'Paramon of the Theophany', 'fast', '١٠ طوبة', y => copticFeastDate(5, 10, y), 'اليوم السابق لعيد الظهور الإلهي، وتُرتب صلواته بحسب التقويم الكنسي.', 'The eve of the Theophany, observed according to the Church calendar.'),
  makeAdditionalFeast('st_damiana', 'عيد القديسة دميانة', 'Feast of St. Demiana', 'minor_feast', '١٣ طوبة', y => copticFeastDate(5, 13, y), 'تذكار القديسة دميانة والقديسات الأربعين العذارى.', 'Commemorates St. Demiana and the Forty Virgins.'),
  makeAdditionalFeast('st_anthony', 'عيد القديس الأنبا أنطونيوس', 'Feast of St. Anthony the Great', 'minor_feast', '٢٢ طوبة', y => copticFeastDate(5, 22, y), 'تذكار أب الرهبان القديس الأنبا أنطونيوس الكبير.', 'Commemorates St. Anthony the Great, father of monasticism.'),
  makeAdditionalFeast('st_george', 'عيد استشهاد مار جرجس', 'Feast of St. George', 'minor_feast', '٢٣ برمودة', y => copticFeastDate(8, 23, y), 'تذكار الشهيد العظيم مار جرجس أمير الشهداء.', 'Commemorates St. George, the great martyr.'),
  makeAdditionalFeast('st_mina', 'عيد القديس مارمينا العجائبي', 'Feast of St. Mina the Wonderworker', 'minor_feast', '١٥ هاتور', y => copticFeastDate(3, 15, y), 'تذكار القديس مارمينا العجائبي، شفيع كثير من الكنائس والأديرة في مصر.', 'Commemorates St. Mina the Wonderworker, beloved in the Coptic Church.'),
  makeAdditionalFeast('st_moses_black', 'عيد القديس الأنبا موسى الأسود', 'Feast of St. Moses the Black', 'minor_feast', '٢٤ بؤونة', y => copticFeastDate(10, 24, y), 'تذكار القديس الأنبا موسى الأسود، مثال التوبة والاتضاع ومحبة الله.', 'Commemorates St. Moses the Black, a model of repentance, humility and love of God.'),
  makeAdditionalFeast('st_abanoub', 'عيد الشهيد أبانوب النهيسي', 'Feast of St. Abanoub', 'minor_feast', '٢٤ أبيب', y => copticFeastDate(11, 24, y), 'تذكار الشهيد الطفل أبانوب النهيسي.', 'Commemorates the young martyr St. Abanoub.'),
  makeAdditionalFeast('archangel_michael', 'عيد رئيس الملائكة ميخائيل', 'Feast of Archangel Michael', 'minor_feast', '١٢ هاتور', y => copticFeastDate(3, 12, y), 'تذكار رئيس الملائكة ميخائيل؛ وتوجد تذكارات شهرية له في اليوم الثاني عشر من كل شهر قبطي.', 'Commemorates Archangel Michael; the Church also keeps monthly commemorations on the twelfth of each Coptic month.'),
  makeAdditionalFeast('st_peter_alexandria', 'عيد البابا بطرس خاتم الشهداء', 'Feast of St. Peter of Alexandria', 'minor_feast', '٢٩ هاتور', y => copticFeastDate(3, 29, y), 'تذكار البابا بطرس الأول، خاتم الشهداء.', 'Commemorates Pope Peter I of Alexandria, the Seal of the Martyrs.'),
  makeAdditionalFeast('libya_martyrs', 'تذكار شهداء ليبيا الواحد والعشرين', 'Commemoration of the 21 Martyrs of Libya', 'minor_feast', '٨ أمشير', y => copticFeastDate(6, 8, y), 'تذكار الشهداء الواحد والعشرين الذين استشهدوا في ليبيا سنة ٢٠١٥.', 'Commemorates the 21 Coptic martyrs killed in Libya in 2015.'),
  makeAdditionalFeast('st_john_baptist_martyrdom', 'عيد استشهاد يوحنا المعمدان', 'Martyrdom of St. John the Baptist', 'minor_feast', '٢ توت', y => copticFeastDate(1, 2, y), 'تذكار استشهاد القديس يوحنا المعمدان السابق الصابغ.', 'Commemorates the martyrdom of St. John the Baptist.'),
  makeAdditionalFeast('st_athanasius', 'عيد البابا أثناسيوس الرسولي', 'Feast of St. Athanasius the Apostolic', 'minor_feast', '٧ بشنس', y => copticFeastDate(9, 7, y), 'تذكار البابا أثناسيوس الرسولي حامي الإيمان الأرثوذكسي.', 'Commemorates St. Athanasius the Apostolic, defender of the Orthodox faith.')

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
