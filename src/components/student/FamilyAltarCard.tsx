import React, { useState, useEffect } from 'react';
import { Flame, Heart, BookOpen, CheckCircle2, ChevronDown, ChevronUp, Users, Sparkles, MessageCircleHeart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getCurrentWeekFamilyAltar, WEEKLY_FAMILY_ALTAR_PROMPTS, FamilyAltarPrompt } from '../../data/familyAltarData';
import { useAuth } from '../../context/AuthContext';
import { awardPoints } from '../../lib/pointsService';
import { Language } from '../../types';

export function FamilyAltarCard({ lang }: { lang: Language }) {
  const { userData, updateUserData } = useAuth();
  const [currentPrompt, setCurrentPrompt] = useState<FamilyAltarPrompt>(getCurrentWeekFamilyAltar());
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasPrayedThisWeek, setHasPrayedThisWeek] = useState(false);
  const [showPromptPicker, setShowPromptPicker] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`family_altar_prayed_${currentPrompt.id}`);
      setHasPrayedThisWeek(stored === 'true');
    }
  }, [currentPrompt.id]);

  const handleMarkPrayed = () => {
    if (hasPrayedThisWeek) return;

    if (typeof window !== 'undefined') {
      localStorage.setItem(`family_altar_prayed_${currentPrompt.id}`, 'true');
    }
    setHasPrayedThisWeek(true);

    if (userData) {
      const updated = awardPoints(userData.id, 50, `صلاة المذبح العائلي الأسبوعي (${currentPrompt.themeAr})`);
      updateUserData(updated);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-linear-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-amber-300/60 dark:border-amber-900/50 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden"
    >
      {/* Decorative flame background */}
      <div className="absolute -left-6 -bottom-6 opacity-10 dark:opacity-5 pointer-events-none text-amber-600">
        <Flame size={140} />
      </div>

      <div className="relative z-10">
        {/* Header Badge & Title */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
              <Flame size={18} />
            </span>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                {lang === 'ar' ? 'مذبح العيلة الأسبوعي • وقت الصلاة في البيت' : 'Weekly Family Altar • Home Prayer'}
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-[var(--color-church-blue)] dark:text-amber-200">
                {lang === 'ar' ? currentPrompt.titleAr : currentPrompt.titleEn}
              </h3>
            </div>
          </div>

          <button
            onClick={() => setShowPromptPicker(!showPromptPicker)}
            className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 px-2.5 py-1 rounded-lg bg-amber-100/70 dark:bg-amber-950/60 border border-amber-300/40 transition-colors"
          >
            {lang === 'ar' ? 'غيّر الموضوع' : 'Change Topic'}
          </button>
        </div>

        {/* Prompt Selector Dropdown */}
        {showPromptPicker && (
          <div className="mb-4 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 shadow-md space-y-2">
            <p className="text-xs font-bold text-gray-500">{lang === 'ar' ? 'اختار موضوع صلاة العيلة:' : 'Select Family Prompt:'}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {WEEKLY_FAMILY_ALTAR_PROMPTS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setCurrentPrompt(p);
                    setShowPromptPicker(false);
                  }}
                  className={`text-start p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    currentPrompt.id === p.id 
                      ? 'bg-amber-500 text-white border-amber-600' 
                      : 'bg-gray-50 dark:bg-slate-700/50 hover:bg-amber-50 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-slate-600'
                  }`}
                >
                  <p className="line-clamp-1">{lang === 'ar' ? p.titleAr : p.titleEn}</p>
                  <span className="text-[10px] opacity-80">{lang === 'ar' ? p.scriptureRefAr : p.scriptureRefEn}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scripture Reading Section */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs rounded-2xl p-4 border border-amber-200/50 dark:border-slate-700 mb-4">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-400 mb-1.5">
            <div className="flex items-center gap-1.5">
              <BookOpen size={14} />
              <span>{lang === 'ar' ? 'قراءة إنجيل العيلة' : 'Scripture Reading'}</span>
            </div>
            <span className="bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full text-[11px]">
              {lang === 'ar' ? currentPrompt.scriptureRefAr : currentPrompt.scriptureRefEn}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-relaxed italic">
            "{lang === 'ar' ? currentPrompt.scriptureTextAr : currentPrompt.scriptureTextEn}"
          </p>
        </div>

        {/* Action Toggle (Read Questions & Prayer) */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-100 transition-colors cursor-pointer"
          >
            <MessageCircleHeart size={16} />
            <span>
              {isExpanded
                ? (lang === 'ar' ? 'اخفي أسئلة النقاش والصلاة' : 'Hide Discussion & Prayer')
                : (lang === 'ar' ? 'اعرض ٣ أسئلة تتكلموا فيها على السفرة وتصلّوا مع بعض (+)' : 'View 3 Dinner Discussion Questions & Prayer (+)')}
            </span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* Mark As Prayed Button */}
          <button
            onClick={handleMarkPrayed}
            disabled={hasPrayedThisWeek}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer ${
              hasPrayedThisWeek
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 cursor-default'
                : 'bg-[var(--color-church-burgundy)] hover:bg-[#6e1623] text-white shadow-md active:scale-95'
            }`}
          >
            <CheckCircle2 size={16} className={hasPrayedThisWeek ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-300'} />
            <span>
              {hasPrayedThisWeek
                ? (lang === 'ar' ? 'صلّينا مع بعض كعيلة ✓ (+٥٠ نقطة)' : 'Prayed Together ✓ (+50 Pts)')
                : (lang === 'ar' ? 'صلّينا مع بعض كعيلة (+٥٠ نقطة)' : 'We Prayed Together (+50 Pts)')}
            </span>
          </button>
        </div>

        {/* Expanded Discussion & Prayer Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-4 space-y-4 border-t border-amber-200/50 dark:border-slate-700/60 mt-4 overflow-hidden"
            >
              {/* 3 Discussion Questions */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                  <Users size={14} />
                  <span>{lang === 'ar' ? 'أسئلة تتكلموا فيها كعيلة:' : 'Discussion Questions for Parents & Kids:'}</span>
                </h4>
                <div className="space-y-2">
                  {(lang === 'ar' ? currentPrompt.discussionQuestionsAr : currentPrompt.discussionQuestionsEn).map((q, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-slate-800/60 p-2.5 rounded-xl border border-amber-100 dark:border-slate-700/40">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <p className="pt-0.5 leading-relaxed font-medium">{q}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Family Bedtime Prayer */}
              <div className="bg-amber-100/60 dark:bg-amber-950/40 border border-amber-300/50 dark:border-amber-900/40 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 mb-1 flex items-center gap-1.5">
                  <Heart size={14} className="text-[var(--color-church-burgundy)] fill-[var(--color-church-burgundy)]" />
                  <span>{lang === 'ar' ? 'صلاة العيلة مع بعض قبل النوم:' : 'United Bedtime Prayer:'}</span>
                </h4>
                <p className="text-xs sm:text-sm font-semibold text-amber-950 dark:text-amber-100 leading-relaxed italic">
                  "{lang === 'ar' ? currentPrompt.prayerAr : currentPrompt.prayerEn}"
                </p>
              </div>

              {/* Practical Kind Action */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-slate-800/80 border border-amber-200 dark:border-slate-700 text-xs text-amber-950 dark:text-amber-200">
                <Sparkles size={16} className="text-[var(--color-church-gold)] shrink-0" />
                <span>
                  <strong>{lang === 'ar' ? 'حاجة نقدر نعملها في البيت: ' : 'Practical Home Step: '}</strong>
                  {lang === 'ar' ? currentPrompt.practicalActionAr : currentPrompt.practicalActionEn}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
