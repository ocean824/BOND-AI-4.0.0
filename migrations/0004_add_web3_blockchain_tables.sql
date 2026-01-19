-- Migration: Add Web3, Blockchain, and Integration Tables
-- Date: 2026-01-16
-- Purpose: Enable blockchain integration, token-gating, and cross-platform automation

-- Web3 Wallets
CREATE TABLE IF NOT EXISTS web3_wallets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(42) NOT NULL,
  chain_id INTEGER NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  signature TEXT, -- Signature used for verification
  nonce VARCHAR(255), -- Nonce for signature verification
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(wallet_address, chain_id)
);

CREATE INDEX idx_web3_wallets_user_id ON web3_wallets(user_id);
CREATE INDEX idx_web3_wallets_address ON web3_wallets(wallet_address);
CREATE INDEX idx_web3_wallets_primary ON web3_wallets(user_id, is_primary) WHERE is_primary = true;

-- Token Balances
CREATE TABLE IF NOT EXISTS token_balances (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(42) NOT NULL,
  token_address VARCHAR(42) NOT NULL,
  token_symbol VARCHAR(20) NOT NULL,
  chain_id INTEGER NOT NULL,
  balance DECIMAL(36, 18) NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(wallet_address, token_address, chain_id)
);

CREATE INDEX idx_token_balances_user_id ON token_balances(user_id);
CREATE INDEX idx_token_balances_wallet ON token_balances(wallet_address);
CREATE INDEX idx_token_balances_token ON token_balances(token_address, chain_id);

-- Blockchain Transactions
CREATE TABLE IF NOT EXISTS blockchain_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  tx_hash VARCHAR(66) NOT NULL,
  chain_id INTEGER NOT NULL,
  from_address VARCHAR(42) NOT NULL,
  to_address VARCHAR(42) NOT NULL,
  value DECIMAL(36, 18),
  gas_used INTEGER,
  gas_price DECIMAL(36, 18),
  block_number INTEGER,
  block_timestamp TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, confirmed, failed
  entity_type VARCHAR(50), -- bond, auction, distribution, trade
  entity_id INTEGER,
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(tx_hash, chain_id)
);

CREATE INDEX idx_blockchain_tx_hash ON blockchain_transactions(tx_hash);
CREATE INDEX idx_blockchain_tx_user ON blockchain_transactions(user_id);
CREATE INDEX idx_blockchain_tx_status ON blockchain_transactions(status);
CREATE INDEX idx_blockchain_tx_entity ON blockchain_transactions(entity_type, entity_id);
CREATE INDEX idx_blockchain_tx_block ON blockchain_transactions(chain_id, block_number);

-- NFT Tokens (Tokenized Bonds)
CREATE TABLE IF NOT EXISTS nft_tokens (
  id SERIAL PRIMARY KEY,
  bond_id INTEGER NOT NULL REFERENCES bonds(id) ON DELETE CASCADE,
  token_id VARCHAR(78) NOT NULL, -- Can be very large for some NFT standards
  contract_address VARCHAR(42) NOT NULL,
  chain_id INTEGER NOT NULL,
  owner_address VARCHAR(42) NOT NULL,
  metadata_uri TEXT,
  metadata JSONB DEFAULT '{}',
  minted_at TIMESTAMP WITH TIME ZONE,
  minted_tx_hash VARCHAR(66),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(contract_address, token_id, chain_id)
);

CREATE INDEX idx_nft_tokens_bond_id ON nft_tokens(bond_id);
CREATE INDEX idx_nft_tokens_owner ON nft_tokens(owner_address);
CREATE INDEX idx_nft_tokens_contract ON nft_tokens(contract_address, chain_id);

-- Token Gates (Token-gating configuration)
CREATE TABLE IF NOT EXISTS token_gates (
  id SERIAL PRIMARY KEY,
  action_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  token_address VARCHAR(42) NOT NULL,
  token_symbol VARCHAR(20) NOT NULL,
  minimum_balance DECIMAL(36, 18) NOT NULL,
  chain_id INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  alternative_action TEXT, -- e.g., "Pay $10 fee" or "Subscribe to premium"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_token_gates_action ON token_gates(action_name);
CREATE INDEX idx_token_gates_active ON token_gates(is_active) WHERE is_active = true;

-- Webhooks (Generic webhook system)
CREATE TABLE IF NOT EXISTS webhooks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(255) NOT NULL,
  events JSONB NOT NULL DEFAULT '[]', -- ['bond.created', 'auction.completed']
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  failure_count INTEGER DEFAULT 0,
  last_failure_at TIMESTAMP WITH TIME ZONE,
  last_failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX idx_webhooks_active ON webhooks(is_active) WHERE is_active = true;

-- Webhook Deliveries (Webhook delivery tracking)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id SERIAL PRIMARY KEY,
  webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  response_headers JSONB,
  attempt_number INTEGER DEFAULT 1,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_event ON webhook_deliveries(event_type);
CREATE INDEX idx_webhook_deliveries_created ON webhook_deliveries(created_at);

-- API Keys (API key management)
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  key_prefix VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  scopes JSONB NOT NULL DEFAULT '[]', -- ['read:bonds', 'write:auctions']
  rate_limit INTEGER DEFAULT 1000, -- requests per hour
  requests_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- API Key Usage (Rate limiting and analytics)
CREATE TABLE IF NOT EXISTS api_key_usage (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_api_key_usage_key_id ON api_key_usage(api_key_id);
CREATE INDEX idx_api_key_usage_created ON api_key_usage(created_at);

-- Smart Contracts (Track deployed contracts)
CREATE TABLE IF NOT EXISTS smart_contracts (
  id SERIAL PRIMARY KEY,
  contract_name VARCHAR(100) NOT NULL,
  contract_type VARCHAR(50) NOT NULL, -- token, nft, auction, escrow, distribution
  contract_address VARCHAR(42) NOT NULL,
  chain_id INTEGER NOT NULL,
  abi JSONB NOT NULL,
  deployment_tx_hash VARCHAR(66),
  deployer_address VARCHAR(42),
  is_active BOOLEAN DEFAULT true,
  deployed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(contract_address, chain_id)
);

CREATE INDEX idx_smart_contracts_type ON smart_contracts(contract_type);
CREATE INDEX idx_smart_contracts_address ON smart_contracts(contract_address, chain_id);
CREATE INDEX idx_smart_contracts_active ON smart_contracts(is_active) WHERE is_active = true;

-- Blockchain Events (Event listener tracking)
CREATE TABLE IF NOT EXISTS blockchain_events (
  id SERIAL PRIMARY KEY,
  contract_address VARCHAR(42) NOT NULL,
  chain_id INTEGER NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  block_number INTEGER NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  log_index INTEGER NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(tx_hash, log_index)
);

CREATE INDEX idx_blockchain_events_contract ON blockchain_events(contract_address, chain_id);
CREATE INDEX idx_blockchain_events_block ON blockchain_events(chain_id, block_number);
CREATE INDEX idx_blockchain_events_processed ON blockchain_events(processed) WHERE processed = false;
CREATE INDEX idx_blockchain_events_event_name ON blockchain_events(event_name);

-- Integration Connections (Cross-platform connections)
CREATE TABLE IF NOT EXISTS integration_connections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(100) NOT NULL, -- github, n8n, zapier, custom
  connection_name VARCHAR(255) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  credentials JSONB, -- Encrypted
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_integration_connections_user_id ON integration_connections(user_id);
CREATE INDEX idx_integration_connections_platform ON integration_connections(platform);
CREATE INDEX idx_integration_connections_active ON integration_connections(is_active) WHERE is_active = true;

-- Job Queue (Background jobs)
CREATE TABLE IF NOT EXISTS job_queue (
  id SERIAL PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL,
  job_type VARCHAR(50) NOT NULL, -- blockchain-sync, webhook-delivery, email, distribution
  payload JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_job_queue_status ON job_queue(status);
CREATE INDEX idx_job_queue_scheduled ON job_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_job_queue_type ON job_queue(job_type);

-- Add blockchain fields to existing tables

-- Add wallet address to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_wallet_address VARCHAR(42);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_verified_at TIMESTAMP WITH TIME ZONE;

-- Add blockchain fields to bonds table
ALTER TABLE bonds ADD COLUMN IF NOT EXISTS nft_token_id VARCHAR(78);
ALTER TABLE bonds ADD COLUMN IF NOT EXISTS nft_contract_address VARCHAR(42);
ALTER TABLE bonds ADD COLUMN IF NOT EXISTS nft_chain_id INTEGER;
ALTER TABLE bonds ADD COLUMN IF NOT EXISTS is_tokenized BOOLEAN DEFAULT false;

-- Add blockchain fields to auctions table
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS accepts_crypto BOOLEAN DEFAULT false;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS crypto_reserve_price DECIMAL(36, 18);
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS blockchain_auction_id VARCHAR(78);

-- Add blockchain fields to exchange_trades table
ALTER TABLE exchange_trades ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'stripe'; -- stripe, crypto
ALTER TABLE exchange_trades ADD COLUMN IF NOT EXISTS crypto_tx_hash VARCHAR(66);
ALTER TABLE exchange_trades ADD COLUMN IF NOT EXISTS crypto_amount DECIMAL(36, 18);
ALTER TABLE exchange_trades ADD COLUMN IF NOT EXISTS crypto_token_address VARCHAR(42);

-- Add blockchain fields to distributions table
ALTER TABLE distributions ADD COLUMN IF NOT EXISTS blockchain_distribution_id VARCHAR(78);
ALTER TABLE distributions ADD COLUMN IF NOT EXISTS distribution_tx_hash VARCHAR(66);

-- Create views for common queries

-- View: User token holdings
CREATE OR REPLACE VIEW user_token_holdings AS
SELECT 
  u.id AS user_id,
  u.email,
  u.name,
  tb.token_symbol,
  tb.token_address,
  tb.chain_id,
  SUM(tb.balance) AS total_balance,
  MAX(tb.last_synced_at) AS last_synced_at
FROM users u
LEFT JOIN web3_wallets w ON u.id = w.user_id
LEFT JOIN token_balances tb ON w.wallet_address = tb.wallet_address
GROUP BY u.id, u.email, u.name, tb.token_symbol, tb.token_address, tb.chain_id;

-- View: Active webhooks summary
CREATE OR REPLACE VIEW active_webhooks_summary AS
SELECT 
  w.id,
  w.user_id,
  u.email AS user_email,
  w.name,
  w.url,
  jsonb_array_length(w.events) AS event_count,
  w.last_triggered_at,
  w.failure_count,
  COUNT(wd.id) AS total_deliveries,
  COUNT(CASE WHEN wd.response_status >= 200 AND wd.response_status < 300 THEN 1 END) AS successful_deliveries
FROM webhooks w
JOIN users u ON w.user_id = u.id
LEFT JOIN webhook_deliveries wd ON w.id = wd.webhook_id
WHERE w.is_active = true
GROUP BY w.id, w.user_id, u.email, w.name, w.url, w.events, w.last_triggered_at, w.failure_count;

-- View: Blockchain transaction summary
CREATE OR REPLACE VIEW blockchain_tx_summary AS
SELECT 
  chain_id,
  status,
  entity_type,
  COUNT(*) AS tx_count,
  SUM(CASE WHEN value IS NOT NULL THEN value ELSE 0 END) AS total_value,
  AVG(gas_used) AS avg_gas_used,
  MIN(created_at) AS first_tx,
  MAX(created_at) AS last_tx
FROM blockchain_transactions
GROUP BY chain_id, status, entity_type;

COMMENT ON TABLE web3_wallets IS 'Web3 wallet addresses linked to user accounts';
COMMENT ON TABLE token_balances IS 'Token balance tracking for token-gating';
COMMENT ON TABLE blockchain_transactions IS 'All blockchain transactions initiated by the platform';
COMMENT ON TABLE nft_tokens IS 'NFT representations of bonds (ERC-721)';
COMMENT ON TABLE token_gates IS 'Token-gating configuration for actions';
COMMENT ON TABLE webhooks IS 'Generic webhook system for integrations';
COMMENT ON TABLE webhook_deliveries IS 'Webhook delivery tracking and retry';
COMMENT ON TABLE api_keys IS 'API key management for third-party integrations';
COMMENT ON TABLE smart_contracts IS 'Deployed smart contracts registry';
COMMENT ON TABLE blockchain_events IS 'Blockchain event listener tracking';
COMMENT ON TABLE integration_connections IS 'Cross-platform integration connections';
COMMENT ON TABLE job_queue IS 'Background job queue for async processing';
