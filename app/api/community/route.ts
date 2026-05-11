import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DEMO_COMMUNITY = [
  { id: '1', target_role: 'DevOps Engineer', readiness_score: 67, top_gap: 'Docker', created_at: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: '2', target_role: 'Data Scientist', readiness_score: 72, top_gap: 'Machine Learning', created_at: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: '3', target_role: 'Product Manager', readiness_score: 81, top_gap: 'Product Strategy', created_at: new Date(Date.now() - 18 * 60000).toISOString() },
  { id: '4', target_role: 'Cloud Architect', readiness_score: 55, top_gap: 'Kubernetes', created_at: new Date(Date.now() - 25 * 60000).toISOString() },
  { id: '5', target_role: 'ML Engineer', readiness_score: 63, top_gap: 'PyTorch', created_at: new Date(Date.now() - 35 * 60000).toISOString() },
  { id: '6', target_role: 'UX Designer', readiness_score: 78, top_gap: 'Figma', created_at: new Date(Date.now() - 42 * 60000).toISOString() },
  { id: '7', target_role: 'Financial Analyst', readiness_score: 85, top_gap: 'Excel Modeling', created_at: new Date(Date.now() - 55 * 60000).toISOString() },
  { id: '8', target_role: 'Cybersecurity Analyst', readiness_score: 60, top_gap: 'Penetration Testing', created_at: new Date(Date.now() - 68 * 60000).toISOString() },
];

const DEMO_TRENDING = [
  { skill: 'Docker', count: 42 },
  { skill: 'Kubernetes', count: 38 },
  { skill: 'Python', count: 35 },
  { skill: 'Machine Learning', count: 31 },
  { skill: 'Terraform', count: 28 },
  { skill: 'React', count: 25 },
  { skill: 'SQL', count: 22 },
  { skill: 'AWS', count: 20 },
];

const DEMO_POPULAR_ROLES = [
  { role: 'DevOps Engineer', count: 156 },
  { role: 'Data Scientist', count: 142 },
  { role: 'Product Manager', count: 128 },
  { role: 'ML Engineer', count: 115 },
  { role: 'Cloud Architect', count: 98 },
  { role: 'Full Stack Developer', count: 87 },
  { role: 'Cybersecurity Analyst', count: 76 },
  { role: 'UX Designer', count: 65 },
  { role: 'Financial Analyst', count: 54 },
  { role: 'Business Analyst', count: 48 },
];

export async function GET(): Promise<NextResponse> {
  try {
    let entries = db.getCommunityEntries(20);
    let trending = db.getTrendingSkills();
    let popularRoles = db.getPopularRoles();

    if (entries.length < 5) {
      entries = [...DEMO_COMMUNITY, ...entries].slice(0, 20) as typeof entries;
    }
    if (trending.length < 5) {
      trending = DEMO_TRENDING;
    }
    if (popularRoles.length < 5) {
      popularRoles = DEMO_POPULAR_ROLES;
    }

    return NextResponse.json({ entries, trending, popularRoles });
  } catch {
    return NextResponse.json({
      entries: DEMO_COMMUNITY,
      trending: DEMO_TRENDING,
      popularRoles: DEMO_POPULAR_ROLES,
    });
  }
}
