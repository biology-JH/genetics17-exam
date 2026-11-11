import type { Answers, ExamQuestion } from '../types';

interface Props {
  question: ExamQuestion;
  number: number;
  answers: Answers;
  onAnswer: (questionId: string, partId: string, value: string) => void;
}

export default function QuestionCard({ question, number, answers, onAnswer }: Props) {
  const visualDescription = question.id === 'Q173_MeiosisDiagram'
    ? 'Meiosis diagram showing one cell dividing through two divisions to form four cells.'
    : question.id === 'Q174a_07'
      ? 'Punnett square for Tt crossed with tt, showing two Tt and two tt possible outcomes and a one-to-one tall-to-dwarf ratio.'
      : `Source diagram from PowerPoint slide${question.source_slides.length === 1 ? '' : 's'} ${question.source_slides.join(', ')}.`;
  return (
    <article className="question-card" id={question.id}>
      <aside className="question-rail" aria-label={`${question.level} question ${number}`}>
        <span className="question-number">{String(number).padStart(2, '0')}</span>
        <span className="level-badge">{question.level}</span>
      </aside>
      <div className="question-content">
        <div className="question-meta">
          <span>{question.paper}</span>
          <span>{question.form}</span>
          <span>Difficulty {question.difficulty}/5</span>
          <span>Slide{question.source_slides.length === 1 ? '' : 's'} {question.source_slides.join(', ')}</span>
        </div>
        <p className="question-stem">{question.stem}</p>
        {question.visual_hint && (
          <figure className="question-visual">
            <img src={question.visual_hint} alt={visualDescription} loading="lazy" />
            <figcaption>Source visual · slide{question.source_slides.length === 1 ? '' : 's'} {question.source_slides.join(', ')}</figcaption>
          </figure>
        )}
        {question.parts.map((part) => {
          const answer = answers[question.id]?.[part.id] ?? '';
          return (
            <div className="part-block" key={part.id}>
              <div className="part-heading">
                <span className="part-letter">({part.id})</span>
                <p className="part-prompt">{part.prompt}</p>
                <span className="part-marks">[{part.marks} mark{part.marks === 1 ? '' : 's'}]</span>
              </div>
              {part.input_type === 'radio' ? (
                <div className="option-list" role="radiogroup" aria-label={`Question ${number}, part ${part.id}`}>
                  {part.options.map((option, optionIndex) => {
                    const optionId = `${question.id}-${part.id}-${optionIndex}`;
                    return (
                      <label className="option-row" htmlFor={optionId} key={optionId}>
                        <input
                          id={optionId}
                          type="radio"
                          name={`${question.id}-${part.id}`}
                          value={option}
                          checked={answer === option}
                          onChange={() => onAnswer(question.id, part.id, option)}
                        />
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  className="answer-textarea"
                  value={answer}
                  onChange={(event) => onAnswer(question.id, part.id, event.target.value)}
                  placeholder="Write your answer here…"
                  aria-label={`Question ${number}, part ${part.id} answer`}
                  rows={Math.min(5, Math.max(2, Math.ceil(part.marks / 2)))}
                  spellCheck="true"
                />
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
