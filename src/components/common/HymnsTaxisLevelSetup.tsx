import React, { useState } from 'react';
import { Award, LoaderCircle } from 'lucide-react';
import type { Language } from '../../types';
import { initializeMyHymnsTaxisLevel } from '../../lib/hymnsTaxisLevelService';
import type { HymnsTaxisLevel } from '../../lib/hymnsTaxisLevel';

interface HymnsTaxisLevelSetupProps {
  lang: Language;
  onSaved: (level: HymnsTaxisLevel) => void;
}

const LEVELS: HymnsTaxisLevel[] = [1, 2, 3];

export function HymnsTaxisLevelSetup({ lang, onSaved }: HymnsTaxisLevelSetupProps) {
  const isAr = lang === 'ar';
  const [selectedLevel, setSelectedLevel] = useState<HymnsTaxisLevel>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveLevel = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await initializeMyHymnsTaxisLevel(selectedLevel);
    setSaving(false);
    if (!result.success || !result.level) {
      setError(result.error || (isAr ? 'تعذر حفظ المستوى.' : 'Could not save your level.'));
      return;
    }
    onSaved(result.level);
  };

  return (
    <form onSubmit={saveLevel} dir={isAr ? 'rtl' : 'ltr'} className="space-y-4 rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex items-start gap-3">
        <Award className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
        <div>
          <h2 className="font-black text-stone-900 dark:text-amber-100">
            {isAr ? 'اختار مستواك المشترك في الألحان والطقس' : 'Choose your shared Hymns & Taxis level'}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
            {isAr
              ? 'المستوى ده هيتحفظ في ملفك ويتطبق على الألحان ومواد الطقس معاً. تقدر تختاره مرة واحدة؛ لو محتاج تغييره بعد كده، تواصل مع خادمك.'
              : 'This level is saved to your profile and applies to both Hymns and Taxis. You can set it once; contact your teacher if it needs to change later.'}
          </p>
        </div>
      </div>
      <fieldset disabled={saving} className="grid gap-2 sm:grid-cols-3">
        <legend className="sr-only">{isAr ? 'المستوى' : 'Level'}</legend>
        {LEVELS.map(level => (
          <label key={level} className={`cursor-pointer rounded-2xl border p-3 text-center font-bold transition-colors ${selectedLevel === level ? 'border-[var(--mousa-teal)] bg-[var(--mousa-teal)] text-white' : 'border-amber-200 bg-white text-stone-800 hover:border-amber-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100'}`}>
            <input
              type="radio"
              name="hymns-taxis-level"
              value={level}
              checked={selectedLevel === level}
              onChange={() => setSelectedLevel(level)}
              className="sr-only"
            />
            {isAr ? `المستوى ${['الأول', 'الثاني', 'الثالث'][level - 1]}` : `Level ${level}`}
          </label>
        ))}
      </fieldset>
      {error && <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-300">{error}</p>}
      <button type="submit" disabled={saving} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--mousa-teal)] px-4 py-2.5 font-black text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">
        {saving && <LoaderCircle size={16} className="animate-spin" />}
        {saving
          ? (isAr ? 'بيتم حفظ اختيارك...' : 'Saving your selection...')
          : (isAr ? 'حفظ المستوى وفتح المحتوى' : 'Save level and open lessons')}
      </button>
    </form>
  );
}
