import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { Language, Role, User } from '../../types';
import { LanguageSettings } from '../shared/LanguageSettings';

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
      setError(lang === 'ar' ? 'الاسم يجب أن يحتوي على حرفين على الأقل.' : 'Name must contain at least two characters.');
      setMessage(null);
      return;
    }

    setSavingName(true);
    setError(null);
    setMessage(null);
    const result = await updateUserProfile({ fullName: name.trim() });
    if (result.success) setMessage(lang === 'ar' ? 'تم حفظ الاسم.' : 'Name saved.');
    else setError(result.error || (lang === 'ar' ? 'تعذر حفظ الاسم.' : 'Could not save your name.'));
    setSavingName(false);
  };

  const togglePreference = async (field: AccountPreference) => {
    if (!userData) return;
    setSavingPreference(field);
    setError(null);
    setMessage(null);
    const result = await updateUserProfile({ [field]: !userData[field] });
    if (result.success) setMessage(lang === 'ar' ? 'تم حفظ التفضيل.' : 'Preference saved.');
    else setError(result.error || (lang === 'ar' ? 'تعذر حفظ التفضيل.' : 'Could not save this preference.'));
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
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 pb-28 pt-5 sm:px-6 lg:px-8" dir={isArabic ? 'rtl' : 'ltr'}>
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
            <LogOut size={16} />{isArabic ? 'تسجيل الخروج' : 'Sign out'}
          </button>
        </div>
      </header>
      {children}
    </main>
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
        <p className="text-[10px] font-black uppercase tracking-[.15em] text-[var(--action-primary)]">{isArabic ? 'تفضيلات الحساب' : 'Account preferences'}</p>
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
                : <span className="text-xs text-[var(--text-tertiary)]">{isArabic ? 'غير متاح' : 'Not available'}</span>}
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
    <main className="mx-auto max-w-3xl p-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <section role="alert" className="rounded-2xl border border-[var(--feedback-error)]/30 bg-[var(--surface-primary)] p-6 text-center">
        <AlertCircle className="mx-auto mb-3 text-[var(--feedback-error)]" size={28} />
        <h1 className="text-xl font-black text-[var(--text-primary)]">{isArabic ? 'الملف الشخصي غير متاح' : 'Profile unavailable'}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{isArabic ? 'لا يوجد دور فعّال يتيح عرض هذا الملف.' : 'This account does not have the assigned role required to view this profile.'}</p>
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
