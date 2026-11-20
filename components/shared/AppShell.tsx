'use client';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import {
  FileText, Target, LayoutList, Bookmark,
  Settings, Plus, Sun, Moon, BarChart2, Download,
} from 'lucide-react';

export type AppView = 'report' | 'skills' | 'roadmap' | 'insights' | 'export' | 'saved';

const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';

interface NavItem {
  view: AppView;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

const ANALYSIS_NAV: NavItem[] = [
  { view: 'report',   label: 'Analysis Report', Icon: FileText   },
  { view: 'skills',   label: 'Skill Gaps',      Icon: Target     },
  { view: 'insights', label: 'Insights',        Icon: BarChart2  },
  { view: 'roadmap',  label: 'Roadmap',         Icon: LayoutList },
  { view: 'export',   label: 'Export PDF',      Icon: Download   },
];

const GENERAL_NAV: NavItem[] = [
  { view: 'saved', label: 'Saved Analyses', Icon: Bookmark },
];

const BOTTOM_NAV: NavItem[] = [
  { view: 'report',  label: 'Report',  Icon: FileText   },
  { view: 'skills',  label: 'Skills',  Icon: Target     },
  { view: 'roadmap', label: 'Roadmap', Icon: LayoutList },
  { view: 'saved',   label: 'Saved',   Icon: Bookmark   },
];

function viewHref(view: AppView, analysisId?: string | null): string {
  const params = new URLSearchParams();
  params.set('view', view);
  if (analysisId) params.set('id', analysisId);
  return `/dashboard?${params.toString()}`;
}

function MiniThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div style={{ width: 28, height: 28 }} />;

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 4,
        border: '1px solid var(--border)',
        background: 'none',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'color 0.1s, border-color 0.1s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
      }}
    >
      {theme === 'dark'
        ? <Sun size={13} strokeWidth={1.5} />
        : <Moon size={13} strokeWidth={1.5} />}
    </button>
  );
}

interface AppShellProps {
  view: AppView;
  analysisId?: string | null;
  children: React.ReactNode;
}

export function AppShell({ view, analysisId, children }: AppShellProps) {
  const { data: session } = useSession();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      {/* ── Desktop sidebar ── */}
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
        className="hidden md:flex"
      >
        {/* Wordmark */}
        <div style={{ padding: '24px 16px 20px', textAlign: 'center' }}>
          <Link
            href="/"
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 24,
              fontWeight: 500,
              letterSpacing: '0.02em',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              lineHeight: 1,
              display: 'inline-block',
            }}
          >
            Ascend
          </Link>
        </div>

        {/* New analysis button */}
        <div style={{ padding: '0 12px 20px' }}>
          <Link
            href="/?new=1"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              width: '100%',
              padding: '8px 12px',
              borderRadius: 3,
              border: '1px solid var(--border-strong)',
              background: 'none',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'color 0.1s, background 0.1s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = 'var(--text-primary)';
              el.style.background = 'var(--accent-light)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = 'var(--text-secondary)';
              el.style.background = 'none';
            }}
          >
            <Plus size={13} strokeWidth={2} />
            New analysis
          </Link>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '0 12px' }}>
          {/* Analysis views */}
          <div style={{ marginBottom: 4 }}>
            {ANALYSIS_NAV.map(({ view: v, label, Icon }) => (
              <Link
                key={v}
                href={viewHref(v, analysisId)}
                className={`snav-item${view === v ? ' active' : ''}`}
              >
                <Icon size={14} strokeWidth={1.5} />
                {label}
              </Link>
            ))}
          </div>

          {/* Separator */}
          <div
            style={{
              height: 1,
              background: 'var(--border)',
              margin: '8px 0',
            }}
          />

          {/* General views */}
          <div>
            {GENERAL_NAV.map(({ view: v, label, Icon }) => (
              <Link
                key={v}
                href={viewHref(v, analysisId)}
                className={`snav-item${view === v ? ' active' : ''}`}
              >
                <Icon size={14} strokeWidth={1.5} />
                {label}
              </Link>
            ))}

            <Link
              href="/settings"
              className="snav-item"
            >
              <Settings size={14} strokeWidth={1.5} />
              Settings
            </Link>
          </div>
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px 16px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {/* User info or sign-in prompt */}
            {AUTH_ENABLED ? (
              session?.user ? (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {session.user.name ?? session.user.email ?? 'Account'}
                  </p>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      textUnderlineOffset: 2,
                    }}
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <Link
                  href="/sign-in"
                  style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}
                >
                  Sign in
                </Link>
              )
            ) : (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>
                Demo mode
              </span>
            )}
            <MiniThemeToggle />
          </div>
        </div>
      </aside>

      {/* ── Mobile + content column ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Mobile header */}
        <header
          style={{
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            height: 48,
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            flexShrink: 0,
          }}
          className="flex md:hidden"
        >
          <Link
            href="/"
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 20,
              fontWeight: 400,
              color: 'var(--text-primary)',
              textDecoration: 'none',
              lineHeight: 1,
            }}
          >
            Ascend
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link
              href="/?new=1"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                color: 'var(--text-muted)',
                textDecoration: 'none',
              }}
            >
              <Plus size={12} strokeWidth={2} />
              New
            </Link>
            <MiniThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav
          style={{
            alignItems: 'center',
            height: 60,
            flexShrink: 0,
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border)',
          }}
          className="flex md:hidden"
        >
          {BOTTOM_NAV.map(({ view: v, label, Icon }) => (
            <Link
              key={v}
              href={viewHref(v, analysisId)}
              className={`bnav-item${view === v ? ' active' : ''}`}
              aria-current={view === v ? 'page' : undefined}
            >
              <Icon size={18} strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
