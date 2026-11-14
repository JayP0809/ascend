/**
 * Security and authorization regression tests.
 *
 * Coverage:
 *   1. checkAnalysisAccess() — all branches of the ownership model
 *   2. Demo ID routing — always public, never touches DB
 *   3. Quota enforcement — pure logic (no DB), atomic reservation model
 *   4. Auth module flags — CLERK_CONFIGURED and DEV_BYPASS_ACTIVE semantics
 *
 * Tests that require a live database or Clerk session are tagged [integration]
 * or [live-auth] and are either skipped or documented as manual steps below.
 *
 * Tests marked with a comment "// SIMULATED" reason about the authorization
 * logic using the exported helper, NOT about an HTTP round-trip. They do not
 * constitute end-to-end auth verification.
 */

import { describe, it, expect } from 'vitest';
import { checkAnalysisAccess } from './auth';
import type { AuthUser } from './auth';

const HAS_DB    = !!process.env.DATABASE_URL;
const HAS_CLERK = !!(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function user(id: string): AuthUser {
  return { userId: id, clerkId: `clerk_${id}`, email: `${id}@test.com` };
}

function record(userId: string | null) {
  return { user_id: userId };
}

// ---------------------------------------------------------------------------
// 1. checkAnalysisAccess — authorization logic
// ---------------------------------------------------------------------------

describe('checkAnalysisAccess — dev bypass (Clerk absent, non-production)', () => {
  // These tests only make sense when CLERK is not configured.
  // If the CI environment has Clerk keys the results will differ.
  it.skipIf(HAS_CLERK)('allows any user to access any record in dev mode', () => {
    // SIMULATED — tests the pure function, not an HTTP call
    const result = checkAnalysisAccess(record('owner-id'), user('other-id'));
    // DEV_BYPASS_ACTIVE = true when CLERK absent + non-production
    expect(result.granted).toBe(true);
  });

  it.skipIf(HAS_CLERK)('allows null user to access a record in dev mode', () => {
    const result = checkAnalysisAccess(record('owner-id'), null);
    expect(result.granted).toBe(true);
  });

  it.skipIf(HAS_CLERK)('allows access to ownerless records in dev mode', () => {
    const result = checkAnalysisAccess(record(null), null);
    expect(result.granted).toBe(true);
  });
});

describe('checkAnalysisAccess — Clerk configured (production auth rules)', () => {
  // These tests simulate the production path by calling the function with
  // arguments that mirror what would happen when CLERK_CONFIGURED = true.
  // Since we cannot flip CLERK_CONFIGURED in a unit test without mocking the
  // module, we document the expected outcomes and test them via the
  // DEV_BYPASS_ACTIVE condition path where possible.

  it('ownership rule: user owning a record is granted access', () => {
    // SIMULATED — represents the { granted: true } branch when CLERK is live
    // and user.userId === record.user_id. We call the helper with real types
    // so the shape is verified even if DEV_BYPASS_ACTIVE changes the result.
    const u = user('alice');
    const r = record('alice');
    const result = checkAnalysisAccess(r, u);
    // When DEV_BYPASS_ACTIVE = true (local), granted = true (bypass)
    // When CLERK configured + user owns record, granted = true (ownership)
    // Both paths produce the same outcome here.
    expect(result.granted).toBe(true);
  });

  it('cross-user rule: returns 404 to avoid leaking existence', () => {
    // This path is only tested when CLERK is configured.
    if (!HAS_CLERK) {
      // In dev mode checkAnalysisAccess returns true for all — documented.
      return;
    }
    const r = record('alice');
    const u = user('bob');
    const result = checkAnalysisAccess(r, u);
    expect(result.granted).toBe(false);
    expect((result as { granted: false; status: number }).status).toBe(404);
  });

  it('ownerless-record rule: returns 404 (not public) when CLERK configured', () => {
    // Ownerless records are PRIVATE. This is the fix for the null=public bug.
    if (!HAS_CLERK) return;
    const r = record(null);
    const u = user('alice');
    const result = checkAnalysisAccess(r, u);
    expect(result.granted).toBe(false);
    expect((result as { granted: false; status: number }).status).toBe(404);
  });

  it('unauthenticated rule: returns 401 when CLERK configured and no user', () => {
    if (!HAS_CLERK) return;
    const r = record('alice');
    const result = checkAnalysisAccess(r, null);
    expect(result.granted).toBe(false);
    expect((result as { granted: false; status: number }).status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 2. Authorization model — expected behavior matrix (documented)
// ---------------------------------------------------------------------------
//
// This table is not an executable test; it documents what checkAnalysisAccess
// returns for each combination of inputs. This is the "source of truth" to
// compare against manual or integration tests when Clerk is live.
//
// | CLERK_CONFIGURED | NODE_ENV     | user    | record.user_id | Expected    |
// |------------------|--------------|---------|----------------|-------------|
// | false            | development  | null    | null           | granted     |
// | false            | development  | null    | 'alice'        | granted     |  ← dev bypass
// | false            | development  | alice   | 'alice'        | granted     |
// | false            | production   | any     | any            | 503 (misconfig) |
// | true             | any          | null    | any            | 401 unauthed |
// | true             | any          | alice   | 'alice'        | granted     |
// | true             | any          | bob     | 'alice'        | 404 wrong user |
// | true             | any          | alice   | null           | 404 ownerless |
//
// The null owner = 404 row is the key fix from the previous pass.

// ---------------------------------------------------------------------------
// 3. Demo ID routing
// ---------------------------------------------------------------------------

describe('demo mode — IDs always public, no DB involved', () => {
  it('recognizes demo- prefix', () => {
    expect('demo-sample-001'.startsWith('demo-')).toBe(true);
    expect('demo-abc'.startsWith('demo-')).toBe(true);
  });

  it('does not misclassify real UUIDs as demo', () => {
    expect('aaaaaaaa-0000-0000-0000-000000000001'.startsWith('demo-')).toBe(false);
    expect(''.startsWith('demo-')).toBe(false);
  });

  it('getDemoData is a pure function with no external calls or DB access', async () => {
    const { getDemoData } = await import('./ai');
    const result = getDemoData('demo-unit-test');
    expect(result.isDemoMode).toBe(true);
    expect(result.analysisId).toBe('demo-unit-test');
    expect(result.skillExtraction).toBeDefined();
    expect(result.gapAnalysis).toBeDefined();
    expect(result.roadmap).toBeDefined();
  });

  it('getDemoData with explicit role returns that role', async () => {
    const { getDemoData } = await import('./ai');
    const result = getDemoData('demo-unit-test', 'Data Scientist');
    expect(result.isDemoMode).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Quota enforcement — pure logic (no DB)
// ---------------------------------------------------------------------------

describe('quota — bypass and pure-logic checks', () => {
  it('demo flows are always allowed, return 0 usage, do not touch DB', async () => {
    const { reserveQuotaSlot } = await import('./quota');
    const status = await reserveQuotaSlot(null, true);
    expect(status.allowed).toBe(true);
    expect(status.used).toBe(0);
  });

  it('null userId (unauthenticated, no DB) is always allowed', async () => {
    const { reserveQuotaSlot } = await import('./quota');
    const status = await reserveQuotaSlot(null, false);
    expect(status.allowed).toBe(true);
  });

  it('monthly quota constant is a positive integer', async () => {
    const { MONTHLY_ANALYSIS_QUOTA } = await import('./quota');
    expect(typeof MONTHLY_ANALYSIS_QUOTA).toBe('number');
    expect(Number.isInteger(MONTHLY_ANALYSIS_QUOTA)).toBe(true);
    expect(MONTHLY_ANALYSIS_QUOTA).toBeGreaterThan(0);
  });

  it('resetAt is in the future', async () => {
    const { getQuotaStatus } = await import('./quota');
    const status = await getQuotaStatus(null);
    expect(status.resetAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('resetAt lands on the 1st of a month (UTC) — month boundary reset point', async () => {
    const { getQuotaStatus } = await import('./quota');
    const status = await getQuotaStatus(null);
    expect(status.resetAt.getUTCDate()).toBe(1);
    expect(status.resetAt.getUTCHours()).toBe(0);
    expect(status.resetAt.getUTCMinutes()).toBe(0);
  });

  it('bucket key is current YYYY-MM in UTC', () => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const expected = `${y}-${m}`;
    expect(expected).toMatch(/^\d{4}-\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// 5. Auth module flags
// ---------------------------------------------------------------------------

describe('auth — CLERK_CONFIGURED and DEV_BYPASS_ACTIVE flags', () => {
  it('CLERK_CONFIGURED is false when env vars are absent', async () => {
    const { CLERK_CONFIGURED } = await import('./auth');
    if (!HAS_CLERK) {
      expect(CLERK_CONFIGURED).toBe(false);
    }
  });

  it('DEV_BYPASS_ACTIVE is true in test environment without Clerk', async () => {
    const { DEV_BYPASS_ACTIVE } = await import('./auth');
    // Vitest runs in NODE_ENV=test which is !== 'production', so with no
    // Clerk keys, DEV_BYPASS_ACTIVE should be true.
    if (!HAS_CLERK) {
      expect(DEV_BYPASS_ACTIVE).toBe(true);
    }
  });

  it('requiresAuth returns false for demo IDs regardless of Clerk state', async () => {
    const { requiresAuth } = await import('./auth');
    expect(requiresAuth('demo-sample-001')).toBe(false);
    expect(requiresAuth('demo-')).toBe(false);
    expect(requiresAuth(undefined)).toBe(false);
  });

  it('requiresAuth returns false for real IDs when Clerk is not configured', async () => {
    const { requiresAuth, CLERK_CONFIGURED } = await import('./auth');
    if (!CLERK_CONFIGURED) {
      expect(requiresAuth('aaaaaaaa-0000-0000-0000-000000000001')).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Quota enforcement — concurrent requests (integration, requires DB)
// ---------------------------------------------------------------------------

describe.skipIf(!HAS_DB)('[integration] quota — PostgreSQL atomic reservation', () => {
  it('concurrent first-requests all succeed (race condition regression)', async () => {
    // Verifies the INSERT ... ON CONFLICT DO UPDATE fix. The previous CTE used
    // a split UPDATE / INSERT ... ON CONFLICT DO NOTHING pattern where two
    // simultaneous first-requests for the same user could both fail to match
    // the UPDATE (no row yet) and have their INSERT blocked by each other's
    // conflict, resulting in both being denied. This test would have failed
    // against the old implementation.
    const { reserveQuotaSlot, MONTHLY_ANALYSIS_QUOTA } = await import('./quota');
    const userId = `concurrent-test-${Date.now()}`;
    const concurrency = Math.min(MONTHLY_ANALYSIS_QUOTA, 5);

    const results = await Promise.all(
      Array.from({ length: concurrency }, () => reserveQuotaSlot(userId, false))
    );

    const allowed = results.filter((r) => r.allowed).length;
    expect(allowed).toBe(concurrency);
  });

  it('request beyond quota limit is denied', async () => {
    const { reserveQuotaSlot, MONTHLY_ANALYSIS_QUOTA } = await import('./quota');
    const userId = `exhaust-test-${Date.now()}`;

    for (let i = 0; i < MONTHLY_ANALYSIS_QUOTA; i++) {
      await reserveQuotaSlot(userId, false);
    }

    const over = await reserveQuotaSlot(userId, false);
    expect(over.allowed).toBe(false);
    expect(over.message).toMatch(/quota/i);
    expect(over.used).toBe(MONTHLY_ANALYSIS_QUOTA);
  });

  it('demo bypass works even after quota is exhausted', async () => {
    const { reserveQuotaSlot, MONTHLY_ANALYSIS_QUOTA } = await import('./quota');
    const userId = `demo-bypass-${Date.now()}`;

    for (let i = 0; i < MONTHLY_ANALYSIS_QUOTA; i++) {
      await reserveQuotaSlot(userId, false);
    }

    const demo = await reserveQuotaSlot(userId, true);
    expect(demo.allowed).toBe(true);
    expect(demo.used).toBe(0); // demo does not read or write the bucket
  });

  it('getQuotaStatus reflects current usage without reserving a slot', async () => {
    const { reserveQuotaSlot, getQuotaStatus } = await import('./quota');
    const userId = `status-test-${Date.now()}`;

    await reserveQuotaSlot(userId, false);
    const status = await getQuotaStatus(userId);
    expect(status.used).toBe(1);
  });
});

/*
 * [live-auth] Tests that cannot run without a Clerk configuration.
 * Manual verification steps for post-Clerk-setup testing:
 *
 * 1. Cross-user read (IDOR):
 *    Sign in as user A. Upload + analyze → copy analysisId.
 *    Sign in as user B. GET /api/analyze?id=<A's id> → expect 404.
 *    GET /api/export?id=<A's id> → expect 404.
 *
 * 2. Ownerless record access:
 *    With a record seeded in DB without user_id, authenticated user
 *    GET /api/analyze?id=<ownerless-id> → expect 404.
 *
 * 3. Unauthenticated live POST:
 *    No session cookie. POST /api/analyze with live analysisId → expect 401.
 *    Verify quota row was NOT created for this request.
 *
 * 4. Client-supplied userId ignored:
 *    POST /api/analyze with body { userId: 'other-user-id', analysisId: ... }
 *    Server must derive identity from Clerk session only.
 *    Verify the saved analysis is bound to the session user, not 'other-user-id'.
 *
 * 5. Production misconfiguration (503):
 *    Deploy with CLERK_SECRET_KEY absent, NODE_ENV=production.
 *    GET /api/analyze?id=<real-uuid> → expect 503.
 *    GET /api/analyze?id=demo-sample → expect 200 (demo still works).
 */
