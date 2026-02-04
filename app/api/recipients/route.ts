import { NextRequest, NextResponse } from 'next/server';
import { appendRow, getSheetRows } from '@/lib/sheets';
import { requireAuth } from '@/lib/auth';

const SHEET = 'Recipients';

function makeId(clientId: string | number, email: string | number): string {
  return `${String(clientId)}||${String(email)}`;
}

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const rows = await getSheetRows(SHEET);
    const withIds = rows.map((row) => ({
      ...row,
      id: makeId(row.client_id || '', row.email || '')
    }));
    return NextResponse.json({ rows: withIds });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
    const body = await req.json();
    await appendRow(SHEET, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
