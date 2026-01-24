-- Migration: Add Investor Dashboard Features
-- Adds user_settings, investor_documents, and is_demo tracking

-- User Settings Table (stores demo mode and tour completion per user)
CREATE TABLE IF NOT EXISTS user_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  demo_mode BOOLEAN DEFAULT FALSE,
  tour_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_settings_user_id (user_id)
);

-- Investor Documents Table (private document vault per investor)
CREATE TABLE IF NOT EXISTS investor_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  bond_id INT NULL,
  trade_id INT NULL,
  document_type VARCHAR(100) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (bond_id) REFERENCES bonds(id) ON DELETE SET NULL,
  FOREIGN KEY (trade_id) REFERENCES exchange_trades(id) ON DELETE SET NULL,
  INDEX idx_investor_docs_user_id (user_id),
  INDEX idx_investor_docs_bond_id (bond_id),
  INDEX idx_investor_docs_trade_id (trade_id),
  INDEX idx_investor_docs_type (document_type)
);

-- Add is_demo columns to track demo vs real data
ALTER TABLE bonds ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE auction_bids ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE exchange_trades ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE exchange_settlements ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- Add indexes for is_demo filtering
ALTER TABLE bonds ADD INDEX IF NOT EXISTS idx_bonds_is_demo (is_demo);
ALTER TABLE auctions ADD INDEX IF NOT EXISTS idx_auctions_is_demo (is_demo);
ALTER TABLE auction_bids ADD INDEX IF NOT EXISTS idx_auction_bids_is_demo (is_demo);
ALTER TABLE exchange_trades ADD INDEX IF NOT EXISTS idx_trades_is_demo (is_demo);
ALTER TABLE exchange_settlements ADD INDEX IF NOT EXISTS idx_settlements_is_demo (is_demo);

-- Support Messages Table (for investor support/contact system)
CREATE TABLE IF NOT EXISTS support_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  status VARCHAR(50) DEFAULT 'open',
  admin_response TEXT,
  responded_by INT NULL,
  responded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (responded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_support_user_id (user_id),
  INDEX idx_support_status (status),
  INDEX idx_support_category (category)
);

-- Initialize user_settings for existing users (default demo_mode = FALSE)
INSERT INTO user_settings (user_id, demo_mode, tour_completed)
SELECT id, FALSE, FALSE
FROM users
WHERE id NOT IN (SELECT user_id FROM user_settings);
