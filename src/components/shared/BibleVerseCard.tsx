import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Language } from '../../types';

const fallbackVerses = [
  {
    en: "I can do all things through Christ who strengthens me.",
    ar: "أَسْتَطِيعُ كُلَّ شَيْءٍ فِي الْمَسِيحِ الَّذِي يُقَوِّينِي.",
    copt: "Ϯϣ̀ϫⲉⲙϫⲟⲙ ⲛ̀ϩⲱⲃ ⲛⲓⲃⲉⲛ ϧⲉⲛ Ⲡⲭ̅ⲥ̅ ⲫⲏⲉⲧϯϫⲟⲙ ⲛⲏⲓ.",
    referenceEn: "Philippians 4:13",
    referenceAr: "فيلبي ٤: ١٣",
    referenceCopt: "Ⲫⲓⲗⲓⲡⲡⲏⲥⲓⲟⲓⲥ ⲇ̅:ⲓ̅ⲅ̅",
    type: "ambition"
  },
  {
    en: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.",
    ar: "قَرِيبٌ هُوَ الرَّبُّ مِنَ الْمُنْكَسِرِي الْقُلُوبِ، وَيُخَلِّصُ الْمُنْسَحِقِي الرُّوحِ.",
    copt: "Ϥϧⲉⲛⲧ ⲛ̀ϫⲉ Ⲡϭⲟⲓⲥ ⲉ̀ⲛⲏⲉⲧϧⲉⲙϧⲱⲙ ϧⲉⲛ ⲡⲟⲩϩⲏⲧ.",
    referenceEn: "Psalm 34:18",
    referenceAr: "مزمور ٣٤: ١٨",
    referenceCopt: "Ⲯⲁⲗⲙⲟⲥ ⲗ̅ⲇ̅:ⲓ̅ⲏ̅",
    type: "sad"
  },
  {
    en: "Be strong and courageous. Do not be afraid or terrified... for the Lord your God goes with you.",
    ar: "تَشَدَّدُوا وَتَشَجَّعُوا. لاَ تَخَافُوا وَلاَ تَرْهَبُوا وُجُوهَهُمْ، لأَنَّ الرَّبَّ إِلهَكَ سَائِرٌ مَعَكَ.",
    copt: "Ϫⲉⲙϫⲟⲙ ⲟⲩⲟϩ ⲁⲣⲓϫⲱⲣⲓ: ⲙ̀ⲡⲉⲣⲉⲣϩⲟϯ: ϫⲉ Ⲡϭⲟⲓⲥ Ⲡⲉⲕⲛⲟⲩϯ ⲙⲟϣⲓ ⲛⲉⲙⲁⲕ.",
    referenceEn: "Deuteronomy 31:6",
    referenceAr: "تثنية ٣١: ٦",
    referenceCopt: "Ⲇⲉⲩⲧⲉⲣⲟⲛⲟⲙⲓⲟⲛ ⲗ̅ⲁ̅:ⲋ̅",
    type: "ambition"
  },
  {
    en: "Cast your cares on the Lord and he will sustain you; he will never let the righteous be shaken.",
    ar: "أَلْقِ عَلَى الرَّبِّ هَمَّكَ فَهُوَ يَعُولُكَ. لاَ يَدَعُ الصِّدِّيقَ يَتَزَعْزَعُ إِلَى الأَبَدِ.",
    copt: "Ⲃⲱⲣⲡ ⲙ̀ⲡⲉⲕⲣⲱⲟⲩϣ ⲉ̀ϫⲉⲛ Ⲡϭⲟⲓⲥ ⲟⲩⲟϩ ⲛ̀ⲑⲟϥ ϥⲛⲁϣⲁⲛⲟⲩϣⲕ.",
    referenceEn: "Psalm 55:22",
    referenceAr: "مزمور ٥٥: ٢٢",
    referenceCopt: "Ⲯⲁⲗⲙⲟⲥ ⲛ̅ⲉ̅:ⲕ̅ⲃ̅",
    type: "sad"
  }
];

export function BibleVerseCard({ lang }: { lang: Language }) {
  const date = new Date();
  const dayOfYear = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86400000);
  const verse = fallbackVerses[dayOfYear % fallbackVerses.length];
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
              <span>{lang === 'ar' ? 'آية اليوم للحفظ والتأمل' : 'Verse of the Day'}</span>
            </div>
          </div>

          <div>
            <p className="font-bold leading-relaxed text-base sm:text-lg italic text-amber-950">
              "{lang === 'ar' ? verse.ar : isCoptic ? verse.copt : verse.en}"
            </p>
            <span className="inline-block mt-1 font-extrabold text-xs text-amber-900">
              ({lang === 'ar' ? verse.referenceAr : isCoptic ? verse.referenceCopt : verse.referenceEn})
            </span>
          </div>
        </div>
      </motion.div>
    </>
  );
}
