export type Level = 'Core' | 'Extended';
export type PaperStyle = 'Paper 1/2' | 'Paper 3/4' | 'Paper 6';
export type QuestionForm = 'MCQ' | 'Short answer' | 'Structured' | 'Data analysis' | 'Diagram interpretation';
export type InputType = 'radio' | 'text';

export interface ExamPart {
  id: string;
  prompt: string;
  input_type: InputType;
  marks: number;
  options: string[];
}

export interface ExamQuestion {
  id: string;
  level: Level;
  paper: PaperStyle;
  form: QuestionForm;
  difficulty: number;
  source_slides: number[];
  visual_hint: string;
  stem: string;
  parts: ExamPart[];
  total_marks: number;
}

export type Answers = Record<string, Record<string, string>>;

export interface ExamPayload {
  questions: ExamQuestion[];
  total_marks: number;
}

export interface PartFeedback {
  part_id: string;
  earned: number;
  available: number;
  response: string;
  model_answer: string;
}

export interface IncorrectItemFeedback {
  question_id: string;
  level: Level;
  source_slides: number[];
  earned: number;
  available: number;
  parts: PartFeedback[];
  correction: string;
  syllabus_guidance: string;
}

export interface GradeResult {
  score: number;
  max_score: number;
  percentage: number;
  grade_band: 'A*' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  incorrect_items: IncorrectItemFeedback[];
}

export interface SavedProgress {
  answers: Answers;
  studentName: string;
  updatedAt: string;
}
