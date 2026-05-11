'use client';
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { clsx } from 'clsx';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: TabsPrimitive.TabsListProps) {
  return (
    <TabsPrimitive.List
      className={clsx(
        'inline-flex items-center gap-1 rounded-xl bg-background p-1 border border-border',
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: TabsPrimitive.TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={clsx(
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-secondary',
        'transition-all duration-150',
        'hover:text-primary',
        'data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: TabsPrimitive.TabsContentProps) {
  return (
    <TabsPrimitive.Content
      className={clsx('focus-visible:outline-none', className)}
      {...props}
    />
  );
}
