import type { IncomingMessage, ServerResponse } from 'node:http';
import { EXAM_QUESTIONS } from '../server/questionBank.js';
import { hasValidSession, matchesConfiguredPassword } from '../server/security.js';
import { isSameOriginRequest, methodNotAllowed, readJsonBody, sendJson } from '../server/http.js';
import type { Answers } from '../src/types';

interface MarkingPoint {
  marks: number;
  accepted_phrases: string[];
}
interface KeyPart {
  marking_points: MarkingPoint[];
  model_answer: string;
}
interface KeyQuestion {
  parts: Record<string, KeyPart>;
  correction: string;
  syllabus_guidance: string;
}
type AnswerKey = Record<string, KeyQuestion>;

function normalize(value: string): string {
  return value.normalize('NFKD').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function genotypeTokens(value: string): string[] {
  const pairedAlleles = value.match(/\b(?:[A-Z][a-z]|[A-Z]{2}|[a-z]{2})\b/g) ?? [];
  const superscriptAlleles = value.match(/(?:X[ᴿʳ]|C[ᴿᵂ]|I[ᴬᴮᵒ])/gu) ?? [];
  return [...pairedAlleles, ...superscriptAlleles];
}

function phraseMatches(response: string, acceptedPhrase: string): boolean {
  const normalizedResponse = ` ${normalize(response)} `;
  const normalizedPhrase = normalize(acceptedPhrase);
  if (!normalizedPhrase) return false;
  const phraseIndex = normalizedResponse.indexOf(` ${normalizedPhrase} `);
  if (phraseIndex < 0) return false;
  const precedingText = normalizedResponse.slice(0, phraseIndex).trim().split(' ').slice(-1)[0] ?? '';
  if (['not', 'no', 'never'].includes(precedingText)) return false;
  const requiredGenotypes = genotypeTokens(acceptedPhrase);
  const suppliedGenotypes = genotypeTokens(response);
  return requiredGenotypes.every((genotype) => suppliedGenotypes.includes(genotype));
}

function getGradeBand(percentage: number): 'A*' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' {
  if (percentage >= 85) return 'A*';
  if (percentage >= 75) return 'A';
  if (percentage >= 65) return 'B';
  if (percentage >= 55) return 'C';
  if (percentage >= 45) return 'D';
  if (percentage >= 35) return 'E';
  if (percentage >= 25) return 'F';
  return 'G';
}

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method !== 'POST') return methodNotAllowed(response, 'POST');
  if (!isSameOriginRequest(request)) return sendJson(response, 403, { error: 'This request is not allowed.' });
  if (!hasValidSession(request, process.env.SESSION_SIGNING_SECRET)) return sendJson(response, 401, { error: 'Your exam session has expired. Enter the Homework Password again.' });
  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch {
    return sendJson(response, 400, { error: 'Please submit a valid marking request.' });
  }
  if (!matchesConfiguredPassword(body.markingPassword, process.env.MARKING_PASSWORD)) return sendJson(response, 401, { error: 'That Marking Password was not accepted.' });
  if (!process.env.ANSWER_KEY_JSON || EXAM_QUESTIONS.length === 0) return sendJson(response, 503, { error: 'The marking service is not configured.' });

  let answerKey: AnswerKey;
  try {
    answerKey = JSON.parse(process.env.ANSWER_KEY_JSON) as AnswerKey;
  } catch {
    return sendJson(response, 503, { error: 'The marking service is not configured.' });
  }
  const submitted = body.answers;
  if (!submitted || typeof submitted !== 'object' || Array.isArray(submitted)) return sendJson(response, 400, { error: 'Submitted answers are missing.' });
  const answers = submitted as Answers;
  let score = 0;
  let maxScore = 0;
  const incorrectItems = [] as Array<{
    question_id: string;
    level: 'Core' | 'Extended';
    source_slides: number[];
    earned: number;
    available: number;
    parts: Array<{ part_id: string; earned: number; available: number; response: string; model_answer: string }>;
    correction: string;
    syllabus_guidance: string;
  }>;

  for (const question of EXAM_QUESTIONS) {
    const key = answerKey[question.id];
    if (!key) return sendJson(response, 503, { error: 'The marking service is missing a question key.' });
    let questionEarned = 0;
    const questionParts = [] as Array<{ part_id: string; earned: number; available: number; response: string; model_answer: string }>;
    for (const part of question.parts) {
      const partKey = key.parts?.[part.id];
      if (!partKey) return sendJson(response, 503, { error: 'The marking service is missing a part key.' });
      const responseText = String(answers[question.id]?.[part.id] ?? '');
      let earned = 0;
      for (const point of partKey.marking_points ?? []) {
        if (point.accepted_phrases.some((phrase) => phraseMatches(responseText, phrase))) earned += point.marks;
      }
      earned = Math.min(part.marks, earned);
      questionEarned += earned;
      questionParts.push({ part_id: part.id, earned, available: part.marks, response: responseText, model_answer: partKey.model_answer });
    }
    score += questionEarned;
    maxScore += question.total_marks;
    if (questionEarned < question.total_marks) {
      incorrectItems.push({
        question_id: question.id,
        level: question.level,
        source_slides: question.source_slides,
        earned: questionEarned,
        available: question.total_marks,
        parts: questionParts,
        correction: key.correction,
        syllabus_guidance: key.syllabus_guidance,
      });
    }
  }
  const percentage = maxScore ? Math.round((score / maxScore) * 1000) / 10 : 0;
  return sendJson(response, 200, { score, max_score: maxScore, percentage, grade_band: getGradeBand(percentage), incorrect_items: incorrectItems });
}
