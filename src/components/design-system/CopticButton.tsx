import React from 'react';
import { Loader2 } from 'lucide-react';
import { Language } from '../../types';
import { getFontFamilyClass } from '../../localization/i18n';

export interface CopticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'ghost' | 'danger' | 'outline' | 'mousa-quest' | 'mousa-teal';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
  lang?: Language;
  fullWidth?: boolean;
}

export const CopticButton: React.FC<CopticButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'start',
  lang = 'en',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const fontClass = getFontFamilyClass(lang);

  // Variant styling
  const variantStyles = {
    primary:
      'bg-[var(--action-primary)] text-[var(--action-primary-text)] hover:brightness-110 active:brightness-95 border border-[var(--action-primary)] shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
    secondary:
      'bg-[var(--surface-primary)] text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] active:bg-[var(--state-selected)] border border-[var(--border-default)] shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
    gold:
      'bg-[var(--mousa-gold)] text-[var(--action-gold-text)] hover:brightness-105 active:brightness-95 border border-[var(--mousa-gold-dark)] shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] font-bold',
    ghost:
      'bg-transparent text-[var(--text-ink)] hover:bg-[var(--surface-elevated)] active:bg-[var(--border-stone)]/30 border border-transparent focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]',
    danger:
      'bg-[var(--color-danger)] text-white hover:brightness-110 active:brightness-95 border border-red-900 shadow-xs focus-visible:ring-2 focus-visible:ring-red-400',
    outline:
      'bg-transparent text-[var(--action-primary)] border border-[var(--action-primary)] hover:bg-[var(--action-primary)]/10 active:bg-[var(--action-primary)]/20 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
    'mousa-quest':
      'bg-gradient-to-r from-[var(--mousa-teal)] to-[var(--mousa-teal-deep)] text-white font-extrabold border border-[var(--mousa-teal-light)] shadow-md hover:brightness-110 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
    'mousa-teal':
      'bg-[var(--mousa-teal-soft)] text-[var(--mousa-teal)] dark:text-[var(--mousa-teal-glow)] hover:bg-[var(--mousa-teal)]/20 border border-[var(--mousa-teal)]/30 font-bold focus-visible:ring-2 focus-visible:ring-[var(--mousa-teal)]'
  };

  // Size styling - meeting 44px min touch target rule on mobile
  const sizeStyles = {
    sm: 'text-xs py-2 px-3.5 min-h-[38px] rounded-lg gap-1.5',
    md: 'text-sm py-2.5 px-5 min-h-[44px] rounded-xl gap-2 font-semibold',
    lg: 'text-base py-3 px-6 min-h-[50px] rounded-xl gap-2.5 font-bold'
  };

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-all duration-200 cursor-pointer select-none outline-none disabled:opacity-50 disabled:cursor-not-allowed ${fontClass} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={size === 'sm' ? 14 : 18} className="animate-spin shrink-0" />}
      {!loading && icon && iconPosition === 'start' && <span className="shrink-0">{icon}</span>}
      <span className="truncate leading-none">{children}</span>
      {!loading && icon && iconPosition === 'end' && <span className="shrink-0">{icon}</span>}
    </button>
  );
};
