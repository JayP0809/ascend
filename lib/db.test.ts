/**
 * Database layer tests.
 *
 * These tests verify the behavior of lib/db.ts without a live database.
 * When DATABASE_URL is not set (the default in local dev without Neon),
 * all db functions must return safe empty/null values and not throw.
 *
 * To run against a real database, set DATABASE_URL before running tests.
 * Integration tests that require a real DB are marked with the [integration]
 * tag and skipped when DATABASE_URL is absent.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  saveAnalysis, getAnalysis, getUserAnalyses,
  getCommunityEntries, getTrendingSkills, getPopularRoles,
  countRecentAnalyses,
  isDbAvailable,
} from './db';

const HAS_DB = !!process.env.DATABASE_URL;

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
// Integration tests — only run when DATABASE_URL is set
// ---------------------------------------------------------------------------

describe.skipIf(!HAS_DB)('[integration] db — live PostgreSQL', () => {
  const testId = `test-${Date.now()}`;

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
    const entryId = `community-test-${Date.now()}`;
    await saveCommunityEntry(entryId, 'Software Engineer', 72, 'Docker');

    const entries = await getCommunityEntries(50);
    const found = entries.find((e) => e.id === entryId);
    expect(found).toBeDefined();
    expect(found!.target_role).toBe('Software Engineer');
  });

  it('countRecentAnalyses returns 0 for a user with no analyses', async () => {
    const count = await countRecentAnalyses('nonexistent-user-id', new Date());
    expect(count).toBe(0);
  });
});
