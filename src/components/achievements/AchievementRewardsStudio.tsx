import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, BookCheck, GraduationCap, Library, Music, AudioLines, Heart, ScrollText, HandHeart, CalendarCheck, CalendarHeart, Church, Brain, MessagesSquare, BookmarkCheck, HeartHandshake, NotebookPen, Cross, Image as ImageIcon, Check, Edit3, Gift, Lock, RefreshCw, Save, Sparkles, Star, Trophy, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Language } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { hasRole } from '../../lib/workspaces';
import { supabase } from '../../lib/supabase';
import { submitRewardRequest } from '../../lib/supabaseDatabase';
import { CopticAchievementSeal } from '../design-system/CopticAchievementSeal';

type Category = 'learning' | 'hymns' | 'taxis' | 'prayer' | 'quizzes' | 'community' | 'attendance' | 'consistency' | 'service';
type BadgeRow = {
  id: string; slug: string; title_en: string; title_ar: string; description_en: string; description_ar: string;
  category: Category; icon: string; style: string; criteria: { event_type?: string; count?: number };
  points_reward: number; is_active: boolean; display_order: number;
};
type MilestoneRow = { id: string; category: Category; badge_count: number; title_en: string; title_ar: string; points_reward: number; is_active: boolean };
type RewardRow = {
  id: string; slug: string; title_en: string; title_ar: string; description_en: string; description_ar: string;
  points_cost: number; icon: string; image_url?: string | null; stock_remaining: number | null; is_active: boolean; fulfillment_note: string;
};
type EventRow = { event_type: string };
type UnlockRow = { badge_id: string; earned_at: string; points_awarded: number };
type Props = { mode: 'student' | 'manage'; initialView?: 'badges' | 'bazaar'; lang: Language };

const CATEGORIES: Array<{ id: Category; en: string; ar: string }> = [
  { id: 'learning', en: 'Learning', ar: 'التعلم' }, { id: 'hymns', en: 'Hymns', ar: 'الألحان' },
  { id: 'taxis', en: 'Coptic Taxis', ar: 'الطقس القبطي' }, { id: 'prayer', en: 'Prayer', ar: 'الصلاة' },
  { id: 'quizzes', en: 'Quizzes', ar: 'الاختبارات' }, { id: 'community', en: 'Community', ar: 'المجتمع' },
  { id: 'attendance', en: 'Attendance', ar: 'الحضور' }, { id: 'consistency', en: 'Consistency', ar: 'المواظبة' },
  { id: 'service', en: 'Service', ar: 'الخدمة' },
];
const SUPPORTED_EVENT_TYPES = new Set([
  'lesson_opened','lesson_completed','hymn_opened','hymn_mastered','taxis_opened','taxis_completed',
  'prayer_day','quiz_passed','attendance_present','community_post','community_reaction','learning_day'
]);
const EVENT_TYPES = [
  'lesson_opened','lesson_completed','hymn_opened','hymn_mastered','taxis_opened','taxis_completed',
  'prayer_day','quiz_passed','attendance_present','community_post','community_reaction','learning_day',
  'memory_verse','class_participation'
];
const STYLES: Record<string, string> = {
  gold: 'from-amber-300 via-yellow-500 to-orange-500', teal: 'from-teal-300 via-teal-500 to-cyan-700',
  coral: 'from-orange-300 via-orange-500 to-red-600', blue: 'from-sky-300 via-blue-500 to-blue-800',
  green: 'from-lime-300 via-emerald-500 to-green-700', red: 'from-amber-300 via-orange-500 to-red-700',
};
const ICONS: Record<string, React.ComponentType<any>> = {
  award: Award, book: BookOpen, 'book-open': BookOpen, 'book-check': BookOpen, 'book-open-check': BookOpen,
  compass: Star, trophy: Trophy, gift: Gift, star: Star, sparkles: Sparkles,
  'graduation-cap': GraduationCap, library: Library, music: Music, 'audio-lines': AudioLines,
  heart: Heart, 'scroll-text': ScrollText, 'heart-handshake': HeartHandshake, 'calendar-heart': CalendarHeart,
  church: Church, brain: Brain, 'calendar-check': CalendarCheck, 'messages-square': MessagesSquare,
  'bookmark-check': BookmarkCheck, 'hand-heart': HandHeart, 'notebook-pen': NotebookPen, cross: Cross, image: ImageIcon,
};

const emptyBadge = {
  id: '', slug: '', title_en: '', title_ar: '', description_en: '', description_ar: '',
  category: 'learning' as Category, icon: 'award', style: 'gold', event_type: 'lesson_opened',
  count: 1, points_reward: 10, is_active: true,
};
const emptyMilestone = { id: '', category: 'learning' as Category, badge_count: 3, title_en: '', title_ar: '', points_reward: 50, is_active: true };
const emptyReward = { id: '', slug: '', title_en: '', title_ar: '', description_en: '', description_ar: '', points_cost: 50, icon: 'gift', image_url: '', stock_remaining: '' as string | number, is_active: true, fulfillment_note: '' };

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 78);
}

export function AchievementRewardsStudio({ mode, initialView = 'badges', lang }: Props) {
  const isArabic = lang === 'ar';
  const { userData, isGuest } = useAuth();
  const canManage = !isGuest && Boolean(userData) && (hasRole(userData, 'teacher') || hasRole(userData, 'admin'));
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [unlocks, setUnlocks] = useState<UnlockRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [section, setSection] = useState<'badges' | 'milestones' | 'bazaar' | 'fulfillment'>(initialView === 'bazaar' ? 'bazaar' : 'badges');
  const [badgeForm, setBadgeForm] = useState(emptyBadge);
  const [milestoneForm, setMilestoneForm] = useState(emptyMilestone);
  const [rewardForm, setRewardForm] = useState(emptyReward);

  const load = useCallback(async () => {
    if (!supabase || !userData?.id || isGuest) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [badgeResult, unlockResult, eventResult, milestoneResult, awardResult, rewardResult] = await Promise.all([
        supabase.from('achievement_badges').select('*').order('display_order'),
        supabase.from('achievement_unlocks').select('badge_id,earned_at,points_awarded').eq('student_id', userData.id),
        supabase.from('achievement_events').select('event_type').eq('student_id', userData.id),
        supabase.from('achievement_category_milestones').select('*').order('display_order'),
        supabase.from('achievement_milestone_awards').select('milestone_id,points_awarded').eq('student_id', userData.id),
        supabase.from('reward_catalog').select('*').order('display_order'),
      ]);
      const firstError = badgeResult.error || unlockResult.error || eventResult.error || milestoneResult.error || awardResult.error || rewardResult.error;
      if (firstError) throw firstError;
      setBadges((badgeResult.data || []) as BadgeRow[]);
      setUnlocks((unlockResult.data || []) as UnlockRow[]);
      setEvents((eventResult.data || []) as EventRow[]);
      setMilestones((milestoneResult.data || []) as MilestoneRow[]);
      setRewards((rewardResult.data || []) as RewardRow[]);
      if (mode === 'manage' && canManage) {
        const requestResult = await supabase.from('reward_requests').select('*').order('created_at', { ascending: false }).limit(100);
        if (requestResult.error) throw requestResult.error;
        setRequests(requestResult.data || []);
      }
    } catch (loadError: any) {
      setError(loadError?.message || (isArabic ? 'تعذر تحميل الإنجازات والمكافآت.' : 'Could not load achievements and rewards.'));
    } finally { setLoading(false); }
  }, [userData?.id, isGuest, mode, canManage, isArabic]);

  useEffect(() => { void load(); }, [load]);

  const unlockedIds = useMemo(() => new Set(unlocks.map(item => item.badge_id)), [unlocks]);
  const eventCounts = useMemo(() => events.reduce<Record<string, number>>((counts, item) => {
    counts[item.event_type] = (counts[item.event_type] || 0) + 1; return counts;
  }, {}), [events]);
  const unlockedByCategory = useMemo(() => badges.reduce<Record<string, number>>((counts, badge) => {
    if (unlockedIds.has(badge.id)) counts[badge.category] = (counts[badge.category] || 0) + 1;
    return counts;
  }, {}), [badges, unlockedIds]);

  const saveBadge = async (event: React.FormEvent) => {
    event.preventDefault(); if (!supabase || !canManage || !userData) return;
    if (badgeForm.is_active && !SUPPORTED_EVENT_TYPES.has(badgeForm.event_type)) {
      setError(isArabic
        ? 'نوع النشاط ده لسه مش متوصل بتسجيل موثوق. سيب الوسام غير منشور لحد ما نكمل ربطه.'
        : 'This activity is not connected to a verified event source yet. Keep the badge inactive until its tracking is implemented.');
      return;
    }
    setBusy(true); setError(''); setNotice('');
    const payload = {
      slug: badgeForm.slug.trim() || slugify(badgeForm.title_en),
      title_en: badgeForm.title_en.trim(), title_ar: badgeForm.title_ar.trim(),
      description_en: badgeForm.description_en.trim(), description_ar: badgeForm.description_ar.trim(),
      category: badgeForm.category, icon: badgeForm.icon.trim() || 'award', style: badgeForm.style,
      criteria: { event_type: badgeForm.event_type, count: Number(badgeForm.count) },
      points_reward: Number(badgeForm.points_reward), is_active: badgeForm.is_active,
      updated_by: userData.id, updated_at: new Date().toISOString(),
      ...(!badgeForm.id ? { created_by: userData.id } : {}),
    };
    try {
      const result = badgeForm.id
        ? await supabase.from('achievement_badges').update(payload).eq('id', badgeForm.id)
        : await supabase.from('achievement_badges').insert(payload);
      if (result.error) throw result.error;
      setBadgeForm(emptyBadge); setNotice(isArabic ? 'تم حفظ الوسام.' : 'Badge saved.'); await load();
    } catch (saveError: any) { setError(saveError?.message || 'Could not save badge.'); }
    finally { setBusy(false); }
  };

  const saveMilestone = async (event: React.FormEvent) => {
    event.preventDefault(); if (!supabase || !canManage || !userData) return;
    setBusy(true); setError(''); setNotice('');
    const payload = { category: milestoneForm.category, badge_count: Number(milestoneForm.badge_count),
      title_en: milestoneForm.title_en.trim(), title_ar: milestoneForm.title_ar.trim(),
      points_reward: Number(milestoneForm.points_reward), is_active: milestoneForm.is_active,
      updated_at: new Date().toISOString(), ...(!milestoneForm.id ? { created_by: userData.id } : {}) };
    try {
      const result = milestoneForm.id
        ? await supabase.from('achievement_category_milestones').update(payload).eq('id', milestoneForm.id)
        : await supabase.from('achievement_category_milestones').insert(payload);
      if (result.error) throw result.error;
      setMilestoneForm(emptyMilestone); setNotice(isArabic ? 'تم حفظ المرحلة.' : 'Milestone saved.'); await load();
    } catch (saveError: any) { setError(saveError?.message || 'Could not save milestone.'); }
    finally { setBusy(false); }
  };

  const saveReward = async (event: React.FormEvent) => {
    event.preventDefault(); if (!supabase || !canManage || !userData) return;
    setBusy(true); setError(''); setNotice('');
    const payload = { slug: rewardForm.slug.trim() || slugify(rewardForm.title_en),
      title_en: rewardForm.title_en.trim(), title_ar: rewardForm.title_ar.trim(),
      description_en: rewardForm.description_en.trim(), description_ar: rewardForm.description_ar.trim(),
      points_cost: Number(rewardForm.points_cost), icon: rewardForm.icon.trim() || 'gift', image_url: rewardForm.image_url.trim() || null,
      stock_remaining: rewardForm.stock_remaining === '' ? null : Number(rewardForm.stock_remaining),
      is_active: rewardForm.is_active, fulfillment_note: rewardForm.fulfillment_note.trim(),
      updated_by: userData.id, updated_at: new Date().toISOString(),
      ...(!rewardForm.id ? { created_by: userData.id } : {}) };
    try {
      const result = rewardForm.id
        ? await supabase.from('reward_catalog').update(payload).eq('id', rewardForm.id)
        : await supabase.from('reward_catalog').insert(payload);
      if (result.error) throw result.error;
      setRewardForm(emptyReward); setNotice(isArabic ? 'تم حفظ المكافأة.' : 'Reward saved.'); await load();
    } catch (saveError: any) { setError(saveError?.message || 'Could not save reward.'); }
    finally { setBusy(false); }
  };

  const reviewRequest = async (requestId: string, decision: 'approved' | 'rejected') => {
    if (!supabase || !canManage) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { error: rpcError } = await supabase.rpc('review_staff_reward_request', { p_request_id: requestId, p_decision: decision });
      if (rpcError) throw rpcError;
      setNotice(isArabic ? (decision === 'approved' ? 'تمت الموافقة وخصم النقاط.' : 'تم رفض الطلب.') : (decision === 'approved' ? 'Request approved and points deducted.' : 'Request rejected.'));
      await load();
    } catch (reviewError: any) { setError(reviewError?.message || 'Could not review reward request.'); }
    finally { setBusy(false); }
  };

  const fulfill = async (requestId: string) => {
    if (!supabase || !canManage) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { error: rpcError } = await supabase.rpc('mark_reward_request_fulfilled', { p_request_id: requestId, p_note: null });
      if (rpcError) throw rpcError;
      setNotice(isArabic ? 'تم تسجيل تسليم المكافأة.' : 'Reward marked as fulfilled.'); await load();
    } catch (fulfillError: any) { setError(fulfillError?.message || 'Could not mark reward as fulfilled.'); }
    finally { setBusy(false); }
  };

  const requestReward = async (reward: RewardRow) => {
    if (!userData || isGuest || !supabase) { setError(isArabic ? 'سجّل الدخول أولاً.' : 'Sign in to request a reward.'); return; }
    if ((reward.stock_remaining ?? 1) <= 0) { setError(isArabic ? 'المكافأة غير متاحة حالياً.' : 'This reward is currently out of stock.'); return; }
    if ((userData.points || 0) < reward.points_cost) { setError(isArabic ? 'نقاطك غير كافية.' : 'You do not have enough points.'); return; }
    if (!window.confirm(isArabic ? 'إرسال طلب المكافأة لولي أمرك للموافقة؟ لن تُخصم النقاط الآن.' : 'Send this reward request for parent approval? Points will not be deducted now.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await submitRewardRequest(userData.id, reward.id, reward.title_en, reward.title_ar, reward.points_cost, userData.parentId);
      if (!result || result.error) throw new Error(result?.error?.message || 'Could not save reward request.');
      setNotice(isArabic ? 'تم إرسال الطلب للموافقة.' : 'Reward request sent for approval.');
    } catch (requestError: any) { setError(requestError?.message || 'Could not request reward.'); }
    finally { setBusy(false); }
  };

  if (mode === 'manage' && !canManage) {
    return <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">{isArabic ? 'إدارة الأوسمة والمكافآت متاحة للخدام والمشرفين فقط.' : 'Badge and Bazaar management is available to teachers and administrators only.'}</div>;
  }
  if (loading) return <div className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-default)] p-8 text-sm"><RefreshCw className="animate-spin" size={18} />{isArabic ? 'بنحمّل الإنجازات...' : 'Loading achievements...'}</div>;

  const inputClass = "w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2.5 text-sm text-[var(--text-primary)]";
  const labelClass = "mb-1 block text-xs font-bold text-[var(--text-secondary)]";
  const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--mousa-teal)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50";
  const categoryName = (category: string) => CATEGORIES.find(item => item.id === category)?.[isArabic ? 'ar' : 'en'] || category;

  if (mode === 'student') {
    if (initialView === 'bazaar') return <section className="space-y-5">
      <header className="rounded-3xl bg-gradient-to-br from-[var(--mousa-teal-deep)] to-[#126274] p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 text-amber-200"><Gift size={18} /><span className="text-xs font-black uppercase tracking-widest">{isArabic ? 'بازار المكافآت' : 'Points Bazaar'}</span></div>
        <h2 className="mt-2 text-2xl font-black">{isArabic ? 'اختار مكافأتك' : 'Choose your reward'}</h2>
        <p className="mt-1 text-sm text-white/80">{isArabic ? 'كل مكافأة بيحددها فريق الكنيسة. الطلب يحتاج موافقة ولي الأمر.' : 'Every reward is managed by your church team. Requests need parent approval.'}</p>
        <div className="mt-4 inline-flex rounded-2xl bg-white/15 px-4 py-2 text-xl font-black">{userData?.points || 0} ✨</div>
      </header>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {rewards.filter(item => item.is_active).length === 0 ? <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-[var(--text-secondary)]">{isArabic ? 'لا توجد مكافآت منشورة حالياً.' : 'No rewards are available yet.'}</p> :
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{rewards.filter(item => item.is_active).map((reward, index) => {
          const out = reward.stock_remaining !== null && reward.stock_remaining <= 0;
          const enough = (userData?.points || 0) >= reward.points_cost;
          const RewardIcon = ICONS[reward.icon] || Gift;
          return <motion.article key={reward.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="overflow-hidden rounded-3xl border-2 border-[var(--mousa-border-sand)] bg-[var(--mousa-cream-surface)] p-5 shadow-sm dark:bg-[#1E1914]">
            <div className="flex items-start justify-between gap-3"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950/40"><RewardIcon size={28}/></div><span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-900">{reward.points_cost} pts</span></div>
            <h3 className="mt-4 font-black text-[var(--text-primary)]">{isArabic ? reward.title_ar : reward.title_en}</h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{isArabic ? reward.description_ar : reward.description_en}</p>
            {reward.stock_remaining !== null && <p className="mt-2 text-xs font-bold text-[var(--text-secondary)]">{isArabic ? `المتاح: ${reward.stock_remaining}` : `Available: ${reward.stock_remaining}`}</p>}
            <button type="button" disabled={busy || out || !enough || isGuest} onClick={() => void requestReward(reward)} className={buttonClass + " mt-4 w-full"}>
              {out ? (isArabic ? 'نفدت الكمية' : 'Out of stock') : !enough ? (isArabic ? 'نقاط غير كافية' : 'Not enough points') : (isArabic ? 'اطلب المكافأة' : 'Request reward')}
            </button>
          </motion.article>;
        })}</div>}
    </section>;

    return <section className="space-y-6">
      <header className="rounded-3xl bg-gradient-to-br from-[#153E48] via-[#17616B] to-[#C58B2B] p-6 text-white shadow-lg">
        <div className="flex items-center gap-2 text-amber-200"><Trophy size={20} /><span className="text-xs font-black uppercase tracking-widest">{isArabic ? 'رحلة الإنجازات' : 'Achievement Journey'}</span></div>
        <h2 className="mt-2 text-2xl font-black">{isArabic ? 'كل خطوة تستحق وسام!' : 'Every step deserves a badge!'}</h2>
        <p className="mt-1 text-sm text-white/85">{isArabic ? 'افتح الأوسمة مع التعلم والتسبيح والصلاة والمشاركة.' : 'Unlock badges through learning, hymns, prayer, and participation.'}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold"><span className="rounded-xl bg-white/15 px-3 py-2">{unlocks.length} / {badges.length} {isArabic ? 'وسام' : 'badges'}</span><span className="rounded-xl bg-white/15 px-3 py-2">+{unlocks.reduce((sum, item) => sum + item.points_awarded, 0)} pts</span></div>
      </header>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="space-y-7">{CATEGORIES.map(category => {
        const rows = badges.filter(item => item.category === category.id);
        if (!rows.length) return null;
        return <section key={category.id} className="space-y-3">
          <div className="flex items-center justify-between"><h3 className="font-black text-[var(--text-primary)]">{categoryName(category.id)}</h3><span className="text-xs font-bold text-[var(--text-secondary)]">{unlockedByCategory[category.id] || 0} / {rows.length}</span></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{rows.map((badge, index) => {
            const earned = unlockedIds.has(badge.id);
            const required = Math.max(1, Number(badge.criteria?.count || 1));
            const progress = Math.min(required, eventCounts[badge.criteria?.event_type || ''] || 0);
            const percent = Math.round(progress / required * 100);
            return <motion.article key={badge.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.025 }} className={`relative overflow-hidden rounded-2xl border-2 p-4 ${earned ? 'border-amber-300 bg-amber-50/80 dark:bg-amber-950/20' : 'border-[var(--mousa-border-sand)] bg-[var(--mousa-cream-surface)] dark:bg-[#1E1914]'}`}>
              <div className="flex items-start gap-3"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-black/5 dark:bg-white/5"><CopticAchievementSeal category={badge.category} designKey={badge.slug || badge.id} size={58} earned={earned} title={isArabic ? badge.title_ar : badge.title_en}/></div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h4 className="font-black text-[var(--text-primary)]">{isArabic ? badge.title_ar : badge.title_en}</h4>{earned ? <Check className="text-emerald-600" size={17} /> : <Lock className="text-[var(--text-secondary)]" size={15} />}</div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{isArabic ? badge.description_ar : badge.description_en}</p>
                  <p className="mt-2 text-xs font-black text-amber-700 dark:text-amber-300">{earned ? (isArabic ? 'تم فتح الوسام!' : 'Badge unlocked!') : `+ ${badge.points_reward} pts · ${progress}/${required}`}</p>
                </div></div>
              {!earned && <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${percent}%` }} /></div>}
              {earned && <div className="absolute right-0 top-0 rounded-bl-xl bg-amber-400 px-2 py-1 text-[10px] font-black text-amber-950">{isArabic ? 'مكتسب' : 'EARNED'}</div>}
            </motion.article>;
          })}</div>
        </section>;
      })}</div>
      <section className="space-y-3 rounded-3xl border border-[var(--mousa-border-sand)] bg-[var(--surface-secondary)] p-5">
        <h3 className="flex items-center gap-2 font-black"><Sparkles className="text-amber-500" />{isArabic ? 'مراحل المجموعات' : 'Category milestones'}</h3>
        {milestones.filter(item => item.is_active).map(item => {
          const count = unlockedByCategory[item.category] || 0; const earned = count >= item.badge_count;
          return <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-primary)] p-3"><div><p className="text-sm font-bold">{isArabic ? item.title_ar : item.title_en}</p><p className="text-xs text-[var(--text-secondary)]">{categoryName(item.category)} · {count}/{item.badge_count} {isArabic ? 'أوسمة' : 'badges'}</p></div><span className={`text-sm font-black ${earned ? 'text-emerald-600' : 'text-amber-700'}`}>{earned ? '✓ ' : ''}+{item.points_reward} pts</span></div>;
        })}
      </section>
    </section>;
  }

  if (!canManage) return null;
  const staffTabs = [
    ['badges', isArabic ? 'الأوسمة' : 'Badges'], ['milestones', isArabic ? 'مراحل الفئات' : 'Milestones'],
    ['bazaar', isArabic ? 'بازار النقاط' : 'Points Bazaar'], ['fulfillment', isArabic ? 'طلبات وتسليم' : 'Requests & fulfilment'],
  ] as const;
  return <section className="space-y-5">
    <header className="rounded-3xl bg-gradient-to-br from-[#153E48] to-[#24737A] p-6 text-white shadow-lg">
      <div className="flex items-center gap-2 text-amber-200"><Award size={20} /><span className="text-xs font-black uppercase tracking-widest">{isArabic ? 'إدارة الإنجازات والمكافآت' : 'Achievements & Rewards Studio'}</span></div>
      <h2 className="mt-2 text-2xl font-black">{isArabic ? 'أنت تتحكم في رحلة النقاط' : 'You control the points journey'}</h2>
      <p className="mt-1 text-sm text-white/80">{isArabic ? 'أنشئ الأوسمة والمراحل والمكافآت وحدد النقاط وشروط الفتح.' : 'Create badges, category milestones, and rewards; control points and unlock criteria.'}</p>
    </header>
    <nav className="flex flex-wrap gap-2">{staffTabs.map(([id, label]) => <button key={id} type="button" onClick={() => setSection(id)} className={`rounded-xl px-4 py-2 text-sm font-bold ${section === id ? 'bg-[var(--mousa-teal)] text-white' : 'border border-[var(--border-default)] bg-[var(--surface-primary)]'}`}>{label}</button>)}</nav>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <div className="flex justify-end"><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"><RefreshCw size={14} />{isArabic ? 'تحديث' : 'Refresh'}</button></div>

    {section === 'badges' && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
      <div className="space-y-3">{badges.map(item => { return <article key={item.id} className="flex items-center gap-3 rounded-2xl border bg-[var(--surface-primary)] p-3"><div className="grid h-12 w-12 shrink-0 place-items-center"><CopticAchievementSeal category={item.category} designKey={item.slug || item.id} size={44} title={isArabic ? item.title_ar : item.title_en}/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{isArabic ? item.title_ar : item.title_en}</p><p className="text-xs text-[var(--text-secondary)]">{categoryName(item.category)} · {item.points_reward} pts · {item.criteria?.event_type} × {item.criteria?.count}</p></div><button type="button" onClick={() => setBadgeForm({ id:item.id,slug:item.slug,title_en:item.title_en,title_ar:item.title_ar,description_en:item.description_en,description_ar:item.description_ar,category:item.category,icon:item.icon,style:item.style,event_type:item.criteria?.event_type || 'lesson_opened',count:item.criteria?.count || 1,points_reward:item.points_reward,is_active:item.is_active })} className="rounded-lg border p-2"><Edit3 size={16} /></button></article>; })}</div>
      <form onSubmit={saveBadge} className="space-y-3 rounded-2xl border bg-[var(--surface-primary)] p-4">
        <h3 className="font-black">{badgeForm.id ? (isArabic ? 'تعديل الوسام' : 'Edit badge') : (isArabic ? 'وسام جديد' : 'Create badge')}</h3>
        <div><label className={labelClass}>English title</label><input required className={inputClass} value={badgeForm.title_en} onChange={e=>setBadgeForm(v=>({...v,title_en:e.target.value}))} /></div>
        <div><label className={labelClass}>العنوان بالعربية</label><input required className={inputClass} value={badgeForm.title_ar} onChange={e=>setBadgeForm(v=>({...v,title_ar:e.target.value}))} /></div>
        <div><label className={labelClass}>English description</label><textarea className={inputClass} value={badgeForm.description_en} onChange={e=>setBadgeForm(v=>({...v,description_en:e.target.value}))} /></div>
        <div><label className={labelClass}>الوصف بالعربية</label><textarea className={inputClass} value={badgeForm.description_ar} onChange={e=>setBadgeForm(v=>({...v,description_ar:e.target.value}))} /></div>
        <div className="grid grid-cols-2 gap-2"><div><label className={labelClass}>Category</label><select className={inputClass} value={badgeForm.category} onChange={e=>setBadgeForm(v=>({...v,category:e.target.value as Category}))}>{CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.en}</option>)}</select></div><div><label className={labelClass}>Icon name</label><input className={inputClass} value={badgeForm.icon} onChange={e=>setBadgeForm(v=>({...v,icon:e.target.value}))} /></div></div>
        <div className="grid grid-cols-2 gap-2"><div><label className={labelClass}>Unlock event</label><select className={inputClass} value={badgeForm.event_type} onChange={e=>setBadgeForm(v=>({...v,event_type:e.target.value}))}>{EVENT_TYPES.map(t=><option key={t} disabled={!SUPPORTED_EVENT_TYPES.has(t)}>{t}{SUPPORTED_EVENT_TYPES.has(t) ? '' : ' · not connected yet'}</option>)}</select></div><div><label className={labelClass}>Required events</label><input type="number" min="1" max="10000" className={inputClass} value={badgeForm.count} onChange={e=>setBadgeForm(v=>({...v,count:Number(e.target.value)}))} /></div></div>
        <div className="grid grid-cols-2 gap-2"><div><label className={labelClass}>Points reward</label><input type="number" min="0" max="10000" className={inputClass} value={badgeForm.points_reward} onChange={e=>setBadgeForm(v=>({...v,points_reward:Number(e.target.value)}))} /></div><div><label className={labelClass}>Visual style</label><select className={inputClass} value={badgeForm.style} onChange={e=>setBadgeForm(v=>({...v,style:e.target.value}))}>{Object.keys(STYLES).map(s=><option key={s}>{s}</option>)}</select></div></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={badgeForm.is_active} onChange={e=>setBadgeForm(v=>({...v,is_active:e.target.checked}))} />Published / active</label>
        <div className="flex gap-2"><button disabled={busy} className={buttonClass}><Save size={16}/>{isArabic ? 'حفظ الوسام' : 'Save badge'}</button><button type="button" onClick={()=>setBadgeForm(emptyBadge)} className="rounded-xl border px-3 py-2 text-sm"><X size={16}/></button></div>
      </form>
    </div>}

    {section === 'milestones' && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
      <div className="space-y-3">{milestones.map(item=><article key={item.id} className="flex items-center gap-3 rounded-2xl border p-3"><div className="rounded-xl bg-amber-100 p-3 text-amber-800"><Trophy /></div><div className="min-w-0 flex-1"><p className="font-black">{isArabic ? item.title_ar : item.title_en}</p><p className="text-xs text-[var(--text-secondary)]">{categoryName(item.category)} · {item.badge_count} badges · {item.points_reward} pts</p></div><button type="button" onClick={()=>setMilestoneForm(item)} className="rounded-lg border p-2"><Edit3 size={16}/></button></article>)}</div>
      <form onSubmit={saveMilestone} className="space-y-3 rounded-2xl border p-4"><h3 className="font-black">{isArabic ? 'إعداد مرحلة' : 'Configure milestone'}</h3>
        <div><label className={labelClass}>Category</label><select className={inputClass} value={milestoneForm.category} onChange={e=>setMilestoneForm(v=>({...v,category:e.target.value as Category}))}>{CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.en}</option>)}</select></div>
        <div><label className={labelClass}>Number of badges</label><input type="number" min="1" max="100" className={inputClass} value={milestoneForm.badge_count} onChange={e=>setMilestoneForm(v=>({...v,badge_count:Number(e.target.value)}))}/></div>
        <div><label className={labelClass}>English title</label><input required className={inputClass} value={milestoneForm.title_en} onChange={e=>setMilestoneForm(v=>({...v,title_en:e.target.value}))}/></div>
        <div><label className={labelClass}>العنوان بالعربية</label><input required className={inputClass} value={milestoneForm.title_ar} onChange={e=>setMilestoneForm(v=>({...v,title_ar:e.target.value}))}/></div>
        <div><label className={labelClass}>Bonus points</label><input type="number" min="0" max="10000" className={inputClass} value={milestoneForm.points_reward} onChange={e=>setMilestoneForm(v=>({...v,points_reward:Number(e.target.value)}))}/></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={milestoneForm.is_active} onChange={e=>setMilestoneForm(v=>({...v,is_active:e.target.checked}))}/>Active</label>
        <div className="flex gap-2"><button className={buttonClass} disabled={busy}><Save size={16}/>Save milestone</button><button type="button" onClick={()=>setMilestoneForm(emptyMilestone)} className="rounded-xl border px-3"><X size={16}/></button></div>
      </form>
    </div>}

    {section === 'bazaar' && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
      <div className="space-y-3">{rewards.map(item=><article key={item.id} className="flex items-center gap-3 rounded-2xl border p-3"><div className="rounded-xl bg-amber-100 p-3 text-amber-800"><Gift/></div><div className="min-w-0 flex-1"><p className="font-black">{isArabic ? item.title_ar : item.title_en}</p><p className="text-xs text-[var(--text-secondary)]">{item.points_cost} pts · {item.stock_remaining === null ? 'Unlimited stock' : `Stock: ${item.stock_remaining}`} · {item.is_active ? 'Active' : 'Hidden'}</p></div><button type="button" onClick={()=>setRewardForm({...item,stock_remaining:item.stock_remaining === null ? '' : item.stock_remaining})} className="rounded-lg border p-2"><Edit3 size={16}/></button></article>)}</div>
      <form onSubmit={saveReward} className="space-y-3 rounded-2xl border p-4"><h3 className="font-black">{isArabic ? 'إدارة مكافأة' : 'Manage reward'}</h3>
        <div><label className={labelClass}>English title</label><input required className={inputClass} value={rewardForm.title_en} onChange={e=>setRewardForm(v=>({...v,title_en:e.target.value}))}/></div>
        <div><label className={labelClass}>العنوان بالعربية</label><input required className={inputClass} value={rewardForm.title_ar} onChange={e=>setRewardForm(v=>({...v,title_ar:e.target.value}))}/></div>
        <div><label className={labelClass}>English description</label><textarea className={inputClass} value={rewardForm.description_en} onChange={e=>setRewardForm(v=>({...v,description_en:e.target.value}))}/></div>
        <div><label className={labelClass}>الوصف بالعربية</label><textarea className={inputClass} value={rewardForm.description_ar} onChange={e=>setRewardForm(v=>({...v,description_ar:e.target.value}))}/></div>
        <div className="grid grid-cols-2 gap-2"><div><label className={labelClass}>Points cost</label><input type="number" min="1" max="100000" className={inputClass} value={rewardForm.points_cost} onChange={e=>setRewardForm(v=>({...v,points_cost:Number(e.target.value)}))}/></div><div><label className={labelClass}>Stock (blank = unlimited)</label><input type="number" min="0" className={inputClass} value={rewardForm.stock_remaining} onChange={e=>setRewardForm(v=>({...v,stock_remaining:e.target.value}))}/></div></div>
        <div className="grid grid-cols-2 gap-2"><div><label className={labelClass}>Icon name</label><input className={inputClass} value={rewardForm.icon} onChange={e=>setRewardForm(v=>({...v,icon:e.target.value}))}/></div><div><label className={labelClass}>Image URL (optional)</label><input className={inputClass} value={rewardForm.image_url || ''} onChange={e=>setRewardForm(v=>({...v,image_url:e.target.value}))}/></div></div>
        <div><label className={labelClass}>Fulfilment instructions</label><textarea className={inputClass} value={rewardForm.fulfillment_note} onChange={e=>setRewardForm(v=>({...v,fulfillment_note:e.target.value}))}/></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={rewardForm.is_active} onChange={e=>setRewardForm(v=>({...v,is_active:e.target.checked}))}/>Visible in student Bazaar</label>
        <div className="flex gap-2"><button className={buttonClass} disabled={busy}><Save size={16}/>Save reward</button><button type="button" onClick={()=>setRewardForm(emptyReward)} className="rounded-xl border px-3"><X size={16}/></button></div>
      </form>
    </div>}

    {section === 'fulfillment' && <div className="space-y-3">
      {requests.map(item=><article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-[var(--surface-primary)] p-4">
        <div><p className="font-black">{isArabic ? item.reward_name_ar : item.reward_name_en} · {item.cost_points} pts</p><p className="text-xs text-[var(--text-secondary)]">Student {item.student_id} · {new Date(item.created_at).toLocaleDateString()}</p>
          <p className={`text-xs font-bold ${item.status==='approved'?'text-emerald-700':item.status==='rejected'?'text-red-700':'text-amber-700'}`}>{item.status==='approved' ? (item.fulfilled_at ? (isArabic?'تم التسليم':'Fulfilled') : (isArabic?'موافق عليه · بانتظار التسليم':'Approved · awaiting fulfilment')) : item.status==='rejected' ? (isArabic?'مرفوض':'Rejected') : (isArabic?'بانتظار المراجعة':'Pending review')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.status==='pending' && <><button type="button" disabled={busy} onClick={()=>void reviewRequest(item.id,'approved')} className={buttonClass}><Check size={16}/>{isArabic?'موافقة وخصم النقاط':'Approve & deduct points'}</button><button type="button" disabled={busy} onClick={()=>void reviewRequest(item.id,'rejected')} className="rounded-xl border border-red-300 px-3 py-2 text-sm font-bold text-red-700">{isArabic?'رفض':'Reject'}</button></>}
          {item.status==='approved' && !item.fulfilled_at && <button type="button" disabled={busy} onClick={()=>void fulfill(item.id)} className={buttonClass}><Check size={16}/>{isArabic ? 'تأكيد التسليم' : 'Mark fulfilled'}</button>}
        </div>
      </article>)}
      {requests.length===0 && <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-[var(--text-secondary)]">{isArabic ? 'لا توجد طلبات مكافآت حتى الآن.' : 'No reward requests yet.'}</p>}
    </div>}
  </section>;
}
