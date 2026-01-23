-- Migration: Add invite code system and grandfather existing users
-- Date: 2026-01-23
-- Description: Adds invite code tracking to users and grandfathers all existing users

-- Add invite code fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code_used VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;

-- CRITICAL: Grandfather all existing users
-- This ensures existing accounts (including admin) are not affected by the new invite code system
UPDATE users 
SET 
  invite_code_accepted_at = created_at,
  terms_accepted_at = created_at,
  invite_code_used = 'GRANDFATHERED'
WHERE invite_code_accepted_at IS NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code_used) WHERE invite_code_used IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_invite_accepted ON users(invite_code_accepted_at) WHERE invite_code_accepted_at IS NOT NULL;
