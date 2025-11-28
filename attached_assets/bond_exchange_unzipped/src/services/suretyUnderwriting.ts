import { db, suretyCases, suretyTrusts } from "../db";
import { eq } from "drizzle-orm";

export type UnderwritingDecision =
  | "DECLINED"
  | "APPROVED"
  | "APPROVED_WITH_COLLATERAL";

export interface SuretyUnderwritingResult {
  decision: UnderwritingDecision;
  reasons: string[];
  collateralRequired: number;
  collateralTypesAllowed: ("CASH" | "ILOC")[];
  insuranceRequired: boolean;
}

/**
 * Very simplified surety underwriting for JUDGMENT bonds.
 * You can replace this with a more complex rules engine later.
 */
export async function underwriteJudgmentBondSurety(
  caseId: string
): Promise<SuretyUnderwritingResult> {
  const [sc] = await db.select().from(suretyCases).where(eq(suretyCases.id, caseId));
  if (!sc) {
    throw new Error("Surety case not found");
  }

  const [trust] = await db
    .select()
    .from(suretyTrusts)
    .where(eq(suretyTrusts.id, sc.suretyTrustId));

  if (!trust) {
    throw new Error("Surety trust not found");
  }

  const reasons: string[] = [];
  const bondPenalSum = Number(sc.bondPenalSum);
  const currentExposure = Number(trust.currentExposure);
  const maxSingle = Number(trust.maxSingleBondLimit);
  const aggregate = Number(trust.aggregateBondLimit);
  const principalRiskScore = sc.principalRiskScore
    ? Number(sc.principalRiskScore)
    : 50; // default mid-risk if not set

  // Basic checks on trust authority and limits
  if (!trust.canActAsSurety) {
    reasons.push("Trust is not authorized to act as surety.");
    return {
      decision: "DECLINED",
      reasons,
      collateralRequired: 0,
      collateralTypesAllowed: ["CASH", "ILOC"],
      insuranceRequired: false,
    };
  }

  // max single bond limit
  if (bondPenalSum > maxSingle) {
    reasons.push("Bond penal sum exceeds trust's single bond limit.");
  }

  // aggregate exposure
  if (currentExposure + bondPenalSum > aggregate) {
    reasons.push("Bond would exceed trust's aggregate exposure limit.");
  }

  if (reasons.length > 0) {
    return {
      decision: "DECLINED",
      reasons,
      collateralRequired: 0,
      collateralTypesAllowed: ["CASH", "ILOC"],
      insuranceRequired: false,
    };
  }

  // Collateral logic: very basic example following your narrative
  let collateralRequired = 0;
  if (principalRiskScore <= 30 && bondPenalSum <= 25000) {
    collateralRequired = 0;
    reasons.push("Low risk principal and small bond penal sum; no collateral required.");
  } else if (principalRiskScore <= 50 && bondPenalSum <= 100000) {
    collateralRequired = bondPenalSum * 0.25;
    reasons.push("Moderate risk or moderate bond size; 25% collateral required.");
  } else {
    collateralRequired = bondPenalSum;
    reasons.push("High risk or large bond; full collateral required.");
  }

  const insuranceThreshold = Number(trust.requiresInsuranceAbove);
  const insuranceRequired = bondPenalSum > insuranceThreshold && insuranceThreshold > 0;
  if (insuranceRequired) {
    reasons.push(
      `Bond exceeds insurance threshold (${insuranceThreshold}); insurance recommended or required.`
    );
  }

  const decision: UnderwritingDecision =
    collateralRequired === 0 ? "APPROVED" : "APPROVED_WITH_COLLATERAL";

  return {
    decision,
    reasons,
    collateralRequired,
    collateralTypesAllowed: ["CASH", "ILOC"],
    insuranceRequired,
  };
}
