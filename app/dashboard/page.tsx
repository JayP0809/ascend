'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { DashboardTabs } from '@/components/dashboard/DashboardTabs';
import { CommunityFeed } from '@/components/community/CommunityFeed';
import { SkeletonDashboard } from '@/components/shared/SkeletonCard';
import { Button } from '@/components/ui/button';
import { DashboardData } from '@/lib/types';
import { AlertTriangle, Download, ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';

function DashboardContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoBannerDismissed, setDemoBannerDismissed] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('No analysis ID provided.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/analyze?id=${encodeURIComponent(id)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load analysis');
        if (json.pending) throw new Error('Analysis is still processing. Please go back and try again.');
        setData(json.dashboard);
        setIsDemoMode(json.isDemoMode);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load analysis');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleExportClick = () => {
    const el = document.querySelector('[data-tab-id="export"]') as HTMLButtonElement | null;
    el?.click();
  };

  if (loading) {
    return (
      <div style={{ background: 'var(--bg-secondary)' }} className="min-h-screen">
        <Navbar breadcrumb="Loading..." />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <SkeletonDashboard />
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ background: 'var(--bg-secondary)' }} className="min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center pt-20">
            <div className="h-16 w-16 rounded-full bg-danger bg-opacity-15 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-[var(--danger)]" />
            </div>
            <h2 className="text-xl font-semibold text-primary mb-2">Analysis not found</h2>
            <p className="text-secondary mb-6">{error || 'The analysis could not be loaded.'}</p>
            <Link href="/">
              <Button>
                <ArrowLeft className="h-4 w-4" />
                Back to home
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const targetRole = data.analysis.targetRole;

  return (
    <div style={{ background: 'var(--bg-secondary)' }} className="min-h-screen">
      <Navbar
        breadcrumb={targetRole}
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCommunity((v) => !v)}
              className="hidden sm:flex"
            >
              Community
            </Button>
            <Button size="sm" onClick={handleExportClick}>
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </>
        }
      />

      {/* Demo mode banner */}
      {isDemoMode && !demoBannerDismissed && (
        <div className="bg-[var(--warning)] bg-opacity-15 border-b border-[var(--warning)] border-opacity-20">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-primary">
              <span className="font-semibold">Demo mode</span> — Showing sample data for a Software Engineer → DevOps Engineer transition.{' '}
              <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                Add your Groq API key
              </a>{' '}
              to .env.local to analyze your real resume.
            </p>
            <button
              onClick={() => setDemoBannerDismissed(true)}
              className="text-muted hover:text-primary flex-shrink-0 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className={`flex gap-8 ${showCommunity ? 'items-start' : ''}`}>
          <div className="flex-1 min-w-0">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-primary">
                Your path to <span className="gradient-text">{targetRole}</span>
              </h1>
              <p className="text-secondary mt-1 text-sm">
                {data.analysis.skillExtraction.experience_years} years experience ·{' '}
                {data.analysis.skillExtraction.current_skills.length} skills identified ·{' '}
                {data.analysis.roadmap.length} roadmap phases
              </p>
            </div>
            <DashboardTabs data={data} />
          </div>

          {showCommunity && (
            <aside className="w-80 flex-shrink-0 hidden lg:block">
              <div className="sticky top-24">
                <CommunityFeed />
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div style={{ background: 'var(--bg-secondary)' }} className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <SkeletonDashboard />
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
