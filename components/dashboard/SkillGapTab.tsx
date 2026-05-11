'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DashboardData, SkillGapItem } from '@/lib/types';
import { Search, TrendingUp, Minus, TrendingDown, ArrowUpRight } from 'lucide-react';

interface SkillGapTabProps {
  data: DashboardData;
}

type Filter = 'All' | 'Critical' | 'Nice to Have' | 'Transferable' | 'You Have';

const FILTERS: Filter[] = ['All', 'Critical', 'Nice to Have', 'Transferable', 'You Have'];

function importanceBadge(importance: SkillGapItem['importance']) {
  const map = {
    critical: { variant: 'danger', label: 'Critical' },
    'nice-to-have': { variant: 'warning', label: 'Nice to have' },
    transferable: { variant: 'accent', label: 'Transferable' },
    has: { variant: 'success', label: 'You have it' },
  } as const;
  const { variant, label } = map[importance];
  return <Badge variant={variant}>{label}</Badge>;
}

function DemandIcon({ trend }: { trend: SkillGapItem['demandTrend'] }) {
  if (trend === 'up') return <TrendingUp className="h-3 w-3 text-[var(--success)]" />;
  if (trend === 'down') return <TrendingDown className="h-3 w-3 text-[var(--danger)]" />;
  return <Minus className="h-3 w-3 text-muted" />;
}

function categoryBadge(cat: string) {
  const labels: Record<string, string> = {
    technical: 'Technical',
    soft: 'Soft Skills',
    tools: 'Tool',
    certifications: 'Cert',
  };
  return <Badge variant="outline">{labels[cat] || cat}</Badge>;
}

export function SkillGapTab({ data }: SkillGapTabProps) {
  const [filter, setFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');
  const { skillGapItems, analysis } = data;

  const filtered = skillGapItems.filter((s) => {
    const matchesSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'All' ||
      (filter === 'Critical' && s.importance === 'critical') ||
      (filter === 'Nice to Have' && s.importance === 'nice-to-have') ||
      (filter === 'Transferable' && s.importance === 'transferable') ||
      (filter === 'You Have' && s.importance === 'has');
    return matchesSearch && matchesFilter;
  });

  const transferable = skillGapItems.filter((s) => s.importance === 'transferable');

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f ? 'bg-accent text-white' : 'bg-background text-secondary hover:text-primary border border-border'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
          <Input
            placeholder="Filter skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Skill grid */}
      {filtered.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-secondary mb-2">No skills match your filter.</p>
          <button onClick={() => { setFilter('All'); setSearch(''); }} className="text-accent text-sm hover:underline">
            Clear filters
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((skill) => (
            <Card key={skill.name} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-primary leading-tight">{skill.name}</p>
                <DemandIcon trend={skill.demandTrend} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {categoryBadge(skill.category)}
                {importanceBadge(skill.importance)}
              </div>
              {skill.importance === 'critical' && (
                <div className="flex items-center gap-1 mt-auto pt-1">
                  <span className="text-xs text-accent bg-accent-light px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    Added to roadmap
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Transferable skills section */}
      {transferable.length > 0 && (filter === 'All' || filter === 'Transferable') && (
        <div>
          <h3 className="text-sm font-semibold text-primary mb-3">Your transferable skills</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {transferable.map((skill) => (
              <Card key={skill.name} className="flex items-start gap-3 py-4">
                <div className="h-8 w-8 rounded-lg bg-[var(--accent)] bg-opacity-15 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-primary">{skill.name}</p>
                  <p className="text-xs text-muted mt-0.5">
                    Carries over from your current experience and applies directly to {analysis.targetRole}.
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
