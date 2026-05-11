'use client';
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { useTheme } from 'next-themes';

interface SkillGapChartProps {
  categories: { technical: string[]; soft: string[]; tools: string[]; certifications: string[] };
  currentSkills: string[];
}

function buildChartData(
  categories: SkillGapChartProps['categories'],
  currentSkills: string[]
) {
  const skillsLower = currentSkills.map((s) => s.toLowerCase());
  const countMatches = (list: string[]) =>
    list.filter((s) => skillsLower.some((cs) => cs.includes(s.toLowerCase()) || s.toLowerCase().includes(cs))).length;

  return [
    { category: 'Technical', required: categories.technical.length, you: countMatches(categories.technical) },
    { category: 'Soft Skills', required: categories.soft.length, you: countMatches(categories.soft) },
    { category: 'Tools', required: categories.tools.length, you: countMatches(categories.tools) },
    { category: 'Certs', required: categories.certifications.length, you: countMatches(categories.certifications) },
  ].filter((d) => d.required > 0);
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs">
      <p className="font-semibold text-primary mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-secondary">{p.name}:</span>
          <span className="font-medium text-primary">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function SkillGapChart({ categories, currentSkills }: SkillGapChartProps) {
  const { theme } = useTheme();
  const [colors, setColors] = useState({ text: '#64748b', grid: '#334155', success: '#10b981', accent: '#6366f1' });

  useEffect(() => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    setColors({
      text: style.getPropertyValue('--text-muted').trim() || '#64748b',
      grid: style.getPropertyValue('--border').trim() || '#334155',
      success: style.getPropertyValue('--success').trim() || '#10b981',
      accent: style.getPropertyValue('--accent').trim() || '#6366f1',
    });
  }, [theme]);

  const data = buildChartData(categories, currentSkills);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis dataKey="category" tick={{ fontSize: 11, fill: colors.text }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: colors.text }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: colors.text }} />
        <Bar dataKey="you" name="You have" fill={colors.success} radius={[4, 4, 0, 0]} animationDuration={800} />
        <Bar dataKey="required" name="Role requires" fill={colors.accent} radius={[4, 4, 0, 0]} animationDuration={1000} />
      </BarChart>
    </ResponsiveContainer>
  );
}
