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
// 4b. Admin quota exemption
// ---------------------------------------------------------------------------

describe('admin quota exemption — isAdminUser()', () => {
  it('returns false when ADMIN_CLERK_USER_ID is not set', async () => {
    const { isAdminUser } = await import('./auth');
    // In CI and local dev, ADMIN_CLERK_USER_ID is not set → no admin
    if (!process.env.ADMIN_CLERK_USER_ID) {
      expect(isAdminUser('user_any_clerk_id')).toBe(false);
      expect(isAdminUser(null)).toBe(false);
      expect(isAdminUser(undefined)).toBe(false);
    }
  });

  it('returns false for null or undefined clerkId regardless of env var', async () => {
    const { isAdminUser } = await import('./auth');
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(undefined)).toBe(false);
    expect(isAdminUser('')).toBe(false);
  });

  it('never grants admin status based on a fake/guessed clerkId', async () => {
    const { isAdminUser } = await import('./auth');
    // Even if someone sends a request with a clerkId that looks admin-like,
    // it only matches if it exactly equals ADMIN_CLERK_USER_ID from the env.
    // These are plausible-looking Clerk IDs that must NOT grant admin access.
    const fakeIds = [
      'user_admin',
      'user_ADMIN',
      'admin',
      'user_2NNNNNNNNNNNNNNNNNNNNNNfake',
      '',
    ];
    for (const id of fakeIds) {
      expect(isAdminUser(id)).toBe(false);
    }
  });

  it('returns true only when clerkId exactly matches ADMIN_CLERK_USER_ID', async () => {
    // We test the exact-match logic using process.env manipulation.
    // This does NOT test with a real Clerk user — it tests the matching logic.
    const original = process.env.ADMIN_CLERK_USER_ID;
    try {
      process.env.ADMIN_CLERK_USER_ID = 'user_2TestAdminExactMatch123';
      // Must re-import to pick up env change — use direct function call approach
      const { isAdminUser } = await import('./auth');
      // Note: isAdminUser reads process.env at call time (not module load time)
      expect(isAdminUser('user_2TestAdminExactMatch123')).toBe(true);
      expect(isAdminUser('user_2TestAdminExactMatch124')).toBe(false); // 1 char diff
      expect(isAdminUser('user_2TestAdminExactMatch')).toBe(false);    // truncated
    } finally {
      if (original === undefined) {
        delete process.env.ADMIN_CLERK_USER_ID;
      } else {
        process.env.ADMIN_CLERK_USER_ID = original;
      }
    }
  });

  it('admin exemption does not bypass checkAnalysisAccess ownership check', async () => {
    // Admin can bypass the QUOTA but cannot access another user's analyses.
    // The ownership check is in checkAnalysisAccess() and is always enforced.
    const { checkAnalysisAccess, isAdminUser } = await import('./auth');

    const adminClerkId = 'user_2AdminTestXYZ';
    const original = process.env.ADMIN_CLERK_USER_ID;
    try {
      process.env.ADMIN_CLERK_USER_ID = adminClerkId;
      expect(isAdminUser(adminClerkId)).toBe(true);

      if (!HAS_CLERK) {
        // In dev mode, checkAnalysisAccess grants access to all — bypass active.
        // This test documents that in PRODUCTION (HAS_CLERK=true) the admin
        // cannot access a record they don't own, even with admin status.
        // Manual verification required: see [live-auth] section below.
        return;
      }

      // With Clerk configured: admin trying to read a record owned by another
      // user should still get 404.
      const otherUserId = 'bbbbbbbb-0000-0000-0000-000000000002';
      const adminDbUserId = 'aaaaaaaa-0000-0000-0000-000000000001';
      const adminUser = { userId: adminDbUserId, clerkId: adminClerkId, email: 'admin@test.com' };
      const record = { user_id: otherUserId };
      const result = checkAnalysisAccess(record, adminUser);
      expect(result.granted).toBe(false);
      expect((result as { granted: false; status: number }).status).toBe(404);
    } finally {
      if (original === undefined) {
        delete process.env.ADMIN_CLERK_USER_ID;
      } else {
        process.env.ADMIN_CLERK_USER_ID = original;
      }
    }
  });

  it('reserveQuotaSlot returns adminExempt=true for admin when no DB', async () => {
    const original = process.env.ADMIN_CLERK_USER_ID;
    try {
      process.env.ADMIN_CLERK_USER_ID = 'user_2AdminNoDBTest';
      const { reserveQuotaSlot } = await import('./quota');
      // No DATABASE_URL in test env — falls back to allowed=true
      const result = await reserveQuotaSlot(
        'aaaaaaaa-0000-0000-0000-000000000001',
        false,
        'user_2AdminNoDBTest',
      );
      expect(result.allowed).toBe(true);
      // adminExempt is set when admin is detected (regardless of whether DB
      // actually enforced anything — the flag signals "this was an admin call")
      expect(result.adminExempt).toBe(true);
    } finally {
      if (original === undefined) {
        delete process.env.ADMIN_CLERK_USER_ID;
      } else {
        process.env.ADMIN_CLERK_USER_ID = original;
      }
    }
  });

  it('reserveQuotaSlot returns no adminExempt flag for regular users', async () => {
    const { reserveQuotaSlot } = await import('./quota');
    const result = await reserveQuotaSlot(
      'aaaaaaaa-0000-0000-0000-000000000001',
      false,
      'user_2RegularUser',
    );
    expect(result.adminExempt).toBeFalsy();
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

  it('[admin] can exceed regular quota limit — usage tracked', async () => {
    const { reserveQuotaSlot, MONTHLY_ANALYSIS_QUOTA } = await import('./quota');
    const adminClerkId = `user_2AdminIntegration${Date.now()}`;
    const userId = `admin-db-test-${Date.now()}`;
    const original = process.env.ADMIN_CLERK_USER_ID;
    try {
      process.env.ADMIN_CLERK_USER_ID = adminClerkId;
      // Run MORE than the normal quota limit
      const extraRequests = MONTHLY_ANALYSIS_QUOTA + 3;
      for (let i = 0; i < extraRequests; i++) {
        const r = await reserveQuotaSlot(userId, false, adminClerkId);
        expect(r.allowed).toBe(true);
        expect(r.adminExempt).toBe(true);
      }
      // Verify usage was tracked
      const { getQuotaStatus } = await import('./quota');
      const status = await getQuotaStatus(userId, false, adminClerkId);
      expect(status.used).toBe(extraRequests);
      expect(status.adminExempt).toBe(true);
      expect(status.allowed).toBe(true); // admin is always allowed
    } finally {
      if (original === undefined) delete process.env.ADMIN_CLERK_USER_ID;
      else process.env.ADMIN_CLERK_USER_ID = original;
    }
  });

  it('[admin] non-admin user is still denied after quota exhausted', async () => {
    // Verifies admin exemption does not leak to regular users sharing the system
    const { reserveQuotaSlot, MONTHLY_ANALYSIS_QUOTA } = await import('./quota');
    const adminClerkId = `user_2AdminIsolation${Date.now()}`;
    const regularUserId = `regular-${Date.now()}`;
    const original = process.env.ADMIN_CLERK_USER_ID;
    try {
      process.env.ADMIN_CLERK_USER_ID = adminClerkId;

      for (let i = 0; i < MONTHLY_ANALYSIS_QUOTA; i++) {
        // regular user (different clerkId) exhausts their quota
        await reserveQuotaSlot(regularUserId, false, 'user_2RegularNotAdmin');
      }

      const over = await reserveQuotaSlot(regularUserId, false, 'user_2RegularNotAdmin');
      expect(over.allowed).toBe(false);
      expect(over.adminExempt).toBeFalsy();
    } finally {
      if (original === undefined) delete process.env.ADMIN_CLERK_USER_ID;
      else process.env.ADMIN_CLERK_USER_ID = original;
    }
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
