'use client';
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import { Navbar } from '@/components/shared/Navbar';
import { ResumeDropzone } from '@/components/upload/ResumeDropzone';
import { SampleResumePreview } from '@/components/landing/SampleResumePreview';
import { Loader2, AlertTriangle, ArrowLeft, ChevronDown } from 'lucide-react';
import { DEMO_ANALYSIS_ID } from '@/lib/constants';
import { searchRoles } from '@/lib/roles';

const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';

type Step = 'question' | 'resume' | 'resume-preview' | 'analyzing';

// Cycling messages shown during analysis.
// These describe what the AI pipeline is working on; they are NOT sequential
// confirmed stages. The backend is a single POST that runs everything at once.
// Messages cycle on a timer purely to show activity, not backend progress.
const CYCLE_MESSAGES = [
  'Reading your resume...',
  'Mapping your skills to the role...',
  'Identifying gaps and opportunities...',
  'Writing your personalized roadmap...',
] as const;

// ── Analyzing view ────────────────────────────────────────────────────────────
// Fires POST /api/analyze once on mount. Cycles through messages on a timer
// to show activity; these do NOT reflect confirmed backend sub-steps.
function AnalyzingView({
  analysisId,
  targetRole,
  jobDescription,
  onComplete,
}: {
  analysisId: string;
  targetRole: string;
  jobDescription?: string;
  onComplete: (id: string) => void;
}) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const fired = useRef(false);
  const isMounted = useRef(true);

  // Track mount state so we never call setState or callbacks after unmount.
  // Reset to true on (re)mount so React Strict Mode's cleanup+remount cycle
  // doesn't leave isMounted false for the real mounted instance.
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    // Cycle messages every ~4 s to show the page is alive.
    const interval = setInterval(() => {
      if (isMounted.current) {
        setMsgIdx((prev) => (prev + 1) % CYCLE_MESSAGES.length);
      }
    }, 4000);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);

    async function run() {
      try {
        const body: Record<string, unknown> = { analysisId, targetRole };
        if (jobDescription?.trim()) body.jobDescription = jobDescription.trim();

        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (!res.ok) {
          // sample_unavailable: route to dashboard; it renders the dedicated
          // "SAMPLE NOT AVAILABLE" screen when the GET also returns 404.
          if (data.error === 'sample_unavailable') {
            clearInterval(interval);
            if (!isMounted.current) return;
            onComplete(analysisId);
            return;
          }
          throw Object.assign(new Error(data.message || data.error || 'Analysis failed'), { hint: data.hint });
        }
        clearInterval(interval);
        if (!isMounted.current) return;
        onComplete(data.analysisId);
      } catch (err) {
        clearTimeout(timeoutId);
        clearInterval(interval);
        if (!isMounted.current) return;
        const isTimeout = err instanceof Error && err.name === 'AbortError';
        const hint = isTimeout ? null : ((err as { hint?: string }).hint ?? null);
        setError(isTimeout ? 'The request timed out. Please try again.' : (err instanceof Error ? err.message : 'Analysis failed'));
        setErrorHint(hint);
      }
    }

    run();
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
      // Do NOT abort the controller here: React 18 Strict Mode runs effect
      // cleanup before remounting, which would cancel the in-flight fetch and
      // leave the loading screen up forever. The 90s timeout handles real hangs.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div className="text-center max-w-sm">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full border mb-5"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
          >
            <AlertTriangle className="w-6 h-6" style={{ color: 'var(--danger)' }} />
          </div>
          <h2
            className="font-serif text-2xl font-light mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Analysis failed
          </h2>
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            {error}
          </p>
          {errorHint && (
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
              {errorHint}
            </p>
          )}
          <Link
            href="/"
            className="text-sm underline-offset-2 hover:underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            Start over
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="w-full max-w-xs text-center">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-full border mb-5 mx-auto"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>

        <h2
          className="font-serif text-2xl font-light mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          Analyzing your profile
        </h2>

        {/* Show the entered role so the user can confirm it was captured correctly. */}
        {targetRole && (
          <p
            className="font-serif text-sm italic mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            for {targetRole}
          </p>
        )}

        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
          Usually 15–30 seconds
        </p>

        {/* Single cycling message, framed as ongoing activity, not confirmed stages. */}
        <p
          className="text-sm"
          style={{ color: 'var(--text-secondary)' }}
          aria-live="polite"
          aria-atomic="true"
        >
          {CYCLE_MESSAGES[msgIdx]}
        </p>
      </div>
    </div>
  );
}

// ── Question input with blinking cursor + role autocomplete ──────────────────
function QuestionInput({ onSubmit }: { onSubmit: (role: string) => void }) {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: string; title: string }[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Prevents the autocomplete useEffect from reopening the dropdown immediately
  // after the user selects a suggestion (either by click or keyboard Enter).
  const suppressNextSuggestionsRef = useRef(false);
  const canSubmit = value.trim().length > 0;

  // Auto-focus on mount (desktop only).
  // useLayoutEffect fires synchronously after DOM commit, before browser paint.
  // This is the same lifecycle phase React uses internally for the autoFocus
  // prop. Running here (rather than useEffect) means nothing async (theme
  // initialization, session loading, or other effects) can steal focus between
  // the DOM commit and our focus call.
  // The autoFocus prop below is kept as an additional layer for the SSR/hydration
  // path where the browser handles autofocus from the initial HTML.
  useLayoutEffect(() => {
    if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  // Redirect printable keystrokes to the role input when it is unfocused.
  // This covers typing immediately after the theme toggle (or any other
  // focus-stealing control) without requiring a manual click first.
  // Only active while this component is mounted (question step only).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Touch devices manage focus through the soft keyboard; skip there.
    if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Let modifier combos (shortcuts) pass through untouched.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Only single-character printable keys (excludes Tab, Enter, Escape, arrows, etc.).
      if (e.key.length !== 1) return;
      // Input already has focus; nothing to redirect.
      if (document.activeElement === inputRef.current) return;
      // Never steal from another text field or editable element.
      const active = document.activeElement as HTMLElement | null;
      if (active) {
        const tag = active.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        if (active.isContentEditable) return;
        // Don't steal Space or Enter from interactive controls:
        // Space activates buttons; Enter follows links / activates buttons.
        if (e.key === ' ' || e.key === 'Enter') {
          if (
            tag === 'button' || tag === 'a' || tag === 'select' ||
            active.getAttribute('role') === 'button' ||
            active.hasAttribute('tabindex')
          ) return;
        }
        // Don't redirect when focus is inside an open dialog.
        if (active.closest('[role="dialog"]')) return;
      }

      // Redirect: claim the keystroke, focus the input, append the character.
      e.preventDefault();
      inputRef.current?.focus({ preventScroll: true });
      setValue(prev => prev + e.key);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); };
  }, []);

  useEffect(() => {
    if (suppressNextSuggestionsRef.current) {
      suppressNextSuggestionsRef.current = false;
      return;
    }
    const q = value.trim();
    if (!q) { setSuggestions([]); setOpen(false); return; }
    const results = searchRoles(q);
    setSuggestions(results.map(r => ({ id: r.id, title: r.title })));
    setOpen(results.length > 0);
    setActiveIdx(-1);
  }, [value]);

  const selectSuggestion = useCallback((title: string) => {
    suppressNextSuggestionsRef.current = true;
    setValue(title);
    setOpen(false);
    setSuggestions([]);
    setActiveIdx(-1);
    // Input keeps focus because onMouseDown calls e.preventDefault() below.
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx(prev => Math.min(prev + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx(prev => Math.max(prev - 1, -1));
        return;
      }
      if (e.key === 'Enter' && activeIdx >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[activeIdx].title);
        return;
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setActiveIdx(-1);
        return;
      }
    }
    if (e.key === 'Enter' && canSubmit) onSubmit(value.trim());
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Underline input row: has-value class drives cursor/caret visibility via globals.css */}
      <div
        className={`hero-input-wrap${value ? ' has-value' : ''}`}
        onClick={() => inputRef.current?.focus()}
      >
        <span className="hero-cursor" aria-hidden="true" />
        <input
          id="role-input"
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          placeholder="e.g. Senior Product Manager, Data Scientist..."
          className="hero-text-input"
          aria-label="Target career role"
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />
      </div>

      {/* Autocomplete dropdown */}
      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 8,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            boxShadow: 'var(--shadow-lg)',
            zIndex: 50,
            listStyle: 'none',
            padding: '6px',
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={(e) => {
                // preventDefault keeps input focused; mouseDown fires before blur
                // so the selection is committed before the blur handler runs.
                e.preventDefault();
                selectSuggestion(s.title);
              }}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                padding: '10px 14px',
                fontSize: 14,
                cursor: 'pointer',
                borderRadius: 12,
                color: i === activeIdx ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: i === activeIdx ? 'var(--accent-light)' : 'transparent',
                transition: 'background 0.08s',
              }}
            >
              {s.title}
            </li>
          ))}
        </ul>
      )}

      {/* Hint: fades in once the user has typed a role */}
      <div className="mt-4">
        <p
          className="text-sm"
          style={{
            color: 'var(--text-muted)',
            opacity: canSubmit ? 1 : 0,
            transition: 'opacity 0.2s',
          }}
          aria-live="polite"
        >
          Press Enter to continue
        </p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [step, setStep] = useState<Step>('question');
  const [targetRole, setTargetRole] = useState('');
  const [analysisId, setAnalysisId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jdExpanded, setJdExpanded] = useState(false);
  const [resumeCheckDone, setResumeCheckDone] = useState(false);
  // Set to true in the first effect when we detect ?step=resume (OAuth return).
  // The auto-resume effect checks this ref to skip the redirect.
  const oauthReturnRef = useRef(false);
  // Set to true when we detect ?new=1 (explicit New Analysis intent).
  // Survives auth loading → authenticated transitions so the effect re-runs
  // do not override the bypass even after the URL is cleared.
  const newAnalysisRef = useRef(false);

  // Preserve ?step=preview: navigating back from the demo dashboard shows
  // the sample resume so the user can decide whether to continue.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('step') === 'resume') {
      oauthReturnRef.current = true;
      const role = params.get('role');
      if (role) setTargetRole(decodeURIComponent(role));
      setStep('resume');
      window.history.replaceState({}, '', '/');
      return;
    }
    if (params.get('step') === 'preview') {
      setAnalysisId(DEMO_ANALYSIS_ID);
      setStep('resume-preview');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Auto-resume: redirect authenticated users to their most recent saved analysis.
  // Runs on every homepage visit (refresh, back-nav, sign-in) so the newest
  // analysis is always opened. Only skipped for explicit bypasses.
  //
  // Key invariant: never decide the user has no analyses while Auth.js is still
  // loading. Wait until sessionStatus resolves so the cookie is available to the
  // /api/user/analyses endpoint.
  useEffect(() => {
    if (typeof window === 'undefined') { setResumeCheckDone(true); return; }

    // OAuth return: first effect already set this ref and placed the user on the
    // resume upload step. Skip auto-resume so they land where they intended.
    if (oauthReturnRef.current) {
      setResumeCheckDone(true);
      return;
    }

    const params = new URLSearchParams(window.location.search);

    // ?new=1: explicit "New Analysis" intent. Set the ref before clearing the
    // URL so subsequent effect runs (triggered by sessionStatus changing from
    // 'loading' → 'authenticated') still see the bypass even though the
    // query param is gone.
    if (params.get('new') === '1') {
      newAnalysisRef.current = true;
      window.history.replaceState({}, '', '/');
      setResumeCheckDone(true);
      return;
    }

    // Ref was set in a prior run (URL already cleared). Keep bypass active.
    if (newAnalysisRef.current) {
      setResumeCheckDone(true);
      return;
    }

    // ?step=preview: sample preview flow; skip auto-resume.
    if (params.get('step') === 'preview') {
      setResumeCheckDone(true);
      return;
    }

    // Auth not yet resolved: hold the loading screen and wait for the next
    // render when sessionStatus changes. Do NOT set resumeCheckDone here.
    if (AUTH_ENABLED && sessionStatus === 'loading') return;

    // Signed out or auth disabled: show the landing page immediately.
    if (!AUTH_ENABLED || sessionStatus === 'unauthenticated') {
      setResumeCheckDone(true);
      return;
    }

    // Authenticated: fetch this user's analyses and redirect to the newest.
    let cancelled = false;
    async function tryResume() {
      try {
        const res = await fetch('/api/user/analyses');
        if (cancelled) return;
        if (!res.ok) { setResumeCheckDone(true); return; }
        const json = await res.json();
        if (cancelled) return;
        if (!Array.isArray(json.analyses) || json.analyses.length === 0) {
          setResumeCheckDone(true);
          return;
        }
        router.replace(`/dashboard?id=${encodeURIComponent(json.analyses[0].id)}&view=report`);
      } catch {
        if (!cancelled) setResumeCheckDone(true);
      }
    }
    void tryResume();
    return () => { cancelled = true; };
  }, [router, sessionStatus]);

  const handleRoleEntered = useCallback((role: string) => {
    setTargetRole(role);
    setStep('resume');
  }, []);

  const handleSampleResumeFromResume = useCallback(() => {
    setAnalysisId(DEMO_ANALYSIS_ID);
    setStep('resume-preview');
  }, []);

  const handleResumePreviewContinue = useCallback(() => {
    if (targetRole.trim()) {
      setAnalysisId(DEMO_ANALYSIS_ID);
      setStep('analyzing');
    } else {
      // Back-nav case: arrived at resume-preview without a role; collect one first.
      setStep('question');
    }
  }, [targetRole]);

  const handleUploadComplete = useCallback((id: string) => {
    setAnalysisId(id);
    setStep('analyzing');
  }, []);

  const handleAnalysisComplete = useCallback(
    (id: string) => {
      const isDemoId = /^demo-/i.test(id);
      const url = isDemoId && targetRole.trim()
        ? `/dashboard?id=${id}&role=${encodeURIComponent(targetRole.trim())}`
        : `/dashboard?id=${id}`;
      router.push(url);
    },
    [router, targetRole]
  );

  // Hold rendering until the auto-resume check resolves to prevent flicker.
  if (!resumeCheckDone) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
        <Navbar />
      </div>
    );
  }

  // ── Analyzing step ──────────────────────────────────────────────────────────
  if (step === 'analyzing') {
    return (
      <>
        <Navbar />
        <AnalyzingView
          analysisId={analysisId}
          targetRole={targetRole}
          jobDescription={jobDescription}
          onComplete={handleAnalysisComplete}
        />
      </>
    );
  }

  // ── Sample resume preview ───────────────────────────────────────────────────
  if (step === 'resume-preview') {
    return (
      <div style={{ background: 'var(--bg-primary)' }} className="min-h-screen">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-10 sm:py-14">
          <button
            onClick={() => setStep(targetRole.trim() ? 'resume' : 'question')}
            className="flex items-center gap-1.5 text-sm mb-7 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <h2
            className="font-serif text-2xl font-light mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Sample resume
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            Fixed example analysis using fictional data. Results are not specific to your chosen role.
          </p>
          <SampleResumePreview
            onBack={() => setStep(targetRole.trim() ? 'resume' : 'question')}
            onContinue={handleResumePreviewContinue}
          />
        </div>
      </div>
    );
  }

  // ── Resume step ─────────────────────────────────────────────────────────────
  if (step === 'resume') {
    const JD_MAX = 5000;
    const callbackUrl = `/?step=resume&role=${encodeURIComponent(targetRole)}`;

    if (AUTH_ENABLED && sessionStatus === 'loading') {
      return (
        <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
          <Navbar />
        </div>
      );
    }

    if (AUTH_ENABLED && !session) {
      return (
        <div style={{ background: 'var(--bg-primary)' }} className="min-h-screen">
          <Navbar />
          <div className="max-w-lg mx-auto px-4 py-10 sm:py-16">
            <button
              onClick={() => setStep('question')}
              className="flex items-center gap-1.5 text-sm mb-7 hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <div className="mb-8">
              <p
                className="text-xs uppercase tracking-widest font-medium mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Target role
              </p>
              <p
                className="font-serif text-2xl font-light"
                style={{ color: 'var(--text-primary)' }}
              >
                {targetRole}
              </p>
            </div>

            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: '28px 24px',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  marginBottom: 6,
                }}
              >
                Sign in to upload your resume
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  marginBottom: 20,
                  lineHeight: 1.5,
                }}
              >
                Your resume is sent to Groq&apos;s API for analysis. Sign in to save
                your results and track your progress over time.
              </p>
              <button
                onClick={() => signIn('google', { callbackUrl })}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  borderRadius: 3,
                  background: 'var(--accent)',
                  color: 'var(--accent-fg)',
                  fontSize: 13,
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Continue with Google
              </button>
            </div>

            <div
              className="mt-6 pt-6 border-t text-center"
              style={{ borderColor: 'var(--border)' }}
            >
              <button
                onClick={handleSampleResumeFromResume}
                className="text-sm hover:opacity-70 transition-opacity"
                style={{
                  color: 'var(--text-secondary)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                Use a sample resume instead
              </button>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Fixed example analysis using fictional data. Results are not specific to your chosen role.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ background: 'var(--bg-primary)' }} className="min-h-screen">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-10 sm:py-16">
          <button
            onClick={() => setStep('question')}
            className="flex items-center gap-1.5 text-sm mb-7 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          {/* Target role with inline edit link */}
          <div className="mb-8">
            <p
              className="text-xs uppercase tracking-widest font-medium mb-1"
              style={{ color: 'var(--text-muted)' }}
            >
              Target role
            </p>
            <div className="flex items-baseline gap-3">
              <p
                className="font-serif text-2xl font-light"
                style={{ color: 'var(--text-primary)' }}
              >
                {targetRole}
              </p>
              <button
                onClick={() => setStep('question')}
                className="text-xs hover:opacity-70 transition-opacity"
                style={{
                  color: 'var(--text-muted)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                Edit
              </button>
            </div>
          </div>

          {/* Upload section */}
          <ResumeDropzone onUploadComplete={handleUploadComplete} />

          {/* Use a sample resume */}
          <div
            className="mt-6 pt-6 border-t text-center"
            style={{ borderColor: 'var(--border)' }}
          >
            <button
              onClick={handleSampleResumeFromResume}
              className="text-sm hover:opacity-70 transition-opacity"
              style={{
                color: 'var(--text-secondary)',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              Use a sample resume instead
            </button>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Fixed example analysis using fictional data. Results are not specific to your chosen role.
            </p>
          </div>

          {/* Optional job description */}
          <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => setJdExpanded(prev => !prev)}
              className="flex items-center gap-2 text-sm w-full text-left hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-secondary)' }}
              aria-expanded={jdExpanded}
            >
              <ChevronDown
                className="w-4 h-4 flex-shrink-0 transition-transform duration-150"
                style={{
                  color: 'var(--text-muted)',
                  transform: jdExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
              Add a job description{' '}
              <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
            </button>

            {jdExpanded && (
              <div className="mt-3">
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value.slice(0, JD_MAX))}
                  placeholder="Paste the job description here to tailor the analysis to this specific posting..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 4,
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: 'var(--text-primary)',
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--text-primary)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
                />
                <p
                  className="text-xs text-right mt-1"
                  style={{
                    color: jobDescription.length >= JD_MAX ? 'var(--danger)' : 'var(--text-muted)',
                  }}
                >
                  {jobDescription.length.toLocaleString()} / {JD_MAX.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <p
            className="text-xs text-center mt-5"
            style={{ color: 'var(--text-muted)' }}
          >
            Your resume is processed by Groq&apos;s API and is not stored permanently.
          </p>
        </div>
      </div>
    );
  }

  // ── Question step (default) ─────────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--bg-primary)' }} className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6">
        {/* Hero */}
        <div className="w-full max-w-2xl mx-auto py-20 sm:py-24">
          <h1
            className="font-serif text-center mb-12 sm:mb-14"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              lineHeight: 1.2,
              fontWeight: 300,
              color: 'var(--text-primary)',
            }}
          >
            What role are you{' '}
            <em style={{ fontStyle: 'italic' }}>working toward?</em>
          </h1>

          <QuestionInput onSubmit={handleRoleEntered} />
        </div>
      </main>

      {/* Sample analysis preview */}
      <section
        style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}
      >
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <p
            className="text-xs uppercase tracking-widest font-medium mb-8"
            style={{ color: 'var(--text-muted)' }}
          >
            Sample Analysis
          </p>

          <div
            className="rounded border"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-primary)' }}
          >
            {/* Person header */}
            <div
              className="flex items-start justify-between gap-4 p-6 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <div>
                <p className="font-serif text-xl font-light" style={{ color: 'var(--text-primary)' }}>
                  John Doe
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Backend Software Engineer
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Targeting Staff Software Engineer
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p
                  className="font-serif text-3xl font-light leading-none"
                  style={{ color: 'var(--text-primary)' }}
                >
                  75
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>/ 100 readiness</p>
              </div>
            </div>

            {/* Skill rows */}
            <div className="px-6">
              {(
                [
                  { name: 'Python',                   status: 'has',         label: 'Already have' },
                  { name: 'Technical leadership',      status: 'critical',    label: 'Critical gap'  },
                  { name: 'Platform engineering',      status: 'critical',    label: 'Critical gap'  },
                  { name: 'Technical documentation',   status: 'transferable',label: 'Transferable'  },
                ] as const
              ).map(({ name, status, label }) => (
                <div
                  key={name}
                  className="flex items-center justify-between py-3.5 border-b last:border-b-0"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {name}
                  </span>
                  <span
                    className="text-xs px-2.5 py-1 rounded font-medium"
                    style={
                      status === 'has'
                        ? { color: 'var(--sl-has-fg)',  background: 'var(--sl-has-bg)'  }
                        : status === 'critical'
                        ? { color: 'var(--sl-crit-fg)', background: 'var(--sl-crit-bg)' }
                        : { color: 'var(--sl-xfer-fg)', background: 'var(--sl-xfer-bg)' }
                    }
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="px-6 py-5">
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setTimeout(() => document.getElementById('role-input')?.focus(), 350);
                }}
                className="text-sm font-medium hover:opacity-70 transition-opacity"
                style={{
                  color: 'var(--text-primary)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                Analyze your resume
              </button>
            </div>
          </div>

          <p className="text-xs mt-4 text-center" style={{ color: 'var(--text-muted)' }}>
            Fictional data shown for illustration. AI-generated results are heuristic estimates.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t py-6 px-4"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            AI-generated results are heuristic estimates, not professional career advice.
          </p>
          <nav
            className="flex gap-5 text-xs"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Legal"
          >
            <Link href="/privacy" className="hover:opacity-70 transition-opacity">
              Privacy
            </Link>
            <Link href="/terms" className="hover:opacity-70 transition-opacity">
              Terms
            </Link>
            <Link href="/settings" className="hover:opacity-70 transition-opacity">
              Account
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
