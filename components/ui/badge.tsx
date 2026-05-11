import * as React from 'react';
import { clsx } from 'clsx';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline' | 'accent';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-background text-secondary border border-border',
    success: 'bg-[var(--success)] bg-opacity-15 text-[var(--success)] border border-[var(--success)] border-opacity-30',
    warning: 'bg-[var(--warning)] bg-opacity-15 text-[var(--warning)] border border-[var(--warning)] border-opacity-30',
    danger: 'bg-[var(--danger)] bg-opacity-15 text-[var(--danger)] border border-[var(--danger)] border-opacity-30',
    outline: 'border border-border text-secondary bg-transparent',
    accent: 'bg-accent-light text-accent border border-accent border-opacity-30',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
