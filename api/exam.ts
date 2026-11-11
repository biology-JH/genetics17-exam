import type { IncomingMessage, ServerResponse } from 'node:http';
import { EXAM_QUESTIONS } from '../server/questionBank';
import { hasValidSession } from '../server/security';
import { methodNotAllowed, sendJson } from '../server/http';

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method !== 'GET') return methodNotAllowed(response, 'GET');
  if (!hasValidSession(request, process.env.SESSION_SIGNING_SECRET)) return sendJson(response, 401, { error: 'Enter the Homework Password to open the exam.' });
  if (EXAM_QUESTIONS.length === 0) return sendJson(response, 503, { error: 'Exam content is not configured.' });
  const questions = EXAM_QUESTIONS.map(({ id, level, paper, form, difficulty, source_slides, visual_hint, stem, parts, total_marks }) => ({
    id, level, paper, form, difficulty, source_slides, visual_hint, stem, parts, total_marks,
  }));
  const total_marks = questions.reduce((sum, question) => sum + question.total_marks, 0);
  return sendJson(response, 200, { questions, total_marks });
}
