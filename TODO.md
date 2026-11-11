# Project outcomes

## 1. Source-grounded Chapter 17 mock exam

- [x] Topic is Chapter 17: Genetics (CIE IGCSE Biology 0610).
- [x] Strictly use ONLY text, charts, and diagrams extracted from the uploaded PowerPoint slides. Do NOT brainstorm or fetch external visual stock images. If a question requires a genetic diagram (e.g., pedigree chart, Punnett square), extract the precise image asset from the slides.
- [x] Create a comprehensive and difficult mock exam styled after Paper 1 & 2 (difficult multiple-choice questions), Paper 3 & 4 (challenging structured, short-answer, and data-analysis questions), and Paper 6 (Alternative to Practical, focusing on genetic crosses or experimental data found within the slides).
- [x] Every single question is explicitly labeled either “Core” or “Extended”. All “Core” questions appear first in their entirety, followed by all “Extended” questions.
- [x] The approved planning assumption is that the unlabelled meiosis material in 17.3 is classified Extended; corrections are identified as slide-derived study guidance, not an official Cambridge marking scheme. The estimated A*–G band is explicitly indicative, not an official Cambridge grade boundary.

## 2. Homework and marking gates

- [ ] On visiting the live Vercel URL, users see only a clean welcome screen demanding a “Homework Password”. Entering the correct password reveals the exam.
- [ ] At the very bottom of the completed exam, provide a secure field asking for a “Marking Password”. Entering it executes marking and reveals feedback.
- [ ] Use unique strong generated values for both passwords and store them only in Vercel server environment variables; disclose them to the owner after deployment. Do not put either password in frontend source or browser-visible assets.

## 3. Browser-local progress and restart

- [x] As students type text or click radio buttons, their exact inputs are automatically backed up to the browser’s LocalStorage in real time.
- [x] If a student switches off their computer, loses internet connection, or closes the tab, all progress remains cached. When they return to the URL via the same browser and enter the Gate 1 password, previous answers instantly repopulate.
- [x] Provide a small, discreet “Clear My Progress and Restart” button at the top for emergency resets.
- [x] Do not store passwords, answer keys, or other grading secrets in LocalStorage.

## 4. Secure marking and graded PDF

- [ ] Keep the Master Answer Key strictly encrypted or hidden securely in server environment variables (`process.env`) so tech-savvy students cannot bypass the lock via “Inspect Element / View Source”. Use the approved Vercel serverless grading endpoint; answers are sent to it only when marking is explicitly requested.
- [x] After Gate 2 is unlocked with the correct Marking Password, cross-reference the student’s inputs against the key and show final score, percentage, and an explicitly indicative estimated grade band from A* to G.
- [x] Provide a “Download Graded Report PDF” button. The client-side generated PDF contains Student Name, Date, Total Score, and a chronological itemization of every incorrect question with slide-grounded correction and syllabus guidance. Since the uploaded slides do not supply official Cambridge schemes or grade boundaries, do not label corrections/bands as official.

## 5. Responsive exam interface

- [x] Deliver a fully dynamic, responsive single-page application using modern HTML/CSS/JS or React.
- [x] Implement the approved scientific editorial exam-paper design: readable question sequence, clear Core/Extended hierarchy, mineral-teal signature color, and no external stock imagery.

## 6. GitHub and Vercel delivery

- [ ] Set up a clean, new private GitHub repository, upload all intended application files, and commit the app.
- [ ] Link the repository to Vercel, configure runtime secrets without committing them, and deploy the working app live via Vercel.
- [ ] Provide the final operational Vercel URL and confirmation of the security validation: answer key/passwords are server-only, not present in frontend build output or committed files.
