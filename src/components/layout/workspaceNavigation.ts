import {
  Activity,
  Award,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Eye,
  FileText,
  FolderOpen,
  Home,
  LockKeyhole,
  MessageCircle,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  UserCheck,
  Users,
  type LucideIcon
} from 'lucide-react';
import type { Language, Role } from '../../types';

export interface WorkspaceNavigationItem {
  id: string;
  icon: LucideIcon;
  group: string;
  label: string;
  mobileLabel: string;
}

const navigation: Record<Role, Array<{ id: string; icon: LucideIcon; group: string; ar: string; en: string }>> = {
  student: [
    { id: 'home', icon: Home, group: 'main', ar: 'الرئيسية', en: 'Home' },
    { id: 'lessons', icon: Sparkles, group: 'main', ar: 'الدروس', en: 'Lessons' },
    { id: 'feed', icon: MessageCircle, group: 'main', ar: 'المنشورات', en: 'Feed' },
    { id: 'points', icon: Award, group: 'progress', ar: 'الإنجازات والترتيب', en: 'Achievements & ranking' },
    { id: 'profile', icon: User, group: 'account', ar: 'حسابي', en: 'My profile' }
  ],
  parent: [
    { id: 'home', icon: Home, group: 'family', ar: 'نظرة عامة', en: 'Overview' },
    { id: 'children', icon: Users, group: 'family', ar: 'أولادي', en: 'My children' },
    { id: 'journey', icon: BookOpen, group: 'family', ar: 'رحلة أولادي', en: 'Learning journey' },
    { id: 'family', icon: ShieldCheck, group: 'family', ar: 'إعدادات الأسرة', en: 'Family controls' },
    { id: 'events', icon: CalendarDays, group: 'updates', ar: 'الأخبار والفعاليات', en: 'News & events' },
    { id: 'feed', icon: MessageCircle, group: 'updates', ar: 'المنشورات', en: 'Feed' },
    { id: 'profile', icon: User, group: 'account', ar: 'حسابي', en: 'My profile' }
  ],
  teacher: [
    { id: 'home', icon: Home, group: 'main', ar: 'الرئيسية', en: 'Servant home' },
    { id: 'studio', icon: BookOpen, group: 'main', ar: 'استوديو الخادم', en: 'Servant Studio' },
    { id: 'classManagement', icon: Users, group: 'classes', ar: 'الفصول والطلاب', en: 'Classes & students' },
    { id: 'attendance', icon: UserCheck, group: 'classes', ar: 'الحضور والافتقاد', en: 'Attendance' },
    { id: 'mastery', icon: Award, group: 'classes', ar: 'تقدم الطلاب والاختبارات', en: 'Student progress & quizzes' },
    { id: 'lessons', icon: FileText, group: 'curriculum', ar: 'مراجعة الدروس', en: 'Lesson review' },
    { id: 'sundaySchool', icon: ClipboardList, group: 'curriculum', ar: 'المناهج والنشر', en: 'Curriculum & publishing' },
    { id: 'sources', icon: FolderOpen, group: 'curriculum', ar: 'مصادر ووسائط الدروس', en: 'Lesson sources & media' },
    { id: 'preview', icon: Eye, group: 'curriculum', ar: 'معاينة رحلة التلميذ', en: 'Student experience preview' },
    { id: 'ai', icon: Sparkles, group: 'curriculum', ar: 'توليد الدروس', en: 'Lesson generation' },
    { id: 'feed', icon: MessageCircle, group: 'community', ar: 'المنشورات', en: 'Feed' },
    { id: 'moderation', icon: Shield, group: 'community', ar: 'الإشراف', en: 'Moderation' },
    { id: 'profile', icon: User, group: 'account', ar: 'حسابي', en: 'My profile' }
  ],
  admin: [
    { id: 'home', icon: Home, group: 'main', ar: 'نظرة عامة', en: 'Overview' },
    { id: 'accounts', icon: Users, group: 'accounts', ar: 'الحسابات', en: 'Accounts' },
    { id: 'roles', icon: ShieldCheck, group: 'accounts', ar: 'الأدوار والطلبات', en: 'Roles & requests' },
    { id: 'families', icon: Users, group: 'management', ar: 'الأسر', en: 'Families' },
    { id: 'classes', icon: ClipboardList, group: 'management', ar: 'الفصول', en: 'Classes' },
    { id: 'curriculum', icon: BookOpen, group: 'management', ar: 'المناهج', en: 'Curriculum' },
    { id: 'security', icon: LockKeyhole, group: 'oversight', ar: 'الأمان والتدقيق', en: 'Security & audit' },
    { id: 'support', icon: Activity, group: 'oversight', ar: 'وضع الدعم', en: 'Support mode' },
    { id: 'profile', icon: Settings, group: 'account', ar: 'إعدادات الحساب', en: 'Account settings' }
  ]
};

const primaryIds: Record<Role, readonly string[]> = {
  student: ['home', 'lessons', 'feed', 'points', 'profile'],
  parent: ['home', 'children', 'journey', 'feed', 'family'],
  teacher: ['home', 'studio', 'classManagement', 'feed', 'attendance'],
  admin: ['home', 'accounts', 'roles', 'classes']
};

const mobileLabels: Partial<Record<Role, Record<string, { ar: string; en: string }>>> = {
  student: {
    points: { ar: 'الترتيب', en: 'Ranking' }
  },
  parent: {
    children: { ar: 'الأولاد', en: 'Children' },
    journey: { ar: 'الرحلة', en: 'Journey' },
    family: { ar: 'الأسرة', en: 'Family' }
  },
  teacher: {
    studio: { ar: 'الاستوديو', en: 'Studio' },
    classManagement: { ar: 'الفصول', en: 'Classes' }
  },
  admin: {
    roles: { ar: 'الأدوار', en: 'Roles' }
  }
};

export function getWorkspaceNavigation(workspace: Role, lang: Language): WorkspaceNavigationItem[] {
  return navigation[workspace].map(item => {
    const mobileLabel = mobileLabels[workspace]?.[item.id];
    return {
      id: item.id,
      icon: item.icon,
      group: item.group,
      label: lang === 'ar' ? item.ar : item.en,
      mobileLabel: mobileLabel ? (lang === 'ar' ? mobileLabel.ar : mobileLabel.en) : (lang === 'ar' ? item.ar : item.en)
    };
  });
}

export function getPrimaryNavigationIds(workspace: Role): readonly string[] {
  return primaryIds[workspace];
}

export function getWorkspacePageLabel(workspace: Role, tab: string, lang: Language): string {
  return getWorkspaceNavigation(workspace, lang).find(item => item.id === tab)?.label
    || (lang === 'ar' ? 'مساحة العمل' : 'Workspace');
}
