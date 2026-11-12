import type { IncomingMessage, ServerResponse } from 'node:http';
import { Buffer } from 'node:buffer';
import { gunzipSync } from 'node:zlib';
import { EXAM_QUESTIONS } from '../server/questionBank.js';
import { getSessionTrack, matchesConfiguredPassword } from '../server/security.js';
import { gradeWithStructuredOutputs, type RubricCriterion } from '../server/structuredGrading.js';
import { isSameOriginRequest, methodNotAllowed, readJsonBody, sendJson } from '../server/http.js';
import type { Answers, MarkingPointFeedback, PaperScore, PaperStyle, Track } from '../src/types.js';

export const config = {
  runtime: 'nodejs',
  maxDuration: 120,
};

interface MarkingPoint {
  marks: number;
  description?: string;
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

type ValidatedPoint = {
  id: string;
  point: MarkingPoint;
  criterion: RubricCriterion;
};
type ValidatedPart = {
  responseText: string;
  keyPart: KeyPart;
  points: ValidatedPoint[];
};

function normalize(value: string): string {
  return value.normalize('NFKD').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function genotypeTokens(value: string): string[] {
  const pairedAlleles = value.match(/\b(?:[A-Z][a-z]|[A-Z]{2}|[a-z]{2})\b/g) ?? [];
  const superscriptAlleles = value.match(/(?:X[ᴿʳᴺⁿ]|C[ᴿᵂ]|I[ᴬᴮᵒ])/gu) ?? [];
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

function criterionId(questionId: string, partId: string, pointIndex: number): string {
  return `${questionId}__${partId}__criterion_${pointIndex + 1}`;
}

const PAPER_ORDER: Record<Track, PaperStyle[]> = {
  Core: ['Paper 1', 'Paper 3', 'Paper 6'],
  Extended: ['Paper 2', 'Paper 4', 'Paper 6'],
};

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method !== 'POST') return methodNotAllowed(response, 'POST');
  if (!isSameOriginRequest(request)) return sendJson(response, 403, { error: 'This request is not allowed.' });
  const track = getSessionTrack(request, process.env.SESSION_SIGNING_SECRET);
  if (!track) return sendJson(response, 401, { error: 'Your exam session has expired. Enter the Homework Password again.' });

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch {
    return sendJson(response, 400, { error: 'Please submit a valid marking request.' });
  }
  if (!matchesConfiguredPassword(body.markingPassword, process.env.MARKING_PASSWORD)) {
    return sendJson(response, 401, { error: 'That Marking Password was not accepted.' });
  }
  const storedAnswerKey = process.env.ANSWER_KEY_JSON;
  if (!storedAnswerKey) return sendJson(response, 503, { error: 'The marking service is not configured.' });

  let answerKey: AnswerKey;
  try {
    const keyJson = storedAnswerKey.startsWith('gzip64:')
      ? gunzipSync(Buffer.from(storedAnswerKey.slice('gzip64:'.length), 'base64')).toString('utf8')
      : storedAnswerKey;
    const parsed: unknown = JSON.parse(keyJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid key.');
    answerKey = parsed as AnswerKey;
  } catch {
    return sendJson(response, 503, { error: 'The marking service is not configured.' });
  }

  const trackQuestions = EXAM_QUESTIONS.filter((question) => question.track === track);
  if (trackQuestions.length === 0) return sendJson(response, 503, { error: 'The selected exam track is not configured.' });
  const submitted = body.answers;
  if (!submitted || typeof submitted !== 'object' || Array.isArray(submitted)) {
    return sendJson(response, 400, { error: 'Submitted answers are missing.' });
  }
  const answers = submitted as Answers;
  const allowedQuestionIds = new Set(trackQuestions.map((question) => question.id));
  if (Object.keys(answers).some((questionId) => !allowedQuestionIds.has(questionId))) {
    return sendJson(response, 403, { error: 'Submitted answers do not match the selected exam track.' });
  }

  const validatedParts = new Map<string, ValidatedPart>();
  const aiCriteria: RubricCriterion[] = [];
  for (const question of trackQuestions) {
    const key = answerKey[question.id];
    if (!key) return sendJson(response, 503, { error: 'The marking service is missing a question key.' });
    for (const part of question.parts) {
      const keyPart = key.parts?.[part.id];
      if (!keyPart || !Array.isArray(keyPart.marking_points) || typeof keyPart.model_answer !== 'string') {
        return sendJson(response, 503, { error: 'The marking service is missing a part key.' });
      }
      const submittedPartAnswers = answers[question.id];
      if (submittedPartAnswers !== undefined && (!submittedPartAnswers || typeof submittedPartAnswers !== 'object' || Array.isArray(submittedPartAnswers))) {
        return sendJson(response, 400, { error: 'Submitted answers are invalid.' });
      }
      const allowedPartIds = new Set(question.parts.map((candidate) => candidate.id));
      if (submittedPartAnswers && Object.keys(submittedPartAnswers).some((partId) => !allowedPartIds.has(partId))) {
        return sendJson(response, 403, { error: 'Submitted answers do not match the selected exam track.' });
      }
      const responseValue = submittedPartAnswers?.[part.id] ?? '';
      if (typeof responseValue !== 'string') return sendJson(response, 400, { error: 'Submitted answers are invalid.' });

      const responseText = responseValue;
      const points: ValidatedPoint[] = [];
      for (const [pointIndex, point] of keyPart.marking_points.entries()) {
        if (!Number.isInteger(point.marks) || point.marks < 0 || !Array.isArray(point.accepted_phrases)) {
          return sendJson(response, 503, { error: 'The marking service contains an invalid rubric.' });
        }
        const id = criterionId(question.id, part.id, pointIndex);
        const criterion: RubricCriterion = {
          id,
          marks: point.marks,
          description: point.description || 'Award for the stated correct point.',
          model_answer: keyPart.model_answer,
          student_answer: responseText,
        };
        points.push({ id, point, criterion });
        if (part.input_type === 'text' && responseText.trim().length > 0) aiCriteria.push(criterion);
      }
      validatedParts.set(`${question.id}::${part.id}`, { responseText, keyPart, points });
    }
  }

  const assessments = aiCriteria.length > 0 ? await gradeWithStructuredOutputs(aiCriteria) : null;
  if (process.env.GENETICS_OPENAI_API_KEY && aiCriteria.length > 0 && !assessments) {
    console.warn('[grading] Structured model grading unavailable; deterministic rubric matcher used.');
  }
  const gradingMode = assessments ? 'openai_structured' : 'deterministic';

  let score = 0;
  let maxScore = 0;
  const byPaper = new Map<PaperStyle, { score: number; max_score: number }>();
  const markedQuestions = [] as Array<{
    question_id: string;
    earned: number;
    available: number;
    parts: Array<{
      part_id: string;
      earned: number;
      available: number;
      response: string;
      model_answer: string;
      marking_points: MarkingPointFeedback[];
    }>;
    correction: string;
    syllabus_guidance: string;
  }>;

  for (const question of trackQuestions) {
    const key = answerKey[question.id];
    let questionEarned = 0;
    const questionParts = [] as typeof markedQuestions[number]['parts'];
    for (const part of question.parts) {
      const validated = validatedParts.get(`${question.id}::${part.id}`)!;
      let remainingMarks = part.marks;
      let earned = 0;
      const markingPoints = validated.points.map(({ id, point }) => {
        const assessment = assessments?.get(id);
        const matchedPhrase = assessment ? undefined : point.accepted_phrases.find((phrase) => phraseMatches(validated.responseText, phrase));
        const requestedAward = assessment?.award_marks ?? (matchedPhrase ? point.marks : 0);
        const awarded = Math.max(0, Math.min(point.marks, remainingMarks, requestedAward));
        remainingMarks -= awarded;
        earned += awarded;
        return {
          marks: point.marks,
          awarded,
          description: point.description || 'Award for the stated correct point.',
          evidence_quote: assessment?.evidence_quote ?? (matchedPhrase ? validated.responseText.trim() : ''),
          rationale: assessment?.rationale ?? (matchedPhrase
            ? 'A deterministic accepted-phrase match supported this criterion.'
            : 'No configured accepted phrase matched this criterion.'),
        };
      });

      questionEarned += earned;
      questionParts.push({
        part_id: part.id,
        earned,
        available: part.marks,
        response: validated.responseText,
        model_answer: validated.keyPart.model_answer,
        marking_points: markingPoints,
      });
    }
    score += questionEarned;
    maxScore += question.total_marks;
    const currentPaper = byPaper.get(question.paper) ?? { score: 0, max_score: 0 };
    currentPaper.score += questionEarned;
    currentPaper.max_score += question.total_marks;
    byPaper.set(question.paper, currentPaper);
    markedQuestions.push({
      question_id: question.id,
      earned: questionEarned,
      available: question.total_marks,
      parts: questionParts,
      correction: key.correction,
      syllabus_guidance: key.syllabus_guidance,
    });
  }

  const paper_scores: PaperScore[] = PAPER_ORDER[track].map((paper) => ({
    paper,
    score: byPaper.get(paper)?.score ?? 0,
    max_score: byPaper.get(paper)?.max_score ?? 0,
  }));
  const percentage = maxScore ? Math.round((score / maxScore) * 1000) / 10 : 0;
  return sendJson(response, 200, {
    track,
    score,
    max_score: maxScore,
    percentage,
    grade_band: getGradeBand(percentage),
    grading_mode: gradingMode,
    paper_scores,
    marked_questions: markedQuestions,
  });
}
