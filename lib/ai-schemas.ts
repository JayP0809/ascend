import { z } from 'zod';

// ---------------------------------------------------------------------------
// Prompt versioning
// Bump PROMPT_VERSION when any prompt text changes so eval results stay
// traceable to the exact prompt that generated them.
// ---------------------------------------------------------------------------
export const PROMPT_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Zod schemas for every structured AI response
// ---------------------------------------------------------------------------

export const SkillExtractionSchema = z.object({
  current_skills: z.array(z.string()).min(1, 'At least one skill required'),
  experience_years: z.number().int().min(0).max(60),
  strengths: z.array(z.string()).min(1),
  education: z.string().min(1),
  top_titles: z.array(z.string()).min(1),
});

export const RoleRequirementsSchema = z.object({
  required_skills: z.array(z.string()).min(1),
  nice_to_have: z.array(z.string()),
  categories: z.object({
    technical: z.array(z.string()),
    soft: z.array(z.string()),
    tools: z.array(z.string()),
    certifications: z.array(z.string()),
  }),
  typical_timeline_months: z.number().int().min(1).max(60),
  avg_salary: z.string(),
  demand_level: z.enum(['High', 'Medium', 'Low']),
});

export const GapAnalysisSchema = z.object({
  missing_critical: z.array(z.string()),
  missing_nice: z.array(z.string()),
  transferable: z.array(z.string()),
  readiness_score: z.number().int().min(0).max(100),
  strengths_summary: z.string().min(1),
  biggest_gap: z.string().min(1),
});

export const ResourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  type: z.enum(['Video', 'Docs', 'Course', 'Article', 'Book']),
});

export const ProjectSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  tech: z.array(z.string()),
  hours: z.number().int().min(1),
});

export const RoadmapWeekSchema = z.object({
  week_start: z.number().int().min(1),
  week_end: z.number().int().min(1),
  focus_area: z.string().min(1),
  topics: z.array(z.string()).min(1),
  resources: z.array(ResourceSchema),
  project: ProjectSchema,
  milestone: z.string().min(1),
});

export const RoadmapResponseSchema = z.object({
  weeks: z.array(RoadmapWeekSchema).min(1),
});

// ---------------------------------------------------------------------------
// Inferred TypeScript types from schemas
// ---------------------------------------------------------------------------
export type ValidatedSkillExtraction = z.infer<typeof SkillExtractionSchema>;
export type ValidatedRoleRequirements = z.infer<typeof RoleRequirementsSchema>;
export type ValidatedGapAnalysis = z.infer<typeof GapAnalysisSchema>;
export type ValidatedRoadmapWeek = z.infer<typeof RoadmapWeekSchema>;
