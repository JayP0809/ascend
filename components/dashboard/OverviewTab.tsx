'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReadinessGauge } from '@/components/charts/ReadinessGauge';
import { SkillGapChart } from '@/components/charts/SkillGapChart';
import { DashboardData } from '@/lib/types';
import { getReadinessColor } from '@/lib/scorer';
import { Clock, Zap, Target, BookOpen } from 'lucide-react';

interface OverviewTabProps {
  data: DashboardData;
}

const SKILL_CATEGORIES = ['All', 'Technical', 'Soft Skills', 'Tools'] as const;
type CategoryFilter = typeof SKILL_CATEGORIES[number];

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-lg bg-accent-light flex items-center justify-center">
          <Icon className="h-5 w-5 text-accent" />
        </div>
      </div>
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color || 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </Card>
  );
}

export function OverviewTab({ data }: OverviewTabProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const { analysis, skillGapItems } = data;
  const { gapAnalysis, roleRequirements, skillExtraction, roadmap } = analysis;

  const totalRequired = roleRequirements.required_skills.length;
  const matched = totalRequired - gapAnalysis.missing_critical.length;
  const estMonths = Math.ceil(roadmap.length > 0 ? roadmap[roadmap.length - 1].week_end / 4 : 4);

  const currentSkills = skillGapItems.filter((s) => s.importance === 'has' || s.importance === 'transferable');
  const filteredSkills = categoryFilter === 'All'
    ? currentSkills
    : currentSkills.filter((s) => {
        if (categoryFilter === 'Technical') return s.category === 'technical';
        if (categoryFilter === 'Soft Skills') return s.category === 'soft';
        if (categoryFilter === 'Tools') return s.category === 'tools';
        return true;
      });

  const scoreColor = getReadinessColor(gapAnalysis.readiness_score);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Target}
          label="Job Readiness"
          value={`${gapAnalysis.readiness_score}%`}
          sub={gapAnalysis.readiness_score >= 75 ? 'Strong candidate' : gapAnalysis.readiness_score >= 50 ? 'Good foundation' : 'Work to do'}
          color={scoreColor}
        />
        <StatCard
          icon={Zap}
          label="Skills Matched"
          value={`${matched} / ${totalRequired}`}
          sub="of required skills"
        />
        <StatCard
          icon={BookOpen}
          label="Skills to Learn"
          value={`${gapAnalysis.missing_critical.length}`}
          sub="critical gaps"
        />
        <StatCard
          icon={Clock}
          label="Est. Time to Ready"
          value={`${estMonths} months`}
          sub="following the roadmap"
        />
      </div>

      {/* Gauge + Skill cloud */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex items-center justify-center min-h-[260px]">
          <ReadinessGauge score={gapAnalysis.readiness_score} targetRole={analysis.targetRole} />
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-primary">Your current skills</h3>
            <div className="flex gap-1 flex-wrap">
              {SKILL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    categoryFilter === cat
                      ? 'bg-accent text-white'
                      : 'bg-background text-secondary hover:text-primary'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {filteredSkills.length === 0 ? (
              <p className="text-sm text-muted">No skills in this category found on your resume.</p>
            ) : (
              filteredSkills.map((skill) => (
                <span
                  key={skill.name}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-accent-light text-accent border border-accent border-opacity-20"
                >
                  {skill.name}
                </span>
              ))
            )}
          </div>
          {skillExtraction.strengths.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-medium text-muted mb-2">Key strengths</p>
              <div className="space-y-1">
                {skillExtraction.strengths.slice(0, 3).map((s) => (
                  <p key={s} className="text-xs text-secondary flex items-start gap-1.5">
                    <span className="text-[var(--success)] mt-0.5">•</span>{s}
                  </p>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Skill gap bar chart */}
      <Card>
        <h3 className="text-sm font-semibold text-primary mb-4">Skills by category</h3>
        <SkillGapChart categories={roleRequirements.categories} currentSkills={skillExtraction.current_skills} />
      </Card>
    </div>
  );
}
