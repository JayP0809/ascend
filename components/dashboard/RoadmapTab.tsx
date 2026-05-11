'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DashboardData } from '@/lib/types';
import { CheckCircle, Circle, Lock, ChevronDown, ChevronUp, ExternalLink, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface RoadmapTabProps {
  data: DashboardData;
}

type PhaseFilter = 'All Phases' | 'Learning' | 'Building' | 'Applying';
const PHASE_FILTERS: PhaseFilter[] = ['All Phases', 'Learning', 'Building', 'Applying'];

function getPhaseType(focusArea: string): PhaseFilter {
  const fa = focusArea.toLowerCase();
  if (fa.includes('capstone') || fa.includes('prep') || fa.includes('job') || fa.includes('apply')) return 'Applying';
  if (fa.includes('project') || fa.includes('build') || fa.includes('deploy') || fa.includes('infrastructure')) return 'Building';
  return 'Learning';
}

const RESOURCE_COLORS: Record<string, string> = {
  Video: 'var(--danger)',
  Docs: 'var(--accent)',
  Course: 'var(--warning)',
  Article: 'var(--success)',
  Book: 'var(--text-secondary)',
};

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
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('All Phases');

  useEffect(() => {
    localStorage.setItem(`roadmap-complete-${analysis.analysisId}`, JSON.stringify([...completed]));
  }, [completed, analysis.analysisId]);

  const toggleComplete = (i: number) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const toggleExpand = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const filtered = roadmap.filter((phase) =>
    phaseFilter === 'All Phases' || getPhaseType(phase.focus_area) === phaseFilter
  );

  const progressPct = roadmap.length > 0 ? Math.round((completed.size / roadmap.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-primary">
              {completed.size} of {roadmap.length} phases complete
            </p>
            <p className="text-xs text-muted mt-0.5">
              {progressPct >= 100 ? 'Roadmap complete! 🎉' : `${100 - progressPct}% remaining`}
            </p>
          </div>
          <span className="text-2xl font-bold text-accent">{progressPct}%</span>
        </div>
        <Progress value={progressPct} />
      </Card>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {PHASE_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setPhaseFilter(f)}
            className={clsx(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
              phaseFilter === f
                ? 'bg-accent text-white'
                : 'bg-background text-secondary hover:text-primary border border-border'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

        <div className="space-y-4">
          {filtered.map((phase, i) => {
            const globalIndex = roadmap.indexOf(phase);
            const isDone = completed.has(globalIndex);
            const isCurrent = !isDone && globalIndex === [...Array(roadmap.length).keys()].find((idx) => !completed.has(idx));
            const isOpen = expanded.has(globalIndex);

            return (
              <div key={globalIndex} className="relative pl-10">
                {/* Timeline dot */}
                <div className={clsx(
                  'absolute left-0 top-5 h-10 w-10 rounded-full border-2 flex items-center justify-center z-10 transition-all',
                  isDone ? 'bg-[var(--success)] border-[var(--success)]' :
                  isCurrent ? 'bg-card border-accent' : 'bg-card border-border'
                )}>
                  {isDone ? (
                    <CheckCircle className="h-5 w-5 text-white" />
                  ) : isCurrent ? (
                    <Circle className="h-4 w-4 text-accent fill-accent" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted" />
                  )}
                </div>

                <Card className={clsx('transition-all', isDone && 'opacity-75')}>
                  {/* Phase header */}
                  <button
                    className="w-full flex items-center justify-between text-left"
                    onClick={() => toggleExpand(globalIndex)}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted">Week {phase.week_start}–{phase.week_end}</span>
                        <Badge variant={
                          getPhaseType(phase.focus_area) === 'Building' ? 'warning' :
                          getPhaseType(phase.focus_area) === 'Applying' ? 'success' : 'accent'
                        }>
                          {getPhaseType(phase.focus_area)}
                        </Badge>
                        {isDone && <Badge variant="success">Done ✓</Badge>}
                      </div>
                      <p className="text-sm font-semibold text-primary mt-1">{phase.focus_area}</p>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted flex-shrink-0" />}
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 space-y-4">
                          {/* Topics */}
                          <div>
                            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Topics</p>
                            <ul className="space-y-1">
                              {phase.topics.map((t) => (
                                <li key={t} className="text-sm text-secondary flex items-start gap-2">
                                  <span className="text-accent mt-1 flex-shrink-0">›</span>{t}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Resources */}
                          <div>
                            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Resources</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {phase.resources.map((r) => (
                                <a
                                  key={r.title}
                                  href={r.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:border-accent hover:bg-background transition-colors group"
                                >
                                  <div className="h-6 w-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: `${RESOURCE_COLORS[r.type] || 'var(--accent)'}20` }}>
                                    <span className="text-xs font-bold" style={{ color: RESOURCE_COLORS[r.type] || 'var(--accent)' }}>{r.type[0]}</span>
                                  </div>
                                  <span className="text-xs text-secondary group-hover:text-primary transition-colors flex-1 min-w-0 truncate">{r.title}</span>
                                  <ExternalLink className="h-3 w-3 text-muted flex-shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>

                          {/* Project */}
                          <div className="bg-background rounded-xl p-4 border border-border">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-muted uppercase tracking-wide">Project</p>
                              <div className="flex items-center gap-1 text-xs text-muted">
                                <Clock className="h-3 w-3" />
                                ~{phase.project.hours}h
                              </div>
                            </div>
                            <p className="text-sm font-semibold text-primary mb-1">{phase.project.title}</p>
                            <p className="text-xs text-secondary mb-2">{phase.project.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {phase.project.tech.map((t) => (
                                <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-accent-light text-accent">{t}</span>
                              ))}
                            </div>
                          </div>

                          {/* Milestone */}
                          <div className="flex items-start gap-2 text-xs text-secondary">
                            <CheckCircle className="h-4 w-4 text-[var(--success)] flex-shrink-0 mt-0.5" />
                            <span><span className="font-semibold">Milestone:</span> {phase.milestone}</span>
                          </div>

                          {/* Mark complete button */}
                          <button
                            onClick={() => toggleComplete(globalIndex)}
                            className={clsx(
                              'w-full py-2 rounded-lg text-sm font-medium transition-all border',
                              isDone
                                ? 'bg-[var(--success)] bg-opacity-15 text-[var(--success)] border-[var(--success)] border-opacity-30'
                                : 'bg-background text-secondary border-border hover:border-[var(--success)] hover:text-[var(--success)]'
                            )}
                          >
                            {isDone ? '✓ Phase complete' : 'Mark as complete'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
