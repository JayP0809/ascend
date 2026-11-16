import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, AUTH_CONFIGURED, DEV_BYPASS_ACTIVE } from '@/lib/auth';
import { deleteUser, deleteUserAnalyses } from '@/lib/db';

/**
 * DELETE /api/user
 *
 * Permanently deletes the authenticated user's account and all associated data:
 * analyses, skill records, roadmap phases, ai_usage rows, and the user record.
 * Foreign key cascades in Neon handle child records automatically.
 *
 * Returns 204 No Content on success.
 * Returns 401 when unauthenticated, 503 when auth is misconfigured.
 *
 * Not available in demo mode (no user record to delete).
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser(request);

  if (!DEV_BYPASS_ACTIVE && !user) {
    if (!AUTH_CONFIGURED && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Authentication service is not configured.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 }
    );
  }

  if (!user) {
    // DEV_BYPASS_ACTIVE with no user — no DB record to delete.
    return NextResponse.json({ deleted: true }, { status: 200 });
  }

  // deleteUser cascades to analyses, skill_records, roadmap_phases, ai_usage.
  // deleteUserAnalyses is called first to handle any rows that may lack ON DELETE CASCADE
  // (belt-and-suspenders; the schema cascades should handle everything).
  await deleteUserAnalyses(user.userId);
  await deleteUser(user.userId);

  return new NextResponse(null, { status: 204 });
}
