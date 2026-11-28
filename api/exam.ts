import type { IncomingMessage, ServerResponse } from 'node:http';
import { EXAM_QUESTIONS } from '../server/questionBank.js';
import { selectRevisionQuestions } from '../server/revisionQuestionBank.js';
import { getSessionContext } from '../server/security.js';
import { methodNotAllowed, sendJson } from '../server/http.js';
import type { ExamQuestion, PaperStyle, Track } from '../src/types.js';

const PAPER_ORDER: Record<Track, PaperStyle[]> = { Core: ['Paper 1', 'Paper 3', 'Paper 6'], Extended: ['Paper 2', 'Paper 4', 'Paper 6'] };
const REVISION_PAPER_ORDER: PaperStyle[] = ['Paper 1', 'Paper 2', 'Paper 3', 'Paper 4', 'Paper 6'];

function safeQuestion(question: ExamQuestion): ExamQuestion {
  return { ...question, parts: question.parts.map((part) => ({ id: part.id, prompt: part.prompt, input_type: part.input_type, marks: part.marks, options: part.options, objective_ids: part.objective_ids })) };
}

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method !== 'GET') return methodNotAllowed(response, 'GET');
  const context = getSessionContext(request, process.env.SESSION_SIGNING_SECRET);
  if (!context) return sendJson(response, 401, { error: 'Enter the Homework Password to open this session.' });
  if (context.mode !== 'weekly') {
    const questions = selectRevisionQuestions(context.track, context.mode, context.revisionDifficulty);
    if (questions.length === 0) return sendJson(response, 503, { error: 'This revision set is not configured.' });
    const order = REVISION_PAPER_ORDER.filter((paper) => questions.some((question) => question.paper === paper));
    const total_marks = questions.reduce((sum, question) => sum + question.total_marks, 0);
    const paper_max_scores = order.map((paper) => ({ paper, max_score: questions.filter((question) => question.paper === paper).reduce((sum, question) => sum + question.total_marks, 0) }));
    return sendJson(response, 200, { track: context.track, session: context.session, mode: context.mode, ...(context.revisionDifficulty ? { revision_difficulty: context.revisionDifficulty } : {}), questions: questions.map(safeQuestion), total_marks, paper_max_scores, ai_marking_enabled: Boolean(process.env.OPENROUTER_API_KEY?.trim()) });
  }
  const prefix = `Q${context.session.replace('.', '')}`;
  const order = PAPER_ORDER[context.track];
  const levelOrder = context.track === 'Extended' ? ['Core', 'Extended'] : ['Core'];
  const questions = EXAM_QUESTIONS.filter((question) => question.track === context.track && question.id.startsWith(prefix))
    .sort((left, right) => levelOrder.indexOf(left.level) - levelOrder.indexOf(right.level) || order.indexOf(left.paper) - order.indexOf(right.paper) || left.id.localeCompare(right.id))
    .map(safeQuestion);
  if (questions.length === 0) return sendJson(response, 503, { error: `Session ${context.session} is not configured for this track.` });
  const total_marks = questions.reduce((sum, question) => sum + question.total_marks, 0);
  const paper_max_scores = order.map((paper) => ({ paper, max_score: questions.filter((question) => question.paper === paper).reduce((sum, question) => sum + question.total_marks, 0) }));
  return sendJson(response, 200, { track: context.track, session: context.session, questions, total_marks, paper_max_scores, ai_marking_enabled: Boolean(process.env.OPENROUTER_API_KEY?.trim()) });
}
