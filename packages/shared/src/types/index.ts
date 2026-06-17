export type Difficulty = 'junior' | 'mid' | 'senior';

export interface Technology {
  id: string;
  slug: string;
  name: string;
  created_at: string;
  is_active?: boolean;
  question_count?: number | string; // COUNT() comes back as string from pg
}

export type QuestionType =
  | 'single_choice'
  | 'multi_select'
  | 'true_false'
  | 'matching'
  | 'ordering'
  | 'fill_blank';

/** A stimulus block — the shared prompt body for every question type. */
export type Block =
  | { type: 'text'; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'image'; assetId: string; alt: string };

/** Authoring-side content (the correct answer lives in answer_key, never here). */
export interface SingleChoiceContent { prompt: Block[]; options: string[] }
export interface MultiSelectContent  { prompt: Block[]; options: string[] }
export interface TrueFalseContent    { prompt: Block[] }
export interface MatchingContent     { prompt: Block[]; left: string[]; right: string[] }
export interface OrderingContent     { prompt: Block[]; items: string[] } // stored in CORRECT order
export interface FillBlankContent    { prompt: Block[] }                  // blanks = `___` markers in text blocks

export type QuestionContent =
  | SingleChoiceContent | MultiSelectContent | TrueFalseContent
  | MatchingContent | OrderingContent | FillBlankContent;

export interface SingleChoiceKey { correctIndex: number }
export interface MultiSelectKey  { correctIndices: number[] }
export interface TrueFalseKey    { correct: boolean }
export interface MatchingKey     { map: Record<string, number> }  // leftIdx -> rightIdx
export interface OrderingKey     { order: number[] }              // canonical correct order = [0,1,2,...]
export interface FillBlankKey    { blanks: { accepted: string[] }[] }

export type AnswerKey =
  | SingleChoiceKey | MultiSelectKey | TrueFalseKey
  | MatchingKey | OrderingKey | FillBlankKey;

export interface SingleChoiceResp { index: number }
export interface MultiSelectResp  { indices: number[] }
export interface TrueFalseResp    { value: boolean }
export interface MatchingResp     { map: Record<string, number> } // leftIdx -> rightIdx
export interface OrderingResp     { order: number[] }             // item original-indices in chosen order
export interface FillBlankResp    { values: string[] }

export type AnswerResponse =
  | SingleChoiceResp | MultiSelectResp | TrueFalseResp
  | MatchingResp | OrderingResp | FillBlankResp;

export interface Question {
  id: string;
  family_id: string;
  version: number;
  technology_id: string;
  technology_name?: string;
  difficulty: Difficulty;
  skill_area: string;
  type: QuestionType;
  content: QuestionContent;
  answer_key: AnswerKey;
  explanation?: string;
  is_active: boolean;
  is_latest: boolean;
  created_by: string;
  created_at: string;
}

/** An option that has been shuffled for display but remembers its original index. */
export interface ShuffledItem { idx: number; text: string }

/** Candidate-safe content: answer_key removed; matching.right & ordering.items shuffled. */
export type CandidateContent =
  | { prompt: Block[]; options: string[] }                 // single_choice / multi_select
  | { prompt: Block[] }                                    // true_false / fill_blank
  | { prompt: Block[]; left: string[]; right: ShuffledItem[] } // matching
  | { prompt: Block[]; items: ShuffledItem[] };            // ordering

export interface CandidateQuestion {
  id: string;
  type: QuestionType;
  skill_area: string;
  content: CandidateContent;
}

export interface CandidateSession {
  started_at: string;
  server_now: string;
  duration_ms: number;
  questions: CandidateQuestion[];
}

export interface LocalSession {
  token: string;
  startedAt: string;
  answers: Record<string, AnswerResponse>;
  currentQuestionIndex: number;
}

export interface TestConfig {
  id: string;
  name: string;
  technology_id: string;
  technology_name?: string;
  difficulty: Difficulty;
  num_questions: number;
  pass_threshold_pct: number;
  created_by: string;
  created_at: string;
  is_active: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'reviewer' | 'member';
}

export interface AdminAccount {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'reviewer' | 'member';
  created_at: string;
  last_login_at: string | null;
}

export interface TestLink {
  id: string;
  test_config_id: string;
  token: string;
  state: 'created' | 'active' | 'submitted' | 'expired';
  expires_at: string | null;
  started_at: string | null;
  submitted_at: string | null;
  created_by: string;
  candidate_name: string | null;
  created_at: string;
}

// Phase 3: Grading & Results

export interface SkillAreaScore {
  correct: number;
  total: number;
  pct: number;
}

export interface AnswerSheetRow {
  type: QuestionType;
  content: QuestionContent;
  answer_key: AnswerKey;
  response: AnswerResponse | null;
  is_correct: boolean;
  skill_area: string;
}

export interface AdminAnswerSheetRow extends AnswerSheetRow {
  family_id: string;
  version: number;
}

export interface SubmissionResult {
  link_id: string;
  test_config_id: string;
  score_pct: number;
  pass: boolean;
  pass_threshold_pct: number;
  time_taken_seconds: number;
  submitted_at: string;
  graded_at: string;
  test_name: string;
  technology_name: string;
  difficulty: Difficulty;
  skill_area_scores: Record<string, SkillAreaScore>;
  answer_sheet: AnswerSheetRow[];
}

export interface AdminSubmissionResult extends SubmissionResult {
  answer_sheet: AdminAnswerSheetRow[];
}

// Phase 4: Admin Dashboard

export interface SubmissionListRow {
  link_id: string;
  test_config_id: string;
  test_name: string;
  technology_name: string;
  difficulty: Difficulty;
  score_pct: number;
  pass: boolean;
  pass_threshold_pct: number;
  time_taken_seconds: number;
  submitted_at: string;
  graded_at: string;
}

export interface TestConfigStats {
  total_submissions: number;
  avg_score_pct: number;
  pass_rate_pct: number;
  bucket_0_49: number;
  bucket_50_59: number;
  bucket_60_69: number;
  bucket_70_79: number;
  bucket_80_89: number;
  bucket_90_100: number;
}

// Phase 5: Improvements

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
