'use client';
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ResponsiveContainer,
} from 'recharts';
import { useTheme } from 'next-themes';

interface MarketDemandBarProps {
  data: { skill: string; demand: number; hasSkill: boolean }[];
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: { hasSkill: boolean } }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  const hasSkill = payload[0].payload.hasSkill;
  return (
    <div className="rounded border p-2.5 text-xs" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}>
      <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{label}</p>
      <p style={{ color: 'var(--text-secondary)' }}>Demand: <span style={{ color: 'var(--text-primary)' }}>{payload[0].value}%</span></p>
      <p style={{ color: hasSkill ? 'var(--emerald-text)' : 'var(--text-muted)' }}>
        {hasSkill ? 'Skill you have' : 'Skill to develop'}
      </p>
    </div>
  );
};

export function MarketDemandBar({ data }: MarketDemandBarProps) {
  const { theme } = useTheme();
  const [colors, setColors] = useState({ text: '#A09880', grid: 'rgba(30,26,22,0.09)', emerald: '#1D5C3A', gap: '#D4CBBF' });

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const style = getComputedStyle(document.documentElement);
      setColors({
        text:    style.getPropertyValue('--text-muted').trim()    || '#A09880',
        grid:    style.getPropertyValue('--border').trim()        || 'rgba(30,26,22,0.09)',
        emerald: style.getPropertyValue('--emerald').trim()       || '#1D5C3A',
        gap:     style.getPropertyValue('--border-strong').trim() || '#D4CBBF',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [theme]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }} barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: colors.text }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="skill"
          tick={{ fontSize: 10, fill: colors.text }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="demand" radius={[0, 4, 4, 0]} animationDuration={800}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.hasSkill ? colors.emerald : colors.gap} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
