-- Migration: Add indexes for performance optimization
-- Created: 2026-01-16
-- Description: Adds database indexes on frequently queried columns and foreign keys

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- Indexes for judgments table
CREATE INDEX IF NOT EXISTS idx_judgments_owner_id ON judgments(owner_id);
CREATE INDEX IF NOT EXISTS idx_judgments_status ON judgments(status);
CREATE INDEX IF NOT EXISTS idx_judgments_created_at ON judgments(created_at DESC);

-- Indexes for bonds table
CREATE INDEX IF NOT EXISTS idx_bonds_owner_id ON bonds(owner_id);
CREATE INDEX IF NOT EXISTS idx_bonds_status ON bonds(status);
CREATE INDEX IF NOT EXISTS idx_bonds_is_perfected ON bonds(is_perfected);
CREATE INDEX IF NOT EXISTS idx_bonds_surety_case_id ON bonds(surety_case_id);
CREATE INDEX IF NOT EXISTS idx_bonds_cusip ON bonds(cusip);
CREATE INDEX IF NOT EXISTS idx_bonds_isin ON bonds(isin);

-- Indexes for auctions table
CREATE INDEX IF NOT EXISTS idx_auctions_bond_id ON auctions(bond_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_ends_at ON auctions(ends_at);
CREATE INDEX IF NOT EXISTS idx_auctions_winning_bid_id ON auctions(winning_bid_id);

-- Indexes for auction_bids table
CREATE INDEX IF NOT EXISTS idx_auction_bids_auction_id ON auction_bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_investor_id ON auction_bids(investor_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_placed_at ON auction_bids(placed_at DESC);

-- Indexes for exchange_trades table
CREATE INDEX IF NOT EXISTS idx_exchange_trades_auction_id ON exchange_trades(auction_id);
CREATE INDEX IF NOT EXISTS idx_exchange_trades_bond_id ON exchange_trades(bond_id);
CREATE INDEX IF NOT EXISTS idx_exchange_trades_investor_id ON exchange_trades(investor_id);
CREATE INDEX IF NOT EXISTS idx_exchange_trades_status ON exchange_trades(status);
CREATE INDEX IF NOT EXISTS idx_exchange_trades_stripe_checkout_session_id ON exchange_trades(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_exchange_trades_stripe_payment_intent_id ON exchange_trades(stripe_payment_intent_id);

-- Indexes for bond_assignments table
CREATE INDEX IF NOT EXISTS idx_bond_assignments_bond_id ON bond_assignments(bond_id);
CREATE INDEX IF NOT EXISTS idx_bond_assignments_investor_id ON bond_assignments(investor_id);
CREATE INDEX IF NOT EXISTS idx_bond_assignments_status ON bond_assignments(status);
CREATE INDEX IF NOT EXISTS idx_bond_assignments_trade_id ON bond_assignments(trade_id);

-- Indexes for immutable_events table
CREATE INDEX IF NOT EXISTS idx_immutable_events_entity_type_id ON immutable_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_immutable_events_event_type ON immutable_events(event_type);
CREATE INDEX IF NOT EXISTS idx_immutable_events_actor_id ON immutable_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_immutable_events_correlation_id ON immutable_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_immutable_events_created_at ON immutable_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_immutable_events_event_hash ON immutable_events(event_hash);

-- Indexes for ledger tables
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_account_code ON ledger_accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_account_type ON ledger_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_ledger_journal_entries_created_at ON ledger_journal_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_postings_journal_entry_id ON ledger_postings(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_ledger_postings_account_code ON ledger_postings(account_code);

-- Indexes for distributions table
CREATE INDEX IF NOT EXISTS idx_distributions_bond_id ON distributions(bond_id);
CREATE INDEX IF NOT EXISTS idx_distributions_status ON distributions(status);
CREATE INDEX IF NOT EXISTS idx_distributions_executed_at ON distributions(executed_at);

-- Indexes for surety tables
CREATE INDEX IF NOT EXISTS idx_surety_cases_bond_id ON surety_cases(bond_id);
CREATE INDEX IF NOT EXISTS idx_surety_cases_surety_trust_id ON surety_cases(surety_trust_id);
CREATE INDEX IF NOT EXISTS idx_surety_cases_status ON surety_cases(status);

-- Indexes for stripe_webhooks table
CREATE INDEX IF NOT EXISTS idx_stripe_webhooks_stripe_event_id ON stripe_webhooks(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhooks_event_type ON stripe_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_webhooks_status ON stripe_webhooks(status);
CREATE INDEX IF NOT EXISTS idx_stripe_webhooks_created_at ON stripe_webhooks(created_at DESC);
