import { describe, it, expect } from 'vitest';
import { buildDemoAnalysis } from './demo-samples';

const FICTIONAL_SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'SQL',
  'Git', 'REST APIs', 'HTML/CSS', 'PostgreSQL', 'Jest', 'Agile',
  'Problem Solving', 'Communication', 'Team Collaboration',
];

describe('buildDemoAnalysis', () => {
  // -------------------------------------------------------------------------
  // Fictional candidate consistency
  // -------------------------------------------------------------------------
  it('all supported roles use the same fictional candidate', () => {
    const devops = buildDemoAnalysis('d1', 'DevOps Engineer');
    const ds = buildDemoAnalysis('d2', 'Data Scientist');
    const swe = buildDemoAnalysis('d3', 'Software Engineer');
    expect(devops!.skillExtraction.current_skills).toEqual(FICTIONAL_SKILLS);
    expect(ds!.skillExtraction.current_skills).toEqual(FICTIONAL_SKILLS);
    expect(swe!.skillExtraction.current_skills).toEqual(FICTIONAL_SKILLS);
    expect(devops!.skillExtraction.experience_years).toBe(3);
    expect(ds!.skillExtraction.experience_years).toBe(3);
  });

  // -------------------------------------------------------------------------
  // Different roles produce different analysis content
  // -------------------------------------------------------------------------
  it('DevOps Engineer returns DevOps-specific requirements', () => {
    const result = buildDemoAnalysis('d1', 'DevOps Engineer')!;
    expect(result.targetRole).toBe('DevOps Engineer');
    expect(result.roleRequirements.required_skills).toContain('Docker');
    expect(result.roleRequirements.required_skills).toContain('Kubernetes');
    expect(result.gapAnalysis.missing_critical).toContain('Docker');
  });

  it('Data Scientist returns DS-specific requirements, not DevOps', () => {
    const result = buildDemoAnalysis('d2', 'Data Scientist')!;
    expect(result.targetRole).toBe('Data Scientist');
    expect(result.roleRequirements.required_skills).toContain('Machine Learning');
    expect(result.roleRequirements.required_skills).toContain('scikit-learn');
    expect(result.roleRequirements.required_skills).not.toContain('Docker');
    expect(result.gapAnalysis.missing_critical).not.toContain('Docker');
    expect(result.roadmap[0].focus_area).not.toContain('Linux');
  });

  it('Software Engineer returns SWE-specific requirements', () => {
    const result = buildDemoAnalysis('d3', 'Software Engineer')!;
    expect(result.targetRole).toBe('Software Engineer');
    expect(result.roleRequirements.required_skills).toContain('Algorithms & Data Structures');
    expect(result.gapAnalysis.readiness_score).toBeGreaterThan(70);
  });

  it('Product Manager returns PM-specific requirements', () => {
    const result = buildDemoAnalysis('d4', 'Product Manager')!;
    expect(result.targetRole).toBe('Product Manager');
    expect(result.roleRequirements.required_skills).toContain('Product Strategy');
    expect(result.roleRequirements.required_skills).toContain('Roadmapping');
    expect(result.roleRequirements.required_skills).not.toContain('Docker');
  });

  it('Investment Banking Analyst returns finance-specific requirements', () => {
    const result = buildDemoAnalysis('d5', 'Investment Banking Analyst')!;
    expect(result.targetRole).toBe('Investment Banking Analyst');
    expect(result.roleRequirements.required_skills).toContain('DCF Valuation');
    expect(result.roleRequirements.required_skills).toContain('LBO Modeling');
    expect(result.gapAnalysis.readiness_score).toBeLessThan(60);
  });

  it('ML Engineer returns MLE-specific requirements', () => {
    const result = buildDemoAnalysis('d6', 'Machine Learning Engineer')!;
    expect(result.targetRole).toBe('Machine Learning Engineer');
    expect(result.roleRequirements.required_skills).toContain('PyTorch/TensorFlow');
    expect(result.roleRequirements.required_skills).toContain('MLOps');
  });

  // -------------------------------------------------------------------------
  // Different roles produce mutually distinct content
  // -------------------------------------------------------------------------
  it('DevOps and Data Scientist roadmaps are entirely different', () => {
    const devops = buildDemoAnalysis('d1', 'DevOps Engineer')!;
    const ds = buildDemoAnalysis('d2', 'Data Scientist')!;
    const devopsTopics = devops.roadmap.flatMap((w) => w.topics).join('|');
    const dsTopics = ds.roadmap.flatMap((w) => w.topics).join('|');
    expect(devopsTopics).not.toBe(dsTopics);
    // DevOps roadmap includes Kubernetes; DS roadmap does not
    expect(devopsTopics).toContain('Kubernetes');
    expect(dsTopics).not.toContain('Kubernetes');
  });

  it('PM and IBA produce different certifications', () => {
    const pm = buildDemoAnalysis('d4', 'Product Manager')!;
    const iba = buildDemoAnalysis('d5', 'Investment Banking Analyst')!;
    expect(pm.roleRequirements.categories.certifications).not.toEqual(
      iba.roleRequirements.categories.certifications
    );
  });

  // -------------------------------------------------------------------------
  // Alias matching
  // -------------------------------------------------------------------------
  it('MLE title "machine learning engineer" matches ML Engineer fixture', () => {
    const result = buildDemoAnalysis('d6', 'machine learning engineer')!;
    expect(result).not.toBeNull();
    expect(result.roleRequirements.required_skills).toContain('PyTorch/TensorFlow');
  });

  it('"SWE" alias resolves to Software Engineer fixture', () => {
    const result = buildDemoAnalysis('d3', 'SWE')!;
    expect(result).not.toBeNull();
    expect(result.roleRequirements.required_skills).toContain('Algorithms & Data Structures');
  });

  it('"PM" alias resolves to Product Manager fixture', () => {
    const result = buildDemoAnalysis('d4', 'PM')!;
    expect(result).not.toBeNull();
    expect(result.roleRequirements.required_skills).toContain('Roadmapping');
  });

  // -------------------------------------------------------------------------
  // Metadata-driven roles (not curated fixtures)
  // -------------------------------------------------------------------------
  it('Frontend Developer generates a sample with frontend-specific requirements', () => {
    const result = buildDemoAnalysis('d7', 'Frontend Developer')!;
    expect(result).not.toBeNull();
    expect(result.roleRequirements.required_skills).toContain('CSS-in-JS');
    expect(result.roleRequirements.required_skills).not.toContain('DCF Valuation');
  });

  it('Data Analyst generates a sample with analytics requirements', () => {
    const result = buildDemoAnalysis('d8', 'Data Analyst')!;
    expect(result).not.toBeNull();
    expect(result.roleRequirements.required_skills).toContain('Tableau/Power BI');
    expect(result.roadmap.length).toBeGreaterThan(0);
  });

  it('Financial Analyst generates a finance-specific sample', () => {
    const result = buildDemoAnalysis('d9', 'Financial Analyst')!;
    expect(result).not.toBeNull();
    expect(result.roleRequirements.required_skills).toContain('DCF Valuation');
    expect(result.roleRequirements.required_skills).not.toContain('Kubernetes');
  });

  // -------------------------------------------------------------------------
  // Cybersecurity Analyst: partial query and alias matching
  // -------------------------------------------------------------------------
  it('"cyber" partial match resolves to Cybersecurity Analyst', () => {
    const result = buildDemoAnalysis('d10', 'cyber');
    expect(result).not.toBeNull();
    expect(result!.targetRole).toBe('Cybersecurity Analyst');
  });

  it('"Cybersecurity Analyst" exact match returns cybersecurity-specific requirements', () => {
    const result = buildDemoAnalysis('d10', 'Cybersecurity Analyst')!;
    expect(result).not.toBeNull();
    expect(result.targetRole).toBe('Cybersecurity Analyst');
    expect(result.roleRequirements.required_skills).toContain('SIEM Tools');
    expect(result.roleRequirements.required_skills).toContain('Incident Response');
    expect(result.roleRequirements.required_skills).not.toContain('Docker');
    expect(result.roleRequirements.required_skills).not.toContain('DCF Valuation');
  });

  it('"Security Analyst" alias resolves to Cybersecurity Analyst', () => {
    const result = buildDemoAnalysis('d10', 'Security Analyst');
    expect(result).not.toBeNull();
    expect(result!.targetRole).toBe('Cybersecurity Analyst');
  });

  it('Cybersecurity Analyst readiness score is below 60 (genuine skill gap from web dev background)', () => {
    const result = buildDemoAnalysis('d10', 'Cybersecurity Analyst')!;
    expect(result.gapAnalysis.readiness_score).toBeLessThan(60);
    expect(result.gapAnalysis.readiness_score).toBeGreaterThan(0);
  });

  it('Cybersecurity Analyst has non-empty missing_critical (network/SIEM gaps)', () => {
    const result = buildDemoAnalysis('d10', 'Cybersecurity Analyst')!;
    expect(result.gapAnalysis.missing_critical.length).toBeGreaterThan(0);
    // Network Security and SIEM Tools are not in the fictional candidate's skills
    const gaps = result.gapAnalysis.missing_critical;
    expect(gaps.some(g => g.toLowerCase().includes('network') || g.toLowerCase().includes('siem'))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Unsupported custom roles
  // -------------------------------------------------------------------------
  it('returns null for a role completely outside the catalog', () => {
    const result = buildDemoAnalysis('d99', 'Artisanal Pickle Fermentation Specialist');
    expect(result).toBeNull();
  });

  it('returns null for another truly unrecognized role', () => {
    const result = buildDemoAnalysis('d99', 'Competitive Hotdog Judge');
    expect(result).toBeNull();
  });

  // -------------------------------------------------------------------------
  // No Groq calls, no DB writes: structural guarantees
  // -------------------------------------------------------------------------
  it('returns a result synchronously (no async)', () => {
    const result = buildDemoAnalysis('d1', 'DevOps Engineer');
    // If it were async this would be a Promise, not an object
    expect(result).not.toBeInstanceOf(Promise);
    expect(result).not.toBeNull();
  });

  // -------------------------------------------------------------------------
  // AbortController regression: demo builds must be synchronous.
  //
  // AnalyzingView uses an AbortController with a 90s timeout. In React 18
  // Strict Mode (dev), effect cleanup runs before remount; if cleanup called
  // controller.abort(), the in-flight POST would throw an AbortError, which
  // isMounted.current then silently swallowed, leaving the loading screen
  // stuck forever. The fix: do NOT call controller.abort() in cleanup.
  //
  // This test guards the other side of that invariant: buildDemoAnalysis must
  // remain synchronous. If it ever returned a Promise (e.g. a Groq call was
  // added), the fetch could take long enough for a cleanup abort to fire.
  // -------------------------------------------------------------------------
  it('all supported demo analyses resolve in under 100ms total (synchronous, no I/O)', () => {
    const roles = [
      'Data Scientist', 'Investment Banking Analyst', 'Product Manager',
      'Cybersecurity Analyst', 'DevOps Engineer', 'Software Engineer',
    ];
    const start = Date.now();
    for (const role of roles) {
      const r = buildDemoAnalysis('abort-regression', role);
      expect(r).not.toBeInstanceOf(Promise);
      expect(r).not.toBeNull();
    }
    expect(Date.now() - start).toBeLessThan(100);
  });

  it('isDemoMode is always true', () => {
    const roles = ['DevOps Engineer', 'Data Scientist', 'Software Engineer', 'Product Manager'];
    for (const role of roles) {
      const result = buildDemoAnalysis('d1', role)!;
      expect(result.isDemoMode).toBe(true);
    }
  });

  // -------------------------------------------------------------------------
  // Gap analysis internal consistency
  // -------------------------------------------------------------------------
  it('missing_critical skills are not in the fictional candidate skills', () => {
    const result = buildDemoAnalysis('d2', 'Data Scientist')!;
    const have = new Set(FICTIONAL_SKILLS.map((s) => s.toLowerCase()));
    for (const gap of result.gapAnalysis.missing_critical) {
      expect(have.has(gap.toLowerCase())).toBe(false);
    }
  });

  it('transferable skills are a subset of fictional candidate skills', () => {
    const result = buildDemoAnalysis('d4', 'Product Manager')!;
    const have = new Set(FICTIONAL_SKILLS.map((s) => s.toLowerCase()));
    for (const skill of result.gapAnalysis.transferable) {
      expect(have.has(skill.toLowerCase())).toBe(true);
    }
  });

  it('readiness score is between 0 and 100', () => {
    const roles = ['DevOps Engineer', 'Data Scientist', 'Investment Banking Analyst', 'Software Engineer'];
    for (const role of roles) {
      const result = buildDemoAnalysis('d1', role)!;
      expect(result.gapAnalysis.readiness_score).toBeGreaterThanOrEqual(0);
      expect(result.gapAnalysis.readiness_score).toBeLessThanOrEqual(100);
    }
  });

  // -------------------------------------------------------------------------
  // IBA readiness is significantly lower than SWE (distant field)
  // -------------------------------------------------------------------------
  it('IBA readiness is lower than SWE readiness (reflects genuine skill gap)', () => {
    const iba = buildDemoAnalysis('d5', 'Investment Banking Analyst')!;
    const swe = buildDemoAnalysis('d3', 'Software Engineer')!;
    expect(iba.gapAnalysis.readiness_score).toBeLessThan(swe.gapAnalysis.readiness_score);
  });

  // -------------------------------------------------------------------------
  // Roadmap structural validity
  // -------------------------------------------------------------------------
  it('all curated roadmaps have at least 4 weeks', () => {
    const roles = ['DevOps Engineer', 'Data Scientist', 'Software Engineer', 'Product Manager', 'Investment Banking Analyst', 'Machine Learning Engineer'];
    for (const role of roles) {
      const result = buildDemoAnalysis('d1', role)!;
      expect(result.roadmap.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('roadmap weeks are ordered and non-overlapping', () => {
    const result = buildDemoAnalysis('d2', 'Data Scientist')!;
    for (let i = 1; i < result.roadmap.length; i++) {
      expect(result.roadmap[i].week_start).toBeGreaterThan(result.roadmap[i - 1].week_end);
    }
  });
});
