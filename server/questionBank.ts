import sourceQuestions from './questionBankData.json' with { type: 'json' };
import type { ExamQuestion } from '../src/types';

// This module is imported only by Vercel serverless routes, never by the browser application.
export const EXAM_QUESTIONS = sourceQuestions as ExamQuestion[];
