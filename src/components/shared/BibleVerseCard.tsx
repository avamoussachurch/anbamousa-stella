import React, { useEffect, useState } from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Language } from '../../types';
import { supabase } from '../../lib/supabase';
import { getCairoDateString } from '../../lib/cairoTime';

const fallbackVerses = [
  { en: "The Lord is my shepherd; I shall not want.", ar: "الرَّبُّ رَاعِيَّ فَلَا يُعْوِزُنِي شَيْءٌ.", referenceEn: "Psalm 23:1", referenceAr: "مزمور ٢٣: ١", type: "comfort" },
  { en: "The Lord is my light and my salvation; whom shall I fear?", ar: "الرَّبُّ نُورِي وَخَلَاصِي، مِمَّنْ أَخَافُ؟ الرَّبُّ حِصْنُ حَيَاتِي، مِمَّنْ أَرْتَعِبُ؟", referenceEn: "Psalm 27:1", referenceAr: "مزمور ٢٧: ١", type: "courage" },
  { en: "God is our refuge and strength, a very present help in trouble.", ar: "اَللهُ لَنَا مَلْجَأٌ وَقُوَّةٌ. عَوْنًا فِي الضِّيقَاتِ وُجِدَ شَدِيدًا.", referenceEn: "Psalm 46:1", referenceAr: "مزمور ٤٦: ١", type: "comfort" },
  { en: "Your word is a lamp to my feet and a light to my path.", ar: "سِرَاجٌ لِرِجْلِي كَلَامُكَ وَنُورٌ لِسَبِيلِي.", referenceEn: "Psalm 119:105", referenceAr: "مزمور ١١٩: ١٠٥", type: "wisdom" },
  { en: "Trust in the Lord with all your heart, and lean not on your own understanding.", ar: "تَوَكَّلْ عَلَى الرَّبِّ بِكُلِّ قَلْبِكَ، وَعَلَى فَهْمِكَ لَا تَعْتَمِدْ.", referenceEn: "Proverbs 3:5", referenceAr: "أمثال ٣: ٥", type: "wisdom" },
  { en: "Those who wait on the Lord shall renew their strength.", ar: "وَأَمَّا مُنْتَظِرُو الرَّبِّ فَيُجَدِّدُونَ قُوَّةً. يَرْفَعُونَ أَجْنِحَةً كَالنُّسُورِ. يَرْكُضُونَ وَلَا يَتْعَبُونَ. يَمْشُونَ وَلَا يُعْيُونَ.", referenceEn: "Isaiah 40:31", referenceAr: "إشعياء ٤٠: ٣١", type: "courage" },
  { en: "Let your light so shine before men, that they may see your good works.", ar: "فَلْيُضِئْ نُورُكُمْ هكَذَا قُدَّامَ النَّاسِ، لِكَيْ يَرَوْا أَعْمَالَكُمُ الْحَسَنَةَ وَيُمَجِّدُوا أَبَاكُمُ الَّذِي فِي السَّمَاوَاتِ.", referenceEn: "Matthew 5:16", referenceAr: "متى ٥: ١٦", type: "service" },
  { en: "Seek first the kingdom of God and His righteousness.", ar: "لكِنِ اطْلُبُوا أَوَّلًا مَلَكُوتَ اللهِ وَبِرَّهُ، وَهذِهِ كُلُّهَا تُزَادُ لَكُمْ.", referenceEn: "Matthew 6:33", referenceAr: "متى ٦: ٣٣", type: "faith" },
  { en: "Come to Me, all you who labor and are heavy laden, and I will give you rest.", ar: "تَعَالَوْا إِلَيَّ يَا جَمِيعَ الْمُتْعَبِينَ وَالثَّقِيلِي الأَحْمَالِ، وَأَنَا أُرِيحُكُمْ.", referenceEn: "Matthew 11:28", referenceAr: "متى ١١: ٢٨", type: "comfort" },
  { en: "I am the light of the world. He who follows Me shall not walk in darkness.", ar: "أَنَا هُوَ نُورُ الْعَالَمِ. مَنْ يَتْبَعْنِي فَلَا يَمْشِي فِي الظُّلْمَةِ بَلْ يَكُونُ لَهُ نُورُ الْحَيَاةِ.", referenceEn: "John 8:12", referenceAr: "يوحنا ٨: ١٢", type: "faith" },
  { en: "Peace I leave with you, My peace I give to you; let not your heart be troubled.", ar: "سَلَامًا أَتْرُكُ لَكُمْ. سَلَامِي أُعْطِيكُمْ. لَيْسَ كَمَا يُعْطِي الْعَالَمُ أُعْطِيكُمْ أَنَا. لَا تَضْطَرِبْ قُلُوبُكُمْ وَلَا تَرْهَبْ.", referenceEn: "John 14:27", referenceAr: "يوحنا ١٤: ٢٧", type: "comfort" },
  { en: "I am the vine, you are the branches. He who abides in Me bears much fruit.", ar: "أَنَا الْكَرْمَةُ وَأَنْتُمُ الأَغْصَانُ. الَّذِي يَثْبُتُ فِيَّ وَأَنَا فِيهِ هذَا يَأْتِي بِثَمَرٍ كَثِيرٍ.", referenceEn: "John 15:5", referenceAr: "يوحنا ١٥: ٥", type: "faith" },
  { en: "We know that all things work together for good to those who love God.", ar: "وَنَحْنُ نَعْلَمُ أَنَّ كُلَّ الأَشْيَاءِ تَعْمَلُ مَعًا لِلْخَيْرِ لِلَّذِينَ يُحِبُّونَ اللهَ، الَّذِينَ هُمْ مَدْعُوُّونَ حَسَبَ قَصْدِهِ.", referenceEn: "Romans 8:28", referenceAr: "رومية ٨: ٢٨", type: "hope" },
  { en: "The fruit of the Spirit is love, joy, peace, longsuffering, kindness, goodness, faithfulness, gentleness, self-control.", ar: "وَأَمَّا ثَمَرُ الرُّوحِ فَهُوَ: مَحَبَّةٌ فَرَحٌ سَلَامٌ، طُولُ أَنَاةٍ لُطْفٌ صَلَاحٌ، إِيمَانٌ وَدَاعَةٌ تَعَفُّفٌ.", referenceEn: "Galatians 5:22–23", referenceAr: "غلاطية ٥: ٢٢–٢٣", type: "virtue" },
  { en: "Be strong in the Lord and in the power of His might.", ar: "تَقَوَّوْا فِي الرَّبِّ وَفِي شِدَّةِ قُوَّتِهِ.", referenceEn: "Ephesians 6:10", referenceAr: "أفسس ٦: ١٠", type: "courage" },
  { en: "Be anxious for nothing, but in everything by prayer and supplication let your requests be made known to God.", ar: "لَا تَهْتَمُّوا بِشَيْءٍ، بَلْ فِي كُلِّ شَيْءٍ بِالصَّلَاةِ وَالدُّعَاءِ مَعَ الشُّكْرِ، لِتُعْلَمْ طِلْبَاتُكُمْ لَدَى اللهِ.", referenceEn: "Philippians 4:6", referenceAr: "فيلبي ٤: ٦", type: "prayer" },
  { en: "The peace of God, which surpasses all understanding, will guard your hearts and minds through Christ Jesus.", ar: "وَسَلَامُ اللهِ الَّذِي يَفُوقُ كُلَّ عَقْلٍ، يَحْفَظُ قُلُوبَكُمْ وَأَفْكَارَكُمْ فِي الْمَسِيحِ يَسُوعَ.", referenceEn: "Philippians 4:7", referenceAr: "فيلبي ٤: ٧", type: "comfort" },
  { en: "Whatever you do, do it heartily, as to the Lord and not to men.", ar: "وَكُلُّ مَا فَعَلْتُمْ، فَاعْمَلُوا مِنَ الْقَلْبِ، كَمَا لِلرَّبِّ لَيْسَ لِلنَّاسِ.", referenceEn: "Colossians 3:23", referenceAr: "كولوسي ٣: ٢٣", type: "service" },
  { en: "Casting all your care upon Him, for He cares for you.", ar: "مُلْقِينَ كُلَّ هَمِّكُمْ عَلَيْهِ، لأَنَّهُ هُوَ يَعْتَنِي بِكُمْ.", referenceEn: "1 Peter 5:7", referenceAr: "١ بطرس ٥: ٧", type: "comfort" },
  { en: "We love Him because He first loved us.", ar: "نَحْنُ نُحِبُّهُ لأَنَّهُ هُوَ أَحَبَّنَا أَوَّلًا.", referenceEn: "1 John 4:19", referenceAr: "١ يوحنا ٤: ١٩", type: "love" },
  { en: "If any of you lacks wisdom, let him ask of God, who gives to all liberally.", ar: "وَإِنَّمَا إِنْ كَانَ أَحَدُكُمْ تُعْوِزُهُ حِكْمَةٌ، فَلْيَطْلُبْ مِنَ اللهِ الَّذِي يُعْطِي الْجَمِيعَ بِسَخَاءٍ وَلَا يُعَيِّرُ، فَسَيُعْطَى لَهُ.", referenceEn: "James 1:5", referenceAr: "يعقوب ١: ٥", type: "wisdom" },
  { en: "The effective, fervent prayer of a righteous man avails much.", ar: "طَلِبَةُ الْبَارِّ تَقْتَدِرُ كَثِيرًا فِي فِعْلِهَا.", referenceEn: "James 5:16", referenceAr: "يعقوب ٥: ١٦", type: "prayer" },
  { en: "God has not given us a spirit of fear, but of power and of love and of a sound mind.", ar: "لأَنَّ اللهَ لَمْ يُعْطِنَا رُوحَ الْفَشَلِ، بَلْ رُوحَ الْقُوَّةِ وَالْمَحَبَّةِ وَالنُّصْحِ.", referenceEn: "2 Timothy 1:7", referenceAr: "٢ تيموثاوس ١: ٧", type: "courage" },
  { en: "Now faith is the substance of things hoped for, the evidence of things not seen.", ar: "وَأَمَّا الإِيمَانُ فَهُوَ الثِّقَةُ بِمَا يُرْجَى وَالإِيقَانُ بِأُمُورٍ لَا تُرَى.", referenceEn: "Hebrews 11:1", referenceAr: "عبرانيين ١١: ١", type: "faith" },
  { en: "Let all that you do be done with love.", ar: "لِتَصِرْ كُلُّ أُمُورِكُمْ فِي مَحَبَّةٍ.", referenceEn: "1 Corinthians 16:14", referenceAr: "١ كورنثوس ١٦: ١٤", type: "love" },
  { en: "Oh, taste and see that the Lord is good; blessed is the man who trusts in Him!", ar: "ذُوقُوا وَانْظُرُوا مَا أَطْيَبَ الرَّبَّ! طُوبَى لِلرَّجُلِ الْمُتَوَكِّلِ عَلَيْهِ.", referenceEn: "Psalm 34:8", referenceAr: "مزمور ٣٤: ٨", type: "faith" },
  { en: "He who dwells in the secret place of the Most High shall abide under the shadow of the Almighty.", ar: "السَّاكِنُ فِي سِتْرِ الْعَلِيِّ، فِي ظِلِّ الْقَدِيرِ يَبِيتُ.", referenceEn: "Psalm 91:1", referenceAr: "مزمور ٩١: ١", type: "protection" },
  { en: "I will lift up my eyes to the hills—from whence comes my help? My help comes from the Lord.", ar: "أَرْفَعُ عَيْنَيَّ إِلَى الْجِبَالِ، مِنْ حَيْثُ يَأْتِي عَوْنِي. مَعُونَتِي مِنْ عِنْدِ الرَّبِّ، صَانِعِ السَّمَاوَاتِ وَالأَرْضِ.", referenceEn: "Psalm 121:1–2", referenceAr: "مزمور ١٢١: ١–٢", type: "hope" },
  { en: "Through the Lord’s mercies we are not consumed, because His compassions fail not. They are new every morning.", ar: "إِنَّهُ مِنْ إِحْسَانَاتِ الرَّبِّ أَنَّنَا لَمْ نَفْنَ، لأَنَّ مَرَاحِمَهُ لَا تَزُولُ. هِيَ جَدِيدَةٌ فِي كُلِّ صَبَاحٍ. كَثِيرَةٌ أَمَانَتُكَ.", referenceEn: "Lamentations 3:22–23", referenceAr: "مراثي ٣: ٢٢–٢٣", type: "hope" },
  { en: "He has shown you, O man, what is good; and what does the Lord require of you but to do justly, to love mercy, and to walk humbly with your God?", ar: "قَدْ أَخْبَرَكَ أَيُّهَا الإِنْسَانُ مَا هُوَ صَالِحٌ، وَمَاذَا يَطْلُبُهُ مِنْكَ الرَّبُّ، إِلَّا أَنْ تَصْنَعَ الْحَقَّ وَتُحِبَّ الرَّحْمَةَ وَتَسْلُكَ مُتَوَاضِعًا مَعَ إِلهِكَ.", referenceEn: "Micah 6:8", referenceAr: "ميخا ٦: ٨", type: "service" },
  { en: "The Lord is near to those who have a broken heart, and saves such as have a contrite spirit.", ar: "قَرِيبٌ هُوَ الرَّبُّ مِنَ الْمُنْكَسِرِي الْقُلُوبِ، وَيُخَلِّصُ الْمُنْسَحِقِي الرُّوحِ.", referenceEn: "Psalm 34:18", referenceAr: "مزمور ٣٤: ١٨", type: "comfort" },
  { en: "I can do all things through Christ who strengthens me.", ar: "أَسْتَطِيعُ كُلَّ شَيْءٍ فِي الْمَسِيحِ الَّذِي يُقَوِّينِي.", referenceEn: "Philippians 4:13", referenceAr: "فيلبي ٤: ١٣", type: "courage" }
];

export function BibleVerseCard({ lang }: { lang: Language }) {
  const [verses, setVerses] = useState(fallbackVerses);
  useEffect(() => {
    let active = true;
    if (!supabase) return () => { active = false; };
    void supabase.from('daily_scripture_verses')
      .select('text_en,text_ar,reference_en,reference_ar')
      .eq('is_active', true)
      .order('rotation_order', { ascending: true })
      .then(({ data, error }) => {
        if (!active || error || !data?.length) return;
        setVerses(data.map(row => ({
          en: row.text_en,
          ar: row.text_ar,
          referenceEn: row.reference_en,
          referenceAr: row.reference_ar,
          type: 'scripture'
        })));
      });
    return () => { active = false; };
  }, []);
  const cairoDate = getCairoDateString();
  const date = new Date(cairoDate + 'T12:00:00');
  const dayOfYear = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86400000);
  const verse = verses[(dayOfYear - 1 + verses.length) % verses.length] || fallbackVerses[0];
  const isCoptic = lang === 'cop' || lang === 'copt';

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-amber-950 p-5 rounded-3xl shadow-sm relative overflow-hidden min-h-[140px]"
      >
        <div className="absolute -right-4 -top-4 opacity-15 pointer-events-none">
          <BookOpen size={110} />
        </div>

        <div className="relative z-10 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-950">
              <BookOpen size={16} />
              <span>{lang === 'ar' ? 'آية النهارده للحفظ والتأمل' : 'Verse of the Day'}</span>
            </div>
          </div>

          <div>
            <p className="font-bold leading-relaxed text-base sm:text-lg italic text-amber-950">
              "{lang === 'ar' ? verse.ar : isCoptic ? (verse.copt || verse.ar) : verse.en}"
            </p>
            <span className="inline-block mt-1 font-extrabold text-xs text-amber-900">
              ({lang === 'ar' ? verse.referenceAr : isCoptic ? (verse.referenceCopt || verse.referenceAr) : verse.referenceEn})
            </span>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-amber-900/15 pt-2 text-[9px] font-bold text-amber-950/75">
              <a href="https://ebible.org/arb-vd/" target="_blank" rel="noreferrer" className="underline underline-offset-2">{lang === 'ar' ? 'النص العربي: فان دايك' : 'Arabic text: Van Dyck'}</a>
              <a href="https://st-takla.org/Bibles/BibleSearch/" target="_blank" rel="noreferrer" className="underline underline-offset-2">{lang === 'ar' ? 'اقرأ التفاسير القبطية في الأنبا تكلا' : 'Coptic Orthodox study at St-Takla'}</a>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
