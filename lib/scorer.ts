import { AnalysisResult, SkillGapItem, DashboardData } from './types';

export function buildDashboardData(analysis: AnalysisResult): DashboardData {
  const { gapAnalysis, roleRequirements, skillExtraction, roadmap } = analysis;

  const seen = new Set<string>();
  const addUnique = (items: SkillGapItem[]): SkillGapItem[] =>
    items.filter((item) => {
      const key = item.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const skillGapItems: SkillGapItem[] = [
    ...addUnique(
      skillExtraction.current_skills
        .filter((s) => roleRequirements.required_skills.map((r) => r.toLowerCase()).includes(s.toLowerCase()))
        .map((s) => ({
          name: s,
          category: categorizeSkill(s, roleRequirements.categories),
          importance: 'has' as const,
          demandTrend: 'up' as const,
        }))
    ),
    ...addUnique(gapAnalysis.missing_critical.map((s) => ({
      name: s,
      category: categorizeSkill(s, roleRequirements.categories),
      importance: 'critical' as const,
      demandTrend: 'up' as const,
    }))),
    ...addUnique(gapAnalysis.missing_nice.map((s) => ({
      name: s,
      category: categorizeSkill(s, roleRequirements.categories),
      importance: 'nice-to-have' as const,
      demandTrend: 'flat' as const,
    }))),
    ...addUnique(gapAnalysis.transferable.map((s) => ({
      name: s,
      category: categorizeSkill(s, roleRequirements.categories),
      importance: 'transferable' as const,
      demandTrend: 'up' as const,
    }))),
  ];

  const weekCount = roadmap.length > 0 ? roadmap[roadmap.length - 1].week_end : 16;
  const progressionData = buildProgressionData(gapAnalysis.readiness_score, weekCount);
  const marketDemandData = buildMarketDemandData(analysis);
  const distributionData = buildDistributionData(skillGapItems);

  return {
    analysis,
    skillGapItems,
    progressionData,
    marketDemandData,
    distributionData,
  };
}

function categorizeSkill(
  skill: string,
  categories: { technical: string[]; soft: string[]; tools: string[]; certifications: string[] }
): string {
  const s = skill.toLowerCase();
  if (categories.certifications.some((c) => c.toLowerCase().includes(s) || s.includes(c.toLowerCase()))) return 'certifications';
  if (categories.tools.some((t) => t.toLowerCase().includes(s) || s.includes(t.toLowerCase()))) return 'tools';
  if (categories.soft.some((so) => so.toLowerCase().includes(s) || s.includes(so.toLowerCase()))) return 'soft';
  if (categories.technical.some((t) => t.toLowerCase().includes(s) || s.includes(t.toLowerCase()))) return 'technical';
  return 'technical';
}

function buildProgressionData(startScore: number, totalWeeks: number): { week: number; readiness: number }[] {
  const data: { week: number; readiness: number }[] = [{ week: 0, readiness: startScore }];
  const targetScore = Math.min(95, startScore + 30);
  const increment = (targetScore - startScore) / totalWeeks;

  for (let w = 1; w <= totalWeeks; w++) {
    // Deterministic "noise" using week number — no Math.random() for SSR safety
    const noise = ((w * 7) % 5) - 2;
    const readiness = Math.min(100, Math.max(startScore, Math.round(startScore + increment * w + noise)));
    data.push({ week: w, readiness });
  }
  return data;
}

function buildMarketDemandData(analysis: AnalysisResult): { skill: string; demand: number; hasSkill: boolean }[] {
  const allRequired = [
    ...analysis.roleRequirements.required_skills,
    ...analysis.roleRequirements.nice_to_have,
  ].slice(0, 8);

  const currentSkillsLower = analysis.skillExtraction.current_skills.map((s) => s.toLowerCase());

  return allRequired.map((skill, i) => ({
    skill: skill.length > 20 ? skill.substring(0, 18) + '…' : skill,
    demand: Math.max(45, 95 - i * 6 + Math.round((Math.random() - 0.5) * 10)),
    hasSkill: currentSkillsLower.some(
      (cs) => cs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(cs)
    ),
  }));
}

function buildDistributionData(items: SkillGapItem[]): { name: string; value: number; color: string }[] {
  const counts = { technical: 0, soft: 0, tools: 0, certifications: 0 };
  for (const item of items) {
    if (item.category in counts) counts[item.category as keyof typeof counts]++;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  return [
    { name: 'Technical', value: Math.round((counts.technical / total) * 100), color: '#6366f1' },
    { name: 'Soft Skills', value: Math.round((counts.soft / total) * 100), color: '#10b981' },
    { name: 'Tools', value: Math.round((counts.tools / total) * 100), color: '#f59e0b' },
    { name: 'Certifications', value: Math.round((counts.certifications / total) * 100), color: '#ef4444' },
  ].filter((d) => d.value > 0);
}

export function getReadinessColor(score: number): string {
  if (score >= 75) return 'var(--success)';
  if (score >= 50) return 'var(--warning)';
  return 'var(--danger)';
}

export function getReadinessLabel(score: number): string {
  if (score >= 80) return 'Strong candidate';
  if (score >= 65) return 'Good foundation';
  if (score >= 50) return 'Work to do';
  return 'Significant gaps';
}
