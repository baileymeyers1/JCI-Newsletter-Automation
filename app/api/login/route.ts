import { NextRequest, NextResponse } from 'next/server';
import { createSessionCookie, getPassword, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = String(body?.password || '');

  if (password !== getPassword()) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const session = createSessionCookie();
  setSessionCookie(session);

  return NextResponse.json({ ok: true });
}
