import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Award, Check, Crown, Loader2, Palette, ShoppingBag, Star, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type CosmeticKind = 'frame' | 'banner' | 'badge' | 'effect';
type Cosmetic = {
  id: string; kind: CosmeticKind; title_en: string; title_ar: string;
  description_en: string; description_ar: string; preview_start: string; preview_end: string;
  points_cost: number; rarity: 'common' | 'rare' | 'epic' | 'legendary'; display_order: number;
};
type Equipped = Partial<Record<CosmeticKind, string>>;

function BadgeArtwork({ item, compact = false }: { item: Cosmetic; compact?: boolean }) {
  const seed = Array.from(item.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const petals = Array.from({ length: 8 }, (_, index) => index * 45 + (seed % 23));
  const glyph = seed % 3;
  return (
    <div className={'grid place-items-center overflow-hidden ' + (compact ? 'h-8 w-8' : 'h-full w-full')} style={{ background: `radial-gradient(circle at 50% 45%, ${safeColor(item.preview_end, '#F1D18A')} 0%, ${safeColor(item.preview_start, '#174D4C')} 72%)` }}>
      <svg viewBox="0 0 100 100" className={compact ? 'h-8 w-8' : 'h-16 w-16 drop-shadow-lg'} aria-label={item.title_en} role="img">
        <defs><linearGradient id={'badge-' + item.id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={safeColor(item.preview_end, '#F1D18A')}/><stop offset="1" stopColor={safeColor(item.preview_start, '#174D4C')}/></linearGradient></defs>
        <path d="M50 4 61 13 76 12 82 27 94 39 87 54 91 70 75 79 68 94 50 89 32 94 25 79 9 70 13 54 6 39 18 27 24 12 39 13Z" fill={'url(#badge-' + item.id + ')'} stroke="#F8E7B8" strokeWidth="3"/>
        <circle cx="50" cy="50" r="31" fill="none" stroke="#FFF4D6" strokeWidth="2.5" strokeDasharray={seed % 2 ? '3 3' : '1 4'}/>
        {petals.map(angle => <path key={angle} d="M50 18 Q59 31 50 39 Q41 31 50 18Z" fill="#FFF4D6" opacity=".88" transform={`rotate(${angle} 50 50)`}/>)}
        <circle cx="50" cy="50" r="17" fill="#FFF4D6" stroke="#7C5424" strokeWidth="2"/>
        {glyph === 0 ? <path d="M50 34 54 45 66 46 57 54 60 66 50 59 40 66 43 54 34 46 46 45Z" fill="#80551F"/> : glyph === 1 ? <path d="M47 35h6v12h12v6H53v12h-6V53H35v-6h12Z" fill="#80551F"/> : <path d="M50 35c-12 0-17 12-9 20 5 5 9 9 9 9s4-4 9-9c8-8 3-20-9-20Z" fill="#80551F"/>}
      </svg>
    </div>
  );
}

function CosmeticArtwork({ item }: { item: Cosmetic }) {
  if (item.kind === 'badge') return <BadgeArtwork item={item} />;
  const seed = Array.from(item.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const accent = safeColor(item.preview_end, '#D6A84F');
  const base = safeColor(item.preview_start, '#174D4C');
  return (
    <div className="grid h-full w-full place-items-center overflow-hidden" style={{ background: `linear-gradient(125deg,${base},${accent})` }}>
      <svg viewBox="0 0 220 90" className="h-full w-full" aria-hidden="true">
        <defs><linearGradient id={'cosmetic-' + item.id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={accent}/><stop offset="1" stopColor={base}/></linearGradient></defs>
        {item.kind === 'banner' ? <>
          <circle cx={170 + (seed % 22)} cy="22" r="15" fill="#FFF1C7" opacity=".9"/>
          <path d="M0 64 Q45 34 88 62 T176 55 T220 58 V90 H0Z" fill="#102F39" opacity=".62"/>
          <path d="M0 74 Q40 52 80 72 T160 68 T220 70 V90 H0Z" fill="#0C252D" opacity=".58"/>
          <path d="M92 64V36h28v28M86 36l20-15 20 15M104 22V10h5v12" fill="none" stroke="#FFF1C7" strokeWidth="2.5" strokeLinejoin="round"/>
          <path d="M106 10V2m-4 4h8" stroke="#FFF1C7" strokeWidth="2" strokeLinecap="round"/>
          {Array.from({length:7},(_,i)=><circle key={i} cx={18+i*27+(seed%8)} cy={12+(i%3)*9} r="1.8" fill="#FFF1C7" opacity=".8"/>)}
        </> : item.kind === 'frame' ? <>
          <rect x="78" y="8" width="64" height="74" rx="20" fill="#102F39" opacity=".35" stroke="#FFF1C7" strokeWidth="4"/>
          <rect x="85" y="15" width="50" height="60" rx="15" fill="none" stroke="#FFF1C7" strokeWidth="1.8" strokeDasharray={seed%2?'3 3':'1 4'}/>
          <path d="M110 4l5 8 9 1-7 7 2 9-9-5-9 5 2-9-7-7 9-1Z" fill="#FFF1C7" opacity=".9"/>
          <path d="M68 45h10m64 0h10M110 80v7" stroke="#FFF1C7" strokeWidth="3" strokeLinecap="round"/>
        </> : <>
          <circle cx="110" cy="45" r="33" fill="none" stroke="#FFF1C7" strokeWidth="2" opacity=".9"/>
          <circle cx="110" cy="45" r="24" fill="none" stroke="#FFF1C7" strokeWidth="1.5" strokeDasharray="2 5"/>
          {Array.from({length:12},(_,i)=><path key={i} d="M110 3v10" stroke="#FFF1C7" strokeWidth={i%3===0?3:1.5} strokeLinecap="round" transform={`rotate(${i*30+(seed%15)} 110 45)`}/>)}
          <path d="M110 25l5 13 14 1-11 9 4 14-12-8-12 8 4-14-11-9 14-1Z" fill="#FFF1C7" opacity=".9"/>
        </>}
      </svg>
    </div>
  );
}

const titles = [
  { id: 'hymn-explorer', label: 'Hymn Explorer', ar: 'مستكشف الألحان' },
  { id: 'prayer-heart', label: 'Prayer Heart', ar: 'قلب محب للصلاة' },
  { id: 'bible-reader', label: 'Bible Reader', ar: 'قارئ الكتاب المقدس' },
  { id: 'church-helper', label: 'Church Helper', ar: 'خادم الكنيسة' },
  { id: 'sunday-school-star', label: 'Sunday School Star', ar: 'نجم مدارس الأحد' },
  { id: 'saint-story-keeper', label: 'Saint Stories Keeper', ar: 'محب سير القديسين' }
];
const fallbackBanners: Record<string, [string, string]> = {
  'desert-dawn': ['#6F4935', '#F4DCA6'], 'coptic-pattern': ['#174D4C', '#C59B50'],
  'olive-garden': ['#244C39', '#C2A96A'], 'golden-church': ['#5B3A27', '#E9CE8A'],
  'midnight-teal': ['#102F3B', '#327E79']
};
const fallbackFrames: Record<string, string> = {
  'coptic-gold': '#D6A84F', 'olive-wreath': '#47734D', 'royal-blue': '#285A9B',
  'desert-sand': '#C58A4A', burgundy: '#762B3A'
};
const kindLabels: Record<CosmeticKind, [string, string]> = {
  frame: ['Frames', 'الإطارات'], banner: ['Banners', 'الأغلفة'],
  badge: ['Profile badges', 'الشارات'], effect: ['Effects', 'التأثيرات']
};
const rarityLabels: Record<string, [string, string]> = {
  common: ['Common', 'عادي'], rare: ['Rare', 'نادر'],
  epic: ['Epic', 'ملحمي'], legendary: ['Legendary', 'أسطوري']
};
const safeColor = (value: string, fallback: string) => /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback;

export function ProfileCustomizationStudio({ userId, lang, initialView = 'profile' }: { userId: string; lang: string; initialView?: 'profile' | 'store' }) {
  const ar = lang === 'ar';
  const { syncAuthoritativeProgress } = useAuth();
  const syncProgressRef = useRef(syncAuthoritativeProgress);
  syncProgressRef.current = syncAuthoritativeProgress;
  const [view, setView] = useState<'profile' | 'store' | 'inventory'>(initialView);
  const [category, setCategory] = useState<CosmeticKind>('frame');
  const [catalog, setCatalog] = useState<Cosmetic[]>([]);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [equipped, setEquipped] = useState<Equipped>({});
  const [frame, setFrame] = useState('coptic-gold');
  const [banner, setBanner] = useState('desert-dawn');
  const [title, setTitle] = useState('');
  const [points, setPoints] = useState(0);
  const [profileName, setProfileName] = useState('Anba Mousa member');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [profileRole, setProfileRole] = useState('student');
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); setError(ar ? 'الخدمة غير متاحة حالياً.' : 'Store is unavailable.'); return; }
    setLoading(true); setError('');
    const [customResult, catalogResult, unlockResult, profileResult, followersResult, followingResult] = await Promise.all([
      supabase.from('profile_customizations').select('frame_key,banner_key,display_title,equipped_cosmetics').eq('user_id', userId).maybeSingle(),
      supabase.from('profile_cosmetic_catalog').select('*').eq('is_active', true).order('display_order'),
      supabase.from('profile_cosmetic_unlocks').select('cosmetic_id').eq('user_id', userId),
      supabase.from('profiles').select('name,avatar,role,points,current_streak,longest_streak').eq('id', userId).maybeSingle(),
      supabase.from('profile_follows').select('*', { count: 'exact', head: true }).eq('followed_id', userId),
      supabase.from('profile_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId)
    ]);
    const firstError = customResult.error || catalogResult.error || unlockResult.error || profileResult.error;
    if (firstError) setError(firstError.message);
    if (customResult.data) {
      setFrame(customResult.data.frame_key || 'coptic-gold');
      setBanner(customResult.data.banner_key || 'desert-dawn');
      setTitle(customResult.data.display_title || '');
      setEquipped((customResult.data.equipped_cosmetics || {}) as Equipped);
    }
    setCatalog((catalogResult.data || []) as Cosmetic[]);
    setUnlocked((unlockResult.data || []).map((row: any) => row.cosmetic_id));
    setPoints(Number(profileResult.data?.points || 0));
    if (profileResult.data) {
      syncProgressRef.current(
        Number(profileResult.data.points || 0),
        Number(profileResult.data.current_streak || 0),
        Number(profileResult.data.longest_streak || 0)
      );
    }
    setProfileName(profileResult.data?.name || 'Anba Mousa member');
    setAvatarUrl(profileResult.data?.avatar || '');
    setAvatarFailed(false);
    setProfileRole(profileResult.data?.role || 'student');
    setCurrentStreak(Number(profileResult.data?.current_streak || 0));
    setLongestStreak(Number(profileResult.data?.longest_streak || 0));
    setFollowersCount(followersResult.count || 0);
    setFollowingCount(followingResult.count || 0);
    setLoading(false);
  }, [userId, ar]);

  useEffect(() => { void load(); }, [load]);

  const equippedItems = useMemo(() => catalog.filter(item => equipped[item.kind] === item.id), [catalog, equipped]);
  const selectedFrame = catalog.find(item => item.id === equipped.frame);
  const selectedBanner = catalog.find(item => item.id === equipped.banner);
  const selectedEffect = catalog.find(item => item.id === equipped.effect);
  const selectedBadge = catalog.find(item => item.id === equipped.badge);
  const frameColor = selectedFrame ? safeColor(selectedFrame.preview_end, '#D6A84F') : (fallbackFrames[frame] || fallbackFrames['coptic-gold']);
  const bannerStart = selectedBanner ? safeColor(selectedBanner.preview_start, '#173C50') : '#6F4935';
  const bannerEnd = selectedBanner ? safeColor(selectedBanner.preview_end, '#D6A15B') : '#F4DCA6';
  const visibleItems = catalog.filter(item => item.kind === category);

  const runCosmeticAction = async (item: Cosmetic, action: 'purchase' | 'equip') => {
    if (!supabase || busyId) return;
    setBusyId(item.id); setMessage(''); setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc(
        action === 'purchase' ? 'purchase_profile_cosmetic' : 'equip_profile_cosmetic',
        { p_cosmetic_id: item.id }
      );
      if (rpcError) throw rpcError;
      if (data?.success === false) throw new Error(ar ? 'تعذر تنفيذ العملية.' : 'The action could not be completed.');
      setMessage(action === 'purchase'
        ? (ar ? 'اتضافت لمجموعتك! تقدر تلبسها دلوقتي.' : 'Added to your collection! You can equip it now.')
        : (ar ? 'تم تطبيق المظهر على ملفك.' : 'Cosmetic equipped on your profile.'));
      await load();
    } catch (err: any) {
      const raw = String(err?.message || '');
      const translated = raw.includes('INSUFFICIENT_POINTS')
        ? (ar ? 'نقاطك مش كفاية للعنصر ده.' : 'You do not have enough points for this item.')
        : raw.includes('COSMETIC_NOT_OWNED')
          ? (ar ? 'لازم تفتح العنصر الأول.' : 'Unlock this item before equipping it.')
          : raw || (ar ? 'حصلت مشكلة. جرّب تاني.' : 'Something went wrong. Please try again.');
      setError(translated);
    } finally { setBusyId(''); }
  };

  const unequip = async (kind: CosmeticKind) => {
    if (!supabase || busyId) return;
    setBusyId(kind); setMessage(''); setError('');
    try {
      const { error: rpcError } = await supabase.rpc('unequip_profile_cosmetic', { p_kind: kind });
      if (rpcError) throw rpcError;
      setMessage(ar ? 'تمت إزالة العنصر.' : 'Cosmetic removed.');
      await load();
    } catch (err: any) { setError(err?.message || 'Could not remove cosmetic.'); }
    finally { setBusyId(''); }
  };

  const saveLegacyStyle = async () => {
    if (!supabase || busyId) return;
    setBusyId('save'); setMessage(''); setError('');
    try {
      const { error: saveError } = await supabase.from('profile_customizations').upsert({
        user_id: userId, frame_key: frame, banner_key: banner, display_title: title.trim() || null
      }, { onConflict: 'user_id' });
      if (saveError) throw saveError;
      setMessage(ar ? 'تم حفظ ملفك الشخصي.' : 'Profile saved.');
    } catch (err: any) { setError(err?.message || 'Could not save profile.'); }
    finally { setBusyId(''); }
  };

  if (loading) return <div className="rounded-2xl border border-[var(--mousa-border-sand)] p-5 text-sm text-[var(--text-secondary)]"><Loader2 className="mr-2 inline animate-spin" size={16}/>{ar ? 'جارٍ تحميل ملفك ومتجرك…' : 'Loading your profile and store…'}</div>;

  return (
    <section
      className="space-y-4 rounded-[1.5rem] border border-[var(--mousa-border-sand)] bg-[var(--surface-primary)] p-3 text-[#F2F3F5] shadow-[0_18px_55px_rgba(0,0,0,.22)] sm:p-5"
      style={{
        '--surface-primary': '#232428',
        '--surface-secondary': '#2B2D31',
        '--text-primary': '#F2F3F5',
        '--text-secondary': '#B5BAC1',
        '--border-default': '#3F4147',
        '--action-primary': '#5865F2',
        '--action-primary-text': '#FFFFFF',
        '--mousa-border-sand': '#3F4147'
      } as React.CSSProperties}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Palette size={19} className="text-[var(--mousa-gold)]"/><div><h3 className="text-base font-black text-[var(--text-primary)]">{ar ? 'مظهر ملفك' : 'Your profile'}</h3><p className="text-xs text-[var(--text-secondary)]">{ar ? 'هوية بسيطة، ولمستك الخاصة' : 'A cleaner identity, with your own style'}</p></div></div>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"><Star size={14}/>{points.toLocaleString()} {ar ? 'نقطة' : 'points'}</div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-secondary)]">
        <div className="relative h-24 sm:h-32 overflow-hidden" style={{ background: 'linear-gradient(115deg,' + bannerStart + ',' + bannerEnd + ')' }}>
          {selectedBanner && <div className="absolute inset-0"><CosmeticArtwork item={selectedBanner}/></div>}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 0 1px, transparent 2px), radial-gradient(circle at 75% 60%, white 0 1px, transparent 2px)', backgroundSize: '28px 28px' }}/>
          <div className="absolute end-3 top-3 rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-black text-white">{ar ? 'ملف أنبا موسى' : 'ANBA MOUSA PROFILE'}</div>
        </div>
        <div className="flex flex-wrap items-center gap-3 p-4 sm:gap-4">
          <div className="relative -mt-10 grid h-[76px] w-[76px] shrink-0 place-items-center overflow-visible rounded-[24px] bg-[var(--surface-primary)] p-1 shadow-xl" style={{ outline: '4px solid ' + frameColor, outlineOffset: '2px', boxShadow: selectedEffect ? '0 0 28px ' + safeColor(selectedEffect.preview_end, '#D6A84F') : undefined }}>
            <div className="grid h-full w-full place-items-center overflow-hidden rounded-[19px] bg-[var(--surface-secondary)]">
              {avatarUrl && !avatarFailed ? <img src={avatarUrl} alt="" onError={() => setAvatarFailed(true)} className="h-full w-full object-cover"/> : <Crown size={30} style={{ color: frameColor }}/>}
            </div>
            <span className="absolute bottom-0 end-0 h-4 w-4 rounded-full border-[3px] border-[var(--surface-primary)] bg-emerald-500" title={ar ? 'نشط' : 'Online'} />
            {selectedBadge && <span className="absolute -bottom-2 -start-2 rounded-full border-2 border-[var(--surface-primary)] shadow-lg"><BadgeArtwork item={selectedBadge} compact /></span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><p className="truncate text-base font-black text-[var(--text-primary)]">{profileName}</p><span className="rounded-md bg-[#5865F2]/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#C7CBFF]">{profileRole === 'teacher' ? (ar ? 'خادم' : 'Servant') : profileRole === 'parent' ? (ar ? 'ولي أمر' : 'Parent') : profileRole === 'admin' ? (ar ? 'إدارة' : 'Admin') : (ar ? 'طالب' : 'Student')}</span></div>
            <p className="mt-0.5 text-xs font-bold text-[var(--text-secondary)]">{titles.find(item => item.id === title)?.[ar ? 'ar' : 'label'] || (ar ? 'رحلة نمو في الإيمان والمحبة' : 'Growing in Faith, Learning in Love')}</p>
            <p className="mt-1 text-[10px] text-[var(--text-secondary)]">{ar ? 'مجتمع • إيمان • تعلّم • خدمة' : 'Community • Faith • Learning • Service'}</p>
          </div>
          <div className="flex max-w-full flex-wrap gap-1.5">{equippedItems.map(item => <span key={item.id} title={ar ? item.title_ar : item.title_en} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] px-1.5 py-1 text-[9px] font-bold text-[var(--text-secondary)]"><span className="h-5 w-5 shrink-0 overflow-hidden rounded-md"><CosmeticArtwork item={item}/></span><span className="max-w-20 truncate">{ar ? item.title_ar : item.title_en}</span></span>)}</div>
        </div>
        <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-5">
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-2.5 text-center"><p className="text-sm font-black tabular-nums text-[var(--text-primary)]">{points.toLocaleString()}</p><p className="text-[9px] font-bold text-[var(--text-secondary)]">{ar ? 'النقاط' : 'Points'}</p></div>
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-2.5 text-center"><p className="text-sm font-black tabular-nums text-[var(--text-primary)]">🔥 {currentStreak}</p><p className="text-[9px] font-bold text-[var(--text-secondary)]">{ar ? 'المواظبة الحالية' : 'Current streak'}</p></div>
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-2.5 text-center"><p className="text-sm font-black tabular-nums text-[var(--text-primary)]">🏆 {longestStreak}</p><p className="text-[9px] font-bold text-[var(--text-secondary)]">{ar ? 'أطول مواظبة' : 'Longest streak'}</p></div>
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-2.5 text-center"><p className="text-sm font-black tabular-nums text-[var(--text-primary)]">{followersCount.toLocaleString()}</p><p className="text-[9px] font-bold text-[var(--text-secondary)]">{ar ? 'المتابعون' : 'Followers'}</p></div>
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-2.5 text-center"><p className="text-sm font-black tabular-nums text-[var(--text-primary)]">{followingCount.toLocaleString()}</p><p className="text-[9px] font-bold text-[var(--text-secondary)]">{ar ? 'يتابع' : 'Following'}</p></div>
        </div>
      </div>

      <nav className="grid grid-cols-3 gap-2 rounded-xl bg-[var(--surface-secondary)] p-1">
        <button type="button" onClick={() => setView('profile')} aria-pressed={view === 'profile'} className={'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-black transition ' + (view === 'profile' ? 'bg-[var(--action-primary)] text-[var(--action-primary-text)] shadow-sm' : 'text-[var(--text-secondary)]')}><Crown size={16}/>{ar ? 'ملفي' : 'My profile'}</button>
        <button type="button" onClick={() => setView('store')} aria-pressed={view === 'store'} className={'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-black transition ' + (view === 'store' ? 'bg-[var(--action-primary)] text-[var(--action-primary-text)] shadow-sm' : 'text-[var(--text-secondary)]')}><ShoppingBag size={16}/>{ar ? 'المتجر' : 'Store'}<span className="rounded-full bg-amber-400/20 px-1.5 text-[10px]">{catalog.length}</span></button>
        <button type="button" onClick={() => setView('inventory')} aria-pressed={view === 'inventory'} className={'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-xs font-black transition ' + (view === 'inventory' ? 'bg-[var(--action-primary)] text-[var(--action-primary-text)] shadow-sm' : 'text-[var(--text-secondary)]')}><Award size={15}/>{ar ? 'مقتنياتي' : 'Inventory'}<span className="rounded-full bg-emerald-400/20 px-1.5 text-[10px]">{unlocked.length}</span></button>
      </nav>

      {view === 'profile' ? <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-xs font-black text-[var(--text-primary)]">{ar ? 'الإطار الأساسي' : 'Starter frame'}</span><select value={frame} onChange={event => setFrame(event.target.value)} className="min-h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3 text-sm"><option value="coptic-gold">{ar ? 'ذهبي قبطي' : 'Coptic Gold'}</option><option value="olive-wreath">{ar ? 'إكليل الزيتون' : 'Olive Wreath'}</option><option value="royal-blue">{ar ? 'أزرق ملكي' : 'Royal Blue'}</option><option value="desert-sand">{ar ? 'رمال البرية' : 'Desert Sand'}</option><option value="burgundy">{ar ? 'عنابي' : 'Burgundy'}</option></select></label>
          <label className="block"><span className="mb-1.5 block text-xs font-black text-[var(--text-primary)]">{ar ? 'اللقب' : 'Profile title'}</span><select value={title} onChange={event => setTitle(event.target.value)} className="min-h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3 text-sm"><option value="">{ar ? 'بدون لقب' : 'No title'}</option>{titles.map(item => <option key={item.id} value={item.id}>{ar ? item.ar : item.label}</option>)}</select></label>
        </div>
        <label className="block"><span className="mb-1.5 block text-xs font-black text-[var(--text-primary)]">{ar ? 'الغلاف الأساسي' : 'Starter banner'}</span><select value={banner} onChange={event => setBanner(event.target.value)} className="min-h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3 text-sm"><option value="desert-dawn">{ar ? 'فجر البرية' : 'Desert Dawn'}</option><option value="coptic-pattern">{ar ? 'نقوش قبطية' : 'Coptic Pattern'}</option><option value="olive-garden">{ar ? 'بستان الزيتون' : 'Olive Garden'}</option><option value="golden-church">{ar ? 'الكنيسة الذهبية' : 'Golden Church'}</option><option value="midnight-teal">{ar ? 'فيروزي ليلي' : 'Midnight Teal'}</option></select></label>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[var(--text-secondary)]">{ar ? 'العناصر اللي فتحتها من المتجر هتظهر في معاينة ملفك.' : 'Items you unlock in the store appear in your profile preview.'}</p><button type="button" disabled={Boolean(busyId)} onClick={() => void saveLegacyStyle()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--action-primary)] px-4 text-sm font-black text-[var(--action-primary-text)] disabled:opacity-50">{busyId === 'save' ? <Loader2 size={15} className="animate-spin"/> : <Check size={15} />}{ar ? 'حفظ الملف' : 'Save profile'}</button></div>
      </div> : view === 'inventory' ? <div className="space-y-3">
        <div className="flex items-center justify-between gap-2"><div><h4 className="text-sm font-black text-[var(--text-primary)]">{ar ? 'مجموعتك الخاصة' : 'Your collection'}</h4><p className="text-xs text-[var(--text-secondary)]">{ar ? 'كل ما فتحته محفوظ هنا ويمكنك تطبيقه وقتما تحب.' : 'Everything you have unlocked is kept here and can be equipped any time.'}</p></div><span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-300">{unlocked.length}</span></div>
        {catalog.filter(item => unlocked.includes(item.id)).length ? <div className="grid gap-3 sm:grid-cols-2">{catalog.filter(item => unlocked.includes(item.id)).map(item => <article key={item.id} className="flex items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl"><CosmeticArtwork item={item}/></div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-[var(--text-primary)]">{ar ? item.title_ar : item.title_en}</p><p className="text-[10px] text-[var(--text-secondary)]">{ar ? kindLabels[item.kind][1] : kindLabels[item.kind][0]} · {ar ? rarityLabels[item.rarity]?.[1] : rarityLabels[item.rarity]?.[0]}</p><button type="button" disabled={Boolean(busyId) || equipped[item.kind] === item.id} onClick={() => void runCosmeticAction(item, 'equip')} className="mt-2 min-h-9 rounded-lg bg-[var(--action-primary)] px-3 text-xs font-black text-white disabled:opacity-50">{equipped[item.kind] === item.id ? (ar ? 'مُطبّق' : 'Equipped') : (ar ? 'تطبيق' : 'Equip')}</button></div>
        </article>)}</div> : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-[var(--text-secondary)]">{ar ? 'لسه ما فتحتش أي عناصر. زور المتجر وابدأ مجموعتك.' : 'Your inventory is empty. Visit the store to start your collection.'}</p>}
      </div> : <div className="space-y-3">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-[var(--surface-secondary)] p-1">{(['frame','banner','badge','effect'] as CosmeticKind[]).map(kind => <button key={kind} type="button" onClick={() => setCategory(kind)} aria-pressed={category === kind} className={'min-h-10 rounded-lg px-1 text-[11px] font-black ' + (category === kind ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)]')}>{ar ? kindLabels[kind][1] : kindLabels[kind][0]}</button>)}</div>
        {visibleItems.length ? <div className="grid gap-3 sm:grid-cols-2">{visibleItems.map(item => {
          const owned = unlocked.includes(item.id);
          const isEquipped = equipped[item.kind] === item.id;
          const start = safeColor(item.preview_start, '#174D4C');
          const end = safeColor(item.preview_end, '#D6A84F');
          return <article key={item.id} className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)]">
            <div className="relative h-20 overflow-hidden"><CosmeticArtwork item={item}/><span className="absolute end-2 top-2 rounded-full bg-black/45 px-2 py-1 text-[9px] font-black text-white">{ar ? rarityLabels[item.rarity]?.[1] : rarityLabels[item.rarity]?.[0]}</span>{isEquipped && <span className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[9px] font-black text-emerald-800"><Check size={11}/>{ar ? 'مُستخدم' : 'Equipped'}</span>}</div>
            <div className="space-y-2 p-3"><div><h4 className="text-sm font-black text-[var(--text-primary)]">{ar ? item.title_ar : item.title_en}</h4><p className="mt-0.5 min-h-8 text-[11px] text-[var(--text-secondary)]">{ar ? item.description_ar : item.description_en}</p></div>
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-amber-700 dark:text-amber-300">{item.points_cost.toLocaleString()} {ar ? 'نقطة' : 'pts'}</span>
                {isEquipped ? <button type="button" onClick={() => void unequip(item.kind)} disabled={Boolean(busyId)} className="min-h-9 rounded-lg border px-3 text-xs font-bold">{ar ? 'إزالة' : 'Unequip'}</button>
                  : owned ? <button type="button" onClick={() => void runCosmeticAction(item, 'equip')} disabled={Boolean(busyId)} className="min-h-9 rounded-lg bg-[var(--action-primary)] px-3 text-xs font-black text-[var(--action-primary-text)]">{busyId === item.id ? <Loader2 size={14} className="animate-spin"/> : ar ? 'تطبيق' : 'Equip'}</button>
                  : <button type="button" onClick={() => void runCosmeticAction(item, 'purchase')} disabled={Boolean(busyId) || points < item.points_cost} className="min-h-9 rounded-lg border border-amber-400/70 px-3 text-xs font-black disabled:opacity-40">{busyId === item.id ? <Loader2 size={14} className="animate-spin"/> : ar ? 'فتح العنصر' : 'Unlock'}</button>}
              </div>
            </div>
          </article>;
        })}</div> : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-[var(--text-secondary)]">{ar ? 'مفيش عناصر في القسم ده حالياً.' : 'No items in this category yet.'}</p>}
        <p className="text-[11px] text-[var(--text-secondary)]">{ar ? 'الشراء والتجهيز بيتأكدوا من قاعدة البيانات، والنقاط بتتخصم مرة واحدة فقط.' : 'Purchases and equipping are verified by the database; points are charged only once.'}</p>
      </div>}

      {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">{message}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-800 dark:bg-red-950/30 dark:text-red-200">{error}</p>}
      <div className="flex justify-end"><button type="button" onClick={() => void load()} disabled={Boolean(busyId)} className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)]"><X size={13}/>{ar ? 'إعادة تحميل البيانات' : 'Refresh profile data'}</button></div>
    </section>
  );
}
