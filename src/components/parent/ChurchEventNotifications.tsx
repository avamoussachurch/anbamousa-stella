import React, { useState } from 'react';
import { Calendar, CalendarPlus, Check, Copy, MapPin } from 'lucide-react';
import { ChurchEventNotification } from '../../types';

interface ChurchEventNotificationsProps {
  events: ChurchEventNotification[];
  lang: 'en' | 'ar';
}

export function ChurchEventNotifications({ events, lang }: ChurchEventNotificationsProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'liturgy' | 'sunday_school' | 'family' | 'hymn'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [calendarAddedId, setCalendarAddedId] = useState<string | null>(null);

  const filteredEvents = events.filter(event => selectedFilter === 'all' || event.category === selectedFilter);

  const handleAddToCalendar = (event: ChurchEventNotification) => {
    const title = lang === 'ar' ? event.titleAr : event.titleEn;
    const details = lang === 'ar' ? event.descriptionAr : event.descriptionEn;
    const location = lang === 'ar' ? event.locationAr : event.locationEn;
    const eventDate = new Date(event.dateTime || event.date);
    const startDate = Number.isNaN(eventDate.getTime())
      ? `${event.date.replace(/-/g, '')}T070000Z`
      : eventDate.toISOString().replace(/[-:]|\.\d{3}/g, '');
    const endDate = Number.isNaN(eventDate.getTime())
      ? `${event.date.replace(/-/g, '')}T100000Z`
      : new Date(eventDate.getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/[-:]|\.\d{3}/g, '');
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setCalendarAddedId(event.id);
    window.setTimeout(() => setCalendarAddedId(null), 3000);
  };

  const handleShare = async (event: ChurchEventNotification) => {
    const text = `${lang === 'ar' ? event.titleAr : event.titleEn}\n${event.date} (${lang === 'ar' ? event.timeAr : event.timeEn})\n${lang === 'ar' ? event.locationAr : event.locationEn}`;
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(text);
    setCopiedId(event.id);
    window.setTimeout(() => setCopiedId(null), 2500);
  };

  const filters: Array<{ id: typeof selectedFilter; label: string }> = [
    { id: 'all', label: lang === 'ar' ? 'كل الفعاليات' : 'All events' },
    { id: 'liturgy', label: lang === 'ar' ? 'القداسات والأعياد' : 'Liturgies & feasts' },
    { id: 'sunday_school', label: lang === 'ar' ? 'مدارس الأحد' : 'Sunday School' },
    { id: 'family', label: lang === 'ar' ? 'الأسرة والخدمة' : 'Family & service' },
    { id: 'hymn', label: lang === 'ar' ? 'الألحان' : 'Hymns' }
  ];

  return (
    <div className="space-y-5" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <header className="mousa-card-sand p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[var(--surface-secondary)] text-[var(--action-primary)] flex items-center justify-center">
            <Calendar size={21} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{lang === 'ar' ? 'فعاليات الكنيسة' : 'Church events'}</h2>
            <p className="text-sm text-[var(--text-secondary)]">{lang === 'ar' ? 'الفعاليات القادمة المسجلة في الكنيسة' : 'Upcoming events saved by the church'}</p>
          </div>
        </div>
      </header>

      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label={lang === 'ar' ? 'تصنيف الفعاليات' : 'Filter events'}>
        {filters.map(filter => (
          <button
            key={filter.id}
            onClick={() => setSelectedFilter(filter.id)}
            aria-pressed={selectedFilter === filter.id}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold border transition-colors ${
              selectedFilter === filter.id
                ? 'bg-[var(--action-primary)] text-[var(--action-primary-text)] border-[var(--action-primary)]'
                : 'mousa-card-sand text-[var(--text-secondary)] hover:bg-[var(--state-hover)]'
            }`}
          >
            {filter.label} {filter.id === 'all' ? `(${events.length})` : ''}
          </button>
        ))}
      </nav>

      {filteredEvents.length === 0 ? (
        <div className="mousa-card-sand p-10 text-center text-[var(--text-secondary)]">
          {events.length === 0
            ? (lang === 'ar' ? 'لا توجد فعاليات قادمة مسجلة حالياً.' : 'There are no upcoming events on record.')
            : (lang === 'ar' ? 'لا توجد فعاليات في هذا التصنيف.' : 'No events in this category.')}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map(event => (
            <article key={event.id} className="mousa-card-sand p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-bold text-[var(--text-primary)]">{lang === 'ar' ? event.titleAr : event.titleEn}</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {event.date} · {lang === 'ar' ? event.timeAr : event.timeEn}
                </p>
                {(event.locationAr || event.locationEn) && (
                  <p className="text-sm text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
                    <MapPin size={14} />{lang === 'ar' ? event.locationAr : event.locationEn}
                  </p>
                )}
                {(event.descriptionAr || event.descriptionEn) && (
                  <p className="text-sm text-[var(--text-secondary)] mt-2">
                    {lang === 'ar' ? event.descriptionAr : event.descriptionEn}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => void handleShare(event)} className="rounded-xl border border-[var(--border-default)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--state-hover)] flex items-center gap-1.5">
                  {copiedId === event.id ? <Check size={15} /> : <Copy size={15} />}
                  {copiedId === event.id ? (lang === 'ar' ? 'تم النسخ' : 'Copied') : (lang === 'ar' ? 'نسخ' : 'Copy')}
                </button>
                <button onClick={() => handleAddToCalendar(event)} className="rounded-xl bg-[var(--action-primary)] px-3 py-2 text-sm font-semibold text-[var(--action-primary-text)] hover:opacity-90 flex items-center gap-1.5">
                  <CalendarPlus size={15} />
                  {calendarAddedId === event.id ? (lang === 'ar' ? 'تم فتح التقويم' : 'Calendar opened') : (lang === 'ar' ? 'التقويم' : 'Calendar')}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
