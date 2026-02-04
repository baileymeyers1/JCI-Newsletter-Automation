import { NextRequest, NextResponse } from 'next/server';
import { deleteRow, getSheetRows, updateRow } from '@/lib/sheets';
import { requireAuth } from '@/lib/auth';

const SHEET = 'Recipients';

function parseId(id: string) {
  const [clientId, email] = id.split('||');
  return { clientId, email };
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const { clientId, email } = parseId(params.id);
    const rows = await getSheetRows(SHEET);
    const target = rows.find((row) => row.client_id === clientId && row.email === email);
    if (!target || !target._rowNumber) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }
    const body = await req.json();
    await updateRow(SHEET, target._rowNumber, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAuth(req);
    const { clientId, email } = parseId(params.id);
    const rows = await getSheetRows(SHEET);
    const target = rows.find((row) => row.client_id === clientId && row.email === email);
    if (!target || !target._rowNumber) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }
    await deleteRow(SHEET, target._rowNumber);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
