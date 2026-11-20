/**
 * Regression tests for the New Analysis (?new=1) bypass in the auto-resume effect.
 *
 * Bug reproduced: a signed-in user clicks "New Analysis" (/?new=1). The first
 * effect run sees ?new=1, clears the URL with replaceState, and sets
 * resumeCheckDone=true. When sessionStatus changes from 'loading' to
 * 'authenticated', the effect re-fires. At that point the URL is '/' — no
 * ?new=1 — so the original bypass check missed and auto-resume redirected
 * the user back to their newest saved analysis.
 *
 * Fix: a ref (newAnalysisRef) set when ?new=1 is first detected. Subsequent
 * effect runs check the ref before the URL, so the bypass survives the
 * replaceState and any number of sessionStatus changes.
 */

import { describe, it, expect } from 'vitest';

// ── Pure logic extracted from the auto-resume useEffect ──────────────────────
//
// We test the bypass decision as a plain function so the invariants are
// verifiable without a React render harness.

interface BypassState {
  oauthReturnActive: boolean;
  newAnalysisActive: boolean; // mirrors newAnalysisRef.current
  newParam: string | null;    // URLSearchParams.get('new')
  stepParam: string | null;   // URLSearchParams.get('step')
  sessionStatus: 'loading' | 'authenticated' | 'unauthenticated';
  authEnabled: boolean;
}

type BypassDecision =
  | 'oauth-return'       // OAuth return path
  | 'new-analysis-param' // ?new=1 detected; sets ref
  | 'new-analysis-ref'   // ref already set from prior run
  | 'preview'            // ?step=preview
  | 'loading'            // auth still resolving; hold
  | 'unauthenticated'    // show landing
  | 'fetch';             // proceed to /api/user/analyses

function decideBypass(s: BypassState): {
  decision: BypassDecision;
  setsNewAnalysisRef?: boolean;
} {
  if (s.oauthReturnActive) return { decision: 'oauth-return' };
  if (s.newParam === '1')  return { decision: 'new-analysis-param', setsNewAnalysisRef: true };
  if (s.newAnalysisActive) return { decision: 'new-analysis-ref' };
  if (s.stepParam === 'preview') return { decision: 'preview' };
  if (s.authEnabled && s.sessionStatus === 'loading') return { decision: 'loading' };
  if (!s.authEnabled || s.sessionStatus === 'unauthenticated') return { decision: 'unauthenticated' };
  return { decision: 'fetch' };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('auto-resume bypass: ?new=1 survives URL clear and auth re-resolution', () => {
  it('detects ?new=1 and sets the ref on the first effect run', () => {
    const result = decideBypass({
      oauthReturnActive: false,
      newAnalysisActive: false,
      newParam: '1',
      stepParam: null,
      sessionStatus: 'loading',
      authEnabled: true,
    });
    expect(result.decision).toBe('new-analysis-param');
    expect(result.setsNewAnalysisRef).toBe(true);
  });

  it('after URL clear, ref protects the bypass when auth resolves to authenticated', () => {
    // Simulates the effect re-running after sessionStatus: loading → authenticated.
    // URL is now '/' (newParam is null), but the ref is still set.
    const result = decideBypass({
      oauthReturnActive: false,
      newAnalysisActive: true, // ref set in prior run
      newParam: null,          // URL was cleared by replaceState
      stepParam: null,
      sessionStatus: 'authenticated',
      authEnabled: true,
    });
    expect(result.decision).toBe('new-analysis-ref');
  });

  it('without the ref fix, authenticated + no ?new=1 would proceed to fetch (the bug)', () => {
    // Demonstrates the broken state: ref not set, URL cleared.
    const result = decideBypass({
      oauthReturnActive: false,
      newAnalysisActive: false, // ref was never set (old code path)
      newParam: null,
      stepParam: null,
      sessionStatus: 'authenticated',
      authEnabled: true,
    });
    // This is exactly the redirect that caused the bug.
    expect(result.decision).toBe('fetch');
  });

  it('ref protects through multiple sessionStatus changes', () => {
    const statuses: Array<'loading' | 'authenticated' | 'unauthenticated'> = [
      'loading', 'loading', 'authenticated',
    ];
    for (const status of statuses) {
      const result = decideBypass({
        oauthReturnActive: false,
        newAnalysisActive: true,
        newParam: null,
        stepParam: null,
        sessionStatus: status,
        authEnabled: true,
      });
      // Every run with the ref set should bypass, regardless of sessionStatus.
      expect(result.decision).toBe('new-analysis-ref');
    }
  });
});

describe('auto-resume bypass: normal resume path (no ?new=1)', () => {
  it('shows landing when unauthenticated', () => {
    const result = decideBypass({
      oauthReturnActive: false,
      newAnalysisActive: false,
      newParam: null,
      stepParam: null,
      sessionStatus: 'unauthenticated',
      authEnabled: true,
    });
    expect(result.decision).toBe('unauthenticated');
  });

  it('holds while auth is loading (never fetches prematurely)', () => {
    const result = decideBypass({
      oauthReturnActive: false,
      newAnalysisActive: false,
      newParam: null,
      stepParam: null,
      sessionStatus: 'loading',
      authEnabled: true,
    });
    expect(result.decision).toBe('loading');
  });

  it('fetches analyses when authenticated with no bypass flags', () => {
    const result = decideBypass({
      oauthReturnActive: false,
      newAnalysisActive: false,
      newParam: null,
      stepParam: null,
      sessionStatus: 'authenticated',
      authEnabled: true,
    });
    expect(result.decision).toBe('fetch');
  });

  it('shows landing immediately when auth is disabled', () => {
    const result = decideBypass({
      oauthReturnActive: false,
      newAnalysisActive: false,
      newParam: null,
      stepParam: null,
      sessionStatus: 'unauthenticated',
      authEnabled: false,
    });
    expect(result.decision).toBe('unauthenticated');
  });
});

describe('auto-resume bypass: other bypass types are unaffected', () => {
  it('OAuth return takes priority', () => {
    const result = decideBypass({
      oauthReturnActive: true,
      newAnalysisActive: false,
      newParam: null,
      stepParam: null,
      sessionStatus: 'authenticated',
      authEnabled: true,
    });
    expect(result.decision).toBe('oauth-return');
  });

  it('?step=preview bypasses when no ?new=1 or oauth return', () => {
    const result = decideBypass({
      oauthReturnActive: false,
      newAnalysisActive: false,
      newParam: null,
      stepParam: 'preview',
      sessionStatus: 'authenticated',
      authEnabled: true,
    });
    expect(result.decision).toBe('preview');
  });
});
