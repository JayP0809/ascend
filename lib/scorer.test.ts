import { describe, it, expect } from 'vitest';
import {
  getReadinessColor,
  getReadinessLabel,
  buildProgressionData,
  buildDistributionData,
  buildMarketDemandData,
  categorizeSkill,
} from './scorer';
import type { AnalysisResult, SkillGapItem } from './types';

// ---------------------------------------------------------------------------
// getReadinessColor
// ---------------------------------------------------------------------------
describe('getReadinessColor', () => {
  it('always returns the accent CSS variable', () => {
    expect(getReadinessColor(0)).toBe('var(--accent)');
    expect(getReadinessColor(50)).toBe('var(--accent)');
    expect(getReadinessColor(100)).toBe('var(--accent)');
  });
});

// ---------------------------------------------------------------------------
// getReadinessLabel
// ---------------------------------------------------------------------------
describe('getReadinessLabel', () => {
  it('returns "Significant gaps" below 50', () => {
    expect(getReadinessLabel(0)).toBe('Significant gaps');
    expect(getReadinessLabel(49)).toBe('Significant gaps');
  });

  it('returns "Work to do" from 50 to 64', () => {
    expect(getReadinessLabel(50)).toBe('Work to do');
    expect(getReadinessLabel(64)).toBe('Work to do');
  });

  it('returns "Good foundation" from 65 to 79', () => {
    expect(getReadinessLabel(65)).toBe('Good foundation');
    expect(getReadinessLabel(79)).toBe('Good foundation');
  });

  it('returns "Strong candidate" at 80 and above', () => {
    expect(getReadinessLabel(80)).toBe('Strong candidate');
    expect(getReadinessLabel(100)).toBe('Strong candidate');
  });
});

// ---------------------------------------------------------------------------
// categorizeSkill
// ---------------------------------------------------------------------------
describe('categorizeSkill', () => {
  const categories = {
    technical: ['Python', 'SQL', 'Docker'],
    soft: ['Communication', 'Leadership'],
    tools: ['Prometheus', 'Grafana'],
    certifications: ['AWS Certified', 'CKA'],
  };

  it('classifies a technical skill correctly', () => {
    expect(categorizeSkill('Python', categories)).toBe('technical');
    expect(categorizeSkill('SQL', categories)).toBe('technical');
  });

  it('classifies a soft skill correctly', () => {
    expect(categorizeSkill('Communication', categories)).toBe('soft');
  });

  it('classifies a tool correctly', () => {
    expect(categorizeSkill('Prometheus', categories)).toBe('tools');
  });

  it('classifies a certification correctly', () => {
    expect(categorizeSkill('CKA', categories)).toBe('certifications');
  });

  it('defaults to technical for unknown skills', () => {
    expect(categorizeSkill('BlockchainWizardry', categories)).toBe('technical');
  });

  it('is case-insensitive', () => {
    expect(categorizeSkill('python', categories)).toBe('technical');
    expect(categorizeSkill('COMMUNICATION', categories)).toBe('soft');
  });
});

// ---------------------------------------------------------------------------
// buildProgressionData
// ---------------------------------------------------------------------------
describe('buildProgressionData', () => {
  it('starts at the given score', () => {
    const data = buildProgressionData(60, 8);
    expect(data[0]).toEqual({ week: 0, readiness: 60 });
  });

  it('returns totalWeeks + 1 data points', () => {
    expect(buildProgressionData(50, 16)).toHaveLength(17);
    expect(buildProgressionData(50, 8)).toHaveLength(9);
  });

  it('is deterministic: same inputs produce identical output', () => {
    const a = buildProgressionData(67, 16);
    const b = buildProgressionData(67, 16);
    expect(a).toEqual(b);
  });

  it('never exceeds 100', () => {
    const data = buildProgressionData(95, 16);
    for (const point of data) {
      expect(point.readiness).toBeLessThanOrEqual(100);
    }
  });

  it('never drops below the start score', () => {
    const start = 55;
    const data = buildProgressionData(start, 16);
    for (const point of data) {
      expect(point.readiness).toBeGreaterThanOrEqual(start);
    }
  });

  it('generally trends upward', () => {
    const data = buildProgressionData(50, 16);
    expect(data[data.length - 1].readiness).toBeGreaterThan(data[0].readiness);
  });
});

// ---------------------------------------------------------------------------
// buildDistributionData
// ---------------------------------------------------------------------------
describe('buildDistributionData', () => {
  it('returns empty array for empty input', () => {
    expect(buildDistributionData([])).toEqual([]);
  });

  it('filters out zero-value categories', () => {
    const items: SkillGapItem[] = [
      { name: 'Python', category: 'technical', importance: 'critical', demandTrend: 'up' },
      { name: 'SQL', category: 'technical', importance: 'critical', demandTrend: 'up' },
    ];
    const result = buildDistributionData(items);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Technical');
    expect(result[0].value).toBe(100);
  });

  it('computes correct percentages across categories', () => {
    const items: SkillGapItem[] = [
      { name: 'Python', category: 'technical', importance: 'critical', demandTrend: 'up' },
      { name: 'Communication', category: 'soft', importance: 'nice-to-have', demandTrend: 'flat' },
      { name: 'Docker', category: 'tools', importance: 'critical', demandTrend: 'up' },
      { name: 'AWS Certified', category: 'certifications', importance: 'nice-to-have', demandTrend: 'flat' },
    ];
    const result = buildDistributionData(items);
    expect(result).toHaveLength(4);
    const total = result.reduce((sum, d) => sum + d.value, 0);
    // Each is 25%, total should be ~100 (rounding may cause 99-101)
    expect(total).toBeGreaterThanOrEqual(99);
    expect(total).toBeLessThanOrEqual(101);
  });

  it('assigns warm palette colors', () => {
    const items: SkillGapItem[] = [
      { name: 'Python', category: 'technical', importance: 'critical', demandTrend: 'up' },
    ];
    const result = buildDistributionData(items);
    expect(result[0].color).toMatch(/^#/);
  });
});

// ---------------------------------------------------------------------------
// buildMarketDemandData
// ---------------------------------------------------------------------------

const makeAnalysis = (overrides: Partial<AnalysisResult> = {}): AnalysisResult => ({
  analysisId: 'test-id',
  targetRole: 'DevOps Engineer',
  isDemoMode: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  skillExtraction: {
    current_skills: ['Python', 'Git'],
    experience_years: 3,
    strengths: ['Problem solving'],
    education: "Bachelor's",
    top_titles: ['Software Engineer'],
  },
  roleRequirements: {
    required_skills: ['Docker', 'Kubernetes', 'Terraform', 'Python', 'AWS'],
    nice_to_have: ['Helm', 'ArgoCD'],
    categories: { technical: [], soft: [], tools: [], certifications: [] },
    typical_timeline_months: 6,
    avg_salary: '$130,000',
  },
  gapAnalysis: {
    missing_critical: ['Docker', 'Kubernetes'],
    missing_nice: ['Helm'],
    transferable: ['Python'],
    readiness_score: 67,
    strengths_summary: 'Good base',
    biggest_gap: 'Containers',
  },
  roadmap: [],
  ...overrides,
});

describe('buildMarketDemandData', () => {
  it('is deterministic: same analysis produces identical output', () => {
    const analysis = makeAnalysis();
    const a = buildMarketDemandData(analysis);
    const b = buildMarketDemandData(analysis);
    expect(a).toEqual(b);
  });

  it('returns at most 8 items', () => {
    const result = buildMarketDemandData(makeAnalysis());
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it('demand values are between 45 and 95', () => {
    const result = buildMarketDemandData(makeAnalysis());
    for (const item of result) {
      expect(item.demand).toBeGreaterThanOrEqual(45);
      expect(item.demand).toBeLessThanOrEqual(95);
    }
  });

  it('marks current skills as hasSkill=true', () => {
    const result = buildMarketDemandData(makeAnalysis());
    const pythonItem = result.find((r) => r.skill === 'Python');
    expect(pythonItem?.hasSkill).toBe(true);
  });

  it('marks missing skills as hasSkill=false', () => {
    const result = buildMarketDemandData(makeAnalysis());
    const dockerItem = result.find((r) => r.skill === 'Docker');
    expect(dockerItem?.hasSkill).toBe(false);
  });

  it('truncates skill names longer than 20 chars', () => {
    const longSkillAnalysis = makeAnalysis({
      roleRequirements: {
        required_skills: ['VeryLongSkillNameThatExceedsTwentyCharacters'],
        nice_to_have: [],
        categories: { technical: [], soft: [], tools: [], certifications: [] },
        typical_timeline_months: 6,
        avg_salary: '$100,000',
      },
    });
    const result = buildMarketDemandData(longSkillAnalysis);
    expect(result[0].skill.length).toBeLessThanOrEqual(20);
  });

  it('handles empty skill lists without throwing', () => {
    const emptyAnalysis = makeAnalysis({
      roleRequirements: {
        required_skills: [],
        nice_to_have: [],
        categories: { technical: [], soft: [], tools: [], certifications: [] },
        typical_timeline_months: 6,
        avg_salary: '$100,000',
      },
    });
    expect(() => buildMarketDemandData(emptyAnalysis)).not.toThrow();
    expect(buildMarketDemandData(emptyAnalysis)).toEqual([]);
  });
});
