# Chapter 17 Genetics — Exam Hall

A source-grounded CIE IGCSE Biology 0610 Chapter 17 mock-exam web app. The question bank uses only the five supplied PowerPoints and integrates eight distinct diagrams/images extracted directly from their source slides. The welcome page separately uses the picture supplied in `Genetics_ModuleAssessment.pdf` as cover art only.

## Local development

Requires Node.js 22 or later and pnpm 11.25.0 (the version is pinned in `package.json`). Install dependencies and start the Vite app:

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
# Replace the local-only gate and signing placeholders.
# For marking, set ANSWER_KEY_JSON_B64 to the base64 encoding of the private JSON key file.
pnpm dev
```

`ANSWER_KEY_JSON_B64` is a local Vite helper: `vite.config.ts` decodes it into the Node-only `process.env.ANSWER_KEY_JSON`. Alternatively, supply raw `ANSWER_KEY_JSON` to the local Node process. In Vercel Production, `ANSWER_KEY_JSON` must be a Secret. The Node grading handler accepts raw JSON or a `gzip64:` prefix followed by base64-encoded gzip-compressed UTF-8 JSON, and decodes the compressed form only at runtime. Use the compressed form when the key exceeds Vercel's 64 KB per-deployment environment-variable limit; never add either key form to the repository or frontend assets.

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
- `ANSWER_KEY_JSON` — private structured marking key. Store it as a Vercel Secret; use `gzip64:` plus base64-encoded gzip JSON when needed to fit the per-deployment environment limit. It is decoded only by the server-side grading handler.

The frontend stores only the student's name and submitted responses in that browser's LocalStorage. It does not store either gate password or grading secrets. Answers are sent to `/api/grade` only when marking is requested.

## Vercel

Connect this private repository to a Vercel project. Use the repository root, install command `pnpm install --frozen-lockfile`, build command `pnpm build`, and output directory `dist`. Add the four runtime environment variables above in Vercel before deploying. API handlers are in `api/`; the answer-free question data is server-side in `server/questionBankData.json`.
