import React from 'react';
import { Calendar, ChevronRight, Star } from 'lucide-react';
import { motion } from 'motion/react';

export function ChurchCalendar({ lang }: { lang: 'en' | 'ar' }) {
  const upcomingEvents = [
    {
      id: 'e1',
      dateEn: 'Sept 11',
      dateAr: '١١ سبتمبر',
      titleEn: 'Nayrouz (Coptic New Year)',
      titleAr: 'عيد النيروز (رأس السنة القبطية)',
      type: 'major',
      daysLeft: 0,
    },
    {
      id: 'e2',
      dateEn: 'Sept 27',
      dateAr: '٢٧ سبتمبر',
      titleEn: 'Feast of the Cross',
      titleAr: 'عيد الصليب المجيد',
      type: 'major',
      daysLeft: 11,
    },
    {
      id: 'e3',
      dateEn: 'Jan 7',
      dateAr: '٧ يناير',
      titleEn: 'Feast of the Nativity',
      titleAr: 'عيد الميلاد المجيد',
      type: 'major',
      daysLeft: 113,
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#1E1914] rounded-3xl p-5 md:p-8 shadow-sm border border-[var(--color-church-cream-dark)] dark:border-[#3A3026]"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-[var(--color-church-blue)] dark:text-[#FAF5EB] flex items-center gap-2">
          <Calendar className="text-[var(--color-church-gold)]" size={24} />
          {lang === 'ar' ? 'التقويم القبطي' : 'Church Calendar'}
        </h2>
        <button className="text-sm md:text-base font-bold text-gray-500 dark:text-[#C5B5A0] hover:text-[var(--color-church-burgundy)] dark:hover:text-[var(--mousa-gold)] flex items-center transition-colors cursor-pointer">
          {lang === 'ar' ? 'الكل' : 'View All'} <ChevronRight size={16} />
        </button>
      </div>

      <div className="space-y-4">
        {upcomingEvents.map((event) => (
          <div key={event.id} className="flex items-center gap-4 bg-gray-50 dark:bg-stone-900/60 rounded-2xl p-4 hover:bg-[var(--color-church-cream)] dark:hover:bg-stone-850 border border-transparent hover:border-[var(--color-church-gold)]/20 transition-all cursor-default">
            <div className="w-16 h-16 rounded-xl bg-white dark:bg-stone-800 border border-gray-100 dark:border-stone-700 shadow-sm flex flex-col items-center justify-center shrink-0">
               <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                 {lang === 'ar' ? event.dateAr.split(' ')[1] : event.dateEn.split(' ')[0]}
               </span>
               <span className="text-xl font-bold text-[var(--color-church-blue)] dark:text-[#FAF5EB]">
                 {lang === 'ar' ? event.dateAr.split(' ')[0] : event.dateEn.split(' ')[1]}
               </span>
            </div>
            
            <div className="flex-1">
              <h3 className="font-bold text-[var(--color-church-blue)] dark:text-[#FAF5EB] text-base md:text-lg flex items-center gap-2">
                {lang === 'ar' ? event.titleAr : event.titleEn}
                {event.type === 'major' && <Star size={14} className="text-[var(--color-church-gold)] fill-current" />}
              </h3>
              <p className="text-sm text-gray-500 dark:text-[#C5B5A0] font-medium">
                {event.daysLeft === 0 
                  ? (lang === 'ar' ? 'اليوم!' : 'Today!') 
                  : (lang === 'ar' ? `فاضل ${event.daysLeft} أيام` : `In ${event.daysLeft} days`)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
