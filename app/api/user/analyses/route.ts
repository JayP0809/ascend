import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, AUTH_CONFIGURED, DEV_BYPASS_ACTIVE } from '@/lib/auth';
import { getUserAnalyses, deleteAnalysis } from '@/lib/db';

// Matches the UUID format used by the analyses table primary key.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/user/analyses
 *
 * Returns the authenticated user's saved analyses (most recent first, limit 10).
 * Each row: { id, target_role, readiness_score, created_at }
 *
 * Returns 401 when unauthenticated (auth enabled), or empty array in demo/dev-bypass mode.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!AUTH_CONFIGURED) {
    return NextResponse.json({ analyses: [] });
  }

  const user = await getCurrentUser(request);

  if (!DEV_BYPASS_ACTIVE && !user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ analyses: [] });
  }

  const analyses = await getUserAnalyses(user.userId, 10);
  return NextResponse.json({ analyses });
}

/**
 * DELETE /api/user/analyses
 *
 * Deletes a single analysis belonging to the authenticated user.
 * Body: { analysisId: string }
 *
 * Returns 204 on success, 400 for bad input, 401 for unauthenticated,
 * 403 in demo mode, 404 when the analysis is not found or not owned,
 * 500 when the database operation fails.
 *
 * The user ID is ALWAYS sourced from the JWT session cookie via
 * getCurrentUser(). The browser never supplies the user ID.
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!AUTH_CONFIGURED) {
    return NextResponse.json({ error: 'Not available in demo mode.' }, { status: 403 });
  }

  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const rawId = (body as Record<string, unknown>).analysisId;
  const analysisId = typeof rawId === 'string' ? rawId.trim() : '';

  if (!analysisId) {
    return NextResponse.json({ error: 'analysisId is required.' }, { status: 400 });
  }

  if (!UUID_RE.test(analysisId)) {
    return NextResponse.json({ error: 'Invalid analysis ID format.' }, { status: 400 });
  }

  try {
    const deleted = await deleteAnalysis(analysisId, user.userId);
    if (!deleted) {
      return NextResponse.json({ error: 'Analysis not found.' }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Failed to delete analysis. Please try again.' }, { status: 500 });
  }
}
