import React, { useEffect, useState } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Language } from '../../types';

export function PasswordRecoveryScreen({ lang }: { lang: Language }) {
  const isArabic = lang === 'ar';
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    if (!supabase) { setHasRecoverySession(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (active) setHasRecoverySession(Boolean(data.session));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setHasRecoverySession(true);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 10) {
      setError(isArabic ? 'كلمة المرور لازم تكون 10 أحرف على الأقل.' : 'Use at least 10 characters for your password.');
      return;
    }
    if (password !== confirmPassword) {
      setError(isArabic ? 'كلمتا المرور مش متطابقتين.' : 'The passwords do not match.');
      return;
    }
    if (!supabase) { setError(isArabic ? 'خدمة الحساب غير متاحة.' : 'Account service is unavailable.'); return; }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(isArabic ? 'انتهت صلاحية الرابط أو تعذر تغيير كلمة المرور. اطلب رابطًا جديدًا.' : 'This link may have expired. Request a new password reset link.');
      return;
    }
    setSuccess(true);
  };

  return (
    <main dir={isArabic ? 'rtl' : 'ltr'} className="flex min-h-[100svh] items-center justify-center bg-[var(--color-church-cream)] p-4 dark:bg-slate-950">
      <section className="w-full max-w-md rounded-3xl border border-[var(--mousa-border-sand)] bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"><LockKeyhole size={27}/></div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">{isArabic ? 'إنشاء كلمة مرور جديدة' : 'Create a new password'}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{isArabic ? 'اختار كلمة مرور قوية تقدر تفتكرها.' : 'Choose a strong password you can remember.'}</p>
        {hasRecoverySession === null ? <p role="status" className="mt-5 text-sm">{isArabic ? 'بنتأكد من رابط الاستعادة...' : 'Verifying your recovery link...'}</p>
          : !hasRecoverySession ? <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:bg-amber-950 dark:text-amber-100">{isArabic ? 'رابط الاستعادة غير صالح أو انتهت صلاحيته. ارجع لتسجيل الدخول واطلب رابطًا جديدًا.' : 'This recovery link is invalid or has expired. Return to sign in and request a new link.'}<a href="/" className="mt-3 block font-black underline">{isArabic ? 'العودة لتسجيل الدخول' : 'Return to sign in'}</a></div>
          : success ? <div role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"><ShieldCheck className="mb-2" size={24}/>{isArabic ? 'تم تغيير كلمة المرور بنجاح. تقدر ترجع للتطبيق وتسجل دخولك.' : 'Your password has been updated. You can return to the app and sign in.'}<a href="/" className="mt-3 block font-black underline">{isArabic ? 'العودة للتطبيق' : 'Return to the app'}</a></div>
          : <form onSubmit={submit} className="mt-5 space-y-3">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">{isArabic ? 'كلمة المرور الجديدة' : 'New password'}<input type="password" autoComplete="new-password" minLength={10} required value={password} onChange={event => setPassword(event.target.value)} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"/></label>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">{isArabic ? 'تأكيد كلمة المرور' : 'Confirm password'}<input type="password" autoComplete="new-password" minLength={10} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"/></label>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-100">{error}</p>}
            <button type="submit" disabled={saving} className="min-h-12 w-full rounded-xl bg-[var(--mousa-teal)] px-4 font-black text-white disabled:opacity-50">{saving ? (isArabic ? 'بنحدّث...' : 'Updating...') : (isArabic ? 'حفظ كلمة المرور' : 'Save new password')}</button>
          </form>}
      </section>
    </main>
  );
}
