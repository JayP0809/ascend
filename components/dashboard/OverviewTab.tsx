'use client';
import { useState } from 'react';
import { DashboardData } from '@/lib/types';

interface OverviewTabProps {
  data: DashboardData;
}

function readinessNote(score: number): string {
  if (score >= 75) return 'Strong foundation. Focus on the remaining gaps to close the distance to this role.';
  if (score >= 50) return 'Solid foundation with meaningful gaps to address before this transition is realistic.';
  return 'Significant development work ahead. The roadmap below outlines a clear path forward.';
}

interface StatCellProps {
  label: string;
  value: string;
  sub?: string;
}

function StatCell({ label, value, sub }: StatCellProps) {
  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        padding: '20px 20px',
      }}
    >
      <p
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 8,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 'clamp(1.4rem, 3vw, 1.75rem)',
          fontWeight: 400,
          lineHeight: 1.1,
          color: 'var(--text-primary)',
          marginBottom: sub ? 4 : 0,
        }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</p>
      )}
    </div>
  );
}

const SKILL_FILTER_LABELS: Record<string, string> = {
  all: 'All', technical: 'Technical', soft: 'Soft Skills', tools: 'Tools',
};
const SKILL_FILTER_KEYS = ['all', 'technical', 'soft', 'tools'] as const;
type SkillFilter = (typeof SKILL_FILTER_KEYS)[number];

export function OverviewTab({ data }: OverviewTabProps) {
  const { analysis, skillGapItems } = data;
  const { gapAnalysis, roleRequirements, roadmap } = analysis;
  const [skillFilter, setSkillFilter] = useState<SkillFilter>('all');

  const ownedSkills = skillGapItems.filter((s) => s.importance === 'has');
  const filteredSkills =
    skillFilter === 'all'
      ? ownedSkills
      : ownedSkills.filter((s) => s.category === skillFilter);

  const totalRequired = roleRequirements.required_skills.length;
  const matched = totalRequired - gapAnalysis.missing_critical.length;
  const estMonths = Math.ceil(roadmap.length > 0 ? roadmap[roadmap.length - 1].week_end / 4 : 4);
  const score = gapAnalysis.readiness_score;

  return (
    <div>
      {/* Score + Stats group */}
      <div className="space-y-2">
        {/* Score container */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 24,
            padding: 'clamp(32px, 6vw, 56px) 32px',
            textAlign: 'center',
          }}
        >
          <div aria-label={`Career readiness score: ${score} out of 100`}>
            <span
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(72px, 14vw, 100px)',
                fontWeight: 400,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                color: 'var(--text-primary)',
              }}
            >
              {score}
            </span>
            <span
              style={{
                fontFamily: 'var(--serif)',
                fontSize: '1.75rem',
                fontWeight: 400,
                color: 'var(--text-muted)',
              }}
            >
              /100
            </span>
          </div>
          <p style={{ fontSize: 13, marginTop: 10, color: 'var(--text-secondary)' }}>
            Career readiness
          </p>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              maxWidth: 380,
              margin: '8px auto 0',
              lineHeight: 1.5,
            }}
          >
            {readinessNote(score)}
          </p>
          <p
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              maxWidth: 400,
              margin: '12px auto 0',
              lineHeight: 1.5,
            }}
          >
            AI-generated heuristic estimate based on resume vs. role requirements. Not a statistical probability.
          </p>
        </div>

        {/* Stats container: gap trick creates the column dividers automatically */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4"
          style={{
            background: 'var(--border)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            overflow: 'hidden',
            gap: 1,
          }}
        >
          <StatCell
            label="Job Readiness"
            value={`${score}%`}
            sub={score >= 75 ? 'Strong candidate' : score >= 50 ? 'Good foundation' : 'Work to do'}
          />
          <StatCell
            label="Skills Matched"
            value={`${matched} / ${totalRequired}`}
            sub="of required skills"
          />
          <StatCell
            label="Skills to Learn"
            value={`${gapAnalysis.missing_critical.length}`}
            sub="critical gaps"
          />
          <StatCell
            label="Est. Time to Ready"
            value={`${estMonths} months`}
            sub="following the roadmap"
          />
        </div>
      </div>

      {/* Your Current Skills (below stats, no card wrapper) */}
      {ownedSkills.length > 0 && (
        <div style={{ marginTop: 40 }}>
          {/* Section heading */}
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              margin: '0 0 16px',
            }}
          >
            Your Current Skills
          </p>

          {/* Category filter buttons */}
          <div
            style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}
            role="group"
            aria-label="Filter skills by category"
          >
            {SKILL_FILTER_KEYS.map((key) => {
              const isActive = skillFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setSkillFilter(key)}
                  aria-pressed={isActive}
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    padding: '6px 16px',
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: isActive ? 'var(--accent)' : 'var(--border-strong)',
                    background: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? 'var(--accent-fg)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'background 0.1s, color 0.1s, border-color 0.1s',
                  }}
                >
                  {SKILL_FILTER_LABELS[key]}
                </button>
              );
            })}
          </div>

          {/* Skill tags */}
          <div
            style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}
            aria-live="polite"
            aria-label="Filtered skills list"
          >
            {filteredSkills.map((skill) => (
              <span
                key={skill.name}
                style={{
                  fontSize: 13,
                  padding: '5px 12px',
                  borderRadius: 4,
                  background: 'var(--sl-has-bg)',
                  color: 'var(--sl-has-fg)',
                  border: '1px solid rgba(40, 92, 59, 0.18)',
                  whiteSpace: 'nowrap',
                }}
              >
                {skill.name}
              </span>
            ))}
            {filteredSkills.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                No skills in this category.
              </p>
            )}
          </div>

          {/* Divider */}
          <div
            style={{ height: 1, background: 'var(--border)' }}
            role="separator"
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
