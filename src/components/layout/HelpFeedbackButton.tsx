import React, { useState } from 'react';
import { LifeBuoy, Send, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Language } from '../../types';
import type { Workspace } from '../../lib/workspaces';

const categories = [
  { id: 'lesson', en: 'A lesson is broken', ar: 'مشكلة في درس' },
  { id: 'audio', en: 'Audio or recording problem', ar: 'مشكلة في الصوت أو التسجيل' },
  { id: 'wrong_answer', en: 'Wrong answer or correction', ar: 'إجابة خاطئة أو تصحيح' },
  { id: 'account', en: 'Account or sign-in help', ar: 'مساعدة في الحساب أو تسجيل الدخول' },
  { id: 'confusion', en: 'I do not understand something', ar: 'مش فاهم حاجة' },
  { id: 'other', en: 'Something else', ar: 'مشكلة أخرى' }
] as const;

export function HelpFeedbackButton({ lang, workspace }: { lang: Language; workspace?: Workspace }) {
  const { userData, isGuest } = useAuth();
  const isStudentWorkspace = workspace === 'student';
  const isArabic = lang === 'ar';
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>('lesson');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isStudentWorkspace) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userData || isGuest || !supabase) {
      setFeedback(isArabic ? 'سجّل الدخول بحسابك الحقيقي لإرسال البلاغ.' : 'Sign in with your account to send a report.');
      return;
    }
    setBusy(true);
    setFeedback(null);
    const { error } = await supabase.from('student_help_requests').insert({
      student_id: userData.id,
      category,
      subject: subject.trim(),
      message: message.trim(),
      context: {
        workspace: new URLSearchParams(window.location.search).get('workspace') || 'student',
        tab: new URLSearchParams(window.location.search).get('tab') || 'home',
        path: window.location.pathname
      }
    });
    setBusy(false);
    if (error) {
      setFeedback(isArabic ? 'تعذر إرسال الطلب. حاول مرة أخرى.' : 'Could not send your request. Please try again.');
      return;
    }
    setFeedback(isArabic ? 'وصل طلبك للخادم المختص. شكرًا إنك بلغتنا!' : 'Your request reached the appropriate team. Thank you for telling us!');
    setSubject('');
    setMessage('');
  };

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setFeedback(null); }}
        aria-label={isArabic ? 'المساعدة والإبلاغ عن مشكلة' : 'Help and report a problem'}
        title={isArabic ? 'محتاج مساعدة؟' : 'Need help?'}
        className="rounded-xl border border-white/20 bg-white/10 p-2 text-[var(--navigation-text)] transition-colors hover:bg-white/20">
        <LifeBuoy size={18} />
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="help-feedback-title" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 text-[var(--text-primary)] shadow-2xl">
            <header className="mb-4 flex items-start justify-between gap-3">
              <div><h2 id="help-feedback-title" className="text-lg font-black">{isArabic ? 'إحنا هنا نساعدك' : 'We are here to help'}</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{isArabic ? 'قولنا إيه اللي حصل، وفريق الخدمة هيراجع طلبك.' : 'Tell us what happened and the service team will review it.'}</p></div>
              <button type="button" onClick={() => setOpen(false)} aria-label={isArabic ? 'إغلاق' : 'Close'} className="rounded-xl p-2 hover:bg-[var(--state-hover)]"><X size={18} /></button>
            </header>
            <form onSubmit={submit} className="space-y-3">
              <label className="block text-sm font-bold">{isArabic ? 'نوع المشكلة' : 'What do you need help with?'}
                <select value={category} onChange={event => setCategory(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3">
                  {categories.map(item => <option key={item.id} value={item.id}>{isArabic ? item.ar : item.en}</option>)}
                </select>
              </label>
              <label className="block text-sm font-bold">{isArabic ? 'عنوان مختصر' : 'Short title'}
                <input required minLength={3} maxLength={140} value={subject} onChange={event => setSubject(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3 font-normal" />
              </label>
              <label className="block text-sm font-bold">{isArabic ? 'احكيلنا التفاصيل' : 'Tell us what happened'}
                <textarea required minLength={5} maxLength={2000} rows={4} value={message} onChange={event => setMessage(event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3 font-normal" />
              </label>
              {feedback && <p role="status" className="rounded-xl bg-[var(--surface-secondary)] p-3 text-sm">{feedback}</p>}
              <button type="submit" disabled={busy || !subject.trim() || !message.trim()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--action-primary)] px-4 py-2 font-black text-[var(--action-primary-text)] disabled:opacity-50">
                <Send size={16} />{busy ? (isArabic ? 'بنرسل...' : 'Sending...') : (isArabic ? 'إرسال الطلب' : 'Send request')}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
