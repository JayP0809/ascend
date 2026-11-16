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
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs">
      <p className="font-medium text-primary mb-1">{label}</p>
      <p className="text-secondary">Market demand: <span className="font-semibold text-primary">{payload[0].value}%</span></p>
      <p style={{ color: hasSkill ? 'var(--emerald-text)' : 'var(--text-muted)' }}>
        {hasSkill ? '✓ You have this skill' : '○ Gap to fill'}
      </p>
    </div>
  );
};

export function MarketDemandBar({ data }: MarketDemandBarProps) {
  const { theme } = useTheme();
  const [colors, setColors] = useState({ text: '#56575C', grid: '#35363A', emerald: '#5F7A68', muted: '#35363A' });

  useEffect(() => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    setColors({
      text: style.getPropertyValue('--text-muted').trim() || '#56575C',
      grid: style.getPropertyValue('--border').trim() || '#35363A',
      emerald: style.getPropertyValue('--emerald').trim() || '#5F7A68',
      muted: style.getPropertyValue('--border').trim() || '#35363A',
    });
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
            <Cell key={i} fill={entry.hasSkill ? colors.emerald : colors.muted} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
