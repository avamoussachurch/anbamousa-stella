import React, { useState, useEffect } from 'react';
import { Star, Medal, Lock, Trophy, Users, ChevronUp, History, Landmark, Gift, X, CheckCircle2, AlertCircle, Flame, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { mockBadges } from '../../data';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { submitRewardRequest } from '../../lib/supabaseDatabase';
import { addRewardRequest } from '../../lib/parentChildService';
import { 
  getLeaderboard, 
  getStreakLeaderboard, 
  StreakLeaderboardEntry,
  getSavedPurchases, 
  saveRewardPurchaseLocal 
} from '../../lib/pointsService';
import { LeaderboardEntry, Language } from '../../types';
import { LeaderboardPodium, PodiumItem } from './LeaderboardPodium';

const REWARD_PRODUCTS = [
  { id: '1', title: 'Small Saint Picture', titleAr: 'صورة قديس صغيرة', cost: 50, icon: '🖼️' },
  { id: '2', title: 'Wooden Icon', titleAr: 'أيقونة خشبية', cost: 100, icon: '🪵' },
  { id: '3', title: 'Church Notebook', titleAr: 'كشكول الكنيسة', cost: 150, icon: '📓' },
  { id: '4', title: 'Cross Necklace', titleAr: 'صليب الكنيسة', cost: 200, icon: '✝️' },
];

export function PointsTab({ lang }: { lang: Language }) {
  const { userData, addPoints } = useAuth();
  
  // Section order:
  // 1. Streak Stars (نجوم الستريك) — DEFAULT
  // 2. My Trail (رحلتي)
  // 3. Points Leaderboard (لوحة نقاط البركة)
  // 4. Points Bazaar (بازار النقط)
  const [view, setView] = useState<'streak' | 'trail' | 'leaderboard' | 'bazaar'>('streak');
  const [showStore, setShowStore] = useState(false);
  const [leaderboardList, setLeaderboardList] = useState<LeaderboardEntry[]>(() => getLeaderboard(userData));
  const [streakList, setStreakList] = useState<StreakLeaderboardEntry[]>(() => getStreakLeaderboard(userData));
  const [purchases, setPurchases] = useState<any[]>(() => userData ? getSavedPurchases(userData.id) : []);
  const [confirmPurchaseItem, setConfirmPurchaseItem] = useState<{ id: string; name: string; cost: number } | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedbackToast({ type, message });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4000);
  };

  useEffect(() => {
    setLeaderboardList(getLeaderboard(userData));
    setStreakList(getStreakLeaderboard(userData));
    const handleUpdate = () => {
      setLeaderboardList(getLeaderboard(userData));
      setStreakList(getStreakLeaderboard(userData));
    };
    window.addEventListener('church_leaderboard_updated', handleUpdate);
    window.addEventListener('church_user_updated', handleUpdate);
    return () => {
      window.removeEventListener('church_leaderboard_updated', handleUpdate);
      window.removeEventListener('church_user_updated', handleUpdate);
    };
  }, [userData]);

  useEffect(() => {
    if (!userData) return;
    const local = getSavedPurchases(userData.id);
    if (local && local.length > 0) {
      setPurchases(local);
    }

    if (view === 'bazaar' && supabase) {
       const fetchPurchases = async () => {
          try {
            const { data } = await supabase
              .from('reward_requests')
              .select('*')
              .eq('student_id', userData.id)
              .order('created_at', { ascending: false });

            if (data && data.length > 0) {
              const formatted = data.map(d => ({
                userId: d.student_id,
                rewardId: d.reward_id,
                itemName: lang === 'ar' ? (d.reward_name_ar || d.reward_name_en) : (d.reward_name_en || d.reward_name_ar),
                cost: d.cost_points,
                createdAt: d.created_at
              }));
              setPurchases(formatted);
            }
          } catch (e) {
            console.warn('Could not load purchases from Supabase:', e);
          }
       };
       fetchPurchases();
    }
  }, [userData?.id, view, lang]);

  const executePurchase = async () => {
    if (!userData || !confirmPurchaseItem) return;
    const { id: rewardId, cost, name } = confirmPurchaseItem;
    
    if (userData.points < cost) {
       showNotification('error', lang === 'ar' ? 'رصيد نقاطك غير كافٍ لإتمام هذا الطلب!' : 'Not enough points for this reward!');
       setConfirmPurchaseItem(null);
       return;
    }

    try {
       await addPoints(-cost);

       const newPurchase = {
          userId: userData.id,
          rewardId,
          itemName: name,
          cost,
          createdAt: new Date().toISOString()
       };

       saveRewardPurchaseLocal(userData.id, newPurchase);
       setPurchases(prev => [newPurchase, ...prev]);

       try {
         await submitRewardRequest(userData.id, rewardId, name, name, cost);
       } catch (e) {}

       try {
         addRewardRequest({
           childId: userData.id,
           childNameEn: userData.fullName || 'Student',
           childNameAr: userData.fullName || 'تلميذ',
           rewardTitleEn: name,
           rewardTitleAr: name,
           pointsCost: cost,
           icon: '🎁',
           parentId: userData.parentId
         });
       } catch (e) {}

       setConfirmPurchaseItem(null);
       setShowStore(false);
       showNotification('success', lang === 'ar' ? 'تم تقديم طلب الهدية بنجاح! يمكنك استلامها من خادم الفصل يوم الأحد.' : 'Request submitted successfully! Claim your reward from your servant on Sunday.');
    } catch(err: any) {
       console.error(err);
       showNotification('error', lang === 'ar' ? 'حدث خطأ أثناء إتمام الطلب' : 'Error during purchase.');
       setConfirmPurchaseItem(null);
    }
  };

  if (!userData) return null;

  return (
    <div className="pb-24 pt-6 px-4 w-full max-w-7xl mx-auto space-y-8 overflow-hidden" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* 4-Section View Toggle in Exact Required Order */}
      <div className="flex flex-wrap bg-[var(--mousa-cream-surface)] dark:bg-[#1C1712] rounded-2xl p-1.5 shadow-sm border-2 border-[var(--mousa-border-sand)] relative z-10 text-xs sm:text-sm max-w-2xl mx-auto gap-1">
        {/* 1. Streak Stars — Arabic: نجوم الستريك (DEFAULT) */}
        <button 
          onClick={() => setView('streak')}
          className={`flex-1 min-w-[120px] py-2.5 sm:py-3 px-2 rounded-xl font-black transition-all z-10 cursor-pointer flex items-center justify-center gap-1.5 ${
            view === 'streak' 
              ? 'bg-[var(--mousa-gold)] text-[var(--mousa-teal-deep)] shadow-sm' 
              : 'text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] hover:text-[var(--mousa-teal)]'
          }`}
        >
          <Flame size={16} className={view === 'streak' ? 'fill-current text-amber-700' : 'text-amber-500'} />
          <span>{lang === 'ar' ? 'نجوم الستريك' : 'Streak Stars'}</span>
        </button>

        {/* 2. My Trail — Arabic: رحلتي */}
        <button 
          onClick={() => setView('trail')}
          className={`flex-1 min-w-[110px] py-2.5 sm:py-3 px-2 rounded-xl font-black transition-all z-10 cursor-pointer flex items-center justify-center gap-1.5 ${
            view === 'trail' 
              ? 'bg-[var(--mousa-teal)] text-white shadow-sm' 
              : 'text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] hover:text-[var(--mousa-teal)]'
          }`}
        >
          <Trophy size={15} />
          <span>{lang === 'ar' ? 'رحلتي' : 'My Trail'}</span>
        </button>

        {/* 3. Points Leaderboard — Arabic: لوحة نقاط البركة */}
        <button 
          onClick={() => setView('leaderboard')}
          className={`flex-1 min-w-[125px] py-2.5 sm:py-3 px-2 rounded-xl font-black transition-all z-10 cursor-pointer flex items-center justify-center gap-1.5 ${
            view === 'leaderboard' 
              ? 'bg-[var(--mousa-teal)] text-white shadow-sm' 
              : 'text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] hover:text-[var(--mousa-teal)]'
          }`}
        >
          <Users size={15} />
          <span>{lang === 'ar' ? 'لوحة نقاط البركة' : 'Points Leaderboard'}</span>
        </button>

        {/* 4. Points Bazaar — Arabic: بازار النقط */}
        <button 
          onClick={() => setView('bazaar')}
          className={`flex-1 min-w-[110px] py-2.5 sm:py-3 px-2 rounded-xl font-black transition-all z-10 cursor-pointer flex items-center justify-center gap-1.5 ${
            view === 'bazaar' 
              ? 'bg-[var(--mousa-coral)] text-white shadow-sm' 
              : 'text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] hover:text-[var(--mousa-teal)]'
          }`}
        >
          <Gift size={15} />
          <span>{lang === 'ar' ? 'بازار النقط' : 'Points Bazaar'}</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* =========================================================================
            SECTION 1: STREAK STARS (نجوم الستريك) — DEFAULT VISIBLE
           ========================================================================= */}
        {view === 'streak' && (
          <motion.div 
            key="streak"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] rounded-3xl p-6 md:p-8 shadow-sm border-2 border-[var(--mousa-border-sand)] space-y-6 md:max-w-4xl md:mx-auto"
          >
            {/* Personal Streak Status Banner */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="text-center space-y-2 bg-gradient-to-b from-amber-50 to-orange-50/40 dark:from-amber-950/40 dark:to-[#1E1914] p-6 rounded-3xl border-2 border-amber-300 dark:border-amber-800/60 max-w-md mx-auto shadow-sm"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-2xl text-white shadow-md mb-2">
                <Flame size={36} fill="currentColor" className="text-white drop-shadow-xs" />
              </div>
              <div className="text-4xl md:text-5xl font-black text-amber-700 dark:text-amber-400 tracking-tight">
                {userData.currentStreak || 1} {lang === 'ar' ? 'أيام' : 'Days'}
              </div>
              <p className="text-stone-800 dark:text-stone-200 font-extrabold uppercase tracking-wider text-xs sm:text-sm">
                {lang === 'ar' ? 'سلسلة المواظبة الحالية في مسيرة الأنبا موسى' : 'Current Daily Learning Streak'}
              </p>
              <div className="flex items-center justify-center gap-3 pt-2 text-xs font-bold text-stone-600 dark:text-stone-400">
                <span>{lang === 'ar' ? `🏆 أطول مواظبة: ${userData.longestStreak || userData.currentStreak || 1} يوم` : `🏆 Longest: ${userData.longestStreak || userData.currentStreak || 1} days`}</span>
              </div>
            </motion.div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-[var(--mousa-border-sand)]">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-stone-900 dark:text-stone-50 flex items-center gap-2">
                  <Flame size={26} className="text-amber-500 fill-amber-500" />
                  <span>{lang === 'ar' ? 'نجوم الستريك والمواظبة' : 'Streak Stars Leaderboard'}</span>
                </h2>
                <p className="text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300">
                  {lang === 'ar' ? 'أبطال الحضور المستمر والصلوات اليومية ومحطات الدروس' : 'Champions of daily prayer, attendance & weekly milestones'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-black">
                <Sparkles size={14} />
                <span>{lang === 'ar' ? `سلسلتك: ${userData.currentStreak || 1} أيام` : `Your Streak: ${userData.currentStreak || 1} Days`}</span>
              </div>
            </div>

            {/* Visual Top 3 Podium for Streaks */}
            <LeaderboardPodium 
              items={streakList.slice(0, 3).map(e => ({
                id: e.id,
                studentId: e.studentId,
                studentName: e.studentName,
                studentNameAr: e.studentNameAr,
                avatarUrl: e.avatarUrl,
                score: e.streakDays,
                rank: e.rank
              }))}
              type="streak"
              lang={lang}
              currentUserId={userData.id}
            />

            {/* Ranks 4+ List */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400 px-1">
                {lang === 'ar' ? 'باقي رفقاء المسيرة' : 'Caravan Runners (Ranks 4+)'}
              </h3>
              {streakList.slice(3).map((entry) => {
                const isCurrentUser = entry.studentId === userData.id || (userData.id.startsWith('guest_') && entry.studentId === 'u1');
                return (
                  <motion.div 
                    key={entry.id || entry.studentId}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl border-2 transition-all ${
                      isCurrentUser 
                        ? 'bg-amber-50/80 dark:bg-amber-950/40 border-[var(--mousa-gold)] shadow-sm ring-2 ring-[var(--mousa-gold)]/40' 
                        : 'bg-white/60 dark:bg-stone-900/60 border-[var(--mousa-border-sand)] hover:border-stone-300'
                    }`}
                  >
                    <div className="font-black text-base sm:text-lg text-stone-600 dark:text-stone-400 w-8 text-center shrink-0">
                      #{entry.rank}
                    </div>
                    <img 
                      src={entry.avatarUrl} 
                      alt={entry.studentName} 
                      className="w-11 h-11 rounded-full border-2 border-[var(--mousa-gold)] shadow-xs object-cover bg-white shrink-0" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-stone-900 dark:text-stone-50 text-sm sm:text-base truncate">
                          {isCurrentUser ? (lang === 'ar' ? `${entry.studentNameAr} (أنت)` : `${entry.studentName} (You)`) : (lang === 'ar' ? entry.studentNameAr : entry.studentName)}
                        </h4>
                        {isCurrentUser && (
                          <span className="text-[10px] bg-[var(--mousa-gold)] text-[var(--mousa-teal-deep)] font-black px-2 py-0.5 rounded-full shrink-0">
                            {lang === 'ar' ? 'أنت' : 'You'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-400 font-bold flex items-center gap-1 mt-0.5">
                        <span>{lang === 'ar' ? `أطول ستريك: ${entry.longestStreak} يوم` : `Longest: ${entry.longestStreak} days`}</span>
                      </p>
                    </div>
                    <div className="text-right px-2 shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        <Flame size={18} className="text-amber-500 fill-amber-500" />
                        <span className="font-black text-xl sm:text-2xl text-amber-700 dark:text-amber-400">{entry.streakDays}</span>
                      </div>
                      <p className="text-[10px] sm:text-xs font-black text-stone-600 dark:text-stone-400 uppercase">
                        {lang === 'ar' ? 'أيام متتالية' : 'Days Streak'}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* =========================================================================
            SECTION 2: MY TRAIL (رحلتي) — HIGH-CONTRAST BADGES & TIMELINE
           ========================================================================= */}
        {view === 'trail' && (
          <motion.div 
            key="trail"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] rounded-3xl p-6 md:p-8 shadow-sm border-2 border-[var(--mousa-border-sand)] relative md:max-w-4xl md:mx-auto"
          >
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[var(--mousa-border-sand)]">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-stone-900 dark:text-stone-50 flex items-center gap-2">
                  <Trophy size={26} className="text-[var(--mousa-gold)]" />
                  <span>{lang === 'ar' ? 'أوسمة رحلتي في طريق الأنبا موسى' : 'My Trail & Journey Badges'}</span>
                </h2>
                <p className="text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300">
                  {lang === 'ar' ? 'الأوسمة التي تكتسبها مع كل محطة وتقدم في النقاط والصلوات' : 'Badges earned as you advance through milestones, prayer, and lessons'}
                </p>
              </div>
            </div>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-7 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-[var(--mousa-border-sand)]">
              {mockBadges.map((badge, index) => {
                const isUnlocked = userData.points >= badge.pointsThreshold;
                
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    key={badge.id} 
                    className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                  >
                    {/* Icon Marker */}
                    <motion.div 
                      whileHover={isUnlocked ? { scale: 1.12 } : {}}
                      className={`flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl border-2 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 transition-transform ${
                      isUnlocked 
                        ? 'bg-[var(--mousa-gold)] text-white border-white ring-2 ring-[var(--mousa-gold-light)]' 
                        : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-700'
                    }`}>
                      {isUnlocked ? <Medal size={26} className="drop-shadow-xs" /> : <Lock size={22} />}
                    </motion.div>
                    
                    {/* Content Card with Enhanced High-Contrast Styling */}
                    <div className={`w-[calc(100%-4.5rem)] md:w-[calc(50%-3rem)] p-4 md:p-6 rounded-2xl border-2 transition-all ${
                      isUnlocked 
                        ? 'bg-amber-50/90 dark:bg-stone-900 border-[var(--mousa-gold)] shadow-sm' 
                        : 'bg-stone-100/90 dark:bg-stone-900/50 border-stone-300 dark:border-stone-800'
                    }`}>
                      <h3 className={`font-black text-base md:text-lg ${isUnlocked ? 'text-stone-900 dark:text-stone-50' : 'text-stone-700 dark:text-stone-300'}`}>
                        {badge.title}
                      </h3>
                      <p className={`text-xs md:text-sm font-bold mt-1 ${isUnlocked ? 'text-stone-800 dark:text-stone-200' : 'text-stone-600 dark:text-stone-400'}`}>
                        +{badge.pointsThreshold} {lang === 'ar' ? 'نقطة بركة لازمة للفتح' : 'points required'}
                      </p>
                      {isUnlocked ? (
                        <div className="mt-2 text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 size={14} />
                          <span>{lang === 'ar' ? 'وسام مفتوح ومكتسب ✅' : 'Unlocked & Earned ✅'}</span>
                        </div>
                      ) : (
                        <div className="mt-2 text-xs font-bold text-stone-600 dark:text-stone-400 flex items-center gap-1">
                          <Lock size={12} />
                          <span>{lang === 'ar' ? `متبقي ${badge.pointsThreshold - userData.points} نقطة للفتح` : `${badge.pointsThreshold - userData.points} pts left to unlock`}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* =========================================================================
            SECTION 3: POINTS LEADERBOARD (لوحة نقاط البركة)
           ========================================================================= */}
        {view === 'leaderboard' && (
          <motion.div 
            key="leaderboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] rounded-3xl p-6 md:p-8 shadow-sm border-2 border-[var(--mousa-border-sand)] space-y-6 md:max-w-4xl md:mx-auto"
          >
            {/* Header Stats: Total Blessing Points Summary (Exclusively on Points Leaderboard) */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="text-center space-y-2 bg-gradient-to-b from-amber-50 to-orange-50/40 dark:from-stone-900 dark:to-[#1E1914] p-6 rounded-3xl border-2 border-[var(--mousa-border-sand)] max-w-md mx-auto shadow-sm"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-[var(--mousa-gold)] to-[var(--mousa-coral)] rounded-2xl text-white shadow-md mb-2">
                <Star size={34} fill="currentColor" className="text-white drop-shadow-xs" />
              </div>
              <div className="text-4xl md:text-5xl font-black text-stone-900 dark:text-stone-50 tracking-tight">
                {userData.points}
              </div>
              <p className="text-stone-800 dark:text-stone-200 font-extrabold uppercase tracking-wider text-xs sm:text-sm">
                {lang === 'ar' ? 'إجمالي نقاط البركة في مسيرة الأنبا موسى' : 'Total Blessing Points'}
              </p>
            </motion.div>

             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-[var(--mousa-border-sand)]">
               <div>
                 <h2 className="text-xl md:text-2xl font-black text-stone-900 dark:text-stone-50 flex items-center gap-2">
                   <Users size={26} className="text-[var(--mousa-gold)]" />
                   <span>{lang === 'ar' ? 'لوحة نقاط البركة الأسبوعية' : 'Weekly Points Leaderboard'}</span>
                 </h2>
                 <p className="text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300">
                   {lang === 'ar' ? 'ترتيب رفقاء المسيرة بنقاط البركة الحقيقية' : 'Official rankings based on earned milestone blessing points'}
                 </p>
               </div>
               <span className="text-xs font-black px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-[var(--mousa-border-sand)]">
                 {userData?.grade || (lang === 'ar' ? 'مرحلة ابتدائي' : 'Elementary')}
               </span>
             </div>

             {/* Visual Top 3 Podium for Points */}
             <LeaderboardPodium 
               items={leaderboardList.slice(0, 3).map(e => ({
                 id: e.id,
                 studentId: e.studentId,
                 studentName: e.studentName,
                 avatarUrl: e.avatarUrl,
                 score: e.pointsThisWeek,
                 rank: e.rank
               }))}
               type="points"
               lang={lang}
               currentUserId={userData.id}
             />
             
             {/* Ranks 4+ List */}
             <div className="space-y-3 pt-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400 px-1">
                  {lang === 'ar' ? 'باقي رفقاء المسيرة' : 'Caravan Runners (Ranks 4+)'}
                </h3>
                {leaderboardList.slice(3).map((entry) => {
                  const isCurrentUser = entry.studentId === userData.id;
                  return (
                    <motion.div 
                      key={entry.id || entry.studentId}
                      className={`flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl border-2 transition-all ${
                        isCurrentUser 
                          ? 'bg-[#FAF3E5] dark:bg-[#2F241A] border-[var(--mousa-gold)] shadow-sm ring-2 ring-[var(--mousa-gold)]/40' 
                          : 'bg-white/60 dark:bg-stone-900/60 border-[var(--mousa-border-sand)]'
                      }`}
                    >
                      <div className="font-black text-base sm:text-lg text-stone-600 dark:text-stone-400 w-8 text-center shrink-0">
                        #{entry.rank}
                      </div>
                      <img 
                        src={entry.avatarUrl} 
                        alt={entry.studentName} 
                        className="w-11 h-11 rounded-full border-2 border-[var(--mousa-gold)] shadow-xs object-cover bg-white shrink-0" 
                      />
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2">
                           <h4 className="font-black text-stone-900 dark:text-stone-50 text-sm sm:text-base truncate">
                             {isCurrentUser ? (lang === 'ar' ? `${entry.studentName} (أنت)` : `${entry.studentName} (You)`) : entry.studentName}
                           </h4>
                           {isCurrentUser && (
                             <span className="text-[10px] bg-[var(--mousa-gold)] text-[var(--mousa-teal-deep)] font-black px-2 py-0.5 rounded-full shrink-0">
                               {lang === 'ar' ? 'أنت' : 'You'}
                             </span>
                           )}
                         </div>
                         <p className="text-xs text-stone-600 dark:text-stone-400 font-bold mt-0.5">
                           {lang === 'ar' ? 'مواظب في مسيرة الأنبا موسى' : 'Active in the Journey'}
                         </p>
                      </div>
                      <div className="text-right px-2 shrink-0">
                         <p className="font-black text-xl sm:text-2xl text-[var(--mousa-coral-dark)] dark:text-[var(--mousa-coral-glow)]">{entry.pointsThisWeek}</p>
                         <p className="text-[10px] font-black text-stone-600 dark:text-stone-400 uppercase">{lang === 'ar' ? 'نقطة' : 'Pts'}</p>
                      </div>
                    </motion.div>
                  );
                })}
             </div>
             
             <div className="mt-6 text-center bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 p-4 rounded-2xl border border-amber-200 dark:border-amber-800">
               <p className="font-bold text-xs sm:text-sm">
                 {lang === 'ar' ? 'عاش! استمر في إنهاء محطات الدروس والتسبيح للارتقاء في الترتيب.' : 'Keep going! Complete lesson milestones and hymns to climb the leaderboard.'}
               </p>
             </div>
          </motion.div>
        )}

        {/* =========================================================================
            SECTION 4: POINTS BAZAAR (بازار النقط) — BLURRED WITH COMING SOON OVERLAY
           ========================================================================= */}
        {view === 'bazaar' && (
          <motion.div 
            key="bazaar"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="relative md:max-w-4xl md:mx-auto"
          >
            {/* The Blurred Underlying Treasury Content */}
            <div className="filter blur-md select-none pointer-events-none opacity-40 space-y-6">
              <div className="bg-gradient-to-br from-[var(--mousa-teal-deep)] via-[#144E5B] to-[#103D46] rounded-3xl p-6 md:p-8 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <Landmark size={28} />
                  <h2 className="text-xl md:text-2xl font-black">{lang === 'ar' ? 'خزينة بركة الأنبا موسى' : 'Points Treasury'}</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {REWARD_PRODUCTS.map(prod => (
                    <div key={prod.id} className="p-4 bg-white/10 rounded-2xl">
                      <div className="text-2xl">{prod.icon}</div>
                      <div className="font-bold mt-2">{prod.titleAr}</div>
                      <div className="text-xs mt-1">+{prod.cost} pts</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Clearly Visible Brand-Consistent Overlay */}
            <div className="absolute inset-0 flex items-center justify-center p-4 z-20">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white/95 dark:bg-[#1E1914]/95 backdrop-blur-md rounded-3xl p-8 max-w-md w-full text-center space-y-4 border-2 border-[var(--mousa-gold)] shadow-2xl"
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-center mx-auto text-3xl shadow-sm">
                  🎁
                </div>
                <div>
                  <h3 className="text-2xl font-black text-stone-900 dark:text-stone-50">
                    حجات جديدة قريبا!!
                  </h3>
                  <h4 className="text-lg font-black text-[var(--mousa-coral-dark)] dark:text-[var(--mousa-coral-glow)] mt-1 tracking-wide">
                    Coming Soon!!
                  </h4>
                </div>
                <p className="text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300 leading-relaxed">
                  {lang === 'ar'
                    ? 'يقوم الخدام بتجهيز بازار هدايا وأيقونات وبركات الأنبا موسى الكنسية قريباً لتكريم الطلاب المتميزين.'
                    : 'Our Sunday School servants are currently preparing the rewards bazaar with blessed church icons and gifts.'}
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-black border border-amber-200 dark:border-stone-700">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>{lang === 'ar' ? 'حافظ على نقاطك واستمر في التعلم' : 'Keep earning points & stay tuned'}</span>
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmPurchaseItem && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914] rounded-3xl p-6 max-w-sm w-full shadow-2xl border-2 border-[var(--mousa-border-sand)] text-center space-y-4"
            >
              <div className="w-16 h-16 bg-[var(--mousa-gold-soft)] text-[var(--mousa-gold-dark)] rounded-full flex items-center justify-center mx-auto text-2xl border border-[var(--mousa-gold)]/30">
                🎁
              </div>
              <h3 className="text-xl font-bold text-[var(--mousa-teal-deep)] dark:text-[#FAF5EB]">
                {lang === 'ar' ? 'تأكيد طلب الهدية' : 'Confirm Reward Request'}
              </h3>
              <p className="text-sm text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)]">
                {lang === 'ar' 
                  ? `هل ترغب في استبدال ${confirmPurchaseItem.cost} نقطة بـ "${confirmPurchaseItem.name}"؟` 
                  : `Redeem ${confirmPurchaseItem.cost} points for "${confirmPurchaseItem.name}"?`}
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setConfirmPurchaseItem(null)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-[var(--mousa-border-sand)] text-[var(--mousa-sand-600)] font-bold hover:bg-[var(--mousa-sand-100)] transition-colors cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={executePurchase}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--mousa-teal)] text-white font-bold hover:bg-[var(--mousa-teal-deep)] transition-colors cursor-pointer shadow-xs"
                >
                  {lang === 'ar' ? 'تأكيد الطلب' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* In-App Toast Notification */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl max-w-md w-[90%] text-sm font-bold ${
              feedbackToast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {feedbackToast.type === 'success' ? (
              <CheckCircle2 size={20} className="shrink-0 text-emerald-200" />
            ) : (
              <AlertCircle size={20} className="shrink-0 text-red-200" />
            )}
            <span className="flex-1 text-xs md:text-sm">{feedbackToast.message}</span>
            <button onClick={() => setFeedbackToast(null)} className="opacity-80 hover:opacity-100 cursor-pointer">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
