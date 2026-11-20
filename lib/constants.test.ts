import { describe, it, expect } from 'vitest';
import { DEMO_ANALYSIS_ID, DEMO_ID_REGEX } from './constants';

describe('DEMO_ANALYSIS_ID', () => {
  it('matches the API schema regex from analyzeBodySchema', () => {
    // The POST /api/analyze route accepts demo IDs only when they satisfy
    // /^demo-[a-z0-9-]+$/i — keeping these in sync is a hard contract.
    expect(DEMO_ID_REGEX.test(DEMO_ANALYSIS_ID)).toBe(true);
  });

  it('starts with "demo-" so the route enters the demo branch', () => {
    // Route logic: isDemoFlow = !isLiveMode() || !!analysisId?.startsWith('demo-')
    expect(DEMO_ANALYSIS_ID.startsWith('demo-')).toBe(true);
  });

  it('is non-empty and contains only lowercase letters and hyphens after the prefix', () => {
    const suffix = DEMO_ANALYSIS_ID.slice('demo-'.length);
    expect(suffix.length).toBeGreaterThan(0);
    expect(suffix).toMatch(/^[a-z0-9-]+$/);
  });

  it('does not contain whitespace or special characters', () => {
    expect(DEMO_ANALYSIS_ID).not.toMatch(/\s/);
    expect(DEMO_ANALYSIS_ID).toMatch(/^[a-z0-9-]+$/);
  });
});
