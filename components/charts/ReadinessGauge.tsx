'use client';
import { useEffect, useState } from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { useTheme } from 'next-themes';
import { getReadinessLabel } from '@/lib/scorer';

interface ReadinessGaugeProps {
  score: number;
  targetRole: string;
}

function getScoreColor(score: number): string {
  if (score >= 75) return 'var(--success)';
  if (score >= 50) return 'var(--warning)';
  return 'var(--danger)';
}

export function ReadinessGauge({ score, targetRole }: ReadinessGaugeProps) {
  const { theme } = useTheme();
  const [animatedScore, setAnimatedScore] = useState(0);
  const color = getScoreColor(score);

  useEffect(() => {
    const duration = 1200;
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [score]);

  const data = [
    { value: animatedScore, fill: color },
    { value: 100 - animatedScore, fill: theme === 'dark' ? '#1e293b' : '#f1f5f9' },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative w-52 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="65%"
            outerRadius="90%"
            barSize={16}
            data={data}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar dataKey="value" cornerRadius={8} background={false} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center mt-6">
          <span className="text-4xl font-bold text-primary">{animatedScore}%</span>
          <span className="text-xs text-muted mt-1">{getReadinessLabel(score)}</span>
        </div>
      </div>
      <p className="text-sm text-secondary text-center mt-2 font-medium">
        {targetRole} Readiness
      </p>
    </div>
  );
}
