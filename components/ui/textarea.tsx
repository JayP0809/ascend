import * as React from 'react';
import { clsx } from 'clsx';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={clsx(
          'flex min-h-[80px] w-full rounded-lg border border-border bg-card px-3 py-2',
          'text-sm text-primary placeholder:text-muted',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed resize-none',
          'transition-colors',
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';
