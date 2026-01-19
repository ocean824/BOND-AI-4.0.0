import { db } from '../db';

/**
 * Terms of Service and Compliance Acceptance Service
 * 
 * Manages user acceptance of:
 * - Terms of Service
 * - Privacy Policy
 * - Risk Disclosure
 * - Investment Agreement
 * - Cookie Policy
 * 
 * Tracks versions and requires re-acceptance when terms change.
 */

export type TermsType = 
  | 'terms_of_service'
  | 'privacy_policy'
  | 'risk_disclosure'
  | 'investment_agreement'
  | 'cookie_policy';

export interface TermsVersion {
  type: TermsType;
  version: string;
  effectiveDate: Date;
  content: string;
  requiresReacceptance: boolean;
}

export class TermsService {
  // Current versions of all terms
  private static readonly CURRENT_VERSIONS: Record<TermsType, string> = {
    terms_of_service: '1.0.0',
    privacy_policy: '1.0.0',
    risk_disclosure: '1.0.0',
    investment_agreement: '1.0.0',
    cookie_policy: '1.0.0',
  };

  /**
   * Record user acceptance of terms
   */
  async acceptTerms(
    userId: number,
    termsType: TermsType,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const version = TermsService.CURRENT_VERSIONS[termsType];

    await db.execute(`
      INSERT INTO terms_acceptances (
        user_id, terms_type, terms_version, accepted, ip_address, user_agent
      ) VALUES (
        $1, $2, $3, true, $4, $5
      )
    `, [userId, termsType, version, ipAddress, userAgent]);

    // Update user record if accepting main terms
    if (termsType === 'terms_of_service') {
      await db.execute(`
        UPDATE users
        SET terms_accepted = true, terms_accepted_at = NOW()
        WHERE id = $1
      `, [userId]);
    }
  }

  /**
   * Accept all required terms at once (during registration)
   */
  async acceptAllRequiredTerms(
    userId: number,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const requiredTerms: TermsType[] = [
      'terms_of_service',
      'privacy_policy',
      'risk_disclosure',
    ];

    for (const termsType of requiredTerms) {
      await this.acceptTerms(userId, termsType, ipAddress, userAgent);
    }
  }

  /**
   * Check if user has accepted specific terms
   */
  async hasAcceptedTerms(userId: number, termsType: TermsType): Promise<boolean> {
    const currentVersion = TermsService.CURRENT_VERSIONS[termsType];

    const result = await db.execute(`
      SELECT id FROM terms_acceptances
      WHERE user_id = $1
        AND terms_type = $2
        AND terms_version = $3
        AND accepted = true
      LIMIT 1
    `, [userId, termsType, currentVersion]);

    return result.rows.length > 0;
  }

  /**
   * Check if user has accepted all required terms
   */
  async hasAcceptedAllRequiredTerms(userId: number): Promise<boolean> {
    const requiredTerms: TermsType[] = [
      'terms_of_service',
      'privacy_policy',
      'risk_disclosure',
    ];

    for (const termsType of requiredTerms) {
      const accepted = await this.hasAcceptedTerms(userId, termsType);
      if (!accepted) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get terms that user needs to accept
   */
  async getTermsToAccept(userId: number): Promise<TermsType[]> {
    const allTerms: TermsType[] = [
      'terms_of_service',
      'privacy_policy',
      'risk_disclosure',
      'investment_agreement',
      'cookie_policy',
    ];

    const termsToAccept: TermsType[] = [];

    for (const termsType of allTerms) {
      const accepted = await this.hasAcceptedTerms(userId, termsType);
      if (!accepted) {
        termsToAccept.push(termsType);
      }
    }

    return termsToAccept;
  }

  /**
   * Get user's acceptance history
   */
  async getAcceptanceHistory(userId: number): Promise<any[]> {
    const result = await db.execute(`
      SELECT * FROM terms_acceptances
      WHERE user_id = $1
      ORDER BY accepted_at DESC
    `, [userId]);

    return result.rows;
  }

  /**
   * Get current version of terms
   */
  getCurrentVersion(termsType: TermsType): string {
    return TermsService.CURRENT_VERSIONS[termsType];
  }

  /**
   * Get all current versions
   */
  getAllCurrentVersions(): Record<TermsType, string> {
    return { ...TermsService.CURRENT_VERSIONS };
  }

  /**
   * Invalidate old acceptances when terms change
   * (Call this when you update terms and require re-acceptance)
   */
  async invalidateOldAcceptances(termsType: TermsType, newVersion: string): Promise<void> {
    // This is an admin function
    // In production, you'd update CURRENT_VERSIONS and notify users
    console.log(`Terms ${termsType} updated to version ${newVersion}`);
    console.log('Users will need to re-accept on next login');
  }
}

// Singleton instance
export const termsService = new TermsService();

/**
 * Middleware to require terms acceptance
 */
export async function requireTermsAcceptance(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const userId = req.user.id;

  // Check if user has accepted all required terms
  const hasAccepted = await termsService.hasAcceptedAllRequiredTerms(userId);

  if (!hasAccepted) {
    const termsToAccept = await termsService.getTermsToAccept(userId);
    return res.status(403).json({
      error: 'Terms acceptance required',
      termsToAccept,
      message: 'You must accept the terms of service, privacy policy, and risk disclosure to continue',
    });
  }

  next();
}

/**
 * Middleware to require specific terms acceptance
 */
export function requireSpecificTerms(termsType: TermsType) {
  return async (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.user.id;
    const hasAccepted = await termsService.hasAcceptedTerms(userId, termsType);

    if (!hasAccepted) {
      return res.status(403).json({
        error: `${termsType} acceptance required`,
        termsType,
        currentVersion: termsService.getCurrentVersion(termsType),
        message: `You must accept the ${termsType.replace(/_/g, ' ')} to continue`,
      });
    }

    next();
  };
}
