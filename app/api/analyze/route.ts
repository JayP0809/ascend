import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { saveAnalysis, getAnalysis, saveCommunityEntry } from '@/lib/db';
import { runAnalysis, getDemoData, isLiveMode } from '@/lib/ai';
import { buildDashboardData } from '@/lib/scorer';
import { getCurrentUser, checkAnalysisAccess, DEV_BYPASS_ACTIVE, CLERK_CONFIGURED } from '@/lib/auth';
import { reserveQuotaSlot } from '@/lib/quota';
import { AnalysisResult } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const analyzeBodySchema = z.object({
  analysisId:     z.string().uuid().optional(),
  targetRole:     z.string().min(1, 'Target role is required').max(200),
  jobDescription: z.string().max(5000).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.json().catch(() => null);
    if (rawBody === null) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = analyzeBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }

    const { analysisId, targetRole, jobDescription } = parsed.data;
    const isDemoFlow = !isLiveMode() || !!analysisId?.startsWith('demo-');

    // Demo flows bypass all authentication and quota checks.
    if (isDemoFlow) {
      const result = getDemoData(analysisId || uuidv4(), targetRole);
      const dashboard = buildDashboardData(result);
      await saveAnalysis(
        result.analysisId,
        result.skillExtraction.current_skills.join(', '),
        targetRole,
        jobDescription ?? null,
        result.gapAnalysis.readiness_score,
        JSON.stringify(result),
        { isDemoMode: true }
      );
      return NextResponse.json({ analysisId: result.analysisId, dashboard, isDemoMode: true });
    }

    // Live flow requires a session when Clerk is configured OR fail-closed in production.
    // DEV_BYPASS_ACTIVE = Clerk absent + non-production: skip auth for local dev.
    const user = await getCurrentUser(request);

    if (!DEV_BYPASS_ACTIVE && !user) {
      // Misconfigured production (CLERK not configured) is handled by the 503 path:
      if (!CLERK_CONFIGURED && process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Authentication service is not configured. Contact the site administrator.' },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to run an analysis.' },
        { status: 401 }
      );
    }

    // Atomically reserve a quota slot before touching Groq.
    // If Groq subsequently fails, the slot is consumed intentionally —
    // this prevents indefinite retries from bypassing per-user limits.
    const quota = await reserveQuotaSlot(user?.userId ?? null, false);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: quota.message ?? 'Monthly analysis quota exceeded.' },
        { status: 429 }
      );
    }

    if (!analysisId) {
      return NextResponse.json({ error: 'Analysis ID is required for live mode' }, { status: 400 });
    }

    const existing = await getAnalysis(analysisId);
    if (!existing) {
      return NextResponse.json({ error: 'Analysis not found. Please upload resume again.' }, { status: 404 });
    }

    const result = await runAnalysis(analysisId, existing.resume_text, targetRole, jobDescription);
    const dashboard = buildDashboardData(result);

    await saveAnalysis(
      result.analysisId,
      result.skillExtraction.current_skills.join(', '),
      targetRole,
      jobDescription ?? null,
      result.gapAnalysis.readiness_score,
      JSON.stringify(result),
      { isDemoMode: false, userId: user?.userId }
    );

    // Anonymized community entry — fire and forget
    const topGap = result.gapAnalysis.missing_critical[0] || 'N/A';
    saveCommunityEntry(uuidv4(), targetRole, result.gapAnalysis.readiness_score, topGap, result.analysisId)
      .catch(() => { /* non-fatal */ });

    return NextResponse.json({ analysisId: result.analysisId, dashboard, isDemoMode: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Analysis ID required' }, { status: 400 });
  }

  // Demo IDs are served from in-memory data — no DB lookup, no auth required.
  if (id.startsWith('demo-')) {
    const result = getDemoData(id);
    return NextResponse.json({ analysisId: id, dashboard: buildDashboardData(result), isDemoMode: true });
  }

  const record = await getAnalysis(id);
  if (!record) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  const user = await getCurrentUser(request);
  const access = checkAnalysisAccess(record, user);
  if (!access.granted) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  try {
    const result: AnalysisResult = JSON.parse(record.result_json);
    if (!result.skillExtraction) {
      return NextResponse.json({ pending: true }, { status: 202 });
    }
    return NextResponse.json({ analysisId: id, dashboard: buildDashboardData(result), isDemoMode: result.isDemoMode });
  } catch {
    return NextResponse.json({ pending: true }, { status: 202 });
  }
}
