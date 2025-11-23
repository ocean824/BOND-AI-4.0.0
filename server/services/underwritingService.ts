// server/services/underwritingService.ts
import OpenAI from "openai";
import { config } from "../config";

/**
 * Party-level underwriting input.
 */
export interface UnderwritingPartyInput {
  name: string;
  role: "debtor" | "guarantor" | "vassalee" | "other";
  type?: "individual" | "business" | "bank" | "other";
  taxBracketPct?: number | null;
  annualRevenue?: number | null;
  attachedAssetValue?: number | null;
  riskManagementCoverage?: number | null;
  expectedCollectionPct?: number | null; // 0–100
  notes?: string | null;
}

/**
 * Case-level underwriting input.
 * This encodes all the items from your checklist (1–20).
 */
export interface UnderwritingCaseInput {
  title: string;
  primaryDebtorName: string;

  // Core economics
  claimAmount: number;
  baseBondAmount?: number | null;
  attachedAssetsValue?: number | null;       // 17) assets attached
  vassaleesAnnualRevenue?: number | null;    // 18) annual revenue of vassalees
  riskManagementCoverage?: number | null;    // 19) risk management insurance

  // Dates / filings
  finalNoticeToPerfectBondDate?: string | null;
  secondFilingDate?: string | null;

  // Qualitative underwriting notes (from your list)
  creditBankingSummary?: string | null;              // 3)
  addressesSummary?: string | null;                  // 4)
  licensesAndAssociationsSummary?: string | null;    // 5)
  realEstateSummary?: string | null;                 // 7)
  appraisalSummary?: string | null;                  // 8)
  highestBestUseSummary?: string | null;             // 9)
  loansAndLiensSummary?: string | null;              // 10)
  countyFilingsSummary?: string | null;              // 13)
  secretaryOfStateSummary?: string | null;           // 14)
  riskManagementNotes?: string | null;               // 19 extra detail

  canPlaceRealEstateLien?: boolean | null;           // 11)
  canPlaceBusinessLien?: boolean | null;             // 12)

  notes?: string | null;                             // general notes
}

/**
 * Computed metrics based on your 50% rules and multi-party math.
 */
export interface UnderwritingMetrics {
  claimAmount: number;
  baseBondAmount: number | null;

  attachedAssetsValue: number;
  assetRecoveryPct: number;
  estimatedAssetRecovery: number;

  vassaleesAnnualRevenue: number;
  revenueRecoveryPct: number;
  estimatedRevenueRecovery: number;

  riskManagementCoverage: number;
  insuranceRecoveryPct: number;
  estimatedInsuranceRecovery: number;

  estimatedTotalRecovery: number;

  partiesCount: number;
  averagePartyCollectionPct: number | null;
  totalMultiPartyClaims: number;
  estimatedCollectionFromParties: number;
  collectionAsPctOfClaim: number | null;
  isCollectionGreaterThanClaim: boolean | null;
}

/**
 * Canonical object that you can store/return.
 */
export interface UnderwritingCaseWithMetrics {
  caseInput: UnderwritingCaseInput;
  parties: UnderwritingPartyInput[];
  metrics: UnderwritingMetrics;
  narrative?: string | null;
}

const openai = config.openai.enabled
  ? new OpenAI({
      baseURL: config.openai.baseUrl,
      apiKey: config.openai.apiKey,
    })
  : null;

/**
 * Pure calculation logic – no AI, no randomness.
 * Implements:
 *  - 50% of attached assets
 *  - 50% of vassalees' annual revenue
 *  - 50% of risk management coverage
 *  - Multi-party collection math based on average collection %.
 */
export function computeUnderwritingMetrics(
  caseInput: UnderwritingCaseInput,
  parties: UnderwritingPartyInput[],
): UnderwritingMetrics {
  const claimAmount = safeNumber(caseInput.claimAmount);
  const baseBondAmount =
    caseInput.baseBondAmount != null ? safeNumber(caseInput.baseBondAmount) : null;

  const attachedAssetsValue = safeNumber(caseInput.attachedAssetsValue);
  const vassaleesAnnualRevenue = safeNumber(caseInput.vassaleesAnnualRevenue);
  const riskManagementCoverage = safeNumber(caseInput.riskManagementCoverage);

  // Your rules 17, 18, 19: 50% each
  const assetRecoveryPct = 0.5;
  const revenueRecoveryPct = 0.5;
  const insuranceRecoveryPct = 0.5;

  const estimatedAssetRecovery = attachedAssetsValue * assetRecoveryPct;
  const estimatedRevenueRecovery = vassaleesAnnualRevenue * revenueRecoveryPct;
  const estimatedInsuranceRecovery = riskManagementCoverage * insuranceRecoveryPct;

  const estimatedTotalRecovery =
    estimatedAssetRecovery + estimatedRevenueRecovery + estimatedInsuranceRecovery;

  // Rule 20: multi-party collection math
  const partiesCount = parties.length;

  const collectionPcts: number[] = parties
    .map((p) =>
      p.expectedCollectionPct != null ? safePercent(p.expectedCollectionPct) : null,
    )
    .filter((v): v is number => v !== null);

  let averagePartyCollectionPct: number | null = null;
  if (collectionPcts.length > 0) {
    const sum = collectionPcts.reduce((acc, v) => acc + v, 0);
    averagePartyCollectionPct = sum / collectionPcts.length;
  } else {
    // Default if user does not provide per-party %:
    averagePartyCollectionPct = 50;
  }

  const totalMultiPartyClaims = claimAmount * partiesCount;

  let estimatedCollectionFromParties = 0;
  let collectionAsPctOfClaim: number | null = null;
  let isCollectionGreaterThanClaim: boolean | null = null;

  if (averagePartyCollectionPct != null) {
    estimatedCollectionFromParties =
      totalMultiPartyClaims * (averagePartyCollectionPct / 100);

    if (claimAmount > 0) {
      collectionAsPctOfClaim = estimatedCollectionFromParties / claimAmount;
      isCollectionGreaterThanClaim = collectionAsPctOfClaim >= 1;
    }
  }

  return {
    claimAmount,
    baseBondAmount,
    attachedAssetsValue,
    assetRecoveryPct,
    estimatedAssetRecovery,
    vassaleesAnnualRevenue,
    revenueRecoveryPct,
    estimatedRevenueRecovery,
    riskManagementCoverage,
    insuranceRecoveryPct,
    estimatedInsuranceRecovery,
    estimatedTotalRecovery,
    partiesCount,
    averagePartyCollectionPct,
    totalMultiPartyClaims,
    estimatedCollectionFromParties,
    collectionAsPctOfClaim,
    isCollectionGreaterThanClaim,
  };
}

/**
 * AI narrative – explains the metrics in plain English.
 * IMPORTANT: uses ONLY provided numbers, never fabricates.
 */
export async function generateUnderwritingNarrative(
  caseInput: UnderwritingCaseInput,
  parties: UnderwritingPartyInput[],
  metrics: UnderwritingMetrics,
): Promise<string | null> {
  if (!openai) return null;

  const SYSTEM_PROMPT = `
You are an assistant summarizing an underwriting analysis for a bond or judgment-based claim.

Rules:
- Use ONLY the numeric and textual data provided by the user.
- Do NOT invent any new amounts, percentages, parties, or assets.
- Explain how the 50% rules for assets, vassalees' revenue, and risk management coverage
  were applied.
- Explain the multi-party collection math: total claims across parties and estimated
  collection, compared to the original claim amount.
- Refer to qualitative notes (addresses, licenses, real estate, filings) only as they appear.
- Do NOT give investment advice. This is informational and educational only.
- Keep the output to 3–6 short paragraphs or bullet-point sections.
- Never reveal chain-of-thought; output only conclusions and explanations.
  `.trim();

  const payload = { caseInput, parties, metrics };

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content:
          "Summarize the underwriting case and metrics below. All numbers are real and already computed.\n\n" +
          JSON.stringify(payload, null, 2),
      },
    ],
    max_completion_tokens: 1000,
  });

  const content = completion.choices[0]?.message?.content;
  return content ?? null;
}

function safeNumber(value: unknown): number {
  if (value == null) return 0;
  const n = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : 0;
}

function safePercent(value: unknown): number {
  const n = safeNumber(value);
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}
