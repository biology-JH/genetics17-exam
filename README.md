# Chapter 17 Genetics — Exam Hall

A source-grounded CIE IGCSE Biology 0610 Chapter 17 mock-exam web app with 45 higher-order questions (20 Core and 25 Extended) across four independent weekly sessions. Questions and diagrams remain grounded in the five supplied PowerPoints; synthetic practice data are labeled as hypothetical. The welcome page uses the picture supplied in `Genetics_ModuleAssessment.pdf` as cover art only. A decorative giraffe icon accompanies the creator credit at the bottom of the site.

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

- `HOMEWORK_PASSWORD` — Homework Password for Gate 1.
- `MARKING_PASSWORD_171` — Marking Password for session 17.1.
- `MARKING_PASSWORD_172` — Marking Password for session 17.2.
- `MARKING_PASSWORD_173` — Marking Password for session 17.3.
- `MARKING_PASSWORD_174` — Marking Password for session 17.4.
- `SESSION_SIGNING_SECRET` — random secret used to sign short-lived exam sessions bound to one track and week.
- `ANSWER_KEY_JSON` — private structured marking key. Store it as a Vercel Secret; use `gzip64:` plus base64-encoded gzip JSON when needed to fit the per-deployment environment limit. It is decoded only by the server-side grading handler.
- `OPENROUTER_API_KEY` — optional server-only OpenRouter key for structured rubric marking of non-empty written answers; never use a `VITE_`-prefixed name. The server always requests the `openrouter/free` router.

The frontend stores the student's name and submitted responses in that browser's LocalStorage, partitioning saved answers by track and weekly session. It does not store gate passwords, session tokens, or grading secrets. Answers are sent to `/api/grade` only when marking is requested; the server loads the private rubric itself rather than accepting a mark scheme from the browser. If the OpenRouter key is not configured or model marking fails, the deterministic server-side rubric is used. The student-facing Gate 2 and results screen do not identify OpenRouter/AI or disclose whether provider or deterministic grading produced the result. The `openrouter/free` router chooses among available free models, so latency and availability can vary.

## Vercel

Connect this private repository to a Vercel project. Use the repository root, install command `pnpm install --frozen-lockfile`, build command `pnpm build`, and output directory `dist`. Add all seven required runtime environment variables above in Vercel before deploying; `OPENROUTER_API_KEY` is optional. The current `/api/grade` handler is implemented in `api/grade.ts`; do not add a parallel `api/grade.js` route. The answer-free question data is server-side in `server/questionBankData.json`.
