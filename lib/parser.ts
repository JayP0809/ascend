export async function parseResume(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf' || mimeType.includes('pdf')) {
    return parsePdf(buffer);
  }
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType.includes('docx') ||
    mimeType.includes('word')
  ) {
    return parseDocx(buffer);
  }
  if (mimeType === 'text/plain') {
    return buffer.toString('utf-8');
  }
  throw new Error(`Unsupported file type: ${mimeType}`);
}

async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid issues with Next.js bundling
    const pdfParse = (await import('pdf-parse')).default;
    const result = await pdfParse(buffer);
    return result.text.trim();
  } catch {
    throw new Error('Failed to parse PDF. Please ensure the file is not password protected.');
  }
}

async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  } catch {
    throw new Error('Failed to parse DOCX file. Please ensure the file is valid.');
  }
}

export function truncateText(text: string, maxChars = 8000): string {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + '\n[Resume truncated for processing]';
}
