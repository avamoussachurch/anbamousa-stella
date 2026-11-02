/**
 * Authentic Coptic Orthodox Agpeya (Book of Canonical Hours) & Daily Prayer Tracker
 */

export interface AgpeyaSection {
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
}

export interface AgpeyaHourData {
  id: 'prime' | 'terce' | 'sext' | 'none' | 'vespers' | 'compline' | 'midnight';
  nameAr: string;
  nameEn: string;
  timeLabelAr: string;
  timeLabelEn: string;
  themeAr: string;
  themeEn: string;
  icon: string;
  recommendedTime: string;
  summaryAr: string;
  summaryEn: string;
  gospelAr: string;
  gospelEn: string;
  tropariaAr: string[];
  tropariaEn: string[];
  absolutionAr: string;
  absolutionEn: string;
  childGuidedAr: string;
  childGuidedEn: string;
}

export const AGPEYA_HOURS: AgpeyaHourData[] = [
  {
    id: 'prime',
    nameAr: 'صلاة باكر (الساعة الأولى)',
    nameEn: 'Prime (Morning Prayer)',
    timeLabelAr: 'الساعة ٦ صباحاً (شروق الشمس)',
    timeLabelEn: '6:00 AM (Sunrise)',
    themeAr: 'قيامة الرب يسوع من بين الأموات وبداية يوم جديد في النور الإلهي',
    themeEn: 'The Resurrection of Christ & Dawn of New Divine Light',
    icon: '🌅',
    recommendedTime: '06:00 - 08:00',
    summaryAr: 'نشكر الله على حفظنا خلال الليل، ونسأله أن يشرق بنوره الحقيقي في قلوبنا طوال النهار.',
    summaryEn: 'Thanking God for preserving us through the night and seeking His divine illumination.',
    gospelAr: '«فِي الْبَدْءِ كَانَ الْكَلِمَةُ، وَالْكَلِمَةُ كَانَ عِنْدَ اللهِ... فِيهِ كَانَتِ الْحَيَاةُ، وَالْحَيَاةُ كَانَتْ نُورَ النَّاسِ.» (يوحنا ١: ١-١٧)',
    gospelEn: '"In the beginning was the Word, and the Word was with God... In Him was life, and the life was the light of men." (John 1:1-17)',
    tropariaAr: [
      'أيها النور الحقيقي الذي يضيء لكل إنسان آتٍ إلى العالم، أتيت إلى العالم بمحبتك للبشر، وكل الخليقة تهللت بمجيئك.',
      'خلصت آدم من الغواية، وأعتقت حواء من طلقات الموت، وأعطيتنا روح البنوة. نسبحك ونباركك قائلين: ذوكصابتري...'
    ],
    tropariaEn: [
      'O the True Light that enlightens every person coming into the world, You came into the world through Your love for mankind, and all creation rejoiced at Your advent.',
      'You saved Adam from deception, freed Eve from the pangs of death, and gave us the spirit of sonship.'
    ],
    absolutionAr: 'أيها الرب الإله ضابط الكل، أبو ربنا وإلهنا ومخلصنا يسوع المسيح، نشكرك لأنك أقمتنا من مضاجعنا ووهبتنا نعمة هذا اليوم الجديد لنعبدك بالروح والحق...',
    absolutionEn: 'O Lord God Almighty, Father of our Lord, God, and Savior Jesus Christ, we thank You for raising us from our sleep and granting us this new day to worship You in spirit and truth...',
    childGuidedAr: 'يا رب يسوع، أشكرك لأنك حافظت عليّ بالليل وصحيتني بصحة وسلام. أنر قلبي ومدرستي وكنيستي بنورك، واحفظني من أي كلمة أو فكر وحش النهاردة.',
    childGuidedEn: 'Lord Jesus, thank You for watching over me through the night and waking me in peace. Shine Your holy light in my heart, at school, and at home today.'
  },
  {
    id: 'terce',
    nameAr: 'صلاة الساعة الثالثة',
    nameEn: 'Terce (Third Hour)',
    timeLabelAr: 'الساعة ٩ صباحاً',
    timeLabelEn: '9:00 AM',
    themeAr: 'حلول الروح القدس المعزي على التلاميذ الأطهار في علية صهيون، ومحاكمة بيلاطس للرب',
    themeEn: 'Descent of the Holy Spirit at Pentecost & Christ before Pilate',
    icon: '🕊️',
    recommendedTime: '09:00 - 11:00',
    summaryAr: 'نطلب عمل الروح القدس في حياتنا ليطهرنا من كل خطية ويهبنا ثمار المحبة والفرح والسلام.',
    summaryEn: 'Praying for the Holy Spirit to guide our actions and fill us with heavenly fruits.',
    gospelAr: '«وَمَتَى جَاءَ الْمُعَزِّي الَّذِي سَأُرْسِلُهُ أَنَا إِلَيْكُمْ مِنَ الآبِ، رُوحُ الْحَقِّ... فَهُوَ يَشْهَدُ لِي.» (يوحنا ١٤: ٢٦)',
    gospelEn: '"When the Comforter comes, whom I shall send to you from the Father, the Spirit of truth... He will testify of Me." (John 14:26)',
    tropariaAr: [
      'روحك القدوس يا رب، الذي أرسلته على تلاميذك القديسين ورسلك المكرمين في الساعة الثالثة، هذا لا تنزعه منا أيها الصالح، بل جدده في أحشائنا.',
      'قلباً نقياً اخلق فيّ يا الله، وروحاً مستقيماً جدده في داخلي.'
    ],
    tropariaEn: [
      'Your Holy Spirit, O Lord, whom You sent upon Your holy disciples and honored apostles at the third hour, do not take away from us, O Good One, but renew Him within us.',
      'Create in me a clean heart, O God, and renew a steadfast spirit within me.'
    ],
    absolutionAr: 'أيها الرب إله القوات الكائن قبل الدهور، يا من أرسلت روحك القدوس على رسلك القديسين في مثل هذه الساعة، امنحنا نحن أيضاً فيض مواهبك الإلهية...',
    absolutionEn: 'O Lord God of Hosts, existing before all ages, who sent Your Holy Spirit upon Your holy disciples at this hour, bestow upon us the fullness of Your divine graces...',
    childGuidedAr: 'يا روح الله القدوس، اسكن في قلبي واملأني محبة وفرح وصبر، وساعدني أفهم دروسي وأكون مطيع لبابا وماما وأساتذتي.',
    childGuidedEn: 'Holy Spirit, dwell in my heart and fill me with love, patience, and kindness. Help me learn well and obey my parents and teachers with joy.'
  },
  {
    id: 'sext',
    nameAr: 'صلاة الساعة السادسة',
    nameEn: 'Sext (Sixth Hour - Noon)',
    timeLabelAr: 'الساعة ١٢ ظهراً (منتصف النهار)',
    timeLabelEn: '12:00 PM (Midday)',
    themeAr: 'صلب ربنا يسوع المسيح على عود الصليب لخلاص العالم وفداء البشر',
    themeEn: 'The Crucifixion of Christ on the Holy Cross for our Salvation',
    icon: '✝️',
    recommendedTime: '12:00 - 14:00',
    summaryAr: 'نتذكر آلام الرب يسوع العظيمة على الصليب لأجل خطايانا، ونسأله أن يسمر مخافته في قلوبنا.',
    summaryEn: 'Remembering Christ suffering on the Cross and asking Him to nail our sins to His Cross.',
    gospelAr: '«طُوبَى لِلْجِيَاعِ وَالْعِطَاشِ إِلَى الْبِرِّ، لأَنَّهُمْ يُشْبَعُونَ... طُوبَى لأَنْقِيَاءِ الْقَلْبِ، لأَنَّهُمْ يُعَايِنُونَ اللهَ.» (متى ٥: ١-١٦)',
    gospelEn: '"Blessed are those who hunger and thirst for righteousness, for they shall be filled... Blessed are the pure in heart, for they shall see God." (Matthew 5:1-16)',
    tropariaAr: [
      'يا من في اليوم السادس وفي وقت الساعة السادسة سُمِرت على الصليب من أجل الخطية التي تجرأ عليها أبونا آدم في الفردوس، مزق صك خطايانا أيها المسيح إلهنا وخلصنا.',
      'صرخت نحوك يا رب: اسمع صلاتي، واقبل تضرعي في هذا الوقت المقدس.'
    ],
    tropariaEn: [
      'O You who on the sixth day and at the sixth hour were nailed to the Cross for the sin our father Adam committed in Paradise, tear up the handwriting of our sins, O Christ our God, and save us.'
    ],
    absolutionAr: 'نشكرك يا ملكنا ضابط الكل، لأنك بمراحمك الكثيرة وصليبك المحيي قد محوت صك خطايانا... اجعلنا شركاء في مجد قيامتك.',
    absolutionEn: 'We thank You, our King Almighty, because through Your boundless mercy and life-giving Cross You wiped out the handwriting of our debts...',
    childGuidedAr: 'يا رب يسوع المصلوب على الصليب من أجلي، شكراً لمحبتك الكبيرة العجيبة! ساعدني أحب كل أصحابي وما أزعلش حد مني أبداً.',
    childGuidedEn: 'Lord Jesus, crucified on the Cross out of deep love for me, thank You! Help me to love my friends and forgive everyone as You forgave us.'
  },
  {
    id: 'none',
    nameAr: 'صلاة الساعة التاسعة',
    nameEn: 'Nones (Ninth Hour - 3 PM)',
    timeLabelAr: 'الساعة ٣ عصراً',
    timeLabelEn: '3:00 PM',
    themeAr: 'موت الفادي بالجسد على الصليب، واعتراف اللص اليمين: اذكرني يا رب متى جئت في ملكوتك',
    themeEn: 'The Death of Christ on the Cross & The Repentance of the Right Hand Thief',
    icon: '☀️',
    recommendedTime: '15:00 - 17:00',
    summaryAr: 'نتذكر اللص اليمين الذي تاب في آخر لحظة ونال الفردوس، ونصرخ مع داود النبي بالتوبة والرجاء.',
    summaryEn: 'Remembering the penitent thief who was promised Paradise and crying out for mercy.',
    gospelAr: '«وَلَمَّا رَأَى قَائِدُ الْمِئَةِ الْوَاقِفُ مُقَابِلَهُ أَنَّهُ صَرَخَ هكَذَا وَأَسْلَمَ الرُّوحَ، قَالَ: حَقًّا كَانَ هذَا الإِنْسَانُ ابْنَ اللهِ!» (مرقس ١٥: ٣٣-٤١)',
    gospelEn: '"When the centurion who stood opposite Him saw that He cried out like this and breathed His last, he said: Truly this Man was the Son of God!" (Mark 15:33-41)',
    tropariaAr: [
      'يا من ذاق الموت بالجسد في وقت الساعة التاسعة من أجلنا نحن الخطاة، أمت حواسنا الجسدية أيها المسيح إلهنا ونجنا.',
      'عندما رأى اللص رئيس الحياة معلقاً على الصليب، قال: لولا أن المصلوب معنا إله متجسد لما أظلمت الشمس ولا تزلزلت الأرض... اذكرني يا رب متى جئت في ملكوتك!'
    ],
    tropariaEn: [
      'O You who tasted death in the flesh at the ninth hour for our sake, put to death our carnal passions, O Christ our God, and deliver us.',
      'When the thief saw the Prince of Life hanging on the Cross, he confessed: Remember me, O Lord, when You come into Your kingdom!'
    ],
    absolutionAr: 'أيها الإله المحب للبشر، يا من قبلت اعتراف اللص التائب في الساعة التاسعة، اقبل صلاتنا نحن أيضاً وافتح لنا باب فردوس النعيم...',
    absolutionEn: 'O Philanthropic God, who accepted the confession of the penitent thief at the ninth hour, accept our contrite prayers and open for us the gates of Paradise...',
    childGuidedAr: 'يا رب اذكرني زي اللص اليمين. لما أعمل حاجة غلط، سامحني وعلمني أرجع لك وأقول لك آسف على طول.',
    childGuidedEn: 'Lord Jesus, remember me like the right-hand thief. Whenever I make a mistake, forgive me and teach me to say sorry and run to You.'
  },
  {
    id: 'vespers',
    nameAr: 'صلاة الغروب (الساعة الحادية عشرة)',
    nameEn: 'Vespers (Eleventh Hour - Sunset)',
    timeLabelAr: 'الساعة ٥ مساءً (غروب الشمس)',
    timeLabelEn: '5:00 PM (Sunset)',
    themeAr: 'إنزال جسد الرب الطاهر من على الصليب، وتكفينه بالروائح العطرة في القبر الجديد',
    themeEn: 'Taking Down the Body of Christ from the Cross & Evening Thanksgiving',
    icon: '🌆',
    recommendedTime: '17:00 - 19:00',
    summaryAr: 'نشكر الله على حمايته طوال ساعات النهار ونسأله سلاماً في المساء وغفراناً لزلات اليوم.',
    summaryEn: 'Thanksgiving for God preservation through daytime and praying for evening tranquility.',
    gospelAr: '«فَقَامَتْ حَمَاتُهُ وَصَارَتْ تَخْدِمُهُمْ... وَعِنْدَ غُرُوبِ الشَّمْسِ، جَمِيعُ الَّذِينَ كَانَ عِنْدَهُمْ مَرْضَى جَاءُوا بِهِمْ إِلَيْهِ فَشَفَاهُمْ.» (لوقا ٤: ٤٠-٤٤)',
    gospelEn: '"When the sun was setting, all those who had any that were sick with various diseases brought them to Him; and He laid His hands on every one of them and healed them." (Luke 4:40-44)',
    tropariaAr: [
      'إذا ما وقفنا في هيكلك المقدس نحسب كالقيام في السماء، يا والدة الإله أنتِ هي باب السماء افتحي لنا باب الرحمة.',
      'إن كان البار بالجهد يخلص، فأين أظهر أنا الخاطئ؟ ثقل النهار وحره لم أحمل مع أصحاب الساعة الحادية عشرة، لكن احسبني معهم يا مخلصي.'
    ],
    tropariaEn: [
      'When standing in Your holy temple, we are considered as standing in heaven. O Theotokos, you are the gate of heaven; open to us the doors of mercy.',
      'If the righteous is scarcely saved, where shall I, a sinner, appear? Yet count me among the eleventh-hour workers, O Savior.'
    ],
    absolutionAr: 'نشكرك يا إلهنا الصالح لأنك أجزت بنا هذا النهار بسلام، وبلغتنا وقت المساء شاكرين نعمتك الفائقة...',
    absolutionEn: 'We thank You, our Good God, for leading us through this day in peace and bringing us to the evening hours rejoicing in Your grace...',
    childGuidedAr: 'يا رب النهار قرب يخلص، بشكرك على كل حاجة حلوة حصلت النهاردة، على مدرستي وأهلي وأصحابي. سامحني لو زعلت حد.',
    childGuidedEn: 'Lord, as the day draws to a close, thank You for all the good things today: my family, school, and friends. Forgive any wrongs I did.'
  },
  {
    id: 'compline',
    nameAr: 'صلاة النوم (الساعة الثانية عشرة)',
    nameEn: 'Compline (Bedtime Prayer)',
    timeLabelAr: 'الساعة ٩ مساءً (قبل النوم)',
    timeLabelEn: '9:00 PM (Before Bed)',
    themeAr: 'وضع جسد المخلص في القبر، وفحص الضمير والتوبة قبل النوم',
    themeEn: 'Burial of Christ & Peaceful Sleep with Clean Conscience',
    icon: '🌙',
    recommendedTime: '20:00 - 22:30',
    summaryAr: 'نستودع أرواحنا وأجسادنا في يد الله قبل النوم، ونسأله نوماً هادئاً وحراسة ملائكية من كل فكر شرير.',
    summaryEn: 'Entrusting our souls and bodies to God for a peaceful, guarded night of restful sleep.',
    gospelAr: '«الآنَ تُطْلِقُ عَبْدَكَ يَا سَيِّدُ حَسَبَ قَوْلِكَ بِسَلاَمٍ، لأَنَّ عَيْنَيَّ قَدْ أَبْصَرَتَا خَلاَصَكَ... نُورَ إِعْلاَنٍ لِلأُمَمِ، وَمَجْدًا لِشَعْبِكَ إِسْرَائِيلَ.» (لوقا ٢: ٢٩-٣٢)',
    gospelEn: '"Lord, now You are letting Your servant depart in peace, according to Your word; for my eyes have seen Your salvation... A light to bring revelation to the Gentiles." (Luke 2:29-32)',
    tropariaAr: [
      'هوذا أنا عتيد أن أقف أمام الديان العادل مرعوباً ومرتعداً من كثرة ذنوبي... توبي يا نفسي ما دمت في الأرض ساكنة.',
      'أعطني يا رب ينابيع دموع كثيرة كما أعطيت المرأة الخاطئة، واجعلني مستحقاً أن أبل قدميك اللتين أعتقتاني من طريق الضلال.'
    ],
    tropariaEn: [
      'Behold, I am about to stand before the Just Judge, trembling because of my many sins... Repent, O my soul, while you still dwell on earth.',
      'Grant me, O Lord, fountains of contrite tears like the sinful woman, and wash away my stains.'
    ],
    absolutionAr: 'أيها الرب إلهنا، اغفر لنا كل ما أخطأنا به إليك في هذا اليوم، بالقول أو بالفعل أو بالفكر. هبنا نوماً هادئاً نقياً، وأرسل لنا ملاك السلامة ليحرسنا من كل فخاخ الشرير...',
    absolutionEn: 'O Lord our God, forgive us every sin committed this day, in word, deed, or thought. Grant us peaceful, pure sleep and send an angel of peace to guard us from all snares of the adversary...',
    childGuidedAr: 'يا يسوع الحبيب، أنا رايح أنام، بارك سريري وأهلي وبيتنا. ابعت ملاكي الحارس يقف جنبي ويحميني من أي كابوس، وأصحى الصبح فرحان.',
    childGuidedEn: 'Dearest Jesus, as I lie down to sleep, bless my home and family. Send my guardian angel to watch over me and keep me safe all night.'
  },
  {
    id: 'midnight',
    nameAr: 'صلاة نصف الليل (الخدمة الأولى والثانية والثالثة)',
    nameEn: 'Midnight Praises & Watchfulness',
    timeLabelAr: 'الساعة ١٢ منتصف الليل',
    timeLabelEn: '12:00 AM (Midnight)',
    themeAr: 'السهر الروحي والاستعداد لمجيء العريس السمائي، مثل العذارى الحكيمات',
    themeEn: 'Spiritual Watchfulness Awaiting the Heavenly Bridegroom',
    icon: '✨',
    recommendedTime: '23:30 - 02:00',
    summaryAr: 'صلاة التسبيح في هدوء الليل، مصابيحنا موقدة بزيت النعمة استعداداً لملاقاة الرب في مجيئه الثاني.',
    summaryEn: 'Praising in quiet night hours with our lamps trimmed awaiting Christ second coming.',
    gospelAr: '«حِينَئِذٍ يُشْبِهُ مَلَكُوتُ السَّمَاوَاتِ عَشْرَ عَذَارَى أَخَذْنَ مَصَابِيحَهُنَّ وَخَرَجْنَ لِلِقَاءِ الْعَرِيسِ... فَاسْهَرُوا إِذَنْ لأَنَّكُمْ لاَ تَعْرِفُونَ الْيَوْمَ وَلاَ السَّاعَةَ.» (متى ٢٥: ١-١٣)',
    gospelEn: '"Then the kingdom of heaven shall be likened to ten virgins who took their lamps and went out to meet the bridegroom... Watch therefore, for you know neither the day nor the hour." (Matthew 25:1-13)',
    tropariaAr: [
      'ها هوذا العريس يأتي في نصف الليل، طوبى للعبد الذي يجده ساهراً، وأما الذي يجده غافلاً فإنه غير مستحق المضي معه.',
      'تفنني يا نفسي واستيقظي، لئلا تثقلي نوماً فتطرحي خارج الملكوت، بل اسهري واصرخي: قدوس قدوس قدوس أنت يا الله.'
    ],
    tropariaEn: [
      'Behold, the Bridegroom comes at midnight; blessed is the servant whom He finds watching, but unworthy is the one whom He finds slumbering.',
      'Arise, O my soul, lest you fall into a deep sleep and be shut out of the Kingdom. Cry out: Holy, Holy, Holy are You, O God!'
    ],
    absolutionAr: 'أيها السيد الرب يسوع المسيح ابن الله الحي، أنر عقولنا لنفهم أقوالك المحيية، وأيقظنا من نوم الغفلة لنسبحك مع طغمات الشاروبيم والسيرافيم...',
    absolutionEn: 'O Lord Jesus Christ, Son of the living God, enlighten our minds to comprehend Your life-giving words, and awaken us from slumber to praise You with cherubim and seraphim...',
    childGuidedAr: 'يا رب علمني أكون شاطر وساهر ومستعد زي العذارى الحكيمات اللي كان معاهم زيت في مصابيحهم، وأعيش كل يوم في رضاك.',
    childGuidedEn: 'Lord, teach me to be ready and wise like the five wise virgins who carried oil for their lamps, living each day pleasing in Your sight.'
  }
];
