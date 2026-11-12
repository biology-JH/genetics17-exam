import type { Answers, ExamPayload, GradeResult, Track } from '../types';

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

export async function unlockExam(password: string, track: Track): Promise<string> {
  const result = await requestJSON<{ token: string; track: Track }>('/api/unlock', {
    method: 'POST',
    body: JSON.stringify({ password, track }),
  });
  if (result.track !== track) throw new Error('The selected track did not match the unlocked exam session.');
  return result.token;
}

export function getExam(token: string): Promise<ExamPayload> {
  return requestJSON<ExamPayload>('/api/exam', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function markExam(token: string, markingPassword: string, answers: Answers): Promise<GradeResult> {
  return requestJSON<GradeResult>('/api/grade', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ markingPassword, answers }),
  });
}
