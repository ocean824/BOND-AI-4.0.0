import { db } from "../db";
import { bonds, auctions } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Handles when a bond becomes perfected and creates an auction for the exchange.
 * Called from bond management workflow when a bond is ready for investor bidding.
 */
export async function handleBondPerfected(
  bondId: number,
  reservePrice: number,
  auctionDurationDays: number = 5
): Promise<typeof auctions.$inferSelect> {
  const [bond] = await db.select().from(bonds).where(eq(bonds.id, bondId));

  if (!bond) {
    throw new Error("Bond not found");
  }

  if (bond.isPerfected) {
    throw new Error("Bond is already perfected");
  }

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + auctionDurationDays * 24 * 60 * 60 * 1000);

  const [auction] = await db
    .insert(auctions)
    .values({
      bondId,
      reservePrice: reservePrice.toString(),
      status: "ACTIVE",
      startsAt,
      endsAt,
    })
    .returning();

  await db
    .update(bonds)
    .set({
      isPerfected: true,
      perfectedAt: new Date(),
      currentAuctionId: auction.id,
      updatedAt: new Date(),
    })
    .where(eq(bonds.id, bondId));

  return auction;
}

/**
 * Closes expired auctions that ended without meeting their reserve price.
 * Should be called periodically (e.g., via cron job or scheduled task).
 */
export async function closeExpiredAuctions(): Promise<number> {
  const now = new Date();
  
  const expiredAuctions = await db
    .select()
    .from(auctions)
    .where(eq(auctions.status, "ACTIVE"));

  let closedCount = 0;
  
  for (const auction of expiredAuctions) {
    if (auction.endsAt < now) {
      await db
        .update(auctions)
        .set({ 
          status: "EXPIRED",
          updatedAt: new Date(),
        })
        .where(eq(auctions.id, auction.id));
      closedCount++;
    }
  }

  return closedCount;
}

/**
 * Get investor-facing overview of upcoming bonds.
 * Shows aggregated totals without exposing underlying bond details.
 */
export async function getInvestorOverview(): Promise<{
  next7Days: number;
  next30Days: number;
  later: number;
}> {
  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const upcomingBonds = await db
    .select({
      expectedPerfectedAt: bonds.expectedPerfectedAt,
      faceValue: bonds.faceValue,
      isPerfected: bonds.isPerfected,
    })
    .from(bonds)
    .where(eq(bonds.isPerfected, false));

  const totals = {
    next7Days: 0,
    next30Days: 0,
    later: 0,
  };

  for (const bond of upcomingBonds) {
    const faceValue = Number(bond.faceValue ?? 0);
    const expectedDate = bond.expectedPerfectedAt;

    if (!expectedDate) {
      totals.later += faceValue;
      continue;
    }

    if (expectedDate < next7Days) {
      totals.next7Days += faceValue;
    } else if (expectedDate < next30Days) {
      totals.next30Days += faceValue;
    } else {
      totals.later += faceValue;
    }
  }

  return totals;
}
