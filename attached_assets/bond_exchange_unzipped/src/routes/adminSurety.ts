import { Router } from "express";
import { requireAuth, requireSuretyPin } from "../middleware/auth";
import {
  db,
  suretyCases,
  suretyTrusts,
  suretyCollateral,
  suretyDocuments,
  bonds,
} from "../db";
import { eq, and } from "drizzle-orm";
import { underwriteJudgmentBondSurety } from "../services/suretyUnderwriting";

export const adminSuretyRouter = Router();

// List Surety cases (Admin + Surety PIN)
adminSuretyRouter.get(
  "/admin/surety/cases",
  requireAuth(["ADMIN"]),
  requireSuretyPin,
  async (_req, res) => {
    const rows = await db.select().from(suretyCases);
    return res.json({ cases: rows });
  }
);

// Get one Surety case
adminSuretyRouter.get(
  "/admin/surety/cases/:id",
  requireAuth(["ADMIN"]),
  requireSuretyPin,
  async (req, res) => {
    const { id } = req.params;
    const [sc] = await db.select().from(suretyCases).where(eq(suretyCases.id, id));
    if (!sc) {
      return res.status(404).json({ error: "Surety case not found" });
    }

    const trust = await db
      .select()
      .from(suretyTrusts)
      .where(eq(suretyTrusts.id, sc.suretyTrustId));
    const collaterals = await db
      .select()
      .from(suretyCollateral)
      .where(eq(suretyCollateral.caseId, sc.id));
    const docs = await db
      .select()
      .from(suretyDocuments)
      .where(eq(suretyDocuments.caseId, sc.id));

    return res.json({
      case: sc,
      trust: trust[0] ?? null,
      collateral: collaterals,
      documents: docs,
    });
  }
);

// Create a new Surety case for a JUDGMENT bond
adminSuretyRouter.post(
  "/admin/surety/cases",
  requireAuth(["ADMIN"]),
  requireSuretyPin,
  async (req, res) => {
    const { bondId, suretyTrustId } = req.body as {
      bondId: string;
      suretyTrustId: string;
    };

    const [bond] = await db.select().from(bonds).where(eq(bonds.id, bondId));
    if (!bond) {
      return res.status(404).json({ error: "Bond not found" });
    }

    if (bond.bondType !== "JUDGMENT") {
      return res
        .status(400)
        .json({ error: "Surety feature is restricted to Judgment Bonds only." });
    }

    const [trust] = await db
      .select()
      .from(suretyTrusts)
      .where(eq(suretyTrusts.id, suretyTrustId));
    if (!trust) {
      return res.status(404).json({ error: "Surety trust not found" });
    }

    const penalSum = Number(bond.faceValue);

    const [sc] = await db
      .insert(suretyCases)
      .values({
        bondId: bond.id,
        suretyTrustId: trust.id,
        bondType: bond.bondType,
        bondPenalSum: penalSum,
        status: "DRAFT",
      })
      .returning();

    // Link on bond
    await db
      .update(bonds)
      .set({
        suretyCaseId: sc.id,
        suretyTrustId: trust.id,
        suretyStatus: "IN_UNDERWRITING",
      })
      .where(eq(bonds.id, bond.id));

    return res.json({ case: sc });
  }
);

// Run underwriting for a Surety case
adminSuretyRouter.post(
  "/admin/surety/cases/:id/underwrite",
  requireAuth(["ADMIN"]),
  requireSuretyPin,
  async (req, res) => {
    const { id } = req.params;

    const [sc] = await db.select().from(suretyCases).where(eq(suretyCases.id, id));
    if (!sc) {
      return res.status(404).json({ error: "Surety case not found" });
    }

    if (sc.bondType !== "JUDGMENT") {
      return res
        .status(400)
        .json({ error: "Surety underwriting is currently limited to Judgment Bonds." });
    }

    const result = await underwriteJudgmentBondSurety(id);

    // Update case with underwriting outcome
    const newStatus =
      result.decision === "DECLINED"
        ? "DECLINED"
        : result.decision === "APPROVED"
        ? "APPROVED"
        : "APPROVED_WITH_COLLATERAL";

    await db
      .update(suretyCases)
      .set({
        status: newStatus,
        collateralRequiredAmount: result.collateralRequired,
        insuranceRequired: result.insuranceRequired ? "YES" : "NO",
      })
      .where(eq(suretyCases.id, id));

    // also update bond.suretyStatus
    await db
      .update(bonds)
      .set({
        suretyStatus:
          newStatus === "DECLINED"
            ? "NONE"
            : "APPROVED",
      })
      .where(eq(bonds.id, sc.bondId));

    return res.json({
      result,
      status: newStatus,
    });
  }
);

// Generate placeholder docs (GIA, Collateral Agreement, Trust Resolution)
adminSuretyRouter.post(
  "/admin/surety/cases/:id/generate-docs",
  requireAuth(["ADMIN"]),
  requireSuretyPin,
  async (req, res) => {
    const { id } = req.params;

    const [sc] = await db.select().from(suretyCases).where(eq(suretyCases.id, id));
    if (!sc) {
      return res.status(404).json({ error: "Surety case not found" });
    }

    // For now, just create placeholder entries. In your real app, you will
    // generate PDF/Docx files and store their path.
    const docsToCreate = [
      { docType: "GIA", storagePath: `/docs/${id}/gia-placeholder.txt` },
      {
        docType: "COLLATERAL_AGREEMENT",
        storagePath: `/docs/${id}/collateral-placeholder.txt`,
      },
      {
        docType: "TRUST_RESOLUTION",
        storagePath: `/docs/${id}/trust-resolution-placeholder.txt`,
      },
    ] as const;

    const createdDocs = [] as any[];
    for (const d of docsToCreate) {
      const [doc] = await db
        .insert(suretyDocuments)
        .values({
          caseId: sc.id,
          docType: d.docType,
          storagePath: d.storagePath,
        })
        .returning();
      createdDocs.push(doc);
    }

    await db
      .update(suretyCases)
      .set({ status: "DOCS_PENDING_SIGNATURE" })
      .where(eq(suretyCases.id, id));

    return res.json({
      message: "Placeholder Surety documents created. Replace with real templates.",
      documents: createdDocs,
    });
  }
);

// Simple trust snapshot
adminSuretyRouter.get(
  "/admin/surety/trusts/:id/snapshot",
  requireAuth(["ADMIN"]),
  requireSuretyPin,
  async (req, res) => {
    const { id } = req.params;
    const [trust] = await db
      .select()
      .from(suretyTrusts)
      .where(eq(suretyTrusts.id, id));

    if (!trust) {
      return res.status(404).json({ error: "Surety trust not found" });
    }

    const activeCases = await db
      .select()
      .from(suretyCases)
      .where(
        and(
          eq(suretyCases.suretyTrustId, trust.id),
          eq(suretyCases.status, "ACTIVE")
        )
      );

    return res.json({
      trust,
      activeCaseCount: activeCases.length,
    });
  }
);
