-- 0002_test_links: candidate links + answers

CREATE TABLE test_links (
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
  candidate_name TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_test_links_token ON test_links (token);
CREATE INDEX idx_test_links_config ON test_links (test_config_id);

CREATE TABLE candidate_answers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id      UUID NOT NULL REFERENCES test_links(id),
  question_id  UUID NOT NULL REFERENCES questions(id),
  answer       TEXT NOT NULL CHECK (answer IN ('a','b','c','d')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (link_id, question_id)
);
CREATE INDEX idx_candidate_answers_link ON candidate_answers (link_id);
