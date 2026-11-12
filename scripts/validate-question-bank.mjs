import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const bankPath = resolve(root, 'server/questionBankData.json');
const publicRoot = resolve(root, 'public');
const fail = (message) => {
  console.error(`Question-bank validation failed: ${message}`);
  process.exitCode = 1;
};
const range = (prefix, first, last) => Array.from({ length: last - first + 1 }, (_, i) => `${prefix}.${first + i}`);
const coreObjectives = new Set([
  ...range('17.1', 1, 4), '17.1.7', '17.1.8', '17.1.9', '17.1.10', '17.1.11', '17.1.12',
  ...range('17.2', 1, 5), ...range('17.3', 1, 2), ...range('17.4', 1, 12),
]);
const supplementObjectives = new Set(['17.1.5', '17.1.6', ...range('17.4', 13, 18)]);
const allObjectives = new Set([...coreObjectives, ...supplementObjectives]);
const papersByTrack = {
  Core: new Set(['Paper 1', 'Paper 3', 'Paper 6']),
  Extended: new Set(['Paper 2', 'Paper 4', 'Paper 6']),
};
const forbiddenKeyFields = new Set([
  'accepted_phrases', 'marking_points', 'model_answer', 'answer_key', 'answer_key_json',
  'correct_answer', 'correct_answers', 'syllabus_guidance', 'mark_scheme', 'marking_scheme',
]);
// Hashes of the two diagrams committed before the track redesign. New media must be in addition to these.
const originalImageDigests = new Set([
  'fc06745588de6b88b61113503194e72752703a407cc67a74933fbfffe2077e3a',
  '04da2ef9e06313b2bcc12173157a3b93f3b73069807743db3f74016f124ee6a4',
]);

function normalizedQuestion(question) {
  const text = [question.stem, ...question.parts.flatMap((part) => [part.prompt, ...(part.options ?? [])])].join(' ');
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function normalizedStem(question) {
  return question.stem.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function nestedFieldNames(value, result = new Set()) {
  if (Array.isArray(value)) {
    for (const child of value) nestedFieldNames(child, result);
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      result.add(key);
      nestedFieldNames(child, result);
    }
  }
  return result;
}

const raw = await readFile(bankPath, 'utf8');
const questions = JSON.parse(raw);
if (!Array.isArray(questions) || questions.length === 0) {
  fail('public question bank must be a non-empty array');
  process.exit(1);
}
if (forbiddenKeyFields.size && [...forbiddenKeyFields].some((key) => nestedFieldNames(questions).has(key))) {
  fail('a private marking-key field is present in the public bank');
}

const perTrack = { Core: [], Extended: [] };
const globalIds = new Set();
const referencedImages = new Map();
for (const question of questions) {
  if (!question || typeof question !== 'object' || Array.isArray(question)) {
    fail('every bank entry must be a question object');
    continue;
  }
  if (globalIds.has(question.id)) fail(`duplicate global question id ${question.id}`);
  globalIds.add(question.id);
  if (!perTrack[question.track]) {
    fail(`invalid track on ${question.id}`);
    continue;
  }
  perTrack[question.track].push(question);
  if (!papersByTrack[question.track].has(question.paper)) fail(`wrong paper for ${question.track}/${question.id}`);
  if (!['application', 'analysis', 'evaluation'].includes(question.cognitive_skill)) fail(`non-higher-order skill tag on ${question.id}`);
  if (!Number.isInteger(question.difficulty) || question.difficulty < 3 || question.difficulty > 5) fail(`difficulty must be 3–5 on ${question.id}`);
  if (!question.source_deck || !Array.isArray(question.source_slides) || question.source_slides.length === 0) fail(`missing slide citation on ${question.id}`);
  if (!Array.isArray(question.objective_ids) || question.objective_ids.length === 0) fail(`missing syllabus objective on ${question.id}`);
  if (!Array.isArray(question.parts) || question.parts.length === 0) fail(`missing question parts on ${question.id}`);
  if (question.parts.reduce((sum, part) => sum + (Number(part.marks) || 0), 0) !== question.total_marks) fail(`part marks do not sum to question marks on ${question.id}`);
  const questionObjectives = new Set(question.objective_ids ?? []);
  if ([...questionObjectives].some((objective) => !allObjectives.has(objective))) fail(`out-of-scope syllabus objective on ${question.id}`);
  const partObjectives = new Set((question.parts ?? []).flatMap((part) => part.objective_ids ?? []));
  if (partObjectives.size !== questionObjectives.size || [...questionObjectives].some((objective) => !partObjectives.has(objective))) fail(`question and part objective maps differ on ${question.id}`);
  if (question.visual_hint) {
    if (!question.visual_hint.startsWith('/source-assets/') || question.visual_hint.includes('..')) fail(`non-local image path on ${question.id}`);
    if (!question.visual_alt?.trim()) fail(`missing image alt text on ${question.id}`);
    const imagePath = resolve(publicRoot, question.visual_hint.slice(1));
    if (!imagePath.startsWith(`${publicRoot}${sep}`)) fail(`image escaped public root on ${question.id}`);
    const bytes = await readFile(imagePath).catch(() => null);
    if (!bytes) fail(`missing image file for ${question.id}`);
    else {
      const digest = createHash('sha256').update(bytes).digest('hex');
      referencedImages.set(question.visual_hint, digest);
    }
  }
  for (const part of question.parts ?? []) {
    if (!part.id || !part.prompt?.trim() || !Number.isInteger(part.marks) || part.marks < 1) fail(`invalid part data on ${question.id}`);
    if (part.input_type === 'radio' && (!Array.isArray(part.options) || part.options.length < 2)) fail(`multiple-choice options missing on ${question.id}/${part.id}`);
    if (part.input_type !== 'radio' && part.input_type !== 'text') fail(`unsupported answer control on ${question.id}/${part.id}`);
  }
}

for (const track of ['Core', 'Extended']) {
  const questionsInTrack = perTrack[track];
  if (questionsInTrack.length === 0) {
    fail(`${track} track is empty`);
    continue;
  }
  const exactQuestions = new Set();
  const exactQuestionStems = new Set();
  const imageDigests = new Set();
  const coveredObjectives = new Set();
  const usedPapers = new Set();
  for (const question of questionsInTrack) {
    const signature = normalizedQuestion(question);
    if (exactQuestions.has(signature)) fail(`duplicate question within ${track}: ${question.id}`);
    exactQuestions.add(signature);
    const stemSignature = normalizedStem(question);
    if (exactQuestionStems.has(stemSignature)) fail(`duplicate question stem within ${track}: ${question.id}`);
    exactQuestionStems.add(stemSignature);
    const objectives = new Set(question.objective_ids ?? []);
    const hasSupplement = [...objectives].some((objective) => supplementObjectives.has(objective));
    const expectedLevel = hasSupplement ? 'Extended' : 'Core';
    if (question.level !== expectedLevel) fail(`incorrect syllabus-level label on ${question.id}; expected ${expectedLevel}`);
    if (track === 'Core' && hasSupplement) fail(`Supplement question in Core track: ${question.id}`);
    for (const objective of objectives) coveredObjectives.add(objective);
    usedPapers.add(question.paper);
    if (question.visual_hint) {
      const digest = referencedImages.get(question.visual_hint);
      if (digest && imageDigests.has(digest)) fail(`repeated image within ${track}: ${question.visual_hint}`);
      if (digest) imageDigests.add(digest);
    }
  }
  const requiredObjectives = track === 'Core' ? coreObjectives : allObjectives;
  const missing = [...requiredObjectives].filter((objective) => !coveredObjectives.has(objective)).sort();
  if (missing.length) fail(`${track} misses objectives: ${missing.join(', ')}`);
  const missingPapers = [...papersByTrack[track]].filter((paper) => !usedPapers.has(paper));
  if (missingPapers.length) fail(`${track} misses papers: ${missingPapers.join(', ')}`);
}

const uniqueImageDigests = new Set(referencedImages.values());
const additionalImageDigests = new Set([...uniqueImageDigests].filter((digest) => !originalImageDigests.has(digest)));
const minimumAdditionalImageDigests = 13;
if (additionalImageDigests.size < minimumAdditionalImageDigests) fail(`only ${additionalImageDigests.size} distinct diagrams/images are new relative to the original two assets; at least ${minimumAdditionalImageDigests} additional images are required for the expanded bank`);

if (!process.exitCode) {
  console.log(JSON.stringify({
    questions: questions.length,
    core: perTrack.Core.length,
    extended: perTrack.Extended.length,
    coreObjectivesCovered: coreObjectives.size,
    extendedObjectivesCovered: allObjectives.size,
    distinctReferencedImages: uniqueImageDigests.size,
    additionalDistinctImagesBeyondOriginal: additionalImageDigests.size,
    privateMarkingFieldsInPublicBank: 0,
  }, null, 2));
}
