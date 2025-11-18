import type { PricingScenario } from "@shared/schema";

export interface PricingInput {
  judgmentAmount: number;
  targetIRR: number;
  discountRate: number;
  expectedRecoveryPct: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function buildMultiScenarioPricing(input: PricingInput): PricingScenario[] {
  const { judgmentAmount, targetIRR, discountRate, expectedRecoveryPct } = input;

  // Base scenario
  const baseScenario: PricingScenario = {
    scenario: "base",
    targetIRR,
    discountRate,
    expectedRecoveryPct,
    judgmentAmount,
    expectedRecoveryAmount: judgmentAmount * (expectedRecoveryPct / 100),
    recommendedPurchasePrice: 0,
    note: "Standard market conditions with baseline assumptions",
  };
  baseScenario.recommendedPurchasePrice = 
    baseScenario.expectedRecoveryAmount * (1 - discountRate / 100);

  // Optimistic scenario (better recovery, lower discount)
  const optimisticRecovery = clamp(expectedRecoveryPct + 10, 5, 95);
  const optimisticDiscount = clamp(discountRate - 5, 5, 95);
  const optimisticScenario: PricingScenario = {
    scenario: "optimistic",
    targetIRR: targetIRR + 2,
    discountRate: optimisticDiscount,
    expectedRecoveryPct: optimisticRecovery,
    judgmentAmount,
    expectedRecoveryAmount: judgmentAmount * (optimisticRecovery / 100),
    recommendedPurchasePrice: 0,
    note: "Favorable conditions with higher expected recovery",
  };
  optimisticScenario.recommendedPurchasePrice = 
    optimisticScenario.expectedRecoveryAmount * (1 - optimisticDiscount / 100);

  // Stressed scenario (lower recovery, higher discount)
  const stressedRecovery = clamp(expectedRecoveryPct - 15, 5, 95);
  const stressedDiscount = clamp(discountRate + 10, 5, 95);
  const stressedScenario: PricingScenario = {
    scenario: "stressed",
    targetIRR,
    discountRate: stressedDiscount,
    expectedRecoveryPct: stressedRecovery,
    judgmentAmount,
    expectedRecoveryAmount: judgmentAmount * (stressedRecovery / 100),
    recommendedPurchasePrice: 0,
    note: "Conservative projections under adverse conditions",
  };
  stressedScenario.recommendedPurchasePrice = 
    stressedScenario.expectedRecoveryAmount * (1 - stressedDiscount / 100);

  return [baseScenario, optimisticScenario, stressedScenario];
}
