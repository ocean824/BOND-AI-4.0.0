import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Accredited Investor Verification Service
 * 
 * Integrates with third-party accredited investor verification providers:
 * - Parallel Markets (https://parallelmarkets.com) - Recommended
 * - VerifyInvestor (https://verifyinvestor.com)
 * - North Capital (https://northcapital.com)
 * 
 * Per SEC Regulation D, accredited investors are:
 * - Individuals with income >$200k (or $300k joint) for past 2 years
 * - Individuals with net worth >$1M (excluding primary residence)
 * - Holders of Series 7, 65, or 82 licenses
 * - Entities with assets >$5M
 * 
 * To activate: Set environment variables for your chosen provider
 */

export interface AccreditedInvestorVerificationData {
  method: 'income' | 'net_worth' | 'professional' | 'entity';
  
  // Income verification
  incomeAmount?: number;
  incomeYear?: number;
  incomeDocuments?: string[]; // URLs to uploaded documents
  
  // Net worth verification
  netWorthAmount?: number;
  netWorthDate?: string;
  netWorthDocuments?: string[];
  
  // Professional certification
  professionalCertification?: 'series_7' | 'series_65' | 'series_82' | 'cpa' | 'attorney';
  certificationNumber?: string;
  certificationDocuments?: string[];
  
  // Entity verification
  entityName?: string;
  entityType?: 'corporation' | 'llc' | 'trust' | 'partnership';
  entityDocuments?: string[];
}

export class AccreditedInvestorService {
  private provider: string;
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.provider = process.env.AI_PROVIDER || 'parallel_markets';
    this.apiKey = process.env.AI_API_KEY || '';
    
    switch (this.provider) {
      case 'parallel_markets':
        this.apiUrl = 'https://api.parallelmarkets.com/v1';
        break;
      case 'verifyinvestor':
        this.apiUrl = 'https://api.verifyinvestor.com/v1';
        break;
      case 'north_capital':
        this.apiUrl = 'https://api.northcapital.com/v1';
        break;
      default:
        this.apiUrl = '';
    }
  }

  /**
   * Start accredited investor verification
   */
  async startVerification(
    userId: number,
    data: AccreditedInvestorVerificationData
  ): Promise<{
    verificationId: string;
    verificationUrl?: string;
    status: string;
  }> {
    // Validate data based on method
    this.validateVerificationData(data);

    // If no API key, create mock verification
    if (!this.apiKey) {
      return this.createMockVerification(userId, data);
    }

    // Call provider API
    switch (this.provider) {
      case 'parallel_markets':
        return await this.startParallelMarketsVerification(userId, data);
      case 'verifyinvestor':
        return await this.startVerifyInvestorVerification(userId, data);
      case 'north_capital':
        return await this.startNorthCapitalVerification(userId, data);
      default:
        throw new Error(`Unsupported AI provider: ${this.provider}`);
    }
  }

  /**
   * Validate verification data
   */
  private validateVerificationData(data: AccreditedInvestorVerificationData): void {
    switch (data.method) {
      case 'income':
        if (!data.incomeAmount || !data.incomeYear) {
          throw new Error('Income amount and year are required for income verification');
        }
        if (data.incomeAmount < 200000) {
          throw new Error('Income must be at least $200,000 for individual accreditation');
        }
        break;
        
      case 'net_worth':
        if (!data.netWorthAmount) {
          throw new Error('Net worth amount is required for net worth verification');
        }
        if (data.netWorthAmount < 1000000) {
          throw new Error('Net worth must be at least $1,000,000 (excluding primary residence)');
        }
        break;
        
      case 'professional':
        if (!data.professionalCertification || !data.certificationNumber) {
          throw new Error('Professional certification and number are required');
        }
        break;
        
      case 'entity':
        if (!data.entityName || !data.entityType) {
          throw new Error('Entity name and type are required for entity verification');
        }
        break;
    }
  }

  /**
   * Parallel Markets integration
   */
  private async startParallelMarketsVerification(
    userId: number,
    data: AccreditedInvestorVerificationData
  ) {
    const response = await fetch(`${this.apiUrl}/verifications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId.toString(),
        verification_type: data.method,
        ...this.formatParallelMarketsData(data),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Parallel Markets API error: ${result.error || 'Unknown error'}`);
    }

    // Store verification
    await this.storeVerification(userId, {
      provider: 'parallel_markets',
      verificationId: result.id,
      status: 'pending',
      ...data,
    });

    return {
      verificationId: result.id,
      verificationUrl: result.verification_url,
      status: 'pending',
    };
  }

  /**
   * Format data for Parallel Markets
   */
  private formatParallelMarketsData(data: AccreditedInvestorVerificationData): any {
    const formatted: any = {};

    if (data.method === 'income') {
      formatted.income_amount = data.incomeAmount;
      formatted.income_year = data.incomeYear;
      formatted.income_documents = data.incomeDocuments;
    } else if (data.method === 'net_worth') {
      formatted.net_worth_amount = data.netWorthAmount;
      formatted.net_worth_date = data.netWorthDate;
      formatted.net_worth_documents = data.netWorthDocuments;
    } else if (data.method === 'professional') {
      formatted.certification_type = data.professionalCertification;
      formatted.certification_number = data.certificationNumber;
      formatted.certification_documents = data.certificationDocuments;
    } else if (data.method === 'entity') {
      formatted.entity_name = data.entityName;
      formatted.entity_type = data.entityType;
      formatted.entity_documents = data.entityDocuments;
    }

    return formatted;
  }

  /**
   * VerifyInvestor integration (placeholder)
   */
  private async startVerifyInvestorVerification(
    userId: number,
    data: AccreditedInvestorVerificationData
  ) {
    throw new Error('VerifyInvestor integration not yet implemented');
  }

  /**
   * North Capital integration (placeholder)
   */
  private async startNorthCapitalVerification(
    userId: number,
    data: AccreditedInvestorVerificationData
  ) {
    throw new Error('North Capital integration not yet implemented');
  }

  /**
   * Create mock verification (for testing)
   */
  private async createMockVerification(
    userId: number,
    data: AccreditedInvestorVerificationData
  ) {
    const verificationId = `mock_ai_${crypto.randomBytes(16).toString('hex')}`;

    await this.storeVerification(userId, {
      provider: 'mock',
      verificationId,
      status: 'pending',
      ...data,
    });

    return {
      verificationId,
      verificationUrl: `/accredited-investor/verify/${verificationId}`,
      status: 'pending',
    };
  }

  /**
   * Store verification in database
   */
  private async storeVerification(userId: number, data: any) {
    await db.execute(`
      INSERT INTO accredited_investor_verifications (
        user_id, provider, verification_id, status, verification_method,
        income_amount, income_year, income_documents,
        net_worth_amount, net_worth_date, net_worth_documents,
        professional_certification, certification_number, certification_documents,
        entity_name, entity_type, entity_documents
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )
    `, [
      userId, data.provider, data.verificationId, data.status, data.method,
      data.incomeAmount, data.incomeYear, JSON.stringify(data.incomeDocuments),
      data.netWorthAmount, data.netWorthDate, JSON.stringify(data.netWorthDocuments),
      data.professionalCertification, data.certificationNumber, JSON.stringify(data.certificationDocuments),
      data.entityName, data.entityType, JSON.stringify(data.entityDocuments),
    ]);
  }

  /**
   * Handle webhook from provider
   */
  async handleWebhook(provider: string, payload: any): Promise<void> {
    switch (provider) {
      case 'parallel_markets':
        await this.handleParallelMarketsWebhook(payload);
        break;
      default:
        console.warn(`Unknown AI provider webhook: ${provider}`);
    }
  }

  /**
   * Handle Parallel Markets webhook
   */
  private async handleParallelMarketsWebhook(payload: any) {
    const { verification_id, status, result } = payload;

    // Map provider status to our status
    let ourStatus = 'pending';
    if (status === 'completed' && result === 'accredited') {
      ourStatus = 'approved';
    } else if (status === 'completed' && result === 'not_accredited') {
      ourStatus = 'rejected';
    }

    // Update verification
    await db.execute(`
      UPDATE accredited_investor_verifications
      SET status = $1,
          verified_at = NOW(),
          verification_data = $2
      WHERE verification_id = $3
    `, [ourStatus, JSON.stringify(payload), verification_id]);

    // Update user if approved
    if (ourStatus === 'approved') {
      const verification = await db.execute(`
        SELECT user_id FROM accredited_investor_verifications WHERE verification_id = $1
      `, [verification_id]);

      if (verification.rows.length > 0) {
        const userId = verification.rows[0].user_id;
        await db.update(users)
          .set({
            accreditedInvestorVerified: true,
            accreditedInvestorVerifiedAt: new Date(),
            accreditedInvestorExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          })
          .where(eq(users.id, userId));
      }
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(userId: number): Promise<any> {
    const result = await db.execute(`
      SELECT * FROM accredited_investor_verifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

    return result.rows[0] || null;
  }

  /**
   * Check if user is accredited investor
   */
  async isAccredited(userId: number): Promise<boolean> {
    const result = await db.execute(`
      SELECT accredited_investor_verified, accredited_investor_expires_at
      FROM users WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return false;
    }

    const user = result.rows[0];
    if (!user.accredited_investor_verified) {
      return false;
    }

    // Check if expired
    if (user.accredited_investor_expires_at && 
        new Date(user.accredited_investor_expires_at) < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Manually approve verification (for admin use)
   */
  async manuallyApprove(verificationId: string, adminUserId: number): Promise<void> {
    // Get verification
    const result = await db.execute(`
      SELECT user_id FROM accredited_investor_verifications WHERE verification_id = $1
    `, [verificationId]);

    if (result.rows.length === 0) {
      throw new Error('Verification not found');
    }

    const userId = result.rows[0].user_id;

    // Update verification
    await db.execute(`
      UPDATE accredited_investor_verifications
      SET status = 'approved',
          verified_at = NOW(),
          notes = CONCAT(COALESCE(notes, ''), '\nManually approved by admin user ', $1)
      WHERE verification_id = $2
    `, [adminUserId, verificationId]);

    // Update user
    await db.update(users)
      .set({
        accreditedInvestorVerified: true,
        accreditedInvestorVerifiedAt: new Date(),
        accreditedInvestorExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      })
      .where(eq(users.id, userId));
  }

  /**
   * Manually reject verification (for admin use)
   */
  async manuallyReject(
    verificationId: string,
    adminUserId: number,
    reason: string
  ): Promise<void> {
    await db.execute(`
      UPDATE accredited_investor_verifications
      SET status = 'rejected',
          rejection_reason = $1,
          notes = CONCAT(COALESCE(notes, ''), '\nManually rejected by admin user ', $2)
      WHERE verification_id = $3
    `, [reason, adminUserId, verificationId]);
  }

  /**
   * Get investment limits based on accreditation status
   */
  async getInvestmentLimits(userId: number): Promise<{
    isAccredited: boolean;
    maxInvestmentPerOffering: number | null;
    maxAnnualInvestment: number | null;
    requiresAccreditation: boolean;
  }> {
    const isAccredited = await this.isAccredited(userId);

    if (isAccredited) {
      // Accredited investors have no limits under Reg D
      return {
        isAccredited: true,
        maxInvestmentPerOffering: null,
        maxAnnualInvestment: null,
        requiresAccreditation: false,
      };
    } else {
      // Non-accredited investors have limits under Reg CF
      // Limits based on annual income and net worth
      return {
        isAccredited: false,
        maxInvestmentPerOffering: 2200, // Reg CF limit for income <$124k
        maxAnnualInvestment: 2200,
        requiresAccreditation: true, // For offerings >$107k
      };
    }
  }
}

// Singleton instance
export const accreditedInvestorService = new AccreditedInvestorService();
