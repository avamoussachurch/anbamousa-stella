import React, { useState, useMemo } from 'react';
import { Search, Filter, CheckCircle2, AlertTriangle, Clock, BookOpen, Sparkles, ShieldCheck } from 'lucide-react';
import { Language, CopticReviewStatus } from '../../types';
import { TRANSLATION_REGISTRY, getTranslationCoverageStats } from '../../localization/registry';
import { COPTIC_GLOSSARY } from '../../localization/glossary';
import { CopticCard } from './CopticCard';
import { CopticBadge } from './CopticBadge';
import { CopticButton } from './CopticButton';

interface TranslationQADashboardProps {
  lang: Language;
}

export const TranslationQADashboard: React.FC<TranslationQADashboardProps> = ({ lang }) => {
  const [activeTab, setActiveTab] = useState<'registry' | 'glossary'>('registry');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CopticReviewStatus>('ALL');

  const stats = useMemo(() => getTranslationCoverageStats(), []);

  // Filter registry entries
  const filteredRegistry = useMemo(() => {
    return Object.values(TRANSLATION_REGISTRY).filter((entry) => {
      const matchesSearch =
        entry.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.ar.includes(searchQuery) ||
        entry.cop.includes(searchQuery);

      const matchesStatus = statusFilter === 'ALL' || entry.reviewStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  // Filter glossary
  const filteredGlossary = useMemo(() => {
    return COPTIC_GLOSSARY.filter((term) => {
      return (
        term.concept.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.arabic.includes(searchQuery) ||
        term.coptic.includes(searchQuery)
      );
    });
  }, [searchQuery]);

  const getStatusBadge = (status: CopticReviewStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <CopticBadge variant="success" size="sm" dot>
            APPROVED
          </CopticBadge>
        );
      case 'VERIFIED':
        return (
          <CopticBadge variant="blue" size="sm" dot>
            VERIFIED
          </CopticBadge>
        );
      case 'REVIEW_REQUIRED':
        return (
          <CopticBadge variant="warning" size="sm" dot>
            REVIEW_REQUIRED
          </CopticBadge>
        );
      case 'DRAFT':
        return (
          <CopticBadge variant="neutral" size="sm" dot>
            DRAFT
          </CopticBadge>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-[var(--brand-burgundy)] text-white p-6 rounded-3xl shadow-md border border-[var(--brand-burgundy-dark)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={20} className="text-[var(--brand-gold)]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand-gold)]">
              {lang === 'ar' ? 'مراجعة جودة الترجمة وإدارتها' : 'Translation quality and governance'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            {lang === 'ar' ? 'مراجعة الترجمة القبطية البحيرية' : '{lang === 'ar' ? 'القبطي البحيري' : 'Bohairic Coptic'} Localization QA'}
          </h1>
          <p className="text-sm text-white/80 max-w-2xl mt-1">
            {lang === 'ar' ? 'الأرقام دي بتوضح اكتمال بيانات سجل المصطلحات والترجمة بس، ومش معناها إن كل شاشات الموقع مترجمة بالكامل.' : 'These figures measure translation registry completeness only; they do not mean every app screen is fully localized.'}
          </p>
        </div>
      </div>

      {/* Coverage Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CopticCard variant="default" padding="sm">
          <span className="text-xs text-[var(--color-neutral)] font-semibold block">{lang === 'ar' ? 'اكتمال بيانات الإنجليزي في السجل' : 'English registry completeness'}</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-[var(--brand-burgundy)] dark:text-[var(--brand-gold)]">
              {stats.english}%
            </span>
            <span className="text-xs text-[var(--color-success)] font-bold">{lang === 'ar' ? 'مكتمل في السجل' : 'Entry populated'}</span>
          </div>
          <div className="w-full bg-[var(--border-stone)]/40 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-[var(--color-success)] h-full" style={{ width: `${stats.english}%` }} />
          </div>
        </CopticCard>

        <CopticCard variant="default" padding="sm">
          <span className="text-xs text-[var(--color-neutral)] font-semibold block">{lang === 'ar' ? 'اكتمال بيانات العربي في السجل' : 'Arabic registry completeness'}</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-[var(--brand-burgundy)] dark:text-[var(--brand-gold)]">
              {stats.arabic}%
            </span>
            <span className="text-xs text-[var(--color-success)] font-bold">{lang === 'ar' ? 'مكتمل في السجل' : 'Entry populated'}</span>
          </div>
          <div className="w-full bg-[var(--border-stone)]/40 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-[var(--color-success)] h-full" style={{ width: `${stats.arabic}%` }} />
          </div>
        </CopticCard>

        <CopticCard variant="default" padding="sm">
          <span className="text-xs text-[var(--color-neutral)] font-semibold block">{lang === 'ar' ? 'القبطي البحيري' : 'Bohairic Coptic'}</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-[var(--brand-burgundy)] dark:text-[var(--brand-gold)]">
              {stats.coptic}%
            </span>
            <span className="text-xs text-[var(--color-success)] font-bold">{lang === 'ar' ? 'مكتمل في السجل' : 'Entry populated'}</span>
          </div>
          <div className="w-full bg-[var(--border-stone)]/40 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-[var(--color-success)] h-full" style={{ width: `${stats.coptic}%` }} />
          </div>
        </CopticCard>

        <CopticCard variant="sacred" padding="sm">
          <span className="text-xs text-[var(--color-neutral)] font-semibold block">{lang === 'ar' ? 'المعتمد كنسياً' : 'Church-approved entries'}</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-[var(--brand-gold-dark)] dark:text-[var(--brand-gold)]">
              {stats.approvedCopticPercentage}%
            </span>
            <span className="text-xs text-[var(--color-neutral)]">
              ({stats.approvedCount}/{stats.totalKeys})
            </span>
          </div>
          <div className="w-full bg-[var(--border-stone)]/40 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-[var(--brand-gold)] h-full" style={{ width: `${stats.approvedCopticPercentage}%` }} />
          </div>
        </CopticCard>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-stone)] pb-2">
        <button
          onClick={() => setActiveTab('registry')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'registry'
              ? 'bg-[var(--brand-burgundy)] text-white shadow-xs'
              : 'text-[var(--text-ink)] hover:bg-[var(--surface-elevated)]'
          }`}
        >
          <BookOpen size={16} />
          <span>{lang === 'ar' ? `سجل الترجمة (${stats.totalKeys} مدخل)` : `Translation registry (${stats.totalKeys} entries)`}</span>
        </button>

        <button
          onClick={() => setActiveTab('glossary')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'glossary'
              ? 'bg-[var(--brand-burgundy)] text-white shadow-xs'
              : 'text-[var(--text-ink)] hover:bg-[var(--surface-elevated)]'
          }`}
        >
          <Sparkles size={16} />
          <span>{lang === 'ar' ? `قاموس المصطلحات (${COPTIC_GLOSSARY.length} مصطلح)` : `Terminology glossary (${COPTIC_GLOSSARY.length} terms)`}</span>
        </button>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[var(--surface-elevated)] rounded-2xl border border-[var(--border-stone)]">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-neutral)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keys, English, Arabic, or {lang === 'ar' ? 'القبطي البحيري' : 'Bohairic Coptic'}..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[var(--surface-card)] border border-[var(--border-stone)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-burgundy)]"
          />
        </div>

        {activeTab === 'registry' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-[var(--color-neutral)] flex items-center gap-1">
              <Filter size={14} />
              {lang === 'ar' ? 'الحالة:' : 'Status:'}
            </span>
            {(['ALL', 'APPROVED', 'VERIFIED', 'REVIEW_REQUIRED', 'DRAFT'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  statusFilter === status
                    ? 'bg-[var(--brand-burgundy)] text-white border-[var(--brand-burgundy)] shadow-xs'
                    : 'bg-[var(--surface-card)] text-[var(--text-ink)] border-[var(--border-stone)] hover:bg-[var(--surface-elevated)]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: REGISTRY TABLE */}
      {activeTab === 'registry' && (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border-stone)] bg-[var(--surface-card)] shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--surface-elevated)] border-b border-[var(--border-stone)] text-[var(--color-neutral)] uppercase tracking-wider text-[10px] font-bold">
                <th className="p-3">{lang === 'ar' ? 'المفتاح' : 'Key'}</th>
                <th className="p-3">{lang === 'ar' ? 'الإنجليزي' : 'English'}</th>
                <th className="p-3">{lang === 'ar' ? 'العربي' : 'Arabic'}</th>
                <th className="p-3">{lang === 'ar' ? 'القبطي البحيري' : 'Bohairic Coptic'}</th>
                <th className="p-3">{lang === 'ar' ? 'المصدر والمرجع' : 'Source & citation'}</th>
                <th className="p-3">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-stone)]">
              {filteredRegistry.map((entry) => (
                <tr key={entry.key} className="hover:bg-[var(--surface-elevated)]/60 transition-colors">
                  <td className="p-3 font-mono text-[11px] text-[var(--brand-burgundy)] dark:text-[var(--brand-gold)] font-semibold whitespace-nowrap">
                    {entry.key}
                  </td>
                  <td className="p-3 text-[var(--text-ink)] font-medium">
                    {entry.en}
                  </td>
                  <td className="p-3 text-[var(--text-ink)] font-medium arabic-ui" dir="rtl">
                    {entry.ar}
                  </td>
                  <td className="p-3 font-bold text-[var(--brand-burgundy)] dark:text-[var(--brand-gold)] coptic-ui text-sm" dir="ltr">
                    {entry.cop}
                  </td>
                  <td className="p-3 text-[var(--color-neutral)] text-[11px]">
                    <div>{entry.source || (lang === 'ar' ? 'المعيار الكنسي' : 'Ecclesiastical standard')}</div>
                    {entry.notes && <div className="text-[10px] text-[var(--color-neutral)] italic">{entry.notes}</div>}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {getStatusBadge(entry.reviewStatus)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: GLOSSARY TABLE */}
      {activeTab === 'glossary' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGlossary.map((item) => (
            <CopticCard key={item.termId} variant="sacred" padding="sm" className="space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-[var(--border-stone)]">
                <span className="text-xs font-mono font-bold text-[var(--brand-blue)]">
                  #{item.termId}
                </span>
                {getStatusBadge(item.reviewStatus)}
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-[var(--color-neutral)]">{lang === 'ar' ? 'المفهوم' : 'Concept'}</p>
                <p className="text-xs font-bold text-[var(--text-ink)]">{item.concept}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 p-2 bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-stone)]">
                <div>
                  <span className="text-[9px] uppercase font-bold text-[var(--color-neutral)] block">English</span>
                  <span className="text-xs font-semibold">{item.english}</span>
                </div>
                <div dir="rtl">
                  <span className="text-[9px] uppercase font-bold text-[var(--color-neutral)] block">العربية</span>
                  <span className="text-xs font-semibold arabic-ui">{item.arabic}</span>
                </div>
                <div dir="ltr">
                  <span className="text-[9px] uppercase font-bold text-[var(--color-neutral)] block">ϯⲁⲥⲡⲓ</span>
                  <span className="text-sm font-bold text-[var(--brand-burgundy)] dark:text-[var(--brand-gold)] coptic-ui">
                    {item.coptic}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-[var(--color-neutral)]">
                <span className="font-semibold text-[var(--text-ink)]">{lang === 'ar' ? 'المصدر الكنسي: ' : 'Ecclesiastical source: '}</span>
                {item.copticSource}
              </div>

              {item.notes && (
                <div className="text-[10px] text-[var(--color-neutral)] italic bg-[var(--surface-card)] p-1.5 rounded-lg border border-[var(--border-stone)]/60">
                  {item.notes}
                </div>
              )}
            </CopticCard>
          ))}
        </div>
      )}
    </div>
  );
};
