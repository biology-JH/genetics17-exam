import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, BookOpen, Check, Dna, Download, LockKeyhole, ShieldCheck } from 'lucide-react';
import QuestionCard from './components/QuestionCard';
import { getExam, markExam, unlockExam } from './lib/api';
import { clearProgress, loadProgress, loadStudentName, saveProgress, saveStudentName } from './lib/storage';
import { downloadMarkedScript } from './lib/pdfReport';
import type { Answers, ExamPayload, GradeResult, Session, Track } from './types';

const SESSIONS: Session[] = ['17.1', '17.2', '17.3', '17.4'];
const SESSION_INFO: Record<Session, { title: string; description: string }> = {
  '17.1': { title: 'Chromosomes, genes and proteins', description: 'Work with chromosome, gene, DNA and protein evidence.' },
  '17.2': { title: 'Mitosis', description: 'Apply inheritance knowledge to growth, repair and cell division.' },
  '17.3': { title: 'Meiosis', description: 'Analyse gamete formation, variation and chromosome behaviour.' },
  '17.4': { title: 'Monohybrid inheritance', description: 'Solve genetic crosses, pedigrees and probability questions.' },
};
const TRACK_INFO: Record<Track, { papers: string; description: string; syllabus: string }> = {
  Core: { papers: 'Papers 1 · 3 · 6', description: 'Core-only practice with multiple choice, structured responses and genetics data questions.', syllabus: 'Core syllabus objectives' },
  Extended: { papers: 'Papers 2 · 4 · 6', description: 'Extended practice with Core and Supplement-level questions.', syllabus: 'Core + Supplement objectives' },
};

export default function App() {
  const [selectedSession, setSelectedSession] = useState<Session>('17.1');
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
    saveProgress(exam.track, exam.session, { answers, studentName, updatedAt });
    setSavedAt(updatedAt);
  }, [answers, studentName, progressLoaded, exam]);

  const answeredParts = useMemo(() => exam?.questions.reduce((count, question) => count + question.parts.filter((part) => (answers[question.id]?.[part.id] ?? '').trim()).length, 0) ?? 0, [exam, answers]);
  const totalParts = useMemo(() => exam?.questions.reduce((count, question) => count + question.parts.length, 0) ?? 0, [exam]);
  const progressPercent = totalParts ? Math.round(answeredParts / totalParts * 100) : 0;
  const incorrectQuestions = useMemo(() => gradeResult?.marked_questions.filter((question) => question.earned < question.available) ?? [], [gradeResult]);

  async function submitHomeworkPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (!selectedTrack) return setError('Choose either Core or Extended before starting.');
    if (!studentName.trim()) return setError('Enter your name before unlocking the session.');
    setGateBusy(true);
    try {
      const token = await unlockExam(homeworkPassword, selectedTrack, selectedSession);
      const payload = await getExam(token);
      if (payload.track !== selectedTrack || payload.session !== selectedSession) throw new Error('The unlocked exam did not match the selected session.');
      const saved = loadProgress(payload.track, payload.session, payload.questions.map((question) => question.id));
      setAnswers(saved.answers); setStudentName(saved.studentName || studentName); setSavedAt(saved.updatedAt); setProgressLoaded(true);
      setSessionToken(token); setExam(payload); setHomeworkPassword('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The session could not be opened. Please try again.'); }
    finally { setGateBusy(false); }
  }

  function updateAnswer(questionId: string, partId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: { ...(current[questionId] ?? {}), [partId]: value } }));
    setGradeResult(null);
  }
  function updateStudentName(value: string) { setStudentName(value); saveStudentName(value); }
  function restartProgress() {
    if (!exam || !window.confirm(`Clear session ${exam.session}'s saved answers and restart? Other weeks will not be affected.`)) return;
    clearProgress(exam.track, exam.session); setAnswers({}); setGradeResult(null); setMarkingPassword(''); setError(''); setSavedAt('');
  }
  async function submitForMarking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (!sessionToken || !exam) { setError('Your session has expired. Enter the Homework Password again.'); setExam(null); return; }
    setMarkBusy(true);
    try {
      const result = await markExam(sessionToken, markingPassword, answers);
      if (result.track !== exam.track || result.session !== exam.session) throw new Error('The marked result did not match this session.');
      setGradeResult(result); setMarkingPassword(''); window.setTimeout(() => document.getElementById('graded-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The session could not be marked. Please try again.';
      setError(message);
      if (/session (has )?(expired|invalid)/i.test(message)) { setSessionToken(''); setExam(null); setProgressLoaded(false); }
    } finally { setMarkBusy(false); }
  }
  async function downloadReport() {
    if (!exam || !gradeResult) return;
    setPdfBusy(true); setError('');
    try { await downloadMarkedScript(studentName, exam, answers, gradeResult); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The marked PDF could not be created. Please retry.'); }
    finally { setPdfBusy(false); }
  }

  if (!exam) return (
    <div className="app-shell">
      <header className="topbar"><a className="brand-lockup" href="/" aria-label="Genetics 17 Exam Hall"><span className="brand-mark"><Dna size={26} /></span><span><span className="brand-title">GENETICS / 17</span><span className="brand-subtitle">CIE IGCSE Biology 0610</span></span></a><span className="topbar-meta">Four-week Chapter 17 programme</span></header>
      <main className="gate-wrap"><div className="gate-grid">
        <section className="gate-welcome"><div className="eyebrow">A source-grounded weekly examination</div><h1 className="gate-title">Genetics, <em>under</em> examination.</h1><p className="gate-copy">Complete one locked session per week. Each week has its own questions, saved progress, Marking Password and marked PDF report.</p><figure className="gate-cover"><img src="/cover-art/genetics-module-assessment.jpg" alt="A DNA double helix threaded through protein structures against a deep-blue scientific background." width={1025} height={587} /><figcaption>GENETICS / 17 <span>·</span> FOUR WEEK PROGRAMME</figcaption></figure><div className="gate-notes"><span>One session at a time</span><span>Weeks save independently</span></div><div className="source-note"><BookOpen size={26} /><span>No question is copied between weeks. The server sends only the active week's question set for marking.</span></div></section>
        <section className="gate-card" aria-labelledby="gate-heading"><div className="eyebrow">Gate 01 / Choose your week</div><h2 id="gate-heading">Select one session</h2><div className="session-tabs" role="tablist" aria-label="Weekly sessions">{SESSIONS.map((session) => <button className={`session-tab${selectedSession === session ? ' selected' : ''}`} type="button" role="tab" aria-selected={selectedSession === session} key={session} onClick={() => { setSelectedSession(session); setError(''); }}><strong>{session}</strong><span>{SESSION_INFO[session].title}</span></button>)}</div><p className="session-description">{SESSION_INFO[selectedSession].description}</p><fieldset className="track-picker"><legend>Required exam track</legend>{(['Core', 'Extended'] as const).map((track) => <label className={`track-choice${selectedTrack === track ? ' selected' : ''}`} key={track}><input type="radio" name="exam-track" value={track} checked={selectedTrack === track} onChange={() => setSelectedTrack(track)} /><span className="track-choice-copy"><strong>{track}</strong><span className="track-papers">{TRACK_INFO[track].papers}</span><span>{TRACK_INFO[track].description}</span></span></label>)}</fieldset><p className="track-lock-note"><ShieldCheck size={26} /> The selected week and track are bound into the server session. Other weeks remain untouched.</p><form onSubmit={submitHomeworkPassword}><label className="field-label" htmlFor="student-name">Student Name</label><input id="student-name" className="text-field" type="text" value={studentName} onChange={(event) => updateStudentName(event.target.value)} placeholder="Enter your name for the report" autoComplete="name" required /><label className="field-label" htmlFor="homework-password">Homework Password</label><input id="homework-password" className="text-field" type="password" autoComplete="off" value={homeworkPassword} onChange={(event) => setHomeworkPassword(event.target.value)} required /><button className="primary-button full-width" type="submit" disabled={gateBusy || !selectedTrack}>{gateBusy ? <span className="spinner" /> : <><LockKeyhole size={26} /> Unlock {selectedSession} <ArrowRight size={26} /></>}</button></form>{error && <p className="error-message" role="alert">{error}</p>}<p className="fine-print"><BookOpen size={26} /> Answers are saved locally under this track and week. Passwords and marking keys are never stored.</p></section>
      </div></main>
    </div>
  );

  const coreQuestions = exam.questions.filter((question) => question.level === 'Core');
  const extendedQuestions = exam.questions.filter((question) => question.level === 'Extended');
  const renderQuestions = (questions: ExamPayload['questions'], offset: number) => questions.map((question, index) => <QuestionCard key={question.id} question={question} number={offset + index + 1} answers={answers} onAnswer={updateAnswer} />);
  return <div className="app-shell"><header className="topbar"><a className="brand-lockup" href="#top" aria-label="Return to exam top"><span className="brand-mark"><Dna size={26} /></span><span><span className="brand-title">GENETICS / 17</span><span className="brand-subtitle">CIE IGCSE Biology 0610</span></span></a><span className="topbar-meta">Session {exam.session} · {exam.track} · {exam.total_marks} marks</span></header><main className="exam-wrap" id="top"><section className="exam-intro"><div><div className="eyebrow">Week {exam.session} · {SESSION_INFO[exam.session].title}</div><h1 className="exam-heading">{exam.session}, under examination.</h1><p className="exam-description">{SESSION_INFO[exam.session].description} This page contains only this week's questions and total.</p><div className="paper-overview">{exam.paper_max_scores.filter((paper) => paper.max_score > 0).map((paper) => <span className="paper-chip" key={paper.paper}>{paper.paper} · {paper.max_score} marks</span>)}</div></div><div className="saved-indicator"><span className="saved-dot" />{savedAt ? 'Saved on this device' : 'Autosave ready'}</div></section><div className="exam-toolbar"><div className="progress-summary">Progress · {answeredParts}/{totalParts} parts answered ({progressPercent}%)</div><button className="reset-button" type="button" onClick={restartProgress}>Clear this week's progress</button></div>{coreQuestions.length > 0 && <section><div className="section-heading"><h2>Core objectives</h2><span className="section-count">{coreQuestions.length} questions</span></div><div className="question-list">{renderQuestions(coreQuestions, 0)}</div></section>}{extendedQuestions.length > 0 && <section><div className="section-heading"><h2>Supplement objectives</h2><span className="section-count">{extendedQuestions.length} questions</span></div><div className="question-list">{renderQuestions(extendedQuestions, coreQuestions.length)}</div></section>}<section className="marking-gate"><div><div className="eyebrow">Gate 02 / {exam.session} marking</div><h2>Ready to check this week's work?</h2><p>Use the unique Marking Password for {exam.session}. Only this session's questions, answers and mark scheme are processed.</p></div><form className="marking-form" onSubmit={submitForMarking}><div className="marking-field"><label className="field-label" htmlFor="marking-password">Marking Password</label><input id="marking-password" className="text-field" type="password" autoComplete="off" value={markingPassword} onChange={(event) => setMarkingPassword(event.target.value)} required /></div><button className="primary-button" type="submit" disabled={markBusy}>{markBusy ? <span className="spinner" /> : <><Check size={26} /> Mark {exam.session}</>}</button></form></section>{error && <p className="error-message" role="alert">{error}</p>}{gradeResult && <section className="result-panel" id="graded-result"><div className="result-head"><div><div className="eyebrow">{gradeResult.session} marking complete</div><h2 className="exam-heading">Your weekly result</h2><p className="result-score">{gradeResult.score}<span>/ {gradeResult.max_score} marks · {gradeResult.percentage}%</span></p><p className="grade-note">The A*–G band is indicative only, not an official Cambridge grade boundary.</p></div><span className="grade-pill">Estimated band · {gradeResult.grade_band}</span></div><div className="paper-score-grid">{gradeResult.paper_scores.filter((paper) => paper.max_score > 0).map((paper) => <div className="paper-score" key={paper.paper}><span>{paper.paper}</span><strong>{paper.score} / {paper.max_score}</strong></div>)}</div><div className="report-actions"><button className="secondary-button" type="button" onClick={downloadReport} disabled={pdfBusy}>{pdfBusy ? <span className="spinner" /> : <Download size={26} />}{pdfBusy ? 'Preparing marked PDF…' : `Download Marked PDF · ${exam.session}`}</button></div>{incorrectQuestions.length === 0 ? <div className="zero-incorrect">Every recorded response earned full marks. The marked PDF contains this week's complete questions, answers and feedback.</div> : <div className="feedback-list">{incorrectQuestions.map((item) => { const question = exam.questions.find((candidate) => candidate.id === item.question_id); return <article className="feedback-item" key={item.question_id}><h3>{item.question_id} · {question?.paper} · {item.earned}/{item.available} marks</h3><p><strong>Question:</strong> {question?.stem ?? 'Review the identified question.'}</p>{item.parts.filter((part) => part.earned < part.available).map((part) => <div className="marked-part" key={part.part_id}><p><strong>Part {part.part_id}:</strong> Your response: {part.response.trim() || 'No response'}. Suggested answer: {part.model_answer}</p>{part.marking_points.length > 0 && <ul className="criterion-feedback">{part.marking_points.map((point, pointIndex) => <li key={`${part.part_id}-${pointIndex}`}><p><strong>Criterion {pointIndex + 1} · {point.awarded ?? 0}/{point.marks} marks:</strong> {point.description}</p>{point.evidence_quote && <blockquote className="criterion-evidence">Evidence quote: “{point.evidence_quote}”</blockquote>}{point.rationale && <p className="criterion-rationale"><strong>Rubric decision:</strong> {point.rationale}</p>}</li>)}</ul>}</div>)}<p><strong>Correction:</strong> {item.correction}</p><p><strong>Slide-based syllabus guidance:</strong> {item.syllabus_guidance}</p></article>; })}</div>}</section>}</main></div>;
}
