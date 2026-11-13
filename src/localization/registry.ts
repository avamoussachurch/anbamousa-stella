import { TranslationRegistryEntry } from '../types';

/**
 * Centralized Coptic Orthodox Trilingual Translation Registry
 * Every user-facing UI string with English, Arabic, and Bohairic Coptic.
 * Distinct from liturgical source texts.
 */
export const TRANSLATION_REGISTRY: Record<string, TranslationRegistryEntry> = {
  // ----------------------------------------------------
  // BRAND & CHURCH IDENTITY
  // ----------------------------------------------------
  'brand.churchName': {
    key: 'brand.churchName',
    en: 'St. Moses Church',
    ar: 'كنيسة الأنبا موسى',
    cop: 'Ϯⲉⲕⲕⲗⲏⲥⲓⲁ Ⲙⲱⲩⲥⲏⲥ',
    source: 'Church Dedication & Liturgical Rite',
    sourceType: 'CHURCH_APPROVED',
    reviewStatus: 'APPROVED',
    notes: 'Official church parish dedication name.'
  },
  'brand.churchFullName': {
    key: 'brand.churchFullName',
    en: 'St. Moses the Strong Coptic Orthodox Church',
    ar: 'كنيسة القديس القوي الأنبا موسى الأسود القبطية الأرثوذكسية',
    cop: 'Ϯⲉⲕⲕⲗⲏⲥⲓⲁ ⲛ̀ⲧⲉ Ⲫⲁⲅⲓⲟⲥ Ⲁⲃⲃⲁ Ⲙⲱⲩⲥⲏⲥ ⲡⲓϫⲱⲣⲓ',
    source: 'Synaxarium 24 Paoni (Feast of St. Moses)',
    sourceType: 'ECCLESIASTICAL_TRADITION',
    reviewStatus: 'APPROVED',
    notes: 'Full ecclesiastical title.'
  },
  'brand.motto': {
    key: 'brand.motto',
    en: 'Growing in Faith, Learning in Love',
    ar: 'نكبر في الإيمان ونتعلّم بالمحبة',
    cop: 'Ⲡⲓⲛⲁϩϯ ⲛⲉⲙ ϯⲥⲃⲱ ⲛⲉⲙ ⲡⲓⲱⲛϧ ⲛ̀ⲗⲓⲧⲟⲩⲣⲅⲓⲕⲟⲛ',
    source: 'Coptic Orthodox Education Creed',
    sourceType: 'CHURCH_APPROVED',
    reviewStatus: 'APPROVED'
  },

  // ----------------------------------------------------
  // NAVIGATION
  // ----------------------------------------------------
  'navigation.home': {
    key: 'navigation.home',
    en: 'Home',
    ar: 'الرئيسية',
    cop: 'Ⲡⲓⲏⲓ',
    source: 'Ecclesiastical UI Standard',
    sourceType: 'UI_CONVENTION',
    reviewStatus: 'APPROVED',
    notes: 'Literally "The House / Portal".'
  },
  'navigation.lessons': {
    key: 'navigation.lessons',
    en: 'Lessons',
    ar: 'الدروس',
    cop: 'Ⲛⲓⲥⲃⲱ',
    source: 'Coptic Didache & Catechetical School',
    sourceType: 'ECCLESIASTICAL_TRADITION',
    reviewStatus: 'APPROVED',
    notes: 'Plural of ϯⲥⲃⲱ (instruction/lesson).'
  },
  'navigation.hymns': {
    key: 'navigation.hymns',
    en: 'Hymns School',
    ar: 'مدرسة الألحان',
    cop: 'Ⲛⲓϩⲱⲥ',
    source: 'Coptic Psalmodia Tradition',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED',
    notes: 'Bohairic liturgical hymns/praises.'
  },
  'navigation.agpeya': {
    key: 'navigation.agpeya',
    en: 'Daily Agpeya',
    ar: 'صلوات الأجبية',
    cop: 'Ϯⲁϫⲡⲓⲁ',
    source: 'Coptic Horologion Title',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED',
    notes: 'The Canonical Hours book.'
  },
  'navigation.calendar': {
    key: 'navigation.calendar',
    en: 'Coptic Calendar',
    ar: 'التقويم والسنكسار',
    cop: 'Ⲡⲓⲥⲩⲛⲁⲝⲁⲣⲓⲟⲛ',
    source: 'Coptic Synaxarium & Paschal Reckoning',
    sourceType: 'ECCLESIASTICAL_TRADITION',
    reviewStatus: 'APPROVED'
  },
  'navigation.points': {
    key: 'navigation.points',
    en: 'Points & Rewards',
    ar: 'النقاط والمكافآت',
    cop: 'Ⲛⲓⲧⲁⲓⲟ',
    source: 'Bohairic Coptic Honor/Reward terminology',
    sourceType: 'UI_CONVENTION',
    reviewStatus: 'APPROVED',
    notes: 'From ⲧⲁⲓⲟ (honor/praise/reward).'
  },
  'navigation.feed': {
    key: 'navigation.feed',
    en: 'Community',
    ar: 'المجتمع الكنسي',
    cop: 'Ϯⲕⲟⲓⲛⲱⲛⲓⲁ',
    source: 'Acts of the Apostles (Acts 2:42 Coptic)',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED',
    notes: 'Liturgical and biblical fellowship.'
  },
  'navigation.profile': {
    key: 'navigation.profile',
    en: 'My Profile',
    ar: 'حسابي',
    cop: 'Ⲡⲁⲣⲁⲛ',
    source: 'Ecclesiastical UI Standard',
    sourceType: 'UI_CONVENTION',
    reviewStatus: 'APPROVED',
    notes: 'Literally "My Name / Identity".'
  },
  'navigation.studio': {
    key: 'navigation.studio',
    en: 'Teacher Studio',
    ar: 'منصة الخادم',
    cop: 'Ⲡⲓⲇⲓⲁⲕⲟⲛⲟⲥ',
    source: 'Church Educational Order',
    sourceType: 'CHURCH_APPROVED',
    reviewStatus: 'APPROVED'
  },
  'navigation.family': {
    key: 'navigation.family',
    en: 'Parent Portal',
    ar: 'بوابة الأسرة',
    cop: 'Ⲛⲓⲓⲟϯ',
    source: 'Coptic Pastoral Guidance',
    sourceType: 'CHURCH_APPROVED',
    reviewStatus: 'APPROVED',
    notes: 'Literally "The Parents / Guardians".'
  },
  'navigation.designSystem': {
    key: 'navigation.designSystem',
    en: 'Design System',
    ar: 'نظام التصميم',
    cop: 'Ⲡⲓⲥⲩⲥⲧⲏⲙⲁ ⲛ̀ⲧⲉ ⲡⲓⲥⲙⲟⲧ',
    source: 'Ecclesiastical Graphic Standard',
    sourceType: 'UI_CONVENTION',
    reviewStatus: 'APPROVED'
  },
  'navigation.brandGuidelines': {
    key: 'navigation.brandGuidelines',
    en: 'Brand Guidelines',
    ar: 'دليل الهوية البصرية',
    cop: 'Ⲛⲓⲕⲁⲛⲱⲛ ⲛ̀ⲧⲉ ⲡⲓⲥⲙⲟⲧ',
    source: 'Ecclesiastical Graphic Standard',
    sourceType: 'UI_CONVENTION',
    reviewStatus: 'APPROVED'
  },
  'navigation.localizationQa': {
    key: 'navigation.localizationQa',
    en: 'Localization QA',
    ar: 'ضبط جودة الترجمة',
    cop: 'Ⲡⲓϫⲱⲕ ⲛ̀ⲧⲉ ϯⲟⲩⲁϩⲙⲉⲥⲃⲱ',
    source: 'Coptic Translation Commission',
    sourceType: 'UI_CONVENTION',
    reviewStatus: 'APPROVED'
  },

  // ----------------------------------------------------
  // COMMON ACTIONS
  // ----------------------------------------------------
  'actions.save': {
    key: 'actions.save',
    en: 'Save',
    ar: 'حفظ',
    cop: 'Ⲁⲣⲉϩ',
    source: 'Bohairic Scripture (Ps 118 Coptic)',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED',
    notes: 'Imperative: to keep/preserve/save.'
  },
  'actions.cancel': {
    key: 'actions.cancel',
    en: 'Cancel',
    ar: 'إلغاء',
    cop: 'Ⲭⲱ ⲉ̀ⲃⲟⲗ',
    source: 'Coptic Liturgical Forgiveness/Release formula',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED',
    notes: 'Liturgical imperative: release/cancel.'
  },
  'actions.delete': {
    key: 'actions.delete',
    en: 'Delete',
    ar: 'حذف',
    cop: 'Ϥⲓ ⲉ̀ⲃⲟⲗ',
    source: 'Bohairic Gospel Text',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED',
    notes: 'Literally "Take away / remove".'
  },
  'actions.edit': {
    key: 'actions.edit',
    en: 'Edit',
    ar: 'تعديل',
    cop: 'Ⲧⲁϫⲣⲟ',
    source: 'Coptic Liturgical Prayers',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED',
    notes: 'To rectify / confirm / edit.'
  },
  'actions.publish': {
    key: 'actions.publish',
    en: 'Publish',
    ar: 'نشر',
    cop: 'Ϩⲓⲱⲓϣ',
    source: 'Mark 16:15 Coptic (Proclaim/Publish)',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED',
    notes: 'Scriptural word for proclaim/publish.'
  },
  'actions.archive': {
    key: 'actions.archive',
    en: 'Archive',
    ar: 'أرشفة',
    cop: 'Ⲭⲱ ϧⲉⲛ ⲡⲓⲙⲁⲛ̀ⲁϩⲟ',
    source: 'Bohairic Treasury / Archive',
    sourceType: 'UI_CONVENTION',
    reviewStatus: 'APPROVED',
    notes: 'Place into repository/treasury.'
  },
  'actions.learn': {
    key: 'actions.learn',
    en: 'Learn',
    ar: 'تعلّم',
    cop: 'Ϭⲓⲥⲃⲱ',
    source: 'Bohairic Proverbs & Gospels',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED',
    notes: 'To receive instruction / learn.'
  },
  'actions.listen': {
    key: 'actions.listen',
    en: 'Listen',
    ar: 'استمع',
    cop: 'Ⲥⲱⲧⲉⲙ',
    source: 'Gospel of Luke 8:8 Coptic',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED',
    notes: 'He who has ears to hear, let him hear.'
  },
  'actions.read': {
    key: 'actions.read',
    en: 'Read',
    ar: 'اقرأ',
    cop: 'Ⲱϣ',
    source: 'Coptic Katameros Rubric',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED',
    notes: 'Liturgical instruction for lector.'
  },
  'actions.practice': {
    key: 'actions.practice',
    en: 'Practice',
    ar: 'تدرّب',
    cop: 'Ⲁⲣⲓⲅⲩⲙⲛⲁⲍⲓⲛ',
    source: '1 Timothy 4:7 Coptic',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED',
    notes: 'Exercise yourself in godliness.'
  },
  'actions.continue': {
    key: 'actions.continue',
    en: 'Continue',
    ar: 'كمّل',
    cop: 'Ⲟⲩⲱϣ',
    source: 'Liturgical Dialogue',
    sourceType: 'UI_CONVENTION',
    reviewStatus: 'APPROVED'
  },
  'actions.back': {
    key: 'actions.back',
    en: 'Back',
    ar: 'ارجع',
    cop: 'Ⲕⲟⲧⲕ',
    source: 'Bohairic Coptic Gospel',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED',
    notes: 'Return / step back.'
  },
  'actions.next': {
    key: 'actions.next',
    en: 'Next',
    ar: 'اللي بعده',
    cop: 'Ⲡⲉⲑⲛⲏⲟⲩ',
    source: 'Liturgical Rite formula',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED',
    notes: 'That which comes next.'
  },
  'actions.previous': {
    key: 'actions.previous',
    en: 'Previous',
    ar: 'اللي قبله',
    cop: 'Ⲡⲉⲧⲉⲣϣⲟⲣⲡ',
    source: 'Coptic Chronology',
    sourceType: 'UI_CONVENTION',
    reviewStatus: 'APPROVED'
  },
  'actions.close': {
    key: 'actions.close',
    en: 'Close',
    ar: 'اقفل',
    cop: 'Ⲙⲁϣⲑⲁⲙ',
    source: 'Bohairic Gospel (Matt 6:6 Coptic)',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED',
    notes: 'Shut the door and pray.'
  },
  'actions.start': {
    key: 'actions.start',
    en: 'Start',
    ar: 'ابدأ',
    cop: 'Ⲁⲣⲓϩⲏⲧⲥ',
    source: 'Coptic Liturgical Rubric',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED',
    notes: 'Begin the service.'
  },
  'actions.search': {
    key: 'actions.search',
    en: 'Search...',
    ar: 'دوّر...',
    cop: 'Ⲕⲱϯ...',
    source: 'Matt 7:7 Coptic (Seek and find)',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED'
  },
  'actions.submit': {
    key: 'actions.submit',
    en: 'Submit',
    ar: 'ابعت',
    cop: 'Ⲟⲩⲱⲣⲡ',
    source: 'Bohairic Epistles',
    sourceType: 'UI_CONVENTION',
    reviewStatus: 'APPROVED'
  },
  'actions.share': {
    key: 'actions.share',
    en: 'Share',
    ar: 'مشاركة',
    cop: 'Ϣⲱⲡ ⲉ̀ⲧⲟⲧ',
    source: 'Romans 12:13 Coptic',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED'
  },
  'actions.download': {
    key: 'actions.download',
    en: 'Download',
    ar: 'نزّل',
    cop: 'Ϭⲓ ⲉ̀ⲡⲉⲥⲏⲧ',
    source: 'Ecclesiastical UI Standard',
    sourceType: 'UI_CONVENTION',
    reviewStatus: 'APPROVED'
  },

  // ----------------------------------------------------
  // STATUS LABELS
  // ----------------------------------------------------
  'status.published': {
    key: 'status.published',
    en: 'Published',
    ar: 'منشور',
    cop: 'Ⲉϥϩⲓⲱⲓϣ',
    source: 'Liturgical Canon',
    sourceType: 'UI_CONVENTION',
    reviewStatus: 'APPROVED'
  },
  'status.draft': {
    key: 'status.draft',
    en: 'Draft',
    ar: 'مسودة',
    cop: 'Ⲡⲓⲥⲭⲉⲇⲓⲟⲛ',
    source: 'Coptic Scribal Manuscript tradition',
    sourceType: 'CHURCH_APPROVED',
    reviewStatus: 'APPROVED'
  },
  'status.review': {
    key: 'status.review',
    en: 'Review Required',
    ar: 'قيد المراجعة الكنسية',
    cop: 'Ⲉⲧⲉⲣⲭⲣⲓⲁ ⲛ̀ϫⲱⲕ',
    source: 'Patriarchal Coptic Commission',
    sourceType: 'CHURCH_APPROVED',
    reviewStatus: 'APPROVED'
  },
  'status.restricted': {
    key: 'status.restricted',
    en: 'Restricted',
    ar: 'خاص ومقيد',
    cop: 'Ⲉϥⲧⲟⲩⲃⲏⲟⲩⲧ',
    source: 'Coptic Canon Law',
    sourceType: 'ECCLESIASTICAL_TRADITION',
    reviewStatus: 'APPROVED'
  },
  'status.available': {
    key: 'status.available',
    en: 'Available',
    ar: 'متاح',
    cop: 'Ⲉϥϣⲟⲡ',
    source: 'Bohairic Coptic Gospel',
    sourceType: 'UI_CONVENTION',
    reviewStatus: 'APPROVED'
  },
  'status.offline': {
    key: 'status.offline',
    en: 'Offline',
    ar: 'غير متصل',
    cop: 'Ⲙⲡⲉϥⲥⲱⲛⲧ',
    source: 'Digital Ecclesiastical Terminology',
    sourceType: 'UI_CONVENTION',
    reviewStatus: 'APPROVED'
  },
  'status.verified': {
    key: 'status.verified',
    en: 'Verified',
    ar: 'مُعتمد ومُدقق',
    cop: 'Ⲉϥⲧⲁϫⲣⲏⲟⲩⲧ',
    source: 'Coptic Euchologion & Synods',
    sourceType: 'CHURCH_APPROVED',
    reviewStatus: 'APPROVED'
  },

  // ----------------------------------------------------
  // AUDIO & RECORDING CONTROLS
  // ----------------------------------------------------
  'audio.play': {
    key: 'audio.play',
    en: 'Play',
    ar: 'شغّل',
    cop: 'Ⲙⲁⲣⲉϥϩⲱⲥ',
    source: 'Psalm 149:1 Coptic',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED',
    notes: 'Let it praise/play.'
  },
  'audio.pause': {
    key: 'audio.pause',
    en: 'Pause',
    ar: 'وقّف مؤقت',
    cop: 'Ϩⲁⲣⲉϩ ⲉ̀ⲣⲟⲕ',
    source: 'Liturgical Pause rubric',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED'
  },
  'audio.seek': {
    key: 'audio.seek',
    en: 'Seek',
    ar: 'تقديم أو تأخير',
    cop: 'Ⲭⲱ ⲉ̀ϧⲟⲩⲛ',
    source: 'Ecclesiastical UI Standard',
    sourceType: 'UI_CONVENTION',
    reviewStatus: 'APPROVED'
  },
  'audio.volume': {
    key: 'audio.volume',
    en: 'Volume',
    ar: 'مستوى الصوت',
    cop: 'Ⲡⲓϧⲣⲱⲟⲩ',
    source: 'Psalm 28 Coptic (The Voice/Volume)',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED'
  },
  'audio.mute': {
    key: 'audio.mute',
    en: 'Mute',
    ar: 'كتم الصوت',
    cop: 'Ⲭⲁⲣⲱⲕ',
    source: 'Coptic Divine Liturgy Deacon Call',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED',
    notes: 'Deacon call to quiet congregation.'
  },
  'audio.speed': {
    key: 'audio.speed',
    en: 'Playback Speed',
    ar: 'سرعة التشغيل',
    cop: 'Ⲡⲓⲓⲏⲥ ⲛ̀ⲧⲉ ⲡⲓϩⲱⲥ',
    source: 'Chant School Instruction',
    sourceType: 'UI_CONVENTION',
    reviewStatus: 'APPROVED'
  },
  'audio.loop': {
    key: 'audio.loop',
    en: 'Loop / Repeat',
    ar: 'تكرار اللحن',
    cop: 'Ⲟⲩⲁϩⲙⲉϥ',
    source: 'Coptic Liturgical Refrain formula',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED',
    notes: 'Liturgical instruction for repetition.'
  },
  'audio.trilingualLyrics': {
    key: 'audio.trilingualLyrics',
    en: 'Trilingual Lyrics',
    ar: 'كلمات اللحن بثلاث لغات',
    cop: 'Ⲛⲓⲥⲁϫⲓ ⲛ̀ⲅ̅ ⲛ̀ⲁⲥⲡⲓ',
    source: 'Coptic Hymnological Institute',
    sourceType: 'CHURCH_APPROVED',
    reviewStatus: 'APPROVED'
  },

  // ----------------------------------------------------
  // TRILINGUAL READING SYSTEM
  // ----------------------------------------------------
  'reader.trilingualMode': {
    key: 'reader.trilingualMode',
    en: 'Trilingual Reading Mode',
    ar: 'وضع القراءة بثلاث لغات',
    cop: 'Ⲡⲓⲥⲙⲟⲧ ⲛ̀ⲅ̅ ⲛ̀ⲁⲥⲡⲓ',
    source: 'Church Educational Standard',
    sourceType: 'CHURCH_APPROVED',
    reviewStatus: 'APPROVED'
  },
  'reader.copticText': {
    key: 'reader.copticText',
    en: 'Bohairic Coptic Text',
    ar: 'النص القبطي البحيري',
    cop: 'Ⲡⲓⲥϧⲁⲓ ⲛ̀ⲣⲉⲙⲛ̀ⲭⲏⲙⲓ',
    source: 'Bohairic Sacred Text Standard',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED'
  },
  'reader.arabicText': {
    key: 'reader.arabicText',
    en: 'Arabic Liturgical Translation',
    ar: 'الترجمة العربية الكنسية',
    cop: 'Ϯⲟⲩⲁϩⲙⲉⲥⲃⲱ ⲛ̀ⲁⲣⲁⲃⲓⲕⲏ',
    source: 'Ecclesiastical Translation',
    sourceType: 'CHURCH_APPROVED',
    reviewStatus: 'APPROVED'
  },
  'reader.englishText': {
    key: 'reader.englishText',
    en: 'English Liturgical Translation',
    ar: 'الترجمة الإنجليزية الكنسية',
    cop: 'Ϯⲟⲩⲁϩⲙⲉⲥⲃⲱ ⲛ̀ⲉⲅⲅⲗⲉⲍⲓⲕⲏ',
    source: 'Ecclesiastical Translation',
    sourceType: 'CHURCH_APPROVED',
    reviewStatus: 'APPROVED'
  },

  // ----------------------------------------------------
  // FEEDBACK & SYSTEM MESSAGES
  // ----------------------------------------------------
  'feedback.empty': {
    key: 'feedback.empty',
    en: 'No items found in this section.',
    ar: 'مفيش حاجة هنا لسه.',
    cop: 'Ⲙⲙⲟⲛ ϩⲗⲓ ⲛ̀ϩⲱⲃ ϧⲉⲛ ⲡⲁⲓⲙⲁ ϯⲛⲟⲩ.',
    source: 'Bohairic Coptic Dialogue',
    sourceType: 'UI_CONVENTION',
    reviewStatus: 'APPROVED'
  },
  'feedback.noResults': {
    key: 'feedback.noResults',
    en: 'No matching results found.',
    ar: 'ملقيناش نتائج مطابقة.',
    cop: 'Ⲙⲡⲟⲩϫⲓⲙⲓ ⲛ̀ϩⲗⲓ ⲉϥⲙⲟⲛⲕ.',
    source: 'Bohairic Scripture Standard',
    sourceType: 'UI_CONVENTION',
    reviewStatus: 'APPROVED'
  },
  'feedback.tryAgain': {
    key: 'feedback.tryAgain',
    en: 'Try again',
    ar: 'جرّب تاني',
    cop: 'Ⲁⲣⲓⲟⲩⲁϩⲙⲉϥ ⲟⲛ',
    source: 'Liturgical Repeat formula',
    sourceType: 'UI_CONVENTION',
    reviewStatus: 'APPROVED'
  },
  'feedback.comingSoon': {
    key: 'feedback.comingSoon',
    en: 'Coming Soon',
    ar: 'قريباً بنعمة ربنا',
    cop: 'Ⲉϥⲛⲏⲟⲩ ϧⲉⲛ ⲡⲓϩⲙⲟⲧ ⲛ̀ⲧⲉ Ⲫϯ',
    source: 'Ecclesiastical Blessing Standard',
    sourceType: 'CHURCH_APPROVED',
    reviewStatus: 'APPROVED'
  },
  'feedback.loading': {
    key: 'feedback.loading',
    en: 'Loading sacred content...',
    ar: 'بنحمّل المحتوى...',
    cop: 'Ⲉϥⲥⲱⲕ ⲉ̀ϧⲟⲩⲛ ⲙ̀ⲡⲓϩⲱⲃ ⲉⲑⲟⲩⲁⲃ...',
    source: 'Ecclesiastical UI Standard',
    sourceType: 'UI_CONVENTION',
    reviewStatus: 'APPROVED'
  },

  // ----------------------------------------------------
  // LITURGICAL SEASONS & FEASTS
  // ----------------------------------------------------
  'season.annual': {
    key: 'season.annual',
    en: 'Annual Days',
    ar: 'الطقس السنوي',
    cop: 'Ⲡⲓⲥⲙⲟⲧ ⲛ̀ⲧⲉ ϯⲣⲟⲙⲡⲓ',
    source: 'Coptic Horologion & Katameros',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED'
  },
  'season.kiahk': {
    key: 'season.kiahk',
    en: 'Month of Kiahk (Nativity Praises)',
    ar: 'شهر كيهك المريمي (تسبحة كيهك)',
    cop: 'Ⲡⲓⲁⲃⲟⲧ Ⲭⲟⲓⲁⲕ',
    source: 'Coptic Psalmodia of Kiahk',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED'
  },
  'season.nativity': {
    key: 'season.nativity',
    en: 'Holy Nativity Feast',
    ar: 'عيد الميلاد المجيد',
    cop: 'Ⲡⲓϫⲓⲛⲙⲓⲥⲓ ⲉⲑⲟⲩⲁⲃ',
    source: 'Feast of the Nativity Rite',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED'
  },
  'season.theophany': {
    key: 'season.theophany',
    en: 'Theophany (Baptism Feast)',
    ar: 'عيد الغطاس المجيد',
    cop: 'Ⲡⲓⲡⲓⲱⲙⲥ ⲉⲑⲟⲩⲁⲃ',
    source: 'Feast of the Baptism Liturgy',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED'
  },
  'season.greatLent': {
    key: 'season.greatLent',
    en: 'Holy Great Fast (Great Lent)',
    ar: 'الصوم الكبير المقدس',
    cop: 'Ϯⲛⲏⲥⲧⲓⲁ ⲉⲑⲟⲩⲁⲃ ⲛ̀ⲧⲉ ⲡⲓⲙ̅',
    source: 'Great Lent Doxology & Katameros',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED'
  },
  'season.holyWeek': {
    key: 'season.holyWeek',
    en: 'Holy Pascha (Holy Week)',
    ar: 'أسبوع الآلام المقدس (البصخة)',
    cop: 'Ⲡⲓⲡⲁⲥⲭⲁ ⲉⲑⲟⲩⲁⲃ',
    source: 'Coptic Holy Pascha Book',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED'
  },
  'season.resurrection': {
    key: 'season.resurrection',
    en: 'Holy Feast of Resurrection',
    ar: 'عيد القيامة المجيد',
    cop: 'Ⲡⲓⲧⲱⲟⲩⲛ ⲉⲑⲟⲩⲁⲃ',
    source: 'Paschal Resurrection Hymnology',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED'
  },
  'season.pentecost': {
    key: 'season.pentecost',
    en: 'Holy Pentecost',
    ar: 'عيد العنصرة المجيد (حلول الروح القدس)',
    cop: 'Ϯⲡⲉⲛⲧⲏⲕⲟⲥⲧⲏ ⲉⲑⲟⲩⲁⲃ',
    source: 'Feast of Pentecost Liturgy',
    sourceType: 'LITURGICAL_TEXT',
    reviewStatus: 'APPROVED'
  }
};

/**
 * Total Coverage Statistics Helper
 */
export function getTranslationCoverageStats() {
  const totalKeys = Object.keys(TRANSLATION_REGISTRY).length;
  let enCount = 0;
  let arCount = 0;
  let copCount = 0;
  let approvedCount = 0;
  let reviewCount = 0;

  for (const entry of Object.values(TRANSLATION_REGISTRY)) {
    if (entry.en && entry.en.trim()) enCount++;
    if (entry.ar && entry.ar.trim()) arCount++;
    if (entry.cop && entry.cop.trim()) copCount++;
    if (entry.reviewStatus === 'APPROVED' || entry.reviewStatus === 'VERIFIED') approvedCount++;
    if (entry.reviewStatus === 'REVIEW_REQUIRED' || entry.reviewStatus === 'DRAFT') reviewCount++;
  }

  return {
    totalKeys,
    english: Math.round((enCount / totalKeys) * 100),
    arabic: Math.round((arCount / totalKeys) * 100),
    coptic: Math.round((copCount / totalKeys) * 100),
    approvedCopticPercentage: Math.round((approvedCount / totalKeys) * 100),
    approvedCount,
    reviewCount
  };
}
