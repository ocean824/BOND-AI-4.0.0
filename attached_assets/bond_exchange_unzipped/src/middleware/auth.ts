import { Request, Response, NextFunction } from "express";

export type AppRole = "ADMIN" | "UNDERWRITER" | "INTERNAL" | "INVESTOR";

export interface AuthUser {
  id: string;
  role: AppRole;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(allowedRoles?: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

// If a user is an INVESTOR, they are only allowed to access /investor/* and /auth/*
export function blockInvestorsForNonInvestorRoutes(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = req.user;
  if (user?.role === "INVESTOR") {
    const path = req.path;
    if (path.startsWith("/investor/") || path.startsWith("/auth/")) {
      return next();
    }
    return res
      .status(403)
      .json({ error: "Investors cannot access this resource" });
  }
  next();
}

// Simple Surety PIN gate: in production, you should back this with a real session.
// For this module, we require X-Surety-Pin header to match SURETY_ADMIN_PIN env var.
export function requireSuretyPin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = req.user;
  if (!user || user.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin role required for Surety" });
  }

  const configuredPin = process.env.SURETY_ADMIN_PIN;
  if (!configuredPin) {
    console.warn(
      "WARNING: SURETY_ADMIN_PIN is not set. All Surety routes will be blocked."
    );
    return res
      .status(500)
      .json({ error: "Surety PIN not configured on server" });
  }

  const headerPin = req.header("x-surety-pin");
  if (!headerPin || headerPin !== configuredPin) {
    return res
      .status(401)
      .json({ error: "Invalid or missing Surety PIN (X-Surety-Pin header)" });
  }

  next();
}
