# Chapter 17 Genetics Quiz — Revised Implementation Plan

## Scope and evidence

Update the existing responsive React/Vite quiz in the current `biology-JH/genetics17-exam` repository and existing Vercel project. This is a two-track quiz, not a single mixed Core-first/Extended-second paper. Biology facts, examples, allele conventions, corrections and diagrams come only from the five uploaded Chapter 17 PowerPoints. Any synthetic practice values are explicitly labeled hypothetical and are not claimed as measurements from a slide. The user-supplied picture embedded in `Genetics_ModuleAssessment.pdf` may be used only as Gate 01 welcome-page cover art, not as a question or answer source. Cambridge's syllabus will be used to define and map the permitted objective scope, not as a source for outside question content or stock imagery.

The official reference is the [Cambridge IGCSE Biology 0610 course page](https://www.cambridgeinternational.org/programmes-and-qualifications/view/cambridge-igcse-biology-0610/) and its [2026–2028 syllabus PDF](https://www.cambridgeinternational.org/Images/697203-2026-2028-syllabus.pdf). Cambridge identifies Topic 17 as **Inheritance**, with sections 17.1 Chromosomes, genes and proteins, 17.2 Mitosis, 17.3 Meiosis and 17.4 Monohybrid inheritance. The linked [version 3 syllabus update, August 2026](https://www.cambridgeinternational.org/Images/748912-2026-2028-syllabus-update.pdf) says the Assessment Overview on page 9 changed; Topic 17 content was not changed.

Before this enhancement, the bank contained 38 higher-order questions (16 Core and 22 Extended) and eight distinct source-diagram assets. The completed expansion adds five questions per track for 48 total (21 Core and 27 Extended) and integrates five previously unused PowerPoint diagram crops—one from each uploaded deck—bringing the additional-distinct-image count beyond the two initial assets to thirteen.

## Track and syllabus model

The exam landing screen will require a student to choose exactly one track before entering the Homework Password:

| Track | Paper-style content | Required objective coverage |
| --- | --- | --- |
| Core | Paper 1 (MCQ), Paper 3 (structured), Paper 6 (genetics-context Alternative to Practical/data analysis) | All 29 Core and Core/Supplement objectives in Topic 17 |
| Extended | Paper 2 (MCQ), Paper 4 (structured), Paper 6 (genetics-context Alternative to Practical/data analysis) | All 37 Topic 17 objectives: the Core/shared objectives plus all Supplement objectives |

This follows Cambridge's 2026–2028 structure: Extended candidates study Core and Supplement subject content; Core candidates study Core content. Each question will carry both a track assignment and a syllabus-level label. The Core track contains Core-level questions. The Extended track covers Core objectives and Supplement objectives, presents its Core-level questions before its Supplement/Extended-level questions, and may reuse a question in the other track where appropriate. Every item also carries its exact syllabus-objective IDs, paper style, source slide references and a `cognitive_skill` tag (`application`, `analysis` or `evaluation`).

The objective map will cover all 37 listed objectives: 17.1.1–17.1.4 and 17.4.1–17.4.12 are Core; 17.1.5–17.1.6 and 17.4.13–17.4.18 are Supplement; 17.1.7–17.1.12, all of 17.2 and all of 17.3 apply to Core and Supplement. Each of the 29 Core/shared objectives must appear in the Core track; all 37 must appear in the Extended track. Question prompts will require application, analysis or evaluation in a scenario, diagram or data context rather than stand-alone recall. Paper 6-style work will stay within Chapter 17 contexts such as inheritance data, genetic crosses and slide-based experimental information.

Scope limits in the syllabus and source audit will be enforced: no named mitosis or meiosis stages, no nucleotide-structure detail, no detailed transcription/translation, and no material from other syllabus topics. Slide 39's mutation/active-site extension, unrequired mitosis-stage details, confusing or malformed worked graphics, and prompt/answer reveal slides will not be treated as required question content.

## Question uniqueness and slide visuals

Each track will have its own question set and item IDs. Exact and normalized question-text checks plus semantic review will remove repeated question intent within a track. The same question or image may appear across Core and Extended tracks, as requested, but never twice within either individual track.

The earlier source-based bank already integrated eight distinct image assets beyond the two initial project images. This enhancement adds five fresh, high-clarity slide crops from the five uploaded PowerPoints: amino-acid sequence/protein shape, chromosome replication, a human chromosome-count puzzle, a dominant-inheritance pedigree and an X-linked pedigree. Each asset keeps its source-deck/slide citation and accurate alt text. The SHA-256 validator confirms no repeated image content within a track, while cross-track reuse remains allowed.

The current expansion adds five new items to Core and five to Extended. It selects five fresh, high-clarity slide figures, one from each deck, and uses each no more than once within either track. Paired track variants share the same figure only across tracks. Synthetic counts used as practice stimuli are explicitly labeled hypothetical; they do not introduce outside biological facts or claim to be PowerPoint measurements.

## Track access, progress and server-side marking

- **Track selection and Gate 1:** the welcome page presents Core and Extended choices and requires a choice before the Homework Password can unlock the exam. `POST /api/unlock` checks the password server-side and issues a signed, time-limited token bound to that single track.
- **Track enforcement:** `GET /api/exam` returns only the question bank for the signed token's track. `POST /api/grade` accepts and grades only that track. The client offers no track-switch control after unlock, and a request to access the other track with the same session is rejected. Restart clears current-track progress but does not switch tracks.
- **Autosave:** answers remain in browser LocalStorage, namespaced by track. After Gate 1, only the selected track's saved answers are restored. Passwords, session tokens, marking keys and answer keys are never stored in LocalStorage.
- **Gate 2:** the Marking Password remains at the end of the selected track. The Vercel serverless grading endpoint uses the protected `ANSWER_KEY_JSON` plus existing server-only password/signing environment variables. Vercel limits all runtime environment variables to 64 KB per deployment, so when the key exceeds that limit, store it as a `gzip64:`-prefixed base64/gzip value in the same Secret and decode it inside the Node grading handler. No correct answers or mark points are included in the question-delivery response or static frontend build.
- **Optional AI rubric marking:** the existing `/api/grade` TypeScript serverless handler calls OpenRouter's Chat Completions API at `https://openrouter.ai/api/v1/chat/completions`, using the server-only `OPENROUTER_API_KEY` and fixed model `openrouter/free`. The deterministic rubric matcher remains the fallback if the key is absent or provider marking fails. The model uses temperature `0` and JSON Schema output requiring a bounded mark, an exact quote and short rationale for each rubric criterion; application code also strips accidental JSON markdown fences before parsing. It sends only non-empty free-text submissions and their server-loaded rubric/model answer; multiple-choice items remain deterministic. Each student response is escaped inside `<student_submission>` delimiters, and the system ignores commands within those delimiters. Application code validates quotes against the original response, caps marks by criterion and part, and calculates every total. The endpoint does not accept a client-supplied mark scheme and does not add a conflicting `api/grade.js` route. `api/grade.ts` sets `maxDuration` to 120 seconds and aborts the model request at 90 seconds. The student is told before Gate 2 if OpenRouter processing is enabled. OpenRouter documentation: [Chat Completions API](https://openrouter.ai/docs/api_reference/overview), [free router](https://openrouter.ai/docs/guides/routing/routers/free-router), [authentication](https://openrouter.ai/docs/api_reference/authentication), and [structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs). The free router may select different models, with availability and latency varying.

## Marked Script PDF

After successful marking, the results screen will offer **“Download Marked Script (PDF)”**. The existing client-side `jsPDF` flow will be extended to produce a chronological, print-ready script for the student's selected track, including student name/date, selected track, per-paper and per-question marks, total score, percentage, and explicitly indicative grade band. For every item it will include the question and subparts, embedded source diagram(s), the student's submitted answer, earned/available marks, and the correct answer/marking points. The answers and marking points will be supplied by the server only in the successful, password-authorized grading response; they will not be bundled in browser code beforehand.

No Cambridge-issued mark scheme was supplied, and these are newly authored slide-based questions. The PDF may include the project's correct answers and slide-derived marking points, but must label them as **slide-derived suggested answers/marking points—not an official Cambridge mark scheme**. If official Cambridge mark-scheme materials are required, the user must provide the authorized files for the exact questions; the app will not misrepresent the generated key as official.

## Typography and visual design

The user confirmed a **24 CSS-pixel minimum for all readable text in the web quiz interface**. This applies to question stems, part prompts, answer options and fields, buttons, instructions, metadata, feedback and labels; headings may be larger. The layout will use generous line-height and spacing, remain scrollable and responsive, and avoid shrinking labels below the 24px floor on mobile. The PDF may use normal readable print sizes and pagination appropriate for a full marked script.

Retain the approved scientific editorial exam-paper direction: warm paper background, deep ink, mineral teal, long reading column, numbered question rail, fine rules and restrained motion. The larger web type is a deliberate accessibility-led adjustment to the earlier compact editorial typography.

- **Design movement:** contemporary scientific publishing with clear exam-paper discipline.
- **Core principles:** legibility first; explicit track and syllabus hierarchy; calm, precise feedback; source-faithful visuals.
- **Color philosophy:** warm paper-white reduces glare, deep ink supports long reading, and mineral teal signals the active track and saved state.
- **Layout paradigm:** one long reading column with a prominent track selector, oversized readable question sequence and responsive single-column mobile flow.
- **Signature elements:** question-number rails, large Core/Extended badges and fine rules separating prompts, marks and feedback.
- **Interaction philosophy:** select one track before unlock; make the locked track state visible; keep answers reversible and visibly saved; separate answering from password-gated marking.
- **Animation:** brief transitions only; respect reduced-motion settings and never obscure questions or results.
- **Typography system:** Georgia for editorial headings and a system sans-serif for interface text; all web-facing text at least 24px; system monospace may be retained for compact metadata only if it also meets the 24px floor. The PDF uses readable print typography.
- **Brand essence:** a rigorous, source-grounded genetics exam room for IGCSE learners; precise, demanding, reassuring.
- **Brand voice:** direct, calm and exact. Examples: “Choose one route before you begin.” “Your answers are saved on this device.”
- **Wordmark and mark:** retain the “GENETICS / 17” wordmark and paired-allele motif.
- **Signature brand color:** mineral teal.

### User-supplied welcome-page image

Use the exact DNA/protein illustration embedded in the user's `Genetics_ModuleAssessment.pdf` as a prominent Gate 01 hero image. Preserve the image itself; improve the welcome page with responsive framing, spacing and a concise caption. Keep the track choice and Homework Password gate fully visible and usable, and use descriptive alt text. The PDF cover picture is design art only, separate from the slide-derived question bank and its image deduplication rules.

## Implementation structure and dependencies

Reuse the existing TypeScript/React/Vite frontend, Vercel serverless handlers, `jsPDF`, private environment setup, route manifest and GitHub/Vercel project. No database or new backend service is needed.

- `src/App.tsx` — track choice, password gates, locked-session flow and results.
- `src/components/QuestionCard.tsx` and related components — question layout, track/level badges, source visuals and 24px-minimum text.
- `src/lib/api.ts` — track-aware unlock, question fetch and marking requests.
- `src/lib/storage.ts` — track-keyed answer autosave/restore and same-track restart.
- `src/lib/pdfReport.ts` — complete client-generated marked-script PDF with embedded diagrams.
- `src/types.ts` — client-safe question, track, visual and report contracts; never include pre-marking answers.
- `server/questionBankData.json` — answer-free questions with track, level, paper, objective IDs, cognitive skill, source slides and visual references.
- `server/questionBank.ts`, `server/security.ts`, `server/http.ts` — server-only question selection, track-bound signed sessions, password checks and request handling.
- `api/unlock.ts`, `api/exam.ts`, `api/grade.ts` — serverless track-bound unlock, one-track delivery and protected marking/marked-script response.
- `public/source-assets/` — selected, extracted images from the supplied PowerPoints only; each used visual has an alt text, source slide and file hash in the internal inventory.
- `public/cover-art/` — the exact user-supplied PDF image used only on the welcome page; never used as question content or part of question-image deduplication.
- `public/manus-routes.json` — keep the existing single-page route manifest synchronized.

## Build and release workflow

After approval, update `TODO.md` with the complete acceptance outcomes before implementation. Finalize the objective-to-question matrix from the five-deck audit; rewrite/add track-specific higher-order questions and construct a per-track paper mix; extract and select source images with the hash-based track deduplication rule; then implement the track-bound API, localStorage partitioning, 24px-minimum web typography and full marked-script PDF. Keep the current answer key out of tracked/frontend files and test the new key locally using ignored private files. Run the existing TypeScript diagnostics, typecheck and production build, verify the `/manus-routes.json` route, and inspect the frontend build/committed files for answer-key leakage.

Before release, request a separate confirmation before replacing the existing Vercel Production `ANSWER_KEY_JSON` Secret value with the new track-complete key, using the verified gzip64 encoding if required; no other production settings will be changed without approval. After approval, update that server-only value, then push the code to the existing canonical `main` branch so the Vercel Git integration builds the matching code and key together. Confirm the resulting Production deployment and exercise the live one-track unlock, blocked cross-track access, marking and marked-script download before reporting the operational URL.
