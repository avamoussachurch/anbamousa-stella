import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  FileText,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TaxisItem, TaxisSection, TaxisCategory, Language } from '../../types';
import { getTaxisItems } from '../../lib/taxisService';
import { useAuth } from '../../context/AuthContext';
import { recordStudentSchoolActivity } from '../../lib/studentProgressService';

interface CopticTaxisTabProps {
  lang?: Language;
}

export function CopticTaxisTab({ lang = 'ar' }: CopticTaxisTabProps) {
  const isAr = lang === 'ar';
  const { userData, setUserDirectly } = useAuth();
  const [items, setItems] = useState<TaxisItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<TaxisItem | null>(null);
  const [completedRituals, setCompletedRituals] = useState<Record<string, boolean>>({});
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getTaxisItems(selectedCategory).then(res => {
      if (!isMounted) return;
      if (res.success && res.items) {
        setItems(res.items);
        if (!selectedItem && res.items.length > 0) {
          setSelectedItem(res.items[0]);
        }
      }
      setLoading(false);
    });
    return () => { isMounted = false; };
  }, [selectedCategory]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored: Record<string, boolean> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('church_taxis_completed_')) {
            stored[key.replace('church_taxis_completed_', '')] = true;
          }
        }
        setCompletedRituals(stored);
      } catch (e) {}
    }
  }, []);

  const handleCompleteRitual = async (ritualId: string) => {
    if (isMarkingComplete || !selectedItem) return;
    setIsMarkingComplete(true);
    setCompletedRituals(prev => ({ ...prev, [ritualId]: true }));
    try {
      localStorage.setItem(`church_taxis_completed_${ritualId}`, 'true');
    } catch (e) {}

    if (userData) {
      try {
        const res = await recordStudentSchoolActivity({
          school: 'taxis',
          activityId: ritualId,
          activityType: 'TAXIS_COMPLETED',
          titleAr: selectedItem.titleAr || 'ترتيب طقسي معتمد',
          titleEn: selectedItem.titleEn || 'Liturgical Order',
          studentId: userData.id
        });
        if (res.success && setUserDirectly) {
          setUserDirectly({
            ...userData,
            points: res.totalPoints ?? (userData.points + (res.pointsEarned || 50)),
            currentStreak: res.streak?.currentStreak ?? userData.currentStreak ?? 1,
            longestStreak: res.streak?.longestStreak ?? userData.longestStreak
          });
        }
      } catch (err) {
        console.warn('Note on taxis activity record:', err);
      }
    }
    setIsMarkingComplete(false);
  };

  const filteredItems = items.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const tAr = (item.titleAr || '').toLowerCase();
    const tEn = (item.titleEn || '').toLowerCase();
    const tCopt = (item.titleCopt || '').toLowerCase();
    const sAr = (item.summaryAr || '').toLowerCase();
    const inSections = item.sections?.some(s =>
      (s.titleAr || '').toLowerCase().includes(q) ||
      (s.contentAr || '').toLowerCase().includes(q) ||
      (s.priestAction || '').toLowerCase().includes(q) ||
      (s.deaconResponse || '').toLowerCase().includes(q)
    );
    return tAr.includes(q) || tEn.includes(q) || tCopt.includes(q) || sAr.includes(q) || inSections;
  });

  const categories = [
    { id: 'ALL', labelAr: 'كافة الطقوس', labelEn: 'All Rituals' },
    { id: 'liturgy', labelAr: 'القداس الإلهي والأنافورا', labelEn: 'Divine Liturgy' },
    { id: 'incense', labelAr: 'رفع بخور عشية وباكر', labelEn: 'Offering of Incense' },
    { id: 'sacraments', labelAr: 'الأسرار الكنسية', labelEn: 'Holy Sacraments' },
    { id: 'feasts', labelAr: 'الأعياد السيدية', labelEn: 'Feasts' },
    { id: 'pascha', labelAr: 'أسبوع الآلام والبصخة', labelEn: 'Holy Pascha' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="pb-28 pt-6 px-4 w-full max-w-7xl mx-auto space-y-6"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-[#1F1610] via-[#2D1E12] to-[#42220E] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-amber-600/30">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-xs font-bold">
            <BookOpen size={14} className="text-amber-300" />
            <span>{isAr ? 'الترتيب الطقسي للكنيسة القبطية الأرثوذكسية' : 'Coptic Orthodox Liturgical Order'}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-amber-300">
            {isAr ? 'طقوس الكنيسة والتاكسيس' : 'Coptic Rituals & Taxis'}
          </h1>
          <p className="text-xs sm:text-base text-stone-200 leading-relaxed font-medium">
            {isAr
              ? 'دليل شامل لترتيب صلوات القداس، رفع بخور عشية وباكر، الأسرار السبعة، حركات وأفعال الكاهن ومردات الشماس المعتمدة وفقاً للتقليد السكندري العريق.'
              : 'Official order of liturgical services, priest actions, deacon responses, and ecclesiastical rubrics.'}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-[var(--mousa-border-sand)] space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedCategory === c.id
                    ? 'bg-[var(--mousa-teal)] text-white shadow-xs font-black'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                }`}
              >
                {isAr ? c.labelAr : c.labelEn}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative min-w-[240px]">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث في خطوات الطقس والمردات...' : 'Search rituals & rubrics...'}
              className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Rituals List & Active Detail Reader */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: List of Rituals */}
        <div className="space-y-3">
          {loading ? (
            <div className="p-8 text-center text-xs text-stone-400 font-bold bg-white dark:bg-slate-900 rounded-3xl border border-stone-200">
              {isAr ? 'جاري تحميل الطقوس...' : 'Loading rituals...'}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400 font-bold bg-white dark:bg-slate-900 rounded-3xl border border-stone-200">
              {isAr ? 'لم يتم العثور على طقوس مطابقة للبحث.' : 'No matching rituals found.'}
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-4 rounded-3xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-50 to-amber-100/60 dark:from-stone-800 dark:to-stone-850 border-amber-500 shadow-sm ring-2 ring-amber-400/40'
                      : 'bg-white dark:bg-slate-900 hover:bg-stone-50 dark:hover:bg-stone-800/60 border-[var(--mousa-border-sand)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-black text-sm text-[var(--mousa-teal-deep)] dark:text-amber-300">
                      {item.titleAr}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-900 dark:text-amber-200 shrink-0">
                      {item.sections?.length || 0} {isAr ? 'خطوات' : 'steps'}
                    </span>
                  </div>

                  {item.titleCopt && (
                    <p className="text-xs font-serif text-amber-800 dark:text-amber-400 mb-1">
                      {item.titleCopt}
                    </p>
                  )}

                  <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                    {item.summaryAr || item.summaryEn}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: In-Depth Ritual Reader */}
        <div className="lg:col-span-2">
          {selectedItem ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[var(--mousa-border-sand)] space-y-6 shadow-sm">
              {/* Header */}
              <div className="border-b border-stone-200 dark:border-stone-800 pb-5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black px-2.5 py-0.5 bg-amber-500/20 text-amber-900 dark:text-amber-300 rounded-full">
                    {selectedItem.category}
                  </span>
                  <span className="text-[10px] font-bold text-stone-400">
                    v{selectedItem.version} • {selectedItem.publishedAt ? new Date(selectedItem.publishedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') : ''}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-[var(--mousa-teal-deep)] dark:text-amber-300">
                  {selectedItem.titleAr}
                </h2>

                {selectedItem.titleCopt && (
                  <p className="text-base font-serif text-amber-800 dark:text-amber-400">
                    {selectedItem.titleCopt}
                  </p>
                )}

                {selectedItem.summaryAr && (
                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed font-medium pt-1">
                    {selectedItem.summaryAr}
                  </p>
                )}

                {/* References & Documents */}
                {(selectedItem.references?.length > 0 || selectedItem.documents?.length > 0) && (
                  <div className="pt-2 flex items-center gap-3 flex-wrap text-xs text-stone-500">
                    {selectedItem.references?.map((ref, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 font-bold">
                        📖 {ref}
                      </span>
                    ))}
                    {selectedItem.documents?.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-300 rounded-lg font-black transition-colors"
                      >
                        <FileText size={13} />
                        <span>{doc.title}</span>
                      </a>
                    ))}
                  </div>
                )}

                {/* Completion Action & Streak Badge */}
                <div className="pt-3 flex items-center justify-between gap-3 flex-wrap border-t border-stone-200/60 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => handleCompleteRitual(selectedItem.id)}
                    disabled={Boolean(completedRituals[selectedItem.id]) || isMarkingComplete}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                      completedRituals[selectedItem.id]
                        ? 'bg-emerald-600 text-white font-black cursor-default'
                        : 'bg-gradient-to-r from-[var(--mousa-teal)] to-teal-700 hover:brightness-105 text-white'
                    }`}
                  >
                    <CheckCircle2 size={16} />
                    <span>
                      {completedRituals[selectedItem.id]
                        ? (isAr ? '✓ تم إتمام دراسة الطقس وحساب الستريك' : '✓ Completed Ritual & Streak Active')
                        : (isAr ? 'إتمام دراسة الترتيب الطقسي (+٥٠ نقطة)' : 'Complete Ritual Study (+50 Pts)')}
                    </span>
                  </button>
                  {completedRituals[selectedItem.id] && (
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      🔥 {isAr ? 'تم تسجيل اليوم في سلسلتك الروحية' : 'Daily streak recorded!'}
                    </span>
                  )}
                </div>
              </div>

              {/* Ordered Sections */}
              <div className="space-y-4">
                <h3 className="font-black text-sm text-[var(--mousa-teal-deep)] dark:text-amber-300 flex items-center gap-2">
                  <Layers size={16} />
                  <span>{isAr ? 'خطوات الترتيب الطقسي بالتسلسل:' : 'Liturgical Sequence of Steps:'}</span>
                </h3>

                <div className="space-y-4">
                  {selectedItem.sections?.map((step) => (
                    <div
                      key={step.id}
                      className="p-4 sm:p-5 bg-stone-50 dark:bg-stone-800/60 rounded-3xl border border-stone-200 dark:border-stone-700 space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-2xl bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {step.order}
                        </span>
                        <div>
                          <h4 className="font-black text-sm text-stone-900 dark:text-white">
                            {step.titleAr}
                          </h4>
                          {step.titleCopt && (
                            <span className="text-xs font-serif text-amber-800 dark:text-amber-400 block">
                              {step.titleCopt}
                            </span>
                          )}
                        </div>
                      </div>

                      {step.contentAr && (
                        <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed font-medium">
                          {step.contentAr}
                        </p>
                      )}

                      {/* Priest Action Callout */}
                      {step.priestAction && (
                        <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl border border-amber-300/60 dark:border-amber-900/40 text-xs">
                          <span className="font-black text-amber-900 dark:text-amber-300 block mb-0.5">
                            ✝️ {isAr ? 'فعل الكاهن:' : 'Priest Action:'}
                          </span>
                          <span className="text-stone-800 dark:text-stone-200 leading-relaxed font-medium">
                            {step.priestAction}
                          </span>
                        </div>
                      )}

                      {/* Deacon Response Callout */}
                      {step.deaconResponse && (
                        <div className="p-3 bg-blue-50/80 dark:bg-blue-950/30 rounded-2xl border border-blue-300/60 dark:border-blue-900/40 text-xs">
                          <span className="font-black text-blue-900 dark:text-blue-300 block mb-0.5">
                            🔔 {isAr ? 'مرد الشماس:' : 'Deacon Response:'}
                          </span>
                          <span className="text-stone-800 dark:text-stone-200 leading-relaxed font-medium">
                            {step.deaconResponse}
                          </span>
                        </div>
                      )}

                      {/* Rubrics */}
                      {step.rubricNotes && (
                        <div className="text-[11px] text-stone-500 italic bg-white/60 dark:bg-stone-900/40 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800">
                          📜 {isAr ? 'إرشاد طقسي:' : 'Rubric:'} {step.rubricNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-stone-400 font-bold bg-white dark:bg-slate-900 rounded-3xl border border-stone-200">
              {isAr ? 'اختر طقساً من القائمة لعرض تفاصيله.' : 'Select a ritual to view.'}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
