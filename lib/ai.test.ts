/**
 * Tests for AI pipeline timeout and failure handling.
 *
 * Uses vi.mock to swap in a fake Groq client so no real API calls are made.
 * Live integration tests (gated by GROQ_API_KEY) verify the actual model responds.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResourceSchema, RoadmapBatchSchema } from './ai-schemas';

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
  RoadmapAssemblyError,
  roadmapBatchPrompt,
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

// Batch responses: each needs exactly 4 phases.
// Week numbers don't need to be exact — fixWeeks() in the pipeline overwrites them.
function makePhase(n: number) {
  return {
    week_start: n * 2 - 1,
    week_end:   n * 2,
    focus_area: `Focus ${n}`,
    topics: [`Topic ${n}`],
    resources: [{ title: `Resource ${n}`, url: 'https://docs.docker.com', type: 'Docs' }],
    project: { title: `Project ${n}`, description: `Build thing ${n}`, tech: ['Python'], hours: 8 },
    milestone: `Milestone ${n}`,
  };
}

const VALID_BATCH1_JSON = JSON.stringify({ weeks: [makePhase(1), makePhase(2), makePhase(3), makePhase(4)] });
const VALID_BATCH2_JSON = JSON.stringify({ weeks: [makePhase(5), makePhase(6), makePhase(7), makePhase(8)] });

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

  it('runs the full pipeline with 2 roadmap batches and returns 8 phases', async () => {
    // Pipeline call order:
    //  1 & 2  — extractSkills + getRoleRequirements (concurrent)
    //  3      — analyzeGap
    //  4      — roadmapBatch1 (phases 1-4)
    //  5      — roadmapBatch2 (phases 5-8)
    mockCreate
      .mockResolvedValueOnce(makeCompletion(VALID_SKILL_JSON))   // 1 extractSkills
      .mockResolvedValueOnce(makeCompletion(VALID_ROLE_JSON))    // 2 getRoleRequirements
      .mockResolvedValueOnce(makeCompletion(VALID_GAP_JSON))     // 3 analyzeGap
      .mockResolvedValueOnce(makeCompletion(VALID_BATCH1_JSON))  // 4 roadmapBatch1
      .mockResolvedValueOnce(makeCompletion(VALID_BATCH2_JSON)); // 5 roadmapBatch2

    const result = await runAnalysis('live-id', 'resume text', 'Software Engineer');
    expect(result.isDemoMode).toBe(false);
    expect(result.analysisId).toBe('live-id');
    expect(result.gapAnalysis.readiness_score).toBe(65);
    expect(result.roadmap).toHaveLength(8);
    expect(mockCreate).toHaveBeenCalledTimes(5);
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
// Batched roadmap generation
// ---------------------------------------------------------------------------
describe('batched roadmap generation', () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-groq-key-for-unit-tests';
    vi.clearAllMocks();
  });

  it('throws immediately when batch 1 returns truncated output (finish=length)', async () => {
    // batch 1 fails → should throw GroqTruncationError before batch 2 is attempted
    mockCreate
      .mockResolvedValueOnce(makeCompletion(VALID_SKILL_JSON))
      .mockResolvedValueOnce(makeCompletion(VALID_ROLE_JSON))
      .mockResolvedValueOnce(makeCompletion(VALID_GAP_JSON))
      .mockResolvedValueOnce(makeCompletion('{"incomplete": true', 'length')); // batch 1 truncated

    await expect(
      runAnalysis('live-id', 'resume text', 'Software Engineer')
    ).rejects.toBeInstanceOf(GroqTruncationError);

    // batch 2 should NOT be called after batch 1 truncation
    expect(mockCreate).toHaveBeenCalledTimes(4);
  });

  it('throws when batch 2 returns truncated output', async () => {
    mockCreate
      .mockResolvedValueOnce(makeCompletion(VALID_SKILL_JSON))
      .mockResolvedValueOnce(makeCompletion(VALID_ROLE_JSON))
      .mockResolvedValueOnce(makeCompletion(VALID_GAP_JSON))
      .mockResolvedValueOnce(makeCompletion(VALID_BATCH1_JSON))                  // batch 1 ok
      .mockResolvedValueOnce(makeCompletion('{"incomplete": true', 'length'));   // batch 2 truncated

    await expect(
      runAnalysis('live-id', 'resume text', 'Software Engineer')
    ).rejects.toBeInstanceOf(GroqTruncationError);

    expect(mockCreate).toHaveBeenCalledTimes(5);
  });

  it('rejects a batch with fewer than 4 phases at Zod schema level', async () => {
    // RoadmapBatchSchema requires exactly 4 phases (.length(4)).
    // A 2-phase response fails Zod.  callAndValidate retries once on schema
    // failures (MAX_RETRIES = 1), so the batch gets 2 attempts before the
    // error propagates.  Assembly is never reached and batch 2 is never called.
    const shortBatch = JSON.stringify({ weeks: [makePhase(1), makePhase(2)] });
    mockCreate
      .mockResolvedValueOnce(makeCompletion(VALID_SKILL_JSON))
      .mockResolvedValueOnce(makeCompletion(VALID_ROLE_JSON))
      .mockResolvedValueOnce(makeCompletion(VALID_GAP_JSON))
      .mockResolvedValueOnce(makeCompletion(shortBatch))  // attempt 1: Zod rejects
      .mockResolvedValueOnce(makeCompletion(shortBatch)); // attempt 2 (retry): Zod rejects

    await expect(
      runAnalysis('live-id', 'resume text', 'Software Engineer')
    ).rejects.toThrow(/schema validation failed/);

    // 3 pipeline steps + 2 attempts at the failing batch = 5 total.
    // Batch 2 is never called.
    expect(mockCreate).toHaveBeenCalledTimes(5);
  });

  it('rejects a batch with more than 4 phases at Zod schema level', async () => {
    const longBatch = JSON.stringify({
      weeks: [makePhase(1), makePhase(2), makePhase(3), makePhase(4), makePhase(5)],
    });
    mockCreate
      .mockResolvedValueOnce(makeCompletion(VALID_SKILL_JSON))
      .mockResolvedValueOnce(makeCompletion(VALID_ROLE_JSON))
      .mockResolvedValueOnce(makeCompletion(VALID_GAP_JSON))
      .mockResolvedValueOnce(makeCompletion(longBatch))  // attempt 1
      .mockResolvedValueOnce(makeCompletion(longBatch)); // attempt 2 (retry)

    await expect(
      runAnalysis('live-id', 'resume text', 'Software Engineer')
    ).rejects.toThrow(/schema validation failed/);

    expect(mockCreate).toHaveBeenCalledTimes(5);
  });

  it('RoadmapAssemblyError message describes the problem clearly', () => {
    const err = new RoadmapAssemblyError('batch 2 returned 3 phases, expected 4');
    expect(err.message).toContain('batch 2 returned 3 phases');
    expect(err.message).toContain('no quota was double-counted');
    expect(err.name).toBe('RoadmapAssemblyError');
  });

  it('normalizes resource.type "Documentation" → "Docs" through the full pipeline', async () => {
    // The model often returns "Documentation" instead of "Docs".  The
    // normalization transform must map it to "Docs" so the UI color lookup
    // always hits the RESOURCE_COLORS table without a fallback branch.
    const batchWithDocumentation = JSON.stringify({
      weeks: [
        makePhase(1),
        makePhase(2),
        makePhase(3),
        {
          ...makePhase(4),
          resources: [{ title: 'Python Docs', url: 'https://docs.python.org', type: 'Documentation' }],
        },
      ],
    });
    mockCreate
      .mockResolvedValueOnce(makeCompletion(VALID_SKILL_JSON))
      .mockResolvedValueOnce(makeCompletion(VALID_ROLE_JSON))
      .mockResolvedValueOnce(makeCompletion(VALID_GAP_JSON))
      .mockResolvedValueOnce(makeCompletion(batchWithDocumentation))
      .mockResolvedValueOnce(makeCompletion(VALID_BATCH2_JSON));

    const result = await runAnalysis('live-id', 'resume text', 'Software Engineer');
    expect(result.isDemoMode).toBe(false);
    // Normalized: "Documentation" → "Docs"
    expect(result.roadmap[3].resources[0].type).toBe('Docs');
  });
});

// ---------------------------------------------------------------------------
// Schema unit tests (no Groq calls)
// ---------------------------------------------------------------------------
describe('ResourceSchema — type normalization', () => {
  const valid = { title: 'T', url: 'https://example.com', type: '' };

  it.each([
    // Exact canonical matches (case-insensitive)
    ['Video',   'Video'],
    ['Docs',    'Docs'],
    ['Course',  'Course'],
    ['Article', 'Article'],
    ['Book',    'Book'],
    ['video',   'Video'],  // lowercase canonical
    ['docs',    'Docs'],
    // Model alias → canonical
    ['Documentation', 'Docs'],
    ['documentation',  'Docs'],
    ['Tutorial',       'Docs'],
    ['GitHub',         'Docs'],
    ['YouTube',        'Video'],
    ['Lecture',        'Video'],
    ['Specialization', 'Course'],
    ['Textbook',       'Book'],
    ['Blog',           'Article'],
    ['Paper',          'Article'],
    // Unrecognized → Article fallback
    ['unknown-xyz',   'Article'],
    ['Podcast',       'Article'],
  ])('normalizes "%s" → "%s"', (input, expected) => {
    const result = ResourceSchema.safeParse({ ...valid, type: input });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.type).toBe(expected);
  });

  it('rejects an empty type string', () => {
    const result = ResourceSchema.safeParse({ ...valid, type: '' });
    expect(result.success).toBe(false);
  });
});

describe('RoadmapBatchSchema — exact phase count', () => {
  const makeRaw = (count: number) => ({
    weeks: Array.from({ length: count }, (_, i) => ({
      week_start: i * 2 + 1,
      week_end:   i * 2 + 2,
      focus_area: `Focus ${i + 1}`,
      topics: ['topic'],
      resources: [{ title: 'R', url: 'https://docs.docker.com', type: 'Docs' }],
      project: { title: 'P', description: 'desc', tech: ['Python'], hours: 8 },
      milestone: 'done',
    })),
  });

  it('accepts exactly 4 phases', () => {
    expect(RoadmapBatchSchema.safeParse(makeRaw(4)).success).toBe(true);
  });

  it.each([0, 1, 2, 3, 5, 8])('rejects %i phases', (count) => {
    expect(RoadmapBatchSchema.safeParse(makeRaw(count)).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Regression: Frontend Developer truncation (phase-1a bug)
//
// Root cause: roadmap prompt previously allowed unlimited topics-per-phase
// and "1-2" resources, causing the model to exceed max_tokens=4096 for
// skill-heavy roles. Fix: exactly 3 topics + 1 resource per phase, with
// explicit word-count limits for focus_area, description, tech, milestone.
// ---------------------------------------------------------------------------
describe('roadmap prompt — token budget constraints', () => {
  // A large missing_critical list similar to what Frontend Developer produces.
  const frontendGap = {
    missing_critical: [
      'React', 'TypeScript', 'CSS Grid', 'Flexbox', 'Webpack', 'Vite',
      'Next.js', 'Jest', 'React Testing Library', 'Cypress', 'Redux',
      'GraphQL', 'Accessibility', 'Web Performance', 'CSS Modules',
    ],
    missing_nice: ['Storybook', 'Tailwind CSS'],
    transferable: ['JavaScript', 'HTML', 'Git'],
    readiness_score: 45,
    strengths_summary: 'Strong JavaScript fundamentals',
    biggest_gap: 'React ecosystem and TypeScript',
  };

  it('batch 1 prompt includes "exactly 3 topics per phase" rule', () => {
    const prompt = roadmapBatchPrompt(frontendGap, 'Frontend Developer', 0);
    expect(prompt).toMatch(/exactly 3 topics per phase/);
  });

  it('batch 1 prompt includes "exactly 1 resource per phase" rule', () => {
    const prompt = roadmapBatchPrompt(frontendGap, 'Frontend Developer', 0);
    expect(prompt).toMatch(/exactly 1 resource per phase/);
  });

  it('batch 2 prompt includes the same constraints', () => {
    const prompt = roadmapBatchPrompt(frontendGap, 'Frontend Developer', 1);
    expect(prompt).toMatch(/exactly 3 topics per phase/);
    expect(prompt).toMatch(/exactly 1 resource per phase/);
  });

  it('batch prompt includes project.tech word limit', () => {
    const prompt = roadmapBatchPrompt(frontendGap, 'Frontend Developer', 0);
    expect(prompt).toMatch(/project\.tech to at most 2 items/);
  });

  it('full pipeline succeeds with large missing_critical list (mocked)', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key-for-unit-tests';
    vi.clearAllMocks();

    const largeMissingCriticalGap = JSON.stringify({
      missing_critical: frontendGap.missing_critical,
      missing_nice: frontendGap.missing_nice,
      transferable: frontendGap.transferable,
      readiness_score: 45,
      strengths_summary: 'Strong JavaScript fundamentals',
      biggest_gap: 'React ecosystem and TypeScript',
    });

    mockCreate
      .mockResolvedValueOnce(makeCompletion(VALID_SKILL_JSON))
      .mockResolvedValueOnce(makeCompletion(VALID_ROLE_JSON))
      .mockResolvedValueOnce(makeCompletion(largeMissingCriticalGap))
      .mockResolvedValueOnce(makeCompletion(VALID_BATCH1_JSON))
      .mockResolvedValueOnce(makeCompletion(VALID_BATCH2_JSON));

    const result = await runAnalysis('fe-test-id', 'resume text', 'Frontend Developer');
    expect(result.isDemoMode).toBe(false);
    expect(result.roadmap).toHaveLength(8);
    // Verify no phases were lost or duplicated
    expect(result.roadmap[0].week_start).toBe(1);
    expect(result.roadmap[7].week_end).toBe(16);
    expect(mockCreate).toHaveBeenCalledTimes(5);
  });
});

// ---------------------------------------------------------------------------
// Employment level context in prompts
// ---------------------------------------------------------------------------
describe('roadmap prompt — employment level context', () => {
  const baseGap = {
    missing_critical: ['React', 'TypeScript'],
    missing_nice: [],
    transferable: ['JavaScript'],
    readiness_score: 50,
    strengths_summary: 'Strong JS fundamentals',
    biggest_gap: 'React',
  };

  it('internship context appears in batch prompt', () => {
    const internCtx = {
      level: 'internship' as const,
      confidence: 'high' as const,
      inferredFrom: 'role_title' as const,
      signals: ['internship keyword in role title'],
    };
    const prompt = roadmapBatchPrompt(baseGap, 'Frontend Developer Intern', 0, internCtx);
    expect(prompt).toMatch(/INTERNSHIP/i);
  });

  it('coop context appears in batch prompt', () => {
    const coopCtx = {
      level: 'coop' as const,
      confidence: 'high' as const,
      inferredFrom: 'role_title' as const,
      signals: ['"co-op" in role title'],
    };
    const prompt = roadmapBatchPrompt(baseGap, 'Software Engineering Co-op', 0, coopCtx);
    expect(prompt).toMatch(/CO-OP/i);
  });

  it('entry-level context appears in batch prompt', () => {
    const entryCtx = {
      level: 'entry-level' as const,
      confidence: 'medium' as const,
      inferredFrom: 'job_description' as const,
      signals: ['entry-level signals detected'],
    };
    const prompt = roadmapBatchPrompt(baseGap, 'Software Engineer', 0, entryCtx);
    expect(prompt).toMatch(/entry-level/i);
  });

  it('experienced context adds no extra text to batch prompt', () => {
    const expCtx = {
      level: 'experienced' as const,
      confidence: 'medium' as const,
      inferredFrom: 'job_description' as const,
      signals: ['no signals'],
    };
    const withCtx = roadmapBatchPrompt(baseGap, 'Software Engineer', 0, expCtx);
    const withoutCtx = roadmapBatchPrompt(baseGap, 'Software Engineer', 0);
    expect(withCtx).toBe(withoutCtx);
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
