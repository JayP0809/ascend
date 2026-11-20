'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell, AppView } from '@/components/shared/AppShell';
import { OverviewTab } from '@/components/dashboard/OverviewTab';
import { SkillGapTab } from '@/components/dashboard/SkillGapTab';
import { RoadmapTab } from '@/components/dashboard/RoadmapTab';
import { InsightsTab } from '@/components/dashboard/InsightsTab';
import { ExportTab } from '@/components/dashboard/ExportTab';
import { SkeletonDashboard } from '@/components/shared/SkeletonCard';
import { Button } from '@/components/ui/button';
import { DashboardData } from '@/lib/types';
import { AlertTriangle, ArrowLeft, X, Bookmark, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const VIEW_LABELS: Record<string, string> = {
  report:   'Career analysis',
  skills:   'Skill gap assessment',
  roadmap:  'Development roadmap',
  insights: 'Insights',
  export:   'Export',
  saved:    'Saved analyses',
};

/* ── Saved analyses view ───────────────────────────────────────────── */
interface SavedEntry {
  id: string;
  target_role: string;
  readiness_score: number;
  created_at: string;
}

interface SavedViewProps {
  currentAnalysisId?: string | null;
}

function SavedView({ currentAnalysisId }: SavedViewProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<SavedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Single-analysis deletion state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Clear All state
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [clearAllInput, setClearAllInput] = useState('');
  const [clearingAll, setClearingAll] = useState(false);
  const [clearAllError, setClearAllError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/user/analyses');
        if (res.status === 401) { setAuthed(false); setLoading(false); return; }
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setFetchError(json.error || 'Could not load saved analyses.');
          setLoading(false);
          return;
        }
        const json = await res.json();
        const raw = json.analyses;
        if (!Array.isArray(raw)) {
          setFetchError('Unexpected response from server. Please try again.');
          return;
        }
        setEntries(raw);
        setAuthed(true);
      } catch {
        setFetchError('Could not load saved analyses. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const handleDelete = async (analysisId: string) => {
    setDeletingId(analysisId);
    setDeleteError(null);
    try {
      const res = await fetch('/api/user/analyses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setDeleteError(json.error || 'Deletion failed. Please try again.');
        setDeletingId(null);
        return;
      }

      // Clear roadmap progress for this analysis only.
      try { localStorage.removeItem(`roadmap-complete-${analysisId}`); } catch { /* ignore */ }

      const remaining = entries.filter((e) => e.id !== analysisId);
      setEntries(remaining);
      setConfirmDeleteId(null);
      setDeletingId(null);

      // If the deleted analysis was active, navigate to saved view or landing.
      if (currentAnalysisId === analysisId) {
        if (remaining.length > 0) {
          router.replace(`/dashboard?view=saved`);
        } else {
          router.replace('/');
        }
      }
    } catch {
      setDeleteError('Could not reach the server. Check your connection and try again.');
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (clearAllInput !== 'DELETE') return;
    setClearingAll(true);
    setClearAllError(null);
    try {
      const res = await fetch('/api/user/analyses/all', { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setClearAllError(json.error || 'Deletion failed. Please try again.');
        setClearingAll(false);
        return;
      }
      // Clear roadmap progress for every deleted entry.
      for (const entry of entries) {
        try { localStorage.removeItem(`roadmap-complete-${entry.id}`); } catch { /* ignore */ }
      }
      setEntries([]);
      setClearAllOpen(false);
      setClearAllInput('');
      setClearingAll(false);
      // If viewing a specific analysis, navigate away from it.
      if (currentAnalysisId) router.replace('/dashboard?view=saved');
    } catch {
      setClearAllError('Could not reach the server. Check your connection and try again.');
      setClearingAll(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 0' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 56,
              borderRadius: 3,
              background: 'var(--bg-secondary)',
              marginBottom: 8,
              opacity: 0.6,
            }}
          />
        ))}
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ paddingTop: 40 }}>
        <p style={{ fontSize: 14, color: 'var(--danger)', marginBottom: 12 }}>{fetchError}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (authed === false) {
    return (
      <div style={{ paddingTop: 40, textAlign: 'center' }}>
        <Bookmark
          size={32}
          strokeWidth={1}
          style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }}
        />
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Sign in to see your saved analyses.
        </p>
        <Link
          href="/sign-in"
          style={{
            display: 'inline-block',
            padding: '8px 20px',
            borderRadius: 3,
            background: 'var(--accent)',
            color: 'var(--accent-fg)',
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ paddingTop: 40, textAlign: 'center' }}>
        <Bookmark
          size={32}
          strokeWidth={1}
          style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }}
        />
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
          No saved analyses yet.
        </p>
        <Link
          href="/?new=1"
          style={{
            display: 'inline-block',
            padding: '8px 20px',
            borderRadius: 3,
            background: 'var(--accent)',
            color: 'var(--accent-fg)',
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          New analysis
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header: New analysis (right) + Clear all (left) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button
          onClick={() => { setClearAllOpen(true); setClearAllInput(''); setClearAllError(null); }}
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
        >
          Clear all
        </button>
        <Link
          href="/?new=1"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          New analysis
        </Link>
      </div>

      {entries.map((entry) => (
        <div
          key={entry.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <Link
            href={`/dashboard?id=${encodeURIComponent(entry.id)}&view=report`}
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '14px 0',
              textDecoration: 'none',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
                {entry.target_role}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            {entry.readiness_score > 0 && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  flexShrink: 0,
                }}
              >
                {entry.readiness_score}%
              </span>
            )}
          </Link>

          {/* Delete button — discreet, opens confirmation */}
          <button
            onClick={() => { setConfirmDeleteId(entry.id); setDeleteError(null); }}
            aria-label={`Delete analysis for ${entry.target_role}`}
            disabled={deletingId === entry.id}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 3,
              border: 'none',
              background: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              opacity: deletingId === entry.id ? 0.4 : 1,
              transition: 'color 0.1s, opacity 0.1s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
            }}
          >
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        </div>
      ))}

      {/* Clear All confirmation dialog */}
      {clearAllOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-all-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.35)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => { if (!clearingAll) { setClearAllOpen(false); setClearAllInput(''); setClearAllError(null); } }}
        >
          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 4,
              padding: 24,
              maxWidth: 380,
              width: '100%',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p id="clear-all-title" style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
              Delete all saved analyses?
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
              This will permanently delete all {entries.length} saved {entries.length === 1 ? 'analysis' : 'analyses'} for
              your account. This cannot be undone.
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Type <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>DELETE</span> to confirm.
            </p>
            <input
              type="text"
              value={clearAllInput}
              onChange={(e) => { setClearAllInput(e.target.value); setClearAllError(null); }}
              placeholder="DELETE"
              autoComplete="off"
              spellCheck={false}
              disabled={clearingAll}
              style={{
                width: '100%',
                padding: '8px 10px',
                marginBottom: clearAllError ? 8 : 16,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-strong)',
                borderRadius: 3,
                fontSize: 13,
                color: 'var(--text-primary)',
                outline: 'none',
                fontFamily: 'monospace',
                opacity: clearingAll ? 0.6 : 1,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--text-primary)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
            />
            {clearAllError && (
              <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 12 }}>{clearAllError}</p>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setClearAllOpen(false); setClearAllInput(''); setClearAllError(null); }}
                disabled={clearingAll}
                style={{
                  padding: '7px 14px',
                  borderRadius: 3,
                  border: '1px solid var(--border-strong)',
                  background: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: clearingAll ? 'not-allowed' : 'pointer',
                  opacity: clearingAll ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                disabled={clearAllInput !== 'DELETE' || clearingAll}
                style={{
                  padding: '7px 14px',
                  borderRadius: 3,
                  border: 'none',
                  background: 'var(--danger)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: (clearAllInput !== 'DELETE' || clearingAll) ? 'not-allowed' : 'pointer',
                  opacity: (clearAllInput !== 'DELETE' || clearingAll) ? 0.5 : 1,
                }}
              >
                {clearingAll ? 'Deleting...' : 'Delete all analyses'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single-analysis confirmation dialog */}
      {confirmDeleteId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.35)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => {
            if (deletingId !== confirmDeleteId) {
              setConfirmDeleteId(null);
              setDeleteError(null);
            }
          }}
        >
          <div
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 4,
              padding: 24,
              maxWidth: 360,
              width: '100%',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
              Delete this analysis?
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: deleteError ? 12 : 20 }}>
              This is permanent and cannot be undone. Your roadmap progress for this role will be cleared.
            </p>
            {deleteError && (
              <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 16 }}>{deleteError}</p>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setConfirmDeleteId(null); setDeleteError(null); }}
                disabled={deletingId === confirmDeleteId}
                style={{
                  padding: '7px 14px',
                  borderRadius: 3,
                  border: '1px solid var(--border-strong)',
                  background: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: deletingId === confirmDeleteId ? 'not-allowed' : 'pointer',
                  opacity: deletingId === confirmDeleteId ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                style={{
                  padding: '7px 14px',
                  borderRadius: 3,
                  border: 'none',
                  background: 'var(--danger)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: deletingId === confirmDeleteId ? 'not-allowed' : 'pointer',
                  opacity: deletingId === confirmDeleteId ? 0.7 : 1,
                }}
              >
                {deletingId === confirmDeleteId ? 'Deleting...' : 'Delete analysis'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main dashboard content ────────────────────────────────────────── */
function DashboardContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const roleParam = searchParams.get('role');
  const rawView = searchParams.get('view') ?? 'report';
  const view = (
    ['report', 'skills', 'roadmap', 'insights', 'export', 'saved'].includes(rawView)
      ? rawView
      : 'report'
  ) as AppView;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sampleUnavailable, setSampleUnavailable] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoBannerDismissed, setDemoBannerDismissed] = useState(false);

  const needsAnalysis = ['report', 'skills', 'roadmap', 'insights', 'export'].includes(view);

  useEffect(() => {
    if (!needsAnalysis) {
      setLoading(false);
      return;
    }
    if (!id) {
      setError('No analysis ID provided.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const isDemoId = /^demo-/i.test(id ?? '');
        const url = isDemoId && roleParam
          ? `/api/analyze?id=${encodeURIComponent(id)}&role=${encodeURIComponent(roleParam)}`
          : `/api/analyze?id=${encodeURIComponent(id)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok) {
          if (json.error === 'sample_unavailable') {
            setSampleUnavailable(true);
            setLoading(false);
            return;
          }
          throw new Error(json.message || json.error || 'Failed to load analysis');
        }
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
  }, [id, needsAnalysis, roleParam]);

  /* ── Non-analysis views (no data needed) ── */
  if (view === 'saved') {
    return (
      <AppShell view={view} analysisId={id}>
        <div className="content-wrap">
          <p className="label" style={{ marginBottom: 12 }}>Saved analyses</p>
          <h2
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 28,
              fontWeight: 400,
              color: 'var(--text-primary)',
              marginBottom: 32,
              lineHeight: 1.2,
            }}
          >
            Your career roadmaps
          </h2>
          <SavedView currentAnalysisId={id} />
        </div>
      </AppShell>
    );
  }

  /* ── Loading state ── */
  if (loading) {
    return (
      <AppShell view={view} analysisId={id}>
        <div className="content-wrap">
          <SkeletonDashboard />
        </div>
      </AppShell>
    );
  }

  /* ── Sample unavailable state ── */
  if (sampleUnavailable) {
    const roleName = roleParam || 'this role';
    return (
      <AppShell view={view} analysisId={id}>
        <div className="content-wrap">
          <div style={{ maxWidth: 460, paddingTop: 40 }}>
            <p className="label" style={{ marginBottom: 12 }}>Sample not available</p>
            <h2
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 24,
                fontWeight: 400,
                color: 'var(--text-primary)',
                marginBottom: 12,
                lineHeight: 1.3,
              }}
            >
              No sample analysis for {roleName}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.6 }}>
              A tailored sample is not available for this role yet. The sample resume feature uses a consistent fictional candidate and only supports roles we have high-quality reference data for.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.6 }}>
              You can try a supported role, such as Software Engineer, Data Scientist, Product Manager, DevOps Engineer, or Investment Banking Analyst. You can also upload your own resume for a personalized analysis.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/">
                <Button>
                  <ArrowLeft size={14} />
                  Choose another role
                </Button>
              </Link>
              <Link href="/?upload=true">
                <Button variant="ghost">
                  Upload my resume instead
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ── Error state ── */
  if (error || !data) {
    return (
      <AppShell view={view} analysisId={id}>
        <div className="content-wrap">
          <div style={{ maxWidth: 400, paddingTop: 40 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--danger-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
            </div>
            <h2
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 22,
                fontWeight: 400,
                color: 'var(--text-primary)',
                marginBottom: 8,
              }}
            >
              Analysis not found
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              {error || 'The analysis could not be loaded.'}
            </p>
            <Link href="/">
              <Button>
                <ArrowLeft size={14} />
                Back to home
              </Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ── Analysis views ── */
  const targetRole = data.analysis.targetRole;
  const viewLabel = VIEW_LABELS[view] ?? 'Career analysis';

  return (
    <AppShell view={view} analysisId={id}>
      {/* Demo mode banner */}
      {isDemoMode && !demoBannerDismissed && (
        <div
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
          }}
        >
          <div
            style={{
              maxWidth: 720,
              margin: '0 auto',
              padding: '10px 40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Sample analysis.</span>
              {' '}You&apos;re exploring a fictional career roadmap.{' '}
              <Link
                href="/sign-in"
                style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}
              >
                Sign in
              </Link>
              {' '}to generate your own.
            </p>
            <button
              onClick={() => setDemoBannerDismissed(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0 }}
              aria-label="Dismiss"
            >
              <X size={14} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>
      )}

      <div className="content-wrap">
        {/* Page header */}
        <p className="label" style={{ marginBottom: 12 }}>{viewLabel}</p>
        <h2
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 'clamp(1.6rem, 3.5vw, 2.25rem)',
            fontWeight: 400,
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
            color: 'var(--text-primary)',
            marginBottom: 6,
          }}
        >
          {targetRole}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 36 }}>
          {data.analysis.skillExtraction.experience_years} years experience
          {' · '}
          {data.analysis.skillExtraction.current_skills.length} skills identified
          {' · '}
          {data.analysis.roadmap.length} roadmap phases
        </p>

        {/* View content */}
        {view === 'report'   && <OverviewTab data={data} />}
        {view === 'skills'   && <SkillGapTab data={data} />}
        {view === 'roadmap'  && <RoadmapTab  data={data} />}
        {view === 'insights' && <InsightsTab data={data} />}
        {view === 'export'   && <ExportTab  data={data} />}
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 40px 80px' }}>
            <SkeletonDashboard />
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
