'use client';
import { useState, useEffect } from 'react';
import { DashboardData } from '@/lib/types';
import { CheckCircle, ChevronDown, ChevronUp, ExternalLink, Clock } from 'lucide-react';

interface RoadmapTabProps {
  data: DashboardData;
}

function getPhaseType(focusArea: string): string {
  const fa = focusArea.toLowerCase();
  if (fa.includes('capstone') || fa.includes('prep') || fa.includes('job') || fa.includes('apply')) return 'Applying';
  if (fa.includes('project') || fa.includes('build') || fa.includes('deploy') || fa.includes('infrastructure')) return 'Building';
  return 'Learning';
}

export function RoadmapTab({ data }: RoadmapTabProps) {
  const { analysis } = data;
  const { roadmap } = analysis;

  const [completed, setCompleted] = useState<Set<number>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(`roadmap-complete-${analysis.analysisId}`);
      return new Set(stored ? JSON.parse(stored) : []);
    } catch { return new Set(); }
  });
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    try {
      localStorage.setItem(`roadmap-complete-${analysis.analysisId}`, JSON.stringify([...completed]));
    } catch { /* storage unavailable */ }
  }, [completed, analysis.analysisId]);

  const toggleComplete = (i: number) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else { next.add(i); }
      return next;
    });
  };

  const toggleExpand = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else { next.add(i); }
      return next;
    });
  };

  const filtered = roadmap;

  const progressPct = roadmap.length > 0 ? Math.round((completed.size / roadmap.length) * 100) : 0;

  // First incomplete phase index (across all phases, not just filtered)
  const nextIncompleteIndex = roadmap.findIndex((_, i) => !completed.has(i));

  return (
    <div>
      {/* Progress summary */}
      <div className="mb-7 pb-7 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {completed.size === 0
              ? 'No phases complete yet'
              : completed.size === roadmap.length
              ? 'All phases complete'
              : `${completed.size} of ${roadmap.length} phases complete`}
          </p>
          <span className="font-serif text-2xl font-light" style={{ color: 'var(--text-primary)' }}>
            {progressPct}%
          </span>
        </div>

        {/* Thin progress bar */}
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: 'var(--text-primary)' }}
          />
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          Progress is saved in this browser only.
        </p>
      </div>

      {/* Phase list */}
      <div>
        {filtered.map((phase) => {
          const globalIndex = roadmap.indexOf(phase);
          const isDone = completed.has(globalIndex);
          const isNext = globalIndex === nextIncompleteIndex;
          const isOpen = expanded.has(globalIndex);
          const phaseType = getPhaseType(phase.focus_area);

          return (
            <div
              key={globalIndex}
              className="border-b"
              style={{ borderColor: isOpen ? 'var(--border-strong)' : 'var(--border)' }}
            >
              {/* "Next up" callout */}
              {isNext && (
                <p
                  className="text-xs font-medium pt-5 pb-1 uppercase tracking-widest"
                  style={{ color: 'var(--emerald-text)' }}
                >
                  Next up
                </p>
              )}

              {/* Phase header row */}
              <button
                className="w-full flex items-center gap-4 py-5 text-left"
                onClick={() => toggleExpand(globalIndex)}
                aria-expanded={isOpen}
              >
                {/* Completion indicator */}
                <div className="flex-shrink-0 mt-0.5">
                  {isDone ? (
                    <CheckCircle
                      className="h-4 w-4"
                      style={{ color: 'var(--emerald-text)' }}
                      aria-label="Complete"
                    />
                  ) : (
                    <div
                      className="h-4 w-4 rounded-full border-2"
                      style={{
                        borderColor: isNext ? 'var(--text-primary)' : 'var(--border)',
                        background:  isNext ? 'var(--text-primary)' : 'transparent',
                      }}
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* Phase info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium leading-snug"
                    style={{
                      color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: isDone ? 'line-through' : 'none',
                    }}
                  >
                    {phase.focus_area}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Week {phase.week_start}–{phase.week_end} · {phaseType}
                  </p>
                </div>

                {isOpen
                  ? <ChevronUp className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  : <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                }
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="pb-7 space-y-6">

                  {/* Topics */}
                  <div>
                    <p
                      className="text-xs uppercase tracking-widest font-medium mb-3"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Topics
                    </p>
                    <ul className="space-y-2">
                      {phase.topics.map((t) => (
                        <li key={t} className="flex items-start gap-3">
                          <span className="mt-1.5 h-1 w-1 rounded-full flex-shrink-0" style={{ background: 'var(--text-muted)' }} aria-hidden="true" />
                          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Resources */}
                  <div>
                    <p
                      className="text-xs uppercase tracking-widest font-medium mb-3"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Resources
                    </p>
                    <div className="space-y-2">
                      {phase.resources.map((r) => (
                        <a
                          key={r.title}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 py-2.5 px-3 rounded-xl border group transition-colors"
                          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border-strong)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)'; }}
                        >
                          <span
                            className="text-xs font-medium flex-shrink-0 uppercase"
                            style={{ color: 'var(--text-muted)', width: 24 }}
                          >
                            {r.type[0]}
                          </span>
                          <span className="text-sm flex-1 min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>
                            {r.title}
                          </span>
                          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Project */}
                  <div>
                    <p
                      className="text-xs uppercase tracking-widest font-medium mb-3"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Project
                    </p>
                    <div
                      className="p-4 rounded-2xl border"
                      style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {phase.project.title}
                        </p>
                        <span className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          ~{phase.project.hours}h
                        </span>
                      </div>
                      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                        {phase.project.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {phase.project.tech.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded text-xs"
                            style={{
                              color: 'var(--text-secondary)',
                              background: 'var(--bg-primary)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Milestone */}
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Milestone</span>
                    {': '}{phase.milestone}
                  </p>

                  {/* Complete toggle */}
                  <button
                    onClick={() => toggleComplete(globalIndex)}
                    className="text-sm font-medium transition-colors"
                    style={{
                      color: isDone ? 'var(--emerald-text)' : 'var(--text-secondary)',
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px',
                    }}
                  >
                    {isDone ? 'Mark as incomplete' : 'Mark as complete'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
