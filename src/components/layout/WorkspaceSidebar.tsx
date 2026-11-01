import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Language } from '../../types';
import type { Workspace } from '../../lib/workspaces';
import { getWorkspaceNavigation } from './workspaceNavigation';

interface WorkspaceSidebarProps {
  workspace: Workspace;
  activeTab: string;
  lang: Language;
  onNavigate: (tab: string) => void;
}

export function WorkspaceSidebar({ workspace, activeTab, lang, onNavigate }: WorkspaceSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const items = getWorkspaceNavigation(workspace, lang);
  const groups = [...new Set(items.map(item => item.group))];
  const groupLabels: Record<string, string> = lang === 'ar'
    ? { main: 'الرئيسية', progress: 'التقدم', learn: 'التعلّم', account: 'الحساب', family: 'الأسرة', updates: 'التواصل', classes: 'الفصول', curriculum: 'المناهج', community: 'المجتمع', accounts: 'الحسابات', management: 'الإدارة', oversight: 'الرقابة' }
    : { main: 'Workspace', progress: 'Progress', learn: 'Learning', account: 'Account', family: 'Family', updates: 'Updates', classes: 'Classes', curriculum: 'Curriculum', community: 'Community', accounts: 'Accounts', management: 'Management', oversight: 'Oversight' };
  const CollapseIcon = lang === 'ar'
    ? (collapsed ? ChevronLeft : ChevronRight)
    : (collapsed ? ChevronRight : ChevronLeft);

  return (
    <aside className={`workspace-sidebar hidden lg:flex lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:flex-col lg:shrink-0 lg:border-e lg:border-[var(--border-default)] lg:bg-[var(--surface-primary)]/95 lg:backdrop-blur transition-[width] duration-200 ${collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64 xl:w-72'}`}>
      <div className={`flex items-center border-b border-[var(--border-default)] px-3 py-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && <span className="text-xs font-black uppercase tracking-wide text-[var(--text-secondary)]">{lang === 'ar' ? 'مساحة العمل' : 'Workspace'}</span>}
        <button
          type="button"
          onClick={() => setCollapsed(value => !value)}
          aria-label={collapsed
            ? (lang === 'ar' ? 'توسيع القائمة الجانبية' : 'Expand sidebar')
            : (lang === 'ar' ? 'طي القائمة الجانبية' : 'Collapse sidebar')}
          aria-expanded={!collapsed}
          className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--state-hover)] hover:text-[var(--text-primary)]"
        >
          <CollapseIcon size={17} />
        </button>
      </div>
      <nav aria-label={lang === 'ar' ? 'التنقل بين أقسام مساحة العمل' : 'Workspace navigation'} className="min-h-0 flex-1 overflow-y-auto p-2">
        {groups.map(group => (
          <section key={group} className="mb-3">
            {!collapsed && <h2 className="px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-wider text-[var(--text-tertiary)]">{groupLabels[group]}</h2>}
            <div className="space-y-1">
              {items.filter(item => item.group === group).map(item => {
                const Icon = item.icon;
                const active = activeTab === item.id || (workspace === 'admin' && item.id === 'roles' && activeTab === 'role-requests')
                  || (workspace === 'admin' && item.id === 'security' && activeTab === 'role-audit');
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-start text-sm font-bold transition-colors ${collapsed ? 'justify-center px-2' : ''} ${active ? 'bg-[var(--state-selected)] text-[var(--action-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--state-hover)] hover:text-[var(--text-primary)]'}`}
                  >
                    <Icon size={18} className="shrink-0" />
                    {!collapsed && <span className="min-w-0 truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}
