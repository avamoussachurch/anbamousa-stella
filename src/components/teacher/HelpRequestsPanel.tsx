import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock3, RefreshCw, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Language } from '../../types';

type HelpRequest = {
  id: string; student_id: string; category: string; subject: string; message: string;
  status: 'open' | 'in_review' | 'resolved'; created_at: string; resolution_note: string | null;
  studentName?: string; grade?: string | null;
};

export function HelpRequestsPanel({ lang }: { lang: Language }) {
  const { userData } = useAuth();
  const isArabic = lang === 'ar';
  const [items, setItems] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    if (!supabase) { setError(isArabic ? 'اتصال قاعدة البيانات غير متاح.' : 'Database connection is unavailable.'); setLoading(false); return; }
    setLoading(true);
    const { data, error: queryError } = await supabase.from('student_help_requests')
      .select('id,student_id,category,subject,message,status,created_at,resolution_note')
      .order('created_at', { ascending: false }).limit(100);
    if (queryError) { setError(queryError.message); setItems([]); setLoading(false); return; }
    const rows = (data || []) as HelpRequest[];
    const ids = [...new Set(rows.map(row => row.student_id))];
    const profiles = ids.length ? await supabase.from('profiles').select('id,name,grade').in('id', ids) : { data: [], error: null };
    const profileMap = new Map((profiles.data || []).map((profile: any) => [profile.id, profile]));
    setItems(rows.map(row => {
      const profile = profileMap.get(row.student_id) as any;
      return { ...row, studentName: profile?.name || (isArabic ? 'تلميذ' : 'Student'), grade: profile?.grade };
    }));
    setNotes(Object.fromEntries(rows.map(row => [row.id, row.resolution_note || ''])));
    setError(null);
    setLoading(false);
  }, [isArabic]);

  useEffect(() => { void refresh(); }, [refresh]);

  const updateRequest = async (item: HelpRequest, status: HelpRequest['status']) => {
    if (!supabase || !userData?.id) return;
    setSavingId(item.id);
    const { error: updateError } = await supabase.from('student_help_requests').update({
      status, assigned_to: userData.id, resolution_note: notes[item.id]?.trim() || null,
      updated_at: new Date().toISOString()
    }).eq('id', item.id);
    setSavingId(null);
    if (updateError) { setError(updateError.message); return; }
    await refresh();
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-4 px-3 py-5 sm:px-5" dir={isArabic ? 'rtl' : 'ltr'}>
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4">
        <div className="flex items-center gap-3"><ShieldAlert className="text-amber-600" size={24} />
          <div><h2 className="font-black">{isArabic ? 'طلبات مساعدة التلاميذ' : 'Student help requests'}</h2>
            <p className="text-sm text-[var(--text-secondary)]">{isArabic ? 'الطلبات الخاصة بتلاميذ فصولك المكلّف بها فقط.' : 'Only requests from students in classes assigned to you.'}</p></div></div>
        <button type="button" onClick={() => void refresh()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold"><RefreshCw size={15} />{isArabic ? 'تحديث' : 'Refresh'}</button>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</p>}
      {loading ? <p role="status" className="p-6 text-center">{isArabic ? 'بنحمّل الطلبات...' : 'Loading requests...'}</p>
        : items.length === 0 ? <div className="rounded-2xl border border-dashed p-8 text-center text-[var(--text-secondary)]">{isArabic ? 'مفيش طلبات مساعدة ظاهرة للفصول المكلّف بها.' : 'No help requests are visible for your assigned classes.'}</div>
        : <div className="space-y-3">{items.map(item => (
          <article key={item.id} className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><p className="font-black">{item.subject}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{item.studentName}{item.grade ? ` · ${item.grade}` : ''} · {new Date(item.created_at).toLocaleString(isArabic ? 'ar-EG' : 'en')}</p></div>
              <span className="rounded-full bg-[var(--surface-secondary)] px-3 py-1 text-xs font-bold">{item.status === 'resolved' ? (isArabic ? 'تم الحل' : 'Resolved') : item.status === 'in_review' ? (isArabic ? 'قيد المراجعة' : 'In review') : (isArabic ? 'مفتوح' : 'Open')}</span>
            </div>
            <p className="mt-3 text-sm font-semibold">{isArabic ? 'النوع' : 'Category'}: {item.category}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">{item.message}</p>
            <label className="mt-3 block text-xs font-bold">{isArabic ? 'رد أو ملاحظة للتلميذ' : 'Reply or note for the student'}
              <textarea rows={2} maxLength={1000} value={notes[item.id] || ''} onChange={event => setNotes(previous => ({ ...previous, [item.id]: event.target.value }))} className="mt-1 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-2 text-sm font-normal" /></label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={savingId === item.id} onClick={() => void updateRequest(item,'in_review')} className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold disabled:opacity-50"><Clock3 size={15} />{isArabic ? 'قيد المراجعة' : 'Mark in review'}</button>
              <button type="button" disabled={savingId === item.id} onClick={() => void updateRequest(item,'resolved')} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-3 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 size={15} />{isArabic ? 'تم الحل وإرسال الرد' : 'Resolve and reply'}</button>
            </div>
          </article>
        ))}</div>}
    </section>
  );
}
