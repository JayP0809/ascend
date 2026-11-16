/**
 * Database layer tests.
 *
 * These tests verify the behavior of lib/db.ts without a live database.
 * When TEST_DATABASE_URL is not set (the default), integration tests are
 * skipped so the production database is never modified by the test suite.
 *
 * To run integration tests against an isolated database:
 *   TEST_DATABASE_URL=<isolated-db-url> npm test
 *
 * Never set TEST_DATABASE_URL to the production DATABASE_URL — integration
 * tests write and seed data and do not clean up after every case.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  saveAnalysis, getAnalysis, getUserAnalyses,
  getCommunityEntries, getTrendingSkills, getPopularRoles,
  countRecentAnalyses,
  isDbAvailable,
} from './db';

// Integration tests require an explicitly isolated database URL.
// Never use DATABASE_URL (production) — set TEST_DATABASE_URL instead.
// When TEST_DATABASE_URL is set, forward it to DATABASE_URL so the db-client
// module connects to the isolated database, not production.
const TEST_DB_URL = process.env.TEST_DATABASE_URL;
if (TEST_DB_URL) process.env.DATABASE_URL = TEST_DB_URL;
const HAS_DB = !!TEST_DB_URL;

// ---------------------------------------------------------------------------
// No-database behavior (always runs in CI)
// ---------------------------------------------------------------------------

describe('db — no DATABASE_URL configured', () => {
  beforeAll(() => {
    // These tests rely on DATABASE_URL being absent.
    // If it is set, skip group by marking them conditionally.
  });

  it('isDbAvailable returns false when DATABASE_URL is not set', () => {
    if (HAS_DB) return; // skip — DB is configured
    expect(isDbAvailable()).toBe(false);
  });

  it('saveAnalysis is a no-op when db is unavailable', async () => {
    if (HAS_DB) return;
    await expect(
      saveAnalysis('test-id', 'resume text', 'Software Engineer', null, 72, '{}')
    ).resolves.toBeUndefined();
  });

  it('getAnalysis returns null when db is unavailable', async () => {
    if (HAS_DB) return;
    const result = await getAnalysis('any-id');
    expect(result).toBeNull();
  });

  it('getUserAnalyses returns empty array when db is unavailable', async () => {
    if (HAS_DB) return;
    const result = await getUserAnalyses('any-user-id');
    expect(result).toEqual([]);
  });

  it('getCommunityEntries returns empty array when db is unavailable', async () => {
    if (HAS_DB) return;
    const result = await getCommunityEntries();
    expect(result).toEqual([]);
  });

  it('getTrendingSkills returns empty array when db is unavailable', async () => {
    if (HAS_DB) return;
    const result = await getTrendingSkills();
    expect(result).toEqual([]);
  });

  it('getPopularRoles returns empty array when db is unavailable', async () => {
    if (HAS_DB) return;
    const result = await getPopularRoles();
    expect(result).toEqual([]);
  });

  it('countRecentAnalyses returns 0 when db is unavailable', async () => {
    if (HAS_DB) return;
    const result = await countRecentAnalyses('any-user-id', new Date());
    expect(result).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Schema invariants (always run — no DB needed)
// ---------------------------------------------------------------------------

describe('db schema — column name constants', () => {
  it('schema file exports expected table names', async () => {
    const schema = await import('./schema');
    expect(schema.analyses).toBeDefined();
    expect(schema.skillRecords).toBeDefined();
    expect(schema.roadmapPhases).toBeDefined();
    expect(schema.community).toBeDefined();
    expect(schema.aiUsage).toBeDefined();
    expect(schema.users).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Quota module — pure logic, no DB needed
// ---------------------------------------------------------------------------

describe('quota — pure logic', () => {
  it('demo flows are always allowed regardless of count', async () => {
    const { reserveQuotaSlot } = await import('./quota');
    const status = await reserveQuotaSlot(null, true);
    expect(status.allowed).toBe(true);
  });

  it('null userId (unauthenticated) is always allowed', async () => {
    const { reserveQuotaSlot } = await import('./quota');
    const status = await reserveQuotaSlot(null, false);
    expect(status.allowed).toBe(true);
  });

  it('reports correct limit constant', async () => {
    const { getQuotaStatus, MONTHLY_ANALYSIS_QUOTA } = await import('./quota');
    const status = await getQuotaStatus(null);
    expect(status.limit).toBe(MONTHLY_ANALYSIS_QUOTA);
  });
});

// ---------------------------------------------------------------------------
// Integration tests — only run when TEST_DATABASE_URL is set
// ---------------------------------------------------------------------------

describe.skipIf(!HAS_DB)('[integration] db — live PostgreSQL', () => {
  // Use valid UUIDs — Neon's analyses.id and community.id are UUID columns.
  // userId is null so no FK constraint on users.id is needed.
  const testId = crypto.randomUUID();

  it('saves and retrieves an analysis round-trip', async () => {
    const payload = JSON.stringify({ skillExtraction: { current_skills: ['Python'] } });
    await saveAnalysis(testId, 'Resume content here', 'Data Scientist', null, 65, payload);

    const record = await getAnalysis(testId);
    expect(record).not.toBeNull();
    expect(record!.id).toBe(testId);
    expect(record!.target_role).toBe('Data Scientist');

    const parsed = JSON.parse(record!.result_json);
    expect(parsed.skillExtraction.current_skills).toContain('Python');
  });

  it('getCommunityEntries returns rows after insert', async () => {
    const { saveCommunityEntry } = await import('./db');
    const entryId = crypto.randomUUID();
    await saveCommunityEntry(entryId, 'Software Engineer', 72, 'Docker');

    const entries = await getCommunityEntries(50);
    const found = entries.find((e) => e.id === entryId);
    expect(found).toBeDefined();
    expect(found!.target_role).toBe('Software Engineer');
  });

  it('countRecentAnalyses returns 0 for a user with no analyses', async () => {
    // Use a valid UUID that is guaranteed not to exist in the users table.
    const nonexistentUserId = '00000000-ffff-ffff-ffff-000000000000';
    const result = await countRecentAnalyses(nonexistentUserId, new Date());
    expect(result).toBe(0);
  });
});
