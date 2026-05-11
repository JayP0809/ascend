'use client';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { TrendingUp } from 'lucide-react';

interface NavbarProps {
  breadcrumb?: string;
  actions?: React.ReactNode;
}

export function Navbar({ breadcrumb, actions }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-bg-primary bg-opacity-90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg text-primary">Ascend</span>
            </Link>
            {breadcrumb && (
              <>
                <span className="text-muted">/</span>
                <span className="text-sm text-secondary font-medium">{breadcrumb}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
