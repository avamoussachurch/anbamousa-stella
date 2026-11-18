import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, HeartHandshake, Loader2, RefreshCw, Save, Search, Users, X } from 'lucide-react';
import { getTeacherAttendance, logTeacherVisitation, saveTeacherAttendance, type AttendanceStatus, type TeacherAttendanceClass, type TeacherAttendanceStudent, type VisitationMethod } from '../../lib/teacherAttendanceService';

const todayLocal = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export function TeacherAttendanceWorkspace({ lang }: { lang: 'en' | 'ar' }) {
  const isArabic = lang === 'ar';
  const [date, setDate] = useState(todayLocal);
  const [classes, setClasses] = useState<TeacherAttendanceClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState<TeacherAttendanceStudent[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sessionExists, setSessionExists] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [visitStudent, setVisitStudent] = useState<TeacherAttendanceStudent | null>(null);
  const [visitMethod, setVisitMethod] = useState<VisitationMethod>('call');
  const [visitNotes, setVisitNotes] = useState('');
  const [savingVisit, setSavingVisit] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setNotice(null);
    getTeacherAttendance(date, selectedClassId || undefined).then(data => {
      if (!active) return;
      setClasses(data.classes);
      if (!selectedClassId && data.classes.length > 0) {
        setSelectedClassId(data.classes[0].id);
        return;
      }
      setStudents(data.students);
      setStatusMap(Object.fromEntries(data.students.flatMap(student => student.status ? [[student.id, student.status]] : [])));
      setSessionExists(data.sessionExists);
      setSavedAt(data.savedAt);
    }).catch(err => {
      if (active) setError(err instanceof Error ? err.message : (isArabic ? 'تعذر تحميل الحضور.' : 'Could not load attendance.'));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [date, selectedClassId, refreshKey]);

  const visibleStudents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return students.filter(student => !query || student.name.toLocaleLowerCase().includes(query) || student.grade.toLocaleLowerCase().includes(query));
  }, [students, search]);

  const counts = {
    present: students.filter(student => statusMap[student.id] === 'present').length,
    late: students.filter(student => statusMap[student.id] === 'late').length,
    excused: students.filter(student => statusMap[student.id] === 'excused').length,
    absent: students.filter(student => statusMap[student.id] === 'absent').length,
    unmarked: students.filter(student => !statusMap[student.id]).length
  };
  const statusLabel: Record<AttendanceStatus, string> = {
    present: isArabic ? 'حاضر' : 'Present',
    late: isArabic ? 'متأخر' : 'Late',
    excused: isArabic ? 'بعذر' : 'Excused',
    absent: isArabic ? 'غائب' : 'Absent'
  };
  const methodLabel: Record<VisitationMethod, string> = {
    call: isArabic ? 'مكالمة' : 'Call',
    visit: isArabic ? 'زيارة' : 'Visit',
    whatsapp: 'WhatsApp'
  };
  const formatDate = (value: string | null) => value
    ? new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(value + (value.length === 10 ? 'T00:00:00' : '')))
    : '—';

  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setStatusMap(current => ({ ...current, [studentId]: status }));
    setNotice(null);
  };

  const markAllPresent = () => {
    setStatusMap(Object.fromEntries(students.map(student => [student.id, 'present'])));
    setNotice(null);
  };

  const saveAttendance = async () => {
    if (!selectedClassId) return;
    const records = (Object.entries(statusMap) as Array<[string, AttendanceStatus]>).map(([studentId, status]) => ({ studentId, status }));
    if (records.length === 0) {
      setError(isArabic ? 'حدد حالة تلميذ واحد على الأقل قبل الحفظ.' : 'Mark at least one student before saving.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await saveTeacherAttendance(selectedClassId, date, records);
      setNotice(isArabic ? `تم حفظ حضور ${result.savedCount} تلميذ.` : `Attendance saved for ${result.savedCount} students.`);
      setRefreshKey(value => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isArabic ? 'تعذر حفظ الحضور.' : 'Could not save attendance.'));
    } finally {
      setSaving(false);
    }
  };

  const saveVisitation = async () => {
    if (!visitStudent || !selectedClassId) return;
    setSavingVisit(true);
    setError(null);
    try {
      await logTeacherVisitation({
        classInstanceId: selectedClassId,
        studentId: visitStudent.id,
        date,
        method: visitMethod,
        notes: visitNotes.trim()
      });
      setVisitStudent(null);
      setVisitNotes('');
      setNotice(isArabic ? 'تم حفظ سجل المتابعة.' : 'Follow-up record saved.');
      setRefreshKey(value => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isArabic ? 'تعذر حفظ سجل المتابعة.' : 'Could not save the follow-up record.'));
    } finally {
      setSavingVisit(false);
    }
  };

  const selectedClass = classes.find(item => item.id === selectedClassId);
  const hasChanges = students.some(student => Boolean(statusMap[student.id]) !== Boolean(student.status) || (statusMap[student.id] && statusMap[student.id] !== student.status));

  return (
    <main className="mx-auto w-full max-w-[90rem] space-y-5 px-4 py-5 sm:px-6 lg:px-8" dir={isArabic ? 'rtl' : 'ltr'}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--action-primary)]">{isArabic ? 'إدارة الفصل' : 'Class management'}</p>
          <h1 className="mt-1 text-2xl font-black text-[var(--text-primary)]">{isArabic ? 'الحضور والافتقاد' : 'Attendance & follow-up'}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{isArabic ? 'سجلات محفوظة على الخادم لفصولك المسندة فقط.' : 'Server-persisted records for your assigned classes only.'}</p>
        </div>
        <button type="button" onClick={() => setRefreshKey(value => value + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{isArabic ? 'تحديث' : 'Refresh'}
        </button>
      </header>

      <section className="grid gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-bold text-[var(--text-secondary)]">{isArabic ? 'الفصل المسند إليك' : 'Assigned class'}</span>
          <select value={selectedClassId} onChange={event => setSelectedClassId(event.target.value)} disabled={loading || classes.length === 0} className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
            {classes.map(item => <option key={item.id} value={item.id}>{isArabic ? item.nameAr : item.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-[var(--text-secondary)]">{isArabic ? 'تاريخ الحضور' : 'Attendance date'}</span>
          <span className="flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] px-3 py-2">
            <CalendarDays size={16} className="text-[var(--text-secondary)]" />
            <input type="date" value={date} onChange={event => setDate(event.target.value)} className="min-w-0 bg-transparent text-sm text-[var(--text-primary)] outline-none" />
          </span>
        </label>
      </section>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-[var(--feedback-error)]/30 bg-[var(--feedback-error)]/5 p-3 text-sm text-[var(--text-primary)]"><AlertCircle size={18} className="mt-0.5 shrink-0 text-[var(--feedback-error)]" /><span>{error}</span></div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm font-semibold text-[var(--text-primary)]">{notice}</div>}

      {loading ? (
        <div role="status" className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-default)] p-12 text-sm text-[var(--text-secondary)]"><Loader2 size={18} className="animate-spin" />{isArabic ? 'جاري تحميل الفصل...' : 'Loading your class...'}</div>
      ) : classes.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-8 text-center">
          <Users size={30} className="mx-auto mb-3 text-[var(--text-tertiary)]" />
          <h2 className="font-bold text-[var(--text-primary)]">{isArabic ? 'لا توجد فصول مسندة إليك حالياً' : 'No active class assignments'}</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{isArabic ? 'اطلب من مسؤول الكنيسة مراجعة تكليف الفصل الخاص بحسابك.' : 'Ask a church administrator to review your class assignment.'}</p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Count label={isArabic ? 'إجمالي التلاميذ' : 'Students'} value={students.length} />
            <Count label={isArabic ? 'حاضر' : 'Present'} value={counts.present} />
            <Count label={isArabic ? 'متأخر' : 'Late'} value={counts.late} />
            <Count label={isArabic ? 'بعذر' : 'Excused'} value={counts.excused} />
            <Count label={isArabic ? 'غائب / بدون تسجيل' : 'Absent / unmarked'} value={counts.absent + counts.unmarked} />
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] p-4">
              <div>
                <h2 className="font-black text-[var(--text-primary)]">{isArabic ? 'قائمة التلاميذ' : 'Class roster'}</h2>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{selectedClass ? (isArabic ? selectedClass.nameAr : selectedClass.name) : ''} · {sessionExists ? (isArabic ? 'تم حفظ سجل لهذا اليوم' : 'A record exists for this date') : (isArabic ? 'لم يتم الحفظ بعد' : 'Not saved yet')}{savedAt ? ` · ${formatDate(savedAt)}` : ''}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative block w-full sm:w-56">
                  <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input value={search} onChange={event => setSearch(event.target.value)} placeholder={isArabic ? 'ابحث عن تلميذ' : 'Search students'} className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-secondary)] py-2 ps-9 pe-3 text-xs text-[var(--text-primary)]" />
                </label>
                <button type="button" onClick={markAllPresent} className="rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs font-bold text-[var(--text-primary)]">{isArabic ? 'الكل حاضر' : 'Mark all present'}</button>
              </div>
            </div>

            {students.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--text-secondary)]">{isArabic ? 'لا يوجد تلاميذ نشطون في هذا الفصل.' : 'No active students are enrolled in this class.'}</p>
            ) : visibleStudents.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--text-secondary)]">{isArabic ? 'لا توجد نتائج للبحث.' : 'No matching students.'}</p>
            ) : (
              <div className="divide-y divide-[var(--border-default)]">
                {visibleStudents.map(student => (
                  <article key={student.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-[var(--text-primary)]">{student.name}</h3>
                        {student.grade && <span className="rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">{student.grade}</span>}
                        {student.consecutiveAbsences >= 2 && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">{isArabic ? `محتاج متابعة · ${student.consecutiveAbsences} غيابات متتالية` : `Follow-up needed · ${student.consecutiveAbsences} consecutive absences`}</span>}
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">{isArabic ? 'آخر حضور:' : 'Last attended:'} {formatDate(student.lastAttendedDate)}</p>
                      {student.visitations[0] && <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">{isArabic ? 'آخر متابعة:' : 'Last follow-up:'} {formatDate(student.visitations[0].date)} · {methodLabel[student.visitations[0].type]}{student.visitations[0].notes ? ` · ${student.visitations[0].notes}` : ''}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(['present', 'late', 'excused', 'absent'] as AttendanceStatus[]).map(status => (
                        <button key={status} type="button" aria-pressed={statusMap[student.id] === status} onClick={() => setStudentStatus(student.id, status)} className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${statusMap[student.id] === status ? status === 'absent' ? 'border-red-600 bg-red-600 text-white' : status === 'present' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-amber-600 bg-amber-600 text-white' : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--state-hover)]'}`}>
                          {statusLabel[status]}
                        </button>
                      ))}
                      <button type="button" onClick={() => { setVisitStudent(student); setVisitNotes(''); }} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] px-3 py-2 text-xs font-bold text-[var(--text-primary)]"><HeartHandshake size={14} />{isArabic ? 'متابعة' : 'Follow up'}</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-default)] p-4">
              <p className="text-xs text-[var(--text-secondary)]">{isArabic ? `غير مسجل: ${counts.unmarked}` : `Unmarked: ${counts.unmarked}`}</p>
              <button type="button" onClick={saveAttendance} disabled={saving || Object.keys(statusMap).length === 0 || !hasChanges} className="inline-flex items-center gap-2 rounded-xl bg-[var(--action-primary)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ الحضور' : 'Save attendance')}
              </button>
            </div>
          </section>
        </>
      )}

      {visitStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setVisitStudent(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="visitation-title" className="w-full max-w-lg space-y-4 rounded-2xl bg-[var(--surface-primary)] p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="visitation-title" className="text-lg font-black text-[var(--text-primary)]">{isArabic ? 'تسجيل متابعة' : 'Log a follow-up'}</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{visitStudent.name}</p>
              </div>
              <button type="button" onClick={() => setVisitStudent(null)} aria-label={isArabic ? 'إغلاق' : 'Close'} className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--state-hover)]"><X size={18} /></button>
            </div>
            <label className="block text-sm font-bold text-[var(--text-primary)]">{isArabic ? 'طريقة التواصل' : 'Contact method'}
              <select value={visitMethod} onChange={event => setVisitMethod(event.target.value as VisitationMethod)} className="mt-1 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3 text-sm">
                <option value="call">{methodLabel.call}</option>
                <option value="visit">{methodLabel.visit}</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-[var(--text-primary)]">{isArabic ? 'ملاحظات المتابعة (اختياري)' : 'Follow-up notes (optional)'}
              <textarea value={visitNotes} onChange={event => setVisitNotes(event.target.value.slice(0, 1500))} rows={4} maxLength={1500} className="mt-1 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] p-3 text-sm" placeholder={isArabic ? 'اكتب ملخصاً مختصراً...' : 'Add a brief summary...'} />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setVisitStudent(null)} className="rounded-xl border border-[var(--border-default)] px-4 py-2 text-sm font-bold">{isArabic ? 'إلغاء' : 'Cancel'}</button>
              <button type="button" onClick={saveVisitation} disabled={savingVisit} className="rounded-xl bg-[var(--action-primary)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{savingVisit ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ المتابعة' : 'Save follow-up')}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3"><p className="text-xs font-bold text-[var(--text-secondary)]">{label}</p><p className="mt-1 text-2xl font-black tabular-nums text-[var(--text-primary)]">{value}</p></div>;
}
