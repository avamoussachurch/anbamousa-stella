import React, { useState } from 'react';
import { Palette, Type, Layout, Volume2, ShieldCheck, Check, Sparkles, RefreshCw, BookOpenCheck, CalendarDays, Flame, UsersRound } from 'lucide-react';
import { Language } from '../../types';
import { t } from '../../localization/i18n';
import { CopticButton } from './CopticButton';
import { CopticCard } from './CopticCard';
import { CopticBadge } from './CopticBadge';
import { TrilingualReader, TrilingualVerse } from './TrilingualReader';
import { CopticAudioPlayer } from './CopticAudioPlayer';
import {
  StellaCard,
  StellaBarChart,
  StellaErrorState,
  StellaEmptyState,
  StellaFormField,
  StellaInput,
  StellaMetricCard,
  StellaPageHeader,
  StellaProgressBar,
  StellaProgressRing,
  StellaSelect,
  StellaSectionTitle,
  StellaStatusLabel,
  StellaTimeline,
} from './StellaVisualFoundation';

interface DesignSystemPageProps {
  lang: Language;
  setLang: (l: Language) => void;
}

export const DesignSystemPage: React.FC<DesignSystemPageProps> = ({ lang, setLang }) => {
  const [activeTab, setActiveTab] = useState<'tokens' | 'typography' | 'components' | 'reader' | 'audio'>('tokens');
  const [buttonLoading, setButtonLoading] = useState(false);

  // Sample Trilingual verses for live demonstration
  const sampleVerses: TrilingualVerse[] = [
    {
      id: 'v1',
      coptic: 'Ⲡⲓⲭ̀ⲣⲓⲥⲧⲟⲥ ⲁϥⲧⲱⲛϥ ⲉ̀ⲃⲟⲗ ϧⲉⲛ ⲛⲏⲉⲑⲙⲱⲟⲩⲧ: ϧⲉⲛ ⲟⲩⲙⲟⲩ ⲁϥϣⲱⲙ ⲉ̀ⲡⲓⲙⲟⲩ',
      arabic: 'المسيح قام من بين الأموات، بالموت داس الموت، والذين في القبور أنعم عليهم بالحياة الأبدية.',
      english: 'Christ is risen from the dead, by death He trampled death, and on those in the graves He bestowed life.'
    },
    {
      id: 'v2',
      coptic: 'Ⲁⲣⲓⲡⲁⲙⲉⲩⲓ ⲡ̀Ϭⲟⲓⲥ ⲛ̀ⲧⲉ ⲧⲉⲕⲉⲕⲕⲗⲏⲥⲓⲁ ⲉⲑⲟⲩⲁⲃ ⲛ̀ⲕⲁⲑⲟⲗⲓⲕⲏ ⲛ̀ⲁⲡⲟⲥⲧⲟⲗⲓⲕⲏ',
      arabic: 'اذكر يا رب كنيستك المقدسة الجامعة الرسولية التي لك من أقاصي المسكونة إلى أقاصيها.',
      english: 'Remember, O Lord, Your holy, catholic, and apostolic Church, which exists from the ends of the world to its ends.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-[var(--brand-burgundy)] text-white p-6 rounded-3xl shadow-md border border-[var(--brand-burgundy-dark)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">☦</span>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand-gold)]">
              Coptic Orthodox Design System • v2.0
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            {lang === 'copt'
              ? 'Ⲡⲓⲥⲩⲥⲧⲏⲙⲁ ⲛ̀ⲧⲉ ⲡⲓⲥⲙⲟⲧ ⲛ̀ⲣⲉⲙⲛ̀ⲭⲏⲙⲓ'
              : lang === 'ar'
                ? 'نظام التصميم الكنسي القبطي الأرثوذكسي'
                : 'Coptic Orthodox Living Design System'}
          </h1>
          <p className="text-sm text-white/80 max-w-2xl mt-1">
            Three first-class languages: English, Arabic, and Bohairic Coptic. Engineered with authentic design tokens, reverent liturgical colors, and dual typography roles.
          </p>
        </div>

        {/* Quick Language Switch in Design System */}
        <div className="flex items-center gap-2 bg-black/25 p-1.5 rounded-2xl border border-white/10 shrink-0">
          <span className="text-xs font-semibold px-2 text-white/80">Locale:</span>
          {(['en', 'ar', 'cop'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                lang === l || (l === 'cop' && lang === 'copt')
                  ? 'bg-[var(--brand-gold)] text-[var(--brand-burgundy-dark)] shadow-xs'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[var(--border-stone)]">
        {[
          { id: 'tokens', label: 'Color Tokens', icon: <Palette size={16} /> },
          { id: 'typography', label: 'Typography Roles', icon: <Type size={16} /> },
          { id: 'components', label: 'Component Library', icon: <Layout size={16} /> },
          { id: 'reader', label: 'Trilingual Reader', icon: <Sparkles size={16} /> },
          { id: 'audio', label: 'Audio Engine', icon: <Volume2 size={16} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[var(--brand-burgundy)] text-white shadow-xs'
                : 'text-[var(--text-ink)] hover:bg-[var(--surface-elevated)] border border-transparent'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: DESIGN TOKENS */}
      {activeTab === 'tokens' && (
        <div className="space-y-6">
          {/* Brand Palette */}
          <div>
            <h2 className="text-lg font-bold text-[var(--brand-burgundy)] dark:text-[var(--brand-gold)] mb-3">
              1. Brand Palette Tokens
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { name: 'Deep Burgundy', hex: '#6F1D2A', token: '--brand-burgundy', role: 'Primary Liturgical', textLight: true },
                { name: 'Primary Dark', hex: '#4E111B', token: '--brand-burgundy-dark', role: 'Borders & Focus', textLight: true },
                { name: 'Church Blue', hex: '#0B2E5C', token: '--brand-blue', role: 'Secondary Accents', textLight: true },
                { name: 'Dark Ink', hex: '#241F1C', token: '--text-ink', role: 'Primary Typography', textLight: true },
                { name: 'Warm Ivory', hex: '#F7F2E8', token: '--bg-ivory', role: 'Canvas Background', textLight: false },
                { name: 'Parchment', hex: '#EEE3CF', token: '--bg-parchment', role: 'Elevated Surfaces', textLight: false },
                { name: 'Antique Gold', hex: '#B58A3A', token: '--brand-gold', role: 'Doxology & Accents', textLight: true },
                { name: 'Accessible Gold', hex: '#7A5A1E', token: '--brand-gold-dark', role: 'Readable Gold Text', textLight: true },
                { name: 'Warm Stone', hex: '#D8CCB8', token: '--border-stone', role: 'Subtle Dividers', textLight: false },
                { name: 'Muted Stone', hex: '#A99D8C', token: '--text-muted-stone', role: 'Supporting Labels', textLight: false }
              ].map((c) => (
                <div key={c.token} className="bg-[var(--surface-card)] border border-[var(--border-stone)] rounded-2xl overflow-hidden shadow-xs">
                  <div
                    className="h-16 w-full flex items-end p-2"
                    style={{ backgroundColor: c.hex }}
                  >
                    <span className={`text-[10px] font-mono font-bold ${c.textLight ? 'text-white' : 'text-stone-900'}`}>
                      {c.hex}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-[var(--text-ink)]">{c.name}</p>
                    <p className="text-[10px] font-mono text-[var(--color-neutral)]">{c.token}</p>
                    <p className="text-[10px] text-[var(--brand-burgundy)] dark:text-[var(--brand-gold)] font-medium mt-1">{c.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Semantic Status Tokens */}
          <div>
            <h2 className="text-lg font-bold text-[var(--brand-burgundy)] dark:text-[var(--brand-gold)] mb-3">
              2. Semantic Status Tokens (Accessible WCAG AA)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { name: 'Success', hex: '#2F6B4F', token: '--color-success', badge: 'Completed' },
                { name: 'Warning', hex: '#8A5A00', token: '--color-warning', badge: 'Review Needed' },
                { name: 'Danger', hex: '#A33D35', token: '--color-danger', badge: 'Action Required' },
                { name: 'Info', hex: '#356A9A', token: '--color-info', badge: 'Information' },
                { name: 'Neutral', hex: '#6B6258', token: '--color-neutral', badge: 'Archived' }
              ].map((s) => (
                <div key={s.token} className="bg-[var(--surface-card)] border border-[var(--border-stone)] rounded-2xl p-3 shadow-xs">
                  <div className="w-full h-8 rounded-lg mb-2" style={{ backgroundColor: s.hex }} />
                  <p className="text-xs font-bold text-[var(--text-ink)]">{s.name}</p>
                  <p className="text-[10px] font-mono text-[var(--color-neutral)]">{s.hex}</p>
                  <div className="mt-2">
                    <CopticBadge variant={s.name.toLowerCase() as any} size="sm" dot>
                      {s.badge}
                    </CopticBadge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TYPOGRAPHY SYSTEM */}
      {activeTab === 'typography' && (
        <div className="space-y-6">
          <CopticCard variant="sacred" padding="md">
            <h2 className="text-lg font-bold text-[var(--brand-burgundy)] dark:text-[var(--brand-gold)] mb-4">
              Dual Coptic Typography Roles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Role 1: Coptic UI */}
              <div className="bg-[var(--surface-elevated)] p-4 rounded-2xl border border-[var(--border-stone)]">
                <CopticBadge variant="blue" className="mb-2">ROLE 1: Coptic UI Font</CopticBadge>
                <p className="text-xs text-[var(--color-neutral)] mb-2">
                  Optimized for buttons, badges, tables, and microcopy navigation.
                </p>
                <div dir="ltr" className="coptic-ui text-xl font-bold text-[var(--brand-burgundy)] dark:text-[var(--brand-gold)] p-3 bg-[var(--surface-card)] rounded-xl border border-[var(--border-stone)]">
                  Ϯⲉⲕⲕⲗⲏⲥⲓⲁ ⲛ̀ⲧⲉ Ⲫⲁⲅⲓⲟⲥ Ⲁⲃⲃⲁ Ⲙⲱⲩⲥⲏⲥ ⲡⲓϫⲱⲣⲓ
                </div>
                <p className="text-[11px] font-mono text-[var(--color-neutral)] mt-2">
                  font-family: var(--font-coptic-ui); /* Noto Sans Coptic */
                </p>
              </div>

              {/* Role 2: Coptic Sacred */}
              <div className="bg-[var(--surface-elevated)] p-4 rounded-2xl border border-[var(--border-stone)]">
                <CopticBadge variant="gold" className="mb-2">ROLE 2: Coptic Sacred Font</CopticBadge>
                <p className="text-xs text-[var(--color-neutral)] mb-2">
                  Traditional ecclesiastical script for scripture, psalms, and liturgical chant books.
                </p>
                <div dir="ltr" className="coptic-sacred text-2xl font-bold text-[var(--brand-burgundy)] dark:text-[var(--brand-gold)] p-3 bg-[var(--surface-card)] rounded-xl border border-[var(--border-stone)] leading-relaxed">
                  Ⲡⲓⲭ̀ⲣⲓⲥⲧⲟⲥ ⲁϥⲧⲱⲛϥ ⲉ̀ⲃⲟⲗ ϧⲉⲛ ⲛⲏⲉⲑⲙⲱⲟⲩⲧ ϧⲉⲛ ⲟⲩⲙⲟⲩ
                </div>
                <p className="text-[11px] font-mono text-[var(--color-neutral)] mt-2">
                  font-family: var(--font-coptic-sacred); /* Athanasius / Antinoou */
                </p>
              </div>
            </div>
          </CopticCard>

          {/* Arabic Typography Hierarchy */}
          <CopticCard variant="default" padding="md">
            <h2 className="text-lg font-bold text-[var(--brand-blue)] mb-4">
              Arabic Typography System (UI & Sacred Naskh)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--surface-elevated)] p-4 rounded-2xl border border-[var(--border-stone)]" dir="rtl">
                <CopticBadge variant="neutral" className="mb-2">خط الواجهة العربي (Cairo & Tajawal)</CopticBadge>
                <p className="text-lg font-bold text-[var(--text-ink)] arabic-ui mt-2">
                  كنيسة القديس القوي الأنبا موسى الأسود القبطية الأرثوذكسية
                </p>
                <p className="text-xs text-[var(--color-neutral)] mt-1">
                  مخصص لعناصر واجهة الاستخدام، الأزرار، وبطاقات الدروس.
                </p>
              </div>

              <div className="bg-[var(--surface-elevated)] p-4 rounded-2xl border border-[var(--border-stone)]" dir="rtl">
                <CopticBadge variant="gold" className="mb-2">الخط الكنسي التراثي (Amiri Naskh)</CopticBadge>
                <p className="text-xl font-bold text-[var(--brand-burgundy)] dark:text-[var(--brand-gold)] arabic-sacred mt-2 leading-loose">
                  «المجد لله في الأعالي وعلى الأرض السلام وفي الناس المسرة»
                </p>
                <p className="text-xs text-[var(--color-neutral)] mt-1">
                  مخصص لنصوص الإنجيل، القداس، والصلوات الطقسية.
                </p>
              </div>
            </div>
          </CopticCard>
        </div>
      )}

      {/* TAB 3: COMPONENTS */}
      {activeTab === 'components' && (
        <div className="space-y-6">
          <StellaCard variant="feature" padding="md" className="sm:p-7" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <StellaPageHeader
                eyebrow={lang === 'ar' ? 'هوية ستيلا • الأساس المشترك' : 'Stella identity • shared foundation'}
                title={lang === 'ar' ? 'واجهة دافئة وواضحة' : 'Warm, clear, and expressive'}
                description={lang === 'ar'
                  ? 'أسطح كحلية عميقة، لمسات ذهبية، وتفاصيل تركوازية هادئة؛ مصممة للعربية والإنجليزية.'
                  : 'Deep ink surfaces, warm gold highlights, and calm teal accents—designed for Arabic and English.'}
                icon={BookOpenCheck}
              />
              <StellaStatusLabel tone="gold" dot>
                {lang === 'ar' ? 'معاينة للمكوّنات' : 'Component preview'}
              </StellaStatusLabel>
            </div>
            <p className="mb-4 text-xs text-[var(--text-muted)]">
              {lang === 'ar' ? 'القيم التالية توضيحية لعرض المكوّنات وليست بيانات حقيقية.' : 'Illustrative component values—not live account data.'}
            </p>
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StellaMetricCard
                label={lang === 'ar' ? 'محطات مكتملة' : 'Milestones complete'}
                value="8 / 12"
                detail={lang === 'ar' ? 'رحلة تعليمية توضيحية' : 'Illustrative learning journey'}
                icon={BookOpenCheck}
                tone="teal"
              />
              <StellaMetricCard
                label={lang === 'ar' ? 'أيام المواظبة' : 'Learning streak'}
                value={lang === 'ar' ? '٥ أيام' : '5 days'}
                detail={lang === 'ar' ? 'تقدّم ثابت كل أسبوع' : 'A steady rhythm each week'}
                icon={Flame}
                tone="gold"
              />
              <StellaMetricCard
                label={lang === 'ar' ? 'لقاء الفصل القادم' : 'Next class gathering'}
                value={lang === 'ar' ? 'الأحد' : 'Sunday'}
                detail={lang === 'ar' ? 'موعد توضيحي' : 'Sample schedule'}
                icon={CalendarDays}
                tone="coral"
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
              <StellaCard variant="subtle" padding="md">
                <StellaSectionTitle
                  title={lang === 'ar' ? 'رحلة التعلّم' : 'Learning journey'}
                  description={lang === 'ar' ? 'مؤشرات مفهومة دون ازدحام بصري' : 'Progress at a glance, without visual clutter'}
                  action={<StellaStatusLabel tone="success" dot>{lang === 'ar' ? 'مستمر' : 'On track'}</StellaStatusLabel>}
                />
                <div className="space-y-4">
                  <StellaProgressBar label={lang === 'ar' ? 'دروس مدارس الأحد' : 'Sunday School lessons'} value={67} tone="teal" />
                  <StellaProgressBar label={lang === 'ar' ? 'الألحان والطقس' : 'Hymns & Taxis'} value={42} tone="gold" />
                </div>
              </StellaCard>
              <StellaCard variant="subtle" padding="md" className="flex items-center justify-center gap-4">
                <StellaProgressRing
                  label={lang === 'ar' ? 'التقدّم التوضيحي' : 'Illustrative progress'}
                  value={72}
                  tone="gold"
                />
                <div>
                  <p className="mb-1 text-sm font-extrabold text-[var(--text-primary)]">
                    {lang === 'ar' ? 'خطوة بخطوة' : 'One step at a time'}
                  </p>
                  <p className="m-0 max-w-36 text-xs leading-relaxed text-[var(--text-muted)]">
                    {lang === 'ar' ? 'المخططات واضحة ومتوافقة مع اتجاه اللغة.' : 'Charts stay clear in either reading direction.'}
                  </p>
                </div>
              </StellaCard>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <StellaEmptyState
                title={lang === 'ar' ? 'المكان جاهز لخطوتك القادمة' : 'Ready for your next step'}
                description={lang === 'ar' ? 'حالات الفراغ تشجّع وتوجّه، بدل أن تبدو كخطأ.' : 'Empty states guide the next action instead of feeling like an error.'}
                icon={UsersRound}
              />
              <div className="stella-card stella-card--subtle flex items-center p-5" aria-label={lang === 'ar' ? 'معاينة تحميل' : 'Loading preview'}>
                <div className="w-full space-y-3">
                  <StellaSectionTitle
                    title={lang === 'ar' ? 'تحميل هادئ' : 'Calm loading'}
                    description={lang === 'ar' ? 'مساحة تحفظ شكل المحتوى أثناء التحميل' : 'Reserved space keeps the layout steady while content loads'}
                  />
                  <div className="stella-skeleton" aria-hidden="true">
                    <span className="stella-skeleton__block stella-skeleton__block--hero" />
                    <span className="stella-skeleton__block" />
                    <span className="stella-skeleton__block" />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <StellaCard variant="subtle" padding="md">
                <StellaSectionTitle
                  title={lang === 'ar' ? 'مخطط النشاط' : 'Activity chart'}
                  description={lang === 'ar' ? 'مثال توضيحي — اربطه ببيانات موثوقة عند الاستخدام' : 'Illustrative only—connect to verified data in product screens'}
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                />
                <StellaBarChart
                  label={lang === 'ar' ? 'نشاط تعليمي توضيحي' : 'Illustrative learning activity'}
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  formatValue={value => lang === 'ar' ? `${value} درس` : `${value} lessons`}
                  data={[
                    { id: 'sunday-school-demo', label: lang === 'ar' ? 'مدارس الأحد' : 'Sunday School', value: 4, tone: 'teal' },
                    { id: 'hymns-demo', label: lang === 'ar' ? 'الألحان' : 'Hymns', value: 2, tone: 'gold' },
                    { id: 'taxis-demo', label: lang === 'ar' ? 'الطقس' : 'Taxis', value: 3, tone: 'coral' }
                  ]}
                />
              </StellaCard>
              <StellaCard variant="subtle" padding="md">
                <StellaSectionTitle
                  title={lang === 'ar' ? 'خط زمني' : 'Timeline'}
                  description={lang === 'ar' ? 'المواعيد هنا أمثلة وليست أحداثاً حقيقية' : 'Example dates only—not live events'}
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                />
                <StellaTimeline
                  label={lang === 'ar' ? 'خط زمني توضيحي' : 'Illustrative timeline'}
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  items={[
                    {
                      id: 'gathering-demo',
                      title: lang === 'ar' ? 'اجتماع مدارس الأحد' : 'Sunday School gathering',
                      dateLabel: lang === 'ar' ? 'الأحد • ٩:٠٠ ص' : 'Sunday • 9:00 AM',
                      dateTime: '2026-11-01T09:00:00',
                      description: lang === 'ar' ? 'موعد تجريبي لعرض تنسيق الخط الزمني.' : 'A sample date to demonstrate timeline layout.',
                      tone: 'gold'
                    },
                    {
                      id: 'lesson-demo',
                      title: lang === 'ar' ? 'مراجعة الدرس' : 'Lesson review',
                      dateLabel: lang === 'ar' ? 'الأسبوع القادم' : 'Next week',
                      description: lang === 'ar' ? 'تفاصيل إضافية تظهر عند توفر البيانات.' : 'Additional detail appears when available.',
                      tone: 'teal'
                    }
                  ]}
                />
              </StellaCard>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <StellaCard variant="subtle" padding="md">
                <StellaSectionTitle
                  title={lang === 'ar' ? 'حقول النماذج' : 'Form controls'}
                  description={lang === 'ar' ? 'تسميات وحالات تركيز وأخطاء متوافقة مع الاتجاه' : 'Labeled controls with direction-aware focus and validation'}
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <StellaFormField
                    id="stella-demo-name"
                    label={lang === 'ar' ? 'الاسم' : 'Display name'}
                    hint={lang === 'ar' ? 'اكتب الاسم الظاهر للحساب.' : 'Enter the account display name.'}
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  >
                    <StellaInput id="stella-demo-name" hintId="stella-demo-name-hint" placeholder={lang === 'ar' ? 'الاسم' : 'Name'} />
                  </StellaFormField>
                  <StellaFormField
                    id="stella-demo-grade"
                    label={lang === 'ar' ? 'الصف' : 'Grade'}
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  >
                    <StellaSelect id="stella-demo-grade" defaultValue="primary">
                      <option value="primary">{lang === 'ar' ? 'ابتدائي' : 'Primary'}</option>
                      <option value="prep">{lang === 'ar' ? 'إعدادي' : 'Preparatory'}</option>
                    </StellaSelect>
                  </StellaFormField>
                </div>
              </StellaCard>
              <StellaErrorState
                title={lang === 'ar' ? 'تعذر تحميل هذا القسم' : 'This section could not load'}
                description={lang === 'ar' ? 'اعرض الخطأ بوضوح وأتح للمستخدم المحاولة مرة أخرى.' : 'Explain the problem and provide a clear recovery action.'}
                dir={lang === 'ar' ? 'rtl' : 'ltr'}
                action={<CopticButton variant="secondary" size="sm" lang={lang}>{lang === 'ar' ? 'إعادة المحاولة' : 'Try again'}</CopticButton>}
              />
            </div>
          </StellaCard>

          {/* Buttons */}
          <CopticCard variant="default" padding="md">
            <h2 className="text-base font-bold text-[var(--brand-burgundy)] dark:text-[var(--brand-gold)] mb-3">
              Coptic Buttons (All Variants & States)
            </h2>
            <div className="flex flex-wrap gap-3 items-center">
              <CopticButton variant="primary" lang={lang}>
                Primary Liturgical
              </CopticButton>
              <CopticButton variant="secondary" lang={lang}>
                Secondary Ivory
              </CopticButton>
              <CopticButton variant="gold" lang={lang}>
                Antique Gold
              </CopticButton>
              <CopticButton variant="outline" lang={lang}>
                Outline Brand
              </CopticButton>
              <CopticButton variant="danger" lang={lang}>
                Danger Action
              </CopticButton>
              <CopticButton variant="ghost" lang={lang}>
                Ghost Action
              </CopticButton>
              <CopticButton
                variant="primary"
                loading={buttonLoading}
                onClick={() => {
                  setButtonLoading(true);
                  setTimeout(() => setButtonLoading(false), 1500);
                }}
              >
                {buttonLoading ? 'Loading...' : 'Click to Test Loading'}
              </CopticButton>
              <CopticButton variant="primary" disabled>
                Disabled
              </CopticButton>
            </div>
          </CopticCard>

          {/* Cards & Badges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CopticCard variant="default" padding="sm">
              <CopticBadge variant="burgundy" className="mb-2">Default Card</CopticBadge>
              <h4 className="text-sm font-bold text-[var(--text-ink)]">Standard Container</h4>
              <p className="text-xs text-[var(--color-neutral)] mt-1">
                Engineered with 16px corner radius and mathematically calculated padding.
              </p>
            </CopticCard>

            <CopticCard variant="sacred" padding="sm">
              <CopticBadge variant="gold" className="mb-2">Sacred Card</CopticBadge>
              <h4 className="text-sm font-bold text-[var(--brand-burgundy)] dark:text-[var(--brand-gold)]">
                Ecclesiastical Accent
              </h4>
              <p className="text-xs text-[var(--color-neutral)] mt-1">
                Features antique gold accent border for scripture and prayers.
              </p>
            </CopticCard>

            <CopticCard variant="interactive" padding="sm">
              <CopticBadge variant="blue" className="mb-2">Interactive Card</CopticBadge>
              <h4 className="text-sm font-bold text-[var(--text-ink)]">Hover Micro-Interaction</h4>
              <p className="text-xs text-[var(--color-neutral)] mt-1">
                Subtle lift and border glow on cursor hover or mobile tap.
              </p>
            </CopticCard>
          </div>
        </div>
      )}

      {/* TAB 4: TRILINGUAL READER */}
      {activeTab === 'reader' && (
        <div className="space-y-4">
          <div className="bg-[var(--surface-elevated)] p-4 rounded-2xl border border-[var(--border-stone)]">
            <h3 className="text-sm font-bold text-[var(--brand-burgundy)] dark:text-[var(--brand-gold)] mb-1">
              Trilingual Scripture & Liturgical Text Engine
            </h3>
            <p className="text-xs text-[var(--color-neutral)] mb-4">
              Toggle between Stacked and Parallel column layouts. Switch between Sacred font and UI font dynamically. Adjust font scale seamlessly.
            </p>
            <TrilingualReader
              titleCop="Ⲡⲓϩⲱⲥ ⲛ̀ⲧⲉ Ⲡⲓⲧⲱⲟⲩⲛ ⲉⲑⲟⲩⲁⲃ"
              titleAr="تسبحة القيامة المجيدة"
              titleEn="The Holy Paschal Resurrection Hymn"
              verses={sampleVerses}
            />
          </div>
        </div>
      )}

      {/* TAB 5: AUDIO ENGINE */}
      {activeTab === 'audio' && (
        <div className="space-y-4 max-w-xl mx-auto">
          <div className="text-center mb-2">
            <h3 className="text-base font-bold text-[var(--brand-burgundy)] dark:text-[var(--brand-gold)]">
              Accessible Coptic Audio Player
            </h3>
            <p className="text-xs text-[var(--color-neutral)]">
              With speed modulation, loop/refrain mode, and trilingual ARIA accessibility.
            </p>
          </div>
          <CopticAudioPlayer
            titleCop="Ⲡⲓⲭ̀ⲣⲓⲥⲧⲟⲥ ⲁϥⲧⲱⲛϥ"
            titleAr="المسيح قام من بين الأموات"
            titleEn="Christ is Risen (Hymn)"
            seasonEn="Joyous Days / Holy Pascha"
            lang={lang}
          />
        </div>
      )}
    </div>
  );
};
