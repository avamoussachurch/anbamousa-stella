import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  ShieldAlert,
  Clock,
  Sparkles,
  Award,
  Music,
  RotateCcw
} from 'lucide-react';
import { HymnsRosterMembership, Language } from '../../../types';
import { getHymnsRequests, reviewHymnsEnrollment } from '../../../lib/hymnsService';
import { HYMNS_LEVEL_DEFINITIONS } from '../../../lib/hymnsEnrollmentService';

interface HymnsEnrollmentManagerProps {
  lang?: Language;
  onRefresh?: () => void;
}

export function HymnsEnrollmentManager({ lang = 'ar', onRefresh }: HymnsEnrollmentManagerProps) {
  const isAr = lang === 'ar';
  const [requests, setRequests] = useState<HymnsRosterMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Transfer modal
  const [transferringMember, setTransferringMember] = useState<HymnsRosterMembership | null>(null);
  const [targetLevel, setTargetLevel] = useState<1 | 2 | 3>(2);
  const [targetRosterGroup, setTargetRosterGroup] = useState<string>('deacons_prep');
  const [transferNotes, setTransferNotes] = useState<string>('');

  const loadRequests = async () => {
    setLoading(true);
    const res = await getHymnsRequests();
    if (res.success && res.requests) {
      setRequests(res.requests);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleReviewAction = async (
    membershipId: string,
    action: 'APPROVE' | 'REJECT' | 'REVOKE'
  ) => {
    const reason = action === 'REJECT' 
      ? prompt(isAr ? 'سبب الرفض (اختياري):' : 'Rejection reason (optional):') || 'Prerequisites not met'
      : action === 'REVOKE'
      ? prompt(isAr ? 'سبب إلغاء التسجيل:' : 'Revocation reason:') || 'Revoked by administration'
      : '';

    setProcessingId(membershipId);
    setStatusMessage(null);

    const res = await reviewHymnsEnrollment(membershipId, action, { notes: reason });
    setProcessingId(null);

    if (res.success) {
      setStatusMessage({
        text: isAr ? 'تم تحديث حالة القبول بنجاح وسريان الصلاحيات فوراً.' : 'Enrollment status updated successfully.',
        type: 'success'
      });
      await loadRequests();
      if (onRefresh) onRefresh();
    } else {
      setStatusMessage({
        text: res.error || (isAr ? 'حدث خطأ أثناء المراجعة' : 'Failed to update enrollment'),
        type: 'error'
      });
    }
  };

  const handleExecuteTransfer = async () => {
    if (!transferringMember) return;
    setProcessingId(transferringMember.id);
    setStatusMessage(null);

    const res = await reviewHymnsEnrollment(transferringMember.id, 'TRANSFER', {
      targetLevel,
      targetRosterGroup,
      notes: transferNotes || (isAr ? 'ترقية شماس إلى المستوى الأعلى' : 'Promoted to higher level')
    });
    setProcessingId(null);
    setTransferringMember(null);

    if (res.success) {
      setStatusMessage({
        text: isAr ? `تم ترقية وتسكين الشماس في المستوى ${targetLevel} بنجاح مع حفظ سجل تقدمه.` : `Student transferred to Level ${targetLevel} successfully.`,
        type: 'success'
      });
      await loadRequests();
      if (onRefresh) onRefresh();
    } else {
      setStatusMessage({
        text: res.error || 'Failed to transfer student',
        type: 'error'
      });
    }
  };

  const filtered = requests.filter(r => {
    if (activeFilter === 'all') return true;
    return r.status === activeFilter;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-3xl border border-[var(--mousa-border-sand)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-400/20 text-amber-800 dark:text-amber-300 rounded-2xl">
            <Users size={22} />
          </div>
          <div>
            <h3 className="text-lg font-black text-[var(--mousa-teal-deep)] dark:text-amber-300">
              {isAr ? 'إدارة طلبات الانضمام لمدرسة الألحان والكشافة' : 'Hymns School Roster & Admissions'}
            </h3>
            <p className="text-xs text-stone-500 font-bold mt-0.5">
              {isAr
                ? 'مراجعة طلبات التقديم، تسكين الشمامسة بالمستويات الثلاثة، الترقية والنقل، وإلغاء التسجيل.'
                : 'Review applications, assign deacon levels, promote students, and manage rosters.'}
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 p-1 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-xs font-black'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
            }`}
          >
            <Clock size={13} />
            <span>{isAr ? 'قيد المراجعة' : 'Pending'}</span>
            {pendingCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-amber-700 text-[10px] font-black flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveFilter('approved')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'approved'
                ? 'bg-[var(--mousa-teal)] text-white shadow-xs font-black'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
            }`}
          >
            <CheckCircle2 size={13} />
            <span>{isAr ? 'المعتمدون' : 'Approved'}</span>
          </button>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-stone-700 text-white shadow-xs font-black'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
            }`}
          >
            <span>{isAr ? 'الكل' : 'All'} ({requests.length})</span>
          </button>
        </div>
      </div>

      {/* Status Feedback */}
      {statusMessage && (
        <div className={`p-3 rounded-2xl flex items-center gap-2 text-xs font-bold ${
          statusMessage.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
            : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-300'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Requests List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[var(--mousa-border-sand)] p-4 sm:p-5 space-y-3 shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-stone-400 text-xs font-bold">
            {isAr ? 'جاري تحميل قائمة الطلاب والطلبات...' : 'Loading requests...'}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="text-3xl">🕊️</div>
            <p className="text-sm font-bold text-stone-600 dark:text-stone-300">
              {isAr ? 'لا توجد طلبات في هذا القسم حالياً.' : 'No requests found.'}
            </p>
            <p className="text-xs text-stone-400">
              {isAr ? 'تظهر هنا طلبات الطلاب للانضمام لمدرسة الشمامسة فور تقديمها.' : 'Student requests will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => {
              const isProcessing = processingId === req.id;
              const levelDef = HYMNS_LEVEL_DEFINITIONS.find(d => d.level === req.level);

              return (
                <div
                  key={req.id}
                  className="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200 dark:border-stone-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-stone-700 text-amber-900 dark:text-amber-300 font-black text-sm flex items-center justify-center shrink-0">
                      {req.studentName?.[0] || 'ش'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-stone-900 dark:text-white">
                          {req.studentName}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                          : req.status === 'pending' ? 'bg-amber-400/30 text-amber-900 dark:text-amber-300'
                          : 'bg-red-500/20 text-red-800 dark:text-red-300'
                        }`}>
                          {req.status === 'approved' ? (isAr ? 'معتمد' : 'Approved')
                          : req.status === 'pending' ? (isAr ? 'قيد المراجعة' : 'Pending')
                          : (isAr ? 'مرفوض' : 'Rejected')}
                        </span>
                        <span className="text-[10px] bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold px-2 py-0.5 rounded-full">
                          {isAr ? `مستوى ${req.level}` : `Level ${req.level}`}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 font-medium mt-0.5">
                        {isAr ? levelDef?.nameAr : levelDef?.nameEn} • {req.rosterGroup}
                      </p>
                      {req.notes && (
                        <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-1 italic">
                          "{req.notes}"
                        </p>
                      )}
                      <span className="text-[10px] text-stone-400 block mt-1">
                        {isAr ? 'تاريخ الطلب:' : 'Requested:'} {new Date(req.requestedAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
                    {req.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleReviewAction(req.id, 'APPROVE')}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 size={13} />
                          <span>{isAr ? 'قبول واعتماد' : 'Approve'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewAction(req.id, 'REJECT')}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle size={13} />
                          <span>{isAr ? 'رفض' : 'Reject'}</span>
                        </button>
                      </>
                    )}

                    {req.status === 'approved' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setTransferringMember(req);
                            setTargetLevel(req.level === 1 ? 2 : 3);
                            setTargetRosterGroup(req.level === 1 ? 'deacons_prep' : 'master_deacons');
                          }}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <ArrowRightLeft size={13} />
                          <span>{isAr ? 'ترقية / نقل مستوى' : 'Promote/Transfer'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewAction(req.id, 'REVOKE')}
                          disabled={isProcessing}
                          className="px-2.5 py-1.5 text-stone-500 hover:text-red-600 text-xs font-bold transition-colors cursor-pointer"
                          title={isAr ? 'إلغاء التسجيل' : 'Revoke'}
                        >
                          <span>{isAr ? 'إلغاء' : 'Revoke'}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transfer / Promotion Modal */}
      {transferringMember && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full space-y-4 border-2 border-amber-500/40 shadow-2xl">
            <h3 className="font-black text-base text-[var(--mousa-teal-deep)] dark:text-amber-300 flex items-center gap-2">
              <ArrowRightLeft size={18} />
              <span>{isAr ? 'ترقية وتسكين الشماس في مستوى جديد' : 'Promote/Transfer Student'}</span>
            </h3>

            <p className="text-xs text-stone-600 dark:text-stone-300 font-bold">
              {isAr ? `الطالب: ${transferringMember.studentName} (المستوى الحالي: ${transferringMember.level})` : `Student: ${transferringMember.studentName}`}
            </p>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                {isAr ? 'المستوى الجديد:' : 'Target Level:'}
              </label>
              <select
                value={targetLevel}
                onChange={(e) => setTargetLevel(Number(e.target.value) as 1 | 2 | 3)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
              >
                <option value={1}>{isAr ? 'المستوى الأول (تمهيدي ومبتدئين)' : 'Level 1: Novice'}</option>
                <option value={2}>{isAr ? 'المستوى الثاني (متوسط وشمامسة)' : 'Level 2: Intermediate'}</option>
                <option value={3}>{isAr ? 'المستوى الثالث (متقدم وأسبوع الآلام)' : 'Level 3: Advanced'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                {isAr ? 'مجموعة الخورس:' : 'Roster Group:'}
              </label>
              <input
                type="text"
                value={targetRosterGroup}
                onChange={(e) => setTargetRosterGroup(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                {isAr ? 'ملاحظات الترقية أو النقل:' : 'Transfer Notes:'}
              </label>
              <input
                type="text"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="أتقن ألحان المستوى الأول بنجاح..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleExecuteTransfer}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs cursor-pointer shadow-xs"
              >
                {isAr ? 'تأكيد الترقية والنقل' : 'Confirm Promotion'}
              </button>
              <button
                type="button"
                onClick={() => setTransferringMember(null)}
                className="px-4 py-2.5 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
