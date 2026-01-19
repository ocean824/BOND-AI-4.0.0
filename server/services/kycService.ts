import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * KYC/AML Service
 * 
 * Integrates with third-party KYC providers:
 * - Persona (https://withpersona.com)
 * - Onfido (https://onfido.com)
 * - Jumio (https://www.jumio.com)
 * - Sumsub (https://sumsub.com)
 * 
 * To activate: Set environment variables for your chosen provider
 */

export interface KYCVerificationData {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  nationality: string; // ISO 3166-1 alpha-3
  countryOfResidence: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  documentType: 'passport' | 'drivers_license' | 'national_id';
  documentNumber: string;
  documentExpiry: string; // YYYY-MM-DD
}

export class KYCService {
  private provider: string;
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    // Determine provider from environment
    this.provider = process.env.KYC_PROVIDER || 'persona';
    this.apiKey = process.env.KYC_API_KEY || '';
    
    // Set API URL based on provider
    switch (this.provider) {
      case 'persona':
        this.apiUrl = 'https://withpersona.com/api/v1';
        break;
      case 'onfido':
        this.apiUrl = 'https://api.onfido.com/v3';
        break;
      case 'jumio':
        this.apiUrl = 'https://api.jumio.com';
        break;
      case 'sumsub':
        this.apiUrl = 'https://api.sumsub.com';
        break;
      default:
        this.apiUrl = '';
    }
  }

  /**
   * Start KYC verification
   */
  async startVerification(userId: number, data: KYCVerificationData): Promise<{
    verificationId: string;
    verificationUrl?: string;
    status: string;
  }> {
    // If no API key, create mock verification
    if (!this.apiKey) {
      return this.createMockVerification(userId, data);
    }

    // Call provider API based on provider type
    switch (this.provider) {
      case 'persona':
        return await this.startPersonaVerification(userId, data);
      case 'onfido':
        return await this.startOnfidoVerification(userId, data);
      case 'jumio':
        return await this.startJumioVerification(userId, data);
      case 'sumsub':
        return await this.startSumsubVerification(userId, data);
      default:
        throw new Error(`Unsupported KYC provider: ${this.provider}`);
    }
  }

  /**
   * Persona integration
   */
  private async startPersonaVerification(userId: number, data: KYCVerificationData) {
    const response = await fetch(`${this.apiUrl}/inquiries`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Persona-Version': '2023-01-05',
      },
      body: JSON.stringify({
        data: {
          type: 'inquiry',
          attributes: {
            'inquiry-template-id': process.env.PERSONA_TEMPLATE_ID,
            'reference-id': userId.toString(),
            'name-first': data.firstName,
            'name-middle': data.middleName,
            'name-last': data.lastName,
            'birthdate': data.dateOfBirth,
            'address-street-1': data.addressLine1,
            'address-street-2': data.addressLine2,
            'address-city': data.city,
            'address-subdivision': data.stateProvince,
            'address-postal-code': data.postalCode,
          },
        },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Persona API error: ${result.errors?.[0]?.title || 'Unknown error'}`);
    }

    // Store verification in database
    await this.storeVerification(userId, {
      provider: 'persona',
      verificationId: result.data.id,
      status: 'pending',
      ...data,
    });

    return {
      verificationId: result.data.id,
      verificationUrl: result.data.attributes['session-url'],
      status: 'pending',
    };
  }

  /**
   * Onfido integration
   */
  private async startOnfidoVerification(userId: number, data: KYCVerificationData) {
    // Create applicant
    const applicantResponse = await fetch(`${this.apiUrl}/applicants`, {
      method: 'POST',
      headers: {
        'Authorization': `Token token=${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: data.firstName,
        last_name: data.lastName,
        dob: data.dateOfBirth,
        address: {
          line1: data.addressLine1,
          line2: data.addressLine2,
          town: data.city,
          state: data.stateProvince,
          postcode: data.postalCode,
          country: data.countryOfResidence,
        },
      }),
    });

    const applicant = await applicantResponse.json();

    if (!applicantResponse.ok) {
      throw new Error(`Onfido API error: ${applicant.error?.message || 'Unknown error'}`);
    }

    // Create check
    const checkResponse = await fetch(`${this.apiUrl}/checks`, {
      method: 'POST',
      headers: {
        'Authorization': `Token token=${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        applicant_id: applicant.id,
        report_names: ['identity_enhanced', 'document', 'watchlist_enhanced'],
      }),
    });

    const check = await checkResponse.json();

    // Store verification
    await this.storeVerification(userId, {
      provider: 'onfido',
      verificationId: check.id,
      status: 'pending',
      ...data,
    });

    return {
      verificationId: check.id,
      status: 'pending',
    };
  }

  /**
   * Jumio integration (placeholder)
   */
  private async startJumioVerification(userId: number, data: KYCVerificationData) {
    // Jumio implementation
    throw new Error('Jumio integration not yet implemented');
  }

  /**
   * Sumsub integration (placeholder)
   */
  private async startSumsubVerification(userId: number, data: KYCVerificationData) {
    // Sumsub implementation
    throw new Error('Sumsub integration not yet implemented');
  }

  /**
   * Create mock verification (for testing without API key)
   */
  private async createMockVerification(userId: number, data: KYCVerificationData) {
    const verificationId = `mock_${crypto.randomBytes(16).toString('hex')}`;

    await this.storeVerification(userId, {
      provider: 'mock',
      verificationId,
      status: 'pending',
      ...data,
    });

    return {
      verificationId,
      verificationUrl: `/kyc/verify/${verificationId}`,
      status: 'pending',
    };
  }

  /**
   * Store verification in database
   */
  private async storeVerification(userId: number, data: any) {
    await db.execute(`
      INSERT INTO kyc_verifications (
        user_id, provider, verification_id, status,
        first_name, middle_name, last_name, date_of_birth,
        nationality, country_of_residence,
        address_line1, address_line2, city, state_province, postal_code,
        document_type, document_number, document_expiry
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      )
    `, [
      userId, data.provider, data.verificationId, data.status,
      data.firstName, data.middleName, data.lastName, data.dateOfBirth,
      data.nationality, data.countryOfResidence,
      data.addressLine1, data.addressLine2, data.city, data.stateProvince, data.postalCode,
      data.documentType, data.documentNumber, data.documentExpiry,
    ]);
  }

  /**
   * Handle webhook from KYC provider
   */
  async handleWebhook(provider: string, payload: any): Promise<void> {
    switch (provider) {
      case 'persona':
        await this.handlePersonaWebhook(payload);
        break;
      case 'onfido':
        await this.handleOnfidoWebhook(payload);
        break;
      default:
        console.warn(`Unknown KYC provider webhook: ${provider}`);
    }
  }

  /**
   * Handle Persona webhook
   */
  private async handlePersonaWebhook(payload: any) {
    const { data } = payload;
    const verificationId = data.id;
    const status = data.attributes.status;

    // Map Persona status to our status
    let ourStatus = 'pending';
    if (status === 'completed') {
      ourStatus = 'approved';
    } else if (status === 'failed' || status === 'declined') {
      ourStatus = 'rejected';
    }

    // Update verification
    await db.execute(`
      UPDATE kyc_verifications
      SET status = $1,
          identity_verified = $2,
          pep_check_result = $3,
          sanctions_check_result = $4,
          risk_level = $5,
          verified_at = NOW(),
          verification_data = $6
      WHERE verification_id = $7
    `, [
      ourStatus,
      data.attributes['identity-verified'] || false,
      data.attributes['pep-check'] || 'not_checked',
      data.attributes['sanctions-check'] || 'not_checked',
      data.attributes['risk-level'] || 'medium',
      JSON.stringify(data),
      verificationId,
    ]);

    // Update user record if approved
    if (ourStatus === 'approved') {
      const verification = await db.execute(`
        SELECT user_id FROM kyc_verifications WHERE verification_id = $1
      `, [verificationId]);

      if (verification.rows.length > 0) {
        const userId = verification.rows[0].user_id;
        await db.update(users)
          .set({
            kycVerified: true,
            kycVerifiedAt: new Date(),
            kycExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          })
          .where(eq(users.id, userId));
      }
    }
  }

  /**
   * Handle Onfido webhook
   */
  private async handleOnfidoWebhook(payload: any) {
    const { resource_type, action, object } = payload;

    if (resource_type === 'check' && action === 'check.completed') {
      const verificationId = object.id;
      const result = object.result;

      let ourStatus = 'pending';
      if (result === 'clear') {
        ourStatus = 'approved';
      } else if (result === 'consider') {
        ourStatus = 'under_review';
      } else {
        ourStatus = 'rejected';
      }

      await db.execute(`
        UPDATE kyc_verifications
        SET status = $1,
            verified_at = NOW(),
            verification_data = $2
        WHERE verification_id = $3
      `, [ourStatus, JSON.stringify(object), verificationId]);

      // Update user if approved
      if (ourStatus === 'approved') {
        const verification = await db.execute(`
          SELECT user_id FROM kyc_verifications WHERE verification_id = $1
        `, [verificationId]);

        if (verification.rows.length > 0) {
          const userId = verification.rows[0].user_id;
          await db.update(users)
            .set({
              kycVerified: true,
              kycVerifiedAt: new Date(),
              kycExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            })
            .where(eq(users.id, userId));
        }
      }
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(userId: number): Promise<any> {
    const result = await db.execute(`
      SELECT * FROM kyc_verifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

    return result.rows[0] || null;
  }

  /**
   * Check if user is KYC verified
   */
  async isVerified(userId: number): Promise<boolean> {
    const result = await db.execute(`
      SELECT kyc_verified, kyc_expires_at FROM users WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return false;
    }

    const user = result.rows[0];
    if (!user.kyc_verified) {
      return false;
    }

    // Check if expired
    if (user.kyc_expires_at && new Date(user.kyc_expires_at) < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Perform PEP check (Politically Exposed Person)
   */
  async performPEPCheck(name: string, dateOfBirth: string): Promise<{
    result: 'clear' | 'match';
    details?: any;
  }> {
    // In production, call a PEP screening service
    // For now, return mock result
    return {
      result: 'clear',
    };
  }

  /**
   * Perform sanctions check (OFAC, UN, EU, etc.)
   */
  async performSanctionsCheck(name: string, dateOfBirth: string, nationality: string): Promise<{
    result: 'clear' | 'match';
    details?: any;
  }> {
    // In production, call OFAC/sanctions screening service
    // For now, return mock result
    return {
      result: 'clear',
    };
  }

  /**
   * Perform adverse media check
   */
  async performAdverseMediaCheck(name: string): Promise<{
    result: 'clear' | 'match';
    details?: any;
  }> {
    // In production, call adverse media screening service
    // For now, return mock result
    return {
      result: 'clear',
    };
  }

  /**
   * Calculate risk score
   */
  async calculateRiskScore(userId: number): Promise<number> {
    // Get user data
    const verification = await this.getVerificationStatus(userId);
    if (!verification) {
      return 50; // Medium risk by default
    }

    let riskScore = 0;

    // PEP check
    if (verification.pep_check_result === 'match') {
      riskScore += 30;
    }

    // Sanctions check
    if (verification.sanctions_check_result === 'match') {
      riskScore += 40;
    }

    // Adverse media
    if (verification.adverse_media_check_result === 'match') {
      riskScore += 20;
    }

    // High-risk countries
    const highRiskCountries = ['KP', 'IRN', 'SYR', 'CUB', 'SDN'];
    if (highRiskCountries.includes(verification.country_of_residence)) {
      riskScore += 25;
    }

    return Math.min(riskScore, 100);
  }
}

// Singleton instance
export const kycService = new KYCService();
