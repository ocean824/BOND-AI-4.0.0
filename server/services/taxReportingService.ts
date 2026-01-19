import { db } from '../db';
import crypto from 'crypto';

/**
 * Tax Reporting Service
 * 
 * Handles W-9 collection and 1099 form generation for IRS compliance.
 * 
 * Integrates with:
 * - Tax1099 (https://www.tax1099.com) - Recommended
 * - Stripe Tax (https://stripe.com/tax)
 * - TaxBit (https://taxbit.com)
 * 
 * IRS Requirements:
 * - Collect W-9 from all users before first payment
 * - Generate 1099-MISC for distributions >$600/year
 * - Generate 1099-B for bond sales
 * - File with IRS by January 31
 * - Send to recipients by January 31
 * 
 * To activate: Set environment variables for your chosen provider
 */

export interface W9FormData {
  taxpayerName: string;
  businessName?: string;
  taxClassification: 'individual' | 'c_corp' | 's_corp' | 'partnership' | 'trust' | 'llc' | 'other';
  llcTaxClassification?: 'c' | 's' | 'p';
  otherClassification?: string;
  exemptPayeeCode?: string;
  fatcaExemptionCode?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  ssnOrEin: string; // Will be encrypted
  taxIdType: 'ssn' | 'ein';
  signatureData: string; // Base64 encoded signature image
  signatureIpAddress: string;
  signatureUserAgent: string;
}

export interface Form1099Data {
  userId: number;
  taxYear: number;
  formType: '1099_misc' | '1099_b' | '1099_int' | '1099_div';
  totalAmount: number;
  formData: any; // Box values specific to form type
}

export class TaxReportingService {
  private provider: string;
  private apiKey: string;
  private apiUrl: string;
  private encryptionKey: string;

  constructor() {
    this.provider = process.env.TAX_PROVIDER || 'tax1099';
    this.apiKey = process.env.TAX_API_KEY || '';
    this.encryptionKey = process.env.TAX_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    
    switch (this.provider) {
      case 'tax1099':
        this.apiUrl = 'https://api.tax1099.com/v1';
        break;
      case 'stripe_tax':
        this.apiUrl = 'https://api.stripe.com/v1';
        break;
      case 'taxbit':
        this.apiUrl = 'https://api.taxbit.com/v1';
        break;
      default:
        this.apiUrl = '';
    }
  }

  /**
   * Encrypt sensitive tax ID (SSN/EIN)
   */
  private encryptTaxId(taxId: string): string {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(this.encryptionKey, 'hex'), iv);
    
    let encrypted = cipher.update(taxId, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive tax ID
   */
  private decryptTaxId(encryptedTaxId: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedTaxId.split(':');
    
    const algorithm = 'aes-256-gcm';
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(this.encryptionKey, 'hex'), iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Submit W-9 form
   */
  async submitW9(userId: number, data: W9FormData): Promise<{ w9Id: number }> {
    // Validate data
    this.validateW9Data(data);

    // Encrypt SSN/EIN
    const encryptedTaxId = this.encryptTaxId(data.ssnOrEin);

    // Mark any existing W-9 as superseded
    await db.execute(`
      UPDATE w9_forms SET status = 'superseded' WHERE user_id = $1 AND status = 'active'
    `, [userId]);

    // Insert new W-9
    const result = await db.execute(`
      INSERT INTO w9_forms (
        user_id, taxpayer_name, business_name, tax_classification,
        llc_tax_classification, other_classification,
        exempt_payee_code, fatca_exemption_code,
        address_line1, address_line2, city, state, zip_code,
        ssn_ein_encrypted, tax_id_type,
        signature_data, signature_ip_address, signature_user_agent, signed_at,
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), 'active'
      ) RETURNING id
    `, [
      userId, data.taxpayerName, data.businessName, data.taxClassification,
      data.llcTaxClassification, data.otherClassification,
      data.exemptPayeeCode, data.fatcaExemptionCode,
      data.addressLine1, data.addressLine2, data.city, data.state, data.zipCode,
      encryptedTaxId, data.taxIdType,
      data.signatureData, data.signatureIpAddress, data.signatureUserAgent,
    ]);

    const w9Id = result.rows[0].id;

    // Update user record
    await db.execute(`
      UPDATE users SET w9_submitted = true, w9_submitted_at = NOW() WHERE id = $1
    `, [userId]);

    return { w9Id };
  }

  /**
   * Validate W-9 data
   */
  private validateW9Data(data: W9FormData): void {
    if (!data.taxpayerName) {
      throw new Error('Taxpayer name is required');
    }

    if (!data.ssnOrEin) {
      throw new Error('SSN or EIN is required');
    }

    // Validate SSN format (XXX-XX-XXXX)
    if (data.taxIdType === 'ssn') {
      const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
      if (!ssnRegex.test(data.ssnOrEin)) {
        throw new Error('Invalid SSN format. Use XXX-XX-XXXX');
      }
    }

    // Validate EIN format (XX-XXXXXXX)
    if (data.taxIdType === 'ein') {
      const einRegex = /^\d{2}-\d{7}$/;
      if (!einRegex.test(data.ssnOrEin)) {
        throw new Error('Invalid EIN format. Use XX-XXXXXXX');
      }
    }

    if (!data.signatureData) {
      throw new Error('Signature is required');
    }
  }

  /**
   * Get user's W-9 form
   */
  async getW9(userId: number): Promise<any> {
    const result = await db.execute(`
      SELECT * FROM w9_forms WHERE user_id = $1 AND status = 'active' LIMIT 1
    `, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const w9 = result.rows[0];
    
    // Don't return encrypted tax ID
    delete w9.ssn_ein_encrypted;
    
    return w9;
  }

  /**
   * Check if user has submitted W-9
   */
  async hasW9(userId: number): Promise<boolean> {
    const result = await db.execute(`
      SELECT w9_submitted FROM users WHERE id = $1
    `, [userId]);

    return result.rows.length > 0 && result.rows[0].w9_submitted;
  }

  /**
   * Generate 1099 forms for a tax year
   */
  async generate1099Forms(taxYear: number): Promise<{ formsGenerated: number }> {
    // Get all users with distributions >$600 in the tax year
    const result = await db.execute(`
      SELECT 
        d.user_id,
        SUM(d.amount) as total_amount,
        u.id as user_id
      FROM distributions d
      JOIN users u ON d.user_id = u.id
      WHERE EXTRACT(YEAR FROM d.executed_at) = $1
        AND d.status = 'completed'
        AND u.w9_submitted = true
      GROUP BY d.user_id, u.id
      HAVING SUM(d.amount) >= 600
    `, [taxYear]);

    let formsGenerated = 0;

    for (const row of result.rows) {
      await this.generate1099MISC(row.user_id, taxYear, row.total_amount);
      formsGenerated++;
    }

    return { formsGenerated };
  }

  /**
   * Generate 1099-MISC for a user
   */
  async generate1099MISC(userId: number, taxYear: number, totalAmount: number): Promise<{ formId: number }> {
    // Get user's W-9
    const w9Result = await db.execute(`
      SELECT * FROM w9_forms WHERE user_id = $1 AND status = 'active' LIMIT 1
    `, [userId]);

    if (w9Result.rows.length === 0) {
      throw new Error('User has not submitted W-9');
    }

    const w9 = w9Result.rows[0];

    // Prepare form data (Box values)
    const formData = {
      box1: 0, // Rents
      box2: 0, // Royalties
      box3: totalAmount, // Other income (distributions)
      box4: 0, // Federal income tax withheld
      box5: 0, // Fishing boat proceeds
      box6: 0, // Medical and health care payments
      box7: 0, // Nonemployee compensation
      box8: 0, // Substitute payments
      box9: 0, // Crop insurance proceeds
      box10: 0, // Gross proceeds paid to an attorney
      box11: 0, // Fish purchased for resale
      box12: 0, // Section 409A deferrals
      box13: 0, // Excess golden parachute payments
      box14: 0, // Nonqualified deferred compensation
      box15: 0, // State tax withheld
      box16: '', // State/Payer's state no.
      box17: 0, // State income
    };

    // Insert form
    const result = await db.execute(`
      INSERT INTO tax_documents (
        user_id, tax_year, form_type, total_amount, form_data, status
      ) VALUES (
        $1, $2, '1099_misc', $3, $4, 'generated'
      ) RETURNING id
    `, [userId, taxYear, totalAmount, JSON.stringify(formData)]);

    const formId = result.rows[0].id;

    // If API key is set, send to provider for filing
    if (this.apiKey) {
      await this.fileWithProvider(formId);
    }

    return { formId };
  }

  /**
   * File 1099 with provider (Tax1099, Stripe Tax, etc.)
   */
  private async fileWithProvider(formId: number): Promise<void> {
    // Get form data
    const result = await db.execute(`
      SELECT td.*, w9.*, u.email
      FROM tax_documents td
      JOIN users u ON td.user_id = u.id
      JOIN w9_forms w9 ON u.id = w9.user_id AND w9.status = 'active'
      WHERE td.id = $1
    `, [formId]);

    if (result.rows.length === 0) {
      throw new Error('Form not found');
    }

    const form = result.rows[0];

    // Decrypt tax ID
    const taxId = this.decryptTaxId(form.ssn_ein_encrypted);

    // Call provider API based on provider
    if (this.provider === 'tax1099') {
      await this.fileWithTax1099(form, taxId);
    } else if (this.provider === 'stripe_tax') {
      await this.fileWithStripeTax(form, taxId);
    }

    // Update form status
    await db.execute(`
      UPDATE tax_documents
      SET status = 'filed_with_irs', filed_with_irs_at = NOW()
      WHERE id = $1
    `, [formId]);
  }

  /**
   * File with Tax1099
   */
  private async fileWithTax1099(form: any, taxId: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/forms/1099-misc`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tax_year: form.tax_year,
        recipient: {
          name: form.taxpayer_name,
          tin: taxId,
          address: {
            line1: form.address_line1,
            line2: form.address_line2,
            city: form.city,
            state: form.state,
            zip: form.zip_code,
          },
        },
        amounts: form.form_data,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Tax1099 API error: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * File with Stripe Tax (placeholder)
   */
  private async fileWithStripeTax(form: any, taxId: string): Promise<void> {
    // Stripe Tax implementation
    throw new Error('Stripe Tax integration not yet implemented');
  }

  /**
   * Send 1099 to user
   */
  async send1099ToUser(formId: number): Promise<void> {
    // Get form
    const result = await db.execute(`
      SELECT td.*, u.email
      FROM tax_documents td
      JOIN users u ON td.user_id = u.id
      WHERE td.id = $1
    `, [formId]);

    if (result.rows.length === 0) {
      throw new Error('Form not found');
    }

    const form = result.rows[0];

    // Generate PDF (in production, use a PDF library)
    const pdfUrl = await this.generateFormPDF(form);

    // Update form with PDF URL
    await db.execute(`
      UPDATE tax_documents
      SET pdf_url = $1, sent_to_user_at = NOW(), status = 'sent_to_user'
      WHERE id = $2
    `, [pdfUrl, formId]);

    // Send email (queue email job)
    // In production, integrate with email service
    console.log(`Sending 1099 to ${form.email}: ${pdfUrl}`);
  }

  /**
   * Generate PDF for 1099 form
   */
  private async generateFormPDF(form: any): Promise<string> {
    // In production, use a PDF generation library like PDFKit or Puppeteer
    // For now, return placeholder URL
    return `/tax-documents/${form.id}.pdf`;
  }

  /**
   * Get tax documents for a user
   */
  async getTaxDocuments(userId: number, taxYear?: number): Promise<any[]> {
    let query = `
      SELECT * FROM tax_documents WHERE user_id = $1
    `;
    const params: any[] = [userId];

    if (taxYear) {
      query += ` AND tax_year = $2`;
      params.push(taxYear);
    }

    query += ` ORDER BY tax_year DESC, created_at DESC`;

    const result = await db.execute(query, params);
    return result.rows;
  }

  /**
   * Calculate total reportable income for a user
   */
  async calculateReportableIncome(userId: number, taxYear: number): Promise<{
    distributions: number;
    bondSales: number;
    interest: number;
    total: number;
  }> {
    // Get distributions
    const distResult = await db.execute(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM distributions
      WHERE user_id = $1
        AND EXTRACT(YEAR FROM executed_at) = $2
        AND status = 'completed'
    `, [userId, taxYear]);

    const distributions = parseFloat(distResult.rows[0]?.total || '0');

    // Get bond sales (capital gains)
    const salesResult = await db.execute(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM exchange_trades
      WHERE seller_id = $1
        AND EXTRACT(YEAR FROM settled_at) = $2
        AND status = 'settled'
    `, [userId, taxYear]);

    const bondSales = parseFloat(salesResult.rows[0]?.total || '0');

    // Interest income (if applicable)
    const interest = 0; // TODO: Calculate interest income

    return {
      distributions,
      bondSales,
      interest,
      total: distributions + bondSales + interest,
    };
  }
}

// Singleton instance
export const taxReportingService = new TaxReportingService();
