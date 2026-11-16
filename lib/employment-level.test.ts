import { describe, it, expect } from 'vitest';
import { classifyEmploymentLevel } from './employment-level';

describe('classifyEmploymentLevel', () => {
  // ── Title-only classification (no JD) ──────────────────────────────────────

  it('classifies "Software Engineering Intern" as internship from title', () => {
    const ctx = classifyEmploymentLevel('Software Engineering Intern');
    expect(ctx.level).toBe('internship');
    expect(ctx.confidence).toBe('high');
    expect(ctx.inferredFrom).toBe('role_title');
  });

  it('classifies "Data Science Co-op" as coop from title', () => {
    const ctx = classifyEmploymentLevel('Data Science Co-op');
    expect(ctx.level).toBe('coop');
    expect(ctx.confidence).toBe('high');
  });

  it('classifies "Software Engineer" with no JD as experienced', () => {
    const ctx = classifyEmploymentLevel('Software Engineer');
    expect(ctx.level).toBe('experienced');
  });

  it('classifies "Investment Banking Summer Analyst" as internship from title', () => {
    const ctx = classifyEmploymentLevel('Investment Banking Summer Analyst');
    expect(ctx.level).toBe('internship');
    expect(ctx.confidence).toBe('high');
  });

  it('classifies "Product Manager" with no JD as experienced', () => {
    const ctx = classifyEmploymentLevel('Product Manager');
    expect(ctx.level).toBe('experienced');
  });

  // ── JD-based classification ─────────────────────────────────────────────────

  it('classifies as internship when JD title area contains "intern"', () => {
    const jd = 'Software Engineering Intern\nJoin our summer program as an intern on the platform team.';
    const ctx = classifyEmploymentLevel('Software Engineer', jd);
    expect(ctx.level).toBe('internship');
    expect(ctx.inferredFrom).toBe('job_description');
  });

  it('does NOT classify senior role as internship when JD says "mentor interns"', () => {
    const jd = `Senior Software Engineer
We are looking for a Senior Software Engineer with 5+ years of experience.
You will lead projects and mentor interns and junior developers on the team.`;
    const ctx = classifyEmploymentLevel('Senior Software Engineer', jd);
    expect(ctx.level).toBe('experienced');
  });

  it('does NOT classify as internship when JD has seniority signals even with intern mention', () => {
    const jd = `Lead Engineer, 7+ years of experience required.
You will supervise interns during their rotations.`;
    const ctx = classifyEmploymentLevel('Lead Engineer', jd);
    expect(ctx.level).toBe('experienced');
  });

  it('classifies as entry-level when JD says "new graduate / entry-level"', () => {
    const jd = `Software Developer
We are hiring new graduate / entry-level developers to join our team.
Recent graduates with a CS degree and project experience are encouraged to apply.`;
    const ctx = classifyEmploymentLevel('Software Developer', jd);
    expect(ctx.level).toBe('entry-level');
  });

  it('classifies as entry-level when JD says "0-2 years experience"', () => {
    const jd = `Data Analyst
Requires: 0-2 years of experience with SQL and Python.
Degree in a quantitative field preferred.`;
    const ctx = classifyEmploymentLevel('Data Analyst', jd);
    expect(ctx.level).toBe('entry-level');
  });

  it('classifies as coop when JD header says "co-op" and no seniority', () => {
    const jd = `Co-op Software Developer, Spring 2025\nJoin our engineering team for a 4-month co-operative education placement.`;
    const ctx = classifyEmploymentLevel('Software Developer', jd);
    expect(ctx.level).toBe('coop');
    expect(ctx.confidence).toBe('high');
  });

  it('classifies internship as high-confidence when student signals present', () => {
    const jd = `Internship, Data Engineering\nWe are looking for currently enrolled undergraduate students pursuing a B.S. in CS.\nThis is a 12-week summer internship on our data platform team.`;
    const ctx = classifyEmploymentLevel('Data Engineer', jd);
    expect(ctx.level).toBe('internship');
    expect(ctx.confidence).toBe('high');
  });

  it('short JD falls back to title classification', () => {
    // JD less than 20 chars → falls back to title
    const ctx = classifyEmploymentLevel('Software Engineer', 'short');
    expect(ctx.level).toBe('experienced');
    expect(ctx.inferredFrom).toBe('default');
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  it('classifies "Internship" (bare word) in role title correctly', () => {
    const ctx = classifyEmploymentLevel('Marketing Internship');
    expect(ctx.level).toBe('internship');
  });

  it('coop keyword in role title takes precedence over JD body', () => {
    const ctx = classifyEmploymentLevel('Engineering Co-op', 'This role requires 3+ years of experience.');
    // Title match wins before seniority check
    expect(ctx.level).toBe('coop');
  });
});
