import { db } from "../db";
import { inviteCodes, users } from "../../shared/schema";
import { eq, and, lt, gt } from "drizzle-orm";
import crypto from "crypto";

/**
 * Invite Code Service
 * Manages admin-generated invite codes for account creation
 */

export class InviteCodeService {
  /**
   * Generate a new invite code
   */
  static async generateCode(params: {
    accountType: "analyst" | "investor" | "admin";
    maxUses?: number;
    expiresInDays?: number;
    createdBy: number;
    notes?: string;
  }): Promise<{ code: string; id: number }> {
    // Generate unique code
    const code = `BOND-${params.accountType.toUpperCase().slice(0, 3)}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    
    // Calculate expiration
    const expiresAt = params.expiresInDays
      ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const [result] = await db.insert(inviteCodes).values({
      code,
      accountType: params.accountType,
      maxUses: params.maxUses || 1,
      currentUses: 0,
      expiresAt,
      createdBy: params.createdBy,
      isActive: true,
      notes: params.notes,
    }).returning();

    return { code: result.code, id: result.id };
  }

  /**
   * Validate an invite code
   */
  static async validateCode(code: string): Promise<{
    valid: boolean;
    accountType?: string;
    error?: string;
  }> {
    const inviteCode = await db.query.inviteCodes.findFirst({
      where: eq(inviteCodes.code, code),
    });

    if (!inviteCode) {
      return { valid: false, error: "Invalid invite code" };
    }

    if (!inviteCode.isActive) {
      return { valid: false, error: "Invite code has been deactivated" };
    }

    if (inviteCode.currentUses >= inviteCode.maxUses) {
      return { valid: false, error: "Invite code has reached maximum uses" };
    }

    if (inviteCode.expiresAt && new Date() > inviteCode.expiresAt) {
      return { valid: false, error: "Invite code has expired" };
    }

    return { valid: true, accountType: inviteCode.accountType };
  }

  /**
   * Use an invite code (increment usage count)
   */
  static async useCode(code: string, userId: number): Promise<void> {
    const inviteCode = await db.query.inviteCodes.findFirst({
      where: eq(inviteCodes.code, code),
    });

    if (!inviteCode) {
      throw new Error("Invalid invite code");
    }

    // Increment usage count
    await db
      .update(inviteCodes)
      .set({ currentUses: inviteCode.currentUses + 1 })
      .where(eq(inviteCodes.id, inviteCode.id));

    // Update user record
    await db
      .update(users)
      .set({
        inviteCodeUsed: code,
        invitedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Deactivate if max uses reached
    if (inviteCode.currentUses + 1 >= inviteCode.maxUses) {
      await db
        .update(inviteCodes)
        .set({ isActive: false })
        .where(eq(inviteCodes.id, inviteCode.id));
    }
  }

  /**
   * List all invite codes (admin only)
   */
  static async listCodes(filters?: {
    accountType?: string;
    isActive?: boolean;
  }): Promise<any[]> {
    let query = db.select().from(inviteCodes);

    if (filters?.accountType) {
      query = query.where(eq(inviteCodes.accountType, filters.accountType));
    }

    if (filters?.isActive !== undefined) {
      query = query.where(eq(inviteCodes.isActive, filters.isActive));
    }

    const codes = await query;
    return codes;
  }

  /**
   * Deactivate an invite code
   */
  static async deactivateCode(codeId: number): Promise<void> {
    await db
      .update(inviteCodes)
      .set({ isActive: false })
      .where(eq(inviteCodes.id, codeId));
  }

  /**
   * Get invite code statistics
   */
  static async getStats(): Promise<{
    total: number;
    active: number;
    used: number;
    byType: Record<string, number>;
  }> {
    const allCodes = await db.select().from(inviteCodes);

    const stats = {
      total: allCodes.length,
      active: allCodes.filter(c => c.isActive).length,
      used: allCodes.reduce((sum, c) => sum + c.currentUses, 0),
      byType: {
        analyst: allCodes.filter(c => c.accountType === "analyst").length,
        investor: allCodes.filter(c => c.accountType === "investor").length,
        admin: allCodes.filter(c => c.accountType === "admin").length,
      },
    };

    return stats;
  }
}
