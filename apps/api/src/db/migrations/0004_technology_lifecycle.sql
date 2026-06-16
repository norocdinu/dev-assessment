-- 0004_technology_lifecycle: soft-delete (archive) support for technologies
ALTER TABLE technologies ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_technologies_active ON technologies (is_active);
