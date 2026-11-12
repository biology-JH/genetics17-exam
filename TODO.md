# Project outcomes

**Current status:** The 48-question bank, five new source-slide figures and structured-grading code pass local validation and are live on Vercel. The approved expanded Production `ANSWER_KEY_JSON` works with the unchanged Homework and Marking passwords. The live Extended mark flow completed at 0/124 in a blank-answer QA run, and its 28-page marked-script PDF downloaded with 17 embedded images and all 27 objective markers. Production AI grading remains disabled because no OpenAI key is configured; marking uses deterministic server-side rubric matching.

## 1. Source-grounded Chapter 17 question bank

- [x] Topic is Chapter 17: Genetics / Inheritance in CIE IGCSE Biology 0610.
- [x] Use only PowerPoint-derived biology facts, examples, diagrams and answer explanations. Any synthetic practice numbers are explicitly labeled hypothetical and are not presented as measurements from a slide. Do not add outside biological facts or external stock images.
- [x] Cover 100% of the current Cambridge IGCSE Biology 0610 Topic 17 syllabus objectives in the relevant track: Core covers all 29 Core and Core/Supplement objectives; Extended covers all 37 objectives, including the 8 Supplement objectives.
- [x] Map each question to exact Topic 17 objective IDs: 17.1.1–17.1.4 and 17.4.1–17.4.12 are Core; 17.1.5–17.1.6 and 17.4.13–17.4.18 are Supplement; 17.1.7–17.1.12, all of 17.2, and all of 17.3 apply to Core and Supplement.
- [x] Every question requires higher-order thinking through application, analysis or evaluation; avoid stand-alone recall-only questions.
- [x] Corrections and guidance grounded in the PowerPoints are identified as slide-derived, not an official Cambridge marking scheme. Any estimated A*–G grade band is explicitly indicative, not an official Cambridge grade boundary.

## 2. Separate, mutually exclusive tracks

- [x] Divide the quiz into two separate tracks: Core combines Paper 1, Paper 3 and Paper 6 questions; Extended combines Paper 2, Paper 4 and Paper 6 questions.
- [x] Students must select either Core or Extended before starting. Prevent access to both tracks in a single session.
- [x] Bind the unlocked session to its chosen track; the exam and grading endpoints must reject attempts to fetch or grade the other track in that same session.
- [x] The Core track contains Core-level questions. The Extended track covers Core objectives and Supplement objectives, shows its Core-level questions before its Extended/Supplement-level questions, and may share questions with Core where appropriate.
- [x] Store and restore autosaved answers only for the selected track during that session; restarting clears the selected track's progress without switching tracks.

## 3. Source diagrams and within-track uniqueness

- [x] Extract and integrate at least eight additional relevant diagram/image assets from the uploaded PowerPoints, beyond the two already in the project.
- [x] Questions and diagrams may overlap between the Core and Extended tracks.
- [x] Enforce zero duplicate questions and zero repeated diagrams/images within the Core track itself, and zero duplicates within the Extended track itself.
- [x] Use the exact relevant source slide image where available, with accessible alt text and slide citation; do not use malformed, answer-reveal or out-of-scope diagram variants.

## 4. Homework/marking gates, privacy and progress

- [x] On visiting the live Vercel URL, users see only a clean welcome screen demanding a “Homework Password”. Entering the correct password reveals the selected track's exam.
- [x] At the very bottom of the completed selected-track exam, provide a secure field asking for a “Marking Password”. Entering it executes marking and reveals feedback.
- [x] Use unique strong generated values for both passwords and store them only in Vercel server environment variables; disclose them to the owner after deployment. Do not put either password in frontend source or browser-visible assets.
- [x] Keep the master answer key server-only in the protected Vercel environment; do not include it in browser source, static assets, or LocalStorage. Submit student answers to the serverless grading endpoint only when marking is explicitly requested.
- [x] As students type text or choose radio options, save their exact inputs to browser LocalStorage in real time.
- [x] If a student switches off their computer, loses internet connection, or closes the tab, progress remains cached. When they return in the same browser and enter the Gate 1 password, their previously saved answers are restored.
- [x] Provide a discreet “Clear My Progress and Restart” control near the top of the exam.
- [x] Do not store passwords, session tokens, answer keys, or other grading secrets in LocalStorage.
- [x] Preserve those privacy and persistence rules while namespacing answer progress by track and binding the selected track into the signed server session.

## 5. Server marking and marked-script PDF

- [x] After the Marking Password is accepted, cross-reference the student's inputs against the private key and show the final score, percentage, and an explicitly indicative estimated grade band from A* to G.
- [x] Add a “Download Marked Script (PDF)” button on the final results screen.
- [x] Generate a formatted PDF containing the questions, embedded diagrams, the student's submitted answers, the correct answers/marking points, and the final score breakdown; include Student Name, Date, total score, percentage, indicative grade band, marks by paper/question, and chronological incorrect-answer corrections.
- [x] Use a readable print layout and print typography in the PDF; web-interface font minimums do not apply to the PDF.
- [x] Because no official Cambridge mark schemes for these newly written questions were supplied, label generated keys and corrections “slide-derived suggested answers/marking points—not an official Cambridge mark scheme.” Do not misrepresent the private answer key as an official scheme.
- [x] The existing serverless grading architecture keeps answers out of the pre-marking exam payload; preserve this and release correct answers/marking points only in the successful, password-authorized grading response used for the marked script.
- [x] When `GENETICS_OPENAI_API_KEY` is configured on the server, grade only non-empty written submissions strictly from each supplied rubric criterion and model answer using Structured Outputs JSON Schema at temperature `0`. Require an individual bounded award, exact student quote evidence and a short rationale for each criterion; keep multiple-choice items deterministic and do not ask the model to calculate total scores.
- [x] Wrap each student response in escaped `<student_submission>...</student_submission>` delimiters and instruct the system to ignore commands or prompt injections inside student text.
- [x] Verify every returned evidence quote is an exact substring of the student's original response, cap awards by criterion and part, and sum all question, paper and exam totals in server code.
- [x] Set a Vercel function `maxDuration` of 120 seconds for grading and abort the model request at 90 seconds; if AI grading is not configured or fails, use the existing deterministic rubric result rather than lose a student's grading request.
- [x] Load `GENETICS_OPENAI_API_KEY` and optional `GENETICS_OPENAI_MODEL` only from server environment variables; never hardcode an API key or include one in browser code, the answer payload, or LocalStorage. Inform students before marking if their written answers may be processed by OpenAI when AI grading is enabled. The local Vite server now forwards these only to its Node-side API process; the browser environment remains restricted to `VITE_` values.
- [x] Keep Production AI grading disabled until the project owner adds an OpenAI API key under `GENETICS_OPENAI_API_KEY` in the Vercel server environment; the existing deterministic grading remains available meanwhile.

## 6. Responsive interface and accessibility

- [x] Deliver a fully dynamic, responsive single-page application using React.
- [x] Retain the scientific editorial exam-paper design, mineral-teal signature color, readable question sequence and no external stock imagery.
- [x] Improve the Gate 01 welcome front page using the exact DNA/protein picture embedded in the user-attached `Genetics_ModuleAssessment.pdf` as prominent hero art; keep the track selection and Homework Password gate clear, responsive and fully usable.
- [x] Apply a minimum font size of 24 CSS pixels to all readable text in the web quiz interface, including questions, choices, fields, buttons, instructions, labels, metadata, feedback and score text; headings may be larger.
- [x] Keep the 24px-minimum interface responsive and readable on narrow screens, with sufficient line-height and scrolling rather than shrinking text below 24px.

## 7. Additional higher-order questions and diagrams

- [x] Add five new higher-order questions to Core and five to Extended, increasing the bank from 16 to 21 Core questions and from 22 to 27 Extended questions (48 total).
- [x] Base every new question's biology facts, examples, answer and diagram solely on the five uploaded Chapter 17 PowerPoints, label any synthetic practice values as hypothetical, and map each question to exact Topic 17 objective IDs and its track's paper style.
- [x] Require each new question to test application, analysis or evaluation, not stand-alone recall.
- [x] Integrate five additional, previously unused, high-clarity PowerPoint diagram crops—one from each deck—with accurate slide citation and accessible alt text.
- [x] Allow new questions and diagrams to overlap between Core and Extended, while enforcing zero duplicate questions and zero repeated diagram/image content within Core and within Extended.
- [x] Update the local private server-side marking key, score totals and PDF marked-script content for the new questions without exposing correct answers in the exam payload, frontend build or LocalStorage.

## 8. GitHub and Vercel delivery

- [x] Set up the private GitHub repository and commit the existing application files.
- [x] Link the repository to the existing Vercel project and keep runtime secrets out of the repository.
- [x] After owner approval, replace only Production `ANSWER_KEY_JSON` with the expanded 48-question gzip64 key; leave `HOMEWORK_PASSWORD`, `MARKING_PASSWORD`, and `SESSION_SIGNING_SECRET` unchanged.
- [x] Push the matching updated source to the private canonical GitHub main and verify Vercel deploys that code with the new key.
- [x] Provide the operational Vercel URL for the expanded release and confirm the answer key/passwords remain server-only and are absent from frontend build output and committed files.
