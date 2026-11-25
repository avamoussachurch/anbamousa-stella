import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, UserPlus, UserCheck, X, Flame, Trophy, Loader2, MessagesSquare, ArrowUpRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type DirectoryProfile = {
  user_id: string; display_name: string; role: string; avatar_url: string | null;
  points: number; current_streak: number; longest_streak: number;
  followers_count: number; following_count: number; is_following: boolean;
  frame_key?: string; banner_key?: string; display_title?: string | null;
  equipped_cosmetics?: Partial<Record<'frame' | 'banner' | 'badge' | 'effect', string>>;
  earned_badges?: Array<{ id: string; title_en: string; title_ar: string; category: string; icon: string; style: string }>;
};

const profileTitleLabel = (title: string | null | undefined, ar: boolean) => {
  const labels: Record<string,[string,string]> = {
    'hymn-explorer':['Hymn Explorer','مستكشف الألحان'], 'prayer-heart':['Prayer Heart','قلب محب للصلاة'],
    'bible-reader':['Bible Reader','قارئ الكتاب المقدس'], 'church-helper':['Church Helper','خادم الكنيسة'],
    'sunday-school-star':['Sunday School Star','نجم مدارس الأحد'], 'saint-story-keeper':['Saint Stories Keeper','محب سير القديسين']
  };
  const pair = title ? labels[title] : undefined;
  return pair ? (ar ? pair[1] : pair[0]) : null;
};

const bannerBackground = (profile: DirectoryProfile): string => {
  const equipped = profile.equipped_cosmetics?.banner;
  const cosmeticBanners: Record<string, string> = {
    'banner-kiahk-stars': 'linear-gradient(120deg,#101D46,#5B78C7)',
    'banner-pascha-light': 'linear-gradient(120deg,#4A1020,#D7A94A)',
    'banner-heavenly-blue': 'linear-gradient(120deg,#164E83,#8BC5E8)',
    'banner-nile-moonlight': 'linear-gradient(120deg,#0F3448,#38A6A8)',
    'banner-kiahk-candlelight': 'linear-gradient(120deg,#2E1C43,#F6C86F)',
    'banner-golden-desert': 'linear-gradient(120deg,#7A3E1D,#F0C16B)'
  };
  if (equipped && cosmeticBanners[equipped]) return cosmeticBanners[equipped];
  const legacyBanners: Record<string, string> = {
    'coptic-pattern': 'repeating-linear-gradient(45deg,#174d4c 0 12px,#1e6260 12px 24px,#c59b50 24px 27px)',
    'olive-garden': 'linear-gradient(120deg,#244c39,#6e8751,#c2a96a)',
    'golden-church': 'linear-gradient(120deg,#5b3a27,#a77b39,#e9ce8a)',
    'midnight-teal': 'linear-gradient(120deg,#102f3b,#145b62,#327e79)'
  };
  return legacyBanners[profile.banner_key || ''] || 'linear-gradient(120deg,#6f4935,#d6a15b,#f4dca6)';
};
const roleLabel = (role: string, ar: boolean) => {
  const labels: Record<string, [string,string]> = {
    student:['Student','طالب'], parent:['Parent','ولي أمر'], teacher:['Servant','خادم'], admin:['Church Admin','إدارة الكنيسة']
  };
  const pair = labels[role] || ['Church member','عضو الكنيسة'];
  return ar ? pair[1] : pair[0];
};

export function FeedPeopleDirectory({ lang }: { lang: 'en'|'ar'|'cop'|'copt' }) {
  const ar = lang === 'ar';
  const [open,setOpen] = useState(false);
  const [query,setQuery] = useState('');
  const [people,setPeople] = useState<DirectoryProfile[]>([]);
  const [selected,setSelected] = useState<DirectoryProfile|null>(null);
  const [loading,setLoading] = useState(false);
  const [busyId,setBusyId] = useState<string|null>(null);
  const [error,setError] = useState('');

  const load = useCallback(async (search: string) => {
    if (!supabase) return;
    setLoading(true); setError('');
    const { data, error: rpcError } = await supabase.rpc('get_profile_directory_v3',{p_search:search.trim() || null});
    if (rpcError) setError(ar ? 'تعذر تحميل دليل أعضاء الكنيسة.' : 'Could not load the church directory.');
    else setPeople((data || []) as DirectoryProfile[]);
    setLoading(false);
  },[ar]);

  useEffect(() => { if (open) void load(query); },[open,load]);

  const toggleFollow = async (person: DirectoryProfile) => {
    if (!supabase || busyId) return;
    setBusyId(person.user_id); setError('');
    const result = person.is_following
      ? await supabase.from('profile_follows').delete().eq('followed_id',person.user_id)
      : await supabase.from('profile_follows').insert({followed_id:person.user_id});
    if (result.error) setError(ar ? 'تعذر تحديث المتابعة. حاول مرة أخرى.' : 'Could not update your follow. Please try again.');
    else {
      setPeople(current=>current.map(p=>p.user_id===person.user_id?{...p,is_following:!p.is_following,followers_count:Math.max(0,p.followers_count+(p.is_following?-1:1))}:p));
      setSelected(current=>current?.user_id===person.user_id?{...current,is_following:!current.is_following,followers_count:Math.max(0,current.followers_count+(current.is_following?-1:1))}:current);
    }
    setBusyId(null);
  };

  return <>
    <button type="button" onClick={()=>{setOpen(true);setSelected(null);}} className="group inline-flex min-h-11 items-center gap-2.5 rounded-xl border-2 border-[#7C79F6]/60 bg-gradient-to-br from-[#5865F2] via-[#5059D8] to-[#3D43A8] px-3.5 py-2 text-xs font-black text-white shadow-[0_8px_22px_-10px_rgba(76,83,220,.8)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-10px_rgba(76,83,220,.9)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8F96FF]">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/15 ring-1 ring-white/20"><MessagesSquare size={17}/></span>
      <span>{ar?'مجتمعنا':'Community'}</span>
      <span className="rounded-full bg-white/15 px-2 py-1 text-[9px] font-black text-white/90">{ar?'اكتشف':'Explore'}</span>
      <ArrowUpRight size={14} className="opacity-75 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"/>
    </button>
    <AnimatePresence>
      {open && <motion.div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
        <motion.section dir={ar?'rtl':'ltr'} initial={{opacity:0,y:24,scale:.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:18,scale:.98}} className="flex max-h-[min(88dvh,780px)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.7rem] border border-[var(--mousa-border-sand)] bg-[var(--mousa-cream-surface)] shadow-2xl">
          <header className="flex items-center justify-between gap-3 border-b border-[var(--mousa-border-sand)] bg-gradient-to-r from-[var(--mousa-teal-deep)] to-[#1d6560] p-5 text-white">
            <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-200">{ar?'عيلة الكنيسة':'CHURCH COMMUNITY'}</p><h2 className="mt-1 text-xl font-black">{ar?'دليل الأعضاء':'People directory'}</h2><p className="mt-1 text-xs text-white/75">{ar?'تعرّف على أعضاء مجتمع الكنيسة':'Discover and follow church community members'}</p></div>
            <button type="button" onClick={()=>setOpen(false)} aria-label={ar?'إغلاق':'Close'} className="rounded-xl bg-white/10 p-2 hover:bg-white/20"><X size={20}/></button>
          </header>
          <div className="border-b border-[var(--mousa-border-sand)] p-4">
            <label className="flex items-center gap-2 rounded-xl border border-[var(--mousa-border-sand)] bg-white/70 px-3 py-2.5 dark:bg-stone-900"><Search size={17} className="text-[var(--mousa-sand-500)]"/><input value={query} onChange={e=>{setQuery(e.target.value);void load(e.target.value);}} placeholder={ar?'ابحث عن عضو بالاسم…':'Search members by name…'} className="w-full bg-transparent text-sm outline-none"/></label>
          </div>
          {error && <p role="alert" className="px-4 pt-3 text-xs font-bold text-red-600">{error}</p>}
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {selected ? <div className="mx-auto max-w-md space-y-5 py-3 text-center">
              <button type="button" onClick={()=>setSelected(null)} className="mb-2 text-xs font-bold text-[var(--mousa-teal-deep)]">← {ar?'كل الأعضاء':'All members'}</button>
               <div className="h-20 w-full rounded-2xl shadow-inner" style={{ background: bannerBackground(selected) }} />
              <div className={'mx-auto grid h-28 w-28 place-items-center rounded-[2rem] bg-white p-1 shadow-lg '+(selected.frame_key==='olive-wreath'?'ring-4 ring-emerald-600':selected.frame_key==='royal-blue'?'ring-4 ring-blue-700':selected.frame_key==='desert-sand'?'ring-4 ring-orange-300':selected.frame_key==='burgundy'?'ring-4 ring-rose-900':'ring-4 ring-amber-400')} style={{outline:selected.equipped_cosmetics?.frame==='frame-midnight-coptic'?'4px solid #6BC6C4':selected.equipped_cosmetics?.frame==='frame-pascha-radiance'?'4px solid #F5C96A':selected.equipped_cosmetics?.frame==='frame-desert-royal'?'4px solid #E7A84B':selected.equipped_cosmetics?.frame==='frame-archangel-sapphire'?'4px solid #6FA8DC':selected.equipped_cosmetics?.frame==='frame-martyr-ruby'?'4px solid #D95D5D':selected.equipped_cosmetics?.frame==='frame-olive-crown'?'4px solid #C7D86A':selected.equipped_cosmetics?.frame==='frame-halo-gold'?'4px solid #F6D365':undefined,boxShadow:selected.equipped_cosmetics?.effect==='effect-stardust'?'0 0 28px #E9D5FF':selected.equipped_cosmetics?.effect==='effect-emerald-aura'?'0 0 28px #6EE7B7':selected.equipped_cosmetics?.effect==='effect-golden-radiance'?'0 0 28px #FDE68A':selected.equipped_cosmetics?.effect==='effect-celestial-blue'?'0 0 28px #A5B4FC':undefined}}><img src={selected.avatar_url || '/icons/icon-192.png'} alt="" className="h-full w-full rounded-[1.5rem] object-cover"/></div>
              <div><h3 className="text-2xl font-black text-[var(--mousa-teal-deep)] dark:text-white">{selected.display_name}</h3><p className="mt-1 text-sm font-bold text-[var(--mousa-sand-500)]">{profileTitleLabel(selected.display_title,ar) || roleLabel(selected.role,ar)}</p></div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white/70 p-3 dark:bg-stone-900"><strong className="block text-xl">{selected.followers_count}</strong><span className="text-[10px] text-[var(--mousa-sand-500)]">{ar?'متابع':'Followers'}</span></div>
                <div className="rounded-2xl bg-white/70 p-3 dark:bg-stone-900"><strong className="block text-xl">{selected.following_count}</strong><span className="text-[10px] text-[var(--mousa-sand-500)]">{ar?'يتابع':'Following'}</span></div>
                <div className="rounded-2xl bg-white/70 p-3 dark:bg-stone-900"><strong className="block text-xl">{selected.points}</strong><span className="text-[10px] text-[var(--mousa-sand-500)]">{ar?'نقاط':'Points'}</span></div>
              </div>
              <div className="flex items-center justify-center gap-3 text-sm font-bold text-[var(--mousa-sand-600)]"><span className="flex items-center gap-1"><Flame size={16} className="text-orange-500"/>{selected.current_streak} {ar?'يوم متتالي':'day streak'}</span><span className="flex items-center gap-1"><Trophy size={16} className="text-amber-500"/>{ar?'الأطول':'Best'}: {selected.longest_streak}</span></div>{selected.equipped_cosmetics?.badge && <span className="mx-auto inline-flex items-center gap-1 rounded-full border border-indigo-300/70 bg-indigo-50 px-3 py-1 text-[10px] font-black text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">✦ {({ 'badge-prayer-flame': ar?'شعلة الصلاة':'Prayer Flame', 'badge-hymn-wreath': ar?'إكليل الألحان':'Hymn Wreath', 'badge-cross-shield': ar?'درع الصليب':'Cross Shield', 'badge-gospel-light': ar?'نور الإنجيل':'Gospel Light', 'badge-servant-heart': ar?'قلب الخادم':'Servant Heart', 'badge-cross-victory': ar?'صليب النصرة':'Cross of Victory' } as Record<string,string>)[selected.equipped_cosmetics?.badge || ''] || (ar?'شارة مخصصة':'Equipped badge')}</span>}{Boolean(selected.earned_badges?.length) && <div className="flex flex-wrap justify-center gap-2">{selected.earned_badges.slice(0,8).map(badge=><span key={badge.id} className="rounded-full border border-amber-300/70 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">✦ {ar?badge.title_ar:badge.title_en}</span>)}</div>}
              <button type="button" onClick={()=>void toggleFollow(selected)} disabled={busyId===selected.user_id} className="mx-auto flex min-h-11 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[var(--mousa-teal-deep)] px-4 py-3 text-sm font-black text-white transition hover:brightness-110 disabled:opacity-60">{busyId===selected.user_id?<Loader2 size={16} className="animate-spin"/>:selected.is_following?<UserCheck size={16}/>:<UserPlus size={16}/>}{selected.is_following?(ar?'تتابعه':'Following'):(ar?'متابعة':'Follow')}</button>
              <p className="text-[10px] leading-relaxed text-[var(--mousa-sand-500)]">{ar?'المعروض هنا معلومات عامة فقط. بيانات الحساب والعائلة ووسائل الاتصال تظل خاصة.':'Only public community details appear here. Account, family and contact information remain private.'}</p>
            </div> : loading ? <div className="grid min-h-48 place-items-center"><Loader2 className="animate-spin text-[var(--mousa-teal-deep)]" size={28}/></div> : people.length===0 ? <div className="grid min-h-48 place-items-center text-sm text-[var(--mousa-sand-500)]">{ar?'لا يوجد أعضاء مطابقون للبحث.':'No members match your search.'}</div> : <div className="grid gap-3 sm:grid-cols-2">
              {people.map(person=><article key={person.user_id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--mousa-border-sand)] bg-white/70 p-3 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md dark:bg-stone-900">
                <button type="button" onClick={()=>setSelected(person)} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                  <img src={person.avatar_url || '/icons/icon-192.png'} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-[var(--mousa-border-sand)] bg-[var(--mousa-sand-100)] object-cover"/>
                  <span className="min-w-0"><strong className="block truncate text-sm text-[var(--mousa-teal-deep)] dark:text-white">{person.display_name}</strong><span className="mt-0.5 block text-[11px] text-[var(--mousa-sand-500)]">{roleLabel(person.role,ar)}</span><span className="mt-1 block text-[10px] text-[var(--mousa-sand-500)]">{person.followers_count} {ar?'متابع':'followers'}</span></span>
                </button>
                <button type="button" title={person.is_following?(ar?'إلغاء المتابعة':'Unfollow'):(ar?'متابعة':'Follow')} onClick={()=>void toggleFollow(person)} disabled={busyId===person.user_id} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--mousa-teal-deep)] text-white transition hover:scale-105 disabled:opacity-50">{busyId===person.user_id?<Loader2 size={15} className="animate-spin"/>:person.is_following?<UserCheck size={16}/>:<UserPlus size={16}/>}</button>
              </article>)}
            </div>}
          </div>
        </motion.section>
      </motion.div>}
    </AnimatePresence>
  </>;
}
