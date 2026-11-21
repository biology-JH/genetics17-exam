import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Session, Track } from '../src/types.js';

const SESSION_TTL_SECONDS = 12 * 60 * 60;

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isTrack(value: unknown): value is Track { return value === 'Core' || value === 'Extended'; }
export function isSession(value: unknown): value is Session { return value === '17.1' || value === '17.2' || value === '17.3' || value === '17.4'; }
export function matchesConfiguredPassword(candidate: unknown, configured: string | undefined): boolean {
  if (typeof candidate !== 'string' || !configured) return false;
  return safeEqual(candidate, configured);
}

function signature(payload: string, secret: string): string { return createHmac('sha256', secret).update(payload).digest('base64url'); }

export function createSessionToken(secret: string, track: Track, session: Session): string {
  const payload = Buffer.from(JSON.stringify({ scope: 'genetics17-exam', track, session, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })).toString('base64url');
  return `${payload}.${signature(payload, secret)}`;
}

export function getSessionContext(request: IncomingMessage, secret: string | undefined): { track: Track; session: Session } | null {
  if (!secret) return null;
  const raw = request.headers.authorization;
  if (!raw?.startsWith('Bearer ')) return null;
  const token = raw.slice(7).trim();
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;
  const payload = token.slice(0, separator);
  try {
    if (!safeEqual(token.slice(separator + 1), signature(payload, secret))) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { scope?: unknown; track?: unknown; session?: unknown; exp?: unknown };
    if (claims.scope !== 'genetics17-exam' || !isTrack(claims.track) || !isSession(claims.session) || typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return { track: claims.track, session: claims.session };
  } catch { return null; }
}
