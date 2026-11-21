import type { Answers, SavedProgress, Session, Track } from '../types';

const LEGACY_STORAGE_KEY = 'genetics17-progress-v1';
const storageKey = (track: Track, session: Session) => `genetics17-progress-v3-${track.toLowerCase()}-${session.replace('.', '-')}`;
const STUDENT_NAME_STORAGE_KEY = 'genetics17-student-name-v1';

const emptyProgress = (): SavedProgress => ({ answers: {}, studentName: '', updatedAt: '' });

function parseProgress(raw: string | null): SavedProgress {
  if (!raw) return emptyProgress();
  try {
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    return {
      answers: parsed.answers && typeof parsed.answers === 'object' && !Array.isArray(parsed.answers) ? parsed.answers as Answers : {},
      studentName: typeof parsed.studentName === 'string' ? parsed.studentName : '',
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch { return emptyProgress(); }
}

function filterAnswers(answers: Answers, allowedQuestionIds: ReadonlySet<string>): Answers {
  return Object.fromEntries(Object.entries(answers).filter(([questionId]) => allowedQuestionIds.has(questionId)));
}

export function loadProgress(track: Track, session: Session, allowedQuestionIds: string[]): SavedProgress {
  if (typeof window === 'undefined') return emptyProgress();
  try {
    const allowed = new Set(allowedQuestionIds);
    const current = parseProgress(window.localStorage.getItem(storageKey(track, session)));
    if (current.updatedAt || Object.keys(current.answers).length || current.studentName) return { ...current, answers: filterAnswers(current.answers, allowed) };
    const legacy = parseProgress(window.localStorage.getItem(LEGACY_STORAGE_KEY));
    return { ...legacy, answers: filterAnswers(legacy.answers, allowed) };
  } catch { return emptyProgress(); }
}

export function loadStudentName(): string {
  if (typeof window === 'undefined') return '';
  try { return window.localStorage.getItem(STUDENT_NAME_STORAGE_KEY) ?? ''; } catch { return ''; }
}

export function saveStudentName(name: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (name.trim()) window.localStorage.setItem(STUDENT_NAME_STORAGE_KEY, name);
    else window.localStorage.removeItem(STUDENT_NAME_STORAGE_KEY);
  } catch { /* storage is optional */ }
}

export function saveProgress(track: Track, session: Session, progress: SavedProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(track, session), JSON.stringify({ answers: progress.answers, studentName: progress.studentName, updatedAt: new Date().toISOString() }));
  } catch { /* storage is optional */ }
}

export function clearProgress(track: Track, session: Session): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(storageKey(track, session)); } catch { /* storage is optional */ }
}
