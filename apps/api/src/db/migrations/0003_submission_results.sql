-- 0003_submission_results: graded results per submission

CREATE TABLE submission_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id             UUID NOT NULL REFERENCES test_links(id),
  score_pct           INT  NOT NULL CHECK (score_pct BETWEEN 0 AND 100),
  pass                BOOLEAN NOT NULL,
  skill_area_scores   JSONB NOT NULL DEFAULT '{}',
  time_taken_seconds  INT NOT NULL CHECK (time_taken_seconds >= 0),
  graded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (link_id)
);
CREATE INDEX idx_submission_results_link ON submission_results (link_id);
