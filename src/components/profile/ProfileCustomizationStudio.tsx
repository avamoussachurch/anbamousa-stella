import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Backpack, Check, Clock, Crown, Flame, Loader2, Palette, Pencil, ShieldCheck, ShoppingBag, Sparkles, Star, Trophy, UserRound, WandSparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type CosmeticKind = 'frame' | 'banner' | 'badge' | 'effect';
type Cosmetic = { id: string; kind: CosmeticKind; title_en: string; title_ar: string; description_en: string; description_ar: string; preview_start: string; preview_end: string; points_cost: number; rarity: 'common' | 'rare' | 'epic' | 'legendary' };
type Equipped = Partial<Record<CosmeticKind, string>>;
type EarnedBadge = { id: string; title_en: string; title_ar: string; category: string; icon: string; style: string; earned_at: string };
type Section = 'profile' | 'store' | 'inventory';

const frames = [
  { id: 'coptic-gold', label: 'Coptic Gold', ar: 'ذهبي قبطي', className: 'ring-4 ring-amber-400 ring-offset-2 ring-offset-amber-50' },
  { id: 'olive-wreath', label: 'Olive Wreath', ar: 'إكليل الزيتون', className: 'ring-4 ring-emerald-600 ring-offset-2 ring-offset-emerald-50' },
  { id: 'royal-blue', label: 'Royal Blue', ar: 'أزرق ملكي', className: 'ring-4 ring-blue-700 ring-offset-2 ring-offset-blue-50' },
  { id: 'desert-sand', label: 'Desert Sand', ar: 'رمال البرية', className: 'ring-4 ring-orange-300 ring-offset-2 ring-offset-orange-50' },
  { id: 'burgundy', label: 'Burgundy', ar: 'عنابي', className: 'ring-4 ring-rose-900 ring-offset-2 ring-offset-rose-50' }
];
const titles = [
  { id: 'hymn-explorer', label: 'Hymn Explorer', ar: 'مستكشف الألحان' },
  { id: 'prayer-heart', label: 'Prayer Heart', ar: 'قلب محب للصلاة' },
  { id: 'bible-reader', label: 'Bible Reader', ar: 'قارئ الكتاب المقدس' },
  { id: 'church-helper', label: 'Church Helper', ar: 'خادم الكنيسة' },
  { id: 'sunday-school-star', label: 'Sunday School Star', ar: 'نجم مدارس الأحد' },
  { id: 'saint-story-keeper', label: 'Saint Stories Keeper', ar: 'محب سير القديسين' }
];
const banners = [
  { id: 'desert-dawn', label: 'Desert Dawn', ar: 'فجر البرية', style: 'linear-gradient(120deg,#6f4935,#d6a15b,#f4dca6)' },
  { id: 'coptic-pattern', label: 'Coptic Pattern', ar: 'نقوش قبطية', style: 'repeating-linear-gradient(45deg,#174d4c 0 12px,#1e6260 12px 24px,#c59b50 24px 27px)' },
  { id: 'olive-garden', label: 'Olive Garden', ar: 'بستان الزيتون', style: 'linear-gradient(120deg,#244c39,#6e8751,#c2a96a)' },
  { id: 'golden-church', label: 'Golden Church', ar: 'الكنيسة الذهبية', style: 'linear-gradient(120deg,#5b3a27,#a77b39,#e9ce8a)' },
  { id: 'midnight-teal', label: 'Midnight Teal', ar: 'فيروزي ليلي', style: 'linear-gradient(120deg,#102f3b,#145b62,#327e79)' }
];
const rarityLabel: Record<Cosmetic['rarity'], { en: string; ar: string }> = {
  common: { en: 'Common', ar: 'عادي' }, rare: { en: 'Rare', ar: 'نادر' },
  epic: { en: 'Epic', ar: 'ملحمي' }, legendary: { en: 'Legendary', ar: 'أسطوري' }
};
const kindLabel: Record<CosmeticKind, { en: string; ar: string }> = {
  frame: { en: 'Avatar frame', ar: 'إطار الصورة' }, banner: { en: 'Profile banner', ar: 'غلاف الملف' },
  badge: { en: 'Profile badge', ar: 'شارة الملف' }, effect: { en: 'Profile effect', ar: 'تأثير الملف' }
};

export function ProfileCustomizationStudio({ userId, lang, avatarUrl, displayName, points = 0, currentStreak = 0, longestStreak = 0, activeLearningTime, onEdit, isGuest = false }: { userId: string; lang: string; avatarUrl?: string; displayName?: string; points?: number; currentStreak?: number; longestStreak?: number; activeLearningTime?: string; onEdit?: () => void; isGuest?: boolean }) {
  const ar = lang === 'ar';
  const [section, setSection] = useState<Section>('profile');
  const [frame, setFrame] = useState('coptic-gold');
  const [banner, setBanner] = useState('desert-dawn');
  const [title, setTitle] = useState('');
  const [equipped, setEquipped] = useState<Equipped>({});
  const [catalog, setCatalog] = useState<Cosmetic[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (isGuest || !supabase) {
      setFrame('coptic-gold'); setBanner('desert-dawn'); setTitle(''); setEquipped({});
      setCatalog([]); setUnlockedIds([]); setEarnedBadges([]); setPointsBalance(points);
      setLoading(false); return;
    }
    setLoading(true); setError('');
    try {
      const [customResult, catalogResult, unlockResult, profileResult, badgeUnlockResult] = await Promise.all([
        supabase.from('profile_customizations').select('frame_key,banner_key,display_title,equipped_cosmetics').eq('user_id', userId).maybeSingle(),
        supabase.from('profile_cosmetic_catalog').select('*').eq('is_active', true).order('display_order'),
        supabase.from('profile_cosmetic_unlocks').select('cosmetic_id').eq('user_id', userId),
        supabase.from('profiles').select('points').eq('id', userId).maybeSingle(),
        supabase.from('achievement_unlocks').select('badge_id,earned_at').eq('student_id', userId).order('earned_at', { ascending: false }).limit(8)
      ]);
      const firstError = customResult.error || catalogResult.error || unlockResult.error || profileResult.error || badgeUnlockResult.error;
      if (firstError) throw firstError;
      if (customResult.data) {
        setFrame(customResult.data.frame_key || 'coptic-gold');
        setBanner(customResult.data.banner_key || 'desert-dawn');
        setTitle(customResult.data.display_title || '');
        setEquipped((customResult.data.equipped_cosmetics || {}) as Equipped);
      } else {
        setFrame('coptic-gold'); setBanner('desert-dawn'); setTitle(''); setEquipped({});
      }
      setCatalog((catalogResult.data || []) as Cosmetic[]);
      setUnlockedIds((unlockResult.data || []).map(row => row.cosmetic_id));
      setPointsBalance(profileResult.data?.points || 0);
      const badgeIds = (badgeUnlockResult.data || []).map(row => row.badge_id);
      if (badgeIds.length) {
        const { data: badgeRows, error: badgeError } = await supabase.from('achievement_badges').select('id,title_en,title_ar,category,icon,style').in('id', badgeIds);
        if (badgeError) throw badgeError;
        const earnedAt = new Map((badgeUnlockResult.data || []).map(row => [row.badge_id, row.earned_at]));
        setEarnedBadges((badgeRows || []).map(badge => ({ ...badge, earned_at: earnedAt.get(badge.id) || '' })).sort((a,b) => (earnedAt.get(b.id) || '').localeCompare(earnedAt.get(a.id) || '')) as EarnedBadge[]);
      } else setEarnedBadges([]);
    } catch (loadError: any) {
      setError(loadError?.message || (ar ? 'تعذر تحميل المتجر ومظهر الملف.' : 'Could not load the profile store.'));
    } finally { setLoading(false); }
  }, [userId, ar, isGuest, points]);

  useEffect(() => { void load(); }, [load]);

  const selectedBanner = banners.find(item => item.id === banner) || banners[0];
  const unlockedItems = useMemo(() => catalog.filter(item => unlockedIds.includes(item.id)), [catalog, unlockedIds]);
  const equippedFrame = catalog.find(item => item.id === equipped.frame);
  const equippedBanner = catalog.find(item => item.id === equipped.banner);
  const equippedBadge = catalog.find(item => item.id === equipped.badge);
  const equippedEffect = catalog.find(item => item.id === equipped.effect);
  const bannerStyle = equippedBanner ? 'linear-gradient(120deg,' + equippedBanner.preview_start + ',' + equippedBanner.preview_end + ')' : selectedBanner.style;
  const avatarFrameStyle = equippedFrame ? { background: 'linear-gradient(135deg,' + equippedFrame.preview_start + ',' + equippedFrame.preview_end + ')', padding: '4px' } : undefined;
  const titleItem = titles.find(item => item.id === title);

  const save = async () => {
    if (isGuest || !supabase) { setError(ar ? 'سجّل الدخول أولاً لحفظ المظهر.' : 'Sign in first to save your profile.'); return; }
    setSaving(true); setMessage(''); setError('');
    const { error: saveError } = await supabase.from('profile_customizations').upsert({
      user_id: userId, frame_key: frame, banner_key: banner, display_title: title.trim() || null
    }, { onConflict: 'user_id' });
    if (saveError) setError(ar ? 'تعذر حفظ المظهر.' : 'Could not save appearance.');
    else setMessage(ar ? 'تم حفظ مظهر ملفك!' : 'Profile appearance saved!');
    setSaving(false);
  };

  const purchase = async (item: Cosmetic) => {
    if (!supabase) return;
    setBusyId(item.id); setError(''); setMessage('');
    const { error: purchaseError } = await supabase.rpc('purchase_profile_cosmetic', { p_cosmetic_id: item.id });
    if (purchaseError) {
      const raw = purchaseError.message || '';
      setError(raw.includes('INSUFFICIENT_POINTS') ? (ar ? 'نقاطك مش كفاية للمظهر ده.' : 'You do not have enough points for this item.')
        : raw.includes('COSMETIC_NOT_AVAILABLE') ? (ar ? 'العنصر ده مش متاح حالياً.' : 'This item is no longer available.')
        : raw || (ar ? 'تعذر إتمام الشراء.' : 'Purchase failed.'));
    } else { setMessage(ar ? 'اتفتح العنصر في مخزونك!' : 'Unlocked! It is now in your inventory.'); await load(); }
    setBusyId(null);
  };

  const unequip = async (kind: CosmeticKind) => {
    if (!supabase) return;
    setBusyId('free-' + kind); setError(''); setMessage('');
    const { error: unequipError } = await supabase.rpc('unequip_profile_cosmetic', { p_kind: kind });
    if (unequipError) setError(unequipError.message || (ar ? 'تعذر إزالة المظهر.' : 'Could not remove this cosmetic.'));
    else { setMessage(ar ? 'تم الرجوع للمظهر الأساسي.' : 'Free appearance restored.'); await load(); }
    setBusyId(null);
  };

  const equip = async (item: Cosmetic) => {
    if (!supabase) return;
    setBusyId(item.id); setError(''); setMessage('');
    const { error: equipError } = await supabase.rpc('equip_profile_cosmetic', { p_cosmetic_id: item.id });
    if (equipError) setError(equipError.message || (ar ? 'تعذر تطبيق العنصر.' : 'Could not equip this item.'));
    else { setMessage(ar ? 'تم تطبيق المظهر على ملفك!' : 'Cosmetic applied to your profile!'); await load(); }
    setBusyId(null);
  };

  const tabs: Array<{ id: Section; label: string; ar: string; icon: React.ComponentType<any> }> = [
    { id: 'profile', label: 'Profile', ar: 'الملف', icon: UserRound },
    { id: 'store', label: 'Store', ar: 'المتجر', icon: ShoppingBag },
    { id: 'inventory', label: 'Inventory', ar: 'مخزوني', icon: Backpack }
  ];

  if (loading) return <div className="rounded-2xl border border-[var(--mousa-border-sand)] p-4 text-xs text-[var(--text-secondary)]"><Loader2 className="mr-2 inline animate-spin" size={14}/>{ar ? 'جارٍ تحميل مظهر الملف…' : 'Loading profile…'}</div>;

  return (
    <section className="space-y-4 rounded-[1.5rem] border border-[var(--mousa-border-sand)] bg-[var(--surface-primary)] p-3 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Palette size={19} className="text-[var(--mousa-gold)]"/><div><h3 className="text-sm font-black text-[var(--text-primary)]">{ar ? 'ملفك الشخصي' : 'Your profile'}</h3><p className="text-[10px] text-[var(--text-secondary)]">{ar ? 'مظهر اجتماعي ومخزون قابل للفتح بالنقاط' : 'A social profile with unlockable cosmetics'}</p></div></div>
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-[var(--mousa-border-sand)] bg-[var(--surface-secondary)] px-3 py-1 text-[10px] font-black text-[var(--text-secondary)]">{unlockedIds.length} {ar ? 'عنصر مفتوح' : 'items unlocked'}</div>
          {onEdit && <button type="button" onClick={onEdit} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3 text-[10px] font-black text-[var(--text-secondary)] transition hover:border-[#5865F2] hover:text-[#5865F2]"><Pencil size={12}/>{ar ? 'تعديل الحساب' : 'Edit account'}</button>}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--mousa-border-sand)] bg-[var(--surface-secondary)]">
        <div className="relative h-24 sm:h-32" style={{ background: bannerStyle }}>
          {equippedEffect && <div className="pointer-events-none absolute inset-0 opacity-50" style={{ background: 'radial-gradient(circle at 20% 30%,' + equippedEffect.preview_end + '66,transparent 45%),radial-gradient(circle at 80% 70%,' + equippedEffect.preview_start + '55,transparent 40%)' }}/>}
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/35 to-transparent"/>
        </div>
        <div className="relative px-4 pb-4">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-3 sm:-mt-12">
            <div className="rounded-[1.35rem] shadow-lg" style={avatarFrameStyle || { background: 'linear-gradient(135deg,#D6A34A,#F6D365)', padding: '4px' }}>
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-[1.1rem] border-2 border-white bg-[#f7f1e5] sm:h-24 sm:w-24">
                {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover"/> : <Crown size={34} className="text-[#9A6A1F]"/>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pb-1">
              {equippedBadge && <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-900">{ar ? equippedBadge.title_ar : equippedBadge.title_en}</span>}
              {equippedEffect && <span className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-[10px] font-black text-violet-900"><Sparkles size={11} className="mr-1 inline"/> {ar ? 'تأثير مفعل' : 'Effect active'}</span>}
            </div>
          </div>
          <div className="mt-3"><p className="text-base font-black text-[var(--text-primary)]">{displayName || (ar ? 'عضو في عيلة أنبا موسى' : 'Anba Mousa member')}</p><p className="mt-0.5 text-xs text-[var(--text-secondary)]">{titleItem ? (ar ? titleItem.ar : titleItem.label) : (ar ? 'عضو في مجتمع الكنيسة' : 'Church community member')}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--mousa-border-sand)] bg-[var(--surface-secondary)] p-3"><p className="flex items-center gap-1 text-[9px] font-bold text-[var(--text-secondary)]"><Star size={11}/>{ar ? 'نقاط البركة' : 'Points'}</p><p className="mt-1 text-lg font-black text-amber-600">{points.toLocaleString()}</p></div>
        <div className="rounded-xl border border-[var(--mousa-border-sand)] bg-[var(--surface-secondary)] p-3"><p className="flex items-center gap-1 text-[9px] font-bold text-[var(--text-secondary)]"><Flame size={11}/>{ar ? 'المواظبة' : 'Streak'}</p><p className="mt-1 text-lg font-black text-orange-600">{currentStreak}</p></div>
        <div className="rounded-xl border border-[var(--mousa-border-sand)] bg-[var(--surface-secondary)] p-3"><p className="flex items-center gap-1 text-[9px] font-bold text-[var(--text-secondary)]"><Trophy size={11}/>{ar ? 'أفضل سلسلة' : 'Best streak'}</p><p className="mt-1 text-lg font-black text-emerald-600">{longestStreak}</p></div>
        <div className="rounded-xl border border-[var(--mousa-border-sand)] bg-[var(--surface-secondary)] p-3"><p className="flex items-center gap-1 text-[9px] font-bold text-[var(--text-secondary)]"><Clock size={11}/>{ar ? 'وقت التعلم' : 'Learning time'}</p><p className="mt-1 truncate text-sm font-black text-[var(--text-primary)]">{activeLearningTime || '—'}</p></div>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--mousa-border-sand)] bg-[var(--surface-secondary)] p-1">
        {tabs.filter(item => !isGuest || item.id === 'profile').map(item => {
          const Icon = item.icon;
          return <button key={item.id} type="button" onClick={() => setSection(item.id)} aria-pressed={section === item.id}
            className={'flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-black transition-all ' + (section === item.id ? 'bg-[#5865F2] text-white shadow-sm border-b-2 border-[#3442B8]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-primary)]')}>
            <Icon size={14}/>{ar ? item.ar : item.label}
          </button>;
        })}
      </div>

      {isGuest && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-900">{ar ? 'سجّل الدخول لفتح المتجر وحفظ مظهر ملفك.' : 'Sign in to unlock store items and save your profile appearance.'}</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{message}</p>}

      {section === 'profile' && (
        <div className="space-y-4">
          <details className="rounded-xl border border-[var(--mousa-border-sand)] p-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-black text-[var(--text-primary)]"><span>{ar ? 'المظهر الأساسي المجاني' : 'Free profile appearance'}</span><span className="text-[var(--text-secondary)]">⌄</span></summary>
            <div className="space-y-4 pt-4">
              <div><p className="mb-2 text-[11px] font-black text-[var(--text-primary)]">{ar ? 'إطار الصورة' : 'Avatar frame'}</p><div className="grid grid-cols-5 gap-2">
                {frames.map(item => <button key={item.id} type="button" onClick={() => setFrame(item.id)} aria-pressed={frame === item.id} className={'aspect-square rounded-xl border-2 bg-[var(--surface-secondary)] transition hover:-translate-y-0.5 ' + (frame === item.id ? 'border-[var(--mousa-gold)] shadow-md' : 'border-transparent')}>
                  <span className={'mx-auto block h-7 w-7 rounded-lg bg-white ' + item.className}/><span className="mt-1 block text-[8px] font-bold text-[var(--text-secondary)]">{ar ? item.ar : item.label}</span>
                </button>)}
              </div></div>
              <div><p className="mb-2 text-[11px] font-black text-[var(--text-primary)]">{ar ? 'غلاف الملف' : 'Profile banner'}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {banners.map(item => <button key={item.id} type="button" onClick={() => setBanner(item.id)} aria-pressed={banner === item.id} className={'overflow-hidden rounded-xl border-2 text-start transition hover:-translate-y-0.5 ' + (banner === item.id ? 'border-[var(--mousa-gold)] shadow-md' : 'border-[var(--border-default)]')}>
                  <span className="block h-8" style={{ background: item.style }}/><span className="block px-2 py-1 text-[9px] font-bold text-[var(--text-primary)]">{ar ? item.ar : item.label}</span>
                </button>)}
              </div></div>
              <label className="block"><span className="mb-1.5 block text-[11px] font-black text-[var(--text-primary)]">{ar ? 'لقب الملف' : 'Profile title'}</span>
                <select value={title} onChange={event => setTitle(event.target.value)} className="min-h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3 text-xs outline-none focus:border-[#5865F2]">
                  <option value="">{ar ? 'بدون لقب' : 'No title'}</option>{titles.map(item => <option key={item.id} value={item.id}>{ar ? item.ar : item.label}</option>)}
                </select>
              </label>
            </div>
          </details>
          <div className="flex flex-wrap items-center gap-2">
            {equipped.frame && <button type="button" onClick={() => void unequip('frame')} disabled={busyId === 'free-frame'} className="min-h-9 rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3 text-[10px] font-bold text-[var(--text-secondary)] disabled:opacity-50">{ar ? 'إطار مجاني' : 'Use free frame'}</button>}
            {equipped.banner && <button type="button" onClick={() => void unequip('banner')} disabled={busyId === 'free-banner'} className="min-h-9 rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3 text-[10px] font-bold text-[var(--text-secondary)] disabled:opacity-50">{ar ? 'غلاف مجاني' : 'Use free banner'}</button>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] text-[var(--text-secondary)]">{ar ? 'العناصر من المتجر تظهر في ملفك بعد فتحها وتطبيقها.' : 'Store cosmetics appear on your profile after unlocking and equipping them.'}</p>
            <button type="button" disabled={saving || isGuest || !supabase} onClick={() => void save()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border-b-4 border-[#3442B8] bg-[#5865F2] px-4 py-2 text-xs font-black text-white transition hover:brightness-105 active:translate-y-0.5 disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>} {ar ? 'حفظ المظهر' : 'Save profile'}
            </button>
          </div>
        </div>
      )}

      {section === 'profile' && earnedBadges.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
          <div className="mb-2 flex items-center justify-between gap-2"><h4 className="flex items-center gap-1.5 text-xs font-black text-amber-950 dark:text-amber-100"><Crown size={14}/>{ar ? 'رف إنجازاتك' : 'Achievement showcase'}</h4><span className="text-[10px] font-bold text-amber-800 dark:text-amber-200">{earnedBadges.length} / 8</span></div>
          <div className="flex flex-wrap gap-2">{earnedBadges.map(badge => <span key={badge.id} className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white/80 px-2.5 py-1 text-[10px] font-black text-amber-950 dark:bg-slate-900 dark:text-amber-100"><Trophy size={11}/>{ar ? badge.title_ar : badge.title_en}</span>)}</div>
        </section>
      )}

      {section === 'store' && !isGuest && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2"><div><h4 className="text-sm font-black text-[var(--text-primary)]">{ar ? 'متجر المظاهر' : 'Cosmetic store'}</h4><p className="text-[10px] text-[var(--text-secondary)]">{ar ? 'افتح إطارات وأغلفة وشارات وتأثيرات بالنقاط' : 'Unlock frames, banners, badges and effects with points'}</p></div><div className="flex items-center gap-2"><span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-900"><Star size={12} className="mr-1 inline"/>{pointsBalance} {ar ? 'نقطة' : 'pts'}</span><ShoppingBag size={19} className="text-[#5865F2]"/></div></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {catalog.map(item => {
              const owned = unlockedIds.includes(item.id), busy = busyId === item.id;
              return <article key={item.id} className="overflow-hidden rounded-xl border border-[var(--mousa-border-sand)] bg-[var(--surface-secondary)]">
                <div className="h-16" style={{ background: 'linear-gradient(120deg,' + item.preview_start + ',' + item.preview_end + ')' }}/>
                <div className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-black text-[var(--text-primary)]">{ar ? item.title_ar : item.title_en}</p><p className="text-[9px] text-[var(--text-secondary)]">{ar ? kindLabel[item.kind].ar : kindLabel[item.kind].en} · {ar ? rarityLabel[item.rarity].ar : rarityLabel[item.rarity].en}</p></div><span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-900"><Star size={10} className="mr-1 inline"/> {item.points_cost}</span></div>
                  <p className="min-h-8 text-[10px] text-[var(--text-secondary)]">{ar ? item.description_ar : item.description_en}</p>
                  {owned
                    ? <button type="button" onClick={() => void equip(item)} disabled={busy || equipped[item.kind] === item.id} className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border-b-2 border-[#1B6B58] bg-[#2C9A7B] px-3 text-[10px] font-black text-white disabled:opacity-60">
                        {busy ? <Loader2 size={12} className="animate-spin"/> : equipped[item.kind] === item.id ? <Check size={12}/> : <WandSparkles size={12}/>}
                        {equipped[item.kind] === item.id ? (ar ? 'مُطبّق بالفعل' : 'Applied') : (ar ? 'تطبيق على الملف' : 'Apply to profile')}
                      </button>
                    : <button type="button" onClick={() => void purchase(item)} disabled={busy} className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border-b-2 border-[#3442B8] bg-[#5865F2] px-3 text-[10px] font-black text-white disabled:opacity-60">
                        {busy ? <Loader2 size={12} className="animate-spin"/> : <ShoppingBag size={12}/>} {ar ? 'افتح بالنقاط' : 'Unlock with points'}
                      </button>}
                </div>
              </article>;
            })}
          </div>
        </div>
      )}

      {section === 'inventory' && !isGuest && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2"><div><h4 className="text-sm font-black text-[var(--text-primary)]">{ar ? 'مخزونك' : 'Your inventory'}</h4><p className="text-[10px] text-[var(--text-secondary)]">{ar ? 'العناصر التي فتحتها ويمكنك تطبيقها' : 'Everything you have unlocked and can equip'}</p></div><Backpack size={19} className="text-[var(--mousa-gold)]"/></div>
          {unlockedItems.length === 0
            ? <div className="rounded-xl border border-dashed p-7 text-center"><ShieldCheck size={26} className="mx-auto mb-2 text-[var(--text-secondary)]"/><p className="text-xs font-bold text-[var(--text-secondary)]">{ar ? 'مخزونك لسه فاضي. افتح أول عنصر من المتجر!' : 'Your inventory is empty. Unlock your first cosmetic in the store!'}</p></div>
            : <div className="grid gap-2 sm:grid-cols-2">{unlockedItems.map(item => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-[var(--mousa-border-sand)] bg-[var(--surface-secondary)] p-3">
                <div className="h-11 w-11 shrink-0 rounded-xl" style={{ background: 'linear-gradient(135deg,' + item.preview_start + ',' + item.preview_end + ')' }}/>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-[var(--text-primary)]">{ar ? item.title_ar : item.title_en}</p><p className="text-[9px] text-[var(--text-secondary)]">{ar ? kindLabel[item.kind].ar : kindLabel[item.kind].en}</p></div>
                <button type="button" onClick={() => void equip(item)} disabled={busyId === item.id || equipped[item.kind] === item.id} className="min-h-9 rounded-lg border-b-2 border-[#1B6B58] bg-[#2C9A7B] px-3 text-[10px] font-black text-white disabled:opacity-60">{equipped[item.kind] === item.id ? (ar ? 'مُطبّق' : 'Applied') : busyId === item.id ? '…' : (ar ? 'تطبيق' : 'Equip')}</button>
              </div>)}</div>}
        </div>
      )}
    </section>
  );
}
