'use client';
import { Card } from '@/components/ui/card';
import { ProjectionLineChart } from '@/components/charts/ProjectionLineChart';
import { MarketDemandBar } from '@/components/charts/MarketDemandBar';
import { SkillDistributionPie } from '@/components/charts/SkillDistributionPie';
import { DashboardData } from '@/lib/types';
import { Star, Zap, Users } from 'lucide-react';

interface InsightsTabProps {
  data: DashboardData;
}

const ICONS = [Star, Zap, Users];

export function InsightsTab({ data }: InsightsTabProps) {
  const { analysis, progressionData, marketDemandData, distributionData } = data;
  const { gapAnalysis, skillExtraction, roleRequirements } = analysis;

  const advantages = skillExtraction.strengths.slice(0, 3);
  const startScore = gapAnalysis.readiness_score;

  const typicalCandidateProfile = [
    `${roleRequirements.typical_timeline_months}–${roleRequirements.typical_timeline_months + 6} months of targeted prep`,
    `${Math.floor(roleRequirements.required_skills.length * 0.8)}+ required skills mastered`,
    `2–3 portfolio projects deployed`,
    `Relevant certification (e.g., ${roleRequirements.categories.certifications[0] || 'industry cert'})`,
    `Open source contribution or freelance work`,
  ];

  const yourProfile = [
    `${skillExtraction.experience_years} years of related experience`,
    `${skillExtraction.current_skills.length} current skills identified`,
    `Strong foundation in ${skillExtraction.strengths[0]?.split(' ').slice(0, 4).join(' ') || 'core skills'}`,
    `${gapAnalysis.transferable.length} directly transferable skills`,
    `${gapAnalysis.readiness_score}% match to role requirements`,
  ];

  const matchingItems = new Set(
    yourProfile.filter((y) =>
      typicalCandidateProfile.some((t) =>
        y.split(' ').some((word) => word.length > 4 && t.toLowerCase().includes(word.toLowerCase()))
      )
    )
  );

  return (
    <div className="space-y-6">
      {/* 2x2 chart grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-primary mb-4">Projected readiness over time</h3>
          <ProjectionLineChart data={progressionData} startScore={startScore} />
          <p className="text-xs text-muted mt-2">Estimated trajectory if roadmap is followed consistently</p>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-primary mb-4">Top skills demanded in market</h3>
          <MarketDemandBar data={marketDemandData} />
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-secondary">
              <div className="h-2.5 w-2.5 rounded-sm bg-[var(--success)]" />You have it
            </div>
            <div className="flex items-center gap-1.5 text-xs text-secondary">
              <div className="h-2.5 w-2.5 rounded-sm bg-[var(--warning)]" />Gap to fill
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-primary mb-4">Skill distribution</h3>
          <SkillDistributionPie data={distributionData} />
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-primary mb-4">What top candidates have</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-muted mb-2">Typical candidate</p>
              <ul className="space-y-2">
                {typicalCandidateProfile.map((item, i) => (
                  <li key={i} className="text-xs text-secondary flex items-start gap-1.5">
                    <span className="text-[var(--success)] flex-shrink-0">•</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted mb-2">Your profile</p>
              <ul className="space-y-2">
                {yourProfile.map((item, i) => (
                  <li key={i} className={`text-xs flex items-start gap-1.5 ${matchingItems.has(item) ? 'text-[var(--success)]' : 'text-secondary'}`}>
                    <span className="flex-shrink-0">{matchingItems.has(item) ? '✓' : '○'}</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Strengths section */}
      <div>
        <h3 className="text-sm font-semibold text-primary mb-3">Your biggest advantages</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {advantages.map((strength, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <Card key={i} className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-accent-light flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-primary mb-1">
                    {strength.split(' ').slice(0, 3).join(' ')}
                  </p>
                  <p className="text-xs text-secondary">{strength}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Gap summary */}
      <Card>
        <h3 className="text-sm font-semibold text-primary mb-2">Analysis summary</h3>
        <p className="text-sm text-secondary leading-relaxed mb-3">{gapAnalysis.strengths_summary}</p>
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[var(--danger)] bg-opacity-10 border border-[var(--danger)] border-opacity-20">
          <span className="text-[var(--danger)] text-sm flex-shrink-0">⚠</span>
          <p className="text-xs text-white">
            <span className="font-medium text-white">Biggest gap: </span>{gapAnalysis.biggest_gap}
          </p>
        </div>
      </Card>
    </div>
  );
}
