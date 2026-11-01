import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, GraduationCap, RefreshCw } from 'lucide-react';
import type { Language } from '../../types';
import { getServantAssignedClasses, type ServantAssignedClass } from '../../lib/servantProfileService';
import { ServantProfileForm } from './ServantProfileForm';
import {
  ProfilePageFrame,
  ProfileSettingsCard,
  ProfileUnavailable,
  useRoleProfileAccount,
  type RoleProfileProps,
} from './RoleProfileShared';

const servantPreferences = (lang: Language) => [
  { field: 'pushNotificationsEnabled' as const, label: lang === 'ar' ? 'التنبيهات داخل التطبيق' : 'In-app notifications', description: lang === 'ar' ? 'تشغيل أو إيقاف تنبيهات Stella داخل التطبيق.' : 'Turn Stella in-app notifications on or off.' },
  { field: 'notifyLessonCompletion' as const, label: lang === 'ar' ? 'تنبيهات إتمام التعلّم' : 'Learning completion notifications', description: lang === 'ar' ? 'تلقي تحديثات إتمام الدروس عند دعمها.' : 'Receive lesson-completion updates where supported.' },
  { field: 'notifyEventReminders' as const, label: lang === 'ar' ? 'تذكيرات الفعاليات' : 'Event reminders', description: lang === 'ar' ? 'تلقي تذكيرات الفعاليات الكنسية المتاحة.' : 'Receive reminders for available church events.' },
];

export function ServantAccountProfile({ lang, setLang, onNavigate, onLogout }: RoleProfileProps) {
  const account = useRoleProfileAccount('teacher', lang);
  const isArabic = lang === 'ar';
  const [classes, setClasses] = useState<ServantAssignedClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    if (!account.roleAssigned) return;
    setClassesLoading(true);
    setClassesError(null);
    const result = await getServantAssignedClasses();
    if (result.error || !result.data) {
      setClasses([]);
      setClassesError(result.error?.message || (isArabic ? 'تعذر تحميل الفصول المسندة.' : 'Could not load assigned classes.'));
    } else {
      setClasses(result.data.classes);
    }
    setClassesLoading(false);
  }, [account.roleAssigned, isArabic]);

  useEffect(() => {
    if (account.roleAssigned) void loadClasses();
  }, [account.roleAssigned, loadClasses]);

  if (!account.userData || !account.roleAssigned) return <ProfileUnavailable lang={lang} />;

  return (
    <ProfilePageFrame
      lang={lang}
      roleLabel={isArabic ? 'الخادم' : 'Servant'}
      title={isArabic ? 'ملف الخادم' : 'Servant profile'}
      subtitle={isArabic ? 'بيانات الخدمة والفصول المسندة وتفضيلات حسابك.' : 'Your service identity, assigned classes, and account preferences.'}
      icon={<GraduationCap size={28} />}
      onLogout={onLogout}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_.85fr]">
        <ServantProfileForm
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
          fields={servantPreferences(lang)}
          savingPreference={account.savingPreference}
          onTogglePreference={field => void account.togglePreference(field)}
          title={isArabic ? 'تفضيلات الخدمة والحساب' : 'Service and account preferences'}
        />
      </div>

      <section className="rounded-[1.75rem] border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--state-selected)] text-[var(--action-primary)]"><BookOpen size={19} /></span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.15em] text-[var(--action-primary)]">{isArabic ? 'الخدمة' : 'Service'}</p>
              <h2 className="mt-1 text-lg font-black text-[var(--text-primary)]">{isArabic ? 'الفصول المسندة' : 'Assigned classes'}</h2>
            </div>
          </div>
          <button type="button" onClick={() => onNavigate('home')} className="rounded-xl border border-[var(--border-default)] px-3 py-2 text-xs font-black text-[var(--text-primary)] hover:bg-[var(--state-hover)]">
            {isArabic ? 'فتح مساحة الخادم' : 'Open Servant workspace'}
          </button>
        </div>
        {classesLoading
          ? <div role="status" className="grid gap-3 sm:grid-cols-2"><div className="h-16 animate-pulse rounded-xl bg-[var(--surface-secondary)]" /><div className="h-16 animate-pulse rounded-xl bg-[var(--surface-secondary)]" /></div>
          : classesError
            ? <div role="alert" className="rounded-xl border border-[var(--feedback-error)]/30 p-4 text-sm text-[var(--feedback-error)]">
              {classesError}
              <button type="button" onClick={() => void loadClasses()} className="ms-3 inline-flex items-center gap-1 font-bold underline"><RefreshCw size={13} />{isArabic ? 'إعادة المحاولة' : 'Retry'}</button>
            </div>
            : classes.length === 0
              ? <p className="rounded-xl bg-[var(--surface-secondary)]/60 p-4 text-sm text-[var(--text-secondary)]">{isArabic ? 'لا توجد فصول مسندة للسنة الكنسية النشطة.' : 'No classes are assigned for the active church year.'}</p>
              : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {classes.map(classroom => (
                  <article key={classroom.id} className="flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)]/45 p-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-primary)] text-[var(--action-primary)]"><BookOpen size={18} /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--text-primary)]">{isArabic ? classroom.nameAr : classroom.name}</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">{classroom.churchYearName}</p>
                    </div>
                  </article>
                ))}
              </div>}
      </section>
    </ProfilePageFrame>
  );
}
