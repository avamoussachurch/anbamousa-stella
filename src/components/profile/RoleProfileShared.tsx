import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, Check, CheckCircle2, LoaderCircle, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { Language, Role, User } from '../../types';
import { LanguageSettings } from '../shared/LanguageSettings';
import { getLanguageDirection } from '../../lib/uiPreferences';
import { COPTIC_AVATARS, DEFAULT_PARENT_AVATAR, DEFAULT_TEACHER_AVATAR } from '../../data/copticAvatars';
import { uploadAvatarToSupabase } from '../../lib/supabaseDatabase';

export type AccountPreference =
  | 'pushNotificationsEnabled'
  | 'notifyLessonCompletion'
  | 'notifyEventReminders'
  | 'requireRewardApproval';

export interface RoleProfileProps {
  lang: Language;
  setLang: (lang: Language) => void;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
}

export function useRoleProfileAccount(role: Exclude<Role, 'student'>, lang: Language) {
  const { userData, updateUserProfile } = useAuth();
  const [name, setName] = useState(userData?.fullName || '');
  const [savingName, setSavingName] = useState(false);
  const [savingPreference, setSavingPreference] = useState<AccountPreference | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(userData?.fullName || '');
  }, [userData?.id, userData?.fullName]);

  const saveName = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError(lang === 'ar' ? 'اسمك لازم يكون حرفين على الأقل.' : 'Name must contain at least two characters.');
      setMessage(null);
      return;
    }

    setSavingName(true);
    setError(null);
    setMessage(null);
    const result = await updateUserProfile({ fullName: name.trim() });
    if (result.success) setMessage(lang === 'ar' ? 'اسمك اتحفظ.' : 'Name saved.');
    else setError(result.error || (lang === 'ar' ? 'مش قادرين نحفظ اسمك.' : 'Could not save your name.'));
    setSavingName(false);
  };

  const togglePreference = async (field: AccountPreference) => {
    if (!userData) return;
    setSavingPreference(field);
    setError(null);
    setMessage(null);
    const result = await updateUserProfile({ [field]: !userData[field] });
    if (result.success) setMessage(lang === 'ar' ? 'التفضيل اتحفظ.' : 'Preference saved.');
    else setError(result.error || (lang === 'ar' ? 'مش قادرين نحفظ التفضيل.' : 'Could not save this preference.'));
    setSavingPreference(null);
  };

  return {
    userData,
    roleAssigned: Boolean(userData?.roles.includes(role)),
    name,
    setName,
    savingName,
    savingPreference,
    error,
    message,
    saveName,
    togglePreference,
  };
}

export function ProfilePageFrame({
  lang,
  title,
  subtitle,
  roleLabel,
  icon,
  onLogout,
  children,
}: {
  lang: Language;
  title: string;
  subtitle: string;
  roleLabel: string;
  icon: React.ReactNode;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const isArabic = lang === 'ar';
  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 pb-28 pt-5 sm:px-6 lg:px-8" dir={getLanguageDirection(lang)}>
      <header className="relative isolate overflow-hidden rounded-[2rem] bg-[linear-gradient(120deg,#102d3a,#1b5558_58%,#286b68)] p-6 text-white shadow-[var(--shadow-card)] sm:p-8">
        <div aria-hidden="true" className="absolute -end-24 -top-32 -z-10 h-80 w-80 rounded-full bg-[#f0c77c]/10 blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 text-[#f2d394]">{icon}</span>
            <div>
              <p className="text-xs font-black uppercase tracking-[.15em] text-[#f2d394]">{roleLabel}</p>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">{title}</h1>
              <p className="mt-1 text-sm text-white/75">{subtitle}</p>
            </div>
          </div>
          <button type="button" onClick={onLogout} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20">
            <LogOut size={16} />{isArabic ? 'سجّل خروج' : 'Sign out'}
          </button>
        </div>
      </header>
      {children}
    </main>
  );
}

export function RoleAvatarStudio({ lang, user, role }: { lang: Language; user: User; role: Exclude<Role, 'student'> }) {
  const { updateUserProfile } = useAuth();
  const isArabic = lang === 'ar';
  const defaultAvatar = role === 'teacher' ? DEFAULT_TEACHER_AVATAR : role === 'parent' ? DEFAULT_PARENT_AVATAR : COPTIC_AVATARS[0].svgDataUri;
  const [avatar, setAvatar] = useState(user.avatarUrl || defaultAvatar);
  const [category, setCategory] = useState<'all' | 'saints' | 'students' | 'deacons'>('all');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAvatar(user.avatarUrl || defaultAvatar);
  }, [user.id, user.avatarUrl, defaultAvatar]);

  const saveAvatar = async (nextAvatar = avatar) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    const result = await updateUserProfile({ avatarUrl: nextAvatar });
    if (result.success) setMessage(isArabic ? 'صورتك اتحفظت بنجاح.' : 'Your profile picture has been saved.');
    else setError(result.error || (isArabic ? 'تعذر حفظ الصورة.' : 'Could not save your profile picture.'));
    setSaving(false);
  };

  const uploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) {
      setError(isArabic ? 'اختار صورة أقل من ٨ ميجابايت.' : 'Choose an image smaller than 8 MB.');
      return;
    }
    setUploading(true);
    setError(null);
    const result = await uploadAvatarToSupabase(user.id, file);
    if (!result.success || !result.url) {
      setError(isArabic ? 'تعذر رفع الصورة. جرّب صورة تانية.' : 'Could not upload that photo. Please try another image.');
      setUploading(false);
      return;
    }
    setAvatar(result.url);
    await saveAvatar(result.url);
    setUploading(false);
  };

  const categories = [
    { id: 'all', en: 'All', ar: 'الكل' },
    { id: 'saints', en: 'Church symbols', ar: 'رموز كنسية' },
    { id: 'students', en: 'Students', ar: 'طلاب' },
    { id: 'deacons', en: 'Deacons', ar: 'شمامسة' }
  ] as const;

  return (
    <>
    <section className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.15em] text-[var(--action-primary)]">{isArabic ? 'التخصيص' : 'Personalization'}</p>
          <h2 className="mt-1 text-lg font-black text-[var(--text-primary)]">{isArabic ? 'استوديو الصورة الشخصية' : 'Avatar studio'}</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{isArabic ? 'اختار رمزاً كنسياً أو ارفع صورتك.' : 'Choose a church emblem or upload your own photo.'}</p>
        </div>
        <img src={avatar} alt="" className="h-16 w-16 shrink-0 rounded-2xl border-2 border-[var(--action-primary)] bg-[var(--surface-secondary)] object-cover shadow-sm" />
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void uploadPhoto(event)} className="hidden" />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border-default)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--state-hover)] disabled:opacity-50">
        {uploading ? <LoaderCircle size={15} className="animate-spin" /> : <Camera size={15} />}
        {isArabic ? 'ارفع صورة من جهازك' : 'Upload your photo'}
      </button>
      <div className="mb-3 flex flex-wrap gap-2">
        {categories.map(item => <button key={item.id} type="button" onClick={() => setCategory(item.id)} aria-pressed={category === item.id} className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${category === item.id ? 'border-[var(--action-primary)] bg-[var(--action-primary)] text-white' : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--state-hover)]'}`}>{isArabic ? item.ar : item.en}</button>)}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {COPTIC_AVATARS.filter(item => category === 'all' || item.category === category).map(item => (
          <button key={item.id} type="button" onClick={() => setAvatar(item.svgDataUri)} aria-pressed={avatar === item.svgDataUri} title={isArabic ? item.nameAr : item.nameEn} className={`relative rounded-xl border-2 p-1.5 transition-transform hover:scale-[1.03] ${avatar === item.svgDataUri ? 'border-[var(--action-primary)] bg-[var(--state-selected)]' : 'border-transparent bg-[var(--surface-secondary)]'}`}>
            <img src={item.svgDataUri} alt={isArabic ? item.nameAr : item.nameEn} className="mx-auto aspect-square w-full rounded-lg object-cover" />
            {avatar === item.svgDataUri && <span className="absolute -end-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[var(--action-primary)] text-white"><Check size={12} /></span>}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => void saveAvatar()} disabled={saving || uploading || avatar === (user.avatarUrl || defaultAvatar)} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--action-primary)] px-4 py-2.5 text-sm font-black text-[var(--action-primary-text)] disabled:opacity-50">
        {saving ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
        {saving ? (isArabic ? 'جارٍ الحفظ…' : 'Saving…') : (isArabic ? 'حفظ الصورة الشخصية' : 'Save profile picture')}
      </button>
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-[var(--feedback-error)]">{error}</p>}
      {message && <p role="status" className="mt-3 text-xs font-semibold text-[var(--brand-teal)]">{message}</p>}
    </section>
    <ProfileCustomizationStudio userId={user.id} lang={lang} />
    </>
  );
}

export function ProfileSettingsCard({
  lang,
  setLang,
  user,
  fields,
  savingPreference,
  onTogglePreference,
  title,
}: {
  lang: Language;
  setLang: (lang: Language) => void;
  user: User;
  fields: Array<{ field: AccountPreference; label: string; description: string }>;
  savingPreference: AccountPreference | null;
  onTogglePreference: (field: AccountPreference) => void;
  title: string;
}) {
  const isArabic = lang === 'ar';
  return (
    <section className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="mb-4">
        <p className="text-[10px] font-black uppercase tracking-[.15em] text-[var(--action-primary)]">{isArabic ? 'تفضيلات حسابك' : 'Account preferences'}</p>
        <h2 className="mt-1 text-lg font-black text-[var(--text-primary)]">{title}</h2>
      </div>
      <LanguageSettings lang={lang} setLang={setLang} />
      {fields.length > 0 && (
        <div className="divide-y divide-[var(--border-default)]">
          {fields.map(({ field, label, description }) => (
            <label key={field} className="flex items-center justify-between gap-4 py-3">
              <span>
                <span className="block text-sm font-semibold text-[var(--text-primary)]">{label}</span>
                <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">{description}</span>
              </span>
              {typeof user[field] === 'boolean'
                ? <input type="checkbox" checked={Boolean(user[field])} disabled={savingPreference === field} onChange={() => onTogglePreference(field)} aria-label={label} className="h-5 w-5 shrink-0 accent-[var(--action-primary)]" />
                : <span className="text-xs text-[var(--text-tertiary)]">{isArabic ? 'مش متاح' : 'Not available'}</span>}
            </label>
          ))}
        </div>
      )}
    </section>
  );
}

export function ProfileUnavailable({ lang }: { lang: Language }) {
  const isArabic = lang === 'ar';
  return (
    <main className="mx-auto max-w-3xl p-6" dir={getLanguageDirection(lang)}>
      <section role="alert" className="rounded-2xl border border-[var(--feedback-error)]/30 bg-[var(--surface-primary)] p-6 text-center">
        <AlertCircle className="mx-auto mb-3 text-[var(--feedback-error)]" size={28} />
        <h1 className="text-xl font-black text-[var(--text-primary)]">{isArabic ? 'الملف الشخصي مش متاح' : 'Profile unavailable'}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{isArabic ? 'حسابك مفيهوش دور فعّال يسمح بعرض الملف ده.' : 'This account does not have the assigned role required to view this profile.'}</p>
      </section>
    </main>
  );
}

export function ProfileFeedback({ error, message }: { error: string | null; message: string | null }) {
  return (
    <>
      {error && <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-[var(--feedback-error)]"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</p>}
      {message && <p role="status" className="mt-4 flex items-center gap-2 text-sm font-bold text-[var(--brand-teal)]"><CheckCircle2 size={17} />{message}</p>}
    </>
  );
}
