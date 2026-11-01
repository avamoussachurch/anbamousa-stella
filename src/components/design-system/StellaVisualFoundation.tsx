import React from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Tone = 'teal' | 'gold' | 'coral' | 'success' | 'warning' | 'danger' | 'neutral';

export interface StellaCardProps extends HTMLAttributes<HTMLElement> {
  variant?: 'default' | 'feature' | 'interactive' | 'subtle';
  as?: 'section' | 'article' | 'div';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children?: ReactNode;
  className?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
}

export function StellaCard({
  as: Element = 'section',
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...props
}: StellaCardProps) {
  const paddingClass = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-7'
  }[padding];
  return (
    <Element className={`stella-card stella-card--${variant} ${paddingClass} ${className}`} {...props}>
      {children}
    </Element>
  );
}

export interface StellaPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
}

export function StellaPageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  className = '',
  dir
}: StellaPageHeaderProps) {
  return (
    <header className={`stella-page-header ${className}`} dir={dir}>
      <div className="stella-page-header__main">
        {Icon && (
          <span className="stella-page-header__icon" aria-hidden="true">
            <Icon size={22} strokeWidth={1.8} />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="stella-eyebrow">{eyebrow}</p>}
          <h1 className="stella-page-title">{title}</h1>
          {description && <p className="stella-page-description">{description}</p>}
        </div>
      </div>
      {actions && <div className="stella-page-header__actions">{actions}</div>}
    </header>
  );
}

export interface StellaSectionTitleProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
}

export function StellaSectionTitle({ title, description, action, className = '', dir }: StellaSectionTitleProps) {
  return (
    <div className={`stella-section-title ${className}`} dir={dir}>
      <div className="min-w-0">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="stella-section-title__action">{action}</div>}
    </div>
  );
}

export interface StellaMetricCardProps {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: LucideIcon;
  tone?: Tone;
  className?: string;
}

export function StellaMetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'teal',
  className = ''
}: StellaMetricCardProps) {
  return (
    <StellaCard className={`stella-metric stella-metric--${tone} ${className}`} aria-label={`${label}: ${value}`}>
      <div className="stella-metric__top">
        <span className="stella-metric__label">{label}</span>
        {Icon && <span className="stella-metric__icon" aria-hidden="true"><Icon size={19} /></span>}
      </div>
      <p className="stella-metric__value" aria-hidden="true">{value}</p>
      {detail && <p className="stella-metric__detail">{detail}</p>}
    </StellaCard>
  );
}

export interface StellaStatusLabelProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
  children?: ReactNode;
  className?: string;
}

export function StellaStatusLabel({
  tone = 'neutral',
  dot = false,
  className = '',
  children,
  ...props
}: StellaStatusLabelProps) {
  return (
    <span className={`stella-status stella-status--${tone} ${className}`} {...props}>
      {dot && <span className="stella-status__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export interface StellaProgressBarProps {
  value: number;
  max?: number;
  label: string;
  tone?: Extract<Tone, 'teal' | 'gold' | 'coral' | 'success'>;
  showValue?: boolean;
  className?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
}

export function StellaProgressBar({
  value,
  max = 100,
  label,
  tone = 'teal',
  showValue = true,
  className = '',
  dir
}: StellaProgressBarProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value) ? Math.min(safeMax, Math.max(0, value)) : 0;
  const percent = Math.round((safeValue / safeMax) * 100);

  return (
    <div className={`stella-progress ${className}`} dir={dir}>
      <div className="stella-progress__meta">
        <span>{label}</span>
        {showValue && <span className="stella-progress__value">{percent}%</span>}
      </div>
      <div
        className="stella-progress__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        aria-valuetext={`${percent}%`}
      >
        <span className={`stella-progress__fill stella-progress__fill--${tone}`} style={{ inlineSize: `${percent}%` }} />
      </div>
    </div>
  );
}

export interface StellaProgressRingProps {
  value: number;
  max?: number;
  label: string;
  size?: number;
  tone?: Extract<Tone, 'teal' | 'gold' | 'coral' | 'success'>;
  className?: string;
}

export function StellaProgressRing({
  value,
  max = 100,
  label,
  size = 76,
  tone = 'gold',
  className = ''
}: StellaProgressRingProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value) ? Math.min(safeMax, Math.max(0, value)) : 0;
  const percent = Math.round((safeValue / safeMax) * 100);
  const strokeWidth = Math.max(4, Math.round(size * 0.1));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className={`stella-ring stella-ring--${tone} ${className}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={safeValue}
      aria-valuetext={`${percent}%`}
      style={{ inlineSize: size, blockSize: size }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="stella-ring__track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
        <circle
          className="stella-ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
        />
      </svg>
      <span className="stella-ring__label" aria-hidden="true">{percent}%</span>
    </div>
  );
}

export interface StellaEmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}

export function StellaEmptyState({
  title,
  description,
  icon: Icon,
  action,
  className = ''
}: StellaEmptyStateProps) {
  return (
    <div className={`stella-empty ${className}`} role="status">
      {Icon && <span className="stella-empty__icon" aria-hidden="true"><Icon size={25} strokeWidth={1.7} /></span>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="stella-empty__action">{action}</div>}
    </div>
  );
}

export interface StellaLoadingSkeletonProps {
  rows?: number;
  variant?: 'text' | 'card' | 'avatar';
  className?: string;
}

export function StellaLoadingSkeleton({
  rows = 3,
  variant = 'text',
  className = ''
}: StellaLoadingSkeletonProps) {
  const count = Math.min(8, Math.max(1, Math.floor(rows)));
  return (
    <div className={`stella-skeleton stella-skeleton--${variant} ${className}`} role="status" aria-busy="true">
      <span className="sr-only">Loading</span>
      {variant === 'card' && <span className="stella-skeleton__block stella-skeleton__block--hero" />}
      {Array.from({ length: variant === 'avatar' ? 1 : count }, (_, index) => (
        <span key={index} className="stella-skeleton__block" />
      ))}
    </div>
  );
}

export interface StellaErrorStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
}

export function StellaErrorState({
  title,
  description,
  action,
  className = '',
  dir
}: StellaErrorStateProps) {
  return (
    <div className={`stella-error ${className}`} role="alert" dir={dir}>
      <span className="stella-error__icon" aria-hidden="true">
        <AlertCircle size={23} strokeWidth={1.8} />
      </span>
      <div className="stella-error__content">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
        {action && <div className="stella-error__action">{action}</div>}
      </div>
    </div>
  );
}

export interface StellaFormFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
}

export function StellaFormField({
  id,
  label,
  hint,
  error,
  required = false,
  children,
  className = '',
  dir
}: StellaFormFieldProps) {
  return (
    <div className={`stella-field ${className}`} dir={dir}>
      <label className="stella-field__label" htmlFor={id}>
        {label}
        {required && <span className="stella-field__required" aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="stella-field__hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="stella-field__error" id={`${id}-error`} role="alert">{error}</p>}
    </div>
  );
}

export interface StellaSelectProps extends HTMLAttributes<HTMLSelectElement> {
  className?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'grammar' | 'spelling';
  id?: string;
  name?: string;
  value?: string | number | readonly string[];
  defaultValue?: string | number | readonly string[];
  required?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  autoFocus?: boolean;
  form?: string;
  children: ReactNode;
  hintId?: string;
  errorId?: string;
}

export function StellaSelect({
  className = '',
  children,
  hintId,
  errorId,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  ...props
}: StellaSelectProps) {
  const describedByIds = [describedBy, hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <span className="stella-select">
      <select
        className={`stella-select__control ${className}`}
        aria-describedby={describedByIds}
        aria-invalid={invalid ?? Boolean(errorId)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="stella-select__icon" size={17} aria-hidden="true" />
    </span>
  );
}

export interface StellaInputProps extends HTMLAttributes<HTMLInputElement> {
  className?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'grammar' | 'spelling';
  id?: string;
  name?: string;
  type?: string;
  value?: string | number | readonly string[];
  defaultValue?: string | number | readonly string[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  hintId?: string;
  errorId?: string;
}

export function StellaInput({
  className = '',
  hintId,
  errorId,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  ...props
}: StellaInputProps) {
  const describedByIds = [describedBy, hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <input
      className={`stella-field__control ${className}`}
      aria-describedby={describedByIds}
      aria-invalid={invalid ?? Boolean(errorId)}
      {...props}
    />
  );
}

export interface StellaTextareaProps extends HTMLAttributes<HTMLTextAreaElement> {
  className?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'grammar' | 'spelling';
  id?: string;
  name?: string;
  value?: string | readonly string[];
  defaultValue?: string | readonly string[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  rows?: number;
  cols?: number;
  hintId?: string;
  errorId?: string;
}

export function StellaTextarea({
  className = '',
  hintId,
  errorId,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  ...props
}: StellaTextareaProps) {
  const describedByIds = [describedBy, hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <textarea
      className={`stella-field__control stella-field__control--multiline ${className}`}
      aria-describedby={describedByIds}
      aria-invalid={invalid ?? Boolean(errorId)}
      {...props}
    />
  );
}

export interface StellaTimelineItem {
  id: string;
  title: string;
  dateLabel?: string;
  dateTime?: string;
  description?: string;
  tone?: Extract<Tone, 'teal' | 'gold' | 'coral' | 'success' | 'warning' | 'danger'>;
  status?: string;
}

export interface StellaTimelineProps {
  items: StellaTimelineItem[];
  label: string;
  dir?: 'ltr' | 'rtl' | 'auto';
  className?: string;
}

export function StellaTimeline({ items, label, dir, className = '' }: StellaTimelineProps) {
  return (
    <ol className={['stella-timeline', className].filter(Boolean).join(' ')} aria-label={label} dir={dir}>
      {items.map(item => (
        <li key={item.id} className={`stella-timeline__item stella-timeline__item--${item.tone || 'teal'}`}>
          <span className="stella-timeline__marker" aria-hidden="true" />
          <article className="stella-timeline__body">
            <div className="stella-timeline__heading">
              <h3>{item.title}</h3>
              {item.status && <StellaStatusLabel tone={item.tone || 'teal'}>{item.status}</StellaStatusLabel>}
            </div>
            {item.dateLabel && (
              <time className="stella-timeline__date" dateTime={item.dateTime}>
                {item.dateLabel}
              </time>
            )}
            {item.description && <p>{item.description}</p>}
          </article>
        </li>
      ))}
    </ol>
  );
}

export interface StellaChartDatum {
  id: string;
  label: string;
  value: number;
  detail?: string;
  tone?: Extract<Tone, 'teal' | 'gold' | 'coral' | 'success'>;
}

export interface StellaBarChartProps {
  data: StellaChartDatum[];
  label: string;
  dir?: 'ltr' | 'rtl' | 'auto';
  className?: string;
  formatValue?: (value: number) => string;
}

export function StellaBarChart({
  data,
  label,
  dir,
  className = '',
  formatValue = value => String(value)
}: StellaBarChartProps) {
  const maxValue = Math.max(0, ...data.map(item => Number.isFinite(item.value) ? item.value : 0));

  return (
    <div className={`stella-chart ${className}`} role="img" aria-label={label} dir={dir}>
      {data.map(item => {
        const value = Number.isFinite(item.value) ? Math.max(0, item.value) : 0;
        const percent = maxValue > 0 ? Math.min(100, (value / maxValue) * 100) : 0;
        return (
          <div className="stella-chart__row" key={item.id}>
            <div className="stella-chart__meta">
              <span className="stella-chart__label">{item.label}</span>
              <span className="stella-chart__value">{formatValue(value)}</span>
            </div>
            <div className="stella-chart__track" aria-hidden="true">
              <span
                className={`stella-chart__bar stella-chart__bar--${item.tone || 'teal'}`}
                style={{ inlineSize: `${percent}%` }}
              />
            </div>
            {item.detail && <p className="stella-chart__detail">{item.detail}</p>}
          </div>
        );
      })}
    </div>
  );
}
