import type { ActivityMode, Answers, ExamPayload, GradeResult, RevisionDifficulty, Session, Track } from '../types';

async function requestJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || 'The request could not be completed.');
  return payload;
}

export async function unlockExam(password: string, track: Track, session: Session, mode: ActivityMode = 'weekly', revisionDifficulty?: RevisionDifficulty): Promise<string> {
  const result = await requestJSON<{ token: string; track: Track; session: Session; mode?: ActivityMode; revision_difficulty?: RevisionDifficulty }>('/api/unlock', {
    method: 'POST',
    body: JSON.stringify({ password, track, session, ...(mode !== 'weekly' ? { mode } : {}), ...(revisionDifficulty ? { revisionDifficulty } : {}) }),
  });
  if (result.track !== track || result.session !== session || (result.mode ?? 'weekly') !== mode || (revisionDifficulty && result.revision_difficulty !== revisionDifficulty)) throw new Error('The selected activity did not match the unlocked exam.');
  return result.token;
}

export function getExam(token: string): Promise<ExamPayload> {
  return requestJSON<ExamPayload>('/api/exam', { headers: { Authorization: `Bearer ${token}` } });
}

export function markExam(token: string, markingPassword: string, answers: Answers): Promise<GradeResult> {
  return requestJSON<GradeResult>('/api/grade', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ markingPassword, answers }),
  });
}
