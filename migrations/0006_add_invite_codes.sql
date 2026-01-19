-- Migration: Add invite code system
-- Version: 3.1.0
-- Date: 2026-01-19

-- Create invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(32) UNIQUE NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('analyst', 'investor', 'admin')),
  max_uses INTEGER NOT NULL DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT
);

-- Create index on code for fast lookup
CREATE INDEX idx_invite_codes_code ON invite_codes(code);
CREATE INDEX idx_invite_codes_active ON invite_codes(is_active);
CREATE INDEX idx_invite_codes_expires_at ON invite_codes(expires_at);

-- Add invite_code_used to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code_used VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP;

-- Create index on invite_code_used
CREATE INDEX idx_users_invite_code ON users(invite_code_used);

-- Add comment
COMMENT ON TABLE invite_codes IS 'Admin-generated invite codes required for account creation';
COMMENT ON COLUMN invite_codes.code IS 'Unique invite code (e.g., BOND-2026-ABC123)';
COMMENT ON COLUMN invite_codes.account_type IS 'Type of account this code allows: analyst, investor, or admin';
COMMENT ON COLUMN invite_codes.max_uses IS 'Maximum number of times this code can be used';
COMMENT ON COLUMN invite_codes.current_uses IS 'Number of times this code has been used';
COMMENT ON COLUMN invite_codes.expires_at IS 'Optional expiration date for the code';
COMMENT ON COLUMN invite_codes.created_by IS 'Admin user who generated this code';
