import { NextResponse } from 'next/server';
import { getCommunityEntries, getTrendingSkills, getPopularRoles } from '@/lib/db';

// Fixed base time — stable anchor prevents SSR/client hydration mismatches.
// Illustrative sample entries, not real user data.
const DEMO_BASE_MS = new Date('2025-11-13T12:00:00.000Z').getTime();

const DEMO_COMMUNITY = [
  { id: 'demo-1', target_role: 'DevOps Engineer',         readiness_score: 67, top_gap: 'Docker',              created_at: new Date(DEMO_BASE_MS -  5 * 60000).toISOString() },
  { id: 'demo-2', target_role: 'Data Scientist',          readiness_score: 72, top_gap: 'Machine Learning',    created_at: new Date(DEMO_BASE_MS - 12 * 60000).toISOString() },
  { id: 'demo-3', target_role: 'Product Manager',         readiness_score: 81, top_gap: 'Product Strategy',   created_at: new Date(DEMO_BASE_MS - 18 * 60000).toISOString() },
  { id: 'demo-4', target_role: 'Cloud Architect',         readiness_score: 55, top_gap: 'Kubernetes',         created_at: new Date(DEMO_BASE_MS - 25 * 60000).toISOString() },
  { id: 'demo-5', target_role: 'ML Engineer',             readiness_score: 63, top_gap: 'PyTorch',            created_at: new Date(DEMO_BASE_MS - 35 * 60000).toISOString() },
  { id: 'demo-6', target_role: 'UX Designer',             readiness_score: 78, top_gap: 'Figma',              created_at: new Date(DEMO_BASE_MS - 42 * 60000).toISOString() },
  { id: 'demo-7', target_role: 'Financial Analyst',       readiness_score: 85, top_gap: 'Excel Modeling',     created_at: new Date(DEMO_BASE_MS - 55 * 60000).toISOString() },
  { id: 'demo-8', target_role: 'Cybersecurity Analyst',   readiness_score: 60, top_gap: 'Penetration Testing',created_at: new Date(DEMO_BASE_MS - 68 * 60000).toISOString() },
];

const DEMO_TRENDING = [
  { skill: 'Docker',           count: 42 },
  { skill: 'Kubernetes',       count: 38 },
  { skill: 'Python',           count: 35 },
  { skill: 'Machine Learning', count: 31 },
  { skill: 'Terraform',        count: 28 },
  { skill: 'React',            count: 25 },
  { skill: 'SQL',              count: 22 },
  { skill: 'AWS',              count: 20 },
];

const DEMO_POPULAR_ROLES = [
  { role: 'DevOps Engineer',         count: 156 },
  { role: 'Data Scientist',          count: 142 },
  { role: 'Product Manager',         count: 128 },
  { role: 'ML Engineer',             count: 115 },
  { role: 'Cloud Architect',         count:  98 },
  { role: 'Full Stack Developer',    count:  87 },
  { role: 'Cybersecurity Analyst',   count:  76 },
  { role: 'UX Designer',             count:  65 },
  { role: 'Financial Analyst',       count:  54 },
  { role: 'Business Analyst',        count:  48 },
];

export async function GET(): Promise<NextResponse> {
  try {
    const [rawEntries, trending, popularRoles] = await Promise.all([
      getCommunityEntries(20),
      getTrendingSkills(),
      getPopularRoles(),
    ]);

    // Normalize DB rows — created_at may be a Date object from Drizzle
    const entries = rawEntries.map((e) => ({
      ...e,
      created_at: e.created_at instanceof Date ? e.created_at.toISOString() : e.created_at,
    }));

    return NextResponse.json({
      entries:     entries.length < 5 ? [...DEMO_COMMUNITY, ...entries].slice(0, 20) : entries,
      trending:    trending.length  < 5 ? DEMO_TRENDING     : trending,
      popularRoles: popularRoles.length < 5 ? DEMO_POPULAR_ROLES : popularRoles,
    });
  } catch {
    return NextResponse.json({
      entries:      DEMO_COMMUNITY,
      trending:     DEMO_TRENDING,
      popularRoles: DEMO_POPULAR_ROLES,
    });
  }
}
