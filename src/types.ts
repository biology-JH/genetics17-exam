export type Track = 'Core' | 'Extended';
export type Level = 'Core' | 'Extended';
export type PaperStyle = 'Paper 1' | 'Paper 2' | 'Paper 3' | 'Paper 4' | 'Paper 6';
export type QuestionForm = 'MCQ' | 'Short answer' | 'Structured' | 'Data analysis' | 'Diagram interpretation';
export type InputType = 'radio' | 'text';
export type CognitiveSkill = 'application' | 'analysis' | 'evaluation';

export interface ExamPart {
  id: string;
  prompt: string;
  input_type: InputType;
  marks: number;
  options: string[];
  objective_ids: string[];
}

export interface ExamQuestion {
  id: string;
  track: Track;
  level: Level;
  paper: PaperStyle;
  form: QuestionForm;
  cognitive_skill: CognitiveSkill;
  difficulty: number;
  source_deck: string;
  source_slides: number[];
  objective_ids: string[];
  visual_hint: string;
  visual_alt: string;
  stem: string;
  parts: ExamPart[];
  total_marks: number;
}

export type Answers = Record<string, Record<string, string>>;

export interface PaperScore {
  paper: PaperStyle;
  score: number;
  max_score: number;
}

export interface ExamPayload {
  track: Track;
  questions: ExamQuestion[];
  total_marks: number;
  paper_max_scores: Array<{ paper: PaperStyle; max_score: number }>;
}

export interface MarkingPointFeedback {
  marks: number;
  description: string;
}

export interface PartFeedback {
  part_id: string;
  earned: number;
  available: number;
  response: string;
  model_answer: string;
  marking_points: MarkingPointFeedback[];
}

export interface QuestionFeedback {
  question_id: string;
  earned: number;
  available: number;
  parts: PartFeedback[];
  correction: string;
  syllabus_guidance: string;
}

export interface GradeResult {
  track: Track;
  score: number;
  max_score: number;
  percentage: number;
  grade_band: 'A*' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  paper_scores: PaperScore[];
  marked_questions: QuestionFeedback[];
}

export interface SavedProgress {
  answers: Answers;
  studentName: string;
  updatedAt: string;
}
