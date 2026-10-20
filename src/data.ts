import { 
  User, 
  Lesson, 
  Badge, 
  Post, 
  LeaderboardEntry, 
  Hymn,
  ClassSession,
  LessonSource,
  EvidenceMap,
  LessonOutline,
  LessonVersion,
  ServantComment,
  StudentContentProgress,
  StudentQuizAttempt,
  StudentMastery
} from './types';

export const mockHymns: Hymn[] = [
  {
    id: 'h1',
    titleEn: 'Golgotha',
    titleAr: 'جولجوثا',
    titleCopt: 'Ⲅⲟⲗⲅⲟⲑⲁ',
    descriptionEn: 'The solemn hymn chanted on Good Friday, reflecting on the crucifixion.',
    descriptionAr: 'اللحن الحزين الذي يُرتل يوم الجمعة العظيمة للتأمل في الصلب.',
    season: 'Holy Week',
    // Using a reliable placeholder MP3 to ensure playback works across all devices (Ogg format from wikimedia often fails on Safari/Mobile due to CORS or format issues).
    // In production, upload your authentic MP3s from trusted sources like St-Takla or Tasbeha to Firebase Storage and use those URLs here.
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 
    lyricsEn: "Golgotha, where He was crucified...\nThey gave Him vinegar to drink mingled with gall...",
    lyricsAr: "جولجوثا حيث صلبوه...\nأعطوه خلاً ممزوجاً بمرار...",
    lyricsCopt: "Ⲅⲟⲗⲅⲟⲑⲁ..."
  },
  {
    id: 'h2',
    titleEn: 'O Monogenis',
    titleAr: 'أو مونوجينيس',
    titleCopt: 'Ⲱ ⲙⲟⲛⲟⲅⲉⲛⲏⲥ',
    descriptionEn: 'The Only-Begotten Son, a theological hymn declaring the incarnation and redemption.',
    descriptionAr: 'الابن الوحيد، لحن لاهوتي يعلن التجسد والفداء.',
    season: 'Annual',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    lyricsEn: "O Only-Begotten Son and Word of God...\nWho for our salvation...",
    lyricsAr: "أيها الابن الوحيد وكلمة الله...\nالذي من أجل خلاصنا...",
    lyricsCopt: "Ⲱ ⲙⲟⲛⲟⲅⲉⲛⲏⲥ ⲩⲓⲟⲥ ⲕⲉ ⲗⲟⲅⲟⲥ..."
  },
  {
    id: 'h3',
    titleEn: 'Khen Oushot',
    titleAr: 'خين أوشوت',
    titleCopt: 'Ϧⲉⲛ ⲟⲩϣⲱⲧ',
    descriptionEn: 'First Hoos (Praise) sung during Midnight Praises, recounting the crossing of the Red Sea.',
    descriptionAr: 'الهوس الأول الذي يُرتل في تسبحة نصف الليل، يروي عبور البحر الأحمر.',
    season: 'Annual',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 
    lyricsEn: "Then Moses and the children of Israel...\nSang this song to the Lord...",
    lyricsAr: "حينئذ سبح موسى وبنو إسرائيل...\nبهذه التسبحة للرب...",
    lyricsCopt: "Ϧⲉⲛ ⲟⲩϣⲱⲧ ⲁϥϣⲱⲧ..."
  }
];

export const mockUser: User = {
  id: 'u1',
  fullName: 'Youssef Mina',
  role: 'student',
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Youssef',
  points: 850,
  currentStreak: 4,
  longestStreak: 12,
};

export const mockLessons: Lesson[] = [
  {
    id: 'l-cross-01',
    classSessionId: 'cs-cross-2026',
    title: 'The Feast of the Holy Cross & Queen Helena',
    titleAr: 'عيد الصليب المجيد والقديسة هيلانة',
    titleCop: 'Ⲡⲓⲥⲧⲁⲩⲣⲟⲥ ⲉⲑⲟⲩⲁⲃ',
    summary: 'Discover how Queen Helena uncovered the Life-Giving Cross in Jerusalem in 326 AD and why the Coptic Church celebrates with joyful hymns and basil.',
    summaryAr: 'اكتشف كيف عثرت القديسة هيلانة على الصليب المحيي في أورشليم سنة ٣٢٦م ولماذا تحتفل الكنيسة القبطية بالألحان الفرايحي والريحان.',
    summaryCop: 'Ⲡⲓⲥⲧⲁⲩⲣⲟⲥ ⲡⲉ ⲧⲉⲛϫⲟⲙ',
    status: 'published',
    date: '2026-09-17',
    ageGroup: '9-11 Years (Grades 4-5)',
    grade: '4th Grade',
    classGroupId: 'primary_2',
    teacherId: 't-mina-1',
    teacherName: 'Servant Mina (خادم رابعة ابتدائي)',
    pointsAvailable: 150,
    isCompleted: false,
    sourcesCount: 4,
    versionsCount: 2,
    approvedServantName: 'Servant Mina',
    approvedAt: '2026-09-17T11:30:00Z',
    quiz: [
      {
        question: 'In what year did Saint Helena discover the Holy Cross in Jerusalem?',
        options: ['326 AD', '70 AD', '451 AD'],
        correctIndex: 0,
        type: 'multiple_choice',
        sourceRef: 'Youth Bishopric Handout, Page 1'
      },
      {
        question: 'How did Bishop Macarius identify the True Cross of Christ?',
        options: ['A deceased young man arose alive when touched by it', 'By chemical test', 'By its height'],
        correctIndex: 0,
        type: 'multiple_choice',
        sourceRef: 'Servant Mina Classroom Audio 03:20'
      },
      {
        question: 'Complete the memory verse (1 Cor 1:18): "For the message of the cross is foolishness to those who are perishing, but to us who are being saved it is the..."',
        options: ['Power of God', 'Secret of joy', 'Wisdom of kings'],
        correctIndex: 0,
        type: 'multiple_choice',
        sourceRef: 'Youth Bishopric Handout, Page 3'
      }
    ]
  },
  {
    id: 'l1',
    title: 'The Story of St. Mina the Wonder-Worker',
    titleAr: 'سيرة الشهيد العظيم مارمينا العجائبي',
    titleCop: 'Ⲁⲡⲁ Ⲙⲏⲛⲁ',
    summary: 'Learn about the brave life of St. Mina, the wonder-worker of Egypt and patron of our faith.',
    summaryAr: 'تعرف على الشجاعة والإيمان في حياة الشهيد مارمينا العجائبي حامي الإيمان في مصر.',
    status: 'published',
    currentVersionId: 'ver-mina-v1',
    date: '2026-09-13',
    pointsAvailable: 150,
    isCompleted: false,
    sourcesCount: 2,
    versionsCount: 1,
    grade: '3rd & 4th Grade',
    classGroupId: 'primary_2',
    category: 'history',
    scriptureVerseEn: 'Be faithful until death, and I will give you the crown of life.',
    scriptureVerseAr: 'كن أميناً إلى الموت فسأعطيك إكليل الحياة. (رؤيا ٢: ١٠)',
    verseReference: 'Revelation 2:10 • رؤيا ٢: ١٠',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    audioUrl: 'https://cdn.freesound.org/previews/560/560446_12398463-lq.mp3',
    teacherNotes: 'Focus on how St. Mina left earthly military rank to serve the King of Kings with fearless love.',
    quiz: [
      {
        question: 'What earthly career did St. Mina leave to witness for Christ?',
        options: ['Roman army commander', 'Merchant', 'Fisherman'],
        correctIndex: 0,
        type: 'multiple_choice'
      },
      {
        question: 'Where is the historic great cathedral and monastery of St. Mina located?',
        options: ['Mariout desert near Alexandria', 'Jerusalem', 'Antioch'],
        correctIndex: 0,
        type: 'multiple_choice'
      },
      {
        question: 'What is our memory verse from Revelation 2:10?',
        options: ['Be faithful until death, and I will give you the crown of life', 'The Lord is my shepherd', 'In the beginning was the Word'],
        correctIndex: 0,
        type: 'multiple_choice'
      }
    ]
  },
  {
    id: 'l2',
    title: 'Noah and the Ark of Salvation',
    titleAr: 'نوح وفلك النجاة',
    titleCop: 'Ⲛⲱⲉ ⲛⲉⲙ ϯⲕⲓⲃⲱⲧⲟⲥ',
    summary: 'Discover how Noah trusted God and built a giant ark to save his family and creation.',
    summaryAr: 'اكتشف كيف وثق نوح بالله وبنى فلكاً عظيماً لخلاص أسرته والخليقة.',
    status: 'published',
    currentVersionId: 'ver-noah-v1',
    date: '2026-09-06',
    pointsAvailable: 150,
    isCompleted: false,
    sourcesCount: 3,
    versionsCount: 1,
    grade: '1st & 2nd Grade',
    classGroupId: 'primary_1',
    category: 'bible',
    scriptureVerseEn: 'By faith Noah, being divinely warned of things not yet seen, prepared an ark for the saving of his household.',
    scriptureVerseAr: 'بالإيمان نوح لما أُوحي إليه عن أمور لم تُرى بعد خاف فبنى فلكاً لخلاص بيته. (عبرانيين ١١: ٧)',
    verseReference: 'Hebrews 11:7 • عبرانيين ١١: ٧',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    audioUrl: 'https://cdn.freesound.org/previews/560/560446_12398463-lq.mp3',
    teacherNotes: 'Explain how the Ark is a beautiful symbol of the Church and baptism where God preserves us.',
    quiz: [
      {
        question: 'What bird did Noah send out that returned with an olive leaf?',
        options: ['A dove', 'A raven', 'An eagle'],
        correctIndex: 0,
        type: 'multiple_choice'
      },
      {
        question: 'What sign in the sky did God place as a covenant of peace?',
        options: ['The rainbow', 'The sun', 'A bright star'],
        correctIndex: 0,
        type: 'multiple_choice'
      },
      {
        question: 'How did Noah respond when God asked him to build the ark?',
        options: ['He obeyed with faithful trust', 'He refused', 'He ignored God'],
        correctIndex: 0,
        type: 'multiple_choice'
      }
    ]
  },
  {
    id: 'l-prep-01',
    title: 'The Courage of Daniel in Babylon',
    titleAr: 'شجاعة دانيال النبي في بابل',
    titleCop: 'Ⲇⲁⲛⲓⲏⲗ ⲡⲓⲡ̀ⲣⲟⲫⲏⲧⲏⲥ',
    summary: 'How Daniel and the Three Holy Youths remained faithful to God amidst worldly pressures and trials.',
    summaryAr: 'كيف ثبت دانيال والفتية القديسون في الإيمان وثقة الصلاة وسط تحديات وضغوط العالم.',
    status: 'published',
    currentVersionId: 'v-prep-01',
    date: '2026-09-20',
    pointsAvailable: 150,
    isCompleted: false,
    sourcesCount: 2,
    versionsCount: 1,
    grade: 'Prep 1',
    classGroupId: 'preparatory',
    category: 'bible',
    scriptureVerseEn: 'But Daniel purposed in his heart that he would not defile himself with the portion of the king’s delicacies.',
    scriptureVerseAr: 'أما دانيال فوضع في قلبه أنه لا يتنجس بأطايب الملك. (دانيال ١: ٨)',
    verseReference: 'Daniel 1:8 • دانيال ١: ٨',
    quiz: [
      {
        question: 'What did Daniel resolve in his heart regarding the king’s food?',
        options: ['Not to defile himself with it', 'To eat everything', 'To hide it'],
        correctIndex: 0,
        type: 'multiple_choice'
      },
      {
        question: 'How many times each day did Daniel open his window toward Jerusalem to pray?',
        options: ['Three times', 'Once', 'Seven times'],
        correctIndex: 0,
        type: 'multiple_choice'
      }
    ]
  },
  {
    id: 'l-sec-01',
    title: 'St. Stephen and the Power of Christian Witness',
    titleAr: 'القديس استفانوس وقوة الشهادة المسيحية',
    titleCop: 'Ⲁⲡⲁ Ⲥⲧⲉⲫⲁⲛⲟⲥ',
    summary: 'Exploring the fearless apologetics, sacrificial love, and forgiveness of the Archdeacon and Protomartyr in Acts.',
    summaryAr: 'دراسة الشهادة الشجاعة والمحبة والغفران في سيرة رئيس الشمامسة وأول الشهداء بسفر أعمال الرسل.',
    status: 'published',
    currentVersionId: 'v-sec-01',
    date: '2026-09-21',
    pointsAvailable: 150,
    isCompleted: false,
    sourcesCount: 3,
    versionsCount: 1,
    grade: 'Secondary 1',
    classGroupId: 'secondary',
    category: 'history',
    scriptureVerseEn: 'Lord, do not charge them with this sin.',
    scriptureVerseAr: 'يا رب، لا تقم لهم هذه الخطية. (أعمال الرسل ٧: ٦٠)',
    verseReference: 'Acts 7:60 • أعمال ٧: ٦٠',
    quiz: [
      {
        question: 'What office did St. Stephen hold in the early Apostolic Church?',
        options: ['Archdeacon (One of the Seven Deacons)', 'Soldier', 'Centurion'],
        correctIndex: 0,
        type: 'multiple_choice'
      },
      {
        question: 'What did St. Stephen say as he was being martyred, following the example of Christ?',
        options: ['Lord, do not charge them with this sin', 'Depart from me', 'I am innocent'],
        correctIndex: 0,
        type: 'multiple_choice'
      }
    ]
  }
];

export const mockBadges: Badge[] = [
  { id: 'b1', title: 'Faithful Seeker', pointsThreshold: 500, icon: 'Compass', unlockedAt: '2026-08-15' },
  { id: 'b2', title: 'Light Bearer', pointsThreshold: 1000, icon: 'Sun' },
  { id: 'b3', title: 'Brave Witness', pointsThreshold: 1500, icon: 'Shield' },
  { id: 'b4', title: 'Kingdom Builder', pointsThreshold: 2000, icon: 'Castle' },
];

export const mockLeaderboard: LeaderboardEntry[] = [
  { id: 'lb1', studentId: 's1', studentName: 'Mina S.', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mina', pointsThisWeek: 150, rank: 1 },
  { id: 'lb2', studentId: 's2', studentName: 'Mary G.', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mary', pointsThisWeek: 120, rank: 2 },
  { id: 'lb3', studentId: 'u1', studentName: 'Youssef M.', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Youssef', pointsThisWeek: 80, rank: 3 },
  { id: 'lb4', studentId: 's4', studentName: 'David A.', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David', pointsThisWeek: 50, rank: 4 },
  { id: 'lb5', studentId: 's5', studentName: 'Kirollos', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kirollos', pointsThisWeek: 40, rank: 5 },
  { id: 'lb6', studentId: 's6', studentName: 'Marina', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marina', pointsThisWeek: 30, rank: 6 },
  { id: 'lb7', studentId: 's7', studentName: 'Mark', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mark', pointsThisWeek: 20, rank: 7 },
];

export const mockPosts: Post[] = [
  {
    id: 'p0-photo',
    authorId: 't1',
    authorName: 'Father Bishoy (Priest)',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    content: 'بركة عيد الصليب المقدس مع جميع أولادنا في مدارس الأحد! صليب ربنا يسوع المسيح يحفظكم ويضيء قلوبكم. ☦️✨',
    reactions: { heart: 24, candle: 18, cross: 35 },
    comments: [
      {
        id: 'c0-1',
        authorName: 'Mina S.',
        content: 'كل سنة وقدسك طيب يا أبونا! يوم رائع جداً',
        createdAt: '2026-09-17T11:00:00Z',
        replies: []
      }
    ],
    createdAt: '2026-09-17T09:30:00Z',
    mediaType: 'image',
    mediaUrl: 'https://images.unsplash.com/photo-1548625361-195fe5795df5?w=1200&auto=format&fit=crop&q=80'
  },
  {
    id: 'p0-audio',
    authorId: 't2',
    authorName: 'Deacon George (Hymns Teacher)',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    content: 'تسجيل تدريب لحن "إفنوتي ناي نان" (يا الله ارحمنا) - استمعوا وتدربوا عليه قبل مدارس الأحد القادمة! 🎵⛪',
    reactions: { heart: 19, candle: 12, cross: 22 },
    comments: [],
    createdAt: '2026-09-16T18:00:00Z',
    mediaType: 'audio',
    mediaUrl: 'https://cdn.freesound.org/previews/560/560446_12398463-lq.mp3'
  },
  {
    id: 'p0-video',
    authorId: 't3',
    authorName: 'Servant Sandra (Sunday School)',
    authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    content: 'فيديو مراجعة قصة دانيال النبي في جب الأسود مع النشيد التفاعلي 🦁✝️',
    reactions: { heart: 15, candle: 9, cross: 14 },
    comments: [],
    createdAt: '2026-09-15T16:00:00Z',
    mediaType: 'youtube',
    mediaUrl: 'https://www.youtube-nocookie.com/embed/3v4g44fHj-U'
  },
  {
    id: 'p1',
    authorId: 's2',
    authorName: 'Mary G.',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mary',
    content: 'I just finished the lesson about Noah! 🕊️',
    reactions: { heart: 3, candle: 2, cross: 0 },
    comments: [
      {
        id: 'c1',
        authorName: 'Mina S.',
        content: 'That was a great lesson!',
        createdAt: '2026-09-14T10:30:00Z',
        replies: [
          {
            id: 'r1',
            authorName: 'Mary G.',
            content: 'Yes it was!',
            createdAt: '2026-09-14T10:45:00Z'
          }
        ]
      }
    ],
    createdAt: '2026-09-14T10:00:00Z',
  },
  {
    id: 'p2',
    authorId: 'u1',
    authorName: 'Youssef M.',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Youssef',
    content: 'Unlocked the Faithful Seeker badge! 🕯️ So happy!',
    reactions: { heart: 8, candle: 5, cross: 2 },
    comments: [],
    createdAt: '2026-09-13T15:30:00Z',
  }
];

// ==============================================================================
// Sunday School Vertical Slice: The Holy Cross & Queen Helena
// ==============================================================================

export const mockClassSessions: ClassSession[] = [
  {
    id: 'cs-cross-2026',
    classId: 'grade-4-st-musa',
    teacherId: 't-mina-1',
    teacherName: 'Servant Mina (خادم رابعة ابتدائي)',
    title: 'Feast of the Holy Cross & Queen Helena',
    topic: 'The Discovery of the Glorious Cross (عيد ظهور الصليب المقدس)',
    description: 'In-church class session taught on Sunday following the Feast of the Cross. Covers the historical search in Jerusalem, spiritual meaning of the Cross in Coptic Orthodox worship, and how we carry our cross daily.',
    date: '2026-09-17',
    ageGroup: '9-11 Years (Grades 4-5)',
    grade: '4th Grade',
    churchId: 'st-musa-abbey',
    status: 'PUBLISHED',
    allowInternetSearch: false, // Closed-source mode default!
    activeLessonId: 'l-cross-01',
    createdAt: '2026-09-17T09:00:00Z',
    updatedAt: '2026-09-17T11:45:00Z'
  },
  {
    id: 'cs-noah-2026',
    classId: 'grade-4-st-musa',
    teacherId: 't-mina-1',
    teacherName: 'Servant Mina (خادم رابعة ابتدائي)',
    title: 'Noah and the Ark of Salvation',
    topic: 'Faith, Obedience, and God’s Covenant',
    description: 'Lesson on Noah’s unwavering obedience, the Ark as a type of the Church, and the baptismal covenant.',
    date: '2026-09-10',
    ageGroup: '9-11 Years (Grades 4-5)',
    grade: '4th Grade',
    churchId: 'st-musa-abbey',
    status: 'PUBLISHED',
    allowInternetSearch: false,
    activeLessonId: 'l-noah-01',
    createdAt: '2026-09-10T09:00:00Z',
    updatedAt: '2026-09-10T11:30:00Z'
  }
];

export const mockSources: LessonSource[] = [
  {
    id: 'src-voice-cross',
    lessonId: 'l-cross-01',
    sessionId: 'cs-cross-2026',
    uploadedBy: 't-mina-1',
    type: 'TEACHER_VOICE',
    originalFilename: 'Servant_Mina_Cross_Lesson_Class_Audio.m4a',
    mimeType: 'audio/mp4',
    fileUrl: 'https://cdn.freesound.org/previews/560/560446_12398463-lq.mp3',
    fileSize: 12450000,
    durationSeconds: 495,
    description: 'Real audio recording of Servant Mina teaching the children in the Sunday School classroom on Sept 17, 2026.',
    teacherNotes: 'Spoke about Queen Helena’s journey to Golgotha, finding three crosses, and testing with the dead man who was raised to life.',
    rightsStatus: 'TEACHER_OWNED',
    processingStatus: 'INDEXED',
    priority: 'PRIMARY',
    transcript: `Morning children! Today we celebrate the Feast of the Holy Cross—Ⲡⲓⲥⲧⲁⲩⲣⲟⲥ in Coptic. In the 4th century, Queen Helena, mother of Emperor Constantine, went on a pilgrimage to Jerusalem. The holy cross had been hidden under a hill of dirt created by Hadrian to cover Golgotha. An elderly man named Judas revealed where it was. When they dug, they unearthed three wooden crosses! To know which one was Christ’s, Bishop Macarius of Jerusalem brought a deceased person on a stretcher. When touched by the true Cross of our Lord, the man immediately arose alive! The Cross is not a symbol of defeat; it is our strength: 'For the message of the cross is foolishness to those who are perishing, but to us who are being saved it is the power of God' (1 Cor 1:18).`,
    createdAt: '2026-09-17T09:30:00Z'
  },
  {
    id: 'src-pdf-curriculum',
    lessonId: 'l-cross-01',
    sessionId: 'cs-cross-2026',
    uploadedBy: 't-mina-1',
    type: 'PDF',
    originalFilename: 'Coptic_Sunday_School_Feast_of_Cross_Handout.pdf',
    mimeType: 'application/pdf',
    fileUrl: '/uploads/sample_cross_lesson_handout.pdf',
    fileSize: 2450000,
    pageCount: 3,
    description: 'Official Coptic Orthodox Bishopric of Youth Sunday School Curriculum sheet for 4th Grade.',
    teacherNotes: 'Focus on Section 2 for memory verse and Section 3 for spiritual application.',
    rightsStatus: 'CHURCH_OWNED',
    processingStatus: 'INDEXED',
    priority: 'PRIMARY',
    extractedContent: `[Page 1] Feast of the Appearance of the Holy Cross (17 Thout / 10 Baramhat).
Historical Background: Emperor Hadrian built a temple of Venus over Golgotha. In 326 AD, Saint Helena traveled to Jerusalem with a divine dream to locate the Cross.
[Page 2] The Miraculous Sign: Bishop Macarius held the three crosses over a dead youth. The third cross restored his life immediately. Constantine then built the Church of the Holy Sepulchre (Anastasis).
[Page 3] Memory Verse: "For the message of the cross is foolishness to those who are perishing, but to us who are being saved it is the power of God" (1 Corinthians 1:18).
Liturgical Practice: In the Coptic Church, we celebrate the Cross with Joyful (Frayhi) tunes, holding crosses adorned with basil leaves (rayhan) and lit candles.`,
    createdAt: '2026-09-17T09:35:00Z'
  },
  {
    id: 'src-pptx-slides',
    lessonId: 'l-cross-01',
    sessionId: 'cs-cross-2026',
    uploadedBy: 't-mina-1',
    type: 'PPTX',
    originalFilename: 'Holy_Cross_Grade4_Presentation.pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    fileUrl: '/uploads/sample_cross_slides.pptx',
    fileSize: 4200000,
    slideCount: 4,
    description: 'Teacher presentation slides projected on the classroom smart screen during the class.',
    teacherNotes: 'Includes map of 4th century Jerusalem and icons of Queen Helena.',
    rightsStatus: 'CHURCH_OWNED',
    processingStatus: 'INDEXED',
    priority: 'SUPPLEMENTARY',
    extractedContent: `[Slide 1] The Feast of the Holy Cross - St. Musa Sunday School Grade 4.
[Slide 2] Queen Helena's Quest in Jerusalem (326 A.D.) - Judas the guide, uncovering Golgotha.
[Slide 3] The Miracle of Life - The 3 Crosses, Bishop Macarius, The Resurrection Miracle.
[Slide 4] Why We Love the Cross - Sign of the Cross before prayer, basil leaves, 1 Cor 1:18.`,
    createdAt: '2026-09-17T09:40:00Z'
  },
  {
    id: 'src-image-icon',
    lessonId: 'l-cross-01',
    sessionId: 'cs-cross-2026',
    uploadedBy: 't-mina-1',
    type: 'IMAGE',
    originalFilename: 'Coptic_Icon_Queen_Helena_Holy_Cross.svg',
    mimeType: 'image/svg+xml',
    fileUrl: '/icon.svg',
    fileSize: 48000,
    description: 'Coptic Icon depicting Queen Helena and King Constantine holding the True Cross.',
    teacherNotes: 'Note the Coptic inscriptions and royal crowns.',
    rightsStatus: 'ORIGINAL',
    processingStatus: 'INDEXED',
    priority: 'SUPPLEMENTARY',
    extractedContent: `Visual Analysis: Traditional Neo-Coptic icon style. Queen Helena in imperial Byzantine-Coptic vestments holding the golden cross surmounted by rays of light. Inscribed in Coptic: Ϯⲁⲅⲓⲁ Ⲉⲗⲉⲛⲏ.`,
    createdAt: '2026-09-17T09:42:00Z'
  }
];

export const mockEvidenceMaps: Record<string, EvidenceMap> = {
  'l-cross-01': {
    mainTopicsEn: [
      'Queen Helena’s Pilgrimage to Jerusalem in 326 AD',
      'The Uncovering of Golgotha and the Three Crosses',
      'Bishop Macarius and the Miracle of the True Cross',
      'Spiritual Meaning of the Cross and Coptic Liturgical Traditions'
    ],
    mainTopicsAr: [
      'رحلة القديسة هيلانة إلى أورشليم سنة ٣٢٦م',
      'العثور على الجلجثة والصلبان الثلاثة',
      'الأنبا مكاريوس أسقف أورشليم ومعجزة الصليب المحيي',
      'المعنى الروحي للصليب والطقس القبطي المفرح'
    ],
    importantClaims: [
      {
        claimId: 'cl-1',
        statementEn: 'Emperor Hadrian had intentionally buried Golgotha under rubble to conceal Christian holy places.',
        statementAr: 'الإمبراطور هادريان ردم الجلجثة بالأتربة لإخفاء معالم الأماكن المقدسة المسيحية.',
        sourceId: 'src-pdf-curriculum',
        sourceName: 'Coptic_Sunday_School_Feast_of_Cross_Handout.pdf',
        sourceLocation: 'Page 1, Paragraph 2',
        quoteEn: '"In the second century, the pagan Emperor Hadrian erected a temple to Venus over the hill of Golgotha and cast mound of dirt and stones to erase all memory of the tomb of Christ."',
        quoteAr: '"في القرن الثاني، بنى الإمبراطور الوثني هادريان هيكلاً للزهرة فوق تل الجلجثة وألقى أكواماً من التراب والحجارة لمحو ذكرى قبر المسيح."',
        category: 'historical',
        verified: true,
        servantReviewStatus: 'APPROVED',
        servantReviewNote: 'Confirmed historically with Coptic Synaxarium records for 17 Thout.',
        reviewedBy: 'Servant Mina',
        reviewedAt: '2026-09-17T09:30:00Z'
      },
      {
        claimId: 'cl-2',
        statementEn: 'Queen Helena located the site with the assistance of an elderly resident named Judas.',
        statementAr: 'القديسة هيلانة اهتدت إلى موضع الصليب بمساعدة رجل شيخ يدعى يهوذا.',
        sourceId: 'src-voice-cross',
        sourceName: 'Servant_Mina_Cross_Lesson_Class_Audio.m4a',
        sourceLocation: 'Audio 01:45-02:20',
        quoteEn: '"Queen Helena gathered the elderly inhabitants of Jerusalem. A man named Judas, who kept the ancient oral traditions of his fathers, revealed the subterranean site beneath the dirt mounds."',
        quoteAr: '"جمعت الملكة هيلانة شيوخ أورشليم، فأرشدها رجل شيخ يُدعى يهوذا كان يحفظ التقاليد الشفاهية المتوارثة عن موقع الجلجثة تحت تلال الأتربة."',
        category: 'historical',
        verified: true,
        servantReviewStatus: 'APPROVED',
        servantReviewNote: 'Audio transcript verified; fits Grade 4-6 narrative well.',
        reviewedBy: 'Servant Mina',
        reviewedAt: '2026-09-17T09:32:00Z'
      },
      {
        claimId: 'cl-3',
        statementEn: 'The true Cross was distinguished from the two thieves’ crosses when a deceased youth was touched by it and restored to life.',
        statementAr: 'تميز صليب المسيح عن صليبي اللصين عندما وُضع على جثمان ميت فقام في الحال.',
        sourceId: 'src-voice-cross',
        sourceName: 'Servant_Mina_Cross_Lesson_Class_Audio.m4a',
        sourceLocation: 'Audio 03:10-04:05 & PDF Page 2',
        quoteEn: '"Bishop Macarius proposed placing each cross upon the body of a departed youth being carried to burial; when the third sacred wood was laid upon him, he arose immediately."',
        quoteAr: '"اقترح الأنبا مكاريوس وضع كل صليب على جثمان شاب متوفى كان يُحمل للدفن، وعندما وُضع الصليب الثالث قام الشاب فوراً بقوة الحياة الكامنة فيه."',
        category: 'theological',
        verified: true,
        servantReviewStatus: 'PENDING',
        servantReviewNote: 'Check whether children might ask about why the other crosses had no effect.',
        reviewedBy: 'Tasoni Mary',
        reviewedAt: '2026-09-18T14:10:00Z'
      },
      {
        claimId: 'cl-4',
        statementEn: 'The Coptic Church celebrates the Feast of the Cross twice yearly: 17 Thout and 10 Baramhat.',
        statementAr: 'تحتفل الكنيسة القبطية بعيد الصليب مرتين في العام: ١٧ توت و١٠ برمهات.',
        sourceId: 'src-pdf-curriculum',
        sourceName: 'Coptic_Sunday_School_Feast_of_Cross_Handout.pdf',
        sourceLocation: 'Page 1, Header',
        quoteEn: '"The Coptic Orthodox Church commemorates the Holy Cross twice: on 17 Thout (consecration of the Church of the Holy Sepulchre by St. Helena) and 10 Baramhat (discovery of the Cross in 326 AD)."',
        quoteAr: '"تحتفل الكنيسة القبطية الأرثوذكسية بعيد الصليب مرتين: في ١٧ توت (تدشين كنيسة القيامة) وفي ١٠ برمهات (ظهور الصليب على يد الملكة هيلانة سنة ٣٢٦م)."',
        category: 'liturgical',
        verified: true,
        servantReviewStatus: 'APPROVED',
        servantReviewNote: 'Core liturgical feast dates verified with Coptic Calendar.',
        reviewedBy: 'Servant Mina',
        reviewedAt: '2026-09-17T09:35:00Z'
      }
    ],
    bibleReferences: [
      {
        reference: '1 Corinthians 1:18',
        textEn: 'For the message of the cross is foolishness to those who are perishing, but to us who are being saved it is the power of God.',
        textAr: 'فإن كلمة الصليب عند الهالكين جهالة، وأما عندنا نحن المخلصين فهي قوة الله.',
        sourceId: 'src-pdf-curriculum',
        location: 'Page 2, Box A',
        quote: '1 Cor 1:18 memory verse'
      },
      {
        reference: 'Galatians 6:14',
        textEn: 'God forbid that I should boast except in the cross of our Lord Jesus Christ.',
        textAr: 'حاشا لي أن أفتخر إلا بصليب ربنا يسوع المسيح.',
        sourceId: 'src-voice-cross',
        location: 'Audio 04:30',
        quote: 'Galatians 6:14 closing prayer citation'
      }
    ],
    teacherExplanations: [
      'Servant Mina emphasized that the cross is not a sign of sadness, which is why the Coptic Church chants with Joyful (Frayhi) tunes on the Feast of the Cross.',
      'He instructed the children that when we make the sign of the cross from forehead to chest and left to right, we remember Christ coming from heaven to earth and transferring us from darkness to light.'
    ],
    conflicts: [
      {
        id: 'conf-cross-1',
        sourceAId: 'src-pdf-curriculum',
        sourceAName: 'Coptic_Sunday_School_Feast_of_Cross_Handout.pdf',
        sourceALocation: 'Page 1, Paragraph 1',
        sourceAQuote: '"Queen Helena set out on her royal journey to the Holy Land in the 20th year of Constantine’s reign, corresponding to 326 AD."',
        sourceBId: 'src-voice-cross',
        sourceBName: 'Servant_Mina_Cross_Lesson_Class_Audio.m4a',
        sourceBLocation: 'Audio 00:52',
        sourceBQuote: '"St. Helena’s journey began around 327-328 AD shortly after the Council of Nicaea."',
        conflictDescriptionEn: 'Discrepancy in the exact year Helena arrived in Jerusalem (326 AD vs 327/328 AD).',
        conflictDescriptionAr: 'اختلاف طفيف في تحديد سنة وصول القديسة هيلانة للقدس (٣٢٦م في المذكرة المكتوبة مقابل ٣٢٧-٣٢٨م في التسجيل الشفوي).',
        status: 'RESOLVED',
        resolutionNote: 'Teach the standard Synaxarium year (326 AD) while explaining that historical dates around the Council of Nicaea (325 AD) have minor scholarly variations.',
        resolvedBy: 'Servant Mina',
        resolvedAt: '2026-09-18T16:00:00Z'
      }
    ],
    unsupportedClaims: [
      'Note for servant review: Ensure students understand that Judas who revealed the site was later baptized as Cyriacus, distinct from Judas Iscariot.'
    ],
    reviewStatus: 'IN_REVIEW',
    lastReviewedBy: 'Servant Mina',
    lastReviewedAt: '2026-09-18T16:00:00Z'
  }
};

export const mockLessonOutlines: Record<string, LessonOutline> = {
  'l-cross-01': {
    id: 'out-cross-01',
    lessonId: 'l-cross-01',
    isApprovedByTeacher: true,
    approvedAt: '2026-09-17T10:15:00Z',
    sections: [
      {
        id: 'sec-1',
        order: 1,
        titleEn: '1. Queen Helena’s Sacred Quest (326 AD)',
        titleAr: '١. رحلة القديسة هيلانة المقدسة (سنة ٣٢٦م)',
        titleCop: 'Ϯⲁⲅⲓⲁ Ⲉⲗⲉⲛⲏ',
        objectiveEn: 'Understand why Queen Helena traveled to Jerusalem and how faith inspired her search.',
        objectiveAr: 'فهم دافع القديسة هيلانة لزيارة القدس والبحث عن خشبة الصليب المقدس بروح الصلاة والإيمان.',
        sourceRefs: [
          { sourceId: 'src-voice-cross', sourceName: 'Teacher Voice Audio', location: '00:45-02:10' },
          { sourceId: 'src-pdf-curriculum', sourceName: 'Curriculum Handout', location: 'Page 1' }
        ]
      },
      {
        id: 'sec-2',
        order: 2,
        titleEn: '2. Finding the Three Crosses & The Miracle of Life',
        titleAr: '٢. العثور على الصلبان الثلاثة ومعجزة القيامة',
        titleCop: 'Ⲡⲓⲥⲧⲁⲩⲣⲟⲥ ⲛ̀ⲧⲉ Ⲡⲭⲣⲓⲥⲧⲟⲥ',
        objectiveEn: 'Learn how Bishop Macarius verified the True Cross through the resurrection of the young man.',
        objectiveAr: 'معرفة كيفية تمييز صليب المخلص بواسطة معجزة إقامة الميت بصلوات الأسقف مكاريوس.',
        sourceRefs: [
          { sourceId: 'src-voice-cross', sourceName: 'Teacher Voice Audio', location: '02:40-04:15' },
          { sourceId: 'src-pdf-curriculum', sourceName: 'Curriculum Handout', location: 'Page 2' },
          { sourceId: 'src-pptx-slides', sourceName: 'Teacher Slides', location: 'Slide 3' }
        ]
      },
      {
        id: 'sec-3',
        order: 3,
        titleEn: '3. The Cross in Our Coptic Church Today',
        titleAr: '٣. مكانة الصليب في كنيستنا القبطية اليوم',
        titleCop: 'Ϧⲉⲛ ⲫ̀ⲣⲁⲛ ⲙ̀Ⲫⲓⲱⲧ',
        objectiveEn: 'Discover why we use basil leaves, joyous hymns, and sign the cross before every action.',
        objectiveAr: 'توضيح سبب استخدام الريحان والشموع واللحن الفرايحي وكيفية رسم إشارة الصليب بفخر.',
        sourceRefs: [
          { sourceId: 'src-pdf-curriculum', sourceName: 'Curriculum Handout', location: 'Page 3' },
          { sourceId: 'src-pptx-slides', sourceName: 'Teacher Slides', location: 'Slide 4' }
        ]
      }
    ]
  }
};

export const mockLessonVersions: Record<string, LessonVersion[]> = {
  'l-cross-01': [
    {
      id: 'ver-cross-v1',
      lessonId: 'l-cross-01',
      versionNumber: 1,
      status: 'REVISION_REQUESTED',
      createdBy: 'AI Pipeline (Closed-Source Mode)',
      createdAt: '2026-09-17T10:20:00Z',
      changeReason: 'Initial AI draft generated from 4 teacher sources.',
      summaryEn: 'Queen Helena journeyed to Jerusalem in 326 AD to locate the cross of Christ after it had been concealed under dirt.',
      summaryAr: 'سافرت الملكة هيلانة إلى أورشليم سنة ٣٢٦م للبحث عن صليب المسيح بعد أن طُمر تحت الأتربة.',
      summaryCop: 'Ⲡⲓⲥⲧⲁⲩⲣⲟⲥ ⲉⲑⲟⲩⲁⲃ',
      bigIdeaEn: 'The Cross is the source of life and victory for believers, not a sign of defeat.',
      bigIdeaAr: 'الصليب هو ينبوع الحياة والغلبة للمؤمنين وليس علامة هزيمة أو ضعف.',
      objectivesEn: [
        'Recall Queen Helena’s search in Jerusalem in 326 AD',
        'Explain how the True Cross was identified among the three crosses',
        'Memorize 1 Corinthians 1:18'
      ],
      objectivesAr: [
        'تذكر قصة بحث القديسة هيلانة في أورشليم سنة ٣٢٦م',
        'شرح معجزة إقامة الميت للتحقق من صليب الرب يسوع',
        'حفظ الآية: فإن كلمة الصليب عند الهالكين جهالة (١ كو ١: ١٨)'
      ],
      sections: [
        {
          id: 'sec-1',
          order: 1,
          titleEn: '1. Queen Helena’s Sacred Quest (326 AD)',
          titleAr: '١. رحلة القديسة هيلانة المقدسة (سنة ٣٢٦م)',
          titleCop: 'Ϯⲁⲅⲓⲁ Ⲉⲗⲉⲛⲏ',
          contentEn: 'In 326 AD, Saint Helena, the mother of Constantine the Great, traveled to Jerusalem. She wanted to locate the Cross upon which our Savior was crucified. Roman authorities had piled debris over Golgotha to conceal Christian worship sites.',
          contentAr: 'في عام ٣٢٦ للميلاد، توجهت القديسة هيلانة والدة الإمبراطور قسطنطين الكبير إلى أورشليم برغبة ملحة في العثور على خشبة الصليب المقدس. كان الإمبراطور هادريان قد أمر بردم موضع الجلجثة بالتراب لإخفاء معالم الأماكن المقدسة.',
          contentCop: 'Ϯⲁⲅⲓⲁ Ⲉⲗⲉⲛⲏ ⲁⲥϣⲉ ⲛⲁⲥ ⲉ̀Ⲓⲉⲣⲟⲩⲥⲁⲗⲏⲙ.',
          sourceRefs: [
            { sourceId: 'src-voice-cross', sourceName: 'Teacher Voice Audio', location: '00:45-02:10' },
            { sourceId: 'src-pdf-curriculum', sourceName: 'Curriculum Handout', location: 'Page 1' }
          ],
          teacherNotes: 'Initial draft lacked direct mention of Judas who guided Helena.'
        },
        {
          id: 'sec-2',
          order: 2,
          titleEn: '2. Finding the Three Crosses & The Miracle of Life',
          titleAr: '٢. العثور على الصلبان الثلاثة ومعجزة القيامة',
          titleCop: 'Ⲡⲓⲥⲧⲁⲩⲣⲟⲥ ⲛ̀ⲧⲉ Ⲡⲭⲣⲓⲥⲧⲟⲥ',
          contentEn: 'When the excavation reached the site, three crosses were unearthed. To know which belonged to Jesus, Bishop Macarius suggested testing them with a deceased person. When the true Cross touched him, he arose alive!',
          contentAr: 'أثناء الحفر، تم العثور على ثلاثة صلبان خشبية. ولتمييز صليب المسيح عن صليبي اللصين، اقترح الأنبا مكاريوس وضع الصلبان على ميت كان محمولاً للجنازة، فعندما لمسه صليب المسيح قام الميت حياً على الفور!',
          sourceRefs: [
            { sourceId: 'src-voice-cross', sourceName: 'Teacher Voice Audio', location: '02:40-04:15' },
            { sourceId: 'src-pdf-curriculum', sourceName: 'Curriculum Handout', location: 'Page 2' }
          ]
        },
        {
          id: 'sec-3',
          order: 3,
          titleEn: '3. The Cross in Our Coptic Church Today',
          titleAr: '٣. مكانة الصليب في كنيستنا القبطية اليوم',
          titleCop: 'Ϧⲉⲛ ⲫ̀ⲣⲁⲛ ⲙ̀Ⲫⲓⲱⲧ',
          contentEn: 'We decorate the cross with sweet basil leaves and light candles. We chant with joyful tunes because Christ transformed the cross from an instrument of death into a ladder to paradise.',
          contentAr: 'تزين الكنيسة الصليب بأغصان الريحان والورود والشموع، وترتل بالألحان الفرايحي المفرحة لأن الصليب صار لنا قوة وخلاصاً.',
          sourceRefs: [
            { sourceId: 'src-pdf-curriculum', sourceName: 'Curriculum Handout', location: 'Page 3' },
            { sourceId: 'src-pptx-slides', sourceName: 'Teacher Slides', location: 'Slide 4' }
          ]
        }
      ],
      recapEn: 'Queen Helena searched Jerusalem in 326 AD, three crosses were found, and the dead man raised proved Christ’s Cross. We sign the cross with faith and joy.',
      recapAr: 'بحثت القديسة هيلانة سنة ٣٢٦م في أورشليم، وعثرت على الصلبان الثلاثة، ومعجزة إقامة الميت أظهرت صليب المخلص. نرسم الصليب بإيمان وفرح.',
      flashcards: [
        {
          id: 'fc-1',
          frontEn: 'Who discovered the True Cross in 326 AD?',
          frontAr: 'من هي القديسة التي بحثت عن الصليب سنة ٣٢٦م؟',
          backEn: 'Queen Helena (Saint Helena), mother of Constantine the Great.',
          backAr: 'الملكة القديسة هيلانة، والدة الإمبراطور قسطنطين الكبير.',
          sourceRef: 'PDF Page 1'
        },
        {
          id: 'fc-2',
          frontEn: 'What is our memory verse for this lesson?',
          frontAr: 'ما هي الآية الذهبية لهذا الدرس؟',
          backEn: '1 Corinthians 1:18 - "For the message of the cross is foolishness to those who are perishing, but to us who are being saved it is the power of God."',
          backAr: '١ كورنثوس ١: ١٨ - "فإن كلمة الصليب عند الهالكين جهالة، وأما عندنا نحن المخلصين فهي قوة الله."',
          sourceRef: '1 Cor 1:18'
        }
      ],
      slides: [
        {
          number: 1,
          titleEn: 'Feast of the Holy Cross',
          titleAr: 'عيد الصليب المجيد',
          bulletsEn: ['Celebrated in the Coptic Church on 17 Thout and 10 Baramhat', 'Joyful (Frayhi) liturgical tunes and sweet basil'],
          bulletsAr: ['نحتفل به في الكنيسة يوم ١٧ توت و١٠ برمهات', 'طقس فرايحي مبهج مع الريحان العطر'],
          speakerNotesEn: 'Ask the children what they noticed in church this past Sunday during the procession.',
          speakerNotesAr: 'اسأل الأطفال عما لاحظوه في الكنيسة يوم الأحد الماضي أثناء دورة الصليب.',
          sourceRefs: [{ sourceId: 'src-pdf-curriculum', sourceName: 'Curriculum Handout', location: 'Page 1' }]
        },
        {
          number: 2,
          titleEn: 'Queen Helena in Jerusalem (326 AD)',
          titleAr: 'القديسة هيلانة في أورشليم (٣٢٦م)',
          bulletsEn: ['Traveled with prayer and imperial support', 'Located Golgotha buried under Roman debris', 'Guided by an elder named Judas'],
          bulletsAr: ['سافرت بروح الصلاة والصوم', 'حددت مكان الجلجثة المدفون تحت التل الترابي', 'أرشدها شيخ يدعى يهوذا'],
          speakerNotesEn: 'Explain how patient faith uncovers God’s treasures.',
          speakerNotesAr: 'شرح كيف يكشف الإيمان الصبور كنوز الله ونعمته.',
          sourceRefs: [{ sourceId: 'src-voice-cross', sourceName: 'Teacher Audio', location: '01:30' }]
        },
        {
          number: 3,
          titleEn: 'The Miracle of Resurrection',
          titleAr: 'معجزة إقامة الميت',
          bulletsEn: ['Three crosses were dug up', 'Bishop Macarius prayed for God to reveal Christ’s Cross', 'Touching the True Cross restored life to a deceased young man'],
          bulletsAr: ['تم استخراج ثلاثة صلبان خشبية', 'صلى الأنبا مكاريوس ليكشف الله صليب مخلصنا', 'بمجرد ملامسة صليب المسيح قام الميت حياً'],
          speakerNotesEn: 'Stress that the Cross gives life because the Lord of Life hung upon it.',
          speakerNotesAr: 'التأكيد على أن الصليب يحيي لأن رب الحياة ورئيس الخلاص عُلق عليه.',
          sourceRefs: [{ sourceId: 'src-voice-cross', sourceName: 'Teacher Audio', location: '03:15' }]
        },
        {
          number: 4,
          titleEn: 'Our Daily Victory in the Cross',
          titleAr: 'نصرتنا اليومية بعلامة الصليب',
          bulletsEn: ['Sign the cross upon waking, before meals, and before sleeping', '1 Corinthians 1:18: "The power of God"', 'We carry our cross with love and obedience'],
          bulletsAr: ['نرسم الصليب عند الاستيقاظ وقبل الأكل وقبل النوم', '١ كورنثوس ١: ١٨: "قوة الله"', 'نحمل صليبنا بمحبة وطاعة'],
          speakerNotesEn: 'Demonstrate making the sign of the cross with right hand from forehead to chest, left to right.',
          speakerNotesAr: 'تطبيق عملي: رسم إشارة الصليب باليد اليمنى من الجبهة للصدر ومن اليسار لليمين.',
          sourceRefs: [{ sourceId: 'src-pdf-curriculum', sourceName: 'Curriculum Handout', location: 'Page 3' }]
        }
      ],
      quizDraft: {
        id: 'quiz-draft-01',
        lessonId: 'l-cross-01',
        titleEn: 'Feast of the Holy Cross Review Assessment',
        titleAr: 'تقييم مراجعة درس عيد الصليب المجيد',
        instructionsEn: 'Take this quiz to test your comprehension. This is a separate review module, not lesson completion.',
        instructionsAr: 'أجب على هذه الأسئلة لاختبار فهمك. هذا تقييم منفصل عن إتمام محتوى الدرس.',
        status: 'REVIEW_REQUIRED',
        questions: [
          {
            id: 'q-cross-1',
            type: 'multiple_choice',
            questionEn: 'In what year did Saint Helena discover the Holy Cross in Jerusalem?',
            questionAr: 'في أي عام عثرت القديسة هيلانة على الصليب المقدس في أورشليم؟',
            optionsEn: ['326 AD', '70 AD', '451 AD'],
            optionsAr: ['٣٢٦ للميلاد', '٧٠ للميلاد', '٤٥١ للميلاد'],
            correctIndex: 0,
            explanationEn: 'Saint Helena went to Jerusalem in 326 AD during the reign of Constantine.',
            explanationAr: 'توجهت القديسة هيلانة إلى أورشليم سنة ٣٢٦م في عهد الملك البار قسطنطين.',
            sourceRef: {
              sectionId: 'sec-1',
              sectionTitle: 'Queen Helena’s Sacred Quest',
              sourceId: 'src-pdf-curriculum',
              location: 'Page 1, Paragraph 1'
            }
          },
          {
            id: 'q-cross-2',
            type: 'multiple_choice',
            questionEn: 'How did Bishop Macarius identify the True Cross of our Lord Jesus Christ?',
            questionAr: 'كيف تحقق الأنبا مكاريوس من صليب ربنا يسوع المسيح الحقيقي؟',
            optionsEn: [
              'By placing it on a deceased person who was immediately restored to life',
              'By reading an inscription written in Greek',
              'By its golden color'
            ],
            optionsAr: [
              'بوضعه على جثمان شخص ميت فقام حياً في الحال',
              'بقراءة نقش مكتوب عليه باليونانية',
              'من لونه الذهبي'
            ],
            correctIndex: 0,
            explanationEn: 'The true Cross of Christ brought the deceased person back to life by the power of God.',
            explanationAr: 'صليب المسيح المحيي أقام الميت بقوة الله الفائقة ليميزه عن صليبي اللصين.',
            sourceRef: {
              sectionId: 'sec-2',
              sectionTitle: 'Finding the Three Crosses & The Miracle of Life',
              sourceId: 'src-voice-cross',
              location: 'Teacher Audio 03:20'
            }
          },
          {
            id: 'q-cross-3',
            type: 'multiple_choice',
            questionEn: 'Complete the memory verse (1 Corinthians 1:18): "For the message of the cross is foolishness to those who are perishing, but to us who are being saved it is the..."',
            questionAr: 'أكمل الآية (١ كورنثوس ١: ١٨): "فإن كلمة الصليب عند الهالكين جهالة، وأما عندنا نحن المخلصين فهي..."',
            optionsEn: ['Power of God', 'Secret of happiness', 'Crown of gold'],
            optionsAr: ['قوة الله', 'سر السعادة', 'تاج الذهب'],
            correctIndex: 0,
            explanationEn: 'Saint Paul writes that the cross is the power of God unto salvation.',
            explanationAr: 'يعلن القديس بولس الرسول أن كلمة الصليب هي قوة الله لخلاصنا.',
            sourceRef: {
              sectionId: 'sec-3',
              sectionTitle: 'The Cross in Our Coptic Church Today',
              sourceId: 'src-pdf-curriculum',
              location: 'Page 3, Verse Box'
            }
          }
        ]
      },
      narrationScriptEn: 'Welcome to Sunday School! Today we learn how Saint Helena traveled to Jerusalem in 326 AD to recover the True Cross of Christ. Let us listen closely to the wondrous miracle of life.',
      narrationScriptAr: 'أهلاً بكم في مدارس الأحد! اليوم نتعلم كيف سافرت القديسة هيلانة إلى القدس سنة ٣٢٦م للبحث عن صليب مخلصنا، ونرى معجزة الحياة التي أعلنت مجده.',
      ttsStatus: 'NONE'
    },
    // VERSION 2: SERVANT REVIEWED AND APPROVED!
    {
      id: 'ver-cross-v2',
      lessonId: 'l-cross-01',
      versionNumber: 2,
      status: 'APPROVED',
      createdBy: 'Servant Mina (Edited & Approved)',
      createdAt: '2026-09-17T11:00:00Z',
      approvedBy: 'Servant Mina',
      approvedAt: '2026-09-17T11:30:00Z',
      approvalNote: 'Approved for Sunday School 4th Grade! Verified Coptic terminology (Ⲡⲓⲥⲧⲁⲩⲣⲟⲥ), confirmed biblical references (1 Cor 1:18), and verified all slides reflect our church classroom teaching.',
      changeReason: 'Updated Section 1 with elderly guide Judas, added authentic Coptic title, and resolved servant comments.',
      summaryEn: 'In 326 AD, Queen Helena made a holy pilgrimage to Jerusalem. With guidance from an elderly man named Judas, she cleared Golgotha and discovered the three crosses. Bishop Macarius identified Christ’s True Cross through a miraculous resurrection. In the Coptic Orthodox Church, we celebrate this joyous feast with sweet basil and frayhi tunes.',
      summaryAr: 'في عام ٣٢٦ للميلاد، قامت القديسة هيلانة برحلة حج مقدسة إلى أورشليم. وبإرشاد شيخ يدعى يهوذا، كشفت موضع الجلجثة واستخرجت الصلبان الثلاثة. أعلن الأنبا مكاريوس صليب المسيح بمعجزة إقامة ميت. تحتفل كنيستنا القبطية الأرثوذكسية بهذا العيد المفرح بالريحان واللحن الفرايحي.',
      summaryCop: 'Ⲡⲓⲥⲧⲁⲩⲣⲟⲥ ⲉⲑⲟⲩⲁⲃ',
      bigIdeaEn: 'The Cross of Christ is not a symbol of defeat or shame; it is God’s victory and the power of salvation that gives eternal life.',
      bigIdeaAr: 'صليب ربنا يسوع المسيح ليس علامة ضعف أو هزيمة، بل هو نصرة الله وقوة الخلاص التي تمنحنا الحياة الأبدية.',
      objectivesEn: [
        'Recall Queen Helena’s pilgrimage to Jerusalem in 326 AD and how she was guided by Judas to uncover Golgotha.',
        'Explain the miracle of the deceased man restored to life by Bishop Macarius using the True Cross.',
        'Recite and apply 1 Corinthians 1:18 in daily life whenever making the sign of the cross.',
        'Describe why sweet basil leaves and lit candles are used during the Coptic Feast of the Cross procession.'
      ],
      objectivesAr: [
        'تذكر رحلة القديسة هيلانة إلى أورشليم سنة ٣٢٦م وكيف أرشدها يهوذا لكشف الجلجثة.',
        'شرح معجزة إقامة الشاب الميت على يد الأنبا مكاريوس بواسطة صليب مخلصنا الصالح.',
        'حفظ وتطبيق آية ١ كورنثوس ١: ١٨ عند رسم إشارة الصليب في كل صلاة وعمل.',
        'توضيح سبب استخدام نبات الريحان العطر والشموع المضاءة في دورة الصليب بالكنيسة القبطية.'
      ],
      sections: [
        {
          id: 'sec-1',
          order: 1,
          titleEn: '1. Queen Helena’s Sacred Quest (326 AD)',
          titleAr: '١. رحلة القديسة هيلانة المقدسة والبحث عن الجلجثة (سنة ٣٢٦م)',
          titleCop: 'Ϯⲁⲅⲓⲁ Ⲉⲗⲉⲛⲏ Ϧⲉⲛ Ⲓⲉⲣⲟⲩⲥⲁⲗⲏⲙ',
          contentEn: 'In 326 AD, Saint Helena, the devout mother of Emperor Constantine the Great, traveled to the Holy City of Jerusalem. For nearly three hundred years, Roman Emperor Hadrian had deliberately buried Golgotha beneath a massive hill of soil and rubbish to hide the places of Christ’s suffering and resurrection. Queen Helena prayed fervently and met an elderly local resident named Judas who knew ancient oral traditions. He guided her workers to the exact spot on Mount Calvary.',
          contentAr: 'في سنة ٣٢٦ للميلاد، انطلقت الملكة البارة القديسة هيلانة، والدة الإمبراطور قسطنطين، في رحلة إيمانية إلى مدينة أورشليم المقدسة. كان الرومان بقيادة الإمبراطور هادريان قد طمروا موضع الجلجثة بركام هائل من الأتربة لطمس معالم صلب وقيامة السيد المسيح. صلت القديسة هيلانة بلجاجة والتقى بها شيخ من سكان المدينة يدعى يهوذا، حفظ تقليد الأجداد، وأرشد العمال إلى الموضع الدقيق على جبل الجلجثة.',
          contentCop: 'Ϯⲁⲅⲓⲁ Ⲉⲗⲉⲛⲏ ⲁⲥϣⲉ ⲛⲁⲥ ⲉ̀Ⲓⲉⲣⲟⲩⲥⲁⲗⲏⲙ ⲉ̀ⲕⲱϯ ⲛ̀ⲥⲁ Ⲡⲓⲥⲧⲁⲩⲣⲟⲥ.',
          sourceRefs: [
            { sourceId: 'src-voice-cross', sourceName: 'Servant Mina Classroom Audio', location: '00:45-02:15' },
            { sourceId: 'src-pdf-curriculum', sourceName: 'Youth Bishopric Handout', location: 'Page 1, Paragraph 2' },
            { sourceId: 'src-pptx-slides', sourceName: 'Teacher Slide 2', location: 'Slide 2' }
          ],
          teacherNotes: 'Corrected by Servant Mina: Added Judas the guide and Hadrian historical context as taught in church.'
        },
        {
          id: 'sec-2',
          order: 2,
          titleEn: '2. Uncovering the Three Crosses & The Miracle of Life',
          titleAr: '٢. كشف الصلبان الثلاثة ومعجزة إقامة الميت الباهرة',
          titleCop: 'Ⲡⲓⲥⲧⲁⲩⲣⲟⲥ ⲛ̀ⲧⲉ Ⲡⲭⲣⲓⲥⲧⲟⲥ ⲣⲉϥⲧⲁⲛϦⲟ',
          contentEn: 'After extensive digging, the workmen uncovered three wooden crosses together with the Title (INRI) written by Pontius Pilate. However, the wooden title was detached from the wood, so they could not tell which was our Lord’s Cross and which belonged to the two thieves. Saint Macarius, Bishop of Jerusalem, arrived with deep faith. A funeral procession carrying a deceased young man happened to pass by. The bishop requested them to stop. He placed the first cross on the dead youth—nothing happened. He placed the second cross—still nothing. But as soon as the third cross touched the young man, his eyes opened, his breath returned, and he arose completely healthy! All the people shouted with tears of awe: ‘Kyrie eleison! (Lord have mercy!)’',
          contentAr: 'بعد جهاد كبير في الحفر، استخرج العمال ثلاثة صلبان خشبية مع لوحة العنوان التي أمر بيلاطس بكتابتها، ولكن اللوحة كانت مفصولة فلم يستطيعوا معرفة أي منها هو صليب الرب يسوع وأيها لصليبي اللصين. حضر الأنبا مكاريوس أسقف أورشليم بوقار وصلاة. وتصادف مرور جنازة شاب ميت، فطلب الأسقف التوقف. وُضع الصليب الأول على الميت فلم يحدث شيء، ووُضع الصليب الثاني فلم يحدث شيء. وعندما وُضع الصليب الثالث، فتح الشاب عينيه وعادت روحه إليه وقام صحيحاً في الحال! فصرخ الجمع بدموع الفرح: "كيرياليسون.. يا رب ارحم!"',
          contentCop: 'Ⲡⲓⲥⲧⲁⲩⲣⲟⲥ ⲁϥⲧⲟⲩⲛⲟⲥ ⲡⲓⲣⲉϥⲙⲱⲟⲩⲧ ⲉ̀ⲡⲱⲛϦ.',
          sourceRefs: [
            { sourceId: 'src-voice-cross', sourceName: 'Servant Mina Classroom Audio', location: '02:45-04:20' },
            { sourceId: 'src-pdf-curriculum', sourceName: 'Youth Bishopric Handout', location: 'Page 2, Header & Miracle Box' },
            { sourceId: 'src-pptx-slides', sourceName: 'Teacher Slide 3', location: 'Slide 3' }
          ],
          teacherNotes: 'Confirmed authentic Coptic Synaxarium account: Bishop Macarius and the resurrection miracle.'
        },
        {
          id: 'sec-3',
          order: 3,
          titleEn: '3. The Feast of the Cross in Coptic Orthodox Worship',
          titleAr: '٣. طقس عيد الصليب في كنيستنا القبطية ومعنى الآية',
          titleCop: 'Ⲡⲓⲥⲧⲁⲩⲣⲟⲥ ⲡⲉ ⲧⲉⲛϫⲟⲙ',
          contentEn: 'The Coptic Church observes the Feast of the Holy Cross twice each year: on 17 Thout (commemorating the consecration of the Church of the Holy Sepulchre by Constantine and Helena) and on 10 Baramhat (commemorating the appearance of the Cross). During the liturgy, we pray with Joyful (Frayhi) tunes! Deacons and priests process throughout the church carrying crosses enveloped in sweet green basil (rayhan) and lit candles. The basil signifies the fragrance of Christ spreading throughout the earth, while candles represent the light that overcame darkness.',
          contentAr: 'تحتفل كنيستنا القبطية بعيد الصليب مرتين في السنة: ١٧ توت (تذكار تدشين كنيسة القيامة في أورشليم) و١٠ برمهات (تذكار ظهور الصليب المجيد). ونرتل في القداس باللحن الفرايحي المفرح! ويطوف الآباء الكهنة والشمامسة الكنيسة في دورة مهيبة حاملين الصلبان المزينة بالريحان الأخضر والشموع. فالريحان يرمز لرائحة المسيح الزكية التي انتشرت في العالم، والشموع ترمز إلى النور الذي بدد ظلمة القبر والخطية.',
          contentCop: 'Ⲁⲙⲱⲓⲛⲓ ⲧⲏⲣⲟⲩ ⲙ̀ⲫⲟⲟⲩ ⲛ̀ⲧⲉⲛⲟⲩⲱϣⲧ ⲙ̀Ⲡⲓⲥⲧⲁⲩⲣⲟⲥ.',
          sourceRefs: [
            { sourceId: 'src-pdf-curriculum', sourceName: 'Youth Bishopric Handout', location: 'Page 3' },
            { sourceId: 'src-pptx-slides', sourceName: 'Teacher Slide 4', location: 'Slide 4' }
          ],
          teacherNotes: 'Teacher verified: Rayhan (basil) and Frayhi tune explanation is essential for church child practice.'
        }
      ],
      recapEn: 'Queen Helena discovered the Cross in 326 AD in Jerusalem. Bishop Macarius witnessed the dead man raised by Christ’s Cross. In church we celebrate with basil, light, and joyful tunes. 1 Cor 1:18 reminds us that the Cross is the power of God.',
      recapAr: 'وجدت القديسة هيلانة الصليب سنة ٣٢٦م في أورشليم، والأنبا مكاريوس أظهر صليب المخلص بمعجزة إقامة الميت. نحتفل في كنيستنا بالريحان والشموع والألحان الفرايحي. ونتذكر دائماً: كلمة الصليب هي قوة الله (١ كو ١: ١٨).',
      flashcards: [
        {
          id: 'fc-1',
          frontEn: 'Who discovered the True Cross in 326 AD in Jerusalem?',
          frontAr: 'من هي القديسة التي عثرت على الصليب المقدس سنة ٣٢٦م في أورشليم؟',
          backEn: 'Queen Helena, mother of Constantine the Great, guided by Judas.',
          backAr: 'الملكة القديسة هيلانة والدة الملك قسطنطين الكبير بإرشاد يهوذا.',
          sourceRef: 'PDF Page 1'
        },
        {
          id: 'fc-2',
          frontEn: 'How was Christ’s Cross identified from among the three crosses?',
          frontAr: 'كيف تم التمييز بين صليب المسيح وصليبي اللصين؟',
          backEn: 'When placed on a deceased youth, he was immediately restored to life by God’s power.',
          backAr: 'عندما وُضع على جثمان شاب ميت، فتح عينيه وقام حياً بقوة الله.',
          sourceRef: 'Teacher Audio 03:20'
        },
        {
          id: 'fc-3',
          frontEn: 'Recite our Sunday School memory verse (1 Cor 1:18):',
          frontAr: 'اذكر آية الحفظ لمدارس الأحد (١ كو ١: ١٨):',
          backEn: '"For the message of the cross is foolishness to those who are perishing, but to us who are being saved it is the power of God."',
          backAr: '"فإن كلمة الصليب عند الهالكين جهالة، وأما عندنا نحن المخلصين فهي قوة الله."',
          sourceRef: '1 Cor 1:18'
        },
        {
          id: 'fc-4',
          frontEn: 'What does the sweet basil (rayhan) on the cross symbolize?',
          frontAr: 'إلى ماذا يرمز نبات الريحان العطر الموضوع على الصليب في الكنيسة؟',
          backEn: 'The sweet fragrance of Christ spreading throughout all creation.',
          backAr: 'رائحة المسيح الزكية الطيبة التي انتشرت في كل أرجاء المسكونة.',
          sourceRef: 'PDF Page 3'
        }
      ],
      slides: [
        {
          number: 1,
          titleEn: 'The Glorious Feast of the Holy Cross',
          titleAr: 'عيد الصليب المجيد - مدارس الأحد',
          bulletsEn: [
            'Commemorating the Appearance of the Life-Giving Cross',
            'Celebrated on 17 Thout and 10 Baramhat',
            'Joyful (Frayhi) tunes chanted with basil and candles'
          ],
          bulletsAr: [
            'تذكار ظهور خشبة الصليب المقدس المحيي',
            'نحتفل به في ١٧ توت و١٠ برمهات',
            'نرتل بالطقس الفرايحي مع الريحان الأخضر والشموع'
          ],
          speakerNotesEn: 'Welcome the children and show the Coptic Cross icon. Ask how many made the sign of the cross this morning.',
          speakerNotesAr: 'الترحيب بالأولاد وعرض أيقونة الصليب القبطي. سؤال الأولاد عن أول شيء فعلوه عند الاستيقاظ.',
          sourceRefs: [{ sourceId: 'src-pdf-curriculum', sourceName: 'Curriculum Handout', location: 'Page 1' }]
        },
        {
          number: 2,
          titleEn: 'Queen Helena’s Quest in Jerusalem (326 AD)',
          titleAr: 'رحلة القديسة هيلانة في أورشليم (٣٢٦م)',
          bulletsEn: [
            'Empress Helena, mother of King Constantine, was filled with holy zeal',
            'Emperor Hadrian had buried Golgotha beneath a garbage mound',
            'Guided by an elder named Judas to the holy site'
          ],
          bulletsAr: [
            'الملكة البارة هيلانة والدة الملك قسطنطين امتلكت غيرة مقدسة',
            'الإمبراطور هادريان ردم الجلجثة بتل ترابي لإخفاء موضع الصلب',
            'أرشدها شيخ حكيم يدعى يهوذا إلى الموضع المقدس'
          ],
          speakerNotesEn: 'Point out that nothing can bury God’s truth forever; truth always rises.',
          speakerNotesAr: 'التأكيد على أنه لا يمكن طمس عمل الله، فالحق الإلهي ينتصر دائماً.',
          sourceRefs: [{ sourceId: 'src-voice-cross', sourceName: 'Servant Mina Audio', location: '01:45' }]
        },
        {
          number: 3,
          titleEn: 'The Resurrection Miracle of Bishop Macarius',
          titleAr: 'معجزة القيامة بشهادة الأنبا مكاريوس',
          bulletsEn: [
            'Three crosses uncovered together with Pilate’s Title',
            'Bishop Macarius stopped a funeral procession carrying a dead youth',
            'The third cross touched him, and he arose alive in front of all!'
          ],
          bulletsAr: [
            'استخراج ثلاثة صلبان مع لوحة عنوان بيلاطس البنطي',
            'الأنبا مكاريوس أوقف جنازة شاب ميت لطلب معونة السماء',
            'بمجرد ملامسة الصليب الثالث قام الشاب حياً ومشى أمام الجميع!'
          ],
          speakerNotesEn: 'Remind the children that Christ conquered death on this very wood.',
          speakerNotesAr: 'تذكير الأطفال بأن المسيح غلب الموت بسلطانه على خشبة هذا الصليب.',
          sourceRefs: [{ sourceId: 'src-voice-cross', sourceName: 'Servant Mina Audio', location: '03:15' }]
        },
        {
          number: 4,
          titleEn: '1 Corinthians 1:18 - The Power of God',
          titleAr: 'كلمة الصليب هي قوة الله (١ كو ١: ١٨)',
          bulletsEn: [
            '"For the message of the cross is foolishness to those who are perishing, but to us who are being saved it is the power of God."',
            'We make the sign of the cross before prayer, study, and sleep',
            'The Cross protects and sanctifies our thoughts and actions'
          ],
          bulletsAr: [
            '"فإن كلمة الصليب عند الهالكين جهالة، وأما عندنا نحن المخلصين فهي قوة الله."',
            'نرسم الصليب بفخر قبل الصلاة والمذاكرة والنوم',
            'الصليب يحفظنا ويقدس عقولنا وحياتنا في المسيح'
          ],
          speakerNotesEn: 'Have the children stand up and recite the verse in unison.',
          speakerNotesAr: 'وقوف جميع الأولاد وترديد الآية الذهبية بصوت واحد وواضح.',
          sourceRefs: [{ sourceId: 'src-pdf-curriculum', sourceName: 'Curriculum Handout', location: 'Page 3' }]
        }
      ],
      quizDraft: {
        id: 'quiz-draft-02',
        lessonId: 'l-cross-01',
        titleEn: 'Feast of the Holy Cross Review Assessment',
        titleAr: 'تقييم مراجعة درس عيد الصليب المجيد',
        instructionsEn: 'Complete this review quiz to test your understanding of the lesson taught in class. Remember: this quiz tests knowledge, while lesson mastery is reviewed by your Sunday School servant.',
        instructionsAr: 'أجب على هذا الاختبار لمراجعة استيعابك للدرس المشروح بالكنيسة. تذكر: هذا الاختبار يفحص معلوماتك، بينما مراجعة الإتقان تتم بواسطة خادمك.',
        status: 'APPROVED',
        questions: [
          {
            id: 'q-cross-1',
            type: 'multiple_choice',
            questionEn: 'In what year did Saint Helena discover the Holy Cross in Jerusalem?',
            questionAr: 'في أي عام عثرت القديسة هيلانة على خشبة الصليب المقدس في أورشليم؟',
            optionsEn: ['326 AD', '70 AD', '451 AD'],
            optionsAr: ['٣٢٦ للميلاد', '٧٠ للميلاد', '٤٥١ للميلاد'],
            correctIndex: 0,
            explanationEn: 'Saint Helena undertook her pilgrimage to Jerusalem in 326 AD during Constantine’s reign.',
            explanationAr: 'قامت القديسة هيلانة برحلتها المباركة إلى أورشليم سنة ٣٢٦م في عهد ابنها الملك قسطنطين.',
            sourceRef: {
              sectionId: 'sec-1',
              sectionTitle: 'Queen Helena’s Sacred Quest',
              sourceId: 'src-pdf-curriculum',
              location: 'Page 1, Paragraph 2'
            }
          },
          {
            id: 'q-cross-2',
            type: 'multiple_choice',
            questionEn: 'Who helped guide Queen Helena to the covered site of Golgotha?',
            questionAr: 'من هو الشخص الذي ساعد القديسة هيلانة وأرشدها إلى موضع الجلجثة المدفون؟',
            optionsEn: ['An elderly resident named Judas', 'Pontius Pilate', 'A Roman centurion'],
            optionsAr: ['شيخ من أهل المدينة يدعى يهوذا', 'بيلاطس البنطي', 'قائد مئة روماني'],
            correctIndex: 0,
            explanationEn: 'An elder named Judas preserved the oral tradition regarding Mount Calvary and guided the dig.',
            explanationAr: 'رجل شيخ يدعى يهوذا كان يحفظ موضع الجلجثة عن آبائه وأرشد عمال القديسة هيلانة.',
            sourceRef: {
              sectionId: 'sec-1',
              sectionTitle: 'Queen Helena’s Sacred Quest',
              sourceId: 'src-voice-cross',
              location: 'Teacher Audio 01:50'
            }
          },
          {
            id: 'q-cross-3',
            type: 'multiple_choice',
            questionEn: 'How did Bishop Macarius distinguish Christ’s Cross from the two thieves’ crosses?',
            questionAr: 'كيف ميز الأنبا مكاريوس صليب السيد المسيح عن صليبي اللصين؟',
            optionsEn: [
              'A deceased young man arose alive immediately when touched by the third cross',
              'By testing the type of wood in a laboratory',
              'By measuring which cross was the tallest'
            ],
            optionsAr: [
              'قام شاب ميت حياً على الفور بمجرد ملامسة الصليب الثالث لجسده',
              'بفحص نوع الخشب في المعمل',
              'بقياس أطول الصلبان حجماً'
            ],
            correctIndex: 0,
            explanationEn: 'The true Cross of Christ brought the deceased youth back to life through God’s divine power.',
            explanationAr: 'صليب الرب يسوع المحيي وهب الحياة للشاب الميت بقوة الله الصانعة المعجزات.',
            sourceRef: {
              sectionId: 'sec-2',
              sectionTitle: 'Uncovering the Three Crosses & The Miracle of Life',
              sourceId: 'src-voice-cross',
              location: 'Teacher Audio 03:20'
            }
          },
          {
            id: 'q-cross-4',
            type: 'multiple_choice',
            questionEn: 'Complete our memory verse (1 Corinthians 1:18): "For the message of the cross is foolishness to those who are perishing, but to us who are being saved it is the..."',
            questionAr: 'أكمل الآية الذهبية (١ كورنثوس ١: ١٨): "فإن كلمة الصليب عند الهالكين جهالة، وأما عندنا نحن المخلصين فهي..."',
            optionsEn: ['Power of God', 'Knowledge of men', 'Mystery of angels'],
            optionsAr: ['قوة الله', 'معرفة البشر', 'سر الملائكة'],
            correctIndex: 0,
            explanationEn: 'Saint Paul declares that the cross is the power of God unto salvation for believers.',
            explanationAr: 'يؤكد معلمنا بولس الرسول أن كلمة الصليب هي قوة الله الحقيقية لخلاصنا الأبدي.',
            sourceRef: {
              sectionId: 'sec-3',
              sectionTitle: 'The Feast of the Cross in Coptic Orthodox Worship',
              sourceId: 'src-pdf-curriculum',
              location: 'Page 3, Verse Box'
            }
          },
          {
            id: 'q-cross-5',
            type: 'multiple_choice',
            questionEn: 'Why do Coptic priests and deacons decorate the cross with sweet basil (rayhan) during the feast?',
            questionAr: 'لماذا يُزين الصليب بنبات الريحان العطر الأخضر في دورة عيد الصليب بالكنيسة؟',
            optionsEn: [
              'Because its sweet fragrance symbolizes Christ’s life-giving aroma filling the earth',
              'Because basil was the only plant in Egypt',
              'Because basil changes color'
            ],
            optionsAr: [
              'لأن رائحته الذكية ترمز لرائحة المسيح الطيبة التي انتشرت في العالم بالصليب',
              'لأن الريحان هو النبات الوحيد في مصر',
              'لأن الريحان يغير لونه في العيد'
            ],
            correctIndex: 0,
            explanationEn: 'Sweet basil is an evergreen, aromatic plant representing the fragrance of Christ and the living wood of the cross.',
            explanationAr: 'الريحان نبات طيب الرائحة ودائم الخضرة يرمز لانتشار رائحة المسيح الزكية بالصليب.',
            sourceRef: {
              sectionId: 'sec-3',
              sectionTitle: 'The Feast of the Cross in Coptic Orthodox Worship',
              sourceId: 'src-pdf-curriculum',
              location: 'Page 3'
            }
          }
        ]
      },
      narrationScriptEn: 'Peace and grace, beloved children of St. Musa Church. Welcome to our Sunday School lesson on the Feast of the Holy Cross. In the year 326 AD, Saint Helena made a holy journey to Jerusalem. Today we discover how through deep prayer and the miracle of life, the glorious Cross of our Lord was revealed to the entire world. Listen closely, follow along with the slides, and learn why we make the sign of the cross with love and courage.',
      narrationScriptAr: 'سلام ونعمة يا أحبائي أولاد كنيسة القديس موسى الأسود. أهلاً بكم في درس مدارس الأحد عن عيد الصليب المجيد. في سنة ٣٢٦ للميلاد، سافرت القديسة هيلانة إلى أورشليم بروح الصلاة والرجاء. واليوم نكتشف كيف أعلن الله صليب مخلصنا بمعجزة الحياة الباهرة. استمعوا باهتمام، وتابعوا الشرائح، وتذكروا دائماً أن ترسموا علامة الصليب بإيمان وفخر.',
      ttsAudioUrlEn: 'https://cdn.freesound.org/previews/560/560446_12398463-lq.mp3',
      ttsAudioUrlAr: 'https://cdn.freesound.org/previews/560/560446_12398463-lq.mp3',
      ttsStatus: 'GENERATED'
    }
  ],
  'l1': [
    {
      id: 'ver-mina-v1',
      lessonId: 'l1',
      versionNumber: 1,
      status: 'PUBLISHED',
      createdBy: 'Servant Mina',
      createdAt: '2026-09-13T10:00:00Z',
      approvedBy: 'Servant Mina',
      approvedAt: '2026-09-13T11:00:00Z',
      summaryEn: 'Saint Mina was a courageous young Egyptian soldier who gave up his high military rank to fearlessly proclaim Jesus Christ. He worked wondrous miracles and became a beloved patron of our Coptic Church.',
      summaryAr: 'الشهيد مارمينا العجائبي كان جندياً مصرياً شجاعاً ترك رتبته العسكرية ليعترف بإيمانه بالسيد المسيح دون خوف. صنع معجزات باهرة وصار شفيعاً محبوباً لكنيستنا القبطية.',
      summaryCop: 'Ⲁⲡⲁ Ⲙⲏⲛⲁ ⲡⲓⲙⲁⲣⲧⲩⲣⲟⲥ',
      bigIdeaEn: 'True courage comes from loving God more than earthly titles or fear of men.',
      bigIdeaAr: 'الشجاعة الحقيقية تنبع من محبة الله فوق كل مناصب الأرض ومخاوف البشر.',
      objectivesEn: [
        'Understand why St. Mina left the army to withdraw to the desert in prayer.',
        'Learn how St. Mina boldly confessed his faith before the ruler.',
        'Memorize Revelation 2:10.'
      ],
      objectivesAr: [
        'فهم لماذا ترك مارمينا الجندية وتوجه للبرية للصلاة والاعتكاف.',
        'تعلم كيف اعترف مارمينا بشجاعة أمام الوالي الروماني.',
        'حفظ آية: كن أميناً إلى الموت فسأعطيك إكليل الحياة (رؤيا ٢: ١٠).'
      ],
      sections: [
        {
          id: 'sec-mina-1',
          order: 1,
          titleEn: '1. The Young Officer of Faith',
          titleAr: '١. الضابط الشاب المتمسك بإيمانه',
          titleCop: 'Ⲁⲡⲁ Ⲙⲏⲛⲁ ϧⲉⲛ ϯⲥⲧⲣⲁϯⲁ',
          contentEn: 'Mina was born in Egypt to pious parents, Eudoxius and Euphemia. Because of his honesty and valor, he was appointed as a commander in the Roman army in Phrygia. When Emperor Diocletian commanded worship of false idols, Mina cast down his military belt and proclaimed that he belonged to Jesus Christ.',
          contentAr: 'وُلد مارمينا في مصر لأبوين تقيين، أوودوكسيوس وأوفيمية. ولأمانته وشجاعته عُين قائداً في الجيش الروماني. وعندما أصدر دقلديانوس أمره بعبادة الأوثان، ألقى مارمينا منطقة جنديته العسكرية وأعلن أنه خادم للمسيح الملك الحقيقي.',
          contentCop: 'Ⲁⲡⲁ Ⲙⲏⲛⲁ ⲡⲓⲣⲉϥϣⲉⲙϣⲓ ⲙ̀Ⲡⲭⲣⲓⲥⲧⲟⲥ.',
          sourceRefs: [{ sourceId: 'src-synaxarium', sourceName: 'Coptic Synaxarium 15 Hathor', location: 'Page 1' }]
        },
        {
          id: 'sec-mina-2',
          order: 2,
          titleEn: '2. Bold Witness & Heavenly Crown',
          titleAr: '٢. الشهادة الجريئة ونيل الأكاليل السماوية',
          titleCop: 'Ⲡⲓⲭⲗⲟⲙ ⲛ̀ⲧⲉ ϯⲙⲉⲑⲙⲁⲣⲧⲩⲣⲟⲥ',
          contentEn: 'After solitary prayer and fasting in the mountains, Mina returned on a festival day and proclaimed Christ before the stadium crowd. Neither threats nor promises could turn his heart. He received the crown of martyrdom and became known across the world as the Wonder-Worker.',
          contentAr: 'بعد فترة من الصلاة والصوم في الجبال، عاد مارمينا في يوم الاحتفال وصرخ في وسط الملعب معترفاً بالمسيح. لم تثنه التهديدات ولا الإغراءات، ونال إكليل الشهادة الأبدي وصار مشهوراً في العالم بـ"العجائبي".',
          contentCop: 'Ⲁϥϭⲓ ⲙ̀ⲡⲓⲭⲗⲟⲙ ⲛ̀ⲧⲉ ⲡⲱⲛϦ.',
          sourceRefs: [{ sourceId: 'src-synaxarium', sourceName: 'Coptic Synaxarium', location: 'Page 2' }]
        }
      ],
      slides: [
        {
          number: 1,
          titleEn: 'St. Mina the Wonder-Worker',
          titleAr: 'الشهيد العظيم مارمينا العجائبي',
          bulletsEn: ['Patron saint of Egypt and beloved protector', 'Left earthly prestige for the Kingdom of Heaven', 'Feast celebrated on 15 Hathor'],
          bulletsAr: ['حامي الإيمان وشفيع مصر المحبوب', 'ترك الرتبة العسكرية من أجل ملكوت السماوات', 'عيده في ١٥ هاتور']
        },
        {
          number: 2,
          titleEn: 'Courage to Stand for Truth',
          titleAr: 'شجاعة الثبات على الحق',
          bulletsEn: ['Prayed in the wilderness', 'Confessed Christ before the Roman governor', 'Revelation 2:10: "Be faithful until death"'],
          bulletsAr: ['صلى في البرية لطلب القوة الإلهية', 'اعترف بالمسيح أمام الوالي الروماني', 'رؤيا ٢: ١٠: "كن أميناً إلى الموت"']
        }
      ],
      flashcards: [
        {
          id: 'fc-m-1',
          frontEn: 'Who were the pious parents of St. Mina?',
          frontAr: 'من هما والدا الشهيد مارمينا؟',
          backEn: 'Eudoxius and Euphemia.',
          backAr: 'أوودوكسيوس وأوفيمية.'
        },
        {
          id: 'fc-m-2',
          frontEn: 'What is our memory verse (Rev 2:10)?',
          frontAr: 'ما هي الآية الذهبية لدرس مارمينا (رؤيا ٢: ١٠)؟',
          backEn: '"Be faithful until death, and I will give you the crown of life."',
          backAr: '"كن أميناً إلى الموت فسأعطيك إكليل الحياة."'
        }
      ],
      quizDraft: {
        id: 'quiz-mina-01',
        lessonId: 'l1',
        titleEn: 'St. Mina Review Quiz',
        titleAr: 'اختبار مراجعة درس مارمينا العجائبي',
        instructionsEn: 'Tiered review quiz with point multipliers for St. Mina.',
        instructionsAr: 'اختبار مراجعة متدرج الصعوبة مع نقاط مضاعفة.',
        status: 'APPROVED',
        questions: [
          {
            id: 'qm-1',
            type: 'multiple_choice',
            difficulty: 'EASY',
            points: 10,
            questionEn: 'What position did St. Mina hold before his martyrdom?',
            questionAr: 'ما الرتبة التي كان يشغلها مارمينا قبل استشهاده؟',
            optionsEn: ['Officer in the army', 'Sailor', 'Baker'],
            optionsAr: ['ضابط في الجيش الروماني', 'بحار', 'خباز'],
            correctIndex: 0,
            explanationEn: 'Mina was an honored military commander who laid down his sword for Christ.',
            explanationAr: 'كان مارمينا قائداً عسكرياً شجاعاً ترك سيفه من أجل المسيح.'
          },
          {
            id: 'qm-2',
            type: 'multiple_choice',
            difficulty: 'MEDIUM',
            points: 20,
            questionEn: 'Where did St. Mina withdraw to fast and pray before his public witness?',
            questionAr: 'إلى أين توجه مارمينا للصوم والصلاة قبل أن يشهد علناً؟',
            optionsEn: ['To the solitary mountains and desert', 'To Rome', 'To Alexandria harbor'],
            optionsAr: ['إلى الجبال والبرية للاعتكاف', 'إلى روما', 'إلى ميناء الإسكندرية'],
            correctIndex: 0,
            explanationEn: 'He spent time in prayer in the desert to receive divine strength from God.',
            explanationAr: 'اعتكف في البرية مصلّياً ليمتلئ بالقوة والمعونة الإلهية.'
          },
          {
            id: 'qm-3',
            type: 'multiple_choice',
            difficulty: 'HARD',
            points: 30,
            questionEn: 'Complete Revelation 2:10: "Be faithful until death, and I will give you..."',
            questionAr: 'أكمل الآية (رؤيا ٢: ١٠): "كن أميناً إلى الموت فسأعطيك..."',
            optionsEn: ['The crown of life', 'The gold of kings', 'The shield of bronze'],
            optionsAr: ['إكليل الحياة', 'ذهب الملوك', 'درع النحاس'],
            correctIndex: 0,
            explanationEn: 'The Lord promises the heavenly crown of life to those who remain faithful.',
            explanationAr: 'وعد الرب بإكليل الحياة الأبدية لكل من يثبت في الأمانة حتى النهاية.'
          }
        ]
      }
    }
  ],
  'l2': [
    {
      id: 'ver-noah-v1',
      lessonId: 'l2',
      versionNumber: 1,
      status: 'PUBLISHED',
      createdBy: 'Servant Mina',
      createdAt: '2026-09-06T10:00:00Z',
      approvedBy: 'Servant Mina',
      approvedAt: '2026-09-06T11:00:00Z',
      summaryEn: 'Noah was a righteous man who walked with God. By faith, he built a massive ark according to God’s divine blueprint to preserve his family and animals from the flood.',
      summaryAr: 'كان نوح رجلاً باراً سار مع الله بأمانة. وبالإيمان بنى فلكاً عظيماً بحسب التصميم الإلهي ليحفظ أسرته والكائنات الحية من الطوفان.',
      summaryCop: 'Ⲛⲱⲉ ⲛⲉⲙ ϯⲕⲓⲃⲱⲧⲟⲥ',
      bigIdeaEn: 'Trusting and obeying God brings safety and life, even when everyone else doubts.',
      bigIdeaAr: 'الثقة في وصايا الله وطاعتها تمنحنا النجاة والحياة حتى لو شك الجميع من حولنا.',
      objectivesEn: [
        'Learn why God chose Noah to build the Ark.',
        'Understand the symbol of the Ark as the Church of salvation.',
        'Memorize Hebrews 11:7.'
      ],
      objectivesAr: [
        'معرفة سبب اختيار الله لنوح البار لبناء الفلك.',
        'فهم أن الفلك هو رمز للكنيسة وسفينة خلاصنا.',
        'حفظ آية: بالإيمان نوح بنى فلكاً لخلاص بيته (عبرانيين ١١: ٧).'
      ],
      sections: [
        {
          id: 'sec-noah-1',
          order: 1,
          titleEn: '1. Building the Ark by Faith',
          titleAr: '١. بناء الفلك بروح الإيمان والطاعة',
          titleCop: 'Ⲛⲱⲉ ⲁϥⲕⲱⲧ ⲛ̀ϯⲕⲓⲃⲱⲧⲟⲥ',
          contentEn: 'God saw that Noah was righteous and faithful. He instructed him to construct an ark of gopher wood with three decks, a window, and a door on its side. Although it had never rained so heavily, Noah trusted God completely and worked tirelessly.',
          contentAr: 'رأى الله أن نوحاً كان باراً في جيله ويسلك بالأمانة. أمره أن يصنع فلكاً من خشب السنت بثلاثة طوابق وطاقة وباب في جانبه. ورغم استغراب الناس، أطاع نوح الله بكل قلبه وبنى الفلك خطوة بخطوة.',
          contentCop: 'Ⲛⲱⲉ ⲁϥⲥⲱⲧⲉⲙ ⲛ̀ⲥⲁ Ⲫϯ.',
          sourceRefs: [{ sourceId: 'src-bible-gen', sourceName: 'Genesis 6-8', location: 'Gen 6:9-22' }]
        },
        {
          id: 'sec-noah-2',
          order: 2,
          titleEn: '2. The Covenant of the Rainbow',
          titleAr: '٢. علامة قوس قزح وعهد السلام',
          titleCop: 'Ⲡⲓⲧⲓⲧ ⲛ̀ⲧⲉ ϯϩⲓⲣⲏⲛⲏ',
          contentEn: 'When the flood subsided, Noah sent out a dove which returned with a fresh olive leaf! Noah and his family stepped onto dry land and offered thanksgiving to God. The Lord set a brilliant rainbow in the clouds as an eternal promise of mercy and protection.',
          contentAr: 'عندما انحسرت المياه، أطلق نوح حمامة فعادت إليه وفي فمها غصن زيتون أخضر! خرج نوح وأسرته وقدموا ذبيحة شكر لله. ووضع الرب قوس قزح في السحاب علامة لعهد السلام والرحمة الدائم مع الخليقة.',
          contentCop: 'Ϧⲉⲛ ⲟⲩϩⲓⲣⲏⲛⲏ ⲉ̀ⲃⲟⲗ ϩⲓⲧⲉⲛ Ⲫϯ.',
          sourceRefs: [{ sourceId: 'src-bible-gen', sourceName: 'Genesis 8-9', location: 'Gen 8:11-9:13' }]
        }
      ],
      slides: [
        {
          number: 1,
          titleEn: 'Noah’s Ark: Ship of Salvation',
          titleAr: 'فلك نوح: سفينة الخلاص',
          bulletsEn: ['Built by faith and patience', 'Prefigured the Holy Church that preserves us', 'Hebrews 11:7: "Prepared an ark for saving his household"'],
          bulletsAr: ['بُني بالإيمان والصبر العجيب', 'رمز للكنيسة المقدسة وسفينة نجاتنا', 'عبرانيين ١١: ٧: "بنى فلكاً لخلاص بيته"']
        },
        {
          number: 2,
          titleEn: 'The Dove and the Rainbow',
          titleAr: 'الحمامة وغصن الزيتون وقوس قزح',
          bulletsEn: ['The olive leaf symbolized peace and new life', 'The rainbow is God’s covenant of faithfulness', 'We trust God in every storm'],
          bulletsAr: ['غصن الزيتون رمز للسلام وبداية حياة جديدة', 'قوس قزح هو ميثاق أمانة الله ورحمته', 'نثق في رعاية الله في وسط كل عاصفة']
        }
      ],
      flashcards: [
        {
          id: 'fc-n-1',
          frontEn: 'What did the dove bring back to Noah in the Ark?',
          frontAr: 'ماذا أحضرت الحمامة لنوح في الفلك؟',
          backEn: 'A freshly plucked olive leaf in its beak.',
          backAr: 'غصن زيتون أخضر في فمها.'
        },
        {
          id: 'fc-n-2',
          frontEn: 'What is our memory verse from Hebrews 11:7?',
          frontAr: 'ما هي الآية الذهبية لدرس نوح (عبرانيين ١١: ٧)؟',
          backEn: '"By faith Noah... prepared an ark for the saving of his household."',
          backAr: '"بالإيمان نوح... بنى فلكاً لخلاص بيته."'
        }
      ],
      quizDraft: {
        id: 'quiz-noah-01',
        lessonId: 'l2',
        titleEn: 'Noah and the Ark Review Quiz',
        titleAr: 'اختبار مراجعة فلك نوح',
        instructionsEn: 'Review questions with tiered point multipliers for Noah.',
        instructionsAr: 'أسئلة مراجعة متدرجة الصعوبة مع نقاط مضاعفة لدرس نوح.',
        status: 'APPROVED',
        questions: [
          {
            id: 'qn-1',
            type: 'multiple_choice',
            difficulty: 'EASY',
            points: 10,
            questionEn: 'What bird returned to Noah carrying an olive leaf?',
            questionAr: 'ما الطائر الذي عاد إلى نوح حاملاً غصن الزيتون؟',
            optionsEn: ['A dove', 'An eagle', 'A sparrow'],
            optionsAr: ['حمامة', 'نسر', 'عصفور'],
            correctIndex: 0,
            explanationEn: 'The gentle dove returned with an olive branch indicating dry land and peace.',
            explanationAr: 'عادت الحمامة الوديعة بغصن الزيتون إعلاناً عن السلام وبداية عهد جديد.'
          },
          {
            id: 'qn-2',
            type: 'multiple_choice',
            difficulty: 'MEDIUM',
            points: 20,
            questionEn: 'What beautiful sign did God place in the sky as a covenant of peace?',
            questionAr: 'ما العلامة المبهجة التي وضعها الله في السماء عهداً للسلام؟',
            optionsEn: ['The rainbow', 'A comet', 'A silver shield'],
            optionsAr: ['قوس قزح', 'مذنب', 'درع فضي'],
            correctIndex: 0,
            explanationEn: 'God placed the rainbow in the clouds as an eternal sign of His covenant of mercy.',
            explanationAr: 'وضع الله قوس قزح في السحاب علامة أبدية لعهده ورحمته مع البشرية.'
          },
          {
            id: 'qn-3',
            type: 'multiple_choice',
            difficulty: 'HARD',
            points: 30,
            questionEn: 'According to Hebrews 11:7, what motivated Noah to build the ark?',
            questionAr: 'بحسب عبرانيين ١١: ٧، ما الذي قاد نوحاً لبناء الفلك؟',
            optionsEn: ['By faith and holy fear of God', 'By curiosity', 'By the advice of merchants'],
            optionsAr: ['بالإيمان والتقوى لله', 'بالفضول', 'بنصيحة التجار'],
            correctIndex: 0,
            explanationEn: 'Saint Paul writes that by faith Noah obeyed God’s warning and saved his house.',
            explanationAr: 'يؤكد معلمنا بولس الرسول أن نوحاً بنى الفلك بالإيمان الكامل في مواعيد الله.'
          }
        ]
      }
    }
  ]
};

export const mockServantComments: Record<string, ServantComment[]> = {
  'ver-cross-v1': [
    {
      id: 'comm-1',
      lessonVersionId: 'ver-cross-v1',
      sectionId: 'sec-1',
      quoteHighlighted: 'Roman authorities had piled debris over Golgotha to conceal Christian worship sites.',
      comment: 'Please mention the name of Emperor Hadrian specifically, and include Judas the elder who guided Queen Helena, as we specifically taught this in the classroom audio!',
      commentType: 'MISSING_INFORMATION',
      authorName: 'Servant Mina',
      createdAt: '2026-09-17T10:35:00Z',
      resolved: true,
      resolutionNote: 'Addressed in Version 2! Added Emperor Hadrian and Judas the elder with source reference to audio 01:50.'
    },
    {
      id: 'comm-2',
      lessonVersionId: 'ver-cross-v1',
      sectionId: 'sec-3',
      quoteHighlighted: 'We chant with joyful tunes because Christ transformed the cross...',
      comment: 'Add the Coptic term Frayhi (فرايحي) and explain the basil (rayhan) tradition so the children connect Sunday liturgy with this digital lesson.',
      commentType: 'AGE_LEVEL',
      authorName: 'Servant Mina',
      createdAt: '2026-09-17T10:40:00Z',
      resolved: true,
      resolutionNote: 'Resolved in Version 2: Added Coptic term Frayhi and theological meaning of rayhan.'
    }
  ]
};

export const mockStudentContentProgress: Record<string, StudentContentProgress> = {
  // Youssef (current logged in student): In Progress, read sections 1 & 2 (67%)
  'u1_l-cross-01': {
    studentId: 'u1',
    lessonId: 'l-cross-01',
    status: 'IN_PROGRESS',
    sectionsCompleted: ['sec-1', 'sec-2'],
    totalSections: 3,
    completionPercent: 67,
    startedAt: '2026-09-18T14:20:00Z',
    lastPositionSectionId: 'sec-3'
  },
  // Mina S: Completed all 3 sections (100%)
  's1_l-cross-01': {
    studentId: 's1',
    lessonId: 'l-cross-01',
    status: 'COMPLETED',
    sectionsCompleted: ['sec-1', 'sec-2', 'sec-3'],
    totalSections: 3,
    completionPercent: 100,
    startedAt: '2026-09-17T17:00:00Z',
    completedAt: '2026-09-17T17:45:00Z'
  },
  // Mary G: Completed
  's2_l-cross-01': {
    studentId: 's2',
    lessonId: 'l-cross-01',
    status: 'COMPLETED',
    sectionsCompleted: ['sec-1', 'sec-2', 'sec-3'],
    totalSections: 3,
    completionPercent: 100,
    startedAt: '2026-09-17T18:00:00Z',
    completedAt: '2026-09-17T18:40:00Z'
  }
};

export const mockStudentQuizAttempts: Record<string, StudentQuizAttempt[]> = {
  // Youssef: Took quiz, scored 4 out of 5 (80%). Missed question 2, recommended to review section 1!
  'u1_l-cross-01': [
    {
      id: 'att-youssef-1',
      studentId: 'u1',
      lessonId: 'l-cross-01',
      quizId: 'quiz-draft-02',
      status: 'GRADED',
      score: 4,
      totalScore: 5,
      percentage: 80,
      submittedAt: '2026-09-18T14:45:00Z',
      answers: [
        {
          questionId: 'q-cross-1',
          selectedIndex: 0,
          isCorrect: true,
          feedbackEn: 'Correct! Saint Helena journeyed in 326 AD.',
          feedbackAr: 'صحيح! سافرت القديسة هيلانة سنة ٣٢٦م.'
        },
        {
          questionId: 'q-cross-2',
          selectedIndex: 1, // Selected Pontius Pilate instead of Judas
          isCorrect: false,
          feedbackEn: 'Incorrect. It was an elderly resident named Judas who preserved the location.',
          feedbackAr: 'إجابة غير صحيحة. كان شيخ يدعى يهوذا هو من حفظ موضع الجبل المقدس.',
          recommendedSectionId: 'sec-1',
          recommendedSectionTitle: '1. Queen Helena’s Sacred Quest (326 AD)'
        },
        {
          questionId: 'q-cross-3',
          selectedIndex: 0,
          isCorrect: true,
          feedbackEn: 'Correct! The resurrection of the deceased youth identified Christ’s True Cross.',
          feedbackAr: 'صحيح! معجزة إقامة الشاب الميت ميزت صليب ربنا يسوع المسيح.'
        },
        {
          questionId: 'q-cross-4',
          selectedIndex: 0,
          isCorrect: true,
          feedbackEn: 'Correct! "The power of God" (1 Corinthians 1:18).',
          feedbackAr: 'صحيح! "قوة الله" (١ كو ١: ١٨).'
        },
        {
          questionId: 'q-cross-5',
          selectedIndex: 0,
          isCorrect: true,
          feedbackEn: 'Correct! Sweet basil represents the sweet aroma of Christ filling the earth.',
          feedbackAr: 'صحيح! الريحان يرمز لرائحة المسيح الزكية.'
        }
      ]
    }
  ]
};

export const mockStudentMastery: Record<string, StudentMastery> = {
  // Youssef has 80% quiz and 67% content progress. Mastery status: "DEVELOPING" (Not auto-mastered!)
  'u1_l-cross-01': {
    studentId: 'u1',
    lessonId: 'l-cross-01',
    status: 'DEVELOPING',
    evaluatedBy: 'Servant Mina',
    evaluatedAt: '2026-09-18T15:00:00Z',
    teacherNotes: 'Youssef demonstrated good understanding of the Feast of the Cross and recited 1 Cor 1:18. Advised him to re-read Section 1 on Judas the guide before our next Sunday School class.'
  },
  // Mina S: 100% quiz, 100% content. Teacher evaluated as MASTERED.
  's1_l-cross-01': {
    studentId: 's1',
    lessonId: 'l-cross-01',
    status: 'MASTERED',
    evaluatedBy: 'Servant Mina',
    evaluatedAt: '2026-09-17T18:00:00Z',
    teacherNotes: 'Full mastery! Read all sections, scored 100% on quiz, and recited verse perfectly in church.'
  }
};
