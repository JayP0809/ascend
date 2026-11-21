import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, AUTH_CONFIGURED } from '@/lib/auth';
import { deleteUserAnalyses } from '@/lib/db';

/**
 * DELETE /api/user/analyses/all
 *
 * Permanently deletes every analysis owned by the authenticated user.
 * The user ID is resolved exclusively from the Auth.js JWT session cookie
 * via getCurrentUser(). It is never accepted from the request body or URL.
 *
 * Cascade effects (via FK constraints):
 *   skill_records, ai_usage, roadmap_phases → cascade-deleted
 *   community.analysis_id                  → SET NULL (anonymised entries retained)
 *   users, global_quota_buckets, settings  → untouched
 *
 * Returns 204 on success (including when the account has no analyses).
 * Returns 401 when unauthenticated, 403 in demo/no-auth mode, 500 on DB failure.
 * Idempotent: calling it twice returns 204 both times.
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!AUTH_CONFIGURED) {
    return NextResponse.json({ error: 'Not available in demo mode.' }, { status: 403 });
  }

  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    await deleteUserAnalyses(user.userId);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete analyses. Please try again.' },
      { status: 500 },
    );
  }
}
