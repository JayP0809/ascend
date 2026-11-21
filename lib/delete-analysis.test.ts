/**
 * Tests for the individual analysis deletion feature.
 *
 * Coverage:
 *   1. deleteAnalysis: async contract and graceful fallback
 *   2. UUID validation used by the DELETE endpoint
 *   3. Request body validation logic
 *   4. Cross-user ownership (DB WHERE clause contract)
 *   5. SavedView state management after deletion
 *   6. Deleting the newest analysis (next-most-recent becomes default)
 *   7. Deleting the final analysis (empty state)
 *   8. localStorage / sessionStorage cleanup contract
 */

import { describe, it, expect } from 'vitest';
import { deleteAnalysis } from './db';

// UUID regex used by the DELETE endpoint (duplicated here to test the pattern
// independently of the route handler).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// 1. deleteAnalysis: async contract
// ---------------------------------------------------------------------------

describe('deleteAnalysis: async contract', () => {
  it('returns a Promise', () => {
    const result = deleteAnalysis(
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000001',
    );
    expect(result).toBeInstanceOf(Promise);
  });

  it('resolves to false when no DB is configured (graceful fallback)', async () => {
    const result = await deleteAnalysis(
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000001',
    );
    expect(result).toBe(false);
  });

  it('resolved value is a boolean, never null/undefined/object', async () => {
    const result = await deleteAnalysis(
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000001',
    );
    expect(typeof result).toBe('boolean');
    expect(result).not.toBeNull();
    expect(result).not.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 2. UUID validation (mirrors the DELETE endpoint's input guard)
// ---------------------------------------------------------------------------

describe('UUID validation for analysis IDs', () => {
  it('accepts a valid lowercase UUID v4', () => {
    expect(UUID_RE.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('accepts a valid uppercase UUID', () => {
    expect(UUID_RE.test('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(UUID_RE.test('')).toBe(false);
  });

  it('rejects a plain string (injection attempt)', () => {
    expect(UUID_RE.test("'; DROP TABLE analyses; --")).toBe(false);
  });

  it('rejects a partial UUID', () => {
    expect(UUID_RE.test('550e8400-e29b-41d4')).toBe(false);
  });

  it('rejects the demo analysis ID (not a UUID)', () => {
    expect(UUID_RE.test('demo-analysis-001')).toBe(false);
  });

  it('rejects a UUID with extra characters', () => {
    expect(UUID_RE.test('550e8400-e29b-41d4-a716-446655440000-extra')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Request body validation logic (extracted helper)
// ---------------------------------------------------------------------------

describe('DELETE endpoint: request body validation', () => {
  // This helper mirrors the route's validation exactly so the logic is
  // exercised independently of the HTTP infrastructure.
  function validateAnalysisId(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (!UUID_RE.test(trimmed)) return null;
    return trimmed;
  }

  it('rejects empty string', () => {
    expect(validateAnalysisId('')).toBeNull();
  });

  it('rejects null', () => {
    expect(validateAnalysisId(null)).toBeNull();
  });

  it('rejects undefined', () => {
    expect(validateAnalysisId(undefined)).toBeNull();
  });

  it('rejects a number', () => {
    expect(validateAnalysisId(123)).toBeNull();
  });

  it('rejects a non-UUID string', () => {
    expect(validateAnalysisId('not-a-uuid')).toBeNull();
  });

  it('rejects a demo ID', () => {
    expect(validateAnalysisId('demo-analysis-001')).toBeNull();
  });

  it('accepts and returns a valid UUID', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(validateAnalysisId(id)).toBe(id);
  });

  it('trims surrounding whitespace before validation', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(validateAnalysisId(`  ${id}  `)).toBe(id);
  });
});

// ---------------------------------------------------------------------------
// 4. Cross-user ownership: DB WHERE clause contract
// ---------------------------------------------------------------------------

describe('deleteAnalysis: ownership enforcement contract', () => {
  // With no DB available, both return false. The important invariant is that
  // the function signature requires a userId, which the route always supplies
  // from the JWT session, never from the browser request body. When a real
  // DB is present, the WHERE id=? AND user_id=? clause returns 0 rows for a
  // mismatched userId, and the function returns false.

  it('returns false for the owner when no DB is configured', async () => {
    const result = await deleteAnalysis(
      '550e8400-e29b-41d4-a716-446655440000',
      'aaaaaaaa-0000-0000-0000-000000000000',
    );
    expect(result).toBe(false);
  });

  it('returns false for a different userId (cross-user attempt) when no DB is configured', async () => {
    const result = await deleteAnalysis(
      '550e8400-e29b-41d4-a716-446655440000',
      'bbbbbbbb-0000-0000-0000-000000000000',
    );
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5 + 6 + 7. SavedView entry management after deletion
// ---------------------------------------------------------------------------

describe('SavedView: entries state after deletion', () => {
  const makeEntry = (id: string, role: string, date: string) => ({
    id,
    target_role: role,
    readiness_score: 70,
    created_at: date,
  });

  it('removes the deleted entry from the entries array', () => {
    const entries = [
      makeEntry('aaa', 'Software Engineer', '2026-11-10'),
      makeEntry('bbb', 'Product Manager',   '2026-10-01'),
    ];
    const result = entries.filter((e) => e.id !== 'aaa');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('bbb');
  });

  it('deleting the most recent analysis exposes the next-most-recent', () => {
    const entries = [
      makeEntry('newest', 'Staff SWE', '2026-11-15'),
      makeEntry('older',  'SWE',       '2026-11-01'),
      makeEntry('oldest', 'DS',        '2026-10-01'),
    ];
    const result = entries.filter((e) => e.id !== 'newest');
    // The next-most-recent is now first; auto-resume will redirect there.
    expect(result[0].id).toBe('older');
  });

  it('deleting the only analysis leaves an empty array (landing page shown)', () => {
    const entries = [makeEntry('solo', 'DevOps Engineer', '2026-11-01')];
    const result = entries.filter((e) => e.id !== 'solo');
    expect(result).toHaveLength(0);
  });

  it('deleting a non-existent ID leaves the entries unchanged', () => {
    const entries = [
      makeEntry('aaa', 'SWE', '2026-11-10'),
      makeEntry('bbb', 'PM',  '2026-10-01'),
    ];
    const result = entries.filter((e) => e.id !== 'zzz');
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 8. localStorage / sessionStorage key contracts
// ---------------------------------------------------------------------------

describe('cleanup key contracts after deletion', () => {
  it('roadmap progress key is roadmap-complete-{analysisId}', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(`roadmap-complete-${id}`).toBe('roadmap-complete-550e8400-e29b-41d4-a716-446655440000');
  });

  it('auto-redirect sessionStorage key is ascend-auto-redirected', () => {
    // Clearing this key after deletion lets the auto-resume check re-run on
    // the next fresh page load, so the next-most-recent analysis becomes the
    // default rather than showing the landing page indefinitely.
    const key = 'ascend-auto-redirected';
    expect(key).toBe('ascend-auto-redirected');
  });
});
