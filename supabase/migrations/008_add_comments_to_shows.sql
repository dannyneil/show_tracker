-- Add comment field to shows for personal notes
ALTER TABLE shows ADD COLUMN IF NOT EXISTS comment TEXT;

-- Add index for better query performance when filtering by comments
CREATE INDEX IF NOT EXISTS idx_shows_comment ON shows(comment) WHERE comment IS NOT NULL;
