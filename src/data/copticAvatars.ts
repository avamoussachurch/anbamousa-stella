/**
 * Symbolic church emblems for Anba Mousa profiles.
 * These are not invented portraits of saints. Real icon portraits should only
 * be added from verified, appropriately licensed Coptic Orthodox sources.
 */
export interface CopticAvatarPreset {
  id: string; nameEn: string; nameAr: string;
  category: 'saints' | 'students' | 'deacons'; imageSrc: string;
}
type Emblem = 'cross'|'church'|'bible'|'dove'|'candle'|'chalice'|'incense'|'grapes'|'fish'|'bell'|'lily';
const paths: Record<Emblem,string> = {
 cross:'<path d="M54 18h12v22h22v12H66v42H54V52H32V40h22z"/>',
 church:'<path d="M20 48 60 22l40 26v47H20z"/><path d="M48 95V67a12 12 0 0 1 24 0v28M12 48 60 12l48 36M55 22V8h10v14" fill="none" stroke-width="5"/>',
 bible:'<path d="M20 24q20-8 40 5 20-13 40-5v66q-20-8-40 5-20-13-40-5z"/><path d="M60 29v65M36 45h14m-14 12h14m20-12h14m-14 12h14" fill="none" stroke-width="4"/>',
 dove:'<path d="M18 62q17-4 27-24 5 16 18 19-4-16 5-31 8 20 24 24-8 10-20 13-10 17-31 14l-9 12 2-18q-10-2-16-9z"/>',
 candle:'<path d="M43 44h34v52H43z"/><path d="M60 40c-18-15 4-25 0-39 20 18 15 28 0 39z"/><path d="M34 96h52" fill="none" stroke-width="5"/>',
 chalice:'<path d="M34 24h52v17q0 25-26 31-26-6-26-31z"/><path d="M60 72v20m-18 4h36" fill="none" stroke-width="6"/>',
 incense:'<path d="M60 28q-20-15 0-27 20 12 0 27zM48 37h24l-5 55H53z"/><path d="M60 18q-13-12 0-22" fill="none" stroke-width="4"/>',
 grapes:'<path d="M60 20q-14-18-27-5 12 17 27 5zm0 0q14-18 27-5-12 17-27 5z"/><circle cx="43" cy="48" r="11"/><circle cx="65" cy="46" r="11"/><circle cx="84" cy="51" r="10"/><circle cx="53" cy="68" r="11"/><circle cx="75" cy="70" r="11"/><circle cx="64" cy="88" r="10"/>',
 fish:'<path d="M12 60q22-30 54-18 12 5 22 18-10 13-22 18-32 12-54-18z"/><path d="m87 60 20-17v34z"/>',
 bell:'<path d="M30 78h60q-12-12-12-31a18 18 0 0 0-36 0q0 19-12 31z"/><path d="M52 88q8 15 16 0M60 24V12" fill="none" stroke-width="5"/>',
 lily:'<path d="M60 94Q20 75 28 39q19 5 32 29 13-24 32-29 8 36-32 55zM60 68q-26-12-17-36 15 7 17 36 2-29 17-36 9 24-17 36z"/>'
};
function emblem(kind:Emblem,bg:string,fg:string,accent:string):string {
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect x="3" y="3" width="114" height="114" rx="25" fill="'+bg+'"/><rect x="8" y="8" width="104" height="104" rx="20" fill="none" stroke="'+accent+'" stroke-width="2"/><circle cx="60" cy="60" r="43" fill="none" stroke="'+accent+'" opacity=".45"/><g fill="'+fg+'" stroke="'+fg+'" stroke-linecap="round" stroke-linejoin="round" stroke-width="3">'+paths[kind]+'</g></svg>';
 return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg);
}
const entries:Array<[string,string,string,Emblem,string,string,string,'saints'|'students'|'deacons']> = [
 ['saint-mark-icon','St. Mark the Evangelist','مارمرقس الرسول','church','#6d1f2b','#f8e8c2','#d9ad63','saints'],
 ['coptic-cross','Coptic Cross','الصليب القبطي','cross','#183b67','#f8e8c2','#d9ad63','saints'],
 ['saint-demiana-icon','St. Demiana','القديسة دميانة','lily','#71334f','#fff0d8','#e5b5c2','saints'],
 ['archangel-michael-icon','Archangel Michael','رئيس الملائكة ميخائيل','cross','#175c58','#fff0c8','#e5c16f','saints'],
 ['dormition-icon','Dormition of the Theotokos','رقاد السيدة العذراء','lily','#233e70','#fff0d8','#d5b56c','saints'],
 ['saint-abanoub-icon','St. Abanoub the Martyr','القديس أبانوب الشهيد','cross','#56336f','#fff0d8','#d6b3e5','saints'],
 ['saint-anthony-icon','St. Anthony the Great','القديس الأنبا أنطونيوس','fish','#78452e','#fff0d8','#e7bd85','saints'],
 ['deacon-chalice','Deacon service emblem','رمز خدمة الشمامسة','chalice','#164e70','#fff0d8','#8ec8d8','deacons'],
 ['sunday-school-bible','Sunday School emblem','رمز مدارس الأحد','bible','#17634f','#fff0d8','#9ed8b5','students'],
 ['sunday-school-flower','Sunday School flower emblem','زهرة مدارس الأحد','lily','#8a5420','#fff0d8','#f0ce8a','students'],
 ['saint-macarius-icon','St. Macarius the Great','القديس الأنبا مقار','grapes','#456027','#fff0d8','#b9d18a','saints'],
 ['coptic-cross-dove','Coptic Cross and Dove','الصليب القبطي والحمامة','dove','#49316c','#fff0d8','#c8afe8','saints']
];
const realIconSources: Record<string,string> = {
 'saint-mark-icon':'https://upload.wikimedia.org/wikipedia/commons/6/67/StMarkcoptic.jpg',
 'saint-demiana-icon':'https://commons.wikimedia.org/wiki/Special:FilePath/St.Demiana_and_the_40_virgins_in_the_Hanging_church.jpg?width=480',
 'archangel-michael-icon':'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Coptic_Icon_of_the_Archangel_Michael.jpg/500px-Coptic_Icon_of_the_Archangel_Michael.jpg',
 'dormition-icon':'https://upload.wikimedia.org/wikipedia/commons/c/c1/Coptic_icon_of_the_Dormition_of_Virgin_Mary.jpg',
 'saint-abanoub-icon':'https://commons.wikimedia.org/wiki/Special:FilePath/Icon_of_St.Abanoub_the_Matyr_in_Samanoud.jpg?width=480',
 'saint-anthony-icon':'https://upload.wikimedia.org/wikipedia/commons/8/86/StAnthony.jpg',
 'saint-macarius-icon':'https://upload.wikimedia.org/wikipedia/commons/c/cd/Saint_Macarius.jpg'
};
export const COPTIC_AVATARS:CopticAvatarPreset[] = entries.map(([id,nameEn,nameAr,kind,bg,fg,accent,category])=>({id,nameEn,nameAr,category,imageSrc:realIconSources[id] || emblem(kind,bg,fg,accent)}));
export const DEFAULT_STUDENT_AVATAR=COPTIC_AVATARS[7].imageSrc;
export const DEFAULT_PARENT_AVATAR=COPTIC_AVATARS[0].imageSrc;
export const DEFAULT_TEACHER_AVATAR=COPTIC_AVATARS[3].imageSrc;
