import type { IncomingMessage, ServerResponse } from 'node:http';
import { isSameOriginRequest, methodNotAllowed, readJsonBody, sendJson } from '../server/http.js';
import { createSessionToken, isTrack, matchesConfiguredPassword } from '../server/security.js';

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method !== 'POST') return methodNotAllowed(response, 'POST');
  if (!isSameOriginRequest(request)) return sendJson(response, 403, { error: 'This request is not allowed.' });
  const password = process.env.HOMEWORK_PASSWORD;
  const signingSecret = process.env.SESSION_SIGNING_SECRET;
  if (!password || !signingSecret) return sendJson(response, 503, { error: 'The exam gate is not configured.' });

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch {
    return sendJson(response, 400, { error: 'Please submit a valid request.' });
  }
  if (!isTrack(body.track)) return sendJson(response, 400, { error: 'Choose either the Core or Extended track before unlocking.' });
  if (!matchesConfiguredPassword(body.password, password)) return sendJson(response, 401, { error: 'That Homework Password was not accepted.' });
  return sendJson(response, 200, { token: createSessionToken(signingSecret, body.track), track: body.track });
}
