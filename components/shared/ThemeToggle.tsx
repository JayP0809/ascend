'use client';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-8 w-[88px] rounded-md bg-background border border-border" />;
  }

  const isDark = theme === 'dark';

  return (
    <div
      className="flex items-center rounded-md border border-border overflow-hidden text-xs font-medium"
      role="group"
      aria-label="Color theme"
    >
      <button
        onClick={() => setTheme('light')}
        className={`px-3 py-1.5 transition-colors ${
          !isDark
            ? 'bg-accent text-accent-fg'
            : 'bg-background text-secondary hover:text-primary'
        }`}
        aria-pressed={!isDark}
      >
        Light
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`px-3 py-1.5 transition-colors ${
          isDark
            ? 'bg-accent text-accent-fg'
            : 'bg-background text-secondary hover:text-primary'
        }`}
        aria-pressed={isDark}
      >
        Dark
      </button>
    </div>
  );
}
