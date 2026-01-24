import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { auctions, auctionBids, bonds, users, exchangeTrades, exchangeSettlements, bondAssignments } from "@shared/schema";
import { createImmutableEvent, type ImmutableEventType } from "./immutableEventService";
import { postJournalEntry, type JournalEntryLine } from "./ledgerService";

export interface TradeData {
  auctionId: number;
  bondId: number;
  investorId: number;
  amount: string; // Purchase price in dollars
  faceValue: string; // Bond face value
  bondName: string;
  investorEmail: string;
  investorName: string;
}

export interface TradeRecord {
  id: number;
  auctionId: number;
  bondId: number;
  investorId: number;
  amount: string;
  status: "PENDING" | "PAID" | "SETTLED" | "FAILED" | "CANCELLED";
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  settlementId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Creates a trade record from a completed auction
 * Now uses database persistence instead of in-memory storage
 */
export async function createTradeFromAuction(auctionId: number): Promise<TradeRecord | null> {
  // Get auction with bond and bid details
  const [auction] = await db
    .select({
      id: auctions.id,
      bondId: auctions.bondId,
      reservePrice: auctions.reservePrice,
      winningBidId: auctions.winningBidId,
    })
    .from(auctions)
    .where(eq(auctions.id, auctionId));

  if (!auction || !auction.winningBidId) {
    return null;
  }

  const [winningBid] = await db
    .select({
      id: auctionBids.id,
      auctionId: auctionBids.auctionId,
      investorId: auctionBids.investorId,
      amount: auctionBids.amount,
      isDemo: auctionBids.isDemo,
    })
    .from(auctionBids)
    .where(eq(auctionBids.id, auction.winningBidId));

  if (!winningBid) {
    return null;
  }

  const [bond] = await db
    .select({
      id: bonds.id,
      name: bonds.name,
      faceValue: bonds.faceValue,
    })
    .from(bonds)
    .where(eq(bonds.id, auction.bondId));

  if (!bond) {
    return null;
  }

  const [investor] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, winningBid.investorId));

  if (!investor) {
    return null;
  }

  // Create trade record in database
  const [trade] = await db
    .insert(exchangeTrades)
    .values({
      auctionId: auction.id,
      bondId: bond.id,
      investorId: investor.id,
      amount: winningBid.amount,
      status: "PENDING",
      stripeCheckoutSessionId: null,
      stripePaymentIntentId: null,
      settlementId: null,
      isDemo: winningBid.isDemo || false,
    })
    .returning();

  // Create immutable event for trade creation
  await createImmutableEvent({
    type: "TRADE_CREATED" as ImmutableEventType,
    actorId: investor.id,
    actorType: "USER",
    entityType: "TRADE",
    entityId: trade.id.toString(),
    payload: {
      tradeId: trade.id,
      auctionId: auction.id,
      bondId: bond.id,
      bondName: bond.name,
      amount: winningBid.amount,
      investorId: investor.id,
      investorEmail: investor.email,
    },
    correlationId: `trade-${trade.id}`,
  });

  return {
    id: trade.id,
    auctionId: trade.auctionId,
    bondId: trade.bondId,
    investorId: trade.investorId,
    amount: trade.amount,
    status: trade.status as TradeRecord["status"],
    stripeCheckoutSessionId: trade.stripeCheckoutSessionId,
    stripePaymentIntentId: trade.stripePaymentIntentId,
    settlementId: trade.settlementId,
    createdAt: trade.createdAt,
    updatedAt: trade.updatedAt,
  };
}

/**
 * Retrieves a trade by ID from database
 */
export async function getTradeById(tradeId: number): Promise<TradeRecord | null> {
  const [trade] = await db
    .select()
    .from(exchangeTrades)
    .where(eq(exchangeTrades.id, tradeId));

  if (!trade) return null;

  return {
    id: trade.id,
    auctionId: trade.auctionId,
    bondId: trade.bondId,
    investorId: trade.investorId,
    amount: trade.amount,
    status: trade.status as TradeRecord["status"],
    stripeCheckoutSessionId: trade.stripeCheckoutSessionId,
    stripePaymentIntentId: trade.stripePaymentIntentId,
    settlementId: trade.settlementId,
    createdAt: trade.createdAt,
    updatedAt: trade.updatedAt,
  };
}

/**
 * Retrieves all trades for a specific investor
 */
export async function getTradesByInvestor(investorId: number): Promise<TradeRecord[]> {
  const trades = await db
    .select()
    .from(exchangeTrades)
    .where(eq(exchangeTrades.investorId, investorId));

  return trades.map((trade) => ({
    id: trade.id,
    auctionId: trade.auctionId,
    bondId: trade.bondId,
    investorId: trade.investorId,
    amount: trade.amount,
    status: trade.status as TradeRecord["status"],
    stripeCheckoutSessionId: trade.stripeCheckoutSessionId,
    stripePaymentIntentId: trade.stripePaymentIntentId,
    settlementId: trade.settlementId,
    createdAt: trade.createdAt,
    updatedAt: trade.updatedAt,
  }));
}

/**
 * Updates trade status with optional Stripe metadata
 */
export async function updateTradeStatus(
  tradeId: number,
  status: TradeRecord["status"],
  metadata?: { checkoutSessionId?: string; paymentIntentId?: string }
): Promise<TradeRecord | null> {
  const updateData: any = {
    status,
    updatedAt: new Date(),
  };

  if (metadata?.checkoutSessionId) {
    updateData.stripeCheckoutSessionId = metadata.checkoutSessionId;
  }
  if (metadata?.paymentIntentId) {
    updateData.stripePaymentIntentId = metadata.paymentIntentId;
  }

  const [updatedTrade] = await db
    .update(exchangeTrades)
    .set(updateData)
    .where(eq(exchangeTrades.id, tradeId))
    .returning();

  if (!updatedTrade) return null;

  // Create immutable event for status change
  await createImmutableEvent({
    type: (status === "PAID" ? "TRADE_PAID" : status === "FAILED" ? "TRADE_FAILED" : "TRADE_SETTLED") as ImmutableEventType,
    actorId: updatedTrade.investorId,
    actorType: "SYSTEM",
    entityType: "TRADE",
    entityId: tradeId.toString(),
    payload: {
      tradeId,
      status,
      checkoutSessionId: metadata?.checkoutSessionId,
      paymentIntentId: metadata?.paymentIntentId,
    },
    correlationId: `trade-${tradeId}`,
  });

  return {
    id: updatedTrade.id,
    auctionId: updatedTrade.auctionId,
    bondId: updatedTrade.bondId,
    investorId: updatedTrade.investorId,
    amount: updatedTrade.amount,
    status: updatedTrade.status as TradeRecord["status"],
    stripeCheckoutSessionId: updatedTrade.stripeCheckoutSessionId,
    stripePaymentIntentId: updatedTrade.stripePaymentIntentId,
    settlementId: updatedTrade.settlementId,
    createdAt: updatedTrade.createdAt,
    updatedAt: updatedTrade.updatedAt,
  };
}

/**
 * Creates a settlement record and bond assignment for a paid trade
 * Now includes proper database persistence and ledger entries
 */
export async function createSettlement(
  tradeId: number,
  investorEmail: string,
  investorName: string,
  bondName: string
): Promise<{ settlementId: string; journalId: number; assignmentId: number } | null> {
  const trade = await getTradeById(tradeId);
  if (!trade || trade.status !== "PAID") return null;

  const settlementId = `settle-${Date.now()}-${tradeId}`;

  // Get bond details for assignment
  const [bond] = await db
    .select({
      id: bonds.id,
      faceValue: bonds.faceValue,
    })
    .from(bonds)
    .where(eq(bonds.id, trade.bondId));

  if (!bond) return null;

  // Create settlement record in database
  const [settlement] = await db
    .insert(exchangeSettlements)
    .values({
      tradeId,
      settlementAmount: trade.amount,
      settlementMethod: "STRIPE",
      status: "COMPLETED",
      settledAt: new Date(),
      isDemo: trade.isDemo || false,
      metadata: {
        investorEmail,
        investorName,
        bondName,
      },
    })
    .returning();

  // Update trade status to SETTLED
  await db
    .update(exchangeTrades)
    .set({
      status: "SETTLED",
      settlementId: settlementId,
      updatedAt: new Date(),
    })
    .where(eq(exchangeTrades.id, tradeId));

  // Create bond assignment (100% ownership for now)
  const [assignment] = await db
    .insert(bondAssignments)
    .values({
      tradeId,
      bondId: bond.id,
      investorId: trade.investorId,
      ownershipPercent: "100.00",
      faceValueAmount: bond.faceValue,
      assignmentDate: new Date(),
      status: "ACTIVE",
      transferable: true,
    })
    .returning();

  // Create immutable event for settlement
  await createImmutableEvent({
    type: "TRADE_SETTLED" as ImmutableEventType,
    actorId: trade.investorId,
    actorType: "SYSTEM",
    entityType: "SETTLEMENT",
    entityId: settlementId,
    payload: {
      settlementId,
      tradeId,
      bondId: trade.bondId,
      amount: trade.amount,
      investorEmail,
      bondName,
      assignmentId: assignment.id,
    },
    correlationId: `settlement-${settlementId}`,
  });

  // Create immutable event for assignment
  await createImmutableEvent({
    type: "ASSIGNMENT_CREATED" as ImmutableEventType,
    actorId: trade.investorId,
    actorType: "SYSTEM",
    entityType: "ASSIGNMENT",
    entityId: assignment.id.toString(),
    payload: {
      assignmentId: assignment.id,
      tradeId,
      bondId: bond.id,
      investorId: trade.investorId,
      ownershipPercent: "100.00",
      faceValueAmount: bond.faceValue,
    },
    correlationId: `settlement-${settlementId}`,
  });

  // Create ledger journal entry for settlement
  const journalId = await postJournalEntry({
    type: "TRADE_SETTLEMENT",
    description: `Settlement for bond purchase: ${bondName}`,
    currency: "USD",
    lines: [
      {
        accountCode: "1200", // Cash/Stripe Clearing
        debit: parseFloat(trade.amount),
        credit: 0,
        description: "Cash received from investor",
      },
      {
        accountCode: "2100", // Investor Payable
        debit: 0,
        credit: parseFloat(trade.amount),
        description: "Investor payable for bond purchase",
      },
    ],
    metadata: {
      tradeId,
      settlementId,
      investorEmail,
      assignmentId: assignment.id,
    },
  });

  return { settlementId, journalId, assignmentId: assignment.id };
}

/**
 * Gets all trades for a specific bond
 */
export async function getTradesByBond(bondId: number): Promise<TradeRecord[]> {
  const trades = await db
    .select()
    .from(exchangeTrades)
    .where(eq(exchangeTrades.bondId, bondId));

  return trades.map((trade) => ({
    id: trade.id,
    auctionId: trade.auctionId,
    bondId: trade.bondId,
    investorId: trade.investorId,
    amount: trade.amount,
    status: trade.status as TradeRecord["status"],
    stripeCheckoutSessionId: trade.stripeCheckoutSessionId,
    stripePaymentIntentId: trade.stripePaymentIntentId,
    settlementId: trade.settlementId,
    createdAt: trade.createdAt,
    updatedAt: trade.updatedAt,
  }));
}

/**
 * Gets all trades with a specific status
 */
export async function getTradesByStatus(status: TradeRecord["status"]): Promise<TradeRecord[]> {
  const trades = await db
    .select()
    .from(exchangeTrades)
    .where(eq(exchangeTrades.status, status));

  return trades.map((trade) => ({
    id: trade.id,
    auctionId: trade.auctionId,
    bondId: trade.bondId,
    investorId: trade.investorId,
    amount: trade.amount,
    status: trade.status as TradeRecord["status"],
    stripeCheckoutSessionId: trade.stripeCheckoutSessionId,
    stripePaymentIntentId: trade.stripePaymentIntentId,
    settlementId: trade.settlementId,
    createdAt: trade.createdAt,
    updatedAt: trade.updatedAt,
  }));
}
