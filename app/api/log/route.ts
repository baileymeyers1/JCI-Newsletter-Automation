import { NextRequest, NextResponse } from 'next/server';
import { getSheetRows } from '@/lib/sheets';
import { requireAuth } from '@/lib/auth';

const SHEET = 'Log';

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const rows = await getSheetRows(SHEET);
    return NextResponse.json({ rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
