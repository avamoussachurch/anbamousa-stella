import React from 'react';

export interface CopticCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'sacred' | 'media' | 'status' | 'mousa-sand' | 'mousa-quest' | 'feature' | 'subtle';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const CopticCard: React.FC<CopticCardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  };

  const variantStyles = {
    default:
      'stella-card',
    interactive:
      'stella-card stella-card--interactive',
    sacred:
      'stella-card stella-card--feature border-t-4 border-t-[var(--mousa-gold)]',
    media:
      'stella-card',
    status:
      'stella-card stella-card--subtle rounded-xl',
    'mousa-sand':
      'stella-card',
    'mousa-quest':
      'stella-card stella-card--feature rounded-3xl',
    feature:
      'stella-card stella-card--feature',
    subtle:
      'stella-card stella-card--subtle'
  };

  return (
    <div
      className={`${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
