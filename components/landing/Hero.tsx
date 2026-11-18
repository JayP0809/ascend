'use client';
import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroProps {
  onStartAnalysis: () => void;
}

export function Hero({ onStartAnalysis }: HeroProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto w-full">
        <div className={mounted ? 'animate-fade-up' : ''}>
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            <span
              style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block' }}
            />
            Career navigation
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-primary mb-6 leading-tight tracking-tight">
            From where you are{' '}
            <span className="text-muted">→</span>{' '}
            where you want to be
          </h1>

          <p className="text-xl text-secondary max-w-2xl mx-auto mb-10">
            Upload your resume. Pick a role. Get your personalized, week-by-week roadmap to your dream career.
          </p>

          <Button
            size="lg"
            onClick={onStartAnalysis}
            className="text-lg px-8 py-4 h-14"
          >
            Analyze my resume
            <ArrowRight className="h-5 w-5" />
          </Button>

          <p className="mt-4 text-sm text-secondary">
            No account needed · Works with PDF &amp; DOCX · Free to use
          </p>

          {/* Product preview */}
          <div
            className="mt-16 w-full max-w-2xl mx-auto text-left"
            aria-label="Sample product output"
          >
            <div
              className="rounded-2xl border border-border overflow-hidden"
              style={{ background: 'var(--bg-card)' }}
            >
              {/* Titlebar */}
              <div
                className="flex items-center justify-between px-4 py-2.5 border-b border-border"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-secondary">Junior Developer</span>
                  <ArrowRight className="h-3 w-3 text-muted" />
                  <span className="font-medium text-primary">DevOps Engineer</span>
                </div>
                <span className="text-[12px] text-secondary px-1.5 py-0.5 rounded border border-border">
                  Sample
                </span>
              </div>

              {/* Content: two columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {/* Left: readiness */}
                <div className="p-5 border-b border-border sm:border-b-0 sm:border-r">
                  <p className="text-xs text-secondary mb-2">Readiness score</p>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-4xl font-bold text-primary">67</span>
                    <span className="text-base text-secondary">%</span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden mb-2"
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: '67%', background: 'var(--accent)' }}
                    />
                  </div>
                  <p className="text-xs text-secondary">Good foundation to build on</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {['Python', 'SQL', 'Linux'].map((skill) => (
                      <span
                        key={skill}
                        className="text-[11px] px-2 py-0.5 rounded border border-border text-secondary"
                        style={{ background: 'var(--bg-secondary)' }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right: gaps + roadmap */}
                <div className="p-5">
                  <p className="text-xs text-secondary mb-2">Skills to learn (12 critical)</p>
                  <div className="space-y-1.5 mb-4">
                    {['Kubernetes', 'Terraform', 'Prometheus'].map((skill) => (
                      <div key={skill} className="flex items-center gap-2">
                        <div
                          className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                          style={{ background: 'var(--border)' }}
                        />
                        <span className="text-xs text-secondary">{skill}</span>
                      </div>
                    ))}
                    <p className="text-[12px] text-secondary pl-3.5">+9 more in your roadmap</p>
                  </div>
                  <div
                    className="rounded-lg px-3 py-2.5 border border-border"
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    <p className="text-[12px] text-secondary mb-0.5">Phase 1 · Weeks 1-4</p>
                    <p className="text-xs font-medium text-primary">Foundation</p>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-center text-[12px] text-secondary mt-3">
              Sample output from a fictional resume. Your analysis will reflect your actual skills.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
