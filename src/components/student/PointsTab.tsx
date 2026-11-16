import React, { useState, useEffect } from 'react';
import { Star, Medal, Lock, Trophy, Users, ChevronUp, History, Landmark, Gift, X, CheckCircle2, AlertCircle, Flame, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { mockBadges } from '../../data';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { submitRewardRequest } from '../../lib/supabaseDatabase';
import { shouldLoadCloudRewardPurchases } from '../../lib/rewardPersistence';
import { 
  getLeaderboard, 
  getStreakLeaderboard, 
  StreakLeaderboardEntry,
  getSavedPurchases 
} from '../../lib/pointsService';
import { LeaderboardEntry, Language } from '../../types';
import { LeaderboardPodium, PodiumItem } from './LeaderboardPodium';

const REWARD_PRODUCTS = [
  { id: '1', title: 'Small Saint Picture', titleAr: 'صورة قديس صغيرة', cost: 50, icon: '🖼️' },
  { id: '2', title: 'Wooden Icon', titleAr: 'أيقونة خشبية', cost: 100, icon: '🪵' },
  { id: '3', title: 'Church Notebook', titleAr: 'كشكول الكنيسة', cost: 150, icon: '📓' },
  { id: '4', title: 'Cross Necklace', titleAr: 'صليب الكنيسة', cost: 200, icon: '✝️' },
];

import { usePoints } from '../../context/PointsContext';

export function PointsTab({ lang }: { lang: Language }) {
  const { userData, isGuest } = useAuth();
  const { leaderboard: displayLeaderboard, streakLeaderboard: displayStreaks } = usePoints();
  
  // Section order:
  // 1. Streak Stars (نجوم المواظبة) — DEFAULT
  // 2. My Trail (رحلتي)
  // 3. Points Leaderboard (ترتيب النقاط)
  // 4. Points Bazaar (متجر المكافآت)
  const [view, setView] = useState<'streak' | 'trail' | 'leaderboard' | 'bazaar'>('streak');
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
    if (!userData) return;
    const local = getSavedPurchases(userData.id);
    if (local && local.length > 0) {
      setPurchases(local);
    }

    if (shouldLoadCloudRewardPurchases(isGuest, view === 'bazaar', Boolean(supabase))) {
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
  }, [userData?.id, view, lang, isGuest]);

  const executePurchase = async () => {
    if (!userData || !confirmPurchaseItem) return;
    const { id: rewardId, cost, name } = confirmPurchaseItem;

    if (isGuest) {
      showNotification('error', lang === 'ar'
        ? 'سجّل الدخول بحسابك الحقيقي لإرسال طلب مكافأة.'
        : 'Sign in with your account to submit a real reward request.');
      setConfirmPurchaseItem(null);
      return;
    }

    if (userData.points < cost) {
      showNotification('error', lang === 'ar'
        ? 'نقاطك مش كفاية لطلب المكافأة دي.'
        : 'You do not have enough points to request this reward.');
      setConfirmPurchaseItem(null);
      return;
    }

    try {
      const result = await submitRewardRequest(
        userData.id,
        rewardId,
        name,
        name,
        cost,
        userData.parentId
      );
      if (!result || result.error) {
        throw new Error(result?.error?.message || 'The reward request could not be saved.');
      }

      const newPurchase = {
        userId: userData.id,
        rewardId,
        itemName: name,
        cost,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      setPurchases(prev => [newPurchase, ...prev]);
      setConfirmPurchaseItem(null);
      showNotification('success', lang === 'ar'
        ? 'طلب المكافأة اتحفظ وبقى مستني موافقة ولي الأمر أو الخادم. نقاطك لسه زي ما هي.'
        : 'Reward request saved. It is awaiting parent or servant approval; your points have not been deducted.');
    } catch (err: any) {
      showNotification('error', err?.message || (lang === 'ar'
        ? 'مش قادرين نحفظ طلب المكافأة. نقاطك لم تتغير، جرّب تاني.'
        : 'Could not save the reward request. Your points were not changed; please try again.'));
    }
  };

  if (!userData) return null;

  return (
    <div className="pb-24 pt-6 px-4 w-full max-w-7xl mx-auto space-y-8 overflow-hidden" dir="rtl">
      {/* 4-Section View Toggle in Exact Required Order */}
      <div className="flex flex-wrap bg-[var(--mousa-cream-surface)] dark:bg-[#1C1712] rounded-2xl p-1.5 shadow-sm border-2 border-[var(--mousa-border-sand)] relative z-10 text-xs sm:text-sm max-w-2xl mx-auto gap-1">
        {/* 1. Streak Stars — Arabic: نجوم المواظبة (DEFAULT) */}
        <button 
          onClick={() => setView('streak')}
          className={`flex-1 min-w-[120px] py-2.5 sm:py-3 px-2 rounded-xl font-black transition-all z-10 cursor-pointer flex items-center justify-center gap-1.5 ${
            view === 'streak' 
              ? 'bg-[var(--mousa-gold)] text-[var(--mousa-teal-deep)] shadow-sm' 
              : 'text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] hover:text-[var(--mousa-teal)]'
          }`}
        >
          <Flame size={16} className={view === 'streak' ? 'fill-current text-amber-700' : 'text-amber-500'} />
          <span>{lang === 'ar' ? 'نجوم المواظبة' : 'Streak Stars'}</span>
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

        {/* 3. Points Leaderboard — Arabic: ترتيب النقاط */}
        <button 
          onClick={() => setView('leaderboard')}
          className={`flex-1 min-w-[125px] py-2.5 sm:py-3 px-2 rounded-xl font-black transition-all z-10 cursor-pointer flex items-center justify-center gap-1.5 ${
            view === 'leaderboard' 
              ? 'bg-[var(--mousa-teal)] text-white shadow-sm' 
              : 'text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] hover:text-[var(--mousa-teal)]'
          }`}
        >
          <Users size={15} />
          <span>{lang === 'ar' ? 'ترتيب النقاط' : 'Points Leaderboard'}</span>
        </button>

        {/* 4. Points Bazaar — Arabic: متجر المكافآت */}
        <button 
          onClick={() => setView('bazaar')}
          className={`flex-1 min-w-[110px] py-2.5 sm:py-3 px-2 rounded-xl font-black transition-all z-10 cursor-pointer flex items-center justify-center gap-1.5 ${
            view === 'bazaar' 
              ? 'bg-[var(--mousa-coral)] text-white shadow-sm' 
              : 'text-[var(--mousa-sand-600)] dark:text-[var(--mousa-sand-400)] hover:text-[var(--mousa-teal)]'
          }`}
        >
          <Gift size={15} />
          <span>{lang === 'ar' ? 'متجر المكافآت' : 'Points Bazaar'}</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* =========================================================================
            SECTION 1: STREAK STARS (نجوم المواظبة) — DEFAULT VISIBLE
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
                {userData.currentStreak ?? 0} {lang === 'ar' ? 'أيام' : 'Days'}
              </div>
              <p className="text-stone-800 dark:text-stone-200 font-extrabold uppercase tracking-wider text-xs sm:text-sm">
                {lang === 'ar' ? 'عدد الأيام اللي واظبت فيها في رحلة الأنبا موسى' : 'Current Daily Learning Streak'}
              </p>
              <div className="flex items-center justify-center gap-3 pt-2 text-xs font-bold text-stone-600 dark:text-stone-400">
                <span>{lang === 'ar' ? `🏆 أطول فترة مواظبة: ${userData.longestStreak ?? userData.currentStreak ?? 0} يوم` : `🏆 Longest: ${userData.longestStreak ?? userData.currentStreak ?? 0} days`}</span>
              </div>
            </motion.div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-[var(--mousa-border-sand)]">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-stone-900 dark:text-stone-50 flex items-center gap-2">
                  <Flame size={26} className="text-amber-500 fill-amber-500" />
                  <span>{lang === 'ar' ? 'نجوم المواظبة والمواظبة' : 'Streak Stars Leaderboard'}</span>
                </h2>
                <p className="text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300">
                  {lang === 'ar' ? 'أبطال المواظبة والحضور والصلوات اليومية وإكمال الدروس' : 'Champions of daily prayer, attendance & weekly milestones'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-black">
                <Sparkles size={14} />
                <span>{lang === 'ar' ? `سلسلتك: ${userData.currentStreak ?? 0} أيام` : `Your Streak: ${userData.currentStreak ?? 0} Days`}</span>
              </div>
            </div>

            {displayStreaks.length === 0 && (
              <p role="status" className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-4 text-sm font-medium text-[var(--text-secondary)]">
                {lang === 'ar'
                  ? 'الترتيب الرسمي غير متاح حالياً.'
                  : 'Official rankings are not available yet.'}
              </p>
            )}
            {/* Visual Top 3 Podium for Streaks */}
            <LeaderboardPodium
              items={displayStreaks.slice(0, 3).map(e => ({
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
                {lang === 'ar' ? 'باقي أصحاب الرحلة' : 'Caravan Runners (Ranks 4+)'}
              </h3>
              {displayStreaks.slice(3).map((entry) => {
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
                        {lang === 'ar' ? 'يوم ورا يوم' : 'Days Streak'}
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
                  <span>{lang === 'ar' ? 'أوسمة رحلتي مع الأنبا موسى' : 'My Trail & Journey Badges'}</span>
                </h2>
                <p className="text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300">
                  {lang === 'ar' ? 'الأوسمة اللي بتكسبها مع كل محطة ومع تقدمك في النقاط والصلوات' : 'Badges earned as you advance through milestones, prayer, and lessons'}
                </p>
              </div>
            </div>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-7 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-[var(--mousa-border-sand)]">
              {isGuest && mockBadges.map((badge, index) => {
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
                        +{badge.pointsThreshold} {lang === 'ar' ? 'نقطة محتاجها عشان تفتح المكافأة' : 'points required'}
                      </p>
                      {isUnlocked ? (
                        <div className="mt-2 text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 size={14} />
                          <span>{lang === 'ar' ? 'وسام اتفتح وكسبته ✅' : 'Unlocked & Earned ✅'}</span>
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
              {!isGuest && (
                <p role="status" className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-4 text-sm font-medium text-[var(--text-secondary)]">
                  {lang === 'ar'
                    ? 'لا توجد إنجازات موثقة متاحة لهذا الحساب حتى الآن.'
                    : 'Verified achievements are not available for this account yet.'}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* =========================================================================
            SECTION 3: POINTS LEADERBOARD (ترتيب النقاط)
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
                   <span>{lang === 'ar' ? 'ترتيب النقاط الأسبوعية' : 'Weekly Points Leaderboard'}</span>
                 </h2>
                 <p className="text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300">
                   {lang === 'ar' ? 'ترتيب رفقاء المسيرة بنقاط البركة الحقيقية' : 'Official rankings based on earned milestone blessing points'}
                 </p>
               </div>
               <span className="text-xs font-black px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-[var(--mousa-border-sand)]">
                 {userData?.grade || (lang === 'ar' ? 'مرحلة ابتدائي' : 'Elementary')}
               </span>
             </div>

             {displayLeaderboard.length === 0 && (
               <p role="status" className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-4 text-sm font-medium text-[var(--text-secondary)]">
                 {lang === 'ar'
                   ? 'الترتيب الرسمي غير متاح حالياً.'
                   : 'Official rankings are not available yet.'}
               </p>
             )}
             {/* Visual Top 3 Podium for Points */}
             <LeaderboardPodium 
               items={displayLeaderboard.slice(0, 3).map(e => ({
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
                  {lang === 'ar' ? 'باقي أصحاب الرحلة' : 'Caravan Runners (Ranks 4+)'}
                </h3>
                {displayLeaderboard.slice(3).map((entry) => {
                  const isCurrentUser = entry.studentId === userData.id || (userData.id.startsWith('guest_') && entry.studentId === 'u1');
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
            SECTION 4: POINTS BAZAAR — LIVE REWARD REQUESTS
           ========================================================================= */}
        {view === 'bazaar' && (
          <motion.div
            key="bazaar"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6 md:max-w-4xl md:mx-auto"
          >
            <section className="rounded-3xl border-2 border-[var(--mousa-border-sand)] bg-gradient-to-br from-[var(--mousa-teal-deep)] via-[#144E5B] to-[#103D46] p-6 text-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-200/40 bg-white/10 px-3 py-1 text-xs font-bold text-amber-100">
                    <Gift size={14} /> {lang === 'ar' ? 'بازار المكافآت' : 'Rewards Bazaar'}
                  </div>
                  <h2 className="text-2xl font-black">{lang === 'ar' ? 'اختار مكافأتك' : 'Choose a reward'}</h2>
                  <p className="mt-1 text-sm text-white/80">
                    {lang === 'ar'
                      ? 'ابعت طلب المكافأة للمراجعة. النقاط لا تُخصم إلا بعد الموافقة.'
                      : 'Submit a request for review. Points are not deducted when you submit it.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-200/30 bg-white/10 px-5 py-3 text-center">
                  <div className="text-xs font-bold text-amber-100">{lang === 'ar' ? 'رصيدك الحالي' : 'Your balance'}</div>
                  <div className="mt-1 text-3xl font-black">{userData.points} ✨</div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {REWARD_PRODUCTS.map(prod => {
                const canRequest = userData.points >= prod.cost && !isGuest;
                return (
                  <article key={prod.id} className="rounded-3xl border-2 border-[var(--mousa-border-sand)] bg-[var(--mousa-cream-surface)] p-5 shadow-sm dark:bg-[#1E1914]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-3xl dark:bg-amber-950/50">{prod.icon}</div>
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-black text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{prod.cost} pts</span>
                    </div>
                    <h3 className="mt-4 text-base font-black text-[var(--mousa-teal-deep)] dark:text-amber-200">{lang === 'ar' ? prod.titleAr : prod.title}</h3>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {lang === 'ar' ? 'طلب المكافأة يحتاج موافقة قبل التسليم.' : 'A request must be approved before the reward is issued.'}
                    </p>
                    <button
                      type="button"
                      disabled={!canRequest}
                      onClick={() => setConfirmPurchaseItem({ id: prod.id, name: lang === 'ar' ? prod.titleAr : prod.title, cost: prod.cost })}
                      className="mt-4 w-full rounded-xl bg-[var(--mousa-teal)] px-4 py-3 text-sm font-black text-white transition hover:bg-[var(--mousa-teal-deep)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isGuest
                        ? (lang === 'ar' ? 'سجّل الدخول لطلب المكافأة' : 'Sign in to request')
                        : userData.points < prod.cost
                          ? (lang === 'ar' ? 'نقاط غير كافية' : 'Not enough points')
                          : (lang === 'ar' ? 'اطلب المكافأة' : 'Request reward')}
                    </button>
                  </article>
                );
              })}
            </div>

            <section className="rounded-3xl border-2 border-[var(--mousa-border-sand)] bg-[var(--mousa-cream-surface)] p-5 dark:bg-[#1E1914]">
              <div className="flex items-center gap-2">
                <History size={18} className="text-[var(--mousa-teal)]" />
                <h3 className="font-black text-[var(--text-primary)]">{lang === 'ar' ? 'طلباتك السابقة' : 'Your reward requests'}</h3>
              </div>
              {purchases.length === 0 ? (
                <p className="mt-3 rounded-xl bg-[var(--surface-secondary)] p-4 text-sm text-[var(--text-secondary)]">
                  {lang === 'ar' ? 'لسه ما بعتّش طلبات مكافآت.' : 'You have not submitted any reward requests yet.'}
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {purchases.map((purchase, index) => (
                    <div key={purchase.id || purchase.createdAt || index} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] p-3">
                      <div>
                        <p className="text-sm font-bold text-[var(--text-primary)]">{purchase.itemName || purchase.reward_name_en || purchase.reward_name_ar}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{purchase.cost ?? purchase.cost_points} pts · {new Date(purchase.createdAt || purchase.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG')}</p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                        {purchase.status === 'approved' ? (lang === 'ar' ? 'موافق عليه' : 'Approved') : purchase.status === 'rejected' ? (lang === 'ar' ? 'مرفوض' : 'Rejected') : (lang === 'ar' ? 'بانتظار الموافقة' : 'Pending approval')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
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
