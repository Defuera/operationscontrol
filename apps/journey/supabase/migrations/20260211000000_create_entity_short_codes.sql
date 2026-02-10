-- Entity Short Codes table for GitHub-style references (task#123, project#45, etc.)
CREATE TABLE IF NOT EXISTS entity_short_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'project', 'goal', 'journal')),
  entity_id UUID NOT NULL,
  short_code INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, entity_type, short_code),
  UNIQUE (user_id, entity_type, entity_id)
);

-- Index for fast lookups by entity_id
CREATE INDEX idx_entity_short_codes_entity ON entity_short_codes (user_id, entity_type, entity_id);

-- Index for fast lookups by short_code
CREATE INDEX idx_entity_short_codes_lookup ON entity_short_codes (user_id, entity_type, short_code);

-- Backfill existing tasks with sequential short codes per user
INSERT INTO entity_short_codes (user_id, entity_type, entity_id, short_code)
SELECT
  user_id,
  'task',
  id,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at)::INTEGER
FROM tasks
ON CONFLICT DO NOTHING;

-- Backfill existing projects with sequential short codes per user
INSERT INTO entity_short_codes (user_id, entity_type, entity_id, short_code)
SELECT
  user_id,
  'project',
  id,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at)::INTEGER
FROM projects
ON CONFLICT DO NOTHING;

-- Backfill existing goals with sequential short codes per user
INSERT INTO entity_short_codes (user_id, entity_type, entity_id, short_code)
SELECT
  user_id,
  'goal',
  id,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at)::INTEGER
FROM goals
ON CONFLICT DO NOTHING;

-- Backfill existing journal entries with sequential short codes per user
INSERT INTO entity_short_codes (user_id, entity_type, entity_id, short_code)
SELECT
  user_id,
  'journal',
  id,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at)::INTEGER
FROM journal_entries
ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE entity_short_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own short codes
CREATE POLICY "Users can view own short codes"
ON entity_short_codes
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can insert their own short codes
CREATE POLICY "Users can insert own short codes"
ON entity_short_codes
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own short codes
CREATE POLICY "Users can delete own short codes"
ON entity_short_codes
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
