import React, { useState } from 'react';
import { LoaderCircle, LockKeyhole, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { Language, Role } from '../../types';
import {
  ProfileFeedback,
  ProfilePageFrame,
  ProfileSettingsCard,
  ProfileUnavailable,
  useRoleProfileAccount,
  type RoleProfileProps,
} from './RoleProfileShared';

export function AdminAccountProfile({ lang, setLang, onNavigate, onLogout }: RoleProfileProps) {
  const account = useRoleProfileAccount('admin', lang);
  const { refreshAssignedRoles } = useAuth();
  const isArabic = lang === 'ar';
  const [refreshingRoles, setRefreshingRoles] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);

  if (!account.userData || !account.roleAssigned) return <ProfileUnavailable lang={lang} />;

  const roleLabels: Record<Role, string> = {
    student: isArabic ? 'طالب' : 'Student',
    parent: isArabic ? 'ولي أمر' : 'Parent',
    teacher: isArabic ? 'خادم' : 'Servant',
    admin: isArabic ? 'مسؤول النظام' : 'Administrator',
  };

  const recheckRoles = async () => {
    setRefreshingRoles(true);
    setSecurityError(null);
    setSecurityMessage(null);
    const result = await refreshAssignedRoles();
    if (result.success) setSecurityMessage(isArabic ? 'تم التحقق من الأدوار المعيّنة من الخادم.' : 'Assigned roles were refreshed from the server.');
    else setSecurityError(result.error || (isArabic ? 'تعذر التحقق من الأدوار.' : 'Could not refresh assigned roles.'));
    setRefreshingRoles(false);
  };

  return (
    <ProfilePageFrame
      lang={lang}
      roleLabel={isArabic ? 'مسؤول النظام' : 'Administrator'}
      title={isArabic ? 'ملف المسؤول' : 'Administrator profile'}
      subtitle={isArabic ? 'بيانات الحساب وإعدادات اللغة ومعلومات أمان الوصول الإداري.' : 'Your account details, language preferences, and administrative access security.'}
      icon={<ShieldCheck size={28} />}
      onLogout={onLogout}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_.85fr]">
        <section className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-card)] sm:p-6">
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-[.15em] text-[var(--action-primary)]">{isArabic ? 'حساب المسؤول' : 'Administrator account'}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{isArabic ? 'تعديل الاسم لا يغيّر أدوارك أو صلاحياتك.' : 'Editing your name does not change your assigned roles or permissions.'}</p>
          </div>
          <form onSubmit={event => void account.saveName(event)} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-[var(--text-secondary)]">{isArabic ? 'الاسم الكامل *' : 'Full name *'}</span>
              <input required minLength={2} maxLength={100} value={account.name} onChange={event => account.setName(event.target.value)} autoComplete="name" className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--action-primary)]" />
            </label>
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)]/60 p-3">
              <p className="text-xs font-bold text-[var(--text-secondary)]">{isArabic ? 'بريد تسجيل الدخول' : 'Sign-in email'}</p>
              <p className="mt-2 break-all text-sm font-semibold text-[var(--text-primary)]">{account.userData.email || (isArabic ? 'غير متاح' : 'Not available')}</p>
            </div>
            <button type="submit" disabled={account.savingName || account.name.trim() === (account.userData.fullName || '')} className="inline-flex items-center gap-2 rounded-xl bg-[var(--action-primary)] px-4 py-2.5 text-sm font-black text-[var(--action-primary-text)] disabled:cursor-not-allowed disabled:opacity-50">
              {account.savingName ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
              {account.savingName ? (isArabic ? 'جارٍ الحفظ...' : 'Saving…') : (isArabic ? 'حفظ الاسم' : 'Save name')}
            </button>
          </form>
          <ProfileFeedback error={account.error} message={account.message} />
        </section>
        <ProfileSettingsCard
          lang={lang}
          setLang={setLang}
          user={account.userData}
          fields={[]}
          savingPreference={account.savingPreference}
          onTogglePreference={field => void account.togglePreference(field)}
          title={isArabic ? 'اللغة' : 'Language'}
        />
      </div>

      <section className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--state-selected)] text-[var(--action-primary)]"><LockKeyhole size={19} /></span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.15em] text-[var(--action-primary)]">{isArabic ? 'الأمان' : 'Security'}</p>
            <h2 className="mt-1 text-lg font-black text-[var(--text-primary)]">{isArabic ? 'وصول المسؤول' : 'Administrator access'}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)]">
              {isArabic
                ? 'تُفحص صلاحية كل إجراء إداري على الخادم. اختيار مساحة العمل أو ظهور عناصر الواجهة لا يمنح صلاحية، ولا يمكن تعديل الأدوار من هذا الملف.'
                : 'The server verifies authorization for each administrative action. Workspace selection and visible controls do not grant permission, and roles cannot be edited from this profile.'}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-secondary)]/60 p-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-black text-[var(--brand-teal)]"><ShieldCheck size={17} />{isArabic ? 'الأدوار المعيّنة للحساب' : 'Roles assigned to this account'}</p>
            <p className="mt-2 text-sm text-[var(--text-primary)]">{account.userData.roles.map(role => roleLabels[role]).join(' · ')}</p>
          </div>
          <button type="button" onClick={() => void recheckRoles()} disabled={refreshingRoles} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--state-hover)] disabled:opacity-50">
            <RefreshCw size={14} className={refreshingRoles ? 'animate-spin' : ''} />{isArabic ? 'إعادة التحقق من الأدوار' : 'Refresh assigned roles'}
          </button>
        </div>
        <ProfileFeedback error={securityError} message={securityMessage} />
        <button type="button" onClick={() => onNavigate('security')} className="mt-4 text-sm font-bold text-[var(--action-primary)] hover:underline">
          {isArabic ? 'فتح سجل الأمان والتدقيق' : 'Open security and audit'}
        </button>
      </section>
    </ProfilePageFrame>
  );
}
