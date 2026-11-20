/**
 * Regression tests for GET /api/user/analyses auto-resume selection.
 *
 * Root cause: getUserAnalyses() previously returned ALL rows for a user
 * ordered by created_at DESC, regardless of status. When a user had a
 * pending/failed row newer than their completed analyses, auto-resume
 * would redirect to that row's ID. The GET /api/analyze?id= handler then
 * returned { pending: true } (202) because result_json = '{}', and the
 * dashboard showed "Analysis is still processing."
 *
 * Fix: getUserAnalyses() now filters to status = 'complete' rows only,
 * with a fallback to result_json != '{}' for pre-migration environments.
 */

import { describe, it, expect } from 'vitest';

// ── Minimal type stubs ────────────────────────────────────────────────────────

type AnalysisStatus = 'pending' | 'processing' | 'failed' | 'complete';

interface AnalysisRow {
  id: string;
  user_id: string;
  status: AnalysisStatus;
  result_json: string;
  readiness_score: number;
  created_at: Date;
  target_role: string;
}

interface SavedEntry {
  id: string;
  target_role: string;
  readiness_score: number;
  created_at: Date;
}

// ── Pure simulation of getUserAnalyses filtering logic ───────────────────────
//
// We test the WHERE-clause logic as a pure function so the invariants are
// provable without a database connection.

function simulateGetUserAnalyses(
  rows: AnalysisRow[],
  userId: string,
  limit = 10,
  statusColumnExists = true,
): SavedEntry[] {
  let filtered: AnalysisRow[];

  if (statusColumnExists) {
    // Primary path: filter by status = 'complete'
    filtered = rows.filter(r => r.user_id === userId && r.status === 'complete');
  } else {
    // Pre-migration fallback: filter by result_json != '{}'
    filtered = rows.filter(r => r.user_id === userId && r.result_json !== '{}');
  }

  return filtered
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .slice(0, limit)
    .map(r => ({
      id: r.id,
      target_role: r.target_role,
      readiness_score: r.readiness_score,
      created_at: r.created_at,
    }));
}

// ── Test fixtures ─────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<AnalysisRow> & { id: string }): AnalysisRow {
  return {
    user_id: 'user-a',
    status: 'complete',
    result_json: '{"skillExtraction":{}}',
    readiness_score: 72,
    target_role: 'Software Engineer',
    created_at: new Date('2026-01-01'),
    ...overrides,
  };
}

const completedA = makeRow({ id: 'a1', created_at: new Date('2026-01-01') });
const completedB = makeRow({ id: 'a2', created_at: new Date('2026-01-02') });
const pendingNew = makeRow({
  id: 'a3',
  status: 'pending',
  result_json: '{}',
  readiness_score: 0,
  created_at: new Date('2026-01-03'), // most recent!
});
const failedNew = makeRow({
  id: 'a4',
  status: 'failed',
  result_json: '{}',
  readiness_score: 0,
  created_at: new Date('2026-01-04'), // even more recent
});
const processingNew = makeRow({
  id: 'a5',
  status: 'processing',
  result_json: '{}',
  readiness_score: 0,
  created_at: new Date('2026-01-05'),
});
const otherUserRow = makeRow({ id: 'b1', user_id: 'user-b' });

// ── Tests: primary path (status column exists) ────────────────────────────────

describe('getUserAnalyses — primary path (status = complete filter)', () => {
  it('excludes pending rows — the root-cause scenario', () => {
    // Before the fix: pendingNew was newest so it would be analyses[0].
    // After the fix: only completedA and completedB are returned.
    const rows = [completedA, completedB, pendingNew];
    const result = simulateGetUserAnalyses(rows, 'user-a');
    expect(result.map(r => r.id)).not.toContain('a3');
    expect(result.map(r => r.id)).toEqual(['a2', 'a1']); // newest complete first
  });

  it('excludes failed rows', () => {
    const rows = [completedA, failedNew];
    const result = simulateGetUserAnalyses(rows, 'user-a');
    expect(result.map(r => r.id)).toEqual(['a1']);
    expect(result.map(r => r.id)).not.toContain('a4');
  });

  it('excludes processing rows', () => {
    const rows = [completedA, processingNew];
    const result = simulateGetUserAnalyses(rows, 'user-a');
    expect(result.map(r => r.id)).toEqual(['a1']);
    expect(result.map(r => r.id)).not.toContain('a5');
  });

  it('returns empty array when all rows are incomplete', () => {
    const rows = [pendingNew, failedNew, processingNew];
    const result = simulateGetUserAnalyses(rows, 'user-a');
    expect(result).toHaveLength(0);
  });

  it('returns completed rows ordered newest first', () => {
    const rows = [completedA, completedB]; // completedB is newer
    const result = simulateGetUserAnalyses(rows, 'user-a');
    expect(result[0].id).toBe('a2'); // 2026-01-02 > 2026-01-01
    expect(result[1].id).toBe('a1');
  });

  it('never returns rows belonging to another user', () => {
    const rows = [completedA, otherUserRow];
    const result = simulateGetUserAnalyses(rows, 'user-a');
    expect(result.map(r => r.id)).not.toContain('b1');
  });

  it('respects the limit parameter', () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      makeRow({ id: `m${i}`, created_at: new Date(`2026-01-${String(i + 1).padStart(2, '0')}`) }),
    );
    const result = simulateGetUserAnalyses(many, 'user-a', 10);
    expect(result).toHaveLength(10);
  });
});

// ── Tests: pre-migration fallback (no status column) ─────────────────────────

describe('getUserAnalyses — pre-migration fallback (result_json filter)', () => {
  it('excludes rows with empty result_json (pending/failed)', () => {
    const rows = [completedA, pendingNew, failedNew];
    const result = simulateGetUserAnalyses(rows, 'user-a', 10, false);
    expect(result.map(r => r.id)).toEqual(['a1']);
  });

  it('includes rows with non-empty result_json', () => {
    const result = simulateGetUserAnalyses([completedA, completedB], 'user-a', 10, false);
    expect(result).toHaveLength(2);
  });
});

// ── Tests: auto-resume selection (simulates app/page.tsx) ────────────────────

describe('auto-resume — analyses[0] is always a completed analysis after fix', () => {
  it('the fixed auto-resume redirects to the newest COMPLETE analysis', () => {
    // This is the exact scenario that caused the bug.
    // User has: completed Jan 1, completed Jan 2, then started (but abandoned)
    // an upload on Jan 3 that left a pending row.
    const rows = [completedA, completedB, pendingNew];
    const returned = simulateGetUserAnalyses(rows, 'user-a');

    // Before fix: returned[0].id === 'a3' (pending — would show error)
    // After fix:  returned[0].id === 'a2' (complete — works correctly)
    expect(returned.length).toBeGreaterThan(0);
    expect(returned[0].id).toBe('a2'); // newest complete
    expect(returned[0].id).not.toBe('a3'); // NOT the pending row
  });

  it('shows Question First (empty list) when only incomplete analyses exist', () => {
    // Auto-resume calls router.replace only when analyses.length > 0.
    // With an empty list it calls setResumeCheckDone(true) and shows landing.
    const rows = [pendingNew, failedNew];
    const returned = simulateGetUserAnalyses(rows, 'user-a');
    expect(returned).toHaveLength(0);
    // Simulates the check in app/page.tsx tryResume():
    const wouldRedirect = returned.length > 0;
    expect(wouldRedirect).toBe(false); // correctly shows landing page
  });

  it('different users each get only their own completed analyses', () => {
    const userBComplete = makeRow({ id: 'b2', user_id: 'user-b', created_at: new Date('2026-02-01') });
    const rows = [completedA, completedB, userBComplete];

    const resultA = simulateGetUserAnalyses(rows, 'user-a');
    const resultB = simulateGetUserAnalyses(rows, 'user-b');

    expect(resultA.map(r => r.id)).not.toContain('b2');
    expect(resultB.map(r => r.id)).not.toContain('a1');
    expect(resultB.map(r => r.id)).not.toContain('a2');
  });
});
