import sourceQuestions from './revisionQuestionBankData.json' with { type: 'json' };
import type { ActivityMode, ExamQuestion, RevisionDifficulty, Track } from '../src/types.js';

// This module is imported only from Vercel Node handlers, never from the browser bundle.
const REVISION_QUESTIONS = sourceQuestions as ExamQuestion[];

export function selectRevisionQuestions(track: Track, mode: Exclude<ActivityMode, 'weekly'>, difficulty?: RevisionDifficulty): ExamQuestion[] {
  const prefix = mode === 'revision-mcq' ? 'RMCQ_' : 'RLONG_';
  return REVISION_QUESTIONS
    .filter((question) => question.id.startsWith(prefix))
    .filter((question) => mode !== 'revision-long' || question.revision_difficulty === difficulty)
    .filter((question) => track === 'Extended' || question.revision_tier === 'Core')
    .map((question) => {
      const parts = question.parts.filter((part) => mode === 'revision-mcq' || track === 'Extended' || part.revision_tier === 'Core');
      return {
        ...question,
        track,
        level: (mode === 'revision-mcq' ? question.revision_tier : parts.length > 0 && parts.every((part) => part.revision_tier === 'Extended') ? 'Extended' : 'Core') as ExamQuestion['level'],
        parts,
        total_marks: parts.reduce((sum, part) => sum + part.marks, 0),
      };
    })
    .filter((question) => question.parts.length > 0)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function isRevisionQuestionId(id: string): boolean {
  return id.startsWith('RMCQ_') || id.startsWith('RLONG_');
}
