import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { runAnalysis, getDemoData, isLiveMode } from '@/lib/ai';
import { buildDashboardData } from '@/lib/scorer';
import { AnalysisResult } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const analyzeBodySchema = z.object({
  analysisId: z.string().uuid().optional(),
  targetRole: z.string().min(1, 'Target role is required').max(200),
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

    // Check if this is a demo flow
    const isDemoFlow = !isLiveMode() || analysisId?.startsWith('demo-');

    let result: AnalysisResult;

    if (isDemoFlow) {
      const newId = analysisId || uuidv4();
      result = getDemoData(newId, targetRole);
    } else {
      // Fetch existing resume text
      if (!analysisId) {
        return NextResponse.json({ error: 'Analysis ID is required for live mode' }, { status: 400 });
      }
      const existing = db.getAnalysis(analysisId);
      if (!existing) {
        return NextResponse.json({ error: 'Analysis not found. Please upload resume again.' }, { status: 404 });
      }

      const resumeText = existing.resume_text || '';

      result = await runAnalysis(analysisId, resumeText, targetRole, jobDescription);
    }

    const dashboard = buildDashboardData(result);
    const resultJson = JSON.stringify(result);

    db.saveAnalysis(
      result.analysisId,
      result.skillExtraction.current_skills.join(', '),
      targetRole,
      jobDescription || null,
      result.gapAnalysis.readiness_score,
      resultJson
    );

    // Save to community (anonymized)
    const topGap = result.gapAnalysis.missing_critical[0] || 'N/A';
    try {
      db.saveCommunityEntry(
        uuidv4(),
        targetRole,
        result.gapAnalysis.readiness_score,
        topGap
      );
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      analysisId: result.analysisId,
      dashboard,
      isDemoMode: result.isDemoMode,
    });
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

  // Check for demo ID
  if (id.startsWith('demo-')) {
    const result = getDemoData(id);
    const dashboard = buildDashboardData(result);
    return NextResponse.json({ analysisId: id, dashboard, isDemoMode: true });
  }

  const record = db.getAnalysis(id);
  if (!record) {
    return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
  }

  try {
    const result: AnalysisResult = JSON.parse(record.result_json);
    if (!result.skillExtraction) {
      // Analysis is still pending (POST not yet complete) - tell the poller to keep waiting
      return NextResponse.json({ pending: true }, { status: 202 });
    }
    const dashboard = buildDashboardData(result);
    return NextResponse.json({ analysisId: id, dashboard, isDemoMode: result.isDemoMode });
  } catch {
    return NextResponse.json({ pending: true }, { status: 202 });
  }
}
