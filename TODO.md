# Project outcomes

## 1. Source-grounded Chapter 17 question bank

- [x] Topic is Chapter 17: Genetics / Inheritance in CIE IGCSE Biology 0610.
- [x] Use only text, charts, data and diagrams from the uploaded PowerPoint slides for question content and visuals. Do not brainstorm facts outside the slides or use external stock images.
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
- [ ] Use unique strong generated values for both passwords and store them only in Vercel server environment variables; disclose them to the owner after deployment. Do not put either password in frontend source or browser-visible assets.
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

## 6. Responsive interface and accessibility

- [x] Deliver a fully dynamic, responsive single-page application using React.
- [x] Retain the scientific editorial exam-paper design, mineral-teal signature color, readable question sequence and no external stock imagery.
- [x] Improve the Gate 01 welcome front page using the exact DNA/protein picture embedded in the user-attached `Genetics_ModuleAssessment.pdf` as prominent hero art; keep the track selection and Homework Password gate clear, responsive and fully usable.
- [x] Apply a minimum font size of 24 CSS pixels to all readable text in the web quiz interface, including questions, choices, fields, buttons, instructions, labels, metadata, feedback and score text; headings may be larger.
- [x] Keep the 24px-minimum interface responsive and readable on narrow screens, with sufficient line-height and scrolling rather than shrinking text below 24px.

## 7. GitHub and Vercel delivery

- [x] Set up the private GitHub repository and commit the existing application files.
- [x] Link the repository to the existing Vercel project and keep runtime secrets out of the repository.
- [ ] Update the Production answer key only after owner approval, then deploy the matching updated source and key through the existing GitHub/Vercel release path.
- [ ] Provide the final operational Vercel URL and confirm that the answer key/passwords remain server-only and are absent from frontend build output and committed files.
