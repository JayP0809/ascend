import { NextRequest, NextResponse } from 'next/server';
import { getAnalysis } from '@/lib/db';
import { getDemoData } from '@/lib/ai';
import { getCurrentUser, checkAnalysisAccess } from '@/lib/auth';
import { AnalysisResult } from '@/lib/types';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Analysis ID required' }, { status: 400 });
  }

  // Demo IDs are always public — no DB, no auth check.
  if (id.startsWith('demo-')) {
    return NextResponse.json({ result: getDemoData(id) });
  }

  const record = await getAnalysis(id);
  if (!record) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  // Identical authorization to GET /api/analyze: ownership required,
  // fail-closed in production without Clerk, dev bypass in local dev only.
  const user = await getCurrentUser(request);
  const access = checkAnalysisAccess(record, user);
  if (!access.granted) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  let result: AnalysisResult;
  try {
    result = JSON.parse(record.result_json);
    if (!result.skillExtraction) {
      result = getDemoData(id, record.target_role);
    }
  } catch {
    result = getDemoData(id);
  }

  return NextResponse.json({ result });
}
