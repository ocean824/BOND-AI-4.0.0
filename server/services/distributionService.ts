import { db } from "../db";
import { eq, and, inArray } from "drizzle-orm";
import { bonds, bondAssignments, distributions, users } from "@shared/schema";
import { createImmutableEvent, type ImmutableEventType } from "./immutableEventService";
import { postJournalEntry, ACCOUNT_CODES } from "./ledgerService";
import { getUncachableStripeClient } from "../stripeClient";

// Constants for distribution rules
const RECOUPMENT_THRESHOLD = 10000; // $10,000 recoupment requirement
const DISTRIBUTION_SPLIT = 1 / 3; // 1/3 split after recoupment
const MINIMUM_PAYOUT_AMOUNT = 1.00; // Minimum $1 payout to avoid micro-transactions

export interface ReceiptData {
  bondId: number;
  amount: number;
  description: string;
  receivedAt?: Date;
}

export interface PayoutResult {
  investorId: number;
  investorEmail: string;
  amount: number;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  stripeTransferId?: string;
  errorMessage?: string;
}

/**
 * Records a receipt for a bond
 * Creates a distribution record with recoupment calculation
 */
export async function recordReceipt(data: ReceiptData): Promise<typeof distributions.$inferSelect | null> {
  const [bond] = await db.select().from(bonds).where(eq(bonds.id, data.bondId));
  if (!bond) throw new Error("Bond not found");

  // Calculate recoupment status
  const allExistingDistributions = await db
    .select()
    .from(distributions)
    .where(and(
      eq(distributions.bondId, data.bondId),
      eq(distributions.status, "EXECUTED")
    ));

  const totalRecouped = allExistingDistributions
    ? allExistingDistributions.reduce((sum: number, d: typeof distributions.$inferSelect) => sum + parseFloat(String(d.recoupmentAmount)), 0)
    : 0;

  const remainingRecoupment = Math.max(0, RECOUPMENT_THRESHOLD - totalRecouped);
  const recoupmentAmount = Math.min(data.amount, remainingRecoupment);
  const distributableAmount = data.amount - recoupmentAmount;

  // Create distribution record
  const [distribution] = await db.insert(distributions).values({
    bondId: data.bondId,
    distributionType: "INTEREST", // Default to interest, could be determined by input
    totalAmount: String(data.amount),
    recoupmentAmount: String(recoupmentAmount),
    distributionAmount: String(distributableAmount),
    status: "PENDING",
    metadata: {
      description: data.description,
      receivedAt: data.receivedAt || new Date(),
    },
  }).returning();

  console.log(`[Distribution] Created distribution #${distribution.id} for bond ${data.bondId}: $${data.amount} (recoupment: $${recoupmentAmount}, distributable: $${distributableAmount})`);

  return distribution;
}

/**
 * Executes distribution - calculates payouts, creates ledger entries, and processes actual payouts
 * Now includes real Stripe transfer execution
 */
export async function executeDistribution(
  distributionId: number,
  options?: { dryRun?: boolean; skipActualPayouts?: boolean }
): Promise<{
  distribution: typeof distributions.$inferSelect;
  payouts: PayoutResult[];
  totalPaidOut: number;
  totalFailed: number;
}> {
  const [distribution] = await db
    .select()
    .from(distributions)
    .where(eq(distributions.id, distributionId));

  if (!distribution || distribution.status !== "PENDING") {
    throw new Error("Distribution not found or already executed");
  }

  // Get all active assignments for this bond
  const assignments = await db
    .select({
      assignmentId: bondAssignments.id,
      investorId: bondAssignments.investorId,
      ownershipPercent: bondAssignments.ownershipPercent,
      faceValueAmount: bondAssignments.faceValueAmount,
      email: users.email,
      name: users.name,
      stripeCustomerId: users.stripeCustomerId,
    })
    .from(bondAssignments)
    .innerJoin(users, eq(bondAssignments.investorId, users.id))
    .where(and(
      eq(bondAssignments.bondId, distribution.bondId),
      eq(bondAssignments.status, "ACTIVE")
    ));

  if (assignments.length === 0) {
    throw new Error("No active assignments for this bond");
  }

  const distributableAmount = parseFloat(String(distribution.distributionAmount));
  const totalOwnership = assignments.reduce(
    (sum, a) => sum + parseFloat(String(a.ownershipPercent)),
    0
  );

  // Calculate payouts for each investor
  const payoutCalculations = assignments.map(a => {
    const ownershipShare = parseFloat(String(a.ownershipPercent)) / totalOwnership;
    const payoutAmount = distributableAmount * ownershipShare;
    
    return {
      investorId: a.investorId,
      investorEmail: a.email || "",
      investorName: a.name || "",
      stripeCustomerId: a.stripeCustomerId,
      amount: payoutAmount,
    };
  });

  const payouts: PayoutResult[] = [];
  let totalPaidOut = 0;
  let totalFailed = 0;

  // Process actual payouts via Stripe (unless skipped or dry run)
  if (!options?.dryRun && !options?.skipActualPayouts) {
    const stripe = await getUncachableStripeClient();

    for (const payout of payoutCalculations) {
      // Skip micro-payments
      if (payout.amount < MINIMUM_PAYOUT_AMOUNT) {
        payouts.push({
          investorId: payout.investorId,
          investorEmail: payout.investorEmail,
          amount: payout.amount,
          status: "SKIPPED",
          errorMessage: `Amount below minimum payout threshold ($${MINIMUM_PAYOUT_AMOUNT})`,
        });
        continue;
      }

      // Check if investor has Stripe customer ID
      if (!payout.stripeCustomerId) {
        payouts.push({
          investorId: payout.investorId,
          investorEmail: payout.investorEmail,
          amount: payout.amount,
          status: "FAILED",
          errorMessage: "No Stripe customer ID configured for investor",
        });
        totalFailed += payout.amount;
        continue;
      }

      try {
        // Create Stripe transfer to investor
        // Note: In production, you'd typically use Stripe Connect for payouts
        // This is a simplified version using refunds or transfers
        const transfer = await stripe.transfers.create({
          amount: Math.round(payout.amount * 100), // Convert to cents
          currency: "usd",
          destination: payout.stripeCustomerId,
          description: `Distribution payout for bond ${distribution.bondId}`,
          metadata: {
            distributionId: distributionId.toString(),
            investorId: payout.investorId.toString(),
            bondId: distribution.bondId.toString(),
          },
        });

        payouts.push({
          investorId: payout.investorId,
          investorEmail: payout.investorEmail,
          amount: payout.amount,
          status: "SUCCESS",
          stripeTransferId: transfer.id,
        });

        totalPaidOut += payout.amount;

        console.log(`[Distribution] Paid $${payout.amount.toFixed(2)} to investor ${payout.investorId} (${payout.investorEmail})`);
      } catch (error: any) {
        console.error(`[Distribution] Failed to pay investor ${payout.investorId}:`, error.message);

        payouts.push({
          investorId: payout.investorId,
          investorEmail: payout.investorEmail,
          amount: payout.amount,
          status: "FAILED",
          errorMessage: error.message || "Unknown error",
        });

        totalFailed += payout.amount;
      }
    }
  } else {
    // Dry run or skipped - just record calculations
    for (const payout of payoutCalculations) {
      payouts.push({
        investorId: payout.investorId,
        investorEmail: payout.investorEmail,
        amount: payout.amount,
        status: options?.dryRun ? "SKIPPED" : "SUCCESS",
      });
      totalPaidOut += payout.amount;
    }
  }

  // Update distribution status
  await db
    .update(distributions)
    .set({
      status: "EXECUTED",
      executedAt: new Date(),
      metadata: {
        ...((distribution.metadata as any) || {}),
        payouts,
        totalPaidOut,
        totalFailed,
        dryRun: options?.dryRun || false,
      },
    })
    .where(eq(distributions.id, distributionId));

  // Create ledger entries for distribution
  const recoupment = parseFloat(String(distribution.recoupmentAmount));

  await postJournalEntry({
    type: "DISTRIBUTION",
    description: `Distribution for bond ${distribution.bondId}`,
    currency: "USD",
    lines: [
      {
        accountCode: ACCOUNT_CODES.CASH_HOLDING,
        debit: totalPaidOut + recoupment,
        credit: 0,
        description: "Cash received for distribution",
      },
      {
        accountCode: ACCOUNT_CODES.RECOUPMENT_RESERVE,
        debit: 0,
        credit: recoupment,
        description: `Recoupment reserve ($${recoupment.toFixed(2)})`,
      },
      {
        accountCode: ACCOUNT_CODES.DISTRIBUTABLE_EARNINGS,
        debit: 0,
        credit: totalPaidOut,
        description: "Distributable earnings allocated",
      },
    ],
    metadata: {
      distributionId,
      bondId: distribution.bondId,
      recoupmentAmount: recoupment,
      totalPayout: totalPaidOut,
      investorCount: payouts.length,
    },
  });

  // Create individual investor payable entries for successful payouts
  for (const payout of payouts) {
    if (payout.status === "SUCCESS") {
      await postJournalEntry({
        type: "DISTRIBUTION_PAYOUT",
        description: `Payout to investor ${payout.investorId}`,
        currency: "USD",
        lines: [
          {
            accountCode: ACCOUNT_CODES.DISTRIBUTABLE_EARNINGS,
            debit: payout.amount,
            credit: 0,
            description: `Payout allocation`,
          },
          {
            accountCode: ACCOUNT_CODES.INVESTOR_PAYABLE,
            debit: 0,
            credit: payout.amount,
            description: `Payout to investor ${payout.investorId}`,
          },
        ],
        metadata: {
          distributionId,
          investorId: payout.investorId,
          payoutAmount: payout.amount,
          stripeTransferId: payout.stripeTransferId,
        },
      });

      // Create immutable event for each successful payout
      await createImmutableEvent({
        type: "DISTRIBUTION_EXECUTED" as ImmutableEventType,
        actorId: payout.investorId,
        actorType: "SYSTEM",
        entityType: "DISTRIBUTION",
        entityId: distributionId.toString(),
        payload: {
          distributionId,
          investorId: payout.investorId,
          investorEmail: payout.investorEmail,
          amount: payout.amount,
          stripeTransferId: payout.stripeTransferId,
          bondId: distribution.bondId,
        },
        correlationId: `distribution-${distributionId}`,
      });
    }
  }

  console.log(`[Distribution] Executed distribution #${distributionId}: ${payouts.length} payouts, $${totalPaidOut.toFixed(2)} paid, $${totalFailed.toFixed(2)} failed`);

  return {
    distribution: { ...distribution, status: "EXECUTED" as const },
    payouts,
    totalPaidOut,
    totalFailed,
  };
}

/**
 * Gets distribution history for a bond
 */
export async function getBondDistributions(bondId: number): Promise<typeof distributions.$inferSelect[]> {
  const dists = await db
    .select()
    .from(distributions)
    .where(eq(distributions.bondId, bondId))
    .orderBy((d) => d.createdAt);

  return dists;
}

/**
 * Gets distribution history for an investor
 */
export async function getInvestorDistributions(investorId: number): Promise<{
  bondId: number;
  bondName: string;
  distributionType: string;
  totalAmount: number;
  recoupmentAmount: number;
  distributionAmount: number;
  myPayout: number;
  status: string;
  executedAt: Date | null;
}[]> {
  const investorAssignments = await db
    .select({ 
      bondId: bondAssignments.bondId,
      ownershipPercent: bondAssignments.ownershipPercent,
    })
    .from(bondAssignments)
    .where(eq(bondAssignments.investorId, investorId));

  const bondIds = Array.from(new Set(investorAssignments.map(a => a.bondId)));
   
  const distributionData = await db
    .select({
      bondId: distributions.bondId,
      bondName: bonds.name,
      distributionType: distributions.distributionType,
      totalAmount: distributions.totalAmount,
      recoupmentAmount: distributions.recoupmentAmount,
      distributionAmount: distributions.distributionAmount,
      status: distributions.status,
      executedAt: distributions.executedAt,
    })
    .from(distributions)
    .innerJoin(bonds, eq(distributions.bondId, bonds.id))
    .where(inArray(distributions.bondId, bondIds));

  return distributionData.map((d) => {
    const assignment = investorAssignments.find(a => a.bondId === d.bondId);
    const ownershipPercent = assignment ? parseFloat(String(assignment.ownershipPercent)) : 0;
    const distributionAmount = parseFloat(String(d.distributionAmount));
    const myPayout = (distributionAmount * ownershipPercent) / 100;

    return {
      bondId: d.bondId,
      bondName: d.bondName || "",
      distributionType: d.distributionType,
      totalAmount: parseFloat(String(d.totalAmount)),
      recoupmentAmount: parseFloat(String(d.recoupmentAmount)),
      distributionAmount,
      myPayout,
      status: d.status,
      executedAt: d.executedAt,
    };
  });
}

/**
 * Gets comprehensive distribution report for a bond
 */
export async function getDistributionReport(bondId: number): Promise<{
  bondId: number;
  totalReceived: number;
  totalRecouped: number;
  totalDistributed: number;
  investorCount: number;
  recoupmentComplete: boolean;
  remainingRecoupment: number;
  distributions: typeof distributions.$inferSelect[];
}> {
  const [bond] = await db.select().from(bonds).where(eq(bonds.id, bondId));
  if (!bond) throw new Error("Bond not found");

  const dists = await getBondDistributions(bondId);
  
  const totalReceived = dists.reduce(
    (sum, d) => sum + parseFloat(String(d.totalAmount)),
    0
  );
  
  const totalRecouped = dists
    .filter(d => d.status === "EXECUTED")
    .reduce((sum, d) => sum + parseFloat(String(d.recoupmentAmount)), 0);
  
  const totalDistributed = dists
    .filter(d => d.status === "EXECUTED")
    .reduce((sum, d) => sum + parseFloat(String(d.distributionAmount)), 0);

  const assignments = await db
    .select()
    .from(bondAssignments)
    .where(and(
      eq(bondAssignments.bondId, bondId),
      eq(bondAssignments.status, "ACTIVE")
    ));

  const remainingRecoupment = Math.max(0, RECOUPMENT_THRESHOLD - totalRecouped);

  return {
    bondId,
    totalReceived,
    totalRecouped,
    totalDistributed,
    investorCount: assignments.length,
    recoupmentComplete: totalRecouped >= RECOUPMENT_THRESHOLD,
    remainingRecoupment,
    distributions: dists,
  };
}

/**
 * Retries failed payouts from a distribution
 */
export async function retryFailedPayouts(distributionId: number): Promise<{
  retriedCount: number;
  successCount: number;
  failedCount: number;
  results: PayoutResult[];
}> {
  const [distribution] = await db
    .select()
    .from(distributions)
    .where(eq(distributions.id, distributionId));

  if (!distribution || distribution.status !== "EXECUTED") {
    throw new Error("Distribution not found or not executed");
  }

  const metadata = distribution.metadata as any;
  const previousPayouts = metadata?.payouts as PayoutResult[] || [];
  const failedPayouts = previousPayouts.filter(p => p.status === "FAILED");

  if (failedPayouts.length === 0) {
    return {
      retriedCount: 0,
      successCount: 0,
      failedCount: 0,
      results: [],
    };
  }

  const stripe = await getUncachableStripeClient();
  const results: PayoutResult[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (const failedPayout of failedPayouts) {
    // Get updated investor info
    const [investor] = await db
      .select()
      .from(users)
      .where(eq(users.id, failedPayout.investorId));

    if (!investor || !investor.stripeCustomerId) {
      results.push({
        ...failedPayout,
        status: "FAILED",
        errorMessage: "Investor still missing Stripe customer ID",
      });
      failedCount++;
      continue;
    }

    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(failedPayout.amount * 100),
        currency: "usd",
        destination: investor.stripeCustomerId,
        description: `Retry: Distribution payout for bond ${distribution.bondId}`,
        metadata: {
          distributionId: distributionId.toString(),
          investorId: failedPayout.investorId.toString(),
          bondId: distribution.bondId.toString(),
          retry: "true",
        },
      });

      results.push({
        ...failedPayout,
        status: "SUCCESS",
        stripeTransferId: transfer.id,
        errorMessage: undefined,
      });

      successCount++;
      console.log(`[Distribution] Retry successful for investor ${failedPayout.investorId}`);
    } catch (error: any) {
      results.push({
        ...failedPayout,
        status: "FAILED",
        errorMessage: error.message || "Unknown error",
      });
      failedCount++;
      console.error(`[Distribution] Retry failed for investor ${failedPayout.investorId}:`, error.message);
    }
  }

  // Update distribution metadata with retry results
  await db
    .update(distributions)
    .set({
      metadata: {
        ...metadata,
        payouts: [
          ...previousPayouts.filter(p => p.status !== "FAILED"),
          ...results,
        ],
        lastRetryAt: new Date().toISOString(),
      },
    })
    .where(eq(distributions.id, distributionId));

  return {
    retriedCount: failedPayouts.length,
    successCount,
    failedCount,
    results,
  };
}
