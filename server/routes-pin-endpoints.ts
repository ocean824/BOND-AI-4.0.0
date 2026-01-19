// PIN System Endpoints
// Add these to routes.ts before httpServer creation

import { PinService } from "./services/pinService";
import { userDetailsPinMiddleware } from "./middleware/pinAuth";

// POST /api/admin/verify-pin - Verify PIN for access
app.post("/api/admin/verify-pin", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { pin, resource } = req.body;
    
    if (!pin) {
      return res.status(400).json({ error: "PIN is required" });
    }

    const validation = await PinService.validatePin({
      userId: req.user!.id,
      pin,
      action: "verify",
      resource: resource || "admin",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    if (!validation.valid) {
      return res.status(403).json({ error: validation.error || "Invalid PIN" });
    }

    res.json({
      valid: true,
      role: validation.role,
      permissions: validation.permissions,
    });
  } catch (error) {
    console.error("PIN verification error:", error);
    res.status(500).json({ error: "PIN verification failed" });
  }
});

// POST /api/admin/pins/generate - Generate new PIN (admin only)
app.post("/api/admin/pins/generate", adminAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId, role, expiresInDays } = req.body;

    if (!userId || !role) {
      return res.status(400).json({ error: "userId and role are required" });
    }

    if (role !== "admin" && role !== "surety") {
      return res.status(400).json({ error: "Role must be 'admin' or 'surety'" });
    }

    const result = await PinService.createPin({
      userId,
      role,
      createdBy: req.user!.id,
      expiresInDays,
    });

    res.json({
      message: "PIN generated successfully",
      pin: result.pin,
      pinId: result.pinId,
      role,
    });
  } catch (error) {
    console.error("Generate PIN error:", error);
    res.status(500).json({ error: "Failed to generate PIN" });
  }
});

// GET /api/admin/pins - List all PINs (admin only)
app.get("/api/admin/pins", adminAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const pins = await PinService.listPins();
    res.json({ pins });
  } catch (error) {
    console.error("List PINs error:", error);
    res.status(500).json({ error: "Failed to list PINs" });
  }
});

// POST /api/admin/pins/:id/deactivate - Deactivate a PIN (admin only)
app.post("/api/admin/pins/:id/deactivate", adminAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const pinId = parseInt(req.params.id);
    await PinService.deactivatePin(pinId);
    res.json({ success: true });
  } catch (error) {
    console.error("Deactivate PIN error:", error);
    res.status(500).json({ error: "Failed to deactivate PIN" });
  }
});

// GET /api/admin/users/details - Get detailed user list (requires PIN)
app.get("/api/admin/users/details", adminAuthMiddleware, userDetailsPinMiddleware, async (req: AuthRequest, res) => {
  try {
    const usersResult = await db.execute(sql`
      SELECT 
        id,
        username,
        email,
        role,
        has_pin,
        pin_role,
        created_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.json({ users: usersResult.rows });
  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({ error: "Failed to get user details" });
  }
});

// GET /api/admin/pin-logs - Get PIN access logs (admin only)
app.get("/api/admin/pin-logs", adminAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const logs = await PinService.getAccessLogs({ limit });
    res.json({ logs });
  } catch (error) {
    console.error("Get PIN logs error:", error);
    res.status(500).json({ error: "Failed to get PIN logs" });
  }
});
