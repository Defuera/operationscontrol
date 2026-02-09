CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'project', 'goal', 'journal')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
