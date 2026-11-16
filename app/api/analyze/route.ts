import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAnalysis, saveCommunityEntry, claimAnalysisSlot, releaseAnalysisClaim, updateAnalysisResult } from '@/lib/db';
import { runAnalysis, getDemoData, isLiveMode, GroqTimeoutError, GroqTruncationError, GroqValidationError, RoadmapAssemblyError } from '@/lib/ai';
import { buildDashboardData } from '@/lib/scorer';
import { getCurrentUser, checkAnalysisAccess, DEV_BYPASS_ACTIVE, AUTH_CONFIGURED } from '@/lib/auth';
import { reserveQuotaSlot, refundQuotaSlot, reserveGlobalQuotaSlot, refundGlobalQuotaSlot, GLOBAL_MONTHLY_ANALYSIS_QUOTA } from '@/lib/quota';
import { AnalysisResult } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// Tell Vercel to allow up to 60 seconds for this route (Hobby tier maximum).
// The AI pipeline runs 5 sequential/parallel Groq calls; typical latency is
// 15-30 seconds. If Groq is slow or retrying, the function may hit this limit.
// Users see a timeout error and their quota slot is refunded automatically.
// See docs/production-architecture-proposal.md for latency analysis.
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// In-memory dedup guard (fallback for pre-migration environments)
// When the status column is available (migration 0002 applied), claimAnalysisSlot()
// provides atomic cross-instance dedup via PostgreSQL. This Set is only used
// when that column is not yet present — it cannot guard across Vercel instances.
// ---------------------------------------------------------------------------
const inFlightAnalyses = new Set<string>();

const analyzeBodySchema = z.object({
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
  if (isDemoFlow) {
    const result = getDemoData(analysisId || uuidv4(), targetRole);
    const dashboard = buildDashboardData(result);
    return NextResponse.json({ analysisId: result.analysisId, dashboard, isDemoMode: true });
  }

  // Live flow requires a session when Auth.js is configured OR fail-closed in production.
  const user = await getCurrentUser(request);

  if (!DEV_BYPASS_ACTIVE && !user) {
    if (!AUTH_CONFIGURED && process.env.NODE_ENV === 'production') {
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

  // Fetch the analysis record BEFORE any quota or dedup reservation.
  // Not-found and ownership failures must not burn quota or global slots.
  const existing = await getAnalysis(analysisId);
  if (!existing) {
    return NextResponse.json({ error: 'Analysis not found. Please upload your resume again.' }, { status: 404 });
  }

  // Ownership check: the requesting user must own this record.
  // Enforced before any cached-result short-circuit so we do not leak another
  // user's completed analysis through the retry path.
  const uploadAccess = checkAnalysisAccess(existing, user);
  if (!uploadAccess.granted) {
    return NextResponse.json({ error: uploadAccess.message }, { status: uploadAccess.status });
  }

  // ── Idempotency: atomic DB claim (Items 2 & 3) ────────────────────────────
  // claimAnalysisSlot() does a single atomic UPDATE pending→processing.
  // It also re-claims stale 'processing' rows (another instance crashed).
  // Returns 'complete' or 'failed' when the row is already in a terminal state.
  const claim = await claimAnalysisSlot(analysisId);

  if (claim === 'complete') {
    // Another instance completed this analysis while we were waiting — return
    // the cached result rather than running Groq again.
    const recheckRecord = await getAnalysis(analysisId);
    if (recheckRecord?.result_json && recheckRecord.result_json !== '{}') {
      try {
        const cached: AnalysisResult = JSON.parse(recheckRecord.result_json);
        if (cached.skillExtraction) {
          return NextResponse.json({ analysisId: recheckRecord.id, dashboard: buildDashboardData(cached), isDemoMode: false });
        }
      } catch { /* fall through to re-run */ }
    }
  }

  if (claim === 'failed') {
    return NextResponse.json(
      { error: 'A previous analysis attempt failed permanently. Please upload your resume again.' },
      { status: 409 }
    );
  }

  if (claim === 'processing') {
    return NextResponse.json(
      { error: 'An analysis is already in progress for this resume. Please wait a moment, then refresh.' },
      { status: 409, headers: { 'Retry-After': '30' } }
    );
  }

  // 'unavailable': status column not yet migrated. Fall back to in-memory guard.
  const usingFallbackDedup = claim === 'unavailable';
  if (usingFallbackDedup) {
    if (inFlightAnalyses.has(analysisId)) {
      return NextResponse.json(
        { error: 'An analysis is already in progress for this resume. Please wait a moment, then refresh.' },
        { status: 409 }
      );
    }
    inFlightAnalyses.add(analysisId);
  }

  // ── Global Groq budget (Item 1) ───────────────────────────────────────────
  // Atomically reserve one global slot BEFORE calling Groq.
  // Counts attempts, not completions — failed requests that consumed provider
  // tokens still use the budget. Refunded on network/timeout errors that do
  // not reach Groq at all; NOT refunded on model validation failures (tokens
  // were consumed even if the structured output was malformed).
  const globalReservation = await reserveGlobalQuotaSlot(GLOBAL_MONTHLY_ANALYSIS_QUOTA);
  if (!globalReservation.allowed) {
    // Release the analysis claim so the user could retry next month.
    await releaseAnalysisClaim(analysisId, 'pending');
    if (usingFallbackDedup) inFlightAnalyses.delete(analysisId);
    return NextResponse.json(
      { error: globalReservation.message ?? 'Service temporarily unavailable. Please try demo mode or check back tomorrow.' },
      { status: 503 }
    );
  }

  // ── Per-user quota (atomic) ───────────────────────────────────────────────
  const quota = await reserveQuotaSlot(user?.userId ?? null, false, user?.email);
  if (!quota.allowed) {
    await releaseAnalysisClaim(analysisId, 'pending');
    await refundGlobalQuotaSlot();
    if (usingFallbackDedup) inFlightAnalyses.delete(analysisId);
    return NextResponse.json(
      { error: quota.message ?? 'Monthly analysis quota exceeded.' },
      { status: 429 }
    );
  }

  if (quota.adminExempt) {
    console.info('[quota] admin exemption used — slot tracked, limit not enforced');
  }

  // ── AI pipeline ────────────────────────────────────────────────────────────
  let groqSucceeded = false;
  try {
    const result = await runAnalysis(analysisId, existing.resume_text, targetRole, jobDescription);
    groqSucceeded = true; // AI tokens consumed past this point

    const dashboard = buildDashboardData(result);

    await updateAnalysisResult(
      result.analysisId,
      result.skillExtraction.current_skills.join(', '),
      targetRole,
      jobDescription ?? null,
      result.gapAnalysis.readiness_score,
      JSON.stringify(result),
      user?.userId,
    );

    // Anonymized community entry — fire and forget
    const topGap = result.gapAnalysis.missing_critical[0] || 'N/A';
    saveCommunityEntry(uuidv4(), targetRole, result.gapAnalysis.readiness_score, topGap, result.analysisId)
      .catch(() => { /* non-fatal */ });

    return NextResponse.json({ analysisId: result.analysisId, dashboard, isDemoMode: false });

  } catch (error) {
    // Determine what to refund and what state to leave the analysis in.
    const isRetryable =
      error instanceof GroqTimeoutError  ||
      error instanceof RoadmapAssemblyError;

    const isNonRetryable = error instanceof GroqTruncationError;

    // Refund Groq budget and per-user slot only when Groq never completed.
    // We do NOT refund on successful Groq + failed DB write, because AI
    // tokens were consumed regardless of the DB error.
    if (!groqSucceeded) {
      refundQuotaSlot(user?.userId ?? null).catch(() => {});
      // Refund global slot only for genuine network/timeout errors — not for
      // validation failures (the model ran and consumed tokens).
      if (isRetryable) {
        refundGlobalQuotaSlot().catch(() => {});
      }
    }

    // Reset analysis state so the user can retry (retryable), or mark as failed
    // so we don't attempt an obviously broken analysis again (non-retryable).
    await releaseAnalysisClaim(analysisId, isNonRetryable ? 'failed' : 'pending');
    if (usingFallbackDedup) inFlightAnalyses.delete(analysisId);

    if (error instanceof GroqTimeoutError) {
      return NextResponse.json(
        { error: error.message, retryable: true, hint: 'Your quota slot was refunded — you can try again.' },
        { status: 504 }
      );
    }
    if (error instanceof GroqTruncationError) {
      return NextResponse.json(
        { error: 'The AI response was cut off (token limit). Please report this issue.', retryable: false },
        { status: 500 }
      );
    }
    if (error instanceof RoadmapAssemblyError) {
      return NextResponse.json(
        { error: 'Roadmap generation produced an inconsistent result. Please try again.', retryable: true },
        { status: 500 }
      );
    }
    if (error instanceof GroqValidationError) {
      return NextResponse.json(
        { error: error.message, retryable: true, hint: 'Your quota slot was refunded — you can try again.' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  } finally {
    if (usingFallbackDedup) inFlightAnalyses.delete(analysisId);
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Analysis ID required' }, { status: 400 });
  }

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
