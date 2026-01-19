import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * PIN Service
 * Manages PIN-based access control for admin and surety users
 */

export interface PinPermissions {
  canViewUsers?: boolean;
  canViewAudit?: boolean;
  canViewLedger?: boolean;
  canViewInvites?: boolean;
  canViewSurety?: boolean;
  canViewExchange?: boolean;
  canViewBonds?: boolean;
  canViewJudgments?: boolean;
  canTrade?: boolean; // Can place bids and execute trades
  canManageSurety?: boolean; // Can create/modify surety cases
}

export const ADMIN_PERMISSIONS: PinPermissions = {
  canViewUsers: true,
  canViewAudit: true,
  canViewLedger: true,
  canViewInvites: true,
  canViewSurety: true,
  canViewExchange: true,
  canViewBonds: true,
  canViewJudgments: true,
  canTrade: true,
  canManageSurety: true,
};

export const SURETY_PERMISSIONS: PinPermissions = {
  canViewSurety: true,
  canViewExchange: true, // View only, no trading/bidding
  canManageSurety: true, // Can create/modify surety cases
  canTrade: false, // Explicitly no trading/bidding access
  // Surety can access surety underwriting, bond exchange (view only), and exchange overview (view only)
};

export class PinService {
  /**
   * Generate a new 6-digit PIN
   */
  static generatePin(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Create a PIN for a user
   */
  static async createPin(params: {
    userId: number;
    role: "admin" | "surety";
    createdBy: number;
    expiresInDays?: number;
  }): Promise<{ pin: string; pinId: number }> {
    const pin = this.generatePin();
    const pinHash = await bcrypt.hash(pin, 10);

    const permissions = params.role === "admin" ? ADMIN_PERMISSIONS : SURETY_PERMISSIONS;

    const expiresAt = params.expiresInDays
      ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const result = await db.execute(`
      INSERT INTO admin_pins (user_id, pin_hash, role, permissions, is_active, expires_at, created_by)
      VALUES ($1, $2, $3, $4, true, $5, $6)
      RETURNING id
    `, [params.userId, pinHash, params.role, JSON.stringify(permissions), expiresAt, params.createdBy]);

    // Update user record
    await db.update(users)
      .set({
        hasPin: true,
        pinRole: params.role,
      })
      .where(eq(users.id, params.userId));

    return {
      pin,
      pinId: result.rows[0].id,
    };
  }

  /**
   * Validate a PIN for a user
   */
  static async validatePin(params: {
    userId: number;
    pin: string;
    action: string;
    resource: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{
    valid: boolean;
    permissions?: PinPermissions;
    role?: string;
    error?: string;
  }> {
    try {
      // Get active PIN for user
      const result = await db.execute(`
        SELECT id, pin_hash, role, permissions, expires_at
        FROM admin_pins
        WHERE user_id = $1 AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `, [params.userId]);

      if (result.rows.length === 0) {
        await this.logAccess({ ...params, success: false, pinId: null });
        return { valid: false, error: "No active PIN found" };
      }

      const pinRecord = result.rows[0];

      // Check expiration
      if (pinRecord.expires_at && new Date(pinRecord.expires_at) < new Date()) {
        await this.logAccess({ ...params, success: false, pinId: pinRecord.id });
        return { valid: false, error: "PIN has expired" };
      }

      // Verify PIN
      const isValid = await bcrypt.compare(params.pin, pinRecord.pin_hash);

      if (!isValid) {
        await this.logAccess({ ...params, success: false, pinId: pinRecord.id });
        return { valid: false, error: "Invalid PIN" };
      }

      // Update last used timestamp
      await db.execute(`
        UPDATE admin_pins
        SET last_used_at = NOW()
        WHERE id = $1
      `, [pinRecord.id]);

      // Log successful access
      await this.logAccess({ ...params, success: true, pinId: pinRecord.id });

      return {
        valid: true,
        permissions: pinRecord.permissions as PinPermissions,
        role: pinRecord.role,
      };
    } catch (error) {
      console.error("PIN validation error:", error);
      return { valid: false, error: "PIN validation failed" };
    }
  }

  /**
   * Log PIN access attempt
   */
  private static async logAccess(params: {
    userId: number;
    pinId: number | null;
    action: string;
    resource: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await db.execute(`
        INSERT INTO pin_access_logs (user_id, pin_id, action, resource, success, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        params.userId,
        params.pinId,
        params.action,
        params.resource,
        params.success,
        params.ipAddress || null,
        params.userAgent || null,
      ]);
    } catch (error) {
      console.error("Failed to log PIN access:", error);
    }
  }

  /**
   * Check if user has permission for a specific action
   */
  static async checkPermission(params: {
    userId: number;
    pin: string;
    permission: keyof PinPermissions;
    action: string;
    resource: string;
  }): Promise<boolean> {
    const validation = await this.validatePin({
      userId: params.userId,
      pin: params.pin,
      action: params.action,
      resource: params.resource,
    });

    if (!validation.valid || !validation.permissions) {
      return false;
    }

    return validation.permissions[params.permission] === true;
  }

  /**
   * Get all PINs (admin only)
   */
  static async listPins(): Promise<any[]> {
    const result = await db.execute(`
      SELECT 
        ap.id,
        ap.user_id,
        u.username,
        u.email,
        ap.role,
        ap.permissions,
        ap.is_active,
        ap.created_at,
        ap.last_used_at,
        ap.expires_at
      FROM admin_pins ap
      JOIN users u ON ap.user_id = u.id
      ORDER BY ap.created_at DESC
    `);

    return result.rows;
  }

  /**
   * Deactivate a PIN
   */
  static async deactivatePin(pinId: number): Promise<void> {
    await db.execute(`
      UPDATE admin_pins
      SET is_active = false
      WHERE id = $1
    `, [pinId]);
  }

  /**
   * Get PIN access logs
   */
  static async getAccessLogs(params?: {
    userId?: number;
    limit?: number;
  }): Promise<any[]> {
    let query = `
      SELECT 
        pal.*,
        u.username,
        u.email
      FROM pin_access_logs pal
      JOIN users u ON pal.user_id = u.id
    `;

    const queryParams: any[] = [];

    if (params?.userId) {
      query += ` WHERE pal.user_id = $1`;
      queryParams.push(params.userId);
    }

    query += ` ORDER BY pal.created_at DESC`;

    if (params?.limit) {
      query += ` LIMIT $${queryParams.length + 1}`;
      queryParams.push(params.limit);
    }

    const result = await db.execute(query, queryParams);
    return result.rows;
  }
}
