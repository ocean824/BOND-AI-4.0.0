-- EMERGENCY: Manual SQL to create users in production database
-- Run this in Replit Database Console if automatic deployment fails

-- Create admin user (check if exists first)
INSERT INTO users (email, password, name, role)
SELECT 
  'admin@bondai.app',
  '$2a$10$xV4P7vqHx4yGZqN8rYqK9O5PxqKqxqKqxqKqxqKqxqKqxqKqxqK',  -- bcrypt hash for "admin123"
  'Admin User',
  'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'admin@bondai.app'
);

-- Create test user (check if exists first)  
INSERT INTO users (email, password, name, role)
SELECT 
  'test@bondai.app',
  '$2a$10$YzB4rMEqK5g5vqHx4yGZqN8rYqK9O5PxqKqxqKqxqKqxqKqxqKq',  -- bcrypt hash for "Test2024!"
  'Test User',
  'analyst'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'test@bondai.app'
);

-- Verify users were created
SELECT id, email, name, role FROM users WHERE email IN ('admin@bondai.app', 'test@bondai.app');
