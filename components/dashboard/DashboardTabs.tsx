'use client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { OverviewTab } from './OverviewTab';
import { SkillGapTab } from './SkillGapTab';
import { RoadmapTab } from './RoadmapTab';
import { InsightsTab } from './InsightsTab';
import { ExportTab } from './ExportTab';
import { DashboardData } from '@/lib/types';
import { LayoutDashboard, BookOpen, Map, TrendingUp, Download } from 'lucide-react';

interface DashboardTabsProps {
  data: DashboardData;
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'skills', label: 'Skill Gap', icon: BookOpen },
  { id: 'roadmap', label: 'Roadmap', icon: Map },
  { id: 'insights', label: 'Insights', icon: TrendingUp },
  { id: 'export', label: 'Export', icon: Download },
];

export function DashboardTabs({ data }: DashboardTabsProps) {
  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <div className="overflow-x-auto pb-1">
        <TabsList>
          {TABS.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id}>
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="overview">
        <OverviewTab data={data} />
      </TabsContent>
      <TabsContent value="skills">
        <SkillGapTab data={data} />
      </TabsContent>
      <TabsContent value="roadmap">
        <RoadmapTab data={data} />
      </TabsContent>
      <TabsContent value="insights">
        <InsightsTab data={data} />
      </TabsContent>
      <TabsContent value="export">
        <ExportTab data={data} />
      </TabsContent>
    </Tabs>
  );
}
