-- Add deleted_at column to ai_messages for soft-delete support (message editing feature)
ALTER TABLE "ai_messages" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz;
