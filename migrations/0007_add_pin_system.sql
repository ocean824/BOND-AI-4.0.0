-- Migration: Add PIN-based access control system
-- Version: 3.2.0
-- Date: 2026-01-19

-- Create admin_pins table for PIN management
CREATE TABLE IF NOT EXISTS admin_pins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  pin_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'surety')),
  permissions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

-- Create PIN access logs table for audit trail
CREATE TABLE IF NOT EXISTS pin_access_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  pin_id INTEGER REFERENCES admin_pins(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  success BOOLEAN NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_admin_pins_user_id ON admin_pins(user_id);
CREATE INDEX idx_admin_pins_role ON admin_pins(role);
CREATE INDEX idx_admin_pins_active ON admin_pins(is_active);
CREATE INDEX idx_pin_access_logs_user_id ON pin_access_logs(user_id);
CREATE INDEX idx_pin_access_logs_created_at ON pin_access_logs(created_at);

-- Add PIN-related columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_pin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_role VARCHAR(20) CHECK (pin_role IN ('admin', 'surety'));

-- Comments
COMMENT ON TABLE admin_pins IS 'PIN-based access control for admin and surety users';
COMMENT ON COLUMN admin_pins.pin_hash IS 'Bcrypt hash of the PIN (6-digit)';
COMMENT ON COLUMN admin_pins.role IS 'User role: admin (full access) or surety (limited access)';
COMMENT ON COLUMN admin_pins.permissions IS 'Array of permission strings for granular access control';
COMMENT ON TABLE pin_access_logs IS 'Audit trail of all PIN-protected access attempts';
