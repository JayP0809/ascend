'use client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface PieData {
  name: string;
  value: number;
  color: string;
  count: number;
}

interface SkillDistributionPieProps {
  data: PieData[];
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: PieData }[] }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const noun = item.payload.name === 'Certifications' ? 'items' : 'skills';
  return (
    <div className="rounded border p-2.5 text-xs" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow)' }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="h-2 w-2 rounded-sm flex-shrink-0" style={{ background: item.payload.color }} />
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.name}</span>
      </div>
      <p style={{ color: 'var(--text-secondary)', paddingLeft: 14 }}>
        {item.payload.count} {noun} ({item.value}%)
      </p>
    </div>
  );
};

export function SkillDistributionPie({ data }: SkillDistributionPieProps) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend below chart — theme-adaptive text */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="h-2 w-2 rounded-sm flex-shrink-0" style={{ background: entry.color }} />
            {entry.name} {entry.value > 0 && <span style={{ color: 'var(--text-muted)' }}>{entry.value}%</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
