'use client';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { NavAuthButtons } from './NavAuthButtons';

interface NavbarProps {
  breadcrumb?: string;
  actions?: React.ReactNode;
}

export function Navbar({ breadcrumb, actions }: NavbarProps) {
  return (
    <nav
      className="sticky top-0 z-40 border-b"
      style={{
        background: 'var(--bg-primary)',
        borderColor: 'var(--border)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="font-serif text-xl font-light tracking-wide"
              style={{ color: 'var(--text-primary)' }}
            >
              Ascend
            </Link>
            {breadcrumb && (
              <>
                <span style={{ color: 'var(--border-strong)', fontSize: 14 }}>/</span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {breadcrumb}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <NavAuthButtons />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
