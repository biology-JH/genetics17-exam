import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Track } from '../src/types.js';

const SESSION_TTL_SECONDS = 12 * 60 * 60;

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isTrack(value: unknown): value is Track {
  return value === 'Core' || value === 'Extended';
}

export function matchesConfiguredPassword(candidate: unknown, configured: string | undefined): boolean {
  if (typeof candidate !== 'string' || !configured) return false;
  return safeEqual(candidate, configured);
}

function signature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionToken(secret: string, track: Track): string {
  const payload = Buffer.from(JSON.stringify({
    scope: 'genetics17-exam',
    track,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  })).toString('base64url');
  return `${payload}.${signature(payload, secret)}`;
}

export function getSessionTrack(request: IncomingMessage, secret: string | undefined): Track | null {
  if (!secret) return null;
  const raw = request.headers.authorization;
  if (!raw?.startsWith('Bearer ')) return null;
  const token = raw.slice(7).trim();
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;
  const payload = token.slice(0, separator);
  const suppliedSignature = token.slice(separator + 1);
  try {
    const expectedSignature = signature(payload, secret);
    if (!safeEqual(suppliedSignature, expectedSignature)) return null;
    const claims: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!claims || typeof claims !== 'object') return null;
    const values = claims as { scope?: unknown; track?: unknown; exp?: unknown };
    if (values.scope !== 'genetics17-exam' || !isTrack(values.track)) return null;
    if (typeof values.exp !== 'number' || values.exp <= Math.floor(Date.now() / 1000)) return null;
    return values.track;
  } catch {
    return null;
  }
}

export function hasValidSession(request: IncomingMessage, secret: string | undefined): boolean {
  return getSessionTrack(request, secret) !== null;
}
