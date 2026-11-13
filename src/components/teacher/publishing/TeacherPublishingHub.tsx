import React, { useEffect, useState } from 'react';
import {
  School,
  Music,
  BookOpen,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Language } from '../../../types';
import { HymnsPublishingStudio } from './HymnsPublishingStudio';
import { TaxisPublishingStudio } from './TaxisPublishingStudio';
import { CurriculumImportCenter } from './CurriculumImportCenter';

export type PublishingMode = 'sunday_school' | 'hymns' | 'taxis' | 'import';

interface TeacherPublishingHubProps {
  lang?: Language;
  onPreviewLesson?: (lessonId: string) => void;
  initialMode?: PublishingMode;
  // Sunday School studio content rendered as children or callback
  sundaySchoolContent?: React.ReactNode;
}

export function TeacherPublishingHub({
  lang = 'ar',
  onPreviewLesson,
  sundaySchoolContent,
  initialMode = 'sunday_school'
}: TeacherPublishingHubProps) {
  const isAr = lang === 'ar';
  const [publishingMode, setPublishingMode] = useState<PublishingMode>(initialMode);

  useEffect(() => {
    setPublishingMode(initialMode);
  }, [initialMode]);

  const modes = [
    {
      id: 'sunday_school' as const,
      icon: School,
      title: isAr ? 'مدارس الأحد' : 'Sunday School',
      description: isAr ? 'تخطيط الدروس وتأليفها وربطها بالفصول.' : 'Plan and author lessons, then connect them to class sessions.',
      detail: isAr ? 'المناهج والدروس' : 'CURRICULUM'
    },
    {
      id: 'hymns' as const,
      icon: Music,
      title: isAr ? 'مدرسة الألحان' : 'Hymns School',
      description: isAr ? 'إدارة الألحان ومستوياتها ومحتواها الصوتي.' : 'Manage hymns, learning levels, and audio content.',
      detail: isAr ? '٣ مستويات' : '3 LEVELS'
    },
    {
      id: 'taxis' as const,
      icon: BookOpen,
      title: isAr ? 'طقوس الكنيسة — التاكسيس' : 'Coptic Rituals — Taxis',
      description: isAr ? 'تنظيم الطقوس والأقسام والمرفقات التعليمية.' : 'Organize rites, sections, and supporting materials.',
      detail: isAr ? 'الطقوس والمردات' : 'RITES & RESPONSES'
    },
    {
      id: 'import' as const,
      icon: Sparkles,
      title: isAr ? 'استيراد المناهج' : 'Curriculum import',
      description: isAr ? 'مراجعة الملفات وتجهيزها قبل استيرادها.' : 'Review and prepare curriculum files before importing.',
      detail: isAr ? 'تجهيز دفعة ملفات' : 'BATCH WORKFLOW'
    }
  ];
  const activeMode = modes.find(mode => mode.id === publishingMode) || modes[0];
  const ActiveModeIcon = activeMode.icon;

  return (
    <div className="space-y-6" dir="rtl">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-[var(--shadow-card)]">
        <div className="relative overflow-hidden bg-[linear-gradient(115deg,#102a34_0%,#174b54_62%,#8c682f_140%)] p-5 text-white sm:p-7 lg:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -end-12 -top-20 h-64 w-64 rounded-full border border-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute end-10 top-4 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,.2),transparent_70%)]" />
          <div className="relative grid items-center gap-5 md:grid-cols-[1fr_auto]">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[.18em] text-amber-200">
                {isAr ? 'المناهج والنشر' : 'CURRICULUM & PUBLISHING'}
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                {isAr ? 'منهج حيّ، منظم، وجاهز للخدمة' : 'A living curriculum, ready for service'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-teal-50/80">
                {isAr
                  ? 'اختر المجال الذي تعمل عليه؛ ستبقى أدوات التأليف والمراجعة والنشر المتخصصة في مساحتها.'
                  : 'Choose a curriculum area. Its dedicated authoring, review, and publishing tools stay in their own workspace.'}
              </p>
            </div>
            <div aria-hidden="true" className="relative hidden h-32 w-32 items-center justify-center md:flex">
              <div className="absolute inset-2 rounded-full border border-amber-100/25" />
              <div className="absolute inset-5 rounded-full border border-white/15" />
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-amber-200 shadow-xl backdrop-blur">
                <ActiveModeIcon size={34} strokeWidth={1.7} />
              </div>
              <span className="absolute end-2 top-1 h-2.5 w-2.5 rounded-full bg-amber-200 shadow-[0_0_18px_rgba(253,230,138,.8)]" />
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
          {modes.map(({ id, icon: Icon, title, description, detail }) => {
            const selected = publishingMode === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() => setPublishingMode(id)}
                className={`group relative flex min-h-36 flex-col items-start rounded-2xl border p-4 text-start transition duration-200 hover:-translate-y-0.5 ${
                  selected
                    ? 'border-teal-700 bg-teal-50 shadow-[0_12px_30px_-20px_rgba(15,80,83,.65)] dark:border-teal-400/50 dark:bg-teal-950/45'
                    : 'border-[var(--border-default)] bg-[var(--surface-secondary)] hover:border-amber-500/50 hover:bg-[var(--surface-primary)]'
                }`}
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  selected
                    ? 'bg-teal-800 text-amber-200 dark:bg-teal-700'
                    : 'bg-[var(--surface-primary)] text-[var(--action-primary)]'
                }`}>
                  <Icon size={20} />
                </span>
                <span className="mt-3 flex w-full items-center justify-between gap-2">
                  <span className="text-sm font-black text-[var(--text-primary)]">{title}</span>
                  {selected && <ChevronRight size={16} className="shrink-0 text-[var(--action-primary)] rtl:rotate-180" />}
                </span>
                <span className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{description}</span>
                <span className="mt-3 text-[10px] font-black tracking-[.12em] text-[var(--action-primary)]">{detail}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section id="curriculum-workspace" aria-label={activeMode.title} className="min-w-0">
        {publishingMode === 'sunday_school' && (
          <div>
          {sundaySchoolContent}
          </div>
        )}

        {publishingMode === 'hymns' && (
          <HymnsPublishingStudio lang={lang} />
        )}

        {publishingMode === 'taxis' && (
          <TaxisPublishingStudio lang={lang} />
        )}

        {publishingMode === 'import' && (
          <CurriculumImportCenter lang={lang} />
        )}

      </section>
    </div>
  );
}
