'use client';
import { ProjectionLineChart } from '@/components/charts/ProjectionLineChart';
import { MarketDemandBar } from '@/components/charts/MarketDemandBar';
import { SkillDistributionPie } from '@/components/charts/SkillDistributionPie';
import { DashboardData } from '@/lib/types';

interface InsightsTabProps {
  data: DashboardData;
}

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-widest font-medium mb-4" style={{ color: 'var(--text-muted)' }}>
      {children}
    </p>
  );
}

function ChartBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded p-4"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
    >
      {children}
    </div>
  );
}

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
    <div className="space-y-10">
      {/* Readiness projection */}
      <section>
        <SectionLabel>Projected readiness over time</SectionLabel>
        <ChartBox>
          <div
            role="img"
            aria-label={`Area chart: readiness projected to increase from ${startScore}% toward ~90% over 16 weeks following the roadmap consistently`}
          >
            <ProjectionLineChart data={progressionData} startScore={startScore} />
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Estimated trajectory if roadmap is followed consistently. AI-generated heuristic, not a guarantee.
          </p>
        </ChartBox>
      </section>

      {/* Market demand + skill distribution side by side on larger screens */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="mb-4">
            <SectionLabel>Top skills in market</SectionLabel>
          </div>
          <ChartBox>
            <div
              role="img"
              aria-label="Horizontal bar chart: illustrative frequency of top skills in job postings; green bars are skills from your resume, grey bars are skills to develop"
            >
              <MarketDemandBar data={marketDemandData} />
            </div>
            <div className="flex items-center gap-4 mt-3 mb-2">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <div className="h-2 w-2 rounded-sm flex-shrink-0" style={{ background: 'var(--emerald)' }} />
                Skills you have
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <div className="h-2 w-2 rounded-sm flex-shrink-0" style={{ background: 'var(--border-strong)' }} />
                Skills to develop
              </div>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Bar length shows how often each skill appears in relevant job postings. These are illustrative estimates, not verified market statistics.
            </p>
          </ChartBox>
        </div>

        <div>
          <SectionLabel>Skill breakdown</SectionLabel>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            How the skills identified in your analysis are distributed across categories. Percentages represent each category&apos;s share of the total, not your proficiency level.
          </p>
          <ChartBox>
            <div
              role="img"
              aria-label="Pie chart: proportion of your skills broken down by Technical, Soft Skills, Tools, and Certifications"
            >
              <SkillDistributionPie data={distributionData} />
            </div>
          </ChartBox>
        </div>
      </section>

      {/* Candidate comparison */}
      <section className="border-t pt-8" style={{ borderColor: 'var(--border)' }}>
        <SectionLabel>What strong candidates have</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              Typical candidate
            </p>
            <ul className="space-y-2.5">
              {typicalCandidateProfile.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1 w-1 rounded-full flex-shrink-0" style={{ background: 'var(--text-muted)' }} aria-hidden="true" />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              Your profile
            </p>
            <ul className="space-y-2.5">
              {yourProfile.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="text-xs flex-shrink-0 mt-0.5"
                    style={{ color: matchingItems.has(item) ? 'var(--emerald-text)' : 'var(--text-muted)' }}
                  >
                    {matchingItems.has(item) ? '✓' : '○'}
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: matchingItems.has(item) ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Key strengths */}
      {advantages.length > 0 && (
        <section className="border-t pt-8" style={{ borderColor: 'var(--border)' }}>
          <SectionLabel>Your biggest advantages</SectionLabel>
          <div className="space-y-4">
            {advantages.map((strength, i) => (
              <div key={i} className="flex items-start gap-4 pb-4 border-b last:border-b-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
                <span
                  className="font-serif text-2xl font-light flex-shrink-0 leading-none mt-0.5 w-6 text-right"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {i + 1}
                </span>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{toTitleCase(strength)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Analysis summary */}
      <section className="border-t pt-8" style={{ borderColor: 'var(--border)' }}>
        <SectionLabel>Analysis summary</SectionLabel>
        <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
          {gapAnalysis.strengths_summary}
        </p>
        <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs uppercase tracking-widest font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
            Biggest gap
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{gapAnalysis.biggest_gap}</p>
        </div>
      </section>
    </div>
  );
}
