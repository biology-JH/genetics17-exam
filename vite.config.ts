import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const apiRoutes: Record<string, string> = {
  '/api/unlock': 'unlock.ts',
  '/api/exam': 'exam.ts',
  '/api/grade': 'grade.ts',
};
const serverOnlyKeys = [
  'HOMEWORK_PASSWORD',
  'MARKING_PASSWORD',
  'SESSION_SIGNING_SECRET',
  'ANSWER_KEY_JSON',
  'ANSWER_KEY_JSON_B64',
  'OPENROUTER_API_KEY',
];

function localFunctionMiddleware(): Plugin {
  return {
    name: 'local-vercel-function-middleware',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = (request.url ?? '/').split('?')[0];
        const filename = apiRoutes[pathname];
        if (!filename) return next();

        const modulePath = resolve(process.cwd(), 'api', filename);
        if (!existsSync(modulePath)) return next();

        try {
          const route = await server.ssrLoadModule(modulePath) as {
            default?: (req: typeof request, res: typeof response) => unknown;
          };
          if (!route.default) {
            response.writeHead(500, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ error: 'API route is not configured.' }));
            return;
          }
          await route.default(request, response);
        } catch {
          if (!response.headersSent) {
            response.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
            response.end(JSON.stringify({ error: 'The local API route failed.' }));
          }
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.ANSWER_KEY_JSON_B64) {
    const decoded = Buffer.from(env.ANSWER_KEY_JSON_B64, 'base64').toString('utf8');
    try {
      JSON.parse(decoded);
      process.env.ANSWER_KEY_JSON = decoded;
    } catch {
      throw new Error('ANSWER_KEY_JSON_B64 must encode valid JSON.');
    }
  }
  for (const key of serverOnlyKeys) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }
  return {
    plugins: [react(), localFunctionMiddleware()],
    envPrefix: 'VITE_',
    server: { host: '0.0.0.0', port: 3000, strictPort: true },
    build: { sourcemap: false },
  };
});
