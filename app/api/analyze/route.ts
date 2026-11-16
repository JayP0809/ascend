import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { saveAnalysis, getAnalysis, saveCommunityEntry } from '@/lib/db';
import { runAnalysis, getDemoData, isLiveMode, GroqTimeoutError, GroqTruncationError, GroqValidationError, RoadmapAssemblyError } from '@/lib/ai';
import { buildDashboardData } from '@/lib/scorer';
import { getCurrentUser, checkAnalysisAccess, DEV_BYPASS_ACTIVE, CLERK_CONFIGURED } from '@/lib/auth';
import { reserveQuotaSlot, refundQuotaSlot } from '@/lib/quota';
import { AnalysisResult } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// In-flight dedup guard
// Prevents double-click / duplicate concurrent submissions from burning two
// quota slots for the same analysis ID.  In-process only — a module-level
// Set is sufficient for local dev and a single-process server.  For
// serverless multi-process environments this would need Upstash Redis.
// ---------------------------------------------------------------------------
const inFlightAnalyses = new Set<string>();

const analyzeBodySchema = z.object({
  // Accept a real UUID for authenticated live-mode analyses, OR a demo-* prefixed
  // ID for public demo flows.  Real UUID validation is NOT weakened — the union
  // only adds the well-scoped demo prefix pattern.
  analysisId: z.union([
    z.string().uuid(),
    z.string().regex(/^demo-[a-z0-9-]+$/i, 'Invalid analysis ID format'),
  ]).optional(),
  targetRole:     z.string().min(1, 'Target role is required').max(200),
  jobDescription: z.string().max(5000).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  // Demo flows bypass all authentication, quota, and dedup checks.
  // Demo analyses are stateless and always served from getDemoData() — no DB save.
  if (isDemoFlow) {
    const result = getDemoData(analysisId || uuidv4(), targetRole);
    const dashboard = buildDashboardData(result);
    return NextResponse.json({ analysisId: result.analysisId, dashboard, isDemoMode: true });
  }

  // Live flow requires a session when Clerk is configured OR fail-closed in production.
  const user = await getCurrentUser(request);

  if (!DEV_BYPASS_ACTIVE && !user) {
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

  if (!analysisId) {
    return NextResponse.json({ error: 'Analysis ID is required for live mode' }, { status: 400 });
  }

  // Fetch the analysis record BEFORE reserving a quota slot.
  // A "not found" or "already in-flight" error must not burn quota.
  const existing = await getAnalysis(analysisId);
  if (!existing) {
    return NextResponse.json({ error: 'Analysis not found. Please upload resume again.' }, { status: 404 });
  }

  // Dedup: reject a second concurrent request for the same analysis ID.
  if (inFlightAnalyses.has(analysisId)) {
    return NextResponse.json(
      { error: 'An analysis is already in progress for this resume. Please wait for it to complete.' },
      { status: 409 }
    );
  }

  // Atomically reserve a quota slot.  Admin accounts bypass the monthly limit
  // but their usage is still tracked.  The slot is REFUNDED (decremented) if
  // Groq subsequently fails — the user gets no value, so they should not pay
  // quota.  The slot is NOT refunded when Groq succeeds but a DB write fails
  // afterward, since the AI tokens were consumed regardless.
  const quota = await reserveQuotaSlot(user?.userId ?? null, false, user?.clerkId);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quota.message ?? 'Monthly analysis quota exceeded.' },
      { status: 429 }
    );
  }

  if (quota.adminExempt) {
    console.info('[quota] admin exemption used — slot tracked, limit not enforced');
  }

  // ── AI pipeline ────────────────────────────────────────────────────────────
  // Track whether Groq returned a usable result so the catch block knows
  // whether to refund the quota slot.
  inFlightAnalyses.add(analysisId);
  let groqSucceeded = false;
  try {
    const result = await runAnalysis(analysisId, existing.resume_text, targetRole, jobDescription);
    groqSucceeded = true; // past this line: AI tokens were consumed

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
    // Refund only when Groq never completed successfully.
    // DB write failures after a successful Groq response do NOT get a refund —
    // the AI tokens were consumed and the user may retry the DB save.
    if (!groqSucceeded) {
      refundQuotaSlot(user?.userId ?? null).catch(() => {});
    }

    if (error instanceof GroqTimeoutError) {
      return NextResponse.json(
        {
          error: error.message,
          retryable: true,
          hint: 'The AI service took too long. Your quota slot was refunded — you can try again.',
        },
        { status: 504 }
      );
    }
    if (error instanceof GroqTruncationError) {
      return NextResponse.json(
        {
          error: 'The AI response was too long and got cut off. Please report this issue.',
          retryable: false,
        },
        { status: 500 }
      );
    }
    if (error instanceof RoadmapAssemblyError) {
      return NextResponse.json(
        {
          error: 'Roadmap generation produced an inconsistent result. Please try again.',
          retryable: true,
        },
        { status: 500 }
      );
    }
    if (error instanceof GroqValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          retryable: true,
          hint: 'Your quota slot was refunded — you can try again.',
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  } finally {
    inFlightAnalyses.delete(analysisId);
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
