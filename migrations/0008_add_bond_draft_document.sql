-- Migration: Add draft document fields to bonds table
-- This allows AI-generated bond drafts to be persisted and survive page refreshes

ALTER TABLE bonds ADD COLUMN IF NOT EXISTS draft_document TEXT;
ALTER TABLE bonds ADD COLUMN IF NOT EXISTS draft_updated_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster draft queries
CREATE INDEX IF NOT EXISTS idx_bonds_draft_updated ON bonds(draft_updated_at) WHERE draft_document IS NOT NULL;
