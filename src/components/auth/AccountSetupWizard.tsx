import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, HeartHandshake, ShieldCheck, UserRound, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Language } from '../../types';
import { completeAccountSetup } from '../../lib/onboardingService';

type SetupRole = 'teacher' | 'parent' | 'admin';

interface AccountSetupWizardProps {
  role: SetupRole;
  lang: Language;
  onComplete: () => void;
  onNavigate: (tab: string) => void;
}

export function AccountSetupWizard({ role, lang, onComplete, onNavigate }: AccountSetupWizardProps) {
  const { userData, updateUserProfile } = useAuth();
  const isAr = lang === 'ar';
  const [fullName, setFullName] = useState(userData?.fullName || '');
  const [phone, setPhone] = useState(userData?.phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFullName(userData?.fullName || '');
    setPhone(userData?.phone || '');
  }, [userData?.id]);

  if (!userData) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = fullName.trim();
    if (name.length < 2 || name.length > 100) {
      setError(isAr ? 'اكتب الاسم بالكامل (من حرفين إلى ١٠٠ حرف).' : 'Enter a name between 2 and 100 characters.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await updateUserProfile({ fullName: name, phone: phone.trim() || undefined });
      if (!result.success) {
        setError(result.error || (isAr ? 'تعذر حفظ بيانات الحساب.' : 'Could not save account details.'));
        return;
      }
      const setupResult = await completeAccountSetup(role);
      if (!setupResult.success) {
        setError(setupResult.error || (isAr ? 'تعذر حفظ اكتمال إعداد الحساب.' : 'Could not save account setup completion.'));
        return;
      }
      onComplete();
      if (role === 'parent') onNavigate('family');
      else if (role === 'teacher') onNavigate('classManagement');
      else onNavigate('accounts');
    } catch (e) {
      setError(e instanceof Error ? e.message : (isAr ? 'حدث خطأ أثناء الحفظ.' : 'An error occurred while saving.'));
    } finally {
      setSaving(false);
    }
  };

  // The parent flow continues to secure family linking after profile details are saved.
  const parent = role === 'parent';
  const admin = role === 'admin';
  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/80 p-3 backdrop-blur-md sm:p-6">
      <motion.section role="dialog" aria-modal="true" aria-labelledby="account-setup-title"
        initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative my-auto w-full max-w-xl overflow-hidden rounded-[2rem] border border-amber-200/70 bg-[#fffaf0] text-stone-900 shadow-2xl dark:bg-[#211a14] dark:text-stone-50">
        <div className="h-2 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />
        <div className="p-6 sm:p-8">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            {parent ? <HeartHandshake size={32}/> : <ShieldCheck size={32}/>}
          </div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-amber-700 dark:text-amber-300">{isAr ? 'إعداد الحساب · الخطوة الأولى' : 'ACCOUNT SETUP · STEP 1'}</p>
          <h2 id="account-setup-title" className="mt-2 text-2xl font-black sm:text-3xl">
            {parent ? (isAr ? 'خلّينا نجهّز حساب ولي الأمر' : 'Let’s set up your parent account') : admin ? (isAr ? 'خلّينا نجهّز حساب الإدارة' : 'Let’s set up your administrator account') : (isAr ? 'خلّينا نجهّز حساب الخادم' : 'Let’s set up your teacher account')}
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-stone-300">
            {parent
              ? (isAr ? 'أكّد بيانات التواصل، وبعدها تقدر تربط حساب ابنك أو بنتك بأمان. بيانات الطفل لا تظهر إلا بعد الربط الموثّق.' : 'Confirm your contact details, then securely link your child. A child’s private information stays hidden until the family link is verified.')
              : (admin
                ? (isAr ? 'أكّد بيانات مسؤول النظام. صلاحيات الإدارة مرتبطة بالدور الممنوح لحسابك، ولا يمكن تعديلها من هذه الخطوة.' : 'Confirm your administrator contact details. Administrative access is determined by your assigned role, not by this setup form.')
                : (isAr ? 'أكّد بياناتك. الفصول والصلاحيات تُحدّد من إدارة الكنيسة، ولا يمكن تغييرها من إعداد الحساب.' : 'Confirm your details. Class assignments and permissions are managed by church administrators, not changed in account setup.'))}
          </p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block text-sm font-bold">{isAr ? 'الاسم بالكامل' : 'Full name'}
              <span className="relative mt-2 block"><UserRound className="absolute start-3 top-3.5 text-stone-400" size={18}/><input required minLength={2} maxLength={100} value={fullName} onChange={e=>setFullName(e.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-10 py-3 text-sm text-stone-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-white" placeholder={isAr ? 'الاسم كما تحب أن يظهر' : 'Name shown on your account'}/></span>
            </label>
            <label className="block text-sm font-bold">{isAr ? 'رقم الهاتف (اختياري)' : 'Phone number (optional)'}
              <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-white" placeholder="+20 …"/>
            </label>
            {parent ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><Users className="mb-2" size={20}/><strong>{isAr ? 'الخطوة التالية: ربط الأبناء' : 'Next: connect your children'}</strong><p>{isAr ? 'بعد الحفظ سنفتح صفحة العائلة لإتمام الربط باستخدام QR أو الكود السري.' : 'After saving, we’ll open Family so you can link a child with their QR code or secure family code.'}</p></div> : admin ? <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-violet-950 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100"><ShieldCheck className="mb-2" size={20}/><strong>{isAr ? 'مسؤوليات الإدارة' : 'Administrator workspace'}</strong><p>{isAr ? 'ستتمكن من مراجعة الحسابات والأدوار والفصول والمناهج والترتيب وفق صلاحياتك الممنوحة.' : 'Your workspace includes account and role oversight, classes, curriculum, and class rankings within your assigned permissions.'}</p></div> : <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100"><ShieldCheck className="mb-2" size={20}/><strong>{isAr ? 'صلاحيات الخدمة' : 'Servant permissions'}</strong><p>{isAr ? 'سيظهر لك فقط ما تم إسناده لحسابك. تواصل مع الإدارة إذا كان الفصل أو الدور غير صحيح.' : 'You’ll see only the classes and tools assigned to your account. Contact an administrator if your assignment is incorrect.'}</p></div>}
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
            <button disabled={saving} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-3.5 font-black text-white shadow-lg transition hover:brightness-110 disabled:opacity-60">
              {saving ? (isAr ? 'جارٍ الحفظ…' : 'Saving…') : <>{isAr ? 'حفظ ومتابعة' : 'Save and continue'} <CheckCircle2 size={18}/></>}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-stone-500">{isAr ? 'يمكنك تعديل بيانات التواصل لاحقاً من الملف الشخصي.' : 'You can update your contact details later from your profile.'}</p>
        </div>
      </motion.section>
    </div>
  );
}
