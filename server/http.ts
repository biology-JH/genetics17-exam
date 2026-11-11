import type { IncomingMessage, ServerResponse } from 'node:http';

export type JsonRequest = IncomingMessage & { body?: unknown };

export function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  response.end(JSON.stringify(payload));
}

export async function readJsonBody(request: JsonRequest): Promise<Record<string, unknown>> {
  if (request.body && typeof request.body === 'object' && !Array.isArray(request.body)) {
    return request.body as Record<string, unknown>;
  }
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > 1_000_000) throw new Error('Request body is too large.');
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected a JSON object.');
  return parsed as Record<string, unknown>;
}

export function methodNotAllowed(response: ServerResponse, allow: string): void {
  response.writeHead(405, {
    Allow: allow,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify({ error: 'Method not allowed.' }));
}

export function isSameOriginRequest(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  if (!origin) return true;
  const rawHost = request.headers['x-forwarded-host'] ?? request.headers.host;
  const expectedHost = Array.isArray(rawHost) ? rawHost[0] : rawHost?.split(',')[0]?.trim();
  if (!expectedHost) return false;
  try {
    return new URL(origin).host.toLowerCase() === expectedHost.toLowerCase();
  } catch {
    return false;
  }
}
