import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, BookOpen, Check, Dna, Download, LockKeyhole, ShieldCheck } from 'lucide-react';
import QuestionCard from './components/QuestionCard';
import { getExam, markExam, unlockExam } from './lib/api';
import { clearProgress, loadProgress, loadStudentName, saveProgress, saveStudentName } from './lib/storage';
import { downloadMarkedScript } from './lib/pdfReport';
import type { Answers, ExamPayload, GradeResult, Track } from './types';

const TRACK_INFO: Record<Track, { papers: string; description: string; syllabus: string }> = {
  Core: {
    papers: 'Papers 1 · 3 · 6',
    description: 'Core-only practice: multiple choice, structured responses and genetics-focused practical/data questions.',
    syllabus: 'Core syllabus objectives',
  },
  Extended: {
    papers: 'Papers 2 · 4 · 6',
    description: 'Extended practice: Core objectives first, followed by Supplement-level questions, with Paper 6-style tasks.',
    syllabus: 'Core + Supplement objectives',
  },
};

export default function App() {
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [homeworkPassword, setHomeworkPassword] = useState('');
  const [markingPassword, setMarkingPassword] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [exam, setExam] = useState<ExamPayload | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [studentName, setStudentName] = useState(() => loadStudentName());
  const [savedAt, setSavedAt] = useState('');
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [gateBusy, setGateBusy] = useState(false);
  const [markBusy, setMarkBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!progressLoaded || !exam) return;
    const updatedAt = new Date().toISOString();
    saveProgress(exam.track, { answers, studentName, updatedAt });
    setSavedAt(updatedAt);
  }, [answers, studentName, progressLoaded, exam]);

  useEffect(() => {
    if (!selectedTrack) return;
    const savedName = loadStudentName(selectedTrack);
    if (savedName && !studentName.trim()) setStudentName(savedName);
  }, [selectedTrack, studentName]);

  const answeredParts = useMemo(() => exam?.questions.reduce((count, question) =>
    count + question.parts.filter((part) => (answers[question.id]?.[part.id] ?? '').trim().length > 0).length, 0) ?? 0, [exam, answers]);
  const totalParts = useMemo(() => exam?.questions.reduce((count, question) => count + question.parts.length, 0) ?? 0, [exam]);
  const progressPercent = totalParts ? Math.round(answeredParts / totalParts * 100) : 0;
  const incorrectQuestions = useMemo(() => gradeResult?.marked_questions.filter((question) => question.earned < question.available) ?? [], [gradeResult]);

  async function submitHomeworkPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!selectedTrack) {
      setError('Choose either Core or Extended before starting.');
      return;
    }
    if (!studentName.trim()) {
      setError('Enter your name before unlocking the exam.');
      return;
    }
    setGateBusy(true);
    try {
      const token = await unlockExam(homeworkPassword, selectedTrack);
      const payload = await getExam(token);
      if (payload.track !== selectedTrack) throw new Error('The unlocked exam did not match the selected track. Please try again.');
      const allowedQuestionIds = payload.questions.map((question) => question.id);
      const saved = loadProgress(payload.track, allowedQuestionIds);
      setAnswers(saved.answers);
      const restoredName = loadStudentName(payload.track) || saved.studentName || studentName;
      setStudentName(restoredName);
      if (restoredName) saveStudentName(restoredName);
      setSavedAt(saved.updatedAt);
      setProgressLoaded(true);
      setSessionToken(token);
      setExam(payload);
      setHomeworkPassword('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The exam could not be opened. Please try again.');
    } finally {
      setGateBusy(false);
    }
  }

  function updateAnswer(questionId: string, partId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: { ...(current[questionId] ?? {}), [partId]: value } }));
    setGradeResult(null);
  }

  function updateStudentName(value: string) {
    setStudentName(value);
    saveStudentName(value);
  }

  function restartProgress() {
    if (!exam) return;
    const confirmed = window.confirm('Clear this track’s saved answers and restart? Your selected track will remain locked for this session.');
    if (!confirmed) return;
    clearProgress(exam.track, exam.questions.map((question) => question.id));
    setAnswers({});
    setGradeResult(null);
    setMarkingPassword('');
    setError('');
    setSavedAt('');
  }

  async function submitForMarking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!sessionToken || !exam) {
      setError('Your exam session has expired. Enter the Homework Password again.');
      setExam(null);
      return;
    }
    setMarkBusy(true);
    try {
      const result = await markExam(sessionToken, markingPassword, answers);
      if (result.track !== exam.track) throw new Error('The marked result did not match this exam session.');
      setGradeResult(result);
      setMarkingPassword('');
      window.setTimeout(() => document.getElementById('graded-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The exam could not be marked. Please try again.';
      setError(message);
      if (/session (has )?(expired|invalid)/i.test(message)) {
        setSessionToken('');
        setExam(null);
        setProgressLoaded(false);
      }
    } finally {
      setMarkBusy(false);
    }
  }

  async function downloadReport() {
    if (!exam || !gradeResult) return;
    setError('');
    setPdfBusy(true);
    try {
      await downloadMarkedScript(studentName, exam, answers, gradeResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The marked script could not be created. Please try again.');
    } finally {
      setPdfBusy(false);
    }
  }

  function renderQuestionList(questions: ExamPayload['questions'], offset: number) {
    return questions.map((question, index) => (
      <QuestionCard key={question.id} question={question} number={offset + index + 1} answers={answers} onAnswer={updateAnswer} />
    ));
  }

  if (!exam) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <a className="brand-lockup" href="/" aria-label="Genetics 17 Exam Hall">
            <span className="brand-mark" aria-hidden="true"><Dna size={26} /></span>
            <span><span className="brand-title">GENETICS / 17</span><span className="brand-subtitle">CIE IGCSE Biology 0610</span></span>
          </a>
          <span className="topbar-meta">Chapter 17 · Inheritance</span>
        </header>
        <main className="gate-wrap">
          <div className="gate-grid">
            <section className="gate-welcome">
              <div className="eyebrow">A source-grounded mock examination</div>
              <h1 className="gate-title">Genetics, <em>under</em> examination.</h1>
              <p className="gate-copy">A demanding Chapter 17 paper built only from the supplied class material. Select one route; this exam session will stay locked to that track.</p>
              <figure className="gate-cover">
                <img src="/cover-art/genetics-module-assessment.jpg" alt="A DNA double helix threaded through protein structures against a deep-blue scientific background." width={1025} height={587} fetchPriority="high" />
                <figcaption>GENETICS / 17 <span>·</span> MODULE ASSESSMENT</figcaption>
              </figure>
              <div className="gate-notes"><span>One track per session</span><span>Autosaved on this device</span></div>
              <div className="source-note"><BookOpen size={26} aria-hidden="true" /><span>Questions stay within CIE Biology 0610 Topic 17: Inheritance.</span></div>
            </section>
            <section className="gate-card" aria-labelledby="gate-heading">
              <div className="eyebrow">Gate 01 / Choose your track</div>
              <h2 id="gate-heading">Choose one paper route</h2>
              <p>Your selection cannot be combined with the other track in this session.</p>
              <fieldset className="track-picker" aria-describedby="track-lock-note">
                <legend>Required exam track</legend>
                {(['Core', 'Extended'] as const).map((track) => (
                  <label className={`track-choice${selectedTrack === track ? ' selected' : ''}`} key={track}>
                    <input type="radio" name="exam-track" value={track} checked={selectedTrack === track} onChange={() => setSelectedTrack(track)} />
                    <span className="track-choice-copy">
                      <strong>{track}</strong>
                      <span className="track-papers">{TRACK_INFO[track].papers}</span>
                      <span>{TRACK_INFO[track].description}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <p className="track-lock-note" id="track-lock-note"><ShieldCheck size={26} aria-hidden="true" /> One session is restricted to one track. The server checks that selection on exam and marking requests.</p>
              <form onSubmit={submitHomeworkPassword}>
                <label className="field-label" htmlFor="student-name">Student Name</label>
                <input id="student-name" className="text-field" type="text" value={studentName} onChange={(event) => updateStudentName(event.target.value)} placeholder="Enter your name for the report" autoComplete="name" required />
                <label className="field-label" htmlFor="homework-password">Homework Password</label>
                <input id="homework-password" className="text-field" type="password" autoComplete="off" value={homeworkPassword} onChange={(event) => setHomeworkPassword(event.target.value)} required />
                <button className="primary-button full-width" type="submit" disabled={gateBusy || !selectedTrack}>
                  {gateBusy ? <span className="spinner" /> : <><LockKeyhole size={26} /> Unlock {selectedTrack ?? 'selected'} track <ArrowRight size={26} /></>}
                </button>
              </form>
              {error && <p className="error-message" role="alert">{error}</p>}
              <p className="fine-print"><BookOpen size={26} aria-hidden="true" /> Answers are saved locally; server-side marking begins only after the Marking Password is submitted.</p>
            </section>
          </div>
        </main>
      </div>
    );
  }

  const coreQuestions = exam.questions.filter((question) => question.level === 'Core');
  const extendedQuestions = exam.questions.filter((question) => question.level === 'Extended');
  const paperList = TRACK_INFO[exam.track].papers;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand-lockup" href="#top" aria-label="Return to exam top">
          <span className="brand-mark" aria-hidden="true"><Dna size={26} /></span>
          <span><span className="brand-title">GENETICS / 17</span><span className="brand-subtitle">CIE IGCSE Biology 0610</span></span>
        </a>
        <span className="topbar-meta">{exam.track} track · {exam.total_marks} marks</span>
      </header>
      <main className="exam-wrap" id="top">
        <section className="exam-intro">
          <div>
            <div className="eyebrow">Chapter 17 · {TRACK_INFO[exam.track].syllabus}</div>
            <h1 className="exam-heading">{exam.track}, under examination.</h1>
            <p className="exam-description">This session contains only the {exam.track} track ({paperList}). Answer each item in your own words. Your choice cannot switch tracks until this session has ended.</p>
            <div className="paper-overview" aria-label="Papers in selected track">
              {exam.paper_max_scores.map((paper) => <span className="paper-chip" key={paper.paper}>{paper.paper} · {paper.max_score} marks</span>)}
            </div>
          </div>
          <div className="saved-indicator" aria-live="polite"><span className="saved-dot" />{savedAt ? 'Saved on this device' : 'Autosave ready'}</div>
        </section>
        <div className="exam-toolbar">
          <div className="progress-summary">Progress · {answeredParts}/{totalParts} parts answered ({progressPercent}%)</div>
          <button className="reset-button" type="button" onClick={restartProgress}>Clear My Progress and Restart</button>
        </div>

        {coreQuestions.length > 0 && (
          <section id="core-section" aria-labelledby="core-title">
            <div className="section-heading"><h2 id="core-title">Core objectives</h2><span className="section-count">{exam.track === 'Core' ? 'Core track' : 'First section of Extended'} · {coreQuestions.length} questions</span></div>
            <div className="question-list">{renderQuestionList(coreQuestions, 0)}</div>
          </section>
        )}
        {extendedQuestions.length > 0 && (
          <section id="extended-section" aria-labelledby="extended-title">
            <div className="section-heading"><h2 id="extended-title">Supplement objectives</h2><span className="section-count">Extended only · {extendedQuestions.length} questions</span></div>
            <div className="question-list">{renderQuestionList(extendedQuestions, coreQuestions.length)}</div>
          </section>
        )}

        <section className="marking-gate" aria-labelledby="marking-title">
          <div>
            <div className="eyebrow">Gate 02 / Teacher marking</div>
            <h2 id="marking-title">Ready to check your {exam.track} work?</h2>
            <p>Enter the Marking Password to submit answers for server-side marking. Correct answers are released only after this gate succeeds.</p>
          </div>
          <form className="marking-form" onSubmit={submitForMarking}>
            <div className="marking-field">
              <label className="field-label" htmlFor="marking-password">Marking Password</label>
              <input id="marking-password" className="text-field" type="password" autoComplete="off" value={markingPassword} onChange={(event) => setMarkingPassword(event.target.value)} required />
            </div>
            <button className="primary-button" type="submit" disabled={markBusy}>
              {markBusy ? <span className="spinner" /> : <><Check size={26} /> Mark {exam.track} exam</>}
            </button>
          </form>
        </section>
        {error && <p className="error-message" role="alert">{error}</p>}

        {gradeResult && (
          <section className="result-panel" id="graded-result" aria-labelledby="result-title">
            <div className="result-head">
              <div>
                <div className="eyebrow">{gradeResult.track} marking complete</div>
                <h2 id="result-title" className="exam-heading">Your result</h2>
                <p className="result-score">{gradeResult.score}<span>/ {gradeResult.max_score} marks · {gradeResult.percentage}%</span></p>
                <p className="grade-note">The A*–G band is indicative only, not an official Cambridge grade boundary.</p>
              </div>
              <span className="grade-pill">Estimated band · {gradeResult.grade_band}</span>
            </div>
            <div className="paper-score-grid" aria-label="Score breakdown by paper">
              {gradeResult.paper_scores.map((paper) => (
                <div className="paper-score" key={paper.paper}>
                  <span>{paper.paper}</span>
                  <strong>{paper.score} / {paper.max_score}</strong>
                </div>
              ))}
            </div>
            <div className="report-actions">
              <button className="secondary-button" type="button" onClick={downloadReport} disabled={pdfBusy}>
                {pdfBusy ? <span className="spinner" /> : <Download size={26} />}
                {pdfBusy ? 'Preparing marked script…' : 'Download Marked Script (PDF)'}
              </button>
            </div>
            {incorrectQuestions.length === 0 ? (
              <div className="zero-incorrect">Every recorded response earned full marks. The marked script still contains the complete questions, diagrams, submitted answers and suggested marking points.</div>
            ) : (
              <div className="feedback-list">
                {incorrectQuestions.map((item) => {
                  const question = exam.questions.find((candidate) => candidate.id === item.question_id);
                  return (
                    <article className="feedback-item" key={item.question_id}>
                      <h3>{item.question_id} · {question?.paper} · {item.earned}/{item.available} marks</h3>
                      <p><strong>Question:</strong> {question?.stem ?? 'Review the identified question.'}</p>
                      <p><strong>Source slides:</strong> {question?.source_slides.join(', ') || 'Not recorded'}</p>
                      {item.parts.filter((part) => part.earned < part.available).map((part) => (
                        <div className="marked-part" key={part.part_id}>
                          <p><strong>Part {part.part_id}:</strong> Your response: {part.response.trim() || 'No response'}. Suggested answer: {part.model_answer}</p>
                          {part.marking_points.length > 0 && (
                            <ul className="criterion-feedback" aria-label={`Marking criteria for part ${part.part_id}`}>
                              {part.marking_points.map((point, pointIndex) => (
                                <li key={`${part.part_id}-${pointIndex}`}>
                                  <p><strong>Criterion {pointIndex + 1} · {point.awarded ?? 0}/{point.marks} marks:</strong> {point.description}</p>
                                  {point.evidence_quote && <blockquote className="criterion-evidence">Evidence quote: “{point.evidence_quote}”</blockquote>}
                                  {point.rationale && <p className="criterion-rationale"><strong>Rubric decision:</strong> {point.rationale}</p>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                      <p><strong>Correction:</strong> {item.correction}</p>
                      <p><strong>Slide-based syllabus guidance:</strong> {item.syllabus_guidance}</p>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
