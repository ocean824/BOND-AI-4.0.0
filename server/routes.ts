import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authMiddleware, generateToken, type AuthRequest } from "./middleware/auth";
import { extractJudgmentData, generateChatResponse } from "./services/aiExtractionService";
import { buildMultiScenarioPricing } from "./services/pricingService";
import { generateInvestorTeaserPDF } from "./services/pdfGenerationService";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { judgments, bundleJudgments } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // ===== AUTH ROUTES =====
  const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1),
  });

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid input", details: validation.error });
      }

      const { email, password, name } = validation.data;

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        role: "analyst",
      });

      const token = generateToken(user);
      res.json({ user: { ...user, password: undefined }, token });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid input", details: validation.error });
      }

      const { email, password } = validation.data;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = generateToken(user);
      res.json({ user: { ...user, password: undefined }, token });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // ===== JUDGMENT ROUTES =====
  app.get("/api/judgments", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const judgmentsList = await storage.getJudgments(req.user!.id);
      res.json(judgmentsList);
    } catch (error) {
      console.error("Get judgments error:", error);
      res.status(500).json({ error: "Failed to get judgments" });
    }
  });

  app.post("/api/judgments", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { debtorName, caseNumber, judgmentAmount, notes } = req.body;

      const judgment = await storage.createJudgment({
        ownerId: req.user!.id,
        debtorName,
        caseNumber,
        judgmentAmount: judgmentAmount ? String(judgmentAmount) : "0",
        status: "uploaded",
        notes,
      });

      res.json(judgment);
    } catch (error) {
      console.error("Create judgment error:", error);
      res.status(500).json({ error: "Failed to create judgment" });
    }
  });

  app.post("/api/judgments/:id/extract", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const judgmentId = parseInt(req.params.id);
      const { rawText } = req.body;

      if (!rawText) {
        return res.status(400).json({ error: "Raw text is required" });
      }

      const extracted = await extractJudgmentData(rawText);
      
      await storage.updateJudgment(judgmentId, {
        debtorName: extracted.debtorName,
        caseNumber: extracted.caseNumber,
        court: extracted.court,
        jurisdiction: extracted.jurisdiction,
        judgmentAmount: String(extracted.judgmentAmount),
        judgmentDate: new Date(extracted.judgmentDate),
        rawFields: extracted.rawFields,
        status: "extracted",
      });

      res.json(extracted);
    } catch (error) {
      console.error("Extract judgment error:", error);
      res.status(500).json({ error: "Failed to extract judgment data" });
    }
  });

  app.post("/api/judgments/:id/price", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const judgmentId = parseInt(req.params.id);
      const { targetIRR, discountRate, expectedRecoveryPct } = req.body;

      const judgment = await storage.getJudgment(judgmentId);
      if (!judgment) {
        return res.status(404).json({ error: "Judgment not found" });
      }

      const scenarios = buildMultiScenarioPricing({
        judgmentAmount: parseFloat(judgment.judgmentAmount || "0"),
        targetIRR,
        discountRate,
        expectedRecoveryPct,
      });

      // Delete existing price estimates for this judgment
      await storage.deletePriceEstimates(judgmentId, ["base", "optimistic", "stressed"]);

      // Create new price estimates
      for (const scenario of scenarios) {
        await storage.createPriceEstimate({
          judgmentId,
          scenarioName: scenario.scenario,
          targetIRR: String(scenario.targetIRR),
          discountRate: String(scenario.discountRate),
          expectedRecoveryPct: String(scenario.expectedRecoveryPct),
          recommendedPurchasePrice: String(scenario.recommendedPurchasePrice),
          scenarioJson: {
            model: "multi-scenario",
            scenario: scenario.scenario,
            expectedRecoveryAmount: scenario.expectedRecoveryAmount,
            note: scenario.note,
          },
        });
      }

      res.json({ scenarios });
    } catch (error) {
      console.error("Price judgment error:", error);
      res.status(500).json({ error: "Failed to calculate pricing" });
    }
  });

  app.get("/api/judgments/:id/price-estimates", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const judgmentId = parseInt(req.params.id);
      const estimates = await storage.getPriceEstimates(judgmentId);
      
      const scenarios = estimates.map((est) => ({
        scenario: est.scenarioName as "base" | "optimistic" | "stressed",
        targetIRR: parseFloat(est.targetIRR || "0"),
        discountRate: parseFloat(est.discountRate || "0"),
        expectedRecoveryPct: parseFloat(est.expectedRecoveryPct || "0"),
        judgmentAmount: (est.scenarioJson as any)?.judgmentAmount || 0,
        expectedRecoveryAmount: (est.scenarioJson as any)?.expectedRecoveryAmount || 0,
        recommendedPurchasePrice: parseFloat(est.recommendedPurchasePrice || "0"),
        note: (est.scenarioJson as any)?.note,
      }));

      res.json({ scenarios });
    } catch (error) {
      console.error("Get price estimates error:", error);
      res.status(500).json({ error: "Failed to get price estimates" });
    }
  });

  // ===== BUNDLE ROUTES =====
  app.get("/api/bundles", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const bundlesList = await storage.getBundles(req.user!.id);
      res.json(bundlesList);
    } catch (error) {
      console.error("Get bundles error:", error);
      res.status(500).json({ error: "Failed to get bundles" });
    }
  });

  app.get("/api/bundles/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const bundleId = parseInt(req.params.id);
      const bundle = await storage.getBundle(bundleId);
      
      if (!bundle) {
        return res.status(404).json({ error: "Bundle not found" });
      }

      // Verify ownership
      if (bundle.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Forbidden - You do not have access to this bundle" });
      }

      const bundleJudgmentsList = await storage.getBundleJudgments(bundleId);
      const judgmentsWithDetails = await Promise.all(
        bundleJudgmentsList.map(async (bj) => {
          const judgment = await storage.getJudgment(bj.judgmentId);
          return {
            ...bj,
            judgment: judgment!,
          };
        })
      );

      res.json({
        ...bundle,
        judgments: judgmentsWithDetails,
      });
    } catch (error) {
      console.error("Get bundle error:", error);
      res.status(500).json({ error: "Failed to get bundle" });
    }
  });

  app.post("/api/bundles", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { name, description } = req.body;

      const bundle = await storage.createBundle({
        ownerId: req.user!.id,
        name,
        description,
        status: "draft",
      });

      res.json(bundle);
    } catch (error) {
      console.error("Create bundle error:", error);
      res.status(500).json({ error: "Failed to create bundle" });
    }
  });

  app.post("/api/bundles/:id/judgments", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const bundleId = parseInt(req.params.id);
      const { judgmentId, tranche } = req.body;

      // Verify bundle ownership before allowing modifications
      const bundle = await storage.getBundle(bundleId);
      if (!bundle) {
        return res.status(404).json({ error: "Bundle not found" });
      }
      if (bundle.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Forbidden - You do not have access to this bundle" });
      }

      const bundleJudgment = await storage.addJudgmentToBundle({
        bundleId,
        judgmentId,
        tranche,
      });

      res.json(bundleJudgment);
    } catch (error) {
      console.error("Add judgment to bundle error:", error);
      res.status(500).json({ error: "Failed to add judgment to bundle" });
    }
  });

  app.delete("/api/bundles/:id/judgments/:judgmentId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const bundleId = parseInt(req.params.id);
      const judgmentId = parseInt(req.params.judgmentId);

      // Verify bundle ownership before allowing modifications
      const bundle = await storage.getBundle(bundleId);
      if (!bundle) {
        return res.status(404).json({ error: "Bundle not found" });
      }
      if (bundle.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Forbidden - You do not have access to this bundle" });
      }

      await storage.removeJudgmentFromBundle(bundleId, judgmentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove judgment from bundle error:", error);
      res.status(500).json({ error: "Failed to remove judgment from bundle" });
    }
  });

  // ===== METRICS ROUTES =====
  app.get("/api/metrics", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT j.id) as "totalJudgments",
          COALESCE(SUM(CAST(j.judgment_amount AS NUMERIC)), 0) as "totalFaceValue",
          COALESCE(AVG(CAST(pe.expected_recovery_pct AS NUMERIC)), 60) as "averageRecovery"
        FROM judgments j
        LEFT JOIN price_estimates pe ON pe.judgment_id = j.id AND pe.scenario_name = 'base'
        WHERE j.owner_id = ${req.user!.id}
      `);

      const row = result.rows[0] as any;
      const totalFaceValue = parseFloat(row.totalFaceValue || "0");
      const averageRecovery = parseFloat(row.averageRecovery || "60");
      const totalRecommendedPurchase = totalFaceValue * (averageRecovery / 100) * 0.7;

      // Tranche breakdown
      const trancheResult = await db.execute(sql`
        SELECT 
          bj.tranche,
          COUNT(DISTINCT j.id) as count,
          COALESCE(SUM(CAST(j.judgment_amount AS NUMERIC)), 0) as "faceValue"
        FROM bundle_judgments bj
        JOIN judgments j ON j.id = bj.judgment_id
        WHERE j.owner_id = ${req.user!.id}
        GROUP BY bj.tranche
      `);

      const trancheBreakdown = {
        senior: { count: 0, faceValue: 0, recommendedPurchase: 0 },
        mezz: { count: 0, faceValue: 0, recommendedPurchase: 0 },
        equity: { count: 0, faceValue: 0, recommendedPurchase: 0 },
      };

      for (const row of trancheResult.rows as any[]) {
        const tranche = row.tranche as "senior" | "mezz" | "equity";
        const faceValue = parseFloat(row.faceValue || "0");
        trancheBreakdown[tranche] = {
          count: parseInt(row.count || "0"),
          faceValue,
          recommendedPurchase: faceValue * 0.7,
        };
      }

      res.json({
        totalJudgments: parseInt(row.totalJudgments || "0"),
        totalFaceValue,
        totalRecommendedPurchase,
        averageRecovery,
        trancheBreakdown,
      });
    } catch (error) {
      console.error("Get metrics error:", error);
      res.status(500).json({ error: "Failed to get metrics" });
    }
  });

  // ===== CHAT ROUTES =====
  app.post("/api/chat/sessions", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { title } = req.body;

      const session = await storage.createChatSession({
        userId: req.user!.id,
        title: title || "New Chat",
      });

      res.json(session);
    } catch (error) {
      console.error("Create chat session error:", error);
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });

  app.get("/api/chat/sessions/:id/messages", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const messages = await storage.getChatMessages(sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Get chat messages error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  app.post("/api/chat/sessions/:id/messages", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const { content } = req.body;

      // Create user message
      await storage.createChatMessage({
        sessionId,
        role: "user",
        content,
      });

      // Generate AI response
      const aiResponse = await generateChatResponse(content);

      // Create assistant message
      const assistantMessage = await storage.createChatMessage({
        sessionId,
        role: "assistant",
        content: aiResponse,
      });

      res.json(assistantMessage);
    } catch (error) {
      console.error("Send chat message error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // ===== PDF GENERATION ROUTES =====
  app.get("/api/teaser/:bundleId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const bundleId = parseInt(req.params.bundleId);

      // Fetch bundle
      const bundle = await storage.getBundle(bundleId);
      if (!bundle) {
        return res.status(404).json({ error: "Bundle not found" });
      }

      // Verify ownership - prevent unauthorized access to other users' bundles
      if (bundle.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "Forbidden - You do not have access to this bundle" });
      }

      // Fetch bundle judgments with details
      const bundleJudgmentsList = await storage.getBundleJudgments(bundleId);
      
      // Fetch judgment details and price estimates
      const judgmentDetails = await Promise.all(
        bundleJudgmentsList.map(async (bj) => {
          const judgment = await storage.getJudgment(bj.judgmentId);
          const priceEstimates = await storage.getPriceEstimates(bj.judgmentId);
          const basePrice = priceEstimates.find(pe => pe.scenarioName === "base");
          
          return {
            judgment,
            tranche: bj.tranche,
            recommendedPrice: basePrice ? parseFloat(basePrice.recommendedPurchasePrice) : 0,
          };
        })
      );

      // Calculate tranche summaries (using actual stored keys: senior, mezz, equity)
      const trancheMapping = [
        { key: "senior", label: "Senior" },
        { key: "mezz", label: "Mezzanine" },
        { key: "equity", label: "Equity" },
      ];
      
      const trancheSummaries = trancheMapping.map(({ key, label }) => {
        const trancheJudgments = judgmentDetails.filter(jd => jd.tranche === key);
        return {
          tranche: label,
          count: trancheJudgments.length,
          totalFaceValue: trancheJudgments.reduce((sum, jd) => 
            sum + parseFloat(jd.judgment?.judgmentAmount || "0"), 0),
          totalRecommendedPrice: trancheJudgments.reduce((sum, jd) => 
            sum + jd.recommendedPrice, 0),
        };
      });

      // Calculate totals
      const totalFaceValue = trancheSummaries.reduce((sum, t) => sum + t.totalFaceValue, 0);
      const totalRecommendedPrice = trancheSummaries.reduce((sum, t) => sum + t.totalRecommendedPrice, 0);
      const avgRecoveryRate = totalFaceValue > 0 ? (totalRecommendedPrice / totalFaceValue) * 100 : 0;

      // Format judgment list with proper tranche labels
      const trancheLabels: Record<string, string> = {
        senior: "Senior",
        mezz: "Mezzanine",
        equity: "Equity",
      };
      
      const judgments = judgmentDetails.map(jd => ({
        debtorName: jd.judgment?.debtorName || "Unknown",
        caseNumber: jd.judgment?.caseNumber || "N/A",
        court: jd.judgment?.court || "N/A",
        jurisdiction: jd.judgment?.jurisdiction || "N/A",
        judgmentAmount: jd.judgment?.judgmentAmount || "0",
        tranche: trancheLabels[jd.tranche] || jd.tranche,
      }));

      // Generate PDF
      const pdfData = {
        bundleName: bundle.name,
        bundleDescription: bundle.description || "",
        createdAt: bundle.createdAt?.toISOString() || new Date().toISOString(),
        totalFaceValue,
        totalRecommendedPrice,
        judgmentCount: bundleJudgmentsList.length,
        avgRecoveryRate,
        tranches: trancheSummaries.filter(t => t.count > 0),
        judgments,
      };

      const pdfDoc = generateInvestorTeaserPDF(pdfData);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="bundle-${bundleId}-teaser.pdf"`
      );

      // Pipe the PDF stream to response before ending the document
      pdfDoc.pipe(res);
      pdfDoc.end();
    } catch (error) {
      console.error("Generate teaser PDF error:", error);
      res.status(500).json({ error: "Failed to generate teaser PDF" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
