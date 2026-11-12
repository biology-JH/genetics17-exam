import type { Answers, SavedProgress, Track } from '../types';

const LEGACY_STORAGE_KEY = 'genetics17-progress-v1';
const storageKey = (track: Track) => `genetics17-progress-v2-${track.toLowerCase()}`;

const emptyProgress = (): SavedProgress => ({ answers: {}, studentName: '', updatedAt: '' });

function parseProgress(raw: string | null): SavedProgress {
  if (!raw) return emptyProgress();
  try {
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    return {
      answers: parsed.answers && typeof parsed.answers === 'object' && !Array.isArray(parsed.answers)
        ? parsed.answers as Answers
        : {},
      studentName: typeof parsed.studentName === 'string' ? parsed.studentName : '',
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return emptyProgress();
  }
}

function filterAnswers(answers: Answers, allowedQuestionIds: ReadonlySet<string>): Answers {
  return Object.fromEntries(Object.entries(answers).filter(([questionId]) => allowedQuestionIds.has(questionId)));
}

export function loadProgress(track: Track, allowedQuestionIds: string[]): SavedProgress {
  if (typeof window === 'undefined') return emptyProgress();
  try {
    const allowed = new Set(allowedQuestionIds);
    const current = parseProgress(window.localStorage.getItem(storageKey(track)));
    if (current.updatedAt || Object.keys(current.answers).length || current.studentName) {
      return { ...current, answers: filterAnswers(current.answers, allowed) };
    }

    // Import only answers whose IDs belong to the newly selected track. Other legacy IDs stay isolated.
    const legacy = parseProgress(window.localStorage.getItem(LEGACY_STORAGE_KEY));
    return { ...legacy, answers: filterAnswers(legacy.answers, allowed) };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(track: Track, progress: SavedProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(track), JSON.stringify({
      answers: progress.answers,
      studentName: progress.studentName,
      updatedAt: new Date().toISOString(),
    }));
  } catch {
    // Keep the exam usable if browser storage is unavailable or full.
  }
}

export function clearProgress(track: Track, questionIds: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(track));
    const legacy = parseProgress(window.localStorage.getItem(LEGACY_STORAGE_KEY));
    const selectedIds = new Set(questionIds);
    const remainingAnswers = Object.fromEntries(Object.entries(legacy.answers).filter(([id]) => !selectedIds.has(id)));
    if (Object.keys(remainingAnswers).length === 0) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } else {
      window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ ...legacy, answers: remainingAnswers }));
    }
  } catch {
    // Ignore storage policy errors; the caller still clears the in-memory state.
  }
}
