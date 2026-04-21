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
