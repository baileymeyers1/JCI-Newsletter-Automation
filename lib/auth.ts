import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const COOKIE_NAME = 'client_portal_session';
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not set');
  }
  return secret;
}

export function createSessionCookie(): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const secret = getSecret();
  const hmac = crypto.createHmac('sha256', secret).update(String(timestamp)).digest('hex');
  return `${timestamp}.${hmac}`;
}

export function isValidSessionCookie(cookieValue: string | undefined | null): boolean {
  if (!cookieValue) return false;
  const [timestampStr, signature] = cookieValue.split('.');
  if (!timestampStr || !signature) return false;
  const timestamp = Number(timestampStr);
  if (!Number.isFinite(timestamp)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > MAX_AGE_SECONDS) return false;

  const secret = getSecret();
  const expected = crypto.createHmac('sha256', secret).update(String(timestamp)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function setSessionCookie(value: string): void {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_SECONDS,
    path: '/'
  });
}

export function clearSessionCookie(): void {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/'
  });
}

export function requireAuth(req: NextRequest): void {
  const cookieValue = req.cookies.get(COOKIE_NAME)?.value;
  if (!isValidSessionCookie(cookieValue)) {
    throw new Error('UNAUTHORIZED');
  }
}

export function hasValidSession(): boolean {
  const cookieValue = cookies().get(COOKIE_NAME)?.value;
  return isValidSessionCookie(cookieValue);
}

export function getPassword(): string {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    throw new Error('APP_PASSWORD is not set');
  }
  return password;
}
