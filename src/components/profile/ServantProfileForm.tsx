import React from 'react';
import { GraduationCap, LoaderCircle, Save } from 'lucide-react';
import type { Language, User } from '../../types';
import { ProfileFeedback } from './RoleProfileShared';

export function ServantProfileForm({
  user,
  name,
  setName,
  saving,
  onSave,
  error,
  message,
  lang,
}: {
  user: User;
  name: string;
  setName: (name: string) => void;
  saving: boolean;
  onSave: (event: React.FormEvent) => void;
  error: string | null;
  message: string | null;
  lang: Language;
}) {
  const isArabic = lang === 'ar';
  return (
    <section className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--state-selected)] text-[var(--action-primary)]"><GraduationCap size={19} /></span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.15em] text-[var(--action-primary)]">{isArabic ? 'ملف الخادم' : 'Servant profile'}</p>
          <h2 className="mt-1 text-lg font-black text-[var(--text-primary)]">{isArabic ? 'بيانات الخدمة' : 'Service identity'}</h2>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
            {isArabic ? 'يظهر الاسم في مساحة الخادم. الفصول والتكليفات تُعرض من السجل المعتمد ولا يمكن تعديلها هنا.' : 'Your name appears in Servant Studio. Assigned classes come from the authorized roster and cannot be changed here.'}
          </p>
        </div>
      </div>
      <form onSubmit={onSave} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-[var(--text-secondary)]">{isArabic ? 'الاسم الكامل *' : 'Full name *'}</span>
          <input required minLength={2} maxLength={100} value={name} onChange={event => setName(event.target.value)} autoComplete="name" className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] px-4 py-3 text-[var(--text-primary)] outline-none focus:border-[var(--action-primary)]" />
          <span className="mt-1 block text-xs text-[var(--text-tertiary)]">{isArabic ? 'الاسم الظاهر في مساحة الخدمة، من حرفين إلى ١٠٠ حرف.' : 'Shown in your service workspace; 2–100 characters.'}</span>
        </label>
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)]/60 p-3">
          <p className="text-xs font-bold text-[var(--text-secondary)]">{isArabic ? 'بريد تسجيل الدخول' : 'Sign-in email'}</p>
          <p className="mt-2 break-all text-sm font-semibold text-[var(--text-primary)]">{user.email || (isArabic ? 'غير متاح' : 'Not available')}</p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">{isArabic ? 'يُدار البريد من مزود تسجيل الدخول ولا يُعدّل من الملف الشخصي.' : 'Managed by the sign-in provider; it is not editable from this profile.'}</p>
        </div>
        <button type="submit" disabled={saving || name.trim() === (user.fullName || '')} className="inline-flex items-center gap-2 rounded-xl bg-[var(--action-primary)] px-4 py-2.5 text-sm font-black text-[var(--action-primary-text)] disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? (isArabic ? 'جارٍ الحفظ...' : 'Saving…') : (isArabic ? 'حفظ الاسم' : 'Save name')}
        </button>
      </form>
      <ProfileFeedback error={error} message={message} />
    </section>
  );
}
