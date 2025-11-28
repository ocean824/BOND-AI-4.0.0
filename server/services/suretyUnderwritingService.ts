import { db } from "../db";
import { 
  suretyTrusts, 
  suretyCases, 
  suretyCollateral, 
  suretyIndemnitors, 
  suretyDocuments,
  bonds,
  type SuretyCase,
  type SuretyTrust,
  type SuretyUnderwritingDecision
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export interface SuretyUnderwritingInput {
  bondId: number;
  suretyTrustId: number;
  bondPenalSum: number;
  principalRiskScore: number;
  principalId?: number;
}

export interface SuretyUnderwritingResult {
  decision: SuretyUnderwritingDecision;
  collateralRequiredAmount: number;
  collateralPercentage: number;
  collateralTypeAllowed: string[];
  indemnityRequired: string;
  insuranceRequired: string;
  reasoning: string;
}

const LOW_RISK_SCORE_THRESHOLD = 30;
const MODERATE_RISK_SCORE_THRESHOLD = 50;
const LOW_RISK_AMOUNT_THRESHOLD = 25000;
const MODERATE_RISK_AMOUNT_THRESHOLD = 100000;
const MODERATE_COLLATERAL_PERCENT = 0.25;

export async function computeSuretyUnderwriting(
  input: SuretyUnderwritingInput
): Promise<SuretyUnderwritingResult> {
  const { bondPenalSum, principalRiskScore, suretyTrustId } = input;

  const trust = await db.select().from(suretyTrusts).where(eq(suretyTrusts.id, suretyTrustId)).limit(1);
  if (!trust.length) {
    throw new Error("Surety trust not found");
  }

  const trustData = trust[0];
  const trustMaxLimit = parseFloat(trustData.maxSingleBondLimit || "0");
  const trustAggregateLimit = parseFloat(trustData.aggregateBondLimit || "0");
  const trustCurrentExposure = parseFloat(trustData.currentExposure || "0");
  const insuranceThreshold = parseFloat(trustData.requiresInsuranceAbove || "0");

  if (bondPenalSum > trustMaxLimit) {
    return {
      decision: "DECLINED",
      collateralRequiredAmount: 0,
      collateralPercentage: 0,
      collateralTypeAllowed: [],
      indemnityRequired: "N/A",
      insuranceRequired: "N/A",
      reasoning: `Bond penal sum ($${bondPenalSum.toLocaleString()}) exceeds trust's single bond limit ($${trustMaxLimit.toLocaleString()}).`
    };
  }

  const projectedExposure = trustCurrentExposure + bondPenalSum;
  if (projectedExposure > trustAggregateLimit) {
    return {
      decision: "DECLINED",
      collateralRequiredAmount: 0,
      collateralPercentage: 0,
      collateralTypeAllowed: [],
      indemnityRequired: "N/A",
      insuranceRequired: "N/A",
      reasoning: `Aggregate exposure ($${projectedExposure.toLocaleString()}) would exceed trust's aggregate limit ($${trustAggregateLimit.toLocaleString()}).`
    };
  }

  let decision: SuretyUnderwritingDecision = "APPROVED";
  let collateralPercent = 0;
  let collateralAmount = 0;
  let reasoning = "";

  const isLowRiskPrincipal = principalRiskScore < LOW_RISK_SCORE_THRESHOLD;
  const isLowAmount = bondPenalSum < LOW_RISK_AMOUNT_THRESHOLD;
  const isModerateRiskPrincipal = principalRiskScore <= MODERATE_RISK_SCORE_THRESHOLD;
  const isModerateAmount = bondPenalSum <= MODERATE_RISK_AMOUNT_THRESHOLD;

  if (isLowRiskPrincipal && isLowAmount) {
    decision = "APPROVED";
    collateralPercent = 0;
    collateralAmount = 0;
    reasoning = `Low-risk principal (score: ${principalRiskScore}) with low bond amount ($${bondPenalSum.toLocaleString()}). No collateral required.`;
  } else if (isModerateRiskPrincipal && isModerateAmount) {
    decision = "APPROVED_WITH_COLLATERAL";
    collateralPercent = MODERATE_COLLATERAL_PERCENT;
    collateralAmount = bondPenalSum * collateralPercent;
    reasoning = `Moderate-risk principal (score: ${principalRiskScore}) with moderate bond amount ($${bondPenalSum.toLocaleString()}). 25% collateral required.`;
  } else {
    decision = "APPROVED_WITH_COLLATERAL";
    collateralPercent = 1.0;
    collateralAmount = bondPenalSum;
    reasoning = `High-risk case (score: ${principalRiskScore}, amount: $${bondPenalSum.toLocaleString()}). Full collateral required.`;
  }

  const insuranceRequired = bondPenalSum > insuranceThreshold && insuranceThreshold > 0 ? "YES" : "NO";
  if (insuranceRequired === "YES") {
    reasoning += ` Insurance required as bond exceeds $${insuranceThreshold.toLocaleString()} threshold.`;
  }

  return {
    decision,
    collateralRequiredAmount: Math.round(collateralAmount * 100) / 100,
    collateralPercentage: collateralPercent * 100,
    collateralTypeAllowed: ["CASH", "ILOC"],
    indemnityRequired: "YES",
    insuranceRequired,
    reasoning
  };
}

export async function createSuretyCase(
  input: SuretyUnderwritingInput,
  underwriterUserId: number,
  underwritingResult: SuretyUnderwritingResult
): Promise<SuretyCase> {
  const caseData = await db.insert(suretyCases).values({
    bondId: input.bondId,
    suretyTrustId: input.suretyTrustId,
    status: underwritingResult.decision === "DECLINED" ? "DECLINED" : "IN_REVIEW",
    bondType: "JUDGMENT",
    bondPenalSum: input.bondPenalSum.toString(),
    principalId: input.principalId,
    principalRiskScore: input.principalRiskScore.toString(),
    collateralRequiredAmount: underwritingResult.collateralRequiredAmount.toString(),
    collateralTypeAllowed: underwritingResult.collateralTypeAllowed,
    indemnityRequired: underwritingResult.indemnityRequired,
    insuranceRequired: underwritingResult.insuranceRequired,
    underwriterUserId,
    decisionAt: new Date(),
    notes: underwritingResult.reasoning
  }).returning();

  if (caseData.length > 0) {
    await db.update(bonds).set({
      suretyCaseId: caseData[0].id,
      suretyTrustId: input.suretyTrustId,
      suretyStatus: underwritingResult.decision === "DECLINED" ? "DECLINED" : "IN_UNDERWRITING"
    }).where(eq(bonds.id, input.bondId));
  }

  return caseData[0];
}

export async function approveSuretyCase(caseId: number): Promise<SuretyCase | null> {
  const existing = await db.select().from(suretyCases).where(eq(suretyCases.id, caseId)).limit(1);
  if (!existing.length) return null;

  const caseData = existing[0];
  const collateralRequired = parseFloat(caseData.collateralRequiredAmount || "0");
  const newStatus = collateralRequired > 0 ? "APPROVED_WITH_COLLATERAL" : "APPROVED";

  const updated = await db.update(suretyCases).set({
    status: newStatus,
    decisionAt: new Date()
  }).where(eq(suretyCases.id, caseId)).returning();

  if (updated.length > 0) {
    await db.update(bonds).set({
      suretyStatus: "APPROVED"
    }).where(eq(bonds.id, caseData.bondId));

    const trust = await db.select().from(suretyTrusts).where(eq(suretyTrusts.id, caseData.suretyTrustId)).limit(1);
    if (trust.length) {
      const currentExposure = parseFloat(trust[0].currentExposure || "0");
      const bondPenalSum = parseFloat(caseData.bondPenalSum || "0");
      await db.update(suretyTrusts).set({
        currentExposure: (currentExposure + bondPenalSum).toString()
      }).where(eq(suretyTrusts.id, caseData.suretyTrustId));
    }
  }

  return updated[0] || null;
}

export async function declineSuretyCase(caseId: number, reason?: string): Promise<SuretyCase | null> {
  const existing = await db.select().from(suretyCases).where(eq(suretyCases.id, caseId)).limit(1);
  if (!existing.length) return null;

  const caseData = existing[0];
  const updated = await db.update(suretyCases).set({
    status: "DECLINED",
    decisionAt: new Date(),
    notes: reason || caseData.notes
  }).where(eq(suretyCases.id, caseId)).returning();

  if (updated.length > 0) {
    await db.update(bonds).set({
      suretyStatus: "DECLINED"
    }).where(eq(bonds.id, caseData.bondId));
  }

  return updated[0] || null;
}

export async function recordCollateralPosted(
  caseId: number, 
  collateralType: "CASH" | "ILOC",
  amount: number,
  ilocDetails?: { bankName?: string; reference?: string }
): Promise<void> {
  const existing = await db.select().from(suretyCollateral).where(eq(suretyCollateral.caseId, caseId)).limit(1);
  
  const caseRecord = await db.select().from(suretyCases).where(eq(suretyCases.id, caseId)).limit(1);
  if (!caseRecord.length) {
    throw new Error("Case not found");
  }

  const requiredAmount = parseFloat(caseRecord[0].collateralRequiredAmount || "0");

  if (existing.length) {
    await db.update(suretyCollateral).set({
      postedAmount: amount.toString(),
      collateralType,
      ilocBankName: ilocDetails?.bankName,
      ilocReference: ilocDetails?.reference,
      heldFrom: new Date(),
      status: amount >= requiredAmount ? "POSTED" : "PENDING"
    }).where(eq(suretyCollateral.caseId, caseId));
  } else {
    await db.insert(suretyCollateral).values({
      caseId,
      requiredAmount: requiredAmount.toString(),
      postedAmount: amount.toString(),
      collateralType,
      ilocBankName: ilocDetails?.bankName,
      ilocReference: ilocDetails?.reference,
      heldFrom: new Date(),
      status: amount >= requiredAmount ? "POSTED" : "PENDING"
    });
  }

  if (amount >= requiredAmount) {
    await db.update(suretyCases).set({
      status: "DOCS_PENDING_SIGNATURE"
    }).where(eq(suretyCases.id, caseId));
  }
}

export async function activateSuretyCase(caseId: number): Promise<SuretyCase | null> {
  const updated = await db.update(suretyCases).set({
    status: "ACTIVE"
  }).where(eq(suretyCases.id, caseId)).returning();

  if (updated.length > 0) {
    await db.update(bonds).set({
      suretyStatus: "APPROVED"
    }).where(eq(bonds.id, updated[0].bondId));
  }

  return updated[0] || null;
}

export async function releaseSuretyCase(caseId: number): Promise<SuretyCase | null> {
  const existing = await db.select().from(suretyCases).where(eq(suretyCases.id, caseId)).limit(1);
  if (!existing.length) return null;

  const caseData = existing[0];
  const updated = await db.update(suretyCases).set({
    status: "RELEASED"
  }).where(eq(suretyCases.id, caseId)).returning();

  if (updated.length > 0) {
    await db.update(suretyCollateral).set({
      status: "RELEASED",
      releasedAt: new Date()
    }).where(eq(suretyCollateral.caseId, caseId));

    const trust = await db.select().from(suretyTrusts).where(eq(suretyTrusts.id, caseData.suretyTrustId)).limit(1);
    if (trust.length) {
      const currentExposure = parseFloat(trust[0].currentExposure || "0");
      const bondPenalSum = parseFloat(caseData.bondPenalSum || "0");
      await db.update(suretyTrusts).set({
        currentExposure: Math.max(0, currentExposure - bondPenalSum).toString()
      }).where(eq(suretyTrusts.id, caseData.suretyTrustId));
    }
  }

  return updated[0] || null;
}

export async function getSuretyCasesForTrust(trustId: number): Promise<SuretyCase[]> {
  return db.select().from(suretyCases).where(eq(suretyCases.suretyTrustId, trustId));
}

export async function getAllSuretyCases(): Promise<SuretyCase[]> {
  return db.select().from(suretyCases);
}

export async function getSuretyCaseById(caseId: number): Promise<SuretyCase | null> {
  const result = await db.select().from(suretyCases).where(eq(suretyCases.id, caseId)).limit(1);
  return result[0] || null;
}

export async function getAllSuretyTrusts(): Promise<SuretyTrust[]> {
  return db.select().from(suretyTrusts);
}

export async function getSuretyTrustById(trustId: number): Promise<SuretyTrust | null> {
  const result = await db.select().from(suretyTrusts).where(eq(suretyTrusts.id, trustId)).limit(1);
  return result[0] || null;
}

export async function createSuretyTrust(data: {
  name: string;
  trustType?: string;
  maxSingleBondLimit: number;
  aggregateBondLimit: number;
  requiresInsuranceAbove?: number;
  notes?: string;
}): Promise<SuretyTrust> {
  const result = await db.insert(suretyTrusts).values({
    name: data.name,
    trustType: data.trustType || "IRREVOCABLE",
    canActAsSurety: true,
    allowedBondTypes: ["JUDGMENT"],
    maxSingleBondLimit: data.maxSingleBondLimit.toString(),
    aggregateBondLimit: data.aggregateBondLimit.toString(),
    currentExposure: "0",
    requiresInsuranceAbove: (data.requiresInsuranceAbove || 0).toString(),
    notes: data.notes
  }).returning();

  return result[0];
}

export async function updateSuretyTrust(
  trustId: number, 
  data: Partial<{
    name: string;
    trustType: string;
    canActAsSurety: boolean;
    maxSingleBondLimit: number;
    aggregateBondLimit: number;
    requiresInsuranceAbove: number;
    notes: string;
  }>
): Promise<SuretyTrust | null> {
  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.trustType !== undefined) updateData.trustType = data.trustType;
  if (data.canActAsSurety !== undefined) updateData.canActAsSurety = data.canActAsSurety;
  if (data.maxSingleBondLimit !== undefined) updateData.maxSingleBondLimit = data.maxSingleBondLimit.toString();
  if (data.aggregateBondLimit !== undefined) updateData.aggregateBondLimit = data.aggregateBondLimit.toString();
  if (data.requiresInsuranceAbove !== undefined) updateData.requiresInsuranceAbove = data.requiresInsuranceAbove.toString();
  if (data.notes !== undefined) updateData.notes = data.notes;

  const result = await db.update(suretyTrusts).set(updateData).where(eq(suretyTrusts.id, trustId)).returning();
  return result[0] || null;
}
