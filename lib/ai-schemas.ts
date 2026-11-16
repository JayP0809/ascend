import { z } from 'zod';
import { RESOURCE_TYPES, type ResourceType } from './types';

// ---------------------------------------------------------------------------
// Prompt versioning
// Bump PROMPT_VERSION when any prompt text changes so eval results stay
// traceable to the exact prompt that generated them.
// ---------------------------------------------------------------------------
// 1.3.0: employment level context added to role-requirements, gap-analysis,
//          and roadmap prompts; calibrates AI output for internship/co-op/entry-level
//          targets vs. full-time experienced roles.
// 1.4.0: removed demand_level from role-requirements prompt and schema (field
//          was unused in UI; model returned non-canonical values causing failures);
//          increased analyzeGap budget; capped missing_critical at 12 in roadmap
//          prompt; tightened internship instruction to prevent output verbosity.
export const PROMPT_VERSION = '1.4.0';

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
  // demand_level removed in v1.4.0: not used in UI, caused validation failures
  // when model returned non-canonical values ("Very High", "HIGH Demand", etc.)
});

export const GapAnalysisSchema = z.object({
  missing_critical: z.array(z.string()),
  missing_nice: z.array(z.string()),
  transferable: z.array(z.string()),
  readiness_score: z.number().int().min(0).max(100),
  strengths_summary: z.string().min(1),
  biggest_gap: z.string().min(1),
});

// Aliases the model commonly returns that are not in the canonical set.
// Keys are lower-cased; values are the canonical ResourceType to map to.
const RESOURCE_TYPE_ALIASES: Readonly<Record<string, ResourceType>> = {
  // → Docs
  documentation: 'Docs', reference: 'Docs', guide: 'Docs', tutorial: 'Docs',
  github: 'Docs', readme: 'Docs',
  // → Video
  youtube: 'Video', lecture: 'Video', screencast: 'Video', talk: 'Video', webinar: 'Video',
  // → Course
  mooc: 'Course', class: 'Course', specialization: 'Course', bootcamp: 'Course',
  udemy: 'Course', coursera: 'Course',
  // → Book
  textbook: 'Book', ebook: 'Book', manual: 'Book',
  // → Article (fallback for unrecognized values)
  blog: 'Article', post: 'Article', medium: 'Article',
  checklist: 'Article', cheatsheet: 'Article', paper: 'Article',
};

function normalizeResourceType(raw: string): ResourceType {
  const lower = raw.toLowerCase().trim();
  const exact = RESOURCE_TYPES.find((c) => c.toLowerCase() === lower);
  if (exact) return exact;
  return RESOURCE_TYPE_ALIASES[lower] ?? 'Article';
}

// resource.type is accepted as any non-empty string from the model and
// normalized to the canonical set via the transform above, so every resource
// renders correctly regardless of model output variation.
export const ResourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  type: z.string().min(1).transform(normalizeResourceType),
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

// Schema for a single roadmap batch.  Exactly 4 phases are required: the
// assembly step and fixWeeks() both assume this count, so Zod enforces it
// at parse time rather than waiting for a runtime assembly error.
export const RoadmapBatchSchema = z.object({
  weeks: z.array(RoadmapWeekSchema).length(4),
});

// ---------------------------------------------------------------------------
// Inferred TypeScript types from schemas
// ---------------------------------------------------------------------------
export type ValidatedSkillExtraction = z.infer<typeof SkillExtractionSchema>;
export type ValidatedRoleRequirements = z.infer<typeof RoleRequirementsSchema>;
export type ValidatedGapAnalysis = z.infer<typeof GapAnalysisSchema>;
export type ValidatedRoadmapWeek = z.infer<typeof RoadmapWeekSchema>;
export type ValidatedRoadmapBatch = z.infer<typeof RoadmapBatchSchema>;
