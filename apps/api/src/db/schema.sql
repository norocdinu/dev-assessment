-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Admin users
CREATE TABLE admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('owner', 'reviewer')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Technologies (configurable, not hardcoded)
CREATE TABLE technologies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Questions (immutable versions)
CREATE TABLE questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id      UUID NOT NULL,
  version        INT  NOT NULL DEFAULT 1,
  technology_id  UUID NOT NULL REFERENCES technologies(id),
  difficulty     TEXT NOT NULL CHECK (difficulty IN ('junior', 'mid', 'senior')),
  skill_area     TEXT NOT NULL,
  text           TEXT NOT NULL,
  option_a       TEXT NOT NULL,
  option_b       TEXT NOT NULL,
  option_c       TEXT NOT NULL,
  option_d       TEXT NOT NULL,
  correct_option TEXT NOT NULL CHECK (correct_option IN ('a','b','c','d')),
  explanation    TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  is_latest      BOOLEAN NOT NULL DEFAULT TRUE,
  created_by     UUID NOT NULL REFERENCES admin_users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (family_id, version)
);

CREATE INDEX idx_questions_active ON questions (technology_id, difficulty, is_active, is_latest)
  WHERE is_active = TRUE AND is_latest = TRUE;
CREATE INDEX idx_questions_family ON questions (family_id);
CREATE INDEX idx_questions_skill  ON questions (skill_area);

-- Test configurations
CREATE TABLE test_configs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  technology_id       UUID NOT NULL REFERENCES technologies(id),
  difficulty          TEXT NOT NULL CHECK (difficulty IN ('junior', 'mid', 'senior')),
  num_questions       INT  NOT NULL CHECK (num_questions > 0),
  pass_threshold_pct  INT  NOT NULL CHECK (pass_threshold_pct BETWEEN 1 AND 100) DEFAULT 70,
  created_by          UUID NOT NULL REFERENCES admin_users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE
);

-- Audit log
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES admin_users(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  detail      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_entity ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_log_admin  ON audit_log (admin_id);

-- Phase 2: Test Links
CREATE TABLE IF NOT EXISTS test_links (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_config_id UUID NOT NULL REFERENCES test_configs(id),
  token          TEXT NOT NULL UNIQUE,
  seed           TEXT NOT NULL,
  expires_at     TIMESTAMPTZ,
  state          TEXT NOT NULL DEFAULT 'created'
                   CHECK (state IN ('created', 'active', 'submitted', 'expired')),
  started_at     TIMESTAMPTZ,
  submitted_at   TIMESTAMPTZ,
  created_by     UUID NOT NULL REFERENCES admin_users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_test_links_token ON test_links (token);
CREATE INDEX IF NOT EXISTS idx_test_links_config ON test_links (test_config_id);

-- Phase 2: Candidate Answers
CREATE TABLE IF NOT EXISTS candidate_answers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id      UUID NOT NULL REFERENCES test_links(id),
  question_id  UUID NOT NULL REFERENCES questions(id),
  answer       TEXT NOT NULL CHECK (answer IN ('a','b','c','d')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (link_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_candidate_answers_link ON candidate_answers (link_id);

-- Phase 3: Submission Results
CREATE TABLE IF NOT EXISTS submission_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id             UUID NOT NULL REFERENCES test_links(id),
  score_pct           INT  NOT NULL CHECK (score_pct BETWEEN 0 AND 100),
  pass                BOOLEAN NOT NULL,
  skill_area_scores   JSONB NOT NULL DEFAULT '{}',
  time_taken_seconds  INT NOT NULL CHECK (time_taken_seconds >= 0),
  graded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (link_id)
);
CREATE INDEX IF NOT EXISTS idx_submission_results_link ON submission_results (link_id);

-- Seed initial data
INSERT INTO technologies (slug, name) VALUES
  ('power-bi',         'Power BI'),
  ('sfmc',             'Salesforce Marketing Cloud'),
  ('data-engineering', 'Data Engineering')
ON CONFLICT (slug) DO NOTHING;
