import * as React from 'react';
import { clsx } from 'clsx';

interface ProgressProps {
  value: number;
  className?: string;
  color?: string;
}

export function Progress({ value, className, color }: ProgressProps) {
  return (
    <div className={clsx('progress-bar', className)}>
      <div
        className="progress-fill"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color || 'var(--accent)' }}
      />
    </div>
  );
}
