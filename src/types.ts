export type Track = 'Core' | 'Extended';
export type Session = '17.1' | '17.2' | '17.3' | '17.4';
export type ActivityMode = 'weekly' | 'revision-mcq' | 'revision-long';
export type RevisionDifficulty = 'Easy' | 'Medium' | 'Hard';
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
  revision_tier?: Level;
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
  source_label?: string;
  source_slides: number[];
  objective_ids: string[];
  visual_hint: string;
  visual_alt: string;
  revision_tier?: Level;
  revision_difficulty?: RevisionDifficulty;
  source_editorial_note?: string;
  revision_visuals?: Array<{ src: string; alt: string; source: string }>;
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
  session: Session;
  mode?: ActivityMode;
  revision_difficulty?: RevisionDifficulty;
  questions: ExamQuestion[];
  total_marks: number;
  paper_max_scores: Array<{ paper: PaperStyle; max_score: number }>;
  ai_marking_enabled?: boolean;
}

export interface MarkingPointFeedback {
  marks: number;
  description: string;
  awarded?: number;
  evidence_quote?: string;
  rationale?: string;
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
  session: Session;
  mode?: ActivityMode;
  revision_difficulty?: RevisionDifficulty;
  grading_mode?: 'openrouter_free' | 'deterministic';
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
