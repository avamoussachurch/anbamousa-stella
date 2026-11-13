import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, BookOpen, Check, ClipboardList, Home, LoaderCircle, LockKeyhole,
  MailPlus, RefreshCw, ScrollText, Search, Shield, ShieldCheck, Users, UserRoundCog, X
} from 'lucide-react';
import type { Language, Role } from '../../types';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { TeacherPublishingHub } from '../teacher/publishing/TeacherPublishingHub';
import { LessonPublicationManager } from '../teacher/LessonPublicationManager';
import { useLessons } from '../../context/LessonsContext';
import {
  filterAdminAccounts,
  type AdminAccountRoleFilter,
  type AdminAccountStatus,
  type AdminAccountStatusFilter,
} from './adminWorkspaceModel';

interface AdminWorkspaceProps {
  activeTab: string;
  lang: Language;
  onNavigate: (tab: string) => void;
}

interface RoleRequest {
  id: string;
  requester_id: string;
  requested_role: Role;
  status: string;
  reason: string | null;
  requested_at: string;
}

interface AdminAccount {
  id: string;
  name: string;
  email: string;
  grade: string | null;
  roles: Array<{ role: Role; granted_at: string; granted_by: string | null }>;
  status: AdminAccountStatus;
  workspaceData?: {
    studentMemberships: Array<{ church_year_id: string; class_instance_id: string; exact_grade: string; status: string }>;
    servantAssignments: Array<{ church_year_id: string; class_instance_id: string }>;
    familyLinks: Array<{ child_id: string; relationship_type: string }>;
  };
}

interface AuditEntry {
  id: string;
  actor_id: string | null;
  target_user_id: string | null;
  action?: string;
  operation?: string;
  previous_role?: Role | null;
  new_role?: Role | null;
  requested_role?: Role | null;
  occurred_at: string;
  reason: string | null;
  details?: Record<string, unknown>;
}

interface Overview {
  accounts: number;
  roles: Record<Role, number>;
  pendingRoleRequests: number;
  activeChurchYear: { id: string; name: string } | null;
  classes: number;
  curriculumItems: number;
  publishedLessons: number;
  draftLessons: number;
  dataSource: string;
  checkedAt: string;
}

interface FamilyRelationship {
  id: string;
  parent_id: string;
  child_id: string;
  relationship_type: string;
  created_at: string;
  parent: { name: string; email: string } | null;
  child: { name: string; email: string } | null;
}

interface AdminClass {
  id: string;
  class_group_id: string;
  name_en: string;
  name_ar: string;
  students: Array<{ id: string; name: string | null }>;
  servants: Array<{ id: string; servant_id: string; name: string | null }>;
}

async function adminRequest<T>(path: string, method = 'GET', body?: object): Promise<T> {
  if (!supabase) throw new Error('Authenticated server access is unavailable.');
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('Please sign in again to continue.');
  const response = await fetch(path, {
    method,
    headers: {
      authorization: `Bearer ${session.access_token}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.message || 'Admin request failed.');
  return payload as T;
}

function getAdminRoleLabel(role: Role, isArabic: boolean): string {
  if (isArabic) return ({ student: 'تلميذ', parent: 'ولي أمر', teacher: 'خادم', admin: 'مشرف' })[role];
  return ({ student: 'Student', parent: 'Parent', teacher: 'Servant', admin: 'Administrator' })[role];
}

const ADMIN_SECTIONS = [
  ['home', 'Overview', 'نظرة عامة', Home],
  ['accounts', 'Accounts', 'الحسابات', Users],
  ['roles', 'Roles', 'الأدوار', ShieldCheck],
  ['families', 'Families', 'الأسر', Users],
  ['classes', 'Classes', 'الفصول', ClipboardList],
  ['curriculum', 'Curriculum', 'المناهج', BookOpen],
  ['security', 'Security & audit', 'الأمان والتدقيق', LockKeyhole],
  ['support', 'Support mode', 'وضع الدعم', Activity],
] as const;

export function AdminWorkspace({ activeTab, lang, onNavigate }: AdminWorkspaceProps) {
  const isArabic = lang === 'ar';
  const { refreshAssignedRoles, userData, isGuest } = useAuth();
  const {
    lessons,
    lessonVersions,
    curriculumLoading,
    curriculumError,
    refreshCurriculum,
  } = useLessons();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [roleTargetAccount, setRoleTargetAccount] = useState<AdminAccount | null>(null);
  const [accountsLimited, setAccountsLimited] = useState(false);
  const [families, setFamilies] = useState<FamilyRelationship[]>([]);
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [roleAudit, setRoleAudit] = useState<AuditEntry[]>([]);
  const [actionAudit, setActionAudit] = useState<AuditEntry[]>([]);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [supportAccount, setSupportAccount] = useState<AdminAccount | null>(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('student');
  const [roleAction, setRoleAction] = useState<'grant' | 'revoke'>('grant');
  const [reason, setReason] = useState('');
  const [email, setEmail] = useState('');
  const [search, setSearch] = useState('');
  const [accountQuery, setAccountQuery] = useState('');
  const [accountRoleFilter, setAccountRoleFilter] = useState<AdminAccountRoleFilter>('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState<AdminAccountStatusFilter>('all');
  const [supportReason, setSupportReason] = useState('');
  const [classServantId, setClassServantId] = useState('');
  const [classGroupId, setClassGroupId] = useState('');
  const [classAction, setClassAction] = useState<'ASSIGN' | 'REMOVE'>('ASSIGN');
  const [rosterStudentId, setRosterStudentId] = useState('');
  const [rosterClassGroupId, setRosterClassGroupId] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const visibleAccounts = useMemo(
    () => filterAdminAccounts(accounts, accountRoleFilter, accountStatusFilter),
    [accounts, accountRoleFilter, accountStatusFilter]
  );

  const loadOverview = useCallback(async () => {
    const result = await adminRequest<{ overview: Overview }>('/api/church/admin/overview');
    setOverview(result.overview);
  }, []);

  const loadAccounts = useCallback(async (query = '') => {
    const result = await adminRequest<{ accounts: AdminAccount[]; limited: boolean }>(
      `/api/church/admin/accounts?search=${encodeURIComponent(query)}`
    );
    setAccounts(result.accounts);
    setAccountsLimited(result.limited);
    return result.accounts;
  }, []);

  const loadRequests = useCallback(async () => {
    const result = await adminRequest<{ requests: RoleRequest[] }>('/api/church/admin/role-requests');
    setRequests(result.requests);
  }, []);

  const loadFamilies = useCallback(async () => {
    const result = await adminRequest<{ relationships: FamilyRelationship[] }>('/api/church/admin/families');
    setFamilies(result.relationships);
  }, []);

  const loadClasses = useCallback(async () => {
    const result = await adminRequest<{ classes: AdminClass[] }>('/api/church/admin/classes');
    setClasses(result.classes);
  }, []);

  const loadAudit = useCallback(async () => {
    setAuditError(null);
    try {
      const [roles, actions] = await Promise.all([
        adminRequest<{ audit: AuditEntry[] }>('/api/church/admin/role-audit'),
        adminRequest<{ audit: AuditEntry[] }>('/api/church/admin/action-audit'),
      ]);
      setRoleAudit(roles.audit);
      setActionAudit(actions.audit);
    } catch (loadError: unknown) {
      setAuditError(loadError instanceof Error ? loadError.message : 'Could not load administrative audit data.');
      throw loadError;
    }
  }, []);

  const loadCurrentSection = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'home') await Promise.all([loadOverview(), loadAudit()]);
      else if (activeTab === 'accounts') await loadAccounts(accountQuery);
      else if (activeTab === 'roles' || activeTab === 'role-requests') await loadRequests();
      else if (activeTab === 'families') await loadFamilies();
      else if (activeTab === 'classes') await loadClasses();
      else if (activeTab === 'security' || activeTab === 'role-audit') await loadAudit();
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load authoritative admin data.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, accountQuery, loadAccounts, loadAudit, loadClasses, loadFamilies, loadOverview, loadRequests]);

  useEffect(() => { void loadCurrentSection(); }, [loadCurrentSection]);

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(successMessage);
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : 'The administrative operation failed.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let active = true;
    const savedSession = sessionStorage.getItem('stella-admin-support-session');
    if (!savedSession) return () => { active = false; };
    try {
      const saved = JSON.parse(savedSession) as { targetUserId?: string; reason?: string };
      if (!saved.targetUserId || !saved.reason) throw new Error('Invalid saved support session.');
      void adminRequest<{ account: AdminAccount }>('/api/church/admin/support-sessions', 'POST', {
        targetUserId: saved.targetUserId, reason: saved.reason,
      }).then(result => {
        if (active) setSupportAccount(result.account);
      }).catch((restoreError: unknown) => {
        if (active) setError(restoreError instanceof Error ? restoreError.message : 'Could not revalidate the support session.');
      });
    } catch (restoreError: unknown) {
      sessionStorage.removeItem('stella-admin-support-session');
      setError(restoreError instanceof Error ? restoreError.message : 'Could not restore the support session.');
    }
    return () => { active = false; };
  }, []);

  const reviewRequest = (requestId: string, decision: 'approve' | 'reject') => {
    const request = requests.find(item => item.id === requestId);
    const decisionLabel = decision === 'approve'
      ? (isArabic ? 'الموافقة' : 'approve')
      : (isArabic ? 'الرفض' : 'reject');
    const roleLabel = request?.requested_role === 'teacher'
      ? (isArabic ? 'خادم' : 'Servant')
      : request?.requested_role || (isArabic ? 'الدور المطلوب' : 'requested role');
    if (!window.confirm(isArabic
      ? `تأكيد ${decisionLabel} طلب ${roleLabel} للحساب ${request?.requester_id || requestId}؟ سيتم تسجيل القرار واسم اللي نفّذ الإجراء في سجل التدقيق.`
      : `Confirm ${decisionLabel} of the ${roleLabel} request for account ${request?.requester_id || requestId}? The decision and verified actor will be recorded in the audit log.`)) return;
    return runAction(async () => {
      await adminRequest(`/api/church/admin/role-requests/${encodeURIComponent(requestId)}/review`, 'POST', {
        decision, reason: reason.trim() || undefined,
      });
      if (decision === 'approve') {
        const refreshed = await refreshAssignedRoles();
        if (!refreshed.success) throw new Error(refreshed.error || 'Role approval succeeded, but role refresh failed. Reload to revalidate access.');
      }
      await Promise.all([loadRequests(), loadOverview(), loadAudit()]);
    }, isArabic ? 'تم تسجيل مراجعة الطلب.' : 'Request review recorded.');
  };

  const changeRole = (event: React.FormEvent) => {
    event.preventDefault();
    const target = roleTargetAccount?.id === targetUserId.trim() ? roleTargetAccount : null;
    if (!target) {
      setError(isArabic ? 'ادوّر على الحساب أولاً لمراجعة الأدوار الحالية وتأثير التغيير.' : 'Look up the account first to review its current roles and the impact of this change.');
      return;
    }
    const hasRole = target.roles.some(assignment => assignment.role === selectedRole);
    if ((roleAction === 'grant' && hasRole) || (roleAction === 'revoke' && !hasRole)) {
      setError(isArabic ? 'لا يوجد تغيير مطلوب؛ حالة هذا الدور مطابقة بالفعل.' : 'No change is needed; this role already has the requested state.');
      return;
    }
    const roleLabel = selectedRole === 'teacher' ? (isArabic ? 'خادم' : 'Servant') : selectedRole;
    const existingRoles = target.roles.map(assignment => assignment.role === 'teacher'
      ? (isArabic ? 'خادم' : 'Servant')
      : assignment.role);
    const updatedRoles = roleAction === 'grant'
      ? [...existingRoles, roleLabel]
      : existingRoles.filter(role => role !== roleLabel);
    const impact = roleAction === 'grant'
      ? (isArabic
        ? `سيضاف دور ${roleLabel} مع الاحتفاظ بكل الأدوار الحالية.`
        : `The ${roleLabel} role will be added; all current roles will remain.`)
      : (isArabic
        ? `سيُسحب دور ${roleLabel} فقط. ستُزال صلاحية مساحة العمل المرتبطة به، مع بقاء الحساب والبيانات والسجلات الأخرى.`
        : `Only the ${roleLabel} role will be revoked. Access to that workspace will end; the account and its other data and records will remain.`)
    if (!window.confirm(isArabic
      ? `الحساب: ${target.name || target.email}\nالأدوار الحالية: ${existingRoles.join('، ') || 'لا يوجد'}\nالأدوار بعد التغيير: ${updatedRoles.join('، ') || 'لا يوجد'}\n\n${impact}\nسيُسجل التغيير في سجل التدقيق. هل تريد المتابعة؟`
      : `Account: ${target.name || target.email}\nCurrent roles: ${existingRoles.join(', ') || 'None'}\nRoles after change: ${updatedRoles.join(', ') || 'None'}\n\n${impact}\nThis change will be recorded in the audit log. Continue?`)) return;
    return runAction(async () => {
      await adminRequest('/api/church/admin/role-assignments', 'POST', {
        targetUserId: targetUserId.trim(), role: selectedRole, action: roleAction, reason: reason.trim() || undefined,
      });
      setReason('');
      const [updatedAccounts] = await Promise.all([loadAccounts(target.id), loadAudit()]);
      setRoleTargetAccount(updatedAccounts.find(account => account.id === target.id) || null);
    }, isArabic ? 'تم تسجيل تغيير الدور.' : 'Role change recorded.');
  };

  const inviteAccount = (event: React.FormEvent) => {
    event.preventDefault();
    if (!window.confirm(isArabic
      ? `سيتم إرسال دعوة تسجيل إلى ${email.trim()}. هل تريد المتابعة؟`
      : `A registration invitation will be sent to ${email.trim()}. Continue?`)) return;
    return runAction(async () => {
      await adminRequest('/api/church/admin/accounts/invite', 'POST', { email: email.trim(), reason: reason.trim() || undefined });
      setEmail('');
      await Promise.all([loadAccounts(accountQuery), loadAudit()]);
    }, isArabic ? 'تم إرسال الدعوة وتسجيلها.' : 'Invitation sent and audited.');
  };

  const updateAccountStatus = (account: AdminAccount, action: 'suspend' | 'reactivate') => {
    const isSuspending = action === 'suspend';
    if (!window.confirm(isArabic
      ? `${isSuspending ? 'إيقاف' : 'إعادة تفعيل'} حساب ${account.name || account.email}؟ ${isSuspending ? 'سيُمنع الحساب من تسجيل الدخول، ولن تُحذف بياناته أو سجلاته.' : 'سيتمكن الحساب من تسجيل الدخول مجدداً.'} سيتم تسجيل الإجراء.`
      : `${isSuspending ? 'Suspend' : 'Reactivate'} ${account.name || account.email}? ${isSuspending ? 'The account will be blocked from signing in; its data and records will not be deleted.' : 'The account will be able to sign in again.'} This action will be audited.`)) return;
    return runAction(async () => {
    await adminRequest(`/api/church/admin/accounts/${encodeURIComponent(account.id)}/status`, 'POST', {
      action, reason: reason.trim() || undefined,
    });
    await Promise.all([loadAccounts(accountQuery), loadAudit()]);
    }, isArabic ? 'تم تحديث حالة الحساب وتسجيلها.' : 'Account status updated and audited.');
  };

  const openSupport = (event: React.FormEvent) => {
    event.preventDefault();
    if (!window.confirm(isArabic
      ? 'سيُفتح شاشة دعم للعرض فقط لهذا الحساب، وسيُسجل وصولك وسبب الدعم. لن يتم انتحال هوية المستخدم. متابعة؟'
      : 'Open an audited, read-only support view for this account? The target will not be impersonated and no actions can be taken as them.')) return;
    return runAction(async () => {
      const result = await adminRequest<{ account: AdminAccount }>('/api/church/admin/support-sessions', 'POST', {
        targetUserId: targetUserId.trim(), reason: supportReason.trim(),
      });
      setSupportAccount(result.account);
      sessionStorage.setItem('stella-admin-support-session', JSON.stringify({
        targetUserId: targetUserId.trim(), reason: supportReason.trim(),
      }));
      setSupportReason('');
    }, isArabic ? 'بدأت جلسة دعم للقراءة فقط وتم تسجيلها.' : 'Read-only support view opened and audited.');
  };

  const closeSupport = () => {
    if (!supportAccount) return;
    if (!window.confirm(isArabic
      ? 'إنهاء جلسة الدعم للقراءة فقط وتسجيل وقت الإنهاء؟'
      : 'End this read-only support session and record its closure?')) return;
    return runAction(async () => {
      await adminRequest(`/api/church/admin/support-sessions/${encodeURIComponent(supportAccount.id)}/close`, 'POST', {});
      setSupportAccount(null);
      sessionStorage.removeItem('stella-admin-support-session');
      await loadAudit();
    }, isArabic ? 'تم إنهاء جلسة الدعم وتسجيلها.' : 'Support session ended and audited.');
  };

  const assignServant = (event: React.FormEvent) => {
    event.preventDefault();
    const actionLabel = classAction === 'ASSIGN' ? (isArabic ? 'تكليف' : 'assign') : (isArabic ? 'إزالة تكليف' : 'remove assignment');
    if (!window.confirm(isArabic
      ? `تأكيد ${actionLabel} الحساب ${classServantId} في الفصل المحدد؟ سيتم تسجيل الإجراء.`
      : `Confirm ${actionLabel} for servant account ${classServantId} in the selected class? This action will be audited.`)) return;
    return runAction(async () => {
      await adminRequest('/api/church/admin/servant-assignments', 'POST', {
        servantId: classServantId.trim(), classGroupId, action: classAction, reason: reason.trim() || undefined,
      });
      await Promise.all([loadClasses(), loadAudit()]);
    }, isArabic ? 'تم تحديث تكليف الخادم.' : 'Servant assignment updated and audited.');
  };

  const manageStudent = (action: 'add' | 'remove', classId: string, studentId: string, removalReason?: string) => {
    if (!window.confirm(isArabic
      ? `${action === 'add' ? 'إضافة' : 'إزالة'} التلميذ ${studentId} من الفصل ${classId}؟ عند الإزالة سيظل سجل العضوية التاريخي محفوظاً.`
      : `${action === 'add' ? 'Enroll' : 'Remove'} student ${studentId} ${action === 'add' ? 'in' : 'from'} class ${classId}? Removal preserves historical membership records.`)) return;
    return runAction(async () => {
    const path = `/api/church/classes/${encodeURIComponent(classId)}/${action === 'add' ? 'add-student' : 'remove-student'}`;
    await adminRequest(path, 'POST', action === 'add'
      ? { studentId }
      : { studentId, reason: removalReason || 'Administrative class roster change' });
    await Promise.all([loadClasses(), loadAudit()]);
    }, action === 'add'
    ? (isArabic ? 'تم تسجيل التلميذ في الفصل.' : 'Student enrollment recorded.')
    : (isArabic ? 'تم تحديث الفصل مع الاحتفاظ بالسجل التاريخي.' : 'Student removed while preserving historical records.'));
  };

  const enrollStudent = (event: React.FormEvent) => {
    event.preventDefault();
    if (!window.confirm(isArabic
      ? `تأكيد إضافة التلميذ ${rosterStudentId.trim()} إلى الفصل المحدد؟`
      : `Confirm enrollment of student ${rosterStudentId.trim()} in the selected class?`)) return;
    return runAction(async () => {
      if (!rosterClassGroupId || !rosterStudentId.trim()) throw new Error(isArabic ? 'اختر الفصل وأدخل معرّف التلميذ.' : 'Select a class and enter the student account ID.');
      const path = `/api/church/classes/${encodeURIComponent(rosterClassGroupId)}/add-student`;
      await adminRequest(path, 'POST', { studentId: rosterStudentId.trim() });
      setRosterStudentId('');
      await Promise.all([loadClasses(), loadAudit()]);
    }, isArabic ? 'تم تسجيل التلميذ في الفصل.' : 'Student enrollment recorded.');
  };

  const lookupRoleTarget = () => runAction(async () => {
    const userId = targetUserId.trim();
    if (!userId) throw new Error(isArabic ? 'أدخل رقم الحساب أولاً.' : 'Enter an account ID first.');
    const matchingAccounts = await loadAccounts(userId);
    const matchingAccount = matchingAccounts.find(account => account.id === userId);
    if (!matchingAccount) {
      setRoleTargetAccount(null);
      throw new Error(isArabic ? 'ملقيناش حساب مطابق.' : 'No matching account was found.');
    }
    setRoleTargetAccount(matchingAccount);
  }, isArabic ? 'تم تحميل بيانات الحساب والأدوار الحالية.' : 'Account details and current roles loaded.');

  const refreshAdminCurriculum = async () => {
    if (!refreshCurriculum) throw new Error('The trusted curriculum refresh is unavailable.');
    await refreshCurriculum();
  };
  const canManageCurriculum = Boolean(userData && !isGuest && isSupabaseConfigured);

  const title = ADMIN_SECTIONS.find(([id]) => id === activeTab)?.[isArabic ? 2 : 1]
    || (activeTab === 'role-requests' ? (isArabic ? 'طلبات الأدوار' : 'Role requests') : isArabic ? 'مركز الإدارة' : 'Admin Control Center');

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6" dir="rtl">
      <header className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-white/10 p-3 text-amber-300"><Shield size={28} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">Stella • Admin</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              {isArabic ? 'مركز إدارة مستقل. البيانات جاية من مصادر موثوقة، وكل إجراءات الإدارة والدعم الحساسة بتتسجل.' : 'An isolated control center using trusted data; sensitive admin actions and support access are audited.'}
            </p>
          </div>
          <button type="button" onClick={() => void loadCurrentSection()} disabled={loading} className="rounded-xl border border-white/20 p-2 text-white hover:bg-white/10 disabled:opacity-50" aria-label={isArabic ? 'تحديث البيانات' : 'Refresh data'}>
            {loading ? <LoaderCircle className="animate-spin" size={18} /> : <RefreshCw size={18} />}
          </button>
        </div>
      </header>

      {supportAccount && (
        <aside role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-950">
          <div>
            <p className="font-black">{isArabic ? 'وضع دعم للقراءة فقط' : 'Read-only support session'}</p>
            <p className="text-sm">{supportAccount.name} · {supportAccount.email} · {supportAccount.id}</p>
          </div>
          <button type="button" onClick={() => void closeSupport()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-amber-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
            <X size={16} />{isArabic ? 'إنهاء الدعم' : 'End support'}
          </button>
          <p className="w-full text-xs">{isArabic ? 'لا يتم تبديل جلسة المستخدم ولا يمكن تنفيذ إجراءات نيابة عنه. فتح الجلسة مسجل.' : 'No user session is impersonated and no actions can be taken on the account. Access is audited.'}</p>
        </aside>
      )}

      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{notice}</p>}
      {loading && <div className="mb-4 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle size={16} className="animate-spin" />{isArabic ? 'بنحمّل البيانات الموثوقة...' : 'Loading authoritative data...'}</div>}

      {activeTab === 'home' && (
        <section className="space-y-5">
          {overview ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  [isArabic ? 'الحسابات المسجلة' : 'Registered accounts', overview.accounts],
                  [isArabic ? 'التلاميذ النشطون' : 'Active students', overview.roles.student],
                  [isArabic ? 'أولياء الأمور' : 'Parents', overview.roles.parent],
                  [isArabic ? 'الخدام' : 'Servants', overview.roles.teacher],
                  [isArabic ? 'المشرفون' : 'Administrators', overview.roles.admin],
                  [isArabic ? 'طلبات أدوار مستنية المراجعة' : 'Pending role requests', overview.pendingRoleRequests],
                  [isArabic ? 'الفصول النشطة' : 'Active-year classes', overview.classes],
                  [isArabic ? 'عناصر المنهج' : 'Curriculum items', overview.curriculumItems],
                  [isArabic ? 'الدروس المنشورة' : 'Published lessons', overview.publishedLessons],
                  [isArabic ? 'مسودات الدروس' : 'Draft lessons', overview.draftLessons],
                ].map(([label, value]) => (
                  <article key={label} className="rounded-2xl border bg-white p-5 shadow-sm">
                    <p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-indigo-950">{value}</p>
                  </article>
                ))}
              </div>
              <section aria-labelledby="admin-role-distribution" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.14em] text-indigo-700">{isArabic ? 'توزيع الصلاحيات' : 'Access distribution'}</p>
                    <h2 id="admin-role-distribution" className="mt-1 text-lg font-black text-slate-950">{isArabic ? 'الأدوار النشطة على الحسابات' : 'Active assigned roles'}</h2>
                  </div>
                  <p className="text-xs text-slate-500">{isArabic ? 'لو الحساب عليه أكتر من دور، هيظهر في كل دور منهم.' : 'Multi-role accounts appear once in each assigned role.'}</p>
                </div>
                <div className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {([
                    ['student', isArabic ? 'التلاميذ' : 'Students', 'bg-sky-500'],
                    ['parent', isArabic ? 'أولياء الأمور' : 'Parents', 'bg-emerald-500'],
                    ['teacher', isArabic ? 'الخدام' : 'Servants', 'bg-amber-500'],
                    ['admin', isArabic ? 'المشرفون' : 'Administrators', 'bg-indigo-700'],
                  ] as const).map(([role, label, color]) => {
                    const count = overview.roles[role];
                    const maximum = Math.max(
                      1,
                      overview.roles.student,
                      overview.roles.parent,
                      overview.roles.teacher,
                      overview.roles.admin
                    );
                    const width = Math.round((count / maximum) * 100);
                    return (
                      <div key={role}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                          <span className="font-bold text-slate-700">{label}</span>
                          <span className="font-black tabular-nums text-slate-950">{count}</span>
                        </div>
                        <div
                          className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                          role="progressbar"
                          aria-label={`${label}: ${count}`}
                          aria-valuemin={0}
                          aria-valuemax={maximum}
                          aria-valuenow={count}
                        >
                          <div className={`h-full rounded-full transition-[width] duration-500 ${color}`} style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
              <div className="rounded-2xl border bg-white p-4 text-sm">
                <p className="font-black">{isArabic ? 'مصدر البيانات' : 'Data source'}: {overview.dataSource}</p>
                <p className="mt-1 text-slate-500">{isArabic ? 'السنة الكنسية الحالية' : 'Active church year'}: {overview.activeChurchYear?.name || (isArabic ? 'مش متحددة' : 'Not configured')}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(overview.checkedAt).toLocaleString(isArabic ? 'ar' : 'en')}</p>
              </div>
            </>
          ) : !loading && !error && <p className="rounded-2xl border bg-white p-5">{isArabic ? 'مفيش بيانات متاحة دلوقتي.' : 'No overview data is available.'}</p>}
          <div className="rounded-2xl border bg-white p-4">
            <h2 className="mb-3 flex items-center gap-2 font-black"><Activity size={18} />{isArabic ? 'آخر إجراءات الإدارة' : 'Recent administrative activity'}</h2>
            {auditError
              ? <p role="alert" className="text-sm text-rose-800">{isArabic ? 'مش قادرين نحمّل سجل المراجعة.' : 'Administrative audit history could not be loaded.'}</p>
              : <AuditList entries={actionAudit.slice(0, 5)} isArabic={isArabic} />}
          </div>
        </section>
      )}

      {activeTab === 'accounts' && (
        <section className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <form onSubmit={event => { event.preventDefault(); setAccountQuery(search.trim()); }} className="flex gap-2 rounded-2xl border bg-white p-4">
              <label className="sr-only" htmlFor="account-search">{isArabic ? 'دوّر على حساب' : 'Search accounts'}</label>
              <input id="account-search" value={search} onChange={event => setSearch(event.target.value)} placeholder={isArabic ? 'الاسم أو الإيميل أو رقم الحساب' : 'Name, email, or ID'} className="min-w-0 flex-1 rounded-xl border px-3 py-2" />
              <button className="rounded-xl bg-indigo-900 px-4 text-white" aria-label={isArabic ? 'بحث' : 'Search'}><Search size={18} /></button>
            </form>
            <form onSubmit={event => void inviteAccount(event)} className="flex gap-2 rounded-2xl border bg-white p-4">
              <label className="sr-only" htmlFor="invite-email">{isArabic ? 'إيميل الدعوة' : 'Invitation email'}</label>
              <input id="invite-email" type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder={isArabic ? 'اكتب الإيميل اللي هتبعتله الدعوة' : 'Email address to invite'} className="min-w-0 flex-1 rounded-xl border px-3 py-2" />
              <button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-indigo-900 px-3 py-2 font-bold text-white disabled:opacity-50"><MailPlus size={17} />{isArabic ? 'دعوة' : 'Invite'}</button>
            </form>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4">
            <label className="text-sm font-bold text-slate-700">
              {isArabic ? 'فلترة حسب الدور' : 'Filter by role'}
              <select value={accountRoleFilter} onChange={event => setAccountRoleFilter(event.target.value as AdminAccountRoleFilter)} className="ms-2 rounded-xl border px-3 py-2 font-normal text-slate-900">
                <option value="all">{isArabic ? 'كل الأدوار' : 'All roles'}</option>
                {(['student', 'parent', 'teacher', 'admin'] as const).map(role => <option key={role} value={role}>{role === 'teacher' ? (isArabic ? 'خادم' : 'Servant') : role}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold text-slate-700">
              {isArabic ? 'فلترة حسب الحالة' : 'Filter by status'}
              <select value={accountStatusFilter} onChange={event => setAccountStatusFilter(event.target.value as AdminAccountStatusFilter)} className="ms-2 rounded-xl border px-3 py-2 font-normal text-slate-900">
                <option value="all">{isArabic ? 'كل الحالات' : 'All statuses'}</option>
                <option value="active">{isArabic ? 'نشط' : 'Active'}</option>
                <option value="suspended">{isArabic ? 'موقوف' : 'Suspended'}</option>
                <option value="invited">{isArabic ? 'مدعو' : 'Invited'}</option>
                <option value="unknown">{isArabic ? 'غير متاحة' : 'Unavailable'}</option>
              </select>
            </label>
            <p className="ms-auto text-xs font-bold text-slate-500" aria-live="polite">
              {isArabic ? `عرض ${visibleAccounts.length} من ${accounts.length} حساب` : `Showing ${visibleAccounts.length} of ${accounts.length} accounts`}
            </p>
          </div>
          <div className="space-y-3">
            {visibleAccounts.map(account => (
              <article key={account.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words font-black">{account.name || account.email}</h2>
                    <p className="break-all text-sm text-slate-600">{account.email}</p>
                    <p className="mt-1 break-all text-xs text-slate-400">{account.id}</p>
                    <p className="mt-2 text-xs font-bold">{isArabic ? 'الحالة' : 'Status'}: {account.status === 'suspended' ? (isArabic ? 'موقوف' : 'Suspended') : account.status === 'invited' ? (isArabic ? 'مدعو' : 'Invited') : account.status === 'unknown' ? (isArabic ? 'غير متاحة' : 'Unavailable') : (isArabic ? 'نشط' : 'Active')}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {account.roles.map(assignment => <span key={assignment.role} title={`${assignment.granted_by || 'system'} · ${new Date(assignment.granted_at).toLocaleString()}`} className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-900">{assignment.role === 'teacher' ? (isArabic ? 'خادم' : 'Servant') : assignment.role} · {new Date(assignment.granted_at).toLocaleDateString(isArabic ? 'ar' : 'en')}</span>)}
                      {!account.roles.length && <span className="text-xs text-slate-500">{isArabic ? 'مفيش أدوار نشطة' : 'No active assigned roles'}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => { setTargetUserId(account.id); setRoleTargetAccount(account); onNavigate('roles'); }} className="rounded-xl border px-3 py-2 text-xs font-bold">{isArabic ? 'إدارة الأدوار' : 'Manage roles'}</button>
                    <button type="button" onClick={() => { setTargetUserId(account.id); onNavigate('support'); }} className="rounded-xl border px-3 py-2 text-xs font-bold">{isArabic ? 'عرض الدعم' : 'Support view'}</button>
                    {account.status === 'unknown'
                      ? <span className="rounded-xl border px-3 py-2 text-xs text-slate-500">{isArabic ? 'حالة الحساب مش متاحة' : 'Account status unavailable'}</span>
                      : account.status === 'suspended'
                      ? <button type="button" onClick={() => void updateAccountStatus(account, 'reactivate')} disabled={busy} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white">{isArabic ? 'إعادة تفعيل' : 'Reactivate'}</button>
                      : <button type="button" onClick={() => void updateAccountStatus(account, 'suspend')} disabled={busy} className="rounded-xl bg-rose-700 px-3 py-2 text-xs font-bold text-white">{isArabic ? 'إيقاف' : 'Suspend'}</button>}
                  </div>
                </div>
              </article>
            ))}
            {accountsLimited && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{isArabic ? 'النتائج بتعرض أحدث ٥٠٠ حساب. استخدم البحث عشان توصل لحساب تاني.' : 'Showing the most recent 500 matching accounts. Search to narrow the results.'}</p>}
            {!visibleAccounts.length && !loading && !error && <p className="rounded-2xl border bg-white p-5">{isArabic ? 'ملقيناش حسابات مطابقة للبحث والتصفية.' : 'No accounts match the search and filters.'}</p>}
          </div>
        </section>
      )}

      {(activeTab === 'roles' || activeTab === 'role-requests') && (
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
          <div className="space-y-3">
            <h2 className="text-lg font-black">{isArabic ? 'طلبات الأدوار اللي مستنية المراجعة' : 'Pending role requests'}</h2>
            {requests.map(request => (
              <article key={request.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                <p className="font-black">{request.requested_role === 'teacher' ? (isArabic ? 'خادم' : 'Servant') : request.requested_role}</p>
                <p className="mt-1 break-all text-xs text-slate-500">{request.requester_id}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(request.requested_at).toLocaleString(isArabic ? 'ar' : 'en')}</p>
                {request.reason && <p className="mt-2 text-sm">{request.reason}</p>}
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => void reviewRequest(request.id, 'approve')} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><Check size={16} />{isArabic ? 'موافقة' : 'Approve'}</button>
                  <button type="button" onClick={() => void reviewRequest(request.id, 'reject')} disabled={busy} className="rounded-xl bg-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-50">{isArabic ? 'رفض' : 'Reject'}</button>
                </div>
              </article>
            ))}
            {!requests.length && !loading && !error && <p className="rounded-2xl border bg-white p-5">{isArabic ? 'مفيش طلبات معلقة دلوقتي.' : 'No pending requests.'}</p>}
          </div>
          <div className="h-fit rounded-2xl border bg-white p-5">
            <div className="mb-3 flex items-center gap-2"><UserRoundCog className="text-indigo-800" /><h2 className="font-black">{isArabic ? 'إضافة دور أو سحبه' : 'Grant or revoke a role'}</h2></div>
            <form onSubmit={event => void changeRole(event)} className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="block min-w-0 flex-1 text-sm font-bold">{isArabic ? 'رقم الحساب' : 'Account ID'}<input required value={targetUserId} onChange={event => { setTargetUserId(event.target.value); setRoleTargetAccount(null); }} className="mt-1 w-full rounded-xl border px-3 py-2 font-normal" /></label>
                <button type="button" onClick={() => void lookupRoleTarget()} disabled={busy || !targetUserId.trim()} className="self-end rounded-xl border px-3 py-2 text-sm font-bold disabled:opacity-50">{isArabic ? 'دوّر على الحساب' : 'Look up account'}</button>
              </div>
              {roleTargetAccount?.id === targetUserId.trim() && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-950">
                  <p className="font-black">{roleTargetAccount.name || roleTargetAccount.email}</p>
                  <p className="break-all text-xs">{roleTargetAccount.email} · {roleTargetAccount.id}</p>
                  <p className="mt-2 font-bold">{isArabic ? 'الأدوار الحالية:' : 'Current roles:'} {roleTargetAccount.roles.map(item => item.role === 'teacher' ? (isArabic ? 'خادم' : 'Servant') : item.role).join('، ') || (isArabic ? 'مفيش أدوار نشطة' : 'No active roles')}</p>
                </div>
              )}
              <select aria-label={isArabic ? 'الدور' : 'Role'} value={selectedRole} onChange={event => setSelectedRole(event.target.value as Role)} className="w-full rounded-xl border px-3 py-2">
                {(['student', 'parent', 'teacher', 'admin'] as Role[]).map(role => <option key={role} value={role}>{role === 'teacher' ? (isArabic ? 'خادم' : 'Servant') : role}</option>)}
              </select>
              <select aria-label={isArabic ? 'الإجراء' : 'Action'} value={roleAction} onChange={event => setRoleAction(event.target.value as 'grant' | 'revoke')} className="w-full rounded-xl border px-3 py-2">
                <option value="grant">{isArabic ? 'منح' : 'Grant'}</option><option value="revoke">{isArabic ? 'سحب' : 'Revoke'}</option>
              </select>
              {roleTargetAccount?.id === targetUserId.trim() && (
                <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
                  {roleAction === 'grant'
                    ? (isArabic ? 'النتيجة: الدور ده هيتضاف من غير ما يلغي أي دور موجود.' : 'Impact: the selected role will be added without replacing current roles.')
                    : (isArabic ? 'النتيجة: الدور ده بس هو اللي هيتسحب، والوصول لمساحته هيتوقف. باقي بيانات الحساب وسجلاته هتفضل زي ما هي.' : 'Impact: only the selected role will be revoked; access to its workspace will end, while the account and its other data and records remain.')}
                </p>
              )}
              <label className="block text-sm font-bold">{isArabic ? 'السبب' : 'Reason'}<textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={1000} rows={2} className="mt-1 w-full rounded-xl border px-3 py-2 font-normal" /></label>
              <button type="submit" disabled={busy || roleTargetAccount?.id !== targetUserId.trim()} className="rounded-xl bg-indigo-900 px-4 py-2 font-bold text-white disabled:opacity-50">{isArabic ? 'تنفيذ التغيير' : 'Apply role change'}</button>
              <p className="text-xs text-slate-500">{isArabic ? 'الأدوار بتتضاف ومش بتلغي بعضها. الخادم بيحمي آخر مشرف وبيسجل كل تغيير.' : 'Roles are additive. Last-admin protection and audit logging are enforced server-side.'}</p>
            </form>
          </div>
        </section>
      )}

      {activeTab === 'families' && (
        <section className="space-y-3">
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{isArabic ? 'عرض فقط. مش ممكن نتخطى خطوات التحقق أو نغيّر روابط الأسرة من الشاشة دي.' : 'Read-only view. Verification cannot be bypassed or family links edited here.'}</p>
          {families.map(family => (
            <article key={family.id} className="grid gap-2 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <div><p className="font-black">{family.parent?.name || (isArabic ? 'حساب ولي الأمر' : 'Parent account')}</p><p className="break-all text-xs text-slate-500">{family.parent?.email || family.parent_id}</p></div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-center text-xs font-bold">{family.relationship_type}</span>
              <div><p className="font-black">{family.child?.name || (isArabic ? 'حساب الطفل' : 'Child account')}</p><p className="break-all text-xs text-slate-500">{family.child?.email || family.child_id}</p></div>
              <p className="text-xs text-slate-500 sm:col-span-3">{new Date(family.created_at).toLocaleString(isArabic ? 'ar' : 'en')}</p>
            </article>
          ))}
          {!families.length && !loading && !error && <p className="rounded-2xl border bg-white p-5">{isArabic ? 'مفيش روابط أسرية متسجلة.' : 'No relationships recorded.'}</p>}
        </section>
      )}

      {activeTab === 'classes' && (
        <section className="space-y-4">
          <form onSubmit={event => void assignServant(event)} className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_1fr_auto_auto]">
            <label className="text-sm font-bold">{isArabic ? 'معرّف الخادم' : 'Servant account ID'}<input required value={classServantId} onChange={event => setClassServantId(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 font-normal" /></label>
            <label className="text-sm font-bold">{isArabic ? 'الفصل' : 'Class'}<select required value={classGroupId} onChange={event => setClassGroupId(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"><option value="">{isArabic ? 'اختار فصل' : 'Select a class'}</option>{classes.map(item => <option key={item.id} value={item.class_group_id}>{isArabic ? item.name_ar : item.name_en}</option>)}</select></label>
            <select aria-label={isArabic ? 'إجراء التكليف' : 'Assignment action'} value={classAction} onChange={event => setClassAction(event.target.value as 'ASSIGN' | 'REMOVE')} className="self-end rounded-xl border px-3 py-2"><option value="ASSIGN">{isArabic ? 'تكليف' : 'Assign'}</option><option value="REMOVE">{isArabic ? 'إزالة' : 'Remove'}</option></select>
            <button disabled={busy || !classes.length} className="self-end rounded-xl bg-indigo-900 px-4 py-2 font-bold text-white disabled:opacity-50">{isArabic ? 'حفظ التكليف' : 'Save assignment'}</button>
          </form>
          <form onSubmit={event => void enrollStudent(event)} className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_1fr_auto]">
            <label className="text-sm font-bold">{isArabic ? 'معرّف حساب التلميذ' : 'Student account ID'}<input required value={rosterStudentId} onChange={event => setRosterStudentId(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 font-normal" /></label>
            <label className="text-sm font-bold">{isArabic ? 'الفصل' : 'Class'}<select required value={rosterClassGroupId} onChange={event => setRosterClassGroupId(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"><option value="">{isArabic ? 'اختار فصل' : 'Select a class'}</option>{classes.map(item => <option key={item.id} value={item.class_group_id}>{isArabic ? item.name_ar : item.name_en}</option>)}</select></label>
            <button disabled={busy || !classes.length} className="self-end rounded-xl bg-indigo-900 px-4 py-2 font-bold text-white disabled:opacity-50">{isArabic ? 'إضافة التلميذ' : 'Enroll student'}</button>
            <p className="text-xs text-slate-500 md:col-span-3">{isArabic ? 'الخادم بيتأكد من دور التلميذ والصف المناسب. ولو اتشال من الفصل، سجل عضويته وتاريخه بيفضل محفوظ.' : 'Student role and grade compatibility are verified server-side. Removal preserves membership history.'}</p>
          </form>
          {classes.map(classRoom => (
            <article key={classRoom.id} className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap justify-between gap-2"><h2 className="font-black">{isArabic ? classRoom.name_ar : classRoom.name_en}</h2><span className="text-xs text-slate-500">{classRoom.students.length} {isArabic ? 'تلميذ' : 'students'}</span></div>
              <p className="mt-2 text-sm"><strong>{isArabic ? 'الخدام' : 'Servants'}:</strong> {classRoom.servants.map(item => item.name || item.servant_id).join('، ') || (isArabic ? 'مفيش خادم متكلف بالفصل دلوقتي' : 'No active assignment')}</p>
              <details className="mt-3"><summary className="cursor-pointer text-sm font-bold">{isArabic ? 'اعرض قائمة التلاميذ' : 'View student roster'}</summary><ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">{classRoom.students.map(student => <li key={student.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2"><span className="min-w-0 break-all">{student.name || student.id}<small className="block text-xs text-slate-500">{student.id}</small></span><button type="button" onClick={() => void manageStudent('remove', classRoom.class_group_id, student.id)} disabled={busy} className="shrink-0 rounded-lg border border-rose-200 px-2 py-1 text-xs font-bold text-rose-800 disabled:opacity-50">{isArabic ? 'إزالة' : 'Remove'}</button></li>)}</ul></details>
            </article>
          ))}
          {!classes.length && !loading && !error && <p className="rounded-2xl border bg-white p-5">{isArabic ? 'مفيش فصول متسجلة في السنة الكنسية الحالية.' : 'No classes are configured for the active church year.'}</p>}
        </section>
      )}

      {activeTab === 'curriculum' && (
        <section className="space-y-4">
          <p className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-950">{isArabic ? 'أدوات المنهج بتستخدم خدمات النشر المعتمدة، والشاشة دي مش بتعرض بيانات أو إحصاءات تجريبية.' : 'Curriculum tools use the existing authorized publishing services; no demo content or statistics are shown.'}</p>
          <TeacherPublishingHub
            lang={lang === 'ar' ? 'ar' : 'en'}
            sundaySchoolContent={
              <section className="space-y-4 rounded-2xl border bg-white p-4 sm:p-5">
                <div>
                  <h2 className="text-lg font-black">{isArabic ? 'دروس مدارس الأحد والنشر' : 'Sunday School lessons & publishing'}</h2>
                  <p className="mt-1 text-sm text-slate-600">{isArabic ? 'راجع الدروس الفعلية وحالة نشرها من خلال أدوات النشر المعتمدة.' : 'Review persisted lessons and publication states using the existing trusted publishing workflow.'}</p>
                </div>
                {!canManageCurriculum
                  ? <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{isArabic ? 'بيانات المنهج الموثوقة مش متاحة من غير تسجيل دخول إداري.' : 'Trusted curriculum data is unavailable without an authenticated online admin session.'}</p>
                  : curriculumLoading
                    ? <p role="status" className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{isArabic ? 'بنحمّل المنهج...' : 'Loading curriculum...'}</p>
                    : curriculumError
                      ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{isArabic ? 'مش قادرين نحمّل بيانات المنهج من المصدر الموثوق.' : 'Trusted curriculum data could not be loaded.'} {curriculumError}</p>
                      : <LessonPublicationManager
                        lessons={lessons}
                        lessonVersions={lessonVersions}
                        lang={lang === 'ar' ? 'ar' : 'en'}
                        canManage={canManageCurriculum}
                        role="admin"
                        userId={userData?.id}
                        onRefresh={refreshAdminCurriculum}
                      />}
              </section>
            }
          />
        </section>
      )}

      {(activeTab === 'security' || activeTab === 'role-audit') && (
        <section className="space-y-5">
          <div className="rounded-2xl border bg-white p-4">
            <h2 className="mb-3 flex items-center gap-2 font-black"><ScrollText size={18} />{isArabic ? 'سجل إجراءات الإدارة والدعم' : 'Administrative and support audit'}</h2>
            {auditError ? <p role="alert" className="text-sm text-rose-800">{isArabic ? 'مش قادرين نحمّل سجل المراجعة.' : 'Administrative audit history could not be loaded.'}</p> : <AuditList entries={actionAudit} isArabic={isArabic} />}
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <h2 className="mb-3 flex items-center gap-2 font-black"><ShieldCheck size={18} />{isArabic ? 'سجل تغييرات الأدوار' : 'Role-change audit'}</h2>
            {auditError ? <p role="alert" className="text-sm text-rose-800">{isArabic ? 'مش قادرين نحمّل سجل المراجعة.' : 'Role-change audit history could not be loaded.'}</p> : <AuditList entries={roleAudit} isArabic={isArabic} />}
          </div>
        </section>
      )}

      {activeTab === 'support' && (
        <section className="max-w-2xl rounded-2xl border bg-white p-5">
          <h2 className="font-black">{isArabic ? 'فتح شاشة دعم للعرض فقط' : 'Open a read-only support view'}</h2>
          <p className="mt-2 text-sm text-slate-600">{isArabic ? 'الشاشة دي بتعرض بيانات الحساب وأدواره المعتمدة بس، من غير ما تبدّل جلسة المستخدم أو تدخل بهويته.' : 'Shows verified account profile and role information without switching or impersonating the user session.'}</p>
          <form onSubmit={event => void openSupport(event)} className="mt-4 space-y-3">
            <label className="block text-sm font-bold">{isArabic ? 'رقم الحساب الحساب المستهدف' : 'Target account ID'}<input required value={targetUserId} onChange={event => setTargetUserId(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 font-normal" /></label>
            <label className="block text-sm font-bold">{isArabic ? 'سبب الوصول (مطلوب)' : 'Reason for access (required)'}<textarea required minLength={3} maxLength={1000} value={supportReason} onChange={event => setSupportReason(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 font-normal" /></label>
            <button disabled={busy || Boolean(supportAccount)} className="rounded-xl bg-indigo-900 px-4 py-2 font-bold text-white disabled:opacity-50">{isArabic ? 'افتح شاشة الدعم' : 'Open support view'}</button>
          </form>
          {supportAccount && <article className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="font-black">{supportAccount.name}</p><p>{supportAccount.email}</p><p className="break-all text-xs">{supportAccount.id}</p>
            <p className="mt-2">{supportAccount.roles.map(item => getAdminRoleLabel(item.role, isArabic)).join('، ') || (isArabic ? 'مفيش أدوار نشطة' : 'No active roles')}</p>
            {supportAccount.workspaceData?.studentMemberships.map((membership, index) => <p key={`student-${index}`} className="mt-2 text-sm">{isArabic ? 'فصل التلميذ' : 'Student class'}: {membership.class_instance_id} · {membership.exact_grade} · {membership.status}</p>)}
            {supportAccount.workspaceData?.servantAssignments.map((assignment, index) => <p key={`servant-${index}`} className="mt-2 text-sm">{isArabic ? 'تكليف الخادم' : 'Servant assignment'}: {assignment.class_instance_id}</p>)}
            {supportAccount.workspaceData?.familyLinks.map((relationship, index) => <p key={`family-${index}`} className="mt-2 break-all text-sm">{isArabic ? 'طفل مرتبط' : 'Linked child'}: {relationship.child_id} · {relationship.relationship_type}</p>)}
          </article>}
        </section>
      )}

      {activeTab === 'profile' && <p className="rounded-2xl border bg-white p-5">{isArabic ? 'تقدر تفتح إعدادات الحساب من قائمة الحساب.' : 'Account settings are available from the account menu.'}</p>}
    </main>
  );
}

function AuditList({ entries, isArabic }: { entries: AuditEntry[]; isArabic: boolean }) {
  if (!entries.length) return <p className="text-sm text-slate-500">{isArabic ? 'مفيش أحداث متسجلة.' : 'No audit events recorded.'}</p>;
  return <div className="space-y-2">{entries.map(entry => (
    <article key={entry.id} className="rounded-xl border p-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <strong>{entry.operation || entry.action}</strong>
        <time className="text-xs text-slate-500">{new Date(entry.occurred_at).toLocaleString(isArabic ? 'ar' : 'en')}</time>
      </div>
      <p className="mt-1 break-all text-xs text-slate-600">{isArabic ? 'اللي نفّذ الإجراء' : 'Actor'}: {entry.actor_id || '—'} · {isArabic ? 'الحساب المستهدف' : 'Target'}: {entry.target_user_id || '—'}</p>
      {(entry.previous_role || entry.new_role || entry.requested_role) && <p className="mt-1 text-xs text-slate-500">{entry.previous_role || '—'} → {entry.new_role || entry.requested_role || '—'}</p>}
      {entry.reason && <p className="mt-2">{entry.reason}</p>}
      {entry.details && Object.keys(entry.details).length > 0 && <pre className="mt-2 overflow-auto text-xs text-slate-500">{JSON.stringify(entry.details, null, 2)}</pre>}
    </article>
  ))}</div>;
}
