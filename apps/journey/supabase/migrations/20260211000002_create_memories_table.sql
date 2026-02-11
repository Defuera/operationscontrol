-- Memories table for AI-persisted context across conversations
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  anchor_path TEXT,  -- '/projects/5' or null for global
  content TEXT NOT NULL,
  tags TEXT,  -- Optional comma-separated tags
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast lookups by user_id and anchor_path
CREATE INDEX idx_memories_user_anchor ON memories (user_id, anchor_path);

-- Index for global memories (where anchor_path is null)
CREATE INDEX idx_memories_user_global ON memories (user_id) WHERE anchor_path IS NULL;

-- Enable Row Level Security
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own memories
CREATE POLICY "Users can view own memories"
ON memories
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can insert their own memories
CREATE POLICY "Users can insert own memories"
ON memories
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own memories
CREATE POLICY "Users can update own memories"
ON memories
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own memories
CREATE POLICY "Users can delete own memories"
ON memories
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Update entity_short_codes to support 'memory' entity type
-- First drop the constraint, then recreate with new value
ALTER TABLE entity_short_codes DROP CONSTRAINT IF EXISTS entity_short_codes_entity_type_check;
ALTER TABLE entity_short_codes ADD CONSTRAINT entity_short_codes_entity_type_check
  CHECK (entity_type IN ('task', 'project', 'goal', 'journal', 'memory'));

-- Update ai_actions to support 'memory' entity type
ALTER TABLE ai_actions DROP CONSTRAINT IF EXISTS ai_actions_entity_type_check;
ALTER TABLE ai_actions ADD CONSTRAINT ai_actions_entity_type_check
  CHECK (entity_type IN ('task', 'project', 'goal', 'journal', 'file', 'memory'));
