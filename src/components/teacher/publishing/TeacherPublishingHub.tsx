import React, { useEffect, useState } from 'react';
import {
  School,
  Music,
  BookOpen,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Language } from '../../../types';
import { HymnsPublishingStudio } from './HymnsPublishingStudio';
import { TaxisPublishingStudio } from './TaxisPublishingStudio';

export type PublishingMode = 'sunday_school' | 'hymns' | 'taxis';

interface TeacherPublishingHubProps {
  lang?: Language;
  onPreviewLesson?: (lessonId: string) => void;
  initialMode?: PublishingMode;
  // Sunday School studio content rendered as children or callback
  sundaySchoolContent?: React.ReactNode;
}

export function TeacherPublishingHub({
  lang = 'ar',
  onPreviewLesson,
  sundaySchoolContent,
  initialMode = 'sunday_school'
}: TeacherPublishingHubProps) {
  const isAr = lang === 'ar';
  const [publishingMode, setPublishingMode] = useState<PublishingMode>(initialMode);

  useEffect(() => {
    setPublishingMode(initialMode);
  }, [initialMode]);

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 3-Way Functional Publishing Mode Switcher */}
      <div className="bg-[var(--mousa-cream-surface)] dark:bg-[#1C1712] p-2 rounded-3xl border-2 border-[var(--mousa-border-sand)] max-w-4xl mx-auto shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPublishingMode('sunday_school')}
            className={`flex-1 w-full sm:w-auto py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              publishingMode === 'sunday_school'
                ? 'bg-[var(--mousa-teal)] text-white shadow-md'
                : 'text-stone-600 dark:text-stone-300 hover:text-[var(--mousa-teal)] dark:hover:text-amber-300'
            }`}
          >
            <School size={18} />
            <span>{isAr ? 'مدارس الأحد' : 'Sunday School'}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-bold">
              {isAr ? 'المنهج والدروس' : 'Curriculum'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPublishingMode('hymns')}
            className={`flex-1 w-full sm:w-auto py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              publishingMode === 'hymns'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md'
                : 'text-stone-600 dark:text-stone-300 hover:text-amber-600 dark:hover:text-amber-300'
            }`}
          >
            <Music size={18} />
            <span>{isAr ? 'مدرسة الألحان' : 'Hymns School'}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-bold">
              {isAr ? '٣ مستويات' : '3 Levels'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPublishingMode('taxis')}
            className={`flex-1 w-full sm:w-auto py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              publishingMode === 'taxis'
                ? 'bg-gradient-to-r from-stone-800 to-stone-900 text-amber-300 shadow-md border border-amber-500/30'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-amber-300'
            }`}
          >
            <BookOpen size={18} />
            <span>{isAr ? 'طقوس الكنيسة (التاكسيس)' : 'Coptic Rituals (Taxis)'}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-800 dark:text-amber-200 font-bold">
              {isAr ? 'خطوات ومردات' : 'Rites'}
            </span>
          </button>

        </div>
      </div>

      {/* Render Mode Content */}
      {publishingMode === 'sunday_school' && (
        <div>
          {sundaySchoolContent}
        </div>
      )}

      {publishingMode === 'hymns' && (
        <HymnsPublishingStudio lang={lang} />
      )}

      {publishingMode === 'taxis' && (
        <TaxisPublishingStudio lang={lang} />
      )}

    </div>
  );
}
