import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import process from 'node:process';
import { gunzipSync } from 'node:zlib';

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
// Session 17.4 Question 11 was intentionally removed; its unique figure is no longer referenced.
const minimumAdditionalImageDigests = 12;
if (additionalImageDigests.size < minimumAdditionalImageDigests) fail(`only ${additionalImageDigests.size} distinct diagrams/images are new relative to the original two assets; at least ${minimumAdditionalImageDigests} additional images are required for the expanded bank`);

const revisionBankPath = resolve(root, 'server/revisionQuestionBankData.json');
const revisionQuestions = JSON.parse(await readFile(revisionBankPath, 'utf8'));
const revisionIds = new Set();
const revisionFigurePaths = new Set();
const revisionCounts = { mcq: 0, long: 0, coreTier: 0, extendedTier: 0, easy: 0, medium: 0, hard: 0 };
const normalizeRevision = (value) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
if (!Array.isArray(revisionQuestions) || revisionQuestions.length === 0) {
  fail('revision question bank must be a non-empty array');
} else {
  if ([...forbiddenKeyFields].some((key) => nestedFieldNames(revisionQuestions).has(key))) fail('a private marking-key field is present in the public revision bank');
  for (const question of revisionQuestions) {
    const isMcq = question.id?.startsWith('RMCQ_');
    const isLong = question.id?.startsWith('RLONG_');
    if (!isMcq && !isLong) fail(`invalid revision question id ${question.id}`);
    if (revisionIds.has(question.id)) fail(`duplicate revision question id ${question.id}`);
    revisionIds.add(question.id);
    if (isMcq) revisionCounts.mcq += 1;
    if (isLong) revisionCounts.long += 1;
    if (!['Core', 'Extended'].includes(question.revision_tier)) fail(`invalid revision tier on ${question.id}`);
    else revisionCounts[question.revision_tier === 'Core' ? 'coreTier' : 'extendedTier'] += 1;
    if (isLong) {
      if (!['Easy', 'Medium', 'Hard'].includes(question.revision_difficulty)) fail(`invalid long-question difficulty on ${question.id}`);
      else revisionCounts[question.revision_difficulty.toLowerCase()] += 1;
    }
    if (!Array.isArray(question.parts) || question.parts.length === 0) fail(`missing revision question parts on ${question.id}`);
    if (question.parts?.reduce((sum, part) => sum + (Number(part.marks) || 0), 0) !== question.total_marks) fail(`revision part marks do not sum to question marks on ${question.id}`);
    const partIds = new Set();
    for (const part of question.parts ?? []) {
      if (!part.id || partIds.has(part.id)) fail(`missing or duplicate part id on ${question.id}`);
      partIds.add(part.id);
      if (!part.prompt?.trim() || !Number.isInteger(part.marks) || part.marks < 1) fail(`invalid part data on ${question.id}/${part.id}`);
      if (isLong && !['Core', 'Extended'].includes(part.revision_tier)) fail(`invalid part revision tier on ${question.id}/${part.id}`);
      if (isMcq && (part.input_type !== 'radio' || !Array.isArray(part.options) || part.options.length < 2)) fail(`invalid MCQ options on ${question.id}/${part.id}`);
      if (isLong && part.input_type !== 'text') fail(`long-question part must use text input on ${question.id}/${part.id}`);
    }
    if (question.visual_hint) fail(`weekly-session figure field used on revision question ${question.id}; use revision_visuals`);
    for (const visual of question.revision_visuals ?? []) {
      if (typeof visual.src !== 'string' || !visual.src.startsWith('/revision-assets/') || visual.src.includes('..')) fail(`non-local revision figure path on ${question.id}`);
      if (!visual.alt?.trim() || !/page\s+\d+/i.test(visual.source ?? '')) fail(`revision figure needs accessible alt text and source PDF page on ${question.id}`);
      const imagePath = resolve(publicRoot, (visual.src ?? '').slice(1));
      if (!imagePath.startsWith(`${publicRoot}${sep}`)) fail(`revision image escaped public root on ${question.id}`);
      const bytes = await readFile(imagePath).catch(() => null);
      if (!bytes) fail(`missing revision figure for ${question.id}: ${visual.src}`);
      else revisionFigurePaths.add(visual.src);
    }
  }
  if (revisionCounts.mcq !== 36 || revisionCounts.long !== 19) fail(`expected 36 MCQs and 19 long questions; found ${revisionCounts.mcq} and ${revisionCounts.long}`);
  for (const track of ['Core', 'Extended']) {
    const selected = revisionQuestions.filter((question) => track === 'Extended' || question.revision_tier === 'Core');
    const uniqueQuestionContent = new Set();
    const uniqueFigures = new Set();
    for (const question of selected) {
      const signature = normalizeRevision([question.stem, ...question.parts.flatMap((part) => [part.prompt, ...(part.options ?? [])])].join(' '));
      if (uniqueQuestionContent.has(signature)) fail(`duplicate question within ${track} revision: ${question.id}`);
      uniqueQuestionContent.add(signature);
      if (track === 'Core' && question.id.startsWith('RLONG_') && question.parts.filter((part) => part.revision_tier === 'Core').length === 0) fail(`Core revision question has no Core parts: ${question.id}`);
      for (const visual of question.revision_visuals ?? []) {
        if (uniqueFigures.has(visual.src)) fail(`repeated source figure within ${track} revision: ${visual.src}`);
        uniqueFigures.add(visual.src);
      }
    }
    if (track === 'Core') revisionCounts.coreSelected = selected.length;
    else revisionCounts.extendedSelected = selected.length;
  }
}

const configuredRevisionKey = process.env.REVISION_ANSWER_KEY_JSON
  || (process.env.REVISION_ANSWER_KEY_JSON_B64 ? Buffer.from(process.env.REVISION_ANSWER_KEY_JSON_B64, 'base64').toString('utf8') : '');
let privateRevisionKeyChecked = false;
if (configuredRevisionKey) {
  try {
    const decodedKey = configuredRevisionKey.startsWith('gzip64:')
      ? gunzipSync(Buffer.from(configuredRevisionKey.slice('gzip64:'.length), 'base64')).toString('utf8')
      : configuredRevisionKey;
    const revisionKey = JSON.parse(decodedKey);
    if (!revisionKey || typeof revisionKey !== 'object' || Array.isArray(revisionKey)) throw new Error('Key must be a JSON object');
    const expectedIds = new Set(revisionQuestions.map((question) => question.id));
    for (const id of expectedIds) {
      const keyQuestion = revisionKey[id];
      const bankQuestion = revisionQuestions.find((question) => question.id === id);
      if (!keyQuestion || !keyQuestion.parts || !keyQuestion.correction || !keyQuestion.syllabus_guidance) { fail(`revision answer key is incomplete for ${id}`); continue; }
      if (Object.keys(keyQuestion.parts).length !== bankQuestion.parts.length) fail(`revision answer key has mismatched parts for ${id}`);
      for (const part of bankQuestion.parts) {
        const keyPart = keyQuestion.parts[part.id];
        const points = keyPart?.marking_points;
        if (!keyPart || typeof keyPart.model_answer !== 'string' || !Array.isArray(points) || points.length === 0) { fail(`revision answer key part is incomplete for ${id}/${part.id}`); continue; }
        if (points.some((point) => !Number.isInteger(point.marks) || point.marks <= 0 || !Array.isArray(point.accepted_phrases) || point.accepted_phrases.length === 0)) fail(`revision key has an invalid rubric criterion for ${id}/${part.id}`);
        if (points.reduce((sum, point) => sum + (Number(point.marks) || 0), 0) !== part.marks) fail(`revision rubric total differs from bank marks for ${id}/${part.id}`);
      }
    }
    if (Object.keys(revisionKey).some((id) => !expectedIds.has(id))) fail('revision answer key contains IDs not present in the revision bank');
    privateRevisionKeyChecked = true;
  } catch (error) {
    fail(`revision answer key could not be parsed: ${error instanceof Error ? error.message : 'invalid JSON'}`);
  }
}

if (!process.exitCode) {
  console.log(JSON.stringify({
    questions: questions.length,
    core: perTrack.Core.length,
    extended: perTrack.Extended.length,
    coreObjectivesCovered: coreObjectives.size,
    extendedObjectivesCovered: allObjectives.size,
    distinctReferencedImages: uniqueImageDigests.size,
    additionalDistinctImagesBeyondOriginal: additionalImageDigests.size,
    revisionQuestionCount: revisionQuestions.length,
    revisionMCQCount: revisionCounts.mcq,
    revisionLongCount: revisionCounts.long,
    coreRevisionQuestionCount: revisionCounts.coreSelected,
    extendedRevisionQuestionCount: revisionCounts.extendedSelected,
    revisionFigureCount: revisionFigurePaths.size,
    privateRevisionKeyChecked,
    privateMarkingFieldsInPublicBank: 0,
  }, null, 2));
}
