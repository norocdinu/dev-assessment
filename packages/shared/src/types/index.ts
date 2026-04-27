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
