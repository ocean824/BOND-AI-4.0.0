-- Migration: Add KYC and Accredited Investor fields to users table
-- These fields are used by optional KYC and accredited investor verification services

ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_verification_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accredited_status VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS accredited_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_kyc_verified ON users(kyc_verified);
CREATE INDEX IF NOT EXISTS idx_users_accredited_status ON users(accredited_status);
