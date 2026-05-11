'use client';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const SAMPLE_TRANSITIONS = [
  {
    from: 'Junior Developer',
    to: 'DevOps Engineer',
    skillsToLearn: 12,
    readiness: 67,
    color: 'success' as const,
    id: 'demo-devops',
  },
  {
    from: 'Marketing Analyst',
    to: 'Product Manager',
    skillsToLearn: 8,
    readiness: 74,
    color: 'warning' as const,
    id: 'demo-pm',
  },
  {
    from: 'Accountant',
    to: 'Financial Analyst',
    skillsToLearn: 6,
    readiness: 82,
    color: 'success' as const,
    id: 'demo-fa',
  },
];

const STATS = [
  { value: '80+', label: 'Career paths' },
  { value: 'AI', label: 'Powered analysis' },
  { value: '16wk', label: 'Roadmaps' },
  { value: 'Free', label: 'To run locally' },
];

interface RoleSampleCardsProps {
  onViewSample: (id: string) => void;
}

export function RoleSampleCards({ onViewSample }: RoleSampleCardsProps) {
  return (
    <section className="py-24 px-4" style={{ background: 'var(--bg-secondary)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-primary mb-3">See what&apos;s possible</h2>
          <p className="text-secondary">Real career transitions, mapped out step by step</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {SAMPLE_TRANSITIONS.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <Card hover className="h-full">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm font-medium text-secondary">{item.from}</span>
                  <ArrowRight className="h-4 w-4 text-accent" />
                  <span className="text-sm font-semibold text-primary">{item.to}</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Skills to learn</span>
                    <span className="text-sm font-semibold text-primary">{item.skillsToLearn}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Starting readiness</span>
                    <Badge variant={item.readiness >= 75 ? 'success' : 'warning'}>
                      {item.readiness}%
                    </Badge>
                  </div>
                </div>

                <button
                  onClick={() => onViewSample(item.id)}
                  className="mt-4 flex items-center gap-1.5 text-xs text-accent hover:text-primary transition-colors font-medium"
                >
                  View sample roadmap
                  <ExternalLink className="h-3 w-3" />
                </button>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              viewport={{ once: true }}
            >
              <Card className="text-center py-8">
                <div className="text-3xl font-bold gradient-text mb-1">{stat.value}</div>
                <div className="text-sm text-secondary">{stat.label}</div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
