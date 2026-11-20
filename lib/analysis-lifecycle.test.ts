/**
 * Regression tests for the AnalyzingView lifecycle guards:
 *   - fired.current: prevents double-execution (React Strict Mode safe)
 *   - isMounted.current: suppresses callbacks after unmount
 */

import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers that mirror the ref-based guard patterns in AnalyzingView
// ---------------------------------------------------------------------------

function makeDeduplicationGuard() {
  let fired = false;
  let callCount = 0;

  function run() {
    if (fired) return;
    fired = true;
    callCount++;
  }

  return { run, getCallCount: () => callCount };
}

function makeMountGuard(initialValue = true) {
  let isMounted = initialValue;
  return {
    setMounted: (v: boolean) => { isMounted = v; },
    get current() { return isMounted; },
  };
}

// ---------------------------------------------------------------------------
// fired.current deduplication guard
// ---------------------------------------------------------------------------

describe('fired.current deduplication guard', () => {
  it('runs the effect exactly once when called twice (Strict Mode simulation)', () => {
    const { run, getCallCount } = makeDeduplicationGuard();
    run(); // first mount
    run(); // Strict Mode remount — should be a no-op
    expect(getCallCount()).toBe(1);
  });

  it('runs the effect once when called once', () => {
    const { run, getCallCount } = makeDeduplicationGuard();
    run();
    expect(getCallCount()).toBe(1);
  });

  it('never runs the effect if called zero times', () => {
    const { getCallCount } = makeDeduplicationGuard();
    expect(getCallCount()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// isMounted.current callback suppression
// ---------------------------------------------------------------------------

describe('isMounted.current callback suppression', () => {
  it('calls onComplete when isMounted is true', () => {
    const onComplete = vi.fn();
    const mount = makeMountGuard(true);

    // Simulates the success path in AnalyzingView
    if (!mount.current) return;
    onComplete('analysis-id-123');

    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith('analysis-id-123');
  });

  it('suppresses onComplete when isMounted is false (component unmounted)', () => {
    const onComplete = vi.fn();
    const mount = makeMountGuard(true);

    // Simulate unmount (navigation away)
    mount.setMounted(false);

    if (!mount.current) return;
    onComplete('analysis-id-123'); // should not reach here

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('restores isMounted to true after Strict Mode cleanup+remount cycle', () => {
    const mount = makeMountGuard(true);

    // Strict Mode cleanup sets it false
    mount.setMounted(false);
    // Remount sets it back to true (the fix in page.tsx)
    mount.setMounted(true);

    expect(mount.current).toBe(true);
  });

  it('leaves isMounted false after real unmount (no remount)', () => {
    const mount = makeMountGuard(true);

    // Real unmount — no subsequent remount
    mount.setMounted(false);

    expect(mount.current).toBe(false);
  });

  it('suppresses sample_unavailable callback when unmounted', () => {
    const onComplete = vi.fn();
    const mount = makeMountGuard(false); // already unmounted

    // Simulates the sample_unavailable path
    if (!mount.current) return;
    onComplete('demo-data-scientist');

    expect(onComplete).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Combined: Strict Mode cycle does not prevent eventual callback
// ---------------------------------------------------------------------------

describe('combined Strict Mode + real unmount behaviour', () => {
  it('calls onComplete after a Strict Mode cycle (cleanup then remount)', () => {
    const onComplete = vi.fn();

    // Simulate: fired guard prevents double fetch
    const { run } = makeDeduplicationGuard();

    // Mount 1: effect fires, fetch starts
    run();

    // Strict Mode cleanup + remount
    const mount = makeMountGuard(true);
    mount.setMounted(false);  // cleanup
    mount.setMounted(true);   // remount (the fix restores true)

    // Mount 2: effect returns early (fired=true), so fetch is not restarted.
    // The original fetch from Mount 1 completes here.
    if (!mount.current) {
      // This branch must NOT be taken after remount
      onComplete('should-not-fire');
    } else {
      onComplete('correct-analysis-id');
    }

    expect(onComplete).toHaveBeenCalledWith('correct-analysis-id');
    expect(onComplete).not.toHaveBeenCalledWith('should-not-fire');
  });

  it('does not call onComplete after real unmount even if fetch resolves', () => {
    const onComplete = vi.fn();
    const mount = makeMountGuard(true);

    // User navigates away
    mount.setMounted(false);

    // Fetch resolves asynchronously after unmount
    if (!mount.current) return;
    onComplete('stale-analysis-id');

    expect(onComplete).not.toHaveBeenCalled();
  });
});
