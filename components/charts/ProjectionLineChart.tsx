'use client';
import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { useTheme } from 'next-themes';

interface ProjectionLineChartProps {
  data: { week: number; readiness: number }[];
  startScore: number;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string | number }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs">
      <p className="text-secondary mb-1">Week {label}</p>
      <p className="font-semibold text-primary">{payload[0].value}% ready</p>
    </div>
  );
};

export function ProjectionLineChart({ data, startScore }: ProjectionLineChartProps) {
  const { theme } = useTheme();
  const [colors, setColors] = useState({ text: '#64748b', grid: '#334155', accent: '#6366f1' });

  useEffect(() => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    setColors({
      text: style.getPropertyValue('--text-muted').trim() || '#64748b',
      grid: style.getPropertyValue('--border').trim() || '#334155',
      accent: style.getPropertyValue('--accent').trim() || '#6366f1',
    });
  }, [theme]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <defs>
          <linearGradient id="readinessGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors.accent} stopOpacity={0.3} />
            <stop offset="95%" stopColor={colors.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: colors.text }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `W${v}`}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: colors.text }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine x={0} stroke={colors.accent} strokeDasharray="4 4" label={{ value: 'Now', fill: colors.text, fontSize: 10 }} />
        <Area
          type="monotone"
          dataKey="readiness"
          stroke={colors.accent}
          strokeWidth={2}
          fill="url(#readinessGradient)"
          dot={false}
          animationDuration={1000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
