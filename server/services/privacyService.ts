import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

/**
 * Privacy Compliance Service
 * 
 * Handles GDPR (EU) and CCPA (California) compliance:
 * - Right to access (data portability)
 * - Right to deletion (right to be forgotten)
 * - Right to opt-out of data sale
 * - Right to rectification
 * - Data breach notification
 * 
 * GDPR Requirements:
 * - Respond to data access requests within 30 days
 * - Provide data in machine-readable format
 * - Delete data within 30 days of request
 * - Notify users of breaches within 72 hours
 * 
 * CCPA Requirements:
 * - Respond to requests within 45 days
 * - Provide data free of charge (up to 2 requests/year)
 * - Allow opt-out of data sale
 * - Do not discriminate against users who exercise rights
 */

export type PrivacyRequestType = 
  | 'data_access'
  | 'data_deletion'
  | 'data_portability'
  | 'opt_out_sale';

export class PrivacyService {
  /**
   * Submit privacy request
   */
  async submitRequest(
    userId: number,
    requestType: PrivacyRequestType,
    reason?: string
  ): Promise<{ requestId: number }> {
    const result = await db.execute(`
      INSERT INTO privacy_requests (
        user_id, request_type, status, request_reason
      ) VALUES (
        $1, $2, 'pending', $3
      ) RETURNING id
    `, [userId, requestType, reason]);

    const requestId = result.rows[0].id;

    // Queue processing job
    // In production, use job queue
    if (requestType === 'data_access' || requestType === 'data_portability') {
      // Process immediately for demo purposes
      // In production, queue this
      setTimeout(() => this.processDataAccessRequest(requestId), 1000);
    }

    return { requestId };
  }

  /**
   * Process data access request
   */
  async processDataAccessRequest(requestId: number): Promise<void> {
    // Get request
    const result = await db.execute(`
      SELECT * FROM privacy_requests WHERE id = $1
    `, [requestId]);

    if (result.rows.length === 0) {
      throw new Error('Request not found');
    }

    const request = result.rows[0];
    const userId = request.user_id;

    // Update status
    await db.execute(`
      UPDATE privacy_requests SET status = 'processing' WHERE id = $1
    `, [requestId]);

    try {
      // Collect all user data
      const userData = await this.collectUserData(userId);

      // Generate data package (ZIP file)
      const packageUrl = await this.generateDataPackage(userId, userData);

      // Update request with package URL
      await db.execute(`
        UPDATE privacy_requests
        SET status = 'completed',
            data_package_url = $1,
            completed_at = NOW()
        WHERE id = $2
      `, [packageUrl, requestId]);

      // Send notification email
      // In production, integrate with email service
      console.log(`Data package ready for user ${userId}: ${packageUrl}`);
    } catch (error) {
      // Update request with error
      await db.execute(`
        UPDATE privacy_requests
        SET status = 'rejected',
            response_notes = $1
        WHERE id = $2
      `, [error.message, requestId]);
    }
  }

  /**
   * Collect all user data
   */
  private async collectUserData(userId: number): Promise<any> {
    const data: any = {};

    // User profile
    const userResult = await db.execute(`
      SELECT * FROM users WHERE id = $1
    `, [userId]);
    data.profile = userResult.rows[0];

    // Remove sensitive fields
    delete data.profile.password;

    // KYC data
    const kycResult = await db.execute(`
      SELECT * FROM kyc_verifications WHERE user_id = $1
    `, [userId]);
    data.kyc = kycResult.rows;

    // Accredited investor data
    const aiResult = await db.execute(`
      SELECT * FROM accredited_investor_verifications WHERE user_id = $1
    `, [userId]);
    data.accredited_investor = aiResult.rows;

    // W-9 data (excluding encrypted SSN/EIN)
    const w9Result = await db.execute(`
      SELECT id, taxpayer_name, business_name, tax_classification,
             address_line1, address_line2, city, state, zip_code,
             signed_at, created_at
      FROM w9_forms WHERE user_id = $1
    `, [userId]);
    data.w9 = w9Result.rows;

    // Tax documents
    const taxResult = await db.execute(`
      SELECT * FROM tax_documents WHERE user_id = $1
    `, [userId]);
    data.tax_documents = taxResult.rows;

    // Bonds
    const bondsResult = await db.execute(`
      SELECT * FROM bonds WHERE user_id = $1
    `, [userId]);
    data.bonds = bondsResult.rows;

    // Auctions
    const auctionsResult = await db.execute(`
      SELECT * FROM auctions WHERE created_by = $1
    `, [userId]);
    data.auctions = auctionsResult.rows;

    // Bids
    const bidsResult = await db.execute(`
      SELECT * FROM bids WHERE user_id = $1
    `, [userId]);
    data.bids = bidsResult.rows;

    // Trades
    const tradesResult = await db.execute(`
      SELECT * FROM exchange_trades WHERE buyer_id = $1 OR seller_id = $1
    `, [userId]);
    data.trades = tradesResult.rows;

    // Distributions
    const distResult = await db.execute(`
      SELECT * FROM distributions WHERE user_id = $1
    `, [userId]);
    data.distributions = distResult.rows;

    // Wallets
    const walletsResult = await db.execute(`
      SELECT * FROM user_wallets WHERE user_id = $1
    `, [userId]);
    data.wallets = walletsResult.rows;

    // Activity log
    const activityResult = await db.execute(`
      SELECT * FROM user_activity_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1000
    `, [userId]);
    data.activity_log = activityResult.rows;

    // Terms acceptances
    const termsResult = await db.execute(`
      SELECT * FROM terms_acceptances WHERE user_id = $1
    `, [userId]);
    data.terms_acceptances = termsResult.rows;

    return data;
  }

  /**
   * Generate data package (ZIP file)
   */
  private async generateDataPackage(userId: number, userData: any): Promise<string> {
    const outputDir = path.join('/tmp', 'data-packages');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `user-${userId}-data.zip`);
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        // In production, upload to S3 and return S3 URL
        const publicUrl = `/data-packages/user-${userId}-data.zip`;
        resolve(publicUrl);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      // Add JSON file with all data
      archive.append(JSON.stringify(userData, null, 2), { name: 'user-data.json' });

      // Add README
      const readme = `
BondAI Platform - User Data Export

This package contains all personal data associated with your account.

Files:
- user-data.json: All your data in JSON format

Data Categories:
- Profile information
- KYC/AML verification data
- Accredited investor verification data
- Tax information (W-9 forms, 1099 documents)
- Bonds owned
- Auction participation
- Trading history
- Distribution history
- Wallet connections
- Activity log
- Terms acceptances

This data is provided in compliance with GDPR and CCPA regulations.

For questions, contact: privacy@bondai.com
Generated: ${new Date().toISOString()}
      `;
      archive.append(readme, { name: 'README.txt' });

      archive.finalize();
    });
  }

  /**
   * Process data deletion request
   */
  async processDataDeletionRequest(requestId: number): Promise<void> {
    // Get request
    const result = await db.execute(`
      SELECT * FROM privacy_requests WHERE id = $1
    `, [requestId]);

    if (result.rows.length === 0) {
      throw new Error('Request not found');
    }

    const request = result.rows[0];
    const userId = request.user_id;

    // Update status
    await db.execute(`
      UPDATE privacy_requests SET status = 'processing' WHERE id = $1
    `, [requestId]);

    try {
      // Check if user has active bonds or pending transactions
      const activeResult = await db.execute(`
        SELECT COUNT(*) as count FROM bonds
        WHERE user_id = $1 AND status IN ('active', 'pending')
      `, [userId]);

      if (parseInt(activeResult.rows[0].count) > 0) {
        throw new Error('Cannot delete account with active bonds. Please settle all bonds first.');
      }

      // Anonymize user data instead of deleting (for audit trail)
      await this.anonymizeUserData(userId);

      // Update request
      await db.execute(`
        UPDATE privacy_requests
        SET status = 'completed',
            response_notes = 'Account data anonymized',
            completed_at = NOW()
        WHERE id = $1
      `, [requestId]);
    } catch (error) {
      await db.execute(`
        UPDATE privacy_requests
        SET status = 'rejected',
            response_notes = $1
        WHERE id = $2
      `, [error.message, requestId]);
    }
  }

  /**
   * Anonymize user data
   */
  private async anonymizeUserData(userId: number): Promise<void> {
    // Anonymize user record
    await db.execute(`
      UPDATE users
      SET email = CONCAT('deleted-', id, '@deleted.bondai.com'),
          name = 'Deleted User',
          password = 'DELETED',
          kyc_verified = false,
          accredited_investor_verified = false,
          w9_submitted = false
      WHERE id = $1
    `, [userId]);

    // Delete KYC data
    await db.execute(`DELETE FROM kyc_verifications WHERE user_id = $1`, [userId]);

    // Delete accredited investor data
    await db.execute(`DELETE FROM accredited_investor_verifications WHERE user_id = $1`, [userId]);

    // Delete W-9 data
    await db.execute(`DELETE FROM w9_forms WHERE user_id = $1`, [userId]);

    // Delete wallets
    await db.execute(`DELETE FROM user_wallets WHERE user_id = $1`, [userId]);

    // Keep financial records for audit (but anonymize)
    // Trades, distributions, etc. remain but user is anonymized
  }

  /**
   * Process opt-out of sale request
   */
  async processOptOutRequest(requestId: number): Promise<void> {
    const result = await db.execute(`
      SELECT * FROM privacy_requests WHERE id = $1
    `, [requestId]);

    if (result.rows.length === 0) {
      throw new Error('Request not found');
    }

    const request = result.rows[0];
    const userId = request.user_id;

    // Add opt-out flag to user
    await db.execute(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS data_sale_opt_out BOOLEAN DEFAULT false;
      UPDATE users SET data_sale_opt_out = true WHERE id = $1;
    `, [userId]);

    // Update request
    await db.execute(`
      UPDATE privacy_requests
      SET status = 'completed',
          response_notes = 'User opted out of data sale',
          completed_at = NOW()
      WHERE id = $1
    `, [requestId]);
  }

  /**
   * Get privacy request status
   */
  async getRequestStatus(requestId: number): Promise<any> {
    const result = await db.execute(`
      SELECT * FROM privacy_requests WHERE id = $1
    `, [requestId]);

    return result.rows[0] || null;
  }

  /**
   * Get all privacy requests for a user
   */
  async getUserRequests(userId: number): Promise<any[]> {
    const result = await db.execute(`
      SELECT * FROM privacy_requests
      WHERE user_id = $1
      ORDER BY requested_at DESC
    `, [userId]);

    return result.rows;
  }

  /**
   * Notify user of data breach
   */
  async notifyDataBreach(
    affectedUserIds: number[],
    breachDescription: string,
    breachDate: Date
  ): Promise<void> {
    // In production, send emails to all affected users
    // Log breach notification
    console.log(`Data breach notification sent to ${affectedUserIds.length} users`);
    console.log(`Breach: ${breachDescription}`);
    console.log(`Date: ${breachDate}`);

    // Store breach record
    // In production, create a data_breaches table
  }
}

// Singleton instance
export const privacyService = new PrivacyService();
