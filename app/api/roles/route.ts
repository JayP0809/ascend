import { NextRequest, NextResponse } from 'next/server';
import { searchRoles } from '@/lib/roles';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const roles = searchRoles(query);
  return NextResponse.json({ roles });
}
