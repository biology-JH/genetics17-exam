import type { Answers, ExamQuestion } from '../types';

interface Props {
  question: ExamQuestion;
  number: number;
  answers: Answers;
  onAnswer: (questionId: string, partId: string, value: string) => void;
}

export default function QuestionCard({ question, number, answers, onAnswer }: Props) {
  return (
    <article className="question-card" id={question.id} data-track={question.track} data-paper={question.paper}>
      <aside className="question-rail" aria-label={`${question.level} question ${number}`}>
        <span className="question-number">{String(number).padStart(2, '0')}</span>
        <span className="level-badge">{question.level}</span>
      </aside>
      <div className="question-content">
        <div className="question-meta">
          <span>{question.paper}</span>
          <span>{question.form}</span>
          <span>{question.cognitive_skill}</span>
          <span>Difficulty {question.difficulty}/5</span>
          <span>Objectives {question.objective_ids.join(', ')}</span>
          <span>{question.source_deck} · Slide{question.source_slides.length === 1 ? '' : 's'} {question.source_slides.join(', ')}</span>
        </div>
        <p className="question-stem">{question.stem}</p>
        {question.visual_hint && (
          <figure className="question-visual">
            <img src={question.visual_hint} alt={question.visual_alt || `Source diagram from ${question.source_deck}, slide ${question.source_slides.join(', ')}`} loading="lazy" />
            <figcaption>Source visual · {question.source_deck} · slide{question.source_slides.length === 1 ? '' : 's'} {question.source_slides.join(', ')}</figcaption>
          </figure>
        )}
        {question.parts.map((part, index) => {
          const answer = answers[question.id]?.[part.id] ?? '';
          const partLabel = `${number}, part ${index + 1}`;
          return (
            <div className="part-block" key={part.id}>
              <div className="part-heading">
                <span className="part-letter">({String.fromCharCode(97 + index)})</span>
                <p className="part-prompt">{part.prompt}</p>
                <span className="part-marks">[{part.marks} mark{part.marks === 1 ? '' : 's'}]</span>
              </div>
              {part.input_type === 'radio' ? (
                <div className="option-list" role="radiogroup" aria-label={`Question ${partLabel}`}>
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
                  aria-label={`Question ${partLabel} answer`}
                  rows={Math.min(6, Math.max(3, Math.ceil(part.marks / 2)))}
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
