import React, { useCallback, useEffect, useState } from 'react';
import { Heart, RefreshCw, Users } from 'lucide-react';
import type { Language } from '../../types';
import { getAuthoritativeParentChildren, type ParentChildRecord } from '../../lib/parentChildService';
import { ParentProfileForm } from './ParentProfileForm';
import {
  ProfilePageFrame,
  ProfileSettingsCard,
  ProfileUnavailable,
  useRoleProfileAccount,
  type RoleProfileProps,
} from './RoleProfileShared';

const parentPreferences = (lang: Language) => [
  { field: 'pushNotificationsEnabled' as const, label: lang === 'ar' ? 'التنبيهات داخل التطبيق' : 'In-app notifications', description: lang === 'ar' ? 'تشغيل أو إيقاف تنبيهات Stella داخل التطبيق.' : 'Turn Stella in-app notifications on or off.' },
  { field: 'notifyLessonCompletion' as const, label: lang === 'ar' ? 'تنبيهات إتمام التعلّم' : 'Learning completion notifications', description: lang === 'ar' ? 'تلقي تنبيه عند تسجيل إتمام الطفل لدرس.' : 'Receive a notice when a child’s lesson completion is recorded.' },
  { field: 'notifyEventReminders' as const, label: lang === 'ar' ? 'تذكيرات الفعاليات' : 'Event reminders', description: lang === 'ar' ? 'تلقي تذكيرات الفعاليات الكنسية المتاحة.' : 'Receive reminders for available church events.' },
  { field: 'requireRewardApproval' as const, label: lang === 'ar' ? 'طلب موافقتي على المكافآت' : 'Require my approval for rewards', description: lang === 'ar' ? 'استخدام موافقتك في تدفق طلبات المكافآت المدعوم.' : 'Use your approval in the supported reward-request workflow.' },
];

export function ParentAccountProfile({ lang, setLang, onNavigate, onLogout }: RoleProfileProps) {
  const account = useRoleProfileAccount('parent', lang);
  const isArabic = lang === 'ar';
  const [children, setChildren] = useState<ParentChildRecord[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [childrenError, setChildrenError] = useState<string | null>(null);

  const loadChildren = useCallback(async () => {
    if (!account.roleAssigned) return;
    setChildrenLoading(true);
    setChildrenError(null);
    try {
      const result = await getAuthoritativeParentChildren();
      if (result.error || !result.data) {
        setChildren([]);
        setChildrenError(result.error?.message || (isArabic ? 'تعذر تحميل الأبناء المرتبطين.' : 'Could not load linked children.'));
      } else {
        setChildren(result.data);
      }
    } catch (error) {
      setChildren([]);
      setChildrenError(error instanceof Error ? error.message : (isArabic ? 'تعذر تحميل الأبناء المرتبطين.' : 'Could not load linked children.'));
    } finally {
      setChildrenLoading(false);
    }
  }, [account.roleAssigned, isArabic]);

  useEffect(() => {
    if (account.roleAssigned) void loadChildren();
  }, [account.roleAssigned, loadChildren]);

  if (!account.userData || !account.roleAssigned) return <ProfileUnavailable lang={lang} />;

  return (
    <ProfilePageFrame
      lang={lang}
      roleLabel={isArabic ? 'ولي أمر' : 'Parent'}
      title={isArabic ? 'ملف ولي الأمر' : 'Parent profile'}
      subtitle={isArabic ? 'إدارة بيانات حسابك وروابط الأسرة وتفضيلات التواصل.' : 'Manage your account, family connections, and communication preferences.'}
      icon={<Heart size={28} />}
      onLogout={onLogout}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_.85fr]">
        <ParentProfileForm
          user={account.userData}
          name={account.name}
          setName={account.setName}
          saving={account.savingName}
          onSave={event => void account.saveName(event)}
          lang={lang}
          error={account.error}
          message={account.message}
        />
        <ProfileSettingsCard
          lang={lang}
          setLang={setLang}
          user={account.userData}
          fields={parentPreferences(lang)}
          savingPreference={account.savingPreference}
          onTogglePreference={field => void account.togglePreference(field)}
          title={isArabic ? 'تفضيلات الأسرة والتنبيهات' : 'Family and notification preferences'}
        />
      </div>

      <section className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--state-selected)] text-[var(--action-primary)]"><Users size={19} /></span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.15em] text-[var(--action-primary)]">{isArabic ? 'الأسرة' : 'Family'}</p>
              <h2 className="mt-1 text-lg font-black text-[var(--text-primary)]">{isArabic ? 'الأبناء المرتبطون' : 'Linked children'}</h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{isArabic ? 'تُحمّل الروابط من خدمة الأسرة الموثّقة.' : 'Family links are loaded from the authenticated family service.'}</p>
            </div>
          </div>
          <button type="button" onClick={() => onNavigate('children')} className="rounded-xl border border-[var(--border-default)] px-3 py-2 text-xs font-black text-[var(--text-primary)] hover:bg-[var(--state-hover)]">
            {isArabic ? 'إدارة وربط الأبناء' : 'Manage or connect children'}
          </button>
        </div>
        {childrenLoading
          ? <div role="status" className="grid gap-3 sm:grid-cols-2"><div className="h-16 animate-pulse rounded-xl bg-[var(--surface-secondary)]" /><div className="h-16 animate-pulse rounded-xl bg-[var(--surface-secondary)]" /></div>
          : childrenError
            ? <div role="alert" className="rounded-xl border border-[var(--feedback-error)]/30 p-4 text-sm text-[var(--feedback-error)]">
              {childrenError}
              <button type="button" onClick={() => void loadChildren()} className="ms-3 inline-flex items-center gap-1 font-bold underline"><RefreshCw size={13} />{isArabic ? 'إعادة المحاولة' : 'Retry'}</button>
            </div>
            : children.length === 0
              ? <p className="rounded-xl bg-[var(--surface-secondary)]/60 p-4 text-sm text-[var(--text-secondary)]">{isArabic ? 'لا توجد حسابات أبناء مرتبطة حالياً.' : 'No linked child accounts were found.'}</p>
              : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {children.map(child => (
                  <article key={child.id} className="flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)]/45 p-3">
                    {child.avatarUrl
                      ? <img src={child.avatarUrl} alt="" className="h-11 w-11 rounded-xl object-cover" />
                      : <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--state-selected)] text-sm font-black text-[var(--action-primary)]">{child.name.slice(0, 1)}</span>}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--text-primary)]">{child.name}</p>
                      <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">{child.grade || (isArabic ? 'الصف غير متاح' : 'Grade unavailable')} · {isArabic ? child.classNameAr || 'الفصل غير متاح' : child.className || 'Class unavailable'}</p>
                    </div>
                  </article>
                ))}
              </div>}
      </section>
    </ProfilePageFrame>
  );
}
