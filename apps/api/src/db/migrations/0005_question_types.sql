-- 0005_question_types: unified multi-type question model + image assets

ALTER TABLE questions ADD COLUMN type       TEXT;
ALTER TABLE questions ADD COLUMN content    JSONB;
ALTER TABLE questions ADD COLUMN answer_key JSONB;

UPDATE questions SET
  type = 'single_choice',
  content = jsonb_build_object(
    'prompt',  jsonb_build_array(jsonb_build_object('type','text','text', text)),
    'options', jsonb_build_array(option_a, option_b, option_c, option_d)
  ),
  answer_key = jsonb_build_object(
    'correctIndex',
    CASE correct_option WHEN 'a' THEN 0 WHEN 'b' THEN 1 WHEN 'c' THEN 2 ELSE 3 END
  );

ALTER TABLE questions ALTER COLUMN type       SET NOT NULL;
ALTER TABLE questions ALTER COLUMN content    SET NOT NULL;
ALTER TABLE questions ALTER COLUMN answer_key SET NOT NULL;
ALTER TABLE questions ADD CONSTRAINT questions_type_chk
  CHECK (type IN ('single_choice','multi_select','true_false','matching','ordering','fill_blank'));

ALTER TABLE questions
  DROP COLUMN text,
  DROP COLUMN option_a, DROP COLUMN option_b,
  DROP COLUMN option_c, DROP COLUMN option_d,
  DROP COLUMN correct_option;

ALTER TABLE candidate_answers ADD COLUMN answer_json JSONB;
UPDATE candidate_answers SET answer_json = jsonb_build_object(
  'index', CASE answer WHEN 'a' THEN 0 WHEN 'b' THEN 1 WHEN 'c' THEN 2 ELSE 3 END
);
ALTER TABLE candidate_answers DROP COLUMN answer;
ALTER TABLE candidate_answers RENAME COLUMN answer_json TO answer;
ALTER TABLE candidate_answers ALTER COLUMN answer SET NOT NULL;

CREATE TABLE question_assets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mime       TEXT NOT NULL CHECK (mime IN ('image/png','image/jpeg','image/webp','image/gif')),
  bytes      BYTEA NOT NULL,
  byte_size  INT NOT NULL CHECK (byte_size > 0 AND byte_size <= 1048576),
  created_by UUID NOT NULL REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
