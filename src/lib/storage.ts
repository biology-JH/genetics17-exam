import type { Answers, SavedProgress, Session, Track } from '../types';

const LEGACY_STORAGE_KEY = 'genetics17-progress-v1';
const legacyTrackStorageKey = (track: Track) => `genetics17-progress-v2-${track.toLowerCase()}`;
const storageKey = (track: Track, session: Session) => `genetics17-progress-v3-${track.toLowerCase()}-${session.replace('.', '-')}`;
const migrationKey = (track: Track, session: Session) => `genetics17-progress-legacy-migrated-${track.toLowerCase()}-${session.replace('.', '-')}`;
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
    const currentAnswers = filterAnswers(current.answers, allowed);
    if (Object.keys(currentAnswers).length > 0) return { ...current, answers: currentAnswers };

    const alreadyMigrated = window.localStorage.getItem(migrationKey(track, session)) === '1';
    if (alreadyMigrated) return { ...current, answers: currentAnswers };

    const trackLegacy = parseProgress(window.localStorage.getItem(legacyTrackStorageKey(track)));
    const trackLegacyAnswers = filterAnswers(trackLegacy.answers, allowed);
    const sharedLegacy = Object.keys(trackLegacyAnswers).length || trackLegacy.studentName.trim()
      ? trackLegacy
      : parseProgress(window.localStorage.getItem(LEGACY_STORAGE_KEY));
    const legacyAnswers = sharedLegacy === trackLegacy
      ? trackLegacyAnswers
      : filterAnswers(sharedLegacy.answers, allowed);

    if (Object.keys(legacyAnswers).length > 0 || sharedLegacy.studentName.trim()) {
      return {
        answers: legacyAnswers,
        studentName: current.studentName || sharedLegacy.studentName,
        updatedAt: current.updatedAt || sharedLegacy.updatedAt,
      };
    }
    return { ...current, answers: currentAnswers };
  } catch { return emptyProgress(); }
}

export function loadStudentName(): string {
  if (typeof window === 'undefined') return '';
  try {
    const currentName = window.localStorage.getItem(STUDENT_NAME_STORAGE_KEY) ?? '';
    if (currentName.trim()) return currentName;

    for (const track of ['Core', 'Extended'] as const) {
      const previousName = parseProgress(window.localStorage.getItem(legacyTrackStorageKey(track))).studentName;
      if (previousName.trim()) {
        saveStudentName(previousName);
        return previousName;
      }
    }
    const legacyName = parseProgress(window.localStorage.getItem(LEGACY_STORAGE_KEY)).studentName;
    if (legacyName.trim()) {
      saveStudentName(legacyName);
      return legacyName;
    }
    return '';
  } catch { return ''; }
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
    window.localStorage.setItem(migrationKey(track, session), '1');
  } catch { /* storage is optional */ }
}

export function clearProgress(track: Track, session: Session): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(track, session));
    window.localStorage.setItem(migrationKey(track, session), '1');
  } catch { /* storage is optional */ }
}
