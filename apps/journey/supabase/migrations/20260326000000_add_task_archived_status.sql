-- Add 'archived' to tasks status enum and add archived_at column
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('backlog', 'todo', 'in_progress', 'done', 'archived'));

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;
