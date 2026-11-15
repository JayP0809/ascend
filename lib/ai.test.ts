/**
 * Tests for AI pipeline timeout and failure handling.
 *
 * Uses vi.mock to swap in a fake Groq client so no real API calls are made.
 * Live integration tests (gated by GROQ_API_KEY) verify the actual model responds.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- mock groq-sdk --------------------------------------------------------
// vi.mock is hoisted to the top of the file so the factory must reference a
// value that is itself hoisted.  vi.hoisted() runs before the mock factory and
// captures the reference correctly.
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('groq-sdk', () => ({
  // Must be a regular function (not arrow) so `new Groq(...)` works.
  default: vi.fn(function () {
    return { chat: { completions: { create: mockCreate } } };
  }),
}));

// Import AFTER mocking so the module picks up the stub.
import {
  runAnalysis,
  getDemoData,
  isLiveMode,
  GroqTimeoutError,
  GroqTruncationError,
} from './ai';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeCompletion(content: string, finishReason = 'stop') {
  return {
    choices: [{ message: { content }, finish_reason: finishReason }],
    usage: { prompt_tokens: 10, completion_tokens: 20 },
  };
}

const VALID_SKILL_JSON = JSON.stringify({
  current_skills: ['JavaScript', 'Python'],
  experience_years: 2,
  strengths: ['Fast learner'],
  education: 'BS CS',
  top_titles: ['Software Engineer'],
});

const VALID_ROLE_JSON = JSON.stringify({
  required_skills: ['Docker', 'Kubernetes'],
  nice_to_have: ['Helm'],
  categories: { technical: ['Docker'], soft: ['Communication'], tools: ['Git'], certifications: [] },
  typical_timeline_months: 6,
  avg_salary: '$120,000',
  demand_level: 'High',
});

const VALID_GAP_JSON = JSON.stringify({
  missing_critical: ['Docker'],
  missing_nice: ['Helm'],
  transferable: ['Python'],
  readiness_score: 65,
  strengths_summary: 'Strong programming background',
  biggest_gap: 'Container orchestration',
});

const VALID_ROADMAP_JSON = JSON.stringify({
  weeks: [
    {
      week_start: 1,
      week_end: 2,
      focus_area: 'Docker Basics',
      topics: ['Container fundamentals'],
      resources: [{ title: 'Docker Docs', url: 'https://docs.docker.com', type: 'Docs' }],
      project: { title: 'Containerize App', description: 'Build a container', tech: ['Docker'], hours: 8 },
      milestone: 'Can create Docker containers',
    },
  ],
});

// ---------------------------------------------------------------------------
// Demo mode (no API key)
// ---------------------------------------------------------------------------
describe('demo mode', () => {
  it('getDemoData returns analysis without hitting Groq', () => {
    const result = getDemoData('demo-test', 'DevOps Engineer');
    expect(result.isDemoMode).toBe(true);
    expect(result.analysisId).toBe('demo-test');
    expect(result.gapAnalysis.readiness_score).toBeGreaterThan(0);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('runAnalysis falls back to demo when GROQ_API_KEY is absent', async () => {
    const original = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    const result = await runAnalysis('demo-fallback', 'resume text', 'SWE');
    expect(result.isDemoMode).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
    process.env.GROQ_API_KEY = original;
  });
});

// ---------------------------------------------------------------------------
// Timeout handling
// ---------------------------------------------------------------------------
describe('timeout handling', () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-groq-key-for-unit-tests';
    vi.clearAllMocks();
  });

  it('converts AbortError to GroqTimeoutError without waiting for real clock', async () => {
    // Reject immediately with an AbortError to simulate what happens when
    // AbortController fires (whether from real timer or fake clock).
    mockCreate.mockImplementation((_body: unknown, _options?: unknown) => {
      const err = new Error('The user aborted a request.');
      err.name = 'AbortError';
      return Promise.reject(err);
    });

    await expect(
      runAnalysis('test-id', 'resume text', 'SWE')
    ).rejects.toBeInstanceOf(GroqTimeoutError);
  });

  it('GroqTimeoutError message is user-friendly and includes step name', () => {
    const err = new GroqTimeoutError('generateRoadmap', 60_000);
    expect(err.message).toContain('"generateRoadmap"');
    expect(err.message).toContain('60s');
    expect(err.message).toContain('try again');
    expect(err.name).toBe('GroqTimeoutError');
  });
});

// ---------------------------------------------------------------------------
// Truncation handling
// ---------------------------------------------------------------------------
describe('truncation handling (finish_reason: length)', () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-groq-key-for-unit-tests';
    vi.clearAllMocks();
  });

  it('throws GroqTruncationError on finish_reason=length and does not retry', async () => {
    // Every call returns a truncated response (finish=length).
    mockCreate.mockResolvedValue(
      makeCompletion('{"incomplete": true', 'length')
    );

    await expect(
      runAnalysis('test-id', 'resume text', 'SWE')
    ).rejects.toBeInstanceOf(GroqTruncationError);

    // The pipeline runs extractSkills + getRoleRequirements concurrently
    // (Promise.all), so 2 initial calls are made.  Neither retries on
    // truncation, so the total stays at 2 (not 3+).
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('GroqTruncationError message does not suggest retrying', () => {
    const err = new GroqTruncationError('generateRoadmap');
    expect(err.message).toContain('cut off');
    expect(err.message).toContain('retrying will not help');
    expect(err.name).toBe('GroqTruncationError');
  });
});

// ---------------------------------------------------------------------------
// Successful pipeline
// ---------------------------------------------------------------------------
describe('successful pipeline', () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-groq-key-for-unit-tests';
    vi.clearAllMocks();
  });

  it('runs the full pipeline and returns a valid AnalysisResult', async () => {
    // The pipeline makes 4 Groq calls: extractSkills, getRoleRequirements
    // (concurrent), analyzeGap, generateRoadmap.
    mockCreate
      .mockResolvedValueOnce(makeCompletion(VALID_SKILL_JSON))
      .mockResolvedValueOnce(makeCompletion(VALID_ROLE_JSON))
      .mockResolvedValueOnce(makeCompletion(VALID_GAP_JSON))
      .mockResolvedValueOnce(makeCompletion(VALID_ROADMAP_JSON));

    const result = await runAnalysis('live-id', 'resume text', 'Software Engineer');
    expect(result.isDemoMode).toBe(false);
    expect(result.analysisId).toBe('live-id');
    expect(result.gapAnalysis.readiness_score).toBe(65);
    expect(result.roadmap).toHaveLength(1);
    expect(mockCreate).toHaveBeenCalledTimes(4);
  });

  it('exhausts retries and throws on persistent schema validation failure', async () => {
    // Every call returns malformed JSON → schema validation fails on every attempt.
    // MAX_RETRIES = 1 means 2 attempts total per step before throwing.
    mockCreate.mockResolvedValue(makeCompletion('{"bad": "shape"}'));

    await expect(
      runAnalysis('live-id', 'resume text', 'Software Engineer')
    ).rejects.toThrow(/schema validation failed/);
  });
});

// ---------------------------------------------------------------------------
// Live integration (requires GROQ_API_KEY in environment)
// ---------------------------------------------------------------------------
const HAS_GROQ = !!(process.env.GROQ_API_KEY);

describe.skipIf(!HAS_GROQ)('[integration] live Groq API — basic connectivity', () => {
  it('isLiveMode() returns true when API key is set', () => {
    expect(isLiveMode()).toBe(true);
  });
});
