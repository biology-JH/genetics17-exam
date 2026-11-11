import type { Answers, SavedProgress } from '../types';

const STORAGE_KEY = 'genetics17-progress-v1';

const emptyProgress = (): SavedProgress => ({ answers: {}, studentName: '', updatedAt: '' });

export function loadProgress(): SavedProgress {
  if (typeof window === 'undefined') return emptyProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    return {
      answers: parsed.answers && typeof parsed.answers === 'object' ? parsed.answers as Answers : {},
      studentName: typeof parsed.studentName === 'string' ? parsed.studentName : '',
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: SavedProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      answers: progress.answers,
      studentName: progress.studentName,
      updatedAt: new Date().toISOString(),
    }));
  } catch {
    // Keep the exam usable if browser storage is unavailable or full.
  }
}

export function clearProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage policy errors; the caller still clears the in-memory state.
  }
}
