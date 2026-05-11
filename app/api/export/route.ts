import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDemoData } from '@/lib/ai';
import { AnalysisResult } from '@/lib/types';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Analysis ID required' }, { status: 400 });
  }

  let result: AnalysisResult;

  if (id.startsWith('demo-')) {
    result = getDemoData(id);
  } else {
    const record = db.getAnalysis(id);
    if (!record) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }
    try {
      result = JSON.parse(record.result_json);
      if (!result.skillExtraction) {
        result = getDemoData(id, record.target_role);
      }
    } catch {
      result = getDemoData(id);
    }
  }

  return NextResponse.json({ result });
}
