/**
 * Schema validation across all supported sample roles.
 * Verifies every role produces a structurally complete, internally consistent result.
 */
import { describe, it, expect } from 'vitest';
import { buildDemoAnalysis } from './demo-samples';

// All roles that should return a non-null sample.
// 6 curated fixtures + 12 metadata-driven = 18 total.
const SUPPORTED_ROLES: Array<{ query: string; expectedTitle: string }> = [
  // Curated fixtures (exact title)
  { query: 'DevOps Engineer',              expectedTitle: 'DevOps Engineer' },
  { query: 'Data Scientist',               expectedTitle: 'Data Scientist' },
  { query: 'Software Engineer',            expectedTitle: 'Software Engineer' },
  { query: 'Product Manager',              expectedTitle: 'Product Manager' },
  { query: 'Investment Banking Analyst',   expectedTitle: 'Investment Banking Analyst' },
  { query: 'Machine Learning Engineer',    expectedTitle: 'Machine Learning Engineer' },
  // Metadata-driven
  { query: 'Frontend Developer',           expectedTitle: 'Frontend Developer' },
  { query: 'Backend Developer',            expectedTitle: 'Backend Developer' },
  { query: 'Full Stack Developer',         expectedTitle: 'Full Stack Developer' },
  { query: 'Data Engineer',               expectedTitle: 'Data Engineer' },
  { query: 'Data Analyst',               expectedTitle: 'Data Analyst' },
  { query: 'UX Designer',               expectedTitle: 'UX Designer' },
  { query: 'Cloud Architect',           expectedTitle: 'Cloud Architect' },
  { query: 'Site Reliability Engineer', expectedTitle: 'Site Reliability Engineer' },
  { query: 'Security Engineer',         expectedTitle: 'Security Engineer' },
  { query: 'Cybersecurity Analyst',    expectedTitle: 'Cybersecurity Analyst' },
  { query: 'Financial Analyst',         expectedTitle: 'Financial Analyst' },
  { query: 'Technical Program Manager', expectedTitle: 'Program Manager' },
  { query: 'Growth Engineer',           expectedTitle: 'Growth Hacker' },
];

describe('buildDemoAnalysis: schema validation for all 19 supported roles', () => {
  for (const { query, expectedTitle } of SUPPORTED_ROLES) {
    describe(`role: "${query}"`, () => {
      const result = buildDemoAnalysis('schema-test', query);

      it('returns a non-null result', () => {
        expect(result).not.toBeNull();
      });

      it('target role matches expected title', () => {
        expect(result!.targetRole).toBe(expectedTitle);
      });

      it('isDemoMode is true', () => {
        expect(result!.isDemoMode).toBe(true);
      });

      it('skillExtraction has required fields', () => {
        const se = result!.skillExtraction;
        expect(Array.isArray(se.current_skills)).toBe(true);
        expect(se.current_skills.length).toBeGreaterThan(0);
        expect(typeof se.experience_years).toBe('number');
        expect(typeof se.education).toBe('string');
        expect(Array.isArray(se.top_titles)).toBe(true);
        expect(Array.isArray(se.strengths)).toBe(true);
      });

      it('roleRequirements has required fields', () => {
        const rr = result!.roleRequirements;
        expect(Array.isArray(rr.required_skills)).toBe(true);
        expect(rr.required_skills.length).toBeGreaterThan(0);
        expect(Array.isArray(rr.nice_to_have)).toBe(true);
        expect(typeof rr.typical_timeline_months).toBe('number');
        expect(typeof rr.avg_salary).toBe('string');
        expect(typeof rr.categories).toBe('object');
        expect(Array.isArray(rr.categories.technical)).toBe(true);
        expect(Array.isArray(rr.categories.soft)).toBe(true);
        expect(Array.isArray(rr.categories.tools)).toBe(true);
        expect(Array.isArray(rr.categories.certifications)).toBe(true);
      });

      it('gapAnalysis has required fields with valid values', () => {
        const ga = result!.gapAnalysis;
        expect(Array.isArray(ga.missing_critical)).toBe(true);
        expect(Array.isArray(ga.missing_nice)).toBe(true);
        expect(Array.isArray(ga.transferable)).toBe(true);
        expect(ga.readiness_score).toBeGreaterThanOrEqual(0);
        expect(ga.readiness_score).toBeLessThanOrEqual(100);
        expect(typeof ga.strengths_summary).toBe('string');
        expect(ga.strengths_summary.length).toBeGreaterThan(10);
        expect(typeof ga.biggest_gap).toBe('string');
        expect(ga.biggest_gap.length).toBeGreaterThan(10);
      });

      it('roadmap is non-empty with valid week structure', () => {
        const roadmap = result!.roadmap;
        expect(roadmap.length).toBeGreaterThanOrEqual(4);
        for (const week of roadmap) {
          expect(typeof week.week_start).toBe('number');
          expect(typeof week.week_end).toBe('number');
          expect(week.week_end).toBeGreaterThanOrEqual(week.week_start);
          expect(typeof week.focus_area).toBe('string');
          expect(week.focus_area.length).toBeGreaterThan(0);
          expect(Array.isArray(week.topics)).toBe(true);
          expect(week.topics.length).toBeGreaterThan(0);
          expect(Array.isArray(week.resources)).toBe(true);
          expect(week.resources.length).toBeGreaterThan(0);
          expect(typeof week.project).toBe('object');
          expect(typeof week.project.title).toBe('string');
          expect(typeof week.project.description).toBe('string');
          expect(Array.isArray(week.project.tech)).toBe(true);
          expect(typeof week.milestone).toBe('string');
        }
      });

      it('no Groq calls (synchronous result, not a Promise)', () => {
        const r = buildDemoAnalysis('schema-test-2', query);
        expect(r).not.toBeInstanceOf(Promise);
      });
    });
  }
});

describe('unsupported roles return null', () => {
  const unsupported = [
    'Competitive Hotdog Judge',
    'Artisanal Cheese Monger',
    'Dragon Tamer',
    'Professional Napper',
  ];

  for (const role of unsupported) {
    it(`"${role}" returns null`, () => {
      expect(buildDemoAnalysis('x', role)).toBeNull();
    });
  }
});

describe('supported role count', () => {
  it('exactly 19 roles produce valid samples', () => {
    const supportedCount = SUPPORTED_ROLES.filter(
      ({ query }) => buildDemoAnalysis('count-test', query) !== null
    ).length;
    expect(supportedCount).toBe(19);
  });
});
