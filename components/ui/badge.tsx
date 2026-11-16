import * as React from 'react';
import { clsx } from 'clsx';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'accent' | 'success';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-background text-secondary border border-border',
    outline: 'border border-border text-secondary bg-transparent',
    accent: 'bg-accent-light text-accent border border-accent border-opacity-30',
    success: 'border border-[var(--emerald)] bg-[var(--emerald-light)] text-[var(--emerald-text)]',
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
