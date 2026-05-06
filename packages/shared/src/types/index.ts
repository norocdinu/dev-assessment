export type Difficulty = 'junior' | 'mid' | 'senior';

export interface Technology {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

export interface Question {
  id: string;
  family_id: string;
  version: number;
  technology_id: string;
  technology_name?: string;
  difficulty: Difficulty;
  skill_area: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'a' | 'b' | 'c' | 'd';
  explanation?: string;
  is_active: boolean;
  is_latest: boolean;
  created_by: string;
  created_at: string;
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
  role: 'owner' | 'reviewer';
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
  created_at: string;
}

export interface CandidateQuestion {
  id: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  skill_area: string;
}

export interface CandidateSession {
  started_at: string;
  server_now: string;
  questions: CandidateQuestion[];
}

export interface LocalSession {
  token: string;
  startedAt: string;
  answers: Record<string, 'a' | 'b' | 'c' | 'd'>;
  currentQuestionIndex: number;
}

// Phase 3: Grading & Results

export interface SkillAreaScore {
  correct: number;
  total: number;
  pct: number;
}

export interface AnswerSheetRow {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'a' | 'b' | 'c' | 'd';
  candidate_answer: 'a' | 'b' | 'c' | 'd' | null;
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
