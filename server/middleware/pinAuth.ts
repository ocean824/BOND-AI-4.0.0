import { Request, Response, NextFunction } from "express";
import { PinService } from "../services/pinService";
import type { AuthRequest } from "./auth";

/**
 * PIN Authentication Middleware
 * Supports both legacy environment variable PINs and new database-backed PINs
 */

export interface PinAuthRequest extends AuthRequest {
  pinValidated?: boolean;
  pinPermissions?: any;
  pinRole?: string;
}

/**
 * Middleware to verify PIN for admin/surety access
 * Backward compatible with SURETY_ADMIN_PIN environment variable
 */
export function pinAuthMiddleware(options?: {
  resource?: string;
  action?: string;
  requiredPermission?: string;
}) {
  return async (req: PinAuthRequest, res: Response, next: NextFunction) => {
    const pin = req.headers["x-surety-pin"] as string || req.headers["x-admin-pin"] as string;
    
    if (!pin) {
      return res.status(403).json({ error: "PIN required" });
    }

    // Check legacy environment variable PIN first (backward compatibility)
    const legacySuretyPin = process.env.SURETY_ADMIN_PIN;
    const legacyAdminPin = process.env.ADMIN_PIN;

    if (legacySuretyPin && pin === legacySuretyPin) {
      // Legacy surety PIN - grant surety permissions
      req.pinValidated = true;
      req.pinRole = "surety";
      req.pinPermissions = {
        canViewSurety: true,
        canViewExchange: true,
        canManageSurety: true,
        canTrade: false,
      };
      return next();
    }

    if (legacyAdminPin && pin === legacyAdminPin) {
      // Legacy admin PIN - grant full permissions
      req.pinValidated = true;
      req.pinRole = "admin";
      req.pinPermissions = {
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
      return next();
    }

    // Check database-backed PIN
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const validation = await PinService.validatePin({
      userId: req.user.id,
      pin,
      action: options?.action || "access",
      resource: options?.resource || "admin",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    if (!validation.valid) {
      return res.status(403).json({ error: validation.error || "Invalid PIN" });
    }

    // Check specific permission if required
    if (options?.requiredPermission && validation.permissions) {
      const hasPermission = (validation.permissions as any)[options.requiredPermission];
      if (!hasPermission) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
    }

    req.pinValidated = true;
    req.pinPermissions = validation.permissions;
    req.pinRole = validation.role;

    next();
  };
}

/**
 * Middleware specifically for surety operations
 * Backward compatible with existing surety PIN system
 */
export const suretyPinMiddleware = pinAuthMiddleware({
  resource: "surety",
  action: "access_surety",
  requiredPermission: "canViewSurety",
});

/**
 * Middleware specifically for admin operations
 */
export const adminPinMiddleware = pinAuthMiddleware({
  resource: "admin",
  action: "access_admin",
});

/**
 * Middleware for viewing user details
 */
export const userDetailsPinMiddleware = pinAuthMiddleware({
  resource: "users",
  action: "view_user_details",
  requiredPermission: "canViewUsers",
});
