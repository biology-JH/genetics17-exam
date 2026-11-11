import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, BookOpen, Check, Dna, Download, LockKeyhole } from 'lucide-react';
import QuestionCard from './components/QuestionCard';
import { getExam, markExam, unlockExam } from './lib/api';
import { clearProgress, loadProgress, saveProgress } from './lib/storage';
import { downloadGradedReport } from './lib/pdfReport';
import type { Answers, ExamPayload, GradeResult } from './types';

export default function App() {
  const [homeworkPassword, setHomeworkPassword] = useState('');
  const [markingPassword, setMarkingPassword] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [exam, setExam] = useState<ExamPayload | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [studentName, setStudentName] = useState('');
  const [savedAt, setSavedAt] = useState('');
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [gateBusy, setGateBusy] = useState(false);
  const [markBusy, setMarkBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = loadProgress();
    setAnswers(saved.answers);
    setStudentName(saved.studentName);
    setSavedAt(saved.updatedAt);
    setProgressLoaded(true);
  }, []);

  useEffect(() => {
    if (!progressLoaded) return;
    const updatedAt = new Date().toISOString();
    saveProgress({ answers, studentName, updatedAt });
    setSavedAt(updatedAt);
  }, [answers, studentName, progressLoaded]);

  const coreQuestions = useMemo(() => exam?.questions.filter((question) => question.level === 'Core') ?? [], [exam]);
  const extendedQuestions = useMemo(() => exam?.questions.filter((question) => question.level === 'Extended') ?? [], [exam]);
  const answeredParts = useMemo(() => exam?.questions.reduce((count, question) => count + question.parts.filter((part) => (answers[question.id]?.[part.id] ?? '').trim().length > 0).length, 0) ?? 0, [exam, answers]);
  const totalParts = useMemo(() => exam?.questions.reduce((count, question) => count + question.parts.length, 0) ?? 0, [exam]);
  const progressPercent = totalParts ? Math.round(answeredParts / totalParts * 100) : 0;

  async function submitHomeworkPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setGateBusy(true);
    try {
      const token = await unlockExam(homeworkPassword);
      const payload = await getExam(token);
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
    setAnswers((current) => {
      const next = { ...current, [questionId]: { ...(current[questionId] ?? {}), [partId]: value } };
      return next;
    });
    setGradeResult(null);
  }

  function updateStudentName(value: string) {
    setStudentName(value);
    setGradeResult(null);
  }

  function restartProgress() {
    const confirmed = window.confirm('Clear all saved answers and restart this exam? This cannot be undone.');
    if (!confirmed) return;
    clearProgress();
    setAnswers({});
    setStudentName('');
    setGradeResult(null);
    setMarkingPassword('');
    setError('');
    setSavedAt('');
  }

  async function submitForMarking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!sessionToken) {
      setError('Your exam session has expired. Enter the Homework Password again.');
      setExam(null);
      return;
    }
    setMarkBusy(true);
    try {
      const result = await markExam(sessionToken, markingPassword, answers);
      setGradeResult(result);
      setMarkingPassword('');
      window.setTimeout(() => document.getElementById('graded-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The exam could not be marked. Please try again.';
      setError(message);
      if (/session (has )?(expired|invalid)/i.test(message)) {
        setSessionToken('');
        setExam(null);
      }
    } finally {
      setMarkBusy(false);
    }
  }

  function renderQuestionList(questions: ExamPayload['questions'], offset = 0) {
    return questions.map((question, index) => (
      <QuestionCard key={question.id} question={question} number={offset + index + 1} answers={answers} onAnswer={updateAnswer} />
    ));
  }

  if (!exam) {
    return (
      <div className="app-shell">
        <header className="topbar">
          <a className="brand-lockup" href="/" aria-label="Genetics 17 Exam Hall">
            <span className="brand-mark" aria-hidden="true"><Dna size={19} /></span>
            <span><span className="brand-title">GENETICS / 17</span><span className="brand-subtitle">CIE IGCSE Biology 0610</span></span>
          </a>
          <span className="topbar-meta">Chapter 17 · Examination room</span>
        </header>
        <main className="gate-wrap">
          <div className="gate-grid">
            <section>
              <div className="eyebrow">A source-grounded mock examination</div>
              <h1 className="gate-title">Genetics, <em>under</em> examination.</h1>
              <p className="gate-copy">A demanding Chapter 17 paper built from your class material. Work carefully, show your reasoning, and keep your progress on this device.</p>
              <div className="gate-notes"><span>Core first · Extended second</span><span>Local progress autosave</span></div>
            </section>
            <section className="gate-card" aria-labelledby="gate-heading">
              <div className="eyebrow">Gate 01 / Homework access</div>
              <h2 id="gate-heading">Enter the room</h2>
              <p>Your teacher’s Homework Password opens the exam. Your saved answers stay in this browser.</p>
              <form onSubmit={submitHomeworkPassword}>
                <label className="field-label" htmlFor="homework-password">Homework Password</label>
                <input id="homework-password" className="text-field" type="password" autoComplete="off" value={homeworkPassword} onChange={(event) => setHomeworkPassword(event.target.value)} required />
                <button className="primary-button full-width" type="submit" disabled={gateBusy}>
                  {gateBusy ? <span className="spinner" /> : <><LockKeyhole size={15} /> Unlock exam <ArrowRight size={15} /></>}
                </button>
              </form>
              {error && <p className="error-message" role="alert">{error}</p>}
              <p className="fine-print"><BookOpen size={13} aria-hidden="true" /> Answers are saved locally; marking happens only when you submit at the end.</p>
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand-lockup" href="#top" aria-label="Return to exam top">
          <span className="brand-mark" aria-hidden="true"><Dna size={19} /></span>
          <span><span className="brand-title">GENETICS / 17</span><span className="brand-subtitle">CIE IGCSE Biology 0610</span></span>
        </a>
        <span className="topbar-meta">Question paper · {exam.total_marks} marks</span>
      </header>
      <main className="exam-wrap" id="top">
        <section className="exam-intro">
          <div>
            <div className="eyebrow">Chapter 17 · Mock examination</div>
            <h1 className="exam-heading">Genetics, under examination.</h1>
            <p className="exam-description">Answer every part in your own words. Core questions appear first; Extended questions follow. Your answers are saved on this device as you work.</p>
          </div>
          <div className="saved-indicator" aria-live="polite"><span className="saved-dot" />{savedAt ? 'Saved on this device' : 'Autosave ready'}</div>
        </section>
        <div className="exam-toolbar">
          <nav className="section-tabs" aria-label="Exam sections">
            <a className="section-tab" href="#core-section">Core · {coreQuestions.length}</a>
            <a className="section-tab" href="#extended-section">Extended · {extendedQuestions.length}</a>
            <span className="section-tab">Progress · {answeredParts}/{totalParts} ({progressPercent}%)</span>
          </nav>
          <button className="reset-button" type="button" onClick={restartProgress}>Clear My Progress and Restart</button>
        </div>
        <section className="student-row" aria-label="Student information">
          <div>
            <label className="field-label" htmlFor="student-name">Student Name</label>
            <input id="student-name" className="text-field" type="text" value={studentName} onChange={(event) => updateStudentName(event.target.value)} placeholder="Enter your name for the report" autoComplete="name" />
          </div>
          <p className="student-note">Name is stored with your answers in this browser and appears in the graded PDF.</p>
        </section>

        <section id="core-section" aria-labelledby="core-title">
          <div className="section-heading"><h2 id="core-title">Core</h2><span className="section-count">Part I · {coreQuestions.length} questions</span></div>
          <div className="question-list">{renderQuestionList(coreQuestions)}</div>
        </section>
        <section id="extended-section" aria-labelledby="extended-title">
          <div className="section-heading"><h2 id="extended-title">Extended</h2><span className="section-count">Part II · {extendedQuestions.length} questions</span></div>
          <div className="question-list">{renderQuestionList(extendedQuestions, coreQuestions.length)}</div>
        </section>

        <section className="marking-gate" aria-labelledby="marking-title">
          <div>
            <div className="eyebrow">Gate 02 / Teacher marking</div>
            <h2 id="marking-title">Ready to check your work?</h2>
            <p>Enter the Marking Password to send your answers for server-side marking. The answer key is not stored in this browser.</p>
          </div>
          <form className="marking-form" onSubmit={submitForMarking}>
            <div className="marking-field">
              <label className="field-label" htmlFor="marking-password">Marking Password</label>
              <input id="marking-password" className="text-field" type="password" autoComplete="off" value={markingPassword} onChange={(event) => setMarkingPassword(event.target.value)} required />
            </div>
            <button className="primary-button" type="submit" disabled={markBusy}>
              {markBusy ? <span className="spinner" /> : <><Check size={15} /> Mark exam</>}
            </button>
          </form>
        </section>
        {error && <p className="error-message" role="alert">{error}</p>}

        {gradeResult && (
          <section className="result-panel" id="graded-result" aria-labelledby="result-title">
            <div className="result-head">
              <div>
                <div className="eyebrow">Marking complete</div>
                <h2 id="result-title" className="exam-heading">Your result</h2>
                <p className="result-score">{gradeResult.score}<small>/ {gradeResult.max_score} marks · {gradeResult.percentage}%</small></p>
                <p className="grade-note">The A*–G band is an indicative estimate, not an official Cambridge grade boundary.</p>
              </div>
              <span className="grade-pill">Estimated band · {gradeResult.grade_band}</span>
            </div>
            <div className="report-actions">
              <button className="secondary-button" type="button" onClick={() => downloadGradedReport(studentName, gradeResult)}><Download size={15} /> Download Graded Report PDF</button>
            </div>
            {gradeResult.incorrect_items.length === 0 ? (
              <div className="zero-incorrect">All recorded answers earned full marks. Review the slide sources and keep your report for revision.</div>
            ) : (
              <div className="feedback-list">
                {gradeResult.incorrect_items.map((item) => {
                  const question = exam.questions.find((candidate) => candidate.id === item.question_id);
                  return (
                    <article className="feedback-item" key={item.question_id}>
                      <h3>{item.question_id} · {item.level} · {item.earned}/{item.available} marks</h3>
                      <p><strong>Question:</strong> {question?.stem ?? 'Review the identified question.'}</p>
                      <p><strong>Source slides:</strong> {item.source_slides.join(', ')}</p>
                      {item.parts.filter((part) => part.earned < part.available).map((part) => (
                        <p key={part.part_id}><strong>Part {part.part_id}:</strong> Your response: {part.response.trim() || 'No response'}. Suggested answer: {part.model_answer}</p>
                      ))}
                      <p><strong>Correction:</strong> {item.correction}</p>
                      <p><strong>Slide-based syllabus guidance:</strong> {item.syllabus_guidance}</p>
                    </article>
                  );
                })}
              </div>
            )}
            <p className="footer-note">Corrections and syllabus guidance are synthesized from the supplied PowerPoints. They are study guidance, not an official Cambridge mark scheme.</p>
          </section>
        )}
      </main>
    </div>
  );
}
