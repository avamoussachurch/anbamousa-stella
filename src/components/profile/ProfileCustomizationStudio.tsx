import React,{useEffect,useState} from 'react';
import { Check, Crown, Loader2, Palette, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const frames = [
 {id:'coptic-gold',label:'Coptic Gold',ar:'ذهبي قبطي',className:'ring-4 ring-amber-400 ring-offset-2 ring-offset-amber-50'},
 {id:'olive-wreath',label:'Olive Wreath',ar:'إكليل الزيتون',className:'ring-4 ring-emerald-600 ring-offset-2 ring-offset-emerald-50'},
 {id:'royal-blue',label:'Royal Blue',ar:'أزرق ملكي',className:'ring-4 ring-blue-700 ring-offset-2 ring-offset-blue-50'},
 {id:'desert-sand',label:'Desert Sand',ar:'رمال البرية',className:'ring-4 ring-orange-300 ring-offset-2 ring-offset-orange-50'},
 {id:'burgundy',label:'Burgundy',ar:'عنابي',className:'ring-4 ring-rose-900 ring-offset-2 ring-offset-rose-50'}
];
const banners = [
 {id:'desert-dawn',label:'Desert Dawn',ar:'فجر البرية',style:'linear-gradient(120deg,#6f4935,#d6a15b,#f4dca6)'},
 {id:'coptic-pattern',label:'Coptic Pattern',ar:'نقوش قبطية',style:'repeating-linear-gradient(45deg,#174d4c 0 12px,#1e6260 12px 24px,#c59b50 24px 27px)'},
 {id:'olive-garden',label:'Olive Garden',ar:'بستان الزيتون',style:'linear-gradient(120deg,#244c39,#6e8751,#c2a96a)'},
 {id:'golden-church',label:'Golden Church',ar:'الكنيسة الذهبية',style:'linear-gradient(120deg,#5b3a27,#a77b39,#e9ce8a)'},
 {id:'midnight-teal',label:'Midnight Teal',ar:'فيروزي ليلي',style:'linear-gradient(120deg,#102f3b,#145b62,#327e79)'}
];

export function ProfileCustomizationStudio({userId,lang}:{userId:string;lang:string}) {
 const ar=lang==='ar';
 const [frame,setFrame]=useState('coptic-gold');
 const [banner,setBanner]=useState('desert-dawn');
 const [title,setTitle]=useState('');
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('');
 useEffect(()=>{let cancelled=false;const load=async()=>{if(!supabase){setLoading(false);return;}const {data}=await supabase.from('profile_customizations').select('frame_key,banner_key,display_title').eq('user_id',userId).maybeSingle();if(!cancelled&&data){setFrame(data.frame_key);setBanner(data.banner_key);setTitle(data.display_title||'');}if(!cancelled)setLoading(false);};void load();return()=>{cancelled=true;};},[userId]);
 const save=async()=>{if(!supabase)return;setSaving(true);setMessage('');const {error}=await supabase.from('profile_customizations').upsert({user_id:userId,frame_key:frame,banner_key:banner,display_title:title.trim()||null},{onConflict:'user_id'});setMessage(error?(ar?'تعذر حفظ المظهر.':'Could not save appearance.'):(ar?'تم حفظ مظهر ملفك!':'Profile style saved!'));setSaving(false);};
 const selectedBanner=banners.find(item=>item.id===banner)||banners[0];
 if(loading)return <div className="rounded-2xl border border-[var(--mousa-border-sand)] p-4 text-xs text-[var(--text-secondary)]"><Loader2 className="mr-2 inline animate-spin" size={14}/>{ar?'جارٍ تحميل تخصيصات الملف…':'Loading profile customization…'}</div>;
 return <section className="space-y-4 rounded-[1.5rem] border border-[var(--mousa-border-sand)] bg-[var(--surface-primary)] p-4 shadow-sm">
  <div className="flex items-center gap-2"><Palette size={18} className="text-[var(--mousa-gold)]"/><div><h3 className="text-sm font-black text-[var(--text-primary)]">{ar?'استوديو مظهر الملف':'Profile style studio'}</h3><p className="text-[10px] text-[var(--text-secondary)]">{ar?'إطارات وخلفيات وألقاب بأسلوب الألعاب':'Game-inspired frames, banners and titles'}</p></div></div>
  <div className="overflow-hidden rounded-2xl border border-[var(--mousa-border-sand)]">
   <div className="h-20" style={{background:selectedBanner.style}}/>
   <div className="flex items-center gap-3 bg-[var(--surface-secondary)] p-3"><div className={'grid h-14 w-14 place-items-center rounded-2xl bg-[var(--surface-primary)] '+(frames.find(item=>item.id===frame)?.className||'')}><Crown size={23} className="text-[var(--mousa-gold)]"/></div><div><p className="font-black text-[var(--text-primary)]">{ar?'معاينة ملفك الشخصي':'Your profile preview'}</p><p className="text-xs text-[var(--text-secondary)]">{title.trim()|| (ar?'عضو في عيلة أنبا موسى':'Anba Mousa member')}</p></div></div>
  </div>
  <div><p className="mb-2 text-xs font-black text-[var(--text-primary)]">{ar?'اختر الإطار':'Choose a frame'}</p><div className="grid grid-cols-5 gap-2">{frames.map(item=><button key={item.id} type="button" onClick={()=>setFrame(item.id)} aria-pressed={frame===item.id} className={'aspect-square rounded-xl border-2 bg-[var(--surface-secondary)] transition hover:-translate-y-0.5 '+(frame===item.id?'border-[var(--mousa-gold)] shadow-md':'border-transparent')}><span className={'mx-auto block h-8 w-8 rounded-xl bg-white '+item.className}/><span className="mt-1 block text-[9px] font-bold text-[var(--text-secondary)]">{ar?item.ar:item.label}</span></button>)}</div></div>
  <div><p className="mb-2 text-xs font-black text-[var(--text-primary)]">{ar?'اختر خلفية الملف':'Choose a profile banner'}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{banners.map(item=><button key={item.id} type="button" onClick={()=>setBanner(item.id)} aria-pressed={banner===item.id} className={'overflow-hidden rounded-xl border-2 text-start transition hover:-translate-y-0.5 '+(banner===item.id?'border-[var(--mousa-gold)] shadow-md':'border-[var(--border-default)]')}><span className="block h-10" style={{background:item.style}}/><span className="block px-2 py-1.5 text-[10px] font-bold text-[var(--text-primary)]">{ar?item.ar:item.label}</span></button>)}</div></div>
  <label className="block"><span className="mb-1.5 block text-xs font-black text-[var(--text-primary)]">{ar?'لقب الملف (اختياري)':'Profile title (optional)'}</span><input value={title} maxLength={40} onChange={event=>setTitle(event.target.value)} placeholder={ar?'مثلاً: محب الألحان':'e.g. Hymn Enthusiast'} className="min-h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3 text-sm outline-none focus:border-[var(--action-primary)]"/></label>
  <div className="flex items-center justify-between gap-3"><p role="status" className="text-xs font-bold text-emerald-700">{message}</p><button type="button" disabled={saving} onClick={()=>void save()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--action-primary)] px-4 py-2 text-xs font-black text-[var(--action-primary-text)] disabled:opacity-50">{saving?<Loader2 size={14} className="animate-spin"/>:<Sparkles size={14}/>}{ar?'حفظ المظهر':'Save style'}</button></div>
 </section>;
}
