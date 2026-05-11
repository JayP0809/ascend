'use client';
import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const FLOATING_TAGS = [
  'Python', 'Docker', 'SQL', 'Leadership', 'React', 'AWS', 'Excel',
  'Kubernetes', 'Communication', 'TypeScript', 'Figma', 'PowerPoint',
  'TensorFlow', 'Agile', 'Node.js', 'Tableau', 'Git', 'Terraform',
  'JavaScript', 'Machine Learning', 'Data Analysis', 'Project Management',
];

// Pre-computed deterministic values — no Math.random() to avoid hydration mismatch
const TAG_CONFIG = FLOATING_TAGS.map((tag, i) => ({
  label: tag,
  left: `${5 + ((i * 4.1) % 88)}%`,
  duration: 10 + ((i * 17) % 8),
  delay: -((i * 9) % 12),
}));

interface HeroProps {
  onStartAnalysis: () => void;
}

export function Hero({ onStartAnalysis }: HeroProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Floating skill tags — only after mount to avoid hydration issues */}
      {mounted && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          {TAG_CONFIG.map((tag, i) => (
            <div
              key={i}
              className="absolute float-tag px-3 py-1 rounded-full border border-accent text-accent font-medium whitespace-nowrap text-xs"
              style={{
                left: tag.left,
                bottom: '-50px',
                '--duration': `${tag.duration}s`,
                '--delay': `${tag.delay}s`,
              } as React.CSSProperties}
            >
              {tag.label}
            </div>
          ))}
        </div>
      )}

      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, var(--accent-light) 0%, transparent 60%)' }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8 border"
            style={{ background: 'var(--accent-light)', borderColor: 'var(--accent)', color: 'var(--accent)' }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered career navigation
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-primary mb-6 leading-tight">
            From where you are{' '}
            <span className="gradient-text">→</span>{' '}
            where you want to be
          </h1>

          <p className="text-xl text-secondary max-w-2xl mx-auto mb-10">
            Upload your resume. Pick a role. Get your personalized, week-by-week roadmap to your dream career.
          </p>

          <Button
            size="lg"
            onClick={onStartAnalysis}
            className="text-lg px-8 py-4 h-14"
            style={{ boxShadow: '0 8px 32px color-mix(in srgb, var(--accent) 25%, transparent)' }}
          >
            Analyze my resume
            <ArrowRight className="h-5 w-5" />
          </Button>

          <p className="mt-4 text-sm text-muted">
            No account needed · Works with PDF &amp; DOCX · AI-powered analysis
          </p>
        </motion.div>
      </div>
    </section>
  );
}
