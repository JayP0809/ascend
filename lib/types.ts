export interface Role {
  id: string;
  title: string;
  industry: string;
  demandLevel: 'High' | 'Medium' | 'Low';
  avgSalary: string;
  icon: string;
  requiredSkillCount: number;
}

export interface SkillRecord {
  id: string;
  analysisId: string;
  skillName: string;
  category: 'technical' | 'soft' | 'tools' | 'certifications';
  hasSkill: boolean;
  importance: 'critical' | 'nice-to-have' | 'transferable' | 'has';
}

export interface RoadmapPhase {
  id: string;
  analysisId: string;
  weekStart: number;
  weekEnd: number;
  focusArea: string;
  topics: string[];
  resources: Resource[];
  project: Project;
  milestone: string;
}

export interface Resource {
  title: string;
  url: string;
  type: 'Video' | 'Docs' | 'Course' | 'Article' | 'Book';
}

export interface Project {
  title: string;
  description: string;
  tech: string[];
  hours: number;
}

export interface SkillExtraction {
  current_skills: string[];
  experience_years: number;
  strengths: string[];
  education: string;
  top_titles: string[];
}

export interface RoleRequirements {
  required_skills: string[];
  nice_to_have: string[];
  categories: {
    technical: string[];
    soft: string[];
    tools: string[];
    certifications: string[];
  };
  typical_timeline_months: number;
  avg_salary: string;
  demand_level: 'High' | 'Medium' | 'Low';
}

export interface GapAnalysis {
  missing_critical: string[];
  missing_nice: string[];
  transferable: string[];
  readiness_score: number;
  strengths_summary: string;
  biggest_gap: string;
}

export interface RoadmapWeek {
  week_start: number;
  week_end: number;
  focus_area: string;
  topics: string[];
  resources: Resource[];
  project: Project;
  milestone: string;
}

export interface AnalysisResult {
  analysisId: string;
  targetRole: string;
  skillExtraction: SkillExtraction;
  roleRequirements: RoleRequirements;
  gapAnalysis: GapAnalysis;
  roadmap: RoadmapWeek[];
  isDemoMode: boolean;
  createdAt: string;
}

export interface AnalysisRecord {
  id: string;
  created_at: string;
  resume_text: string;
  target_role: string;
  job_description: string | null;
  readiness_score: number;
  result_json: string;
}

export interface CommunityEntry {
  id: string;
  target_role: string;
  readiness_score: number;
  top_gap: string;
  created_at: string;
  is_public: number;
}

export interface SkillGapItem {
  name: string;
  category: string;
  importance: 'critical' | 'nice-to-have' | 'transferable' | 'has';
  demandTrend: 'up' | 'flat' | 'down';
}

export interface DashboardData {
  analysis: AnalysisResult;
  skillGapItems: SkillGapItem[];
  progressionData: { week: number; readiness: number }[];
  marketDemandData: { skill: string; demand: number; hasSkill: boolean }[];
  distributionData: { name: string; value: number; color: string }[];
}
