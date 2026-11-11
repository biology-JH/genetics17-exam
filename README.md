# Chapter 17 Genetics — Exam Hall

A source-grounded CIE IGCSE Biology 0610 Chapter 17 mock-exam web app. The question bank uses only the five supplied PowerPoints; the two displayed diagrams are extracted directly from their source slides.

## Local development

Requires Node.js 22 or later and pnpm 11.25.0 (the version is pinned in `package.json`). Install dependencies and start the Vite app:

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
# Replace the local-only gate and signing placeholders.
# For marking, set ANSWER_KEY_JSON_B64 to the base64 encoding of the private JSON key file.
pnpm dev
```

`ANSWER_KEY_JSON_B64` is a local Vite helper: `vite.config.ts` decodes it into the Node-only `process.env.ANSWER_KEY_JSON`. Alternatively, supply raw `ANSWER_KEY_JSON` to the local Node process. Vercel production uses the raw `ANSWER_KEY_JSON` runtime variable; never add the key file or encoded value to the repository.

Build and type-check with:

```sh
pnpm run typecheck
pnpm build
```

The local Vite middleware serves the `/api/unlock`, `/api/exam`, and `/api/grade` functions. Never commit `.env.local`, real passwords, signing material, or the marking key.

## Runtime environment

Configure these names as Vercel **runtime** environment variables for Production (and Preview if needed):

- `HOMEWORK_PASSWORD` — Gate 1 password.
- `MARKING_PASSWORD` — Gate 2 password.
- `SESSION_SIGNING_SECRET` — random secret used to sign short-lived exam sessions.
- `ANSWER_KEY_JSON` — private structured marking key; do not add it to frontend code, static assets, or the repository.

The frontend stores only the student's name and submitted responses in that browser's LocalStorage. It does not store either gate password or grading secrets. Answers are sent to `/api/grade` only when marking is requested.

## Vercel

Connect this private repository to a Vercel project. Use the repository root, install command `pnpm install --frozen-lockfile`, build command `pnpm build`, and output directory `dist`. Add the four runtime environment variables above in Vercel before deploying. API handlers are in `api/`; the answer-free question data is server-side in `server/questionBankData.json`.
