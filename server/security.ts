import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { ActivityMode, RevisionDifficulty, Session, Track } from '../src/types.js';

const SESSION_TTL_SECONDS = 12 * 60 * 60;

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isTrack(value: unknown): value is Track { return value === 'Core' || value === 'Extended'; }
export function isSession(value: unknown): value is Session { return value === '17.1' || value === '17.2' || value === '17.3' || value === '17.4'; }
export function isActivityMode(value: unknown): value is ActivityMode { return value === 'weekly' || value === 'revision-mcq' || value === 'revision-long'; }
export function isRevisionDifficulty(value: unknown): value is RevisionDifficulty { return value === 'Easy' || value === 'Medium' || value === 'Hard'; }
export function matchesConfiguredPassword(candidate: unknown, configured: string | undefined): boolean {
  if (typeof candidate !== 'string' || !configured) return false;
  return safeEqual(candidate, configured);
}

function signature(payload: string, secret: string): string { return createHmac('sha256', secret).update(payload).digest('base64url'); }

export function createSessionToken(secret: string, track: Track, session: Session, mode: ActivityMode = 'weekly', difficulty?: RevisionDifficulty): string {
  if (!isActivityMode(mode) || (mode === 'revision-long' ? !isRevisionDifficulty(difficulty) : difficulty !== undefined)) throw new Error('Invalid activity binding.');
  const payload = Buffer.from(JSON.stringify({ scope: 'genetics17-exam', track, session, mode, ...(difficulty ? { difficulty } : {}), exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })).toString('base64url');
  return `${payload}.${signature(payload, secret)}`;
}

export interface SessionContext {
  track: Track;
  session: Session;
  mode: ActivityMode;
  revisionDifficulty?: RevisionDifficulty;
}

export function getSessionContext(request: IncomingMessage, secret: string | undefined): SessionContext | null {
  if (!secret) return null;
  const raw = request.headers.authorization;
  if (!raw?.startsWith('Bearer ')) return null;
  const token = raw.slice(7).trim();
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;
  const payload = token.slice(0, separator);
  try {
    if (!safeEqual(token.slice(separator + 1), signature(payload, secret))) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { scope?: unknown; track?: unknown; session?: unknown; mode?: unknown; difficulty?: unknown; exp?: unknown };
    const mode = claims.mode === undefined ? 'weekly' : claims.mode;
    const difficulty = claims.difficulty;
    if (claims.scope !== 'genetics17-exam' || !isTrack(claims.track) || !isSession(claims.session) || !isActivityMode(mode) || typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    if (mode === 'revision-long' ? !isRevisionDifficulty(difficulty) : difficulty !== undefined) return null;
    return { track: claims.track, session: claims.session, mode, ...(isRevisionDifficulty(difficulty) ? { revisionDifficulty: difficulty } : {}) };
  } catch { return null; }
}
