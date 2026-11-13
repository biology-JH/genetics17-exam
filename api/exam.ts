import type { IncomingMessage, ServerResponse } from 'node:http';
import { EXAM_QUESTIONS } from '../server/questionBank.js';
import { getSessionTrack } from '../server/security.js';
import { methodNotAllowed, sendJson } from '../server/http.js';
import type { ExamQuestion, PaperStyle, Track } from '../src/types.js';

const PAPER_ORDER: Record<Track, PaperStyle[]> = {
  Core: ['Paper 1', 'Paper 3', 'Paper 6'],
  Extended: ['Paper 2', 'Paper 4', 'Paper 6'],
};

function safeQuestion(question: ExamQuestion): ExamQuestion {
  return {
    id: question.id,
    track: question.track,
    level: question.level,
    paper: question.paper,
    form: question.form,
    cognitive_skill: question.cognitive_skill,
    difficulty: question.difficulty,
    source_deck: question.source_deck,
    source_slides: question.source_slides,
    objective_ids: question.objective_ids,
    visual_hint: question.visual_hint,
    visual_alt: question.visual_alt,
    stem: question.stem,
    parts: question.parts.map((part) => ({
      id: part.id,
      prompt: part.prompt,
      input_type: part.input_type,
      marks: part.marks,
      options: part.options,
      objective_ids: part.objective_ids,
    })),
    total_marks: question.total_marks,
  };
}

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method !== 'GET') return methodNotAllowed(response, 'GET');
  const track = getSessionTrack(request, process.env.SESSION_SIGNING_SECRET);
  if (!track) return sendJson(response, 401, { error: 'Enter the Homework Password to open the exam.' });

  const order = PAPER_ORDER[track];
  const levelOrder = track === 'Extended' ? ['Core', 'Extended'] : ['Core'];
  const questions = EXAM_QUESTIONS
    .filter((question) => question.track === track)
    .sort((left, right) => levelOrder.indexOf(left.level) - levelOrder.indexOf(right.level)
      || order.indexOf(left.paper) - order.indexOf(right.paper))
    .map(safeQuestion);
  if (questions.length === 0) return sendJson(response, 503, { error: 'The selected exam track is not configured.' });

  const total_marks = questions.reduce((sum, question) => sum + question.total_marks, 0);
  const paper_max_scores = order.map((paper) => ({
    paper,
    max_score: questions.filter((question) => question.paper === paper).reduce((sum, question) => sum + question.total_marks, 0),
  }));
  return sendJson(response, 200, {
    track,
    questions,
    total_marks,
    paper_max_scores,
    ai_marking_enabled: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
  });
}
