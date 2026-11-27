import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Award, Check, Crown, Loader2, Palette, ShoppingBag, Star, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { CopticAchievementSeal, type CopticAchievementCategory } from '../design-system/CopticAchievementSeal';

type CosmeticKind = 'frame' | 'banner' | 'badge' | 'effect';
type Cosmetic = {
  id: string; kind: CosmeticKind; title_en: string; title_ar: string;
  description_en: string; description_ar: string; preview_start: string; preview_end: string;
  points_cost: number; rarity: 'common' | 'rare' | 'epic' | 'legendary'; display_order: number;
};
type Equipped = Partial<Record<CosmeticKind, string>> & { avatar_position_x?: number; avatar_position_y?: number; avatar_zoom?: number };

function BadgeArtwork({ item, compact = false }: { item: Cosmetic; compact?: boolean }) {
  const categoryById: Record<string, CopticAchievementCategory> = {
    'badge-prayer-flame': 'prayer',
    'badge-hymn-wreath': 'hymns',
    'badge-cross-shield': 'taxis',
    'badge-gospel-light': 'learning',
    'badge-servant-heart': 'service',
    'badge-cross-victory': 'consistency'
  };
  const category = categoryById[item.id] || 'learning';
  return (
    <div className="grid h-full w-full place-items-center overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 35%, ' + safeColor(item.preview_end, '#E7BD65') + ', ' + safeColor(item.preview_start, '#123F48') + ' 76%)' }}>
      <CopticAchievementSeal category={category} designKey={item.id} size={compact ? 31 : 84} title={item.title_en}/>
    </div>
  );
}

function CosmeticArtwork({ item }: { item: Cosmetic }) {
  if (item.kind === 'badge') return <BadgeArtwork item={item} />;
  const seed = Array.from(item.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const accent = safeColor(item.preview_end, '#D6A84F');
  const base = safeColor(item.preview_start, '#174D4C');
  const svgId = 'art-' + item.id.replace(/[^a-zA-Z0-9_-]/g, '-');
  const banner = item.kind === 'banner';
  return (
    <div className="grid h-full w-full place-items-center overflow-hidden" style={{ background: 'linear-gradient(125deg,' + base + ',' + accent + ')' }}>
      <svg viewBox="0 0 220 90" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={svgId + '-gold'} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FFF2C8"/><stop offset=".55" stopColor={accent}/><stop offset="1" stopColor={base}/></linearGradient>
          <radialGradient id={svgId + '-glow'}><stop stopColor="#FFF4D2" stopOpacity=".9"/><stop offset="1" stopColor="#FFF4D2" stopOpacity="0"/></radialGradient>
        </defs>
        {banner && item.id === 'banner-kiahk-stars' && <>
          <circle cx="176" cy="20" r="24" fill={'url(#' + svgId + '-glow)'}/>
          <path d="M0 70Q45 48 92 67T220 57V90H0Z" fill="#07152F" opacity=".7"/>
          <path d="M18 65 35 48 52 65M35 48v-9m-4 4h8M135 68V42h20v26m-25-26 15-13 15 13m-11-13V15" fill="none" stroke="#F9E7B5" strokeWidth="2"/>
          {Array.from({length:18},(_,i)=><path key={i} d="M0 -4V4" stroke="#FFF2C8" strokeWidth={i%3===0?2:1} transform={'translate('+(8+(i*37)%205)+' '+(8+(i*19)%36)+') rotate('+(i*23)+' )'}/>)}
        </>}
        {banner && item.id === 'banner-desert-dawn' && <>
          <circle cx="172" cy="28" r="26" fill={'url(#' + svgId + '-glow)'}/><circle cx="172" cy="28" r="13" fill="#FFE3A0"/>
          <path d="M0 66Q44 35 90 63T220 54V90H0Z" fill="#6A3C2B"/><path d="M0 76Q56 58 110 76T220 69V90H0Z" fill="#382B2C"/>
          <path d="M42 67V40h18v27M36 40l15-13 15 13M50 27V16m-5 5h10" fill="none" stroke="#FFF0C7" strokeWidth="2.5"/>
        </>}
        {banner && item.id === 'banner-pascha-light' && <>
          <circle cx="110" cy="45" r="43" fill={'url(#' + svgId + '-glow)'}/>
          <path d="M110 12v50M94 28h32M110 60l-8 10h16Z" fill="none" stroke="#FFE9A9" strokeWidth="4" strokeLinecap="round"/>
          <path d="M54 42v30m-11-19h22M166 42v30m-11-19h22" stroke="#E8C47A" strokeWidth="3" strokeLinecap="round"/>
          <path d="M0 78Q50 61 110 78T220 78V90H0Z" fill="#240D1A" opacity=".65"/>
        </>}
        {banner && item.id === 'banner-heavenly-blue' && <>
          <circle cx="42" cy="24" r="20" fill={'url(#' + svgId + '-glow)'}/>
          <path d="M0 58Q30 38 57 56T110 53T165 55T220 50V90H0Z" fill="#D6ECF6" opacity=".28"/>
          <path d="M80 34q10-14 20 0 10-14 20 0M125 27q8-11 16 0 8-11 16 0" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round"/>
          <path d="M0 77Q60 60 110 78T220 70V90H0Z" fill="#103B67" opacity=".7"/>
        </>}
        {banner && item.id === 'banner-nile-moonlight' && <>
          <circle cx="174" cy="21" r="19" fill="#D9F2F1"/><circle cx="183" cy="14" r="18" fill={base}/>
          <path d="M0 55Q38 43 74 58T146 55T220 54" fill="none" stroke="#A7F1E6" strokeWidth="3"/>
          <path d="M0 69Q45 52 88 70T164 66T220 66V90H0Z" fill="#092C42" opacity=".75"/>
          {Array.from({length:7},(_,i)=><circle key={i} cx={12+i*31} cy={12+(i%3)*9} r="1.7" fill="#F3FFFF"/>)}
        </>}
        {banner && item.id === 'banner-kiahk-candlelight' && <>
          <circle cx="110" cy="25" r="34" fill={'url(#' + svgId + '-glow)'}/>
          {[70,110,150].map((x,i)=><g key={x}><rect x={x-6} y={48+(i%2)*7} width="12" height="30" rx="3" fill="#F4D79B"/><path d={'M'+x+' 46q-8-11 0-19 8 8 0 19Z'} fill="#FFF0B7"/><path d={'M'+x+' 51v-5'} stroke="#8C5A2B" strokeWidth="1.5"/></g>)}
          <path d="M0 82H220" stroke="#F7D99C" strokeWidth="2" opacity=".7"/>
        </>}
        {banner && item.id === 'banner-golden-desert' && <>
          <circle cx="175" cy="20" r="22" fill="#FFF0BF"/>
          <path d="M0 62Q48 35 96 65T220 58V90H0Z" fill="#A76D36"/><path d="M0 78Q56 55 112 78T220 72V90H0Z" fill="#543A2C"/>
          <path d="M48 68q-2-26 2-38m0 6q-17-13-24-3 15 0 24 12m0-10q15-15 26-6-15 4-24 17" fill="none" stroke="#E8D08A" strokeWidth="3" strokeLinecap="round"/>
          <path d="M139 67V42h18v25m-23-25 14-13 14 13" fill="none" stroke="#FFF1C9" strokeWidth="2.2"/>
        </>}
        {!banner && item.kind === 'frame' && <>
          <rect x="78" y="5" width="64" height="80" rx="20" fill="#091A28" opacity=".3" stroke={'url(#' + svgId + '-gold)'} strokeWidth="5"/>
          <rect x="85" y="12" width="50" height="66" rx="15" fill="none" stroke="#FFF1C7" strokeWidth="1.8" strokeDasharray={seed%2?'3 3':'1 4'}/>
          {item.id === 'frame-halo-gold' && <><circle cx="110" cy="45" r="17" fill="none" stroke="#FFF0B8" strokeWidth="3"/><path d="M110 20v-9m-7 4h14m-7 60v9m-7-4h14" stroke="#FFF0B8" strokeWidth="2"/></>}
          {item.id === 'frame-desert-royal' && <><path d="M110 10l7 9 11 2-8 8 2 11-12-6-12 6 2-11-8-8 11-2Z" fill="#F4D69B"/><path d="M84 29h-9m61 0h9M84 60h-9m61 0h9" stroke="#F4D69B" strokeWidth="3"/></>}
          {item.id === 'frame-midnight-coptic' && <><path d="M110 13v22m-10-12h20m-10 22v17m-8-9h16" stroke="#C8F2F0" strokeWidth="3" strokeLinecap="round"/><circle cx="110" cy="45" r="29" fill="none" stroke="#B4E7E2" strokeDasharray="1 6" strokeWidth="2"/></>}
          {item.id === 'frame-pascha-radiance' && <><path d="M110 15v29m-13-16h26m-13 16v27m-13-13h26" stroke="#FFE3A0" strokeWidth="4" strokeLinecap="round"/><path d="M95 17l-8-7m38 7 8-7M95 73l-8 7m38-7 8 7" stroke="#F9C96D" strokeWidth="2"/></>}
          {item.id === 'frame-archangel-sapphire' && <><path d="M88 51q-18-22-10-34 17 8 24 29M132 51q18-22 10-34-17 8-24 29" fill="none" stroke="#C5E5FF" strokeWidth="4" strokeLinecap="round"/><path d="M110 13l7 8-7 8-7-8Z" fill="#B9D8FF"/></>}
          {item.id === 'frame-martyr-ruby' && <><path d="M85 64q-18-13-9-35 5 15 18 20M135 64q18-13 9-35-5 15-18 20" fill="none" stroke="#FFC3C3" strokeWidth="3"/><path d="M110 11l8 12-8 12-8-12Z" fill="#FFB2B2"/></>}
          {item.id === 'frame-olive-crown' && <><path d="M83 66q-18-24 3-47 0 16 10 19 5-15 17-24 0 17 10 24 11-5 12-19 19 23 2 47" fill="none" stroke="#D7EBA0" strokeWidth="3"/><circle cx="110" cy="13" r="5" fill="#F3E9B6"/></>}
        </>}
        {!banner && item.kind === 'effect' && <>
          <circle cx="110" cy="45" r="34" fill="none" stroke="#FFF2C8" strokeWidth="2" opacity=".9"/>
          {item.id === 'effect-stardust' && <>{Array.from({length:9},(_,i)=><path key={i} d="M0 -5 2 -1 6 0 2 2 0 6 -2 2 -6 0 -2 -1Z" fill="#F6E7FF" transform={'translate('+(110+Math.cos(i*0.7)*35)+' '+(45+Math.sin(i*0.7)*35)+') scale('+(i%2?.7:1.2)+')'}/>)}</>}
          {item.id === 'effect-emerald-aura' && <>{Array.from({length:8},(_,i)=><path key={i} d="M0 0q-12-15 0-24 12 9 0 24Z" fill="#A7F3D0" opacity=".9" transform={'translate('+(110+Math.cos(i*Math.PI/4)*34)+' '+(45+Math.sin(i*Math.PI/4)*34)+') rotate('+(i*45)+')'}/>)}</>}
          {item.id === 'effect-golden-radiance' && <>{Array.from({length:16},(_,i)=><path key={i} d="M0 -42v-8" stroke="#FFF0B5" strokeWidth={i%2?1.5:3} strokeLinecap="round" transform={'rotate('+(i*22.5)+' 110 45)'}/>)}</>}
          {item.id === 'effect-celestial-blue' && <><path d="M118 17a22 22 0 1 0 22 36 19 19 0 0 1-22-36Z" fill="#E0E7FF"/><path d="m74 24 3 7 7 3-7 3-3 7-3-7-7-3 7-3Zm78 35 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#E0E7FF"/></>}
        </>}
      </svg>
    </div>
  );
}

function ProfileFrameOverlay({ item }: { item: Cosmetic }) {
  const id = item.id;
  const color = safeColor(item.preview_end, '#E7BD65');
  return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute -inset-2.5 z-20 h-[calc(100%+20px)] w-[calc(100%+20px)] overflow-visible" aria-hidden="true">
    <rect x="3" y="3" width="94" height="94" rx="25" fill="none" stroke={color} strokeWidth="4.5"/>
    <rect x="7" y="7" width="86" height="86" rx="21" fill="none" stroke="#FFF1C7" strokeWidth="1.3" opacity=".92"/>
    {id === 'frame-halo-gold' && <>{Array.from({length:12},(_,i)=><path key={i} d="M50 0v8" stroke="#FFF0B8" strokeWidth={i%3===0?3:1.5} transform={'rotate('+(i*30)+' 50 50)'}/>)}</>}
    {id === 'frame-desert-royal' && <><path d="M50 0l5 8 9 1-7 7 2 9-9-5-9 5 2-9-7-7 9-1Z" fill="#F4D69B"/><circle cx="4" cy="50" r="3" fill={color}/><circle cx="96" cy="50" r="3" fill={color}/></>}
    {id === 'frame-midnight-coptic' && <><path d="M50 0v17m-8-9h16M50 83v17m-8-9h16" stroke="#C8F2F0" strokeWidth="3" strokeLinecap="round"/>{Array.from({length:8},(_,i)=><circle key={i} cx={50+Math.cos(i*Math.PI/4)*45} cy={50+Math.sin(i*Math.PI/4)*45} r="1.8" fill="#D8FFFF"/>)}</>}
    {id === 'frame-pascha-radiance' && <><path d="M50 0v18m-9-9h18M50 82v18m-9-9h18" stroke="#FFE3A0" strokeWidth="4" strokeLinecap="round"/><path d="M0 50h12m76 0h12" stroke="#F9C96D" strokeWidth="3"/></>}
    {id === 'frame-archangel-sapphire' && <><path d="M23 4Q3 18 4 39M77 4q20 14 19 35" fill="none" stroke="#C5E5FF" strokeWidth="3" strokeLinecap="round"/><path d="M50 0l5 8-5 8-5-8Z" fill="#B9D8FF"/></>}
    {id === 'frame-martyr-ruby' && <><path d="M4 70Q0 45 17 20q2 20 17 28M96 70q4-25-13-50-2 20-17 28" fill="none" stroke="#FFC3C3" strokeWidth="3"/><path d="M50 0l6 9-6 9-6-9Z" fill="#FFB2B2"/></>}
    {id === 'frame-olive-crown' && <><path d="M8 70Q0 42 20 15q0 18 13 22 5-17 17-25 12 8 17 25 13-4 13-22 20 27 12 55" fill="none" stroke="#D7EBA0" strokeWidth="3"/><circle cx="50" cy="6" r="4" fill="#F3E9B6"/></>}
  </svg>;
}

function ProfileEffectOverlay({ item }: { item: Cosmetic }) {
  return <svg viewBox="0 0 120 120" className="pointer-events-none absolute -inset-6 z-30 h-[calc(100%+48px)] w-[calc(100%+48px)] overflow-visible" aria-hidden="true">
    {item.id === 'effect-stardust' && <>{Array.from({length:14},(_,i)=><path key={i} d="M0 -4 1.5 -1 4 0 1.5 1 0 4 -1.5 1 -4 0 -1.5 -1Z" fill="#E9D5FF" transform={'translate('+(60+Math.cos(i*0.45)*52)+' '+(60+Math.sin(i*0.45)*52)+')'}/>)}</>}
    {item.id === 'effect-emerald-aura' && <>{Array.from({length:10},(_,i)=><path key={i} d="M0 0q-12-16 0-26 12 10 0 26Z" fill="#6EE7B7" opacity=".85" transform={'translate('+(60+Math.cos(i*Math.PI/5)*50)+' '+(60+Math.sin(i*Math.PI/5)*50)+') rotate('+(i*36)+')'}/>)}</>}
    {item.id === 'effect-golden-radiance' && <>{Array.from({length:20},(_,i)=><path key={i} d="M60 3v-7" stroke="#FDE68A" strokeWidth={i%2?1.5:3} strokeLinecap="round" transform={'rotate('+(i*18)+' 60 60)'}/>)}</>}
    {item.id === 'effect-celestial-blue' && <><circle cx="20" cy="25" r="8" fill="#C7D2FE"/><path d="M21 10a11 11 0 1 0 11 18 9 9 0 0 1-11-18Z" fill="#E0E7FF"/>{Array.from({length:8},(_,i)=><circle key={i} cx={60+Math.cos(i*Math.PI/4)*52} cy={60+Math.sin(i*Math.PI/4)*52} r="1.7" fill="#E0E7FF"/>)}</>}
  </svg>;
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
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const [frame, setFrame] = useState('coptic-gold');
  const [banner, setBanner] = useState('desert-dawn');
  const [title, setTitle] = useState('');
  const [points, setPoints] = useState(0);
  const [profileName, setProfileName] = useState('Anba Mousa member');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [avatarPositionX, setAvatarPositionX] = useState(50);
  const [avatarPositionY, setAvatarPositionY] = useState(50);
  const [avatarZoom, setAvatarZoom] = useState(1);
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
      const savedEquipped = (customResult.data.equipped_cosmetics || {}) as Equipped;
      setEquipped(savedEquipped);
      setAvatarPositionX(Number.isFinite(savedEquipped.avatar_position_x) ? Number(savedEquipped.avatar_position_x) : 50);
      setAvatarPositionY(Number.isFinite(savedEquipped.avatar_position_y) ? Number(savedEquipped.avatar_position_y) : 50);
      setAvatarZoom(Number.isFinite(savedEquipped.avatar_zoom) ? Math.min(2.5, Math.max(1, Number(savedEquipped.avatar_zoom))) : 1);
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

  const previewItem = catalog.find(item => item.id === previewItemId) || null;
  const previewEquipped: Equipped = previewItem ? { ...equipped, [previewItem.kind]: previewItem.id } : equipped;
  const equippedItems = useMemo(() => catalog.filter(item => previewEquipped[item.kind] === item.id), [catalog, previewEquipped]);
  const selectedFrame = catalog.find(item => item.id === previewEquipped.frame);
  const selectedBanner = catalog.find(item => item.id === previewEquipped.banner);
  const selectedEffect = catalog.find(item => item.id === previewEquipped.effect);
  const selectedBadge = catalog.find(item => item.id === previewEquipped.badge);
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
        user_id: userId, frame_key: frame, banner_key: banner, display_title: title.trim() || null,
        equipped_cosmetics: { ...equipped, avatar_position_x: avatarPositionX, avatar_position_y: avatarPositionY, avatar_zoom: avatarZoom }
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

      {previewItem && view === 'store' && <p role="status" className="rounded-xl border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-200">{ar ? 'معاينة مباشرة: العنصر ظاهر الآن على ملفك بالأعلى فقط، ولم يتم شراؤه أو تطبيقه.' : 'Live preview: this item is shown on your profile above only. It has not been purchased or equipped.'}</p>}
      <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-secondary)]">
        <div className="relative h-24 sm:h-32 overflow-hidden" style={{ background: 'linear-gradient(115deg,' + bannerStart + ',' + bannerEnd + ')' }}>
          {selectedBanner && <div className="absolute inset-0"><CosmeticArtwork item={selectedBanner}/></div>}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 0 1px, transparent 2px), radial-gradient(circle at 75% 60%, white 0 1px, transparent 2px)', backgroundSize: '28px 28px' }}/>
          <div className="absolute end-3 top-3 rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-black text-white">{ar ? 'ملف أنبا موسى' : 'ANBA MOUSA PROFILE'}</div>
        </div>
        <div className="flex flex-wrap items-center gap-3 p-4 sm:gap-4">
          <div className="relative -mt-10 grid h-[76px] w-[76px] shrink-0 place-items-center overflow-visible rounded-[24px] bg-[var(--surface-primary)] p-1 shadow-xl" style={{ outline: selectedFrame ? 'none' : '4px solid ' + frameColor, outlineOffset: '2px', boxShadow: selectedEffect ? '0 0 28px ' + safeColor(selectedEffect.preview_end, '#D6A84F') : undefined }}>
            <div className="grid h-full w-full place-items-center overflow-hidden rounded-[19px] bg-[var(--surface-secondary)]">
              {avatarUrl && !avatarFailed ? <img src={avatarUrl} alt="" onError={() => setAvatarFailed(true)} className="h-full w-full object-cover transition-transform" style={{ objectPosition: `${avatarPositionX}% ${avatarPositionY}%`, transform: `scale(${avatarZoom})` }}/> : <Crown size={30} style={{ color: frameColor }}/>}
            </div>
            {selectedFrame && <ProfileFrameOverlay item={selectedFrame}/>}
            {selectedEffect && <ProfileEffectOverlay item={selectedEffect}/>}
            <span className="absolute bottom-0 end-0 h-4 w-4 rounded-full border-[3px] border-[var(--surface-primary)] bg-emerald-500" title={ar ? 'نشط' : 'Online'} />
            {selectedBadge && <span className="absolute -bottom-2 -start-2 rounded-full border-2 border-[var(--surface-primary)] shadow-lg"><BadgeArtwork item={selectedBadge} compact /></span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><p className="truncate text-base font-black text-[var(--text-primary)]">{profileName}</p><span className="rounded-md bg-[#5865F2]/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#C7CBFF]">{profileRole === 'teacher' ? (ar ? 'خادم' : 'Servant') : profileRole === 'parent' ? (ar ? 'ولي أمر' : 'Parent') : profileRole === 'admin' ? (ar ? 'إدارة' : 'Admin') : (ar ? 'طالب' : 'Student')}</span></div>
            <p className="mt-0.5 text-xs font-bold text-[var(--text-secondary)]">{titles.find(item => item.id === title)?.[ar ? 'ar' : 'label'] || (ar ? 'رحلة نمو في الإيمان والمحبة' : 'Growing in Faith, Learning in Love')}</p>
            <p className="mt-1 text-[10px] text-[var(--text-secondary)]">{ar ? 'مجتمع • إيمان • تعلّم • خدمة' : 'Community • Faith • Learning • Service'}</p>
          </div>
          <div className="flex max-w-full flex-wrap gap-1.5">{equippedItems.map(item => <span key={item.id} title={ar ? item.title_ar : item.title_en} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] px-1.5 py-1 text-[9px] font-bold text-[var(--text-secondary)]"><span className="h-5 w-5 shrink-0 overflow-hidden rounded-md"><CosmeticArtwork item={item}/></span><span className="max-w-20 truncate">{ar ? item.title_ar : item.title_en}</span></span>)}</div>
          <div className="grid gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3 text-start sm:grid-cols-3">
            <label className="block text-[11px] font-bold text-[var(--text-secondary)]">{ar ? 'تحريك الصورة يمين / شمال' : 'Move photo left / right'}<input aria-label={ar ? 'موضع الصورة الأفقي' : 'Horizontal photo position'} type="range" min="0" max="100" value={avatarPositionX} onChange={event => setAvatarPositionX(Number(event.target.value))} className="mt-2 w-full accent-[var(--action-primary)]"/></label>
            <label className="block text-[11px] font-bold text-[var(--text-secondary)]">{ar ? 'تحريك الصورة فوق / تحت' : 'Move photo up / down'}<input aria-label={ar ? 'موضع الصورة الرأسي' : 'Vertical photo position'} type="range" min="0" max="100" value={avatarPositionY} onChange={event => setAvatarPositionY(Number(event.target.value))} className="mt-2 w-full accent-[var(--action-primary)]"/></label>
            <label className="block text-[11px] font-bold text-[var(--text-secondary)]">{ar ? 'تكبير الصورة' : 'Zoom / crop'}<input aria-label={ar ? 'تكبير قص الصورة' : 'Photo zoom'} type="range" min="1" max="2.5" step="0.05" value={avatarZoom} onChange={event => setAvatarZoom(Number(event.target.value))} className="mt-2 w-full accent-[var(--action-primary)]"/></label>
          </div>
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
              <button type="button" onClick={() => setPreviewItemId(previewItemId === item.id ? null : item.id)} aria-pressed={previewItemId === item.id} className={'inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border px-3 text-xs font-black transition ' + (previewItemId === item.id ? 'border-amber-300 bg-amber-300/15 text-amber-700 dark:text-amber-200' : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-amber-400')}>{previewItemId === item.id ? (ar ? 'إلغاء المعاينة' : 'Stop preview') : (ar ? 'جرّبه على ملفي' : 'Preview on my profile')}</button>
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
