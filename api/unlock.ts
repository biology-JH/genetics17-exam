import type { IncomingMessage, ServerResponse } from 'node:http';
import { isSameOriginRequest, methodNotAllowed, readJsonBody, sendJson } from '../server/http.js';
import { createSessionToken, isActivityMode, isRevisionDifficulty, isSession, isTrack, matchesConfiguredPassword } from '../server/security.js';

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method !== 'POST') return methodNotAllowed(response, 'POST');
  if (!isSameOriginRequest(request)) return sendJson(response, 403, { error: 'This request is not allowed.' });
  const password = process.env.HOMEWORK_PASSWORD;
  const signingSecret = process.env.SESSION_SIGNING_SECRET;
  if (!password || !signingSecret) return sendJson(response, 503, { error: 'The exam gate is not configured.' });
  let body: Record<string, unknown>;
  try { body = await readJsonBody(request); } catch { return sendJson(response, 400, { error: 'Please submit a valid request.' }); }
  if (!isTrack(body.track) || !isSession(body.session)) return sendJson(response, 400, { error: 'Choose a valid track and one of sessions 17.1, 17.2, 17.3 or 17.4.' });
  const mode = body.mode === undefined ? 'weekly' : body.mode;
  const difficulty = body.revisionDifficulty;
  if (!isActivityMode(mode) || (mode === 'revision-long' ? !isRevisionDifficulty(difficulty) : difficulty !== undefined)) return sendJson(response, 400, { error: 'Choose a valid revision mode and difficulty.' });
  if (!matchesConfiguredPassword(body.password, password)) return sendJson(response, 401, { error: 'That Homework Password was not accepted.' });
  return sendJson(response, 200, { token: createSessionToken(signingSecret, body.track, body.session, mode, isRevisionDifficulty(difficulty) ? difficulty : undefined), track: body.track, session: body.session, mode, ...(isRevisionDifficulty(difficulty) ? { revision_difficulty: difficulty } : {}) });
}
