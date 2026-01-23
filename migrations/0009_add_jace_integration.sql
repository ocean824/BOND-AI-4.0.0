-- Migration: Add Jace integration tables and fields
-- Date: 2026-01-23
-- Description: Adds Jace webhook table and Jace-related fields to exchange_trades

-- Add Jace webhooks table
CREATE TABLE IF NOT EXISTS jace_webhooks (
  id SERIAL PRIMARY KEY,
  jace_event_id VARCHAR(255) NOT NULL UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED', -- RECEIVED | PROCESSED | FAILED
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jace_webhooks_event_id ON jace_webhooks(jace_event_id);
CREATE INDEX IF NOT EXISTS idx_jace_webhooks_status ON jace_webhooks(status);
CREATE INDEX IF NOT EXISTS idx_jace_webhooks_created_at ON jace_webhooks(created_at);

-- Add Jace fields to exchange_trades
ALTER TABLE exchange_trades ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE exchange_trades ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exchange_trades ADD COLUMN IF NOT EXISTS jace_session_id VARCHAR(255);
ALTER TABLE exchange_trades ADD COLUMN IF NOT EXISTS jace_session_status VARCHAR(20);
ALTER TABLE exchange_trades ADD COLUMN IF NOT EXISTS jace_payment_reference VARCHAR(255);
ALTER TABLE exchange_trades ADD COLUMN IF NOT EXISTS jace_paid_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_exchange_trades_jace_session ON exchange_trades(jace_session_id) WHERE jace_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exchange_trades_onboarding ON exchange_trades(onboarding_status);
