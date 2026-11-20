'use client';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { OverviewTab } from './OverviewTab';
import { SkillGapTab } from './SkillGapTab';
import { RoadmapTab } from './RoadmapTab';
import { InsightsTab } from './InsightsTab';
import { ExportTab } from './ExportTab';
import { DashboardData } from '@/lib/types';

interface DashboardTabsProps {
  data: DashboardData;
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'skills', label: 'Skill Gap' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'insights', label: 'Insights' },
  { id: 'export', label: 'Export' },
];

export function DashboardTabs({ data }: DashboardTabsProps) {
  return (
    <TabsPrimitive.Root defaultValue="overview">
      <TabsPrimitive.List className="dash-tab-list" aria-label="Analysis sections">
        {TABS.map(({ id, label }) => (
          <TabsPrimitive.Trigger
            key={id}
            value={id}
            data-tab-id={id}
            className="dash-tab"
          >
            {label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>

      <TabsPrimitive.Content value="overview" className="pt-8">
        <OverviewTab data={data} />
      </TabsPrimitive.Content>
      <TabsPrimitive.Content value="skills" className="pt-8">
        <SkillGapTab data={data} />
      </TabsPrimitive.Content>
      <TabsPrimitive.Content value="roadmap" className="pt-8">
        <RoadmapTab data={data} />
      </TabsPrimitive.Content>
      <TabsPrimitive.Content value="insights" className="pt-8">
        <InsightsTab data={data} />
      </TabsPrimitive.Content>
      <TabsPrimitive.Content value="export" className="pt-8">
        <ExportTab data={data} />
      </TabsPrimitive.Content>
    </TabsPrimitive.Root>
  );
}
