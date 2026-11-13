import React, { useEffect, useState } from 'react';
import { Ellipsis, X, type LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { playSound } from '../../utils/audio';
import { mockLessons } from '../../data';
import { useLessons } from '../../context/LessonsContext';
import { Language } from '../../types';
import type { Workspace } from '../../lib/workspaces';
import { getPrimaryNavigationIds, getWorkspaceNavigation } from './workspaceNavigation';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lang: Language;
  workspace: Workspace;
}

export function BottomNav({ activeTab, setActiveTab, lang, workspace }: BottomNavProps) {
  const { lessons } = useLessons();
  const reduceMotion = useReducedMotion();
  const [moreOpen, setMoreOpen] = useState(false);
  const currentLessons = lessons || mockLessons;
  const hasNewLessons = currentLessons.some(lesson => lesson.status === 'published' && !lesson.isCompleted);
  const allItems = getWorkspaceNavigation(workspace, lang);
  const primaryIds = getPrimaryNavigationIds(workspace);
  const primaryItems = allItems.filter(item => primaryIds.includes(item.id));
  const moreItems = allItems.filter(item => !primaryIds.includes(item.id));
  const isMoreActive = moreItems.some(item => item.id === activeTab);

  useEffect(() => {
    setMoreOpen(false);
  }, [activeTab, workspace]);

  const navigate = (tab: string) => {
    playSound('click');
    setMoreOpen(false);
    setActiveTab(tab);
  };

  const renderItem = (item: { id: string; label: string; mobileLabel: string; icon: LucideIcon }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const hasBadge = item.id === 'lessons' && hasNewLessons;
    return (
      <button
        type="button"
        key={item.id}
        onClick={() => navigate(item.id)}
        aria-current={isActive ? 'page' : undefined}
        aria-label={item.label}
        className={`app-bottom-nav-item flex min-w-0 flex-1 flex-col items-center justify-center h-full relative z-10 transition-colors cursor-pointer px-0.5 ${isActive ? 'is-active' : ''}`}
      >
        {isActive && <span aria-hidden="true" className="app-bottom-nav-indicator absolute top-0 inset-x-2 h-[3px] rounded-b-full" />}
        <span className="relative">
          <span className={`app-bottom-nav-icon inline-flex rounded-full p-1 transition-colors ${isActive ? 'is-active' : ''}`}>
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
          </span>
          {hasBadge && <span className="absolute top-0 end-0 h-2 w-2 rounded-full border-2 border-[var(--surface-primary)] bg-[var(--feedback-error)]" />}
        </span>
        <motion.span
          animate={isActive ? { y: 0, opacity: 1 } : { y: reduceMotion ? 0 : 1, opacity: 0.9 }}
          transition={{ duration: reduceMotion ? 0 : 0.12 }}
          className={`mt-0.5 max-w-full truncate text-[9px] font-bold tracking-tight sm:text-[10px] ${isActive ? 'font-black' : ''}`}
        >
          {item.mobileLabel}
        </motion.span>
      </button>
    );
  };

  return (
    <nav aria-label={lang === 'ar' ? 'القائمة الرئيسية' : 'Main navigation'} className="app-bottom-nav fixed bottom-0 z-50 w-full border-t pb-safe shadow-[0_-4px_25px_-8px_rgba(10,30,35,0.18)] transition-colors lg:hidden">
      {moreOpen && (
        <>
          <button type="button" aria-label={lang === 'ar' ? 'اقفل القائمة الإضافية' : 'Close additional navigation'} onClick={() => setMoreOpen(false)} className="fixed inset-0 z-[49] bg-black/20" />
          <div className="absolute inset-x-3 bottom-full z-[51] mb-2 max-h-[65dvh] overflow-y-auto rounded-2xl border border-[var(--border-default)] bg-[var(--surface-overlay)] p-2 text-[var(--text-primary)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] px-2 pb-2">
              <p className="text-sm font-black">{lang === 'ar' ? 'أقسام أكتر' : 'More destinations'}</p>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label={lang === 'ar' ? 'اقفل' : 'Close'} className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--state-hover)]"><X size={17} /></button>
            </div>
            <div className="grid gap-1 pt-2 sm:grid-cols-2">
              {moreItems.map(item => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-start text-sm font-bold ${active ? 'bg-[var(--state-selected)] text-[var(--action-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--state-hover)] hover:text-[var(--text-primary)]'}`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
      <div className="relative mx-auto flex h-16 max-w-2xl items-center px-1 sm:h-[4.5rem] sm:px-4">
        {primaryItems.map(renderItem)}
        {moreItems.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen(open => !open)}
            aria-expanded={moreOpen}
            aria-haspopup="true"
            aria-label={lang === 'ar' ? 'أقسام أكتر' : 'More destinations'}
            className={`app-bottom-nav-item relative z-10 flex h-full min-w-0 flex-1 flex-col items-center justify-center px-0.5 text-[var(--text-secondary)] transition-colors ${isMoreActive || moreOpen ? 'is-active text-[var(--action-primary)]' : ''}`}
          >
            {(isMoreActive || moreOpen) && <span aria-hidden="true" className="app-bottom-nav-indicator absolute top-0 inset-x-2 h-[3px] rounded-b-full" />}
            <span className={`app-bottom-nav-icon inline-flex rounded-full p-1 ${isMoreActive || moreOpen ? 'is-active' : ''}`}><Ellipsis size={20} /></span>
            <span className="mt-0.5 text-[9px] font-bold sm:text-[10px]">{lang === 'ar' ? 'المزيد' : 'More'}</span>
          </button>
        )}
      </div>
    </nav>
  );
}
