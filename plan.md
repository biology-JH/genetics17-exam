# Chapter 17 Genetics Exam Hall — Implementation Plan

## Scope and agreed architecture

Build a responsive single-page CIE IGCSE Biology 0610 Chapter 17 mock-exam app, based only on the five uploaded PowerPoints and their embedded diagrams. The user selected a Vercel serverless grading endpoint: the answer key and passwords will not be shipped to browser code. Student answers autosave locally in `localStorage`; they are sent to the grading endpoint only when the student explicitly requests marking.

The note contains example placeholders rather than real passwords. Generate strong, distinct values for the homework and marking gates, store them only in Vercel environment variables, and disclose the values to the owner after deployment. Keep the answer key in a server-only environment variable, never in the frontend bundle, public assets, or committed source. No password or answer key will be saved to LocalStorage.

## Exam content and organization

Create approximately 40 challenging numbered exam items, with multi-part structured questions and a mix of multiple-choice, short-answer, genetic-cross, diagram interpretation, and data-analysis/Paper 6-style items. Every item has an explicit Core or Extended label and mark allocation. Present the entire Core section before the Extended section. Use only facts, data, diagrams, and terminology present in the uploaded slide decks; attach internal slide-source references to the marking guidance. Reuse exact embedded slide diagrams where relevant and available; do not use external stock imagery.

The decks label 17.1 and 17.4 content by level, and the 17.2 deck labels its material as Extension. The 17.3 meiosis deck does not label content Core/Extended. For the draft, classify the unlabelled 17.3 meiosis content as Extended; this is a transparent working assumption for review, not a claim that the slides themselves state that level.

Mark schemes and corrections will be examiner-style guidance synthesized only from the supplied slides, not described as official Cambridge mark schemes. Since the slides do not provide Cambridge grade boundaries, the A*–G result will be an explicitly indicative percentage-based estimate, not an official Cambridge boundary.

## App flows and security

- **Gate 1:** show only the welcome/password screen before unlock. `POST /api/unlock` checks the homework password server-side and returns a short-lived signed session token. Exam questions are fetched from `GET /api/exam` only after authorization; the answer key and marking guidance remain server-side.
- **Exam:** render sections in the required Core-first, Extended-second order. Autosave each exact answer to browser `localStorage` as it changes; restore saved answers after the student re-enters Gate 1 in the same browser. Include a discreet “Clear My Progress and Restart” action at the top.
- **Gate 2 and marking:** put the Marking Password field at the bottom after all questions. `POST /api/grade` validates the session and marking password, reads the server-side answer key, and returns score, percentage, indicative grade band, and itemized feedback. Avoid returning or bundling the key before grading.
- **PDF:** generate the graded report in the browser with Student Name, Date, Total Score, and chronological incorrect-question corrections plus slide-grounded syllabus guidance. Use a client-side PDF library.
- **Server environment:** use `HOMEWORK_PASSWORD`, `MARKING_PASSWORD`, `ANSWER_KEY_JSON`, and `SESSION_SIGNING_SECRET` as Vercel runtime variables. Keep `.env` files out of Git. Do not rely on localStorage for confidential values.

## Proposed design

Three low-probability style candidates (the values are planning signals, not user choices):

1. Scientific editorial exam paper — 0.07.
2. Quiet laboratory-instrument interface — 0.04.
3. Archival field notebook — 0.02.

**Chosen direction: scientific editorial exam paper.**

- **Design movement:** contemporary scientific publishing, with a restrained examination-paper discipline.
- **Core principles:** legibility first; clear exam hierarchy; calm, precise feedback; no decorative stock imagery.
- **Color philosophy:** warm paper-white backgrounds, deep ink for sustained reading, and a distinctive mineral teal for active state and section identity.
- **Layout paradigm:** one long reading column with a compact section rail and clear numbered question sequence; avoid a generic grid of cards.
- **Signature elements:** narrow question-number rails, Core/Extended ink badges, and fine rules that separate prompts from marks and feedback.
- **Interaction philosophy:** deliberate, reversible actions; persistent “saved on this device” status; clearly separated answer and grading controls.
- **Animation:** brief progress/section transitions only; respect reduced-motion settings; no celebratory motion that obscures exam feedback.
- **Typography system:** Georgia for editorial headings, system UI sans-serif for questions and body copy, and system monospace for question numbers, marks, and compact metadata; no remote font dependency.
- **Brand essence:** a focused genetics examination room for IGCSE learners; precise, demanding, reassuring.
- **Brand voice:** direct, calm, and exact. Example lines: “The questions are set. Work carefully.” “Your progress is saved on this device.”
- **Wordmark and mark:** “GENETICS / 17” wordmark with a small paired-allele motif drawn as a simple inline mark, not a stock image.
- **Signature brand color:** mineral teal.

## Technology, deployment, and project structure

Use a TypeScript/React/Vite frontend in the flexible Webdev project, with Vercel serverless function routes under `api/` for unlock, exam delivery, and grading. Keep environment-backed server functions separate from browser components. Use `jsPDF` for client-side report generation and a pinned package-manager/lockfile. The Vercel project will be connected to a new private GitHub repository using the managed GitHub-connection confirmation flow, then linked and deployed to the authenticated Vercel team. Production environment variables must be present before the final production deployment.

Proposed structure:

- `src/App.tsx` — gate and exam state flow.
- `src/components/` — welcome gate, question renderer, Core/Extended section headers, progress, reset control, and feedback presentation.
- `src/lib/` — LocalStorage autosave/restore and PDF report generation.
- `src/types/` — question/answer/report contracts that contain no correct answers.
- `api/unlock.ts`, `api/exam.ts`, `api/grade.ts` — serverless authorization, question delivery, and secure marking.
- `server/questionBankData.json` — the answer-free, 40-question bank returned only after Gate 1.
- `server/questionBank.ts`, `server/http.ts`, `server/security.ts` — server-only data access, request handling, password checks, and signed exam sessions.
- `public/source-assets/` — only relevant extracted images from the supplied slides, if an exact diagram asset exists and is needed.
- `public/manus-routes.json` — the route manifest for the SPA.
- `README.md` — setup and environment-variable names only, with no secret values.
- `plan.md` and, after approval, `TODO.md` — implementation plan and tracked outcomes.

## Build workflow

After plan approval: create `TODO.md`; inspect/map slide diagrams; author and cross-check the Core-first / Extended-second question bank from each source deck; implement the frontend, serverless functions, and secure environment-backed marking; configure diagnostics and dependencies; run the app in Preview and verify its route manifest; inspect the built source to ensure secrets and answers are not in client assets; connect the new private GitHub repository through its owner-confirmation flow; add the Vercel environment variables; link and deploy the production project; verify the published URL and the grading endpoint before reporting it.
