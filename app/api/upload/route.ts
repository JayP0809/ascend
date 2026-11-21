import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { parseResume, truncateText } from '@/lib/parser';
import { saveAnalysis } from '@/lib/db';
import { isLiveMode } from '@/lib/ai';
import { getCurrentUser, DEV_BYPASS_ACTIVE } from '@/lib/auth';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_EXTENSIONS = /\.(pdf|docx|doc|txt)$/i;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'application/octet-stream',
]);

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;

  const isPdf      = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  const isZip      = buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  const isDocLegacy = buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;

  if (mimeType === 'application/pdf') return isPdf;
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return isZip;
  if (mimeType === 'application/msword') return isDocLegacy || isZip;
  if (mimeType === 'text/plain') return true;

  return isPdf || isZip || isDocLegacy;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Live mode: require authentication before reading any file data.
  const user = await getCurrentUser(request);
  if (isLiveMode() && !DEV_BYPASS_ACTIVE && !user) {
    return NextResponse.json(
      { error: 'Sign in to upload your resume.' },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('resume') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_EXTENSIONS.test(file.name)) {
      return NextResponse.json(
        { error: 'Only PDF, DOCX, DOC, or TXT files are accepted.' },
        { status: 422 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File exceeds the 5 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB received).` },
        { status: 422 }
      );
    }

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || 'application/octet-stream';

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Upload a PDF, DOCX, or TXT file.' },
        { status: 422 }
      );
    }

    if (!validateMagicBytes(buffer, mimeType)) {
      return NextResponse.json(
        { error: 'File content does not match the declared type. Please upload a valid PDF, DOCX, or TXT file.' },
        { status: 422 }
      );
    }

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
    const truncated  = truncateText(resumeText, 8000);

    // Save resume text and bind to the authenticated user.
    // Ownership is established at upload time so /api/analyze and /api/export
    // can enforce IDOR checks without relying on a later binding step.
    await saveAnalysis(analysisId, truncated, '', null, 0, '{}', { userId: user?.userId });

    return NextResponse.json({
      analysisId,
      wordCount:  truncated.split(/\s+/).length,
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
  return NextResponse.json({ analysisId: 'demo-sample-001', isDemoMode: true });
}
