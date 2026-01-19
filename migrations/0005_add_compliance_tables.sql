-- Migration: Add compliance tables for KYC/AML, accredited investor, tax reporting, etc.
-- Date: 2026-01-16

-- KYC/AML Verifications
CREATE TABLE IF NOT EXISTS kyc_verifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- persona, onfido, jumio, sumsub
  verification_id VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, expired, under_review
  verification_type VARCHAR(50) NOT NULL DEFAULT 'basic', -- basic, enhanced
  
  -- Identity verification
  identity_verified BOOLEAN DEFAULT false,
  address_verified BOOLEAN DEFAULT false,
  document_type VARCHAR(50), -- passport, drivers_license, national_id
  document_number VARCHAR(255),
  document_expiry DATE,
  document_front_url TEXT,
  document_back_url TEXT,
  selfie_url TEXT,
  
  -- Personal information
  first_name VARCHAR(255),
  middle_name VARCHAR(255),
  last_name VARCHAR(255),
  date_of_birth DATE,
  nationality VARCHAR(3), -- ISO 3166-1 alpha-3
  country_of_residence VARCHAR(3),
  address_line1 TEXT,
  address_line2 TEXT,
  city VARCHAR(255),
  state_province VARCHAR(255),
  postal_code VARCHAR(50),
  
  -- Compliance checks
  pep_check_result VARCHAR(50), -- clear, match, not_checked
  pep_details JSONB,
  sanctions_check_result VARCHAR(50), -- clear, match, not_checked
  sanctions_details JSONB,
  adverse_media_check_result VARCHAR(50),
  adverse_media_details JSONB,
  
  -- Risk assessment
  risk_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high, very_high
  risk_factors JSONB,
  
  -- Metadata
  verification_data JSONB,
  rejection_reason TEXT,
  notes TEXT,
  
  -- Timestamps
  submitted_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP,
  expires_at TIMESTAMP,
  last_reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT kyc_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'under_review')),
  CONSTRAINT kyc_risk_level_check CHECK (risk_level IN ('low', 'medium', 'high', 'very_high'))
);

CREATE INDEX idx_kyc_user_id ON kyc_verifications(user_id);
CREATE INDEX idx_kyc_status ON kyc_verifications(status);
CREATE INDEX idx_kyc_verification_id ON kyc_verifications(verification_id);
CREATE INDEX idx_kyc_expires_at ON kyc_verifications(expires_at);

-- Accredited Investor Verifications
CREATE TABLE IF NOT EXISTS accredited_investor_verifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- parallel_markets, verifyinvestor, north_capital
  verification_id VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, expired
  
  -- Verification method
  verification_method VARCHAR(50) NOT NULL, -- income, net_worth, professional, entity
  
  -- Income verification
  income_amount DECIMAL(18, 2),
  income_year INTEGER,
  income_documents JSONB,
  
  -- Net worth verification
  net_worth_amount DECIMAL(18, 2),
  net_worth_date DATE,
  net_worth_documents JSONB,
  
  -- Professional certification
  professional_certification VARCHAR(100), -- series_7, series_65, series_82, cpa, attorney
  certification_number VARCHAR(255),
  certification_documents JSONB,
  
  -- Entity verification
  entity_name VARCHAR(255),
  entity_type VARCHAR(100), -- corporation, llc, trust, partnership
  entity_documents JSONB,
  
  -- Metadata
  verification_data JSONB,
  rejection_reason TEXT,
  notes TEXT,
  
  -- Timestamps
  submitted_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT ai_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  CONSTRAINT ai_method_check CHECK (verification_method IN ('income', 'net_worth', 'professional', 'entity'))
);

CREATE INDEX idx_ai_user_id ON accredited_investor_verifications(user_id);
CREATE INDEX idx_ai_status ON accredited_investor_verifications(status);
CREATE INDEX idx_ai_verification_id ON accredited_investor_verifications(verification_id);
CREATE INDEX idx_ai_expires_at ON accredited_investor_verifications(expires_at);

-- W-9 Forms (Tax Information)
CREATE TABLE IF NOT EXISTS w9_forms (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Taxpayer information
  taxpayer_name VARCHAR(255) NOT NULL,
  business_name VARCHAR(255),
  tax_classification VARCHAR(50) NOT NULL, -- individual, c_corp, s_corp, partnership, trust, llc, other
  llc_tax_classification VARCHAR(50), -- c, s, p (for LLCs)
  other_classification VARCHAR(255),
  
  -- Exemptions
  exempt_payee_code VARCHAR(10),
  fatca_exemption_code VARCHAR(10),
  
  -- Address
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city VARCHAR(255) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(20) NOT NULL,
  
  -- Tax ID (encrypted)
  ssn_ein_encrypted TEXT NOT NULL, -- Encrypted SSN or EIN
  tax_id_type VARCHAR(10) NOT NULL, -- ssn, ein
  
  -- Signature
  signature_data TEXT NOT NULL, -- Base64 encoded signature image
  signature_ip_address INET,
  signature_user_agent TEXT,
  signed_at TIMESTAMP NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, expired, superseded
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT w9_tax_classification_check CHECK (tax_classification IN ('individual', 'c_corp', 's_corp', 'partnership', 'trust', 'llc', 'other')),
  CONSTRAINT w9_tax_id_type_check CHECK (tax_id_type IN ('ssn', 'ein')),
  CONSTRAINT w9_status_check CHECK (status IN ('active', 'expired', 'superseded'))
);

CREATE INDEX idx_w9_user_id ON w9_forms(user_id);
CREATE INDEX idx_w9_status ON w9_forms(status);
CREATE UNIQUE INDEX idx_w9_active_user ON w9_forms(user_id) WHERE status = 'active';

-- Tax Documents (1099 Forms)
CREATE TABLE IF NOT EXISTS tax_documents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  form_type VARCHAR(20) NOT NULL, -- 1099_misc, 1099_b, 1099_int, 1099_div
  
  -- Amounts
  total_amount DECIMAL(18, 2) NOT NULL,
  
  -- Form data
  form_data JSONB NOT NULL, -- All box values
  
  -- Filing information
  status VARCHAR(50) DEFAULT 'draft', -- draft, generated, sent_to_user, filed_with_irs, corrected
  correction_of INTEGER REFERENCES tax_documents(id),
  
  -- File URLs
  pdf_url TEXT,
  xml_url TEXT,
  
  -- Timestamps
  generated_at TIMESTAMP,
  sent_to_user_at TIMESTAMP,
  filed_with_irs_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT tax_form_type_check CHECK (form_type IN ('1099_misc', '1099_b', '1099_int', '1099_div')),
  CONSTRAINT tax_status_check CHECK (status IN ('draft', 'generated', 'sent_to_user', 'filed_with_irs', 'corrected'))
);

CREATE INDEX idx_tax_user_id ON tax_documents(user_id);
CREATE INDEX idx_tax_year ON tax_documents(tax_year);
CREATE INDEX idx_tax_form_type ON tax_documents(form_type);
CREATE INDEX idx_tax_status ON tax_documents(status);
CREATE UNIQUE INDEX idx_tax_user_year_type ON tax_documents(user_id, tax_year, form_type) WHERE correction_of IS NULL;

-- Terms of Service Acceptance
CREATE TABLE IF NOT EXISTS terms_acceptances (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  terms_type VARCHAR(50) NOT NULL, -- terms_of_service, privacy_policy, risk_disclosure, investment_agreement
  terms_version VARCHAR(50) NOT NULL,
  
  -- Acceptance details
  accepted BOOLEAN NOT NULL DEFAULT true,
  ip_address INET NOT NULL,
  user_agent TEXT,
  
  -- Timestamps
  accepted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_terms_user_id ON terms_acceptances(user_id);
CREATE INDEX idx_terms_type ON terms_acceptances(terms_type);
CREATE INDEX idx_terms_accepted_at ON terms_acceptances(accepted_at);

-- Privacy Requests (GDPR/CCPA)
CREATE TABLE IF NOT EXISTS privacy_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL, -- data_access, data_deletion, data_portability, opt_out_sale
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, rejected
  
  -- Request details
  request_reason TEXT,
  
  -- Response
  response_notes TEXT,
  data_package_url TEXT,
  
  -- Timestamps
  requested_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT privacy_request_type_check CHECK (request_type IN ('data_access', 'data_deletion', 'data_portability', 'opt_out_sale')),
  CONSTRAINT privacy_status_check CHECK (status IN ('pending', 'processing', 'completed', 'rejected'))
);

CREATE INDEX idx_privacy_user_id ON privacy_requests(user_id);
CREATE INDEX idx_privacy_status ON privacy_requests(status);
CREATE INDEX idx_privacy_requested_at ON privacy_requests(requested_at);

-- Suspicious Activity Reports (SAR)
CREATE TABLE IF NOT EXISTS suspicious_activity_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Activity details
  activity_type VARCHAR(100) NOT NULL, -- unusual_transaction, wash_trading, layering, structuring, other
  description TEXT NOT NULL,
  
  -- Evidence
  evidence JSONB,
  related_transactions JSONB,
  related_users JSONB,
  
  -- Risk assessment
  risk_score INTEGER NOT NULL, -- 0-100
  severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, under_review, filed, dismissed
  
  -- Filing information
  filed_with VARCHAR(50), -- fincen, sec, finra, other
  filing_reference VARCHAR(255),
  filed_at TIMESTAMP,
  
  -- Investigation
  investigator_id INTEGER REFERENCES users(id),
  investigation_notes TEXT,
  
  -- Timestamps
  detected_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT sar_severity_check CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT sar_status_check CHECK (status IN ('pending', 'under_review', 'filed', 'dismissed'))
);

CREATE INDEX idx_sar_user_id ON suspicious_activity_reports(user_id);
CREATE INDEX idx_sar_status ON suspicious_activity_reports(status);
CREATE INDEX idx_sar_severity ON suspicious_activity_reports(severity);
CREATE INDEX idx_sar_detected_at ON suspicious_activity_reports(detected_at);

-- User Activity Log (for compliance auditing)
CREATE TABLE IF NOT EXISTS user_activity_log (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Activity details
  action VARCHAR(100) NOT NULL, -- login, logout, bond_purchase, bid_placed, withdrawal, etc.
  resource_type VARCHAR(50),
  resource_id INTEGER,
  
  -- Request details
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(100),
  
  -- Metadata
  metadata JSONB,
  
  -- Result
  success BOOLEAN NOT NULL,
  error_message TEXT,
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_user_id ON user_activity_log(user_id);
CREATE INDEX idx_activity_action ON user_activity_log(action);
CREATE INDEX idx_activity_created_at ON user_activity_log(created_at);
CREATE INDEX idx_activity_ip_address ON user_activity_log(ip_address);

-- Add compliance fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accredited_investor_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accredited_investor_verified_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accredited_investor_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS w9_submitted BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS w9_submitted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'medium';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_kyc_updated_at BEFORE UPDATE ON kyc_verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_updated_at BEFORE UPDATE ON accredited_investor_verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_w9_updated_at BEFORE UPDATE ON w9_forms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tax_updated_at BEFORE UPDATE ON tax_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_privacy_updated_at BEFORE UPDATE ON privacy_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sar_updated_at BEFORE UPDATE ON suspicious_activity_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE kyc_verifications IS 'KYC/AML verification records for regulatory compliance';
COMMENT ON TABLE accredited_investor_verifications IS 'Accredited investor verification records per SEC Regulation D';
COMMENT ON TABLE w9_forms IS 'W-9 tax forms for IRS reporting';
COMMENT ON TABLE tax_documents IS '1099 tax forms generated annually';
COMMENT ON TABLE terms_acceptances IS 'User acceptance of terms, privacy policy, and disclosures';
COMMENT ON TABLE privacy_requests IS 'GDPR/CCPA data access and deletion requests';
COMMENT ON TABLE suspicious_activity_reports IS 'Suspicious activity reports for FinCEN/SEC';
COMMENT ON TABLE user_activity_log IS 'Comprehensive user activity log for compliance auditing';
