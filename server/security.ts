import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

const SESSION_TTL_SECONDS = 12 * 60 * 60;

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function matchesConfiguredPassword(candidate: unknown, configured: string | undefined): boolean {
  if (typeof candidate !== 'string' || !configured) return false;
  return safeEqual(candidate, configured);
}

function signature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionToken(secret: string): string {
  const payload = Buffer.from(JSON.stringify({ scope: 'genetics17-exam', exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })).toString('base64url');
  return `${payload}.${signature(payload, secret)}`;
}

export function hasValidSession(request: IncomingMessage, secret: string | undefined): boolean {
  if (!secret) return false;
  const raw = request.headers.authorization;
  if (!raw?.startsWith('Bearer ')) return false;
  const token = raw.slice(7).trim();
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return false;
  const payload = token.slice(0, separator);
  const suppliedSignature = token.slice(separator + 1);
  let expectedSignature: string;
  try {
    expectedSignature = signature(payload, secret);
    if (!safeEqual(suppliedSignature, expectedSignature)) return false;
    const claims: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!claims || typeof claims !== 'object') return false;
    const values = claims as { scope?: unknown; exp?: unknown };
    return values.scope === 'genetics17-exam' && typeof values.exp === 'number' && values.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
