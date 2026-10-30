import React from 'react';
import { Home, Trophy, MessageCircle, User, Sparkles, Users } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { playSound } from '../../utils/audio';
import { mockLessons } from '../../data';
import { useLessons } from '../../context/LessonsContext';
import { Language } from '../../types';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lang: Language;
  userRole?: string;
}

export function BottomNav({ activeTab, setActiveTab, lang, userRole }: BottomNavProps) {
  const { lessons } = useLessons();
  const reduceMotion = useReducedMotion();

  const currentLessons = lessons || mockLessons;
  const hasNewLessons = currentLessons.some(l => l.status === 'published' && !l.isCompleted);

  const isTeacher = userRole === 'teacher' || userRole === 'admin';
  const isParent = userRole === 'parent' || userRole === 'admin';

  const navItems = [
    { id: 'home', label: lang === 'ar' ? 'الرئيسية' : 'Home', icon: Home },
    { id: 'lessons', label: lang === 'ar' ? 'الدروس' : 'Lessons', icon: Sparkles, hasBadge: hasNewLessons },
    { id: 'feed', label: lang === 'ar' ? 'المنشورات' : 'Feed', icon: MessageCircle },
    ...(isTeacher ? [{
      id: 'studio',
      label: lang === 'ar' ? 'الخادم' : 'Servant',
      icon: Users,
      highlight: true
    }] : []),
    ...(isParent && (!isTeacher || userRole === 'admin') ? [{
      id: 'family',
      label: lang === 'ar' ? 'الأهل' : 'Family',
      icon: Users,
      highlight: true
    }] : []),
    { id: 'points', label: lang === 'ar' ? 'الترتيب' : 'Ranking', icon: Trophy },
    { id: 'profile', label: lang === 'ar' ? 'حسابي' : 'Profile', icon: User },
  ];

  return (
    <nav aria-label={lang === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'} className="app-bottom-nav fixed bottom-0 w-full border-t pb-safe shadow-[0_-4px_25px_-8px_rgba(10,30,35,0.18)] z-50 transition-colors">
      <div className="flex justify-around items-center h-16 sm:h-20 max-w-lg md:max-w-4xl lg:max-w-6xl mx-auto px-0.5 sm:px-4 md:px-6 relative overflow-x-auto scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => { playSound('click'); setActiveTab(item.id); }}
              aria-current={isActive ? 'page' : undefined}
              className={`app-bottom-nav-item flex flex-col items-center justify-center flex-1 min-w-[48px] h-full relative z-10 transition-colors cursor-pointer px-0.5 ${isActive ? 'is-active' : ''}`}
            >
              {isActive && (
                <span aria-hidden="true" className="app-bottom-nav-indicator absolute top-0 inset-x-2 sm:inset-x-3.5 h-[3px] rounded-b-full" />
              )}
              
              <div className="relative">
                <span className={`app-bottom-nav-icon inline-flex rounded-full p-1 sm:p-1.5 transition-colors ${isActive ? 'is-active' : ''}`}>
                  <Icon 
                    size={20} 
                    strokeWidth={isActive ? 2.5 : 2} 
                    className="sm:w-5 sm:h-5"
                  />
                </span>
                {item.hasBadge && (
                  <span className="absolute top-1 end-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[var(--feedback-error)] rounded-full border-2 border-[var(--surface-primary)] shadow-xs" />
                )}
              </div>
              
              <motion.span
                animate={isActive ? { y: 0, opacity: 1 } : { y: reduceMotion ? 0 : 1, opacity: 0.9 }}
                transition={{ duration: reduceMotion ? 0 : 0.12 }}
                className={`text-[9px] sm:text-[10px] md:text-xs mt-0.5 font-bold tracking-tight truncate max-w-full ${
                  isActive ? 'font-black' : ''
                }`}
              >
                {item.label}
              </motion.span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
