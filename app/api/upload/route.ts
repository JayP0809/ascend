import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { parseResume, truncateText } from '@/lib/parser';
import { db } from '@/lib/db';
import { getDemoData, isLiveMode } from '@/lib/ai';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('resume') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || 'application/pdf';

    let resumeText: string;
    try {
      resumeText = await parseResume(buffer, mimeType);
    } catch (parseError) {
      return NextResponse.json(
        { error: parseError instanceof Error ? parseError.message : 'Failed to parse file' },
        { status: 422 }
      );
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Could not extract meaningful text from the file. Try a different format.' },
        { status: 422 }
      );
    }

    const analysisId = uuidv4();
    const truncated = truncateText(resumeText, 8000);

    // Save resume text temporarily
    db.saveAnalysis(analysisId, truncated, '', null, 0, '{}');

    return NextResponse.json({
      analysisId,
      wordCount: truncated.split(/\s+/).length,
      isDemoMode: !isLiveMode(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  // Return demo analysis ID for sample resume flow
  const demoId = 'demo-sample-001';
  return NextResponse.json({ analysisId: demoId, isDemoMode: true });
}
