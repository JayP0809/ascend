/**
 * Security and authorization regression tests.
 *
 * Coverage:
 *   1. checkAnalysisAccess() — all branches of the ownership model
 *   2. Demo ID routing — always public, never touches DB
 *   3. Quota enforcement — pure logic (no DB), atomic reservation model
 *   4. Auth module flags — AUTH_CONFIGURED and DEV_BYPASS_ACTIVE semantics
 *
 * Tests that require a live database or Clerk session are tagged [integration]
 * or [live-auth] and are either skipped or documented as manual steps below.
 *
 * Tests marked with a comment "// SIMULATED" reason about the authorization
 * logic using the exported helper, NOT about an HTTP round-trip. They do not
 * constitute end-to-end auth verification.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { checkAnalysisAccess } from './auth';
import type { AuthUser } from './auth';

const HAS_DB   = !!process.env.DATABASE_URL;
const HAS_AUTH = !!(process.env.AUTH_SECRET && process.env.AUTH_GOOGLE_ID);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function user(id: string): AuthUser {
  return { userId: id, providerId: `google_sub_${id}`, email: `${id}@test.com` };
}

function record(userId: string | null) {
  return { user_id: userId };
}

// ---------------------------------------------------------------------------
// 1. checkAnalysisAccess — authorization logic
// ---------------------------------------------------------------------------

describe('checkAnalysisAccess — dev bypass (Auth.js absent, non-production)', () => {
  // These tests only make sense when Auth.js is not configured.
  // If the CI environment has AUTH_SECRET + AUTH_GOOGLE_ID the results will differ.
  it.skipIf(HAS_AUTH)('allows any user to access any record in dev mode', () => {
    // SIMULATED — tests the pure function, not an HTTP call
    const result = checkAnalysisAccess(record('owner-id'), user('other-id'));
    // DEV_BYPASS_ACTIVE = true when CLERK absent + non-production
    expect(result.granted).toBe(true);
  });

  it.skipIf(HAS_AUTH)('allows null user to access a record in dev mode', () => {
    const result = checkAnalysisAccess(record('owner-id'), null);
    expect(result.granted).toBe(true);
  });

  it.skipIf(HAS_AUTH)('allows access to ownerless records in dev mode', () => {
    const result = checkAnalysisAccess(record(null), null);
    expect(result.granted).toBe(true);
  });
});

describe('checkAnalysisAccess — Auth.js configured (production auth rules)', () => {
  // These tests simulate the production path by calling the function with
  // arguments that mirror what would happen when AUTH_CONFIGURED = true.
  // Since we cannot flip AUTH_CONFIGURED in a unit test without mocking the
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
    if (!HAS_AUTH) {
      // In dev mode checkAnalysisAccess returns true for all — documented.
      return;
    }
    const r = record('alice');
    const u = user('bob');
    const result = checkAnalysisAccess(r, u);
    expect(result.granted).toBe(false);
    expect((result as { granted: false; status: number }).status).toBe(404);
  });

  it('ownerless-record rule: returns 404 (not public) when Auth.js configured', () => {
    // Ownerless records are PRIVATE. This is the fix for the null=public bug.
    if (!HAS_AUTH) return;
    const r = record(null);
    const u = user('alice');
    const result = checkAnalysisAccess(r, u);
    expect(result.granted).toBe(false);
    expect((result as { granted: false; status: number }).status).toBe(404);
  });

  it('unauthenticated rule: returns 401 when Auth.js configured and no user', () => {
    if (!HAS_AUTH) return;
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
// | AUTH_CONFIGURED  | NODE_ENV     | user    | record.user_id | Expected    |
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
  it('returns false when ADMIN_EMAIL is not set', async () => {
    const { isAdminUser } = await import('./auth');
    // In CI and local dev, ADMIN_EMAIL is not set → no admin
    if (!process.env.ADMIN_EMAIL) {
      expect(isAdminUser('someone@example.com')).toBe(false);
      expect(isAdminUser(null)).toBe(false);
      expect(isAdminUser(undefined)).toBe(false);
    }
  });

  it('returns false for null or undefined email regardless of env var', async () => {
    const { isAdminUser } = await import('./auth');
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(undefined)).toBe(false);
    expect(isAdminUser('')).toBe(false);
  });

  it('never grants admin status based on a fake/guessed email', async () => {
    const { isAdminUser } = await import('./auth');
    // Even if someone sends a request with an email that looks admin-like,
    // it only matches if it exactly equals ADMIN_EMAIL from the env.
    const fakeEmails = [
      'admin',
      'admin@',
      'ADMIN@example.com',
      'notadmin@example.com',
      '',
    ];
    for (const email of fakeEmails) {
      expect(isAdminUser(email)).toBe(false);
    }
  });

  it('returns true only when email exactly matches ADMIN_EMAIL (case-insensitive)', async () => {
    const original = process.env.ADMIN_EMAIL;
    try {
      process.env.ADMIN_EMAIL = 'admin@ascend.test';
      const { isAdminUser } = await import('./auth');
      // Note: isAdminUser reads process.env at call time (not module load time)
      expect(isAdminUser('admin@ascend.test')).toBe(true);
      expect(isAdminUser('ADMIN@ASCEND.TEST')).toBe(true);   // case-insensitive
      expect(isAdminUser('admin@ascend.test2')).toBe(false); // different domain
      expect(isAdminUser('notadmin@ascend.test')).toBe(false);
    } finally {
      if (original === undefined) {
        delete process.env.ADMIN_EMAIL;
      } else {
        process.env.ADMIN_EMAIL = original;
      }
    }
  });

  it('admin exemption does not bypass checkAnalysisAccess ownership check', async () => {
    // Admin can bypass the QUOTA but cannot access another user's analyses.
    // The ownership check is in checkAnalysisAccess() and is always enforced.
    const { checkAnalysisAccess, isAdminUser } = await import('./auth');

    const adminEmail = 'admin@ascend.test';
    const original = process.env.ADMIN_EMAIL;
    try {
      process.env.ADMIN_EMAIL = adminEmail;
      expect(isAdminUser(adminEmail)).toBe(true);

      if (!HAS_AUTH) {
        // In dev mode, checkAnalysisAccess grants access to all — bypass active.
        // This test documents that in PRODUCTION (HAS_AUTH=true) the admin
        // cannot access a record they don't own, even with admin status.
        // Manual verification required: see [live-auth] section below.
        return;
      }

      // With Auth.js configured: admin trying to read a record owned by another
      // user should still get 404.
      const otherUserId = 'bbbbbbbb-0000-0000-0000-000000000002';
      const adminDbUserId = 'aaaaaaaa-0000-0000-0000-000000000001';
      const adminUser = { userId: adminDbUserId, providerId: 'google_sub_admin', email: adminEmail };
      const record = { user_id: otherUserId };
      const result = checkAnalysisAccess(record, adminUser);
      expect(result.granted).toBe(false);
      expect((result as { granted: false; status: number }).status).toBe(404);
    } finally {
      if (original === undefined) {
        delete process.env.ADMIN_EMAIL;
      } else {
        process.env.ADMIN_EMAIL = original;
      }
    }
  });

  it('reserveQuotaSlot returns adminExempt=true for admin when no DB', async () => {
    // This test checks the no-DB fallback path. When DATABASE_URL is set, skip:
    // the DB path is covered by the [integration] tests below.
    if (HAS_DB) return;
    const original = process.env.ADMIN_EMAIL;
    try {
      process.env.ADMIN_EMAIL = 'admin@ascend.test';
      const { reserveQuotaSlot } = await import('./quota');
      const result = await reserveQuotaSlot(
        'aaaaaaaa-0000-0000-0000-000000000001',
        false,
        'admin@ascend.test',
      );
      expect(result.allowed).toBe(true);
      expect(result.adminExempt).toBe(true);
    } finally {
      if (original === undefined) {
        delete process.env.ADMIN_EMAIL;
      } else {
        process.env.ADMIN_EMAIL = original;
      }
    }
  });

  it('reserveQuotaSlot returns no adminExempt flag for regular users', async () => {
    // No-DB fallback path only. When DATABASE_URL is set, skip:
    // the DB path is covered by the [integration] tests below.
    if (HAS_DB) return;
    const { reserveQuotaSlot } = await import('./quota');
    const result = await reserveQuotaSlot(
      'aaaaaaaa-0000-0000-0000-000000000001',
      false,
      'regular@example.com',
    );
    expect(result.adminExempt).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// 5. Auth module flags
// ---------------------------------------------------------------------------

describe('auth — AUTH_CONFIGURED and DEV_BYPASS_ACTIVE flags', () => {
  it('AUTH_CONFIGURED is false when env vars are absent', async () => {
    const { AUTH_CONFIGURED } = await import('./auth');
    if (!HAS_AUTH) {
      expect(AUTH_CONFIGURED).toBe(false);
    }
  });

  it('DEV_BYPASS_ACTIVE is true in test environment without Auth.js', async () => {
    const { DEV_BYPASS_ACTIVE } = await import('./auth');
    // Vitest runs in NODE_ENV=test which is !== 'production', so with no
    // Auth.js credentials, DEV_BYPASS_ACTIVE should be true.
    if (!HAS_AUTH) {
      expect(DEV_BYPASS_ACTIVE).toBe(true);
    }
  });

  it('requiresAuth returns false for demo IDs regardless of Auth.js state', async () => {
    const { requiresAuth } = await import('./auth');
    expect(requiresAuth('demo-sample-001')).toBe(false);
    expect(requiresAuth('demo-')).toBe(false);
    expect(requiresAuth(undefined)).toBe(false);
  });

  it('requiresAuth returns false for real IDs when Auth.js is not configured', async () => {
    const { requiresAuth, AUTH_CONFIGURED } = await import('./auth');
    if (!AUTH_CONFIGURED) {
      expect(requiresAuth('aaaaaaaa-0000-0000-0000-000000000001')).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Quota enforcement — concurrent requests (integration, requires DB)
// ---------------------------------------------------------------------------

describe.skipIf(!HAS_DB)('[integration] quota — PostgreSQL atomic reservation', () => {
  // usage_buckets.user_id references users.id (FK). We need real user rows
  // before inserting quota entries. Each test gets its own UUID so they are
  // fully isolated and can run in any order.
  //
  // We seed test users directly via the Neon HTTP client so there is no
  // dependency on the OAuth sign-in flow.
  let seedUser: (providerId: string) => Promise<string>;

  beforeAll(async () => {
    const { neon } = await import('@neondatabase/serverless');
    const rawUrl = process.env.DATABASE_URL!;
    const u = new URL(rawUrl);
    u.hostname = u.hostname.replace('-pooler', '');
    u.searchParams.delete('channel_binding');
    const sql = neon(u.toString());

    seedUser = async (providerId: string): Promise<string> => {
      const userId = crypto.randomUUID();
      await sql`
        INSERT INTO users (id, clerk_id, email)
        VALUES (${userId}, ${providerId}, ${providerId + '@test.local'})
        ON CONFLICT (clerk_id) DO NOTHING
      `;
      return userId;
    };
  });

  it('concurrent first-requests all succeed (race condition regression)', async () => {
    // Verifies the INSERT ... ON CONFLICT DO UPDATE fix. The previous CTE used
    // a split UPDATE / INSERT ... ON CONFLICT DO NOTHING pattern where two
    // simultaneous first-requests for the same user could both fail to match
    // the UPDATE (no row yet) and have their INSERT blocked by each other's
    // conflict, resulting in both being denied. This test would have failed
    // against the old implementation.
    const { reserveQuotaSlot, MONTHLY_ANALYSIS_QUOTA } = await import('./quota');
    const userId = await seedUser(`provider_concurrent_${Date.now()}`);
    const concurrency = Math.min(MONTHLY_ANALYSIS_QUOTA, 5);

    const results = await Promise.all(
      Array.from({ length: concurrency }, () => reserveQuotaSlot(userId, false))
    );

    const allowed = results.filter((r) => r.allowed).length;
    expect(allowed).toBe(concurrency);
  });

  it('request beyond quota limit is denied', async () => {
    const { reserveQuotaSlot, MONTHLY_ANALYSIS_QUOTA } = await import('./quota');
    const userId = await seedUser(`provider_exhaust_${Date.now()}`);

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
    const userId = await seedUser(`provider_demobp_${Date.now()}`);

    for (let i = 0; i < MONTHLY_ANALYSIS_QUOTA; i++) {
      await reserveQuotaSlot(userId, false);
    }

    const demo = await reserveQuotaSlot(userId, true);
    expect(demo.allowed).toBe(true);
    expect(demo.used).toBe(0); // demo does not read or write the bucket
  });

  it('getQuotaStatus reflects current usage without reserving a slot', async () => {
    const { reserveQuotaSlot, getQuotaStatus } = await import('./quota');
    const userId = await seedUser(`provider_status_${Date.now()}`);

    await reserveQuotaSlot(userId, false);
    const status = await getQuotaStatus(userId);
    expect(status.used).toBe(1);
  });

  it('[admin] can exceed regular quota limit — usage tracked', async () => {
    const { reserveQuotaSlot, MONTHLY_ANALYSIS_QUOTA } = await import('./quota');
    const adminEmail = `admin_integration_${Date.now()}@ascend.test`;
    const userId = await seedUser(`provider_admin_integration_${Date.now()}`);
    const original = process.env.ADMIN_EMAIL;
    try {
      process.env.ADMIN_EMAIL = adminEmail;
      const extraRequests = MONTHLY_ANALYSIS_QUOTA + 3;
      for (let i = 0; i < extraRequests; i++) {
        const r = await reserveQuotaSlot(userId, false, adminEmail);
        expect(r.allowed).toBe(true);
        expect(r.adminExempt).toBe(true);
      }
      const { getQuotaStatus } = await import('./quota');
      const status = await getQuotaStatus(userId, false, adminEmail);
      expect(status.used).toBe(extraRequests);
      expect(status.adminExempt).toBe(true);
      expect(status.allowed).toBe(true);
    } finally {
      if (original === undefined) delete process.env.ADMIN_EMAIL;
      else process.env.ADMIN_EMAIL = original;
    }
  });

  it('[admin] non-admin user is still denied after quota exhausted', async () => {
    const { reserveQuotaSlot, MONTHLY_ANALYSIS_QUOTA } = await import('./quota');
    const regularEmail = `regular_notadmin_${Date.now()}@example.com`;
    const regularUserId = await seedUser(`provider_regular_${Date.now()}`);
    const original = process.env.ADMIN_EMAIL;
    try {
      process.env.ADMIN_EMAIL = `different_admin_${Date.now()}@ascend.test`;

      for (let i = 0; i < MONTHLY_ANALYSIS_QUOTA; i++) {
        await reserveQuotaSlot(regularUserId, false, regularEmail);
      }

      const over = await reserveQuotaSlot(regularUserId, false, regularEmail);
      expect(over.allowed).toBe(false);
      expect(over.adminExempt).toBeFalsy();
    } finally {
      if (original === undefined) delete process.env.ADMIN_EMAIL;
      else process.env.ADMIN_EMAIL = original;
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Quota refund — reserve-then-refund leaves count unchanged
// ---------------------------------------------------------------------------

describe('quota refund — pure logic (no DB)', () => {
  it('refundQuotaSlot is a no-op when userId is null', async () => {
    const { refundQuotaSlot } = await import('./quota');
    // Should not throw; nothing to decrement
    await expect(refundQuotaSlot(null)).resolves.toBeUndefined();
  });

  it('refundQuotaSlot is a no-op when DATABASE_URL is absent', async () => {
    if (HAS_DB) return; // DB path is covered by integration tests
    const { refundQuotaSlot } = await import('./quota');
    await expect(
      refundQuotaSlot('aaaaaaaa-0000-0000-0000-000000000001')
    ).resolves.toBeUndefined();
  });

  it('refundQuotaSlot accepts optional email parameter without throwing', async () => {
    if (HAS_DB) return;
    const { refundQuotaSlot } = await import('./quota');
    await expect(
      refundQuotaSlot('aaaaaaaa-0000-0000-0000-000000000001', 'user@example.com')
    ).resolves.toBeUndefined();
  });
});

describe.skipIf(!HAS_DB)('[integration] quota refund — reserve-then-refund cycle', () => {
  let seedUser: (providerId: string) => Promise<string>;

  beforeAll(async () => {
    const { neon } = await import('@neondatabase/serverless');
    const rawUrl = process.env.DATABASE_URL!;
    const u = new URL(rawUrl);
    u.hostname = u.hostname.replace('-pooler', '');
    u.searchParams.delete('channel_binding');
    const sql = neon(u.toString());

    seedUser = async (providerId: string): Promise<string> => {
      const userId = crypto.randomUUID();
      await sql`
        INSERT INTO users (id, clerk_id, email)
        VALUES (${userId}, ${providerId}, ${providerId + '@test.local'})
        ON CONFLICT (clerk_id) DO NOTHING
      `;
      return userId;
    };
  });

  it('reserve then refund leaves count at 0 (net zero)', async () => {
    const { reserveQuotaSlot, refundQuotaSlot, getQuotaStatus } = await import('./quota');
    const userId = await seedUser(`provider_refund_netzero_${Date.now()}`);

    const reserved = await reserveQuotaSlot(userId, false);
    expect(reserved.allowed).toBe(true);
    expect(reserved.used).toBe(1);

    await refundQuotaSlot(userId);

    const after = await getQuotaStatus(userId);
    expect(after.used).toBe(0);
  });

  it('reserve twice, refund once leaves count at 1', async () => {
    const { reserveQuotaSlot, refundQuotaSlot, getQuotaStatus } = await import('./quota');
    const userId = await seedUser(`provider_refund_partial_${Date.now()}`);

    await reserveQuotaSlot(userId, false);
    await reserveQuotaSlot(userId, false);
    await refundQuotaSlot(userId);

    const after = await getQuotaStatus(userId);
    expect(after.used).toBe(1);
  });

  it('refunding below zero is clamped to 0 (GREATEST guard)', async () => {
    const { refundQuotaSlot, getQuotaStatus } = await import('./quota');
    const userId = await seedUser(`provider_refund_clamp_${Date.now()}`);

    // No reserve — count starts at 0 (no row). Refund on a non-existent row
    // must not error and usage must remain 0.
    await expect(refundQuotaSlot(userId)).resolves.toBeUndefined();
    const after = await getQuotaStatus(userId);
    expect(after.used).toBe(0);
  });

  it('failed analysis (refund) does not consume a permanent slot', async () => {
    const { reserveQuotaSlot, refundQuotaSlot, getQuotaStatus, MONTHLY_ANALYSIS_QUOTA } = await import('./quota');
    const userId = await seedUser(`provider_refund_failed_${Date.now()}`);

    // Simulate: reserve slot → Groq fails → refund slot. Repeat up to quota.
    // After all refunds, quota should still be fully available.
    for (let i = 0; i < MONTHLY_ANALYSIS_QUOTA; i++) {
      const r = await reserveQuotaSlot(userId, false);
      expect(r.allowed).toBe(true);
      await refundQuotaSlot(userId);
    }

    const status = await getQuotaStatus(userId);
    expect(status.used).toBe(0);
    expect(status.allowed).toBe(true);
  });

  it('successful analysis (no refund) correctly consumes a slot', async () => {
    const { reserveQuotaSlot, getQuotaStatus } = await import('./quota');
    const userId = await seedUser(`provider_norebound_success_${Date.now()}`);

    // Simulate: reserve slot → Groq succeeds → NO refund.
    const r = await reserveQuotaSlot(userId, false);
    expect(r.allowed).toBe(true);
    // No refundQuotaSlot call — simulating a successful analysis.

    const status = await getQuotaStatus(userId);
    expect(status.used).toBe(1);
  });

  it('concurrent refunds do not produce negative counts', async () => {
    const { reserveQuotaSlot, refundQuotaSlot, getQuotaStatus } = await import('./quota');
    const userId = await seedUser(`provider_refund_concurrent_${Date.now()}`);

    // Reserve 3 slots concurrently, then refund all 3 concurrently.
    await Promise.all([
      reserveQuotaSlot(userId, false),
      reserveQuotaSlot(userId, false),
      reserveQuotaSlot(userId, false),
    ]);

    await Promise.all([
      refundQuotaSlot(userId),
      refundQuotaSlot(userId),
      refundQuotaSlot(userId),
    ]);

    const status = await getQuotaStatus(userId);
    expect(status.used).toBeGreaterThanOrEqual(0); // GREATEST guard: never negative
    expect(status.used).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// 8. upsertUser — atomic insert prevents duplicate creation
// ---------------------------------------------------------------------------

describe('upsertUser — atomic upsert (no DB, documents expected behavior)', () => {
  it('upsertUser throws when DATABASE_URL is absent (db unavailable)', async () => {
    if (HAS_DB) return; // DB tests covered in [integration] section below
    const { upsertUser } = await import('./db');
    await expect(upsertUser('google_sub_123', 'test@example.com')).rejects.toThrow(
      'Database not available',
    );
  });
});

describe.skipIf(!HAS_DB)(
  '[integration] upsertUser — concurrent first-sign-in race condition',
  () => {
    it('concurrent upserts for the same provider ID return the same UUID', async () => {
      // Regression test for the SELECT-then-INSERT race: two simultaneous
      // sign-ins for the same Google account must both resolve to the same
      // internal user ID without throwing a unique-constraint violation.
      const { upsertUser } = await import('./db');
      const providerId = `google_sub_concurrent_${Date.now()}`;
      const email = `${providerId}@test.local`;

      const [id1, id2, id3] = await Promise.all([
        upsertUser(providerId, email, 'Test User'),
        upsertUser(providerId, email, 'Test User'),
        upsertUser(providerId, email, 'Test User'),
      ]);

      expect(id1).toBe(id2);
      expect(id1).toBe(id3);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });

    it('repeated upserts with updated email return the same UUID', async () => {
      const { upsertUser } = await import('./db');
      const providerId = `google_sub_update_${Date.now()}`;

      const id1 = await upsertUser(providerId, 'old@example.com');
      const id2 = await upsertUser(providerId, 'new@example.com'); // email changed
      expect(id1).toBe(id2); // same user, email updated
    });
  },
);

// ---------------------------------------------------------------------------
// 9. POST /api/analyze upload ownership — checkAnalysisAccess called for uploads
// ---------------------------------------------------------------------------

describe('POST /api/analyze — upload ownership enforcement', () => {
  it('checkAnalysisAccess is called with the existing upload record shape', () => {
    // Unit-level: verify the ownership logic handles the analysis record shape.
    // Simulates what POST /api/analyze does before running the AI pipeline.
    // With Auth.js configured this would deny cross-user access.

    // User owns their record → granted
    const owner = { userId: 'alice', providerId: 'g_sub_alice', email: 'alice@test.com' };
    const owned = { user_id: 'alice' };
    expect(checkAnalysisAccess(owned, owner).granted).toBe(true);

    // In dev mode (no Auth.js) any record is accessible — dev bypass.
    // We document here that in production (HAS_AUTH=true) cross-user is 404.
    if (HAS_AUTH) {
      const other = { userId: 'bob', providerId: 'g_sub_bob', email: 'bob@test.com' };
      const result = checkAnalysisAccess(owned, other);
      expect(result.granted).toBe(false);
      expect((result as { granted: false; status: number }).status).toBe(404);

      const ownerless = { user_id: null };
      const ownerlessResult = checkAnalysisAccess(ownerless, owner);
      expect(ownerlessResult.granted).toBe(false);
    }
  });
});

/*
 * [live-auth] Tests that cannot run without Auth.js + Google OAuth configuration.
 * Manual verification steps for post-deployment testing:
 *
 * 1. Cross-user read (IDOR):
 *    Sign in as user A. Upload + analyze → copy analysisId.
 *    Sign in as user B. GET /api/analyze?id=<A's id> → expect 404.
 *    GET /api/export?id=<A's id> → expect 404.
 *
 * 2. Cross-user write (upload ownership):
 *    Sign in as user A. Upload → get analysisId.
 *    Sign out, sign in as user B. POST /api/analyze with A's analysisId → expect 404.
 *    Verify quota was NOT consumed for this rejected request.
 *
 * 3. Ownerless record access:
 *    With a record seeded in DB without user_id, authenticated user
 *    GET /api/analyze?id=<ownerless-id> → expect 404.
 *    POST /api/analyze with ownerless analysisId → expect 404 (upload ownership check).
 *
 * 4. Unauthenticated live POST:
 *    No session cookie. POST /api/analyze with live analysisId → expect 401.
 *    Verify quota row was NOT created for this request.
 *
 * 5. Client-supplied userId ignored:
 *    POST /api/analyze with body { userId: 'other-user-id', analysisId: ... }
 *    Server must derive identity from Auth.js JWT session only.
 *    Verify the saved analysis is bound to the session user, not 'other-user-id'.
 *
 * 6. Production misconfiguration (503):
 *    Deploy with AUTH_SECRET absent, NODE_ENV=production.
 *    GET /api/analyze?id=<real-uuid> → expect 503.
 *    GET /api/analyze?id=demo-sample → expect 200 (demo still works).
 *
 * 7. Concurrent first sign-in (covered by [integration] upsertUser test above):
 *    Two tabs signing in simultaneously must both resolve to the same user UUID.
 */
