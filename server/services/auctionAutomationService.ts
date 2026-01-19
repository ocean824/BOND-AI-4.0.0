import { db } from "../db";
import { auctions, auctionBids, bonds } from "@shared/schema";
import { eq, and, lt, desc, gte } from "drizzle-orm";
import { createImmutableEvent } from "./immutableEventService";
import { createTradeFromAuction } from "./tradeService";

/**
 * Starts pending auctions that have reached their start time
 */
export async function startPendingAuctions(): Promise<number> {
  const now = new Date();

  // Find all pending auctions that should start
  const pendingAuctions = await db
    .select()
    .from(auctions)
    .where(
      and(
        eq(auctions.status, "PENDING"),
        lt(auctions.startsAt, now)
      )
    );

  let startedCount = 0;

  for (const auction of pendingAuctions) {
    try {
      await db
        .update(auctions)
        .set({
          status: "ACTIVE",
          updatedAt: new Date(),
        })
        .where(eq(auctions.id, auction.id));

      // Create immutable event
      await createImmutableEvent({
        type: "AUCTION_CREATED",
        actorType: "SYSTEM",
        entityType: "AUCTION",
        entityId: auction.id.toString(),
        payload: {
          auctionId: auction.id,
          bondId: auction.bondId,
          startsAt: auction.startsAt,
          endsAt: auction.endsAt,
          reservePrice: auction.reservePrice,
        },
      });

      startedCount++;
      console.log(`[Auction] Started auction #${auction.id} for bond ${auction.bondId}`);
    } catch (error) {
      console.error(`[Auction] Failed to start auction #${auction.id}:`, error);
    }
  }

  return startedCount;
}

/**
 * Closes expired auctions and determines winners
 */
export async function closeExpiredAuctions(): Promise<{
  closedCount: number;
  withWinners: number;
  withoutBids: number;
}> {
  const now = new Date();

  // Find all active auctions that have expired
  const expiredAuctions = await db
    .select()
    .from(auctions)
    .where(
      and(
        eq(auctions.status, "ACTIVE"),
        lt(auctions.endsAt, now)
      )
    );

  let closedCount = 0;
  let withWinners = 0;
  let withoutBids = 0;

  for (const auction of expiredAuctions) {
    try {
      // Get all bids for this auction
      const bids = await db
        .select()
        .from(auctionBids)
        .where(eq(auctionBids.auctionId, auction.id))
        .orderBy(desc(auctionBids.amount));

      if (bids.length === 0) {
        // No bids - mark as expired
        await db
          .update(auctions)
          .set({
            status: "EXPIRED",
            updatedAt: new Date(),
          })
          .where(eq(auctions.id, auction.id));

        // Update bond perfection status
        await db
          .update(bonds)
          .set({
            isPerfected: false,
            currentAuctionId: null,
            updatedAt: new Date(),
          })
          .where(eq(bonds.id, auction.bondId));

        withoutBids++;
        console.log(`[Auction] Expired auction #${auction.id} with no bids`);
      } else {
        // Find highest bid
        const highestBid = bids[0];
        const reservePrice = parseFloat(auction.reservePrice);
        const highestBidAmount = parseFloat(highestBid.amount);

        if (highestBidAmount >= reservePrice) {
          // Reserve met - mark as completed with winner
          await db
            .update(auctions)
            .set({
              status: "COMPLETED",
              winningBidId: highestBid.id,
              updatedAt: new Date(),
            })
            .where(eq(auctions.id, auction.id));

          // Create trade from winning bid
          const trade = await createTradeFromAuction(auction.id);

          if (trade) {
            // Create immutable event
            await createImmutableEvent({
              type: "AUCTION_COMPLETED",
              actorId: highestBid.investorId,
              actorType: "SYSTEM",
              entityType: "AUCTION",
              entityId: auction.id.toString(),
              payload: {
                auctionId: auction.id,
                bondId: auction.bondId,
                winningBidId: highestBid.id,
                winningAmount: highestBidAmount,
                investorId: highestBid.investorId,
                tradeId: trade.id,
              },
            });

            withWinners++;
            console.log(`[Auction] Completed auction #${auction.id} with winner bid #${highestBid.id} ($${highestBidAmount})`);
          } else {
            console.error(`[Auction] Failed to create trade for auction #${auction.id}`);
          }
        } else {
          // Reserve not met - mark as expired
          await db
            .update(auctions)
            .set({
              status: "EXPIRED",
              updatedAt: new Date(),
            })
            .where(eq(auctions.id, auction.id));

          // Update bond perfection status
          await db
            .update(bonds)
            .set({
              isPerfected: false,
              currentAuctionId: null,
              updatedAt: new Date(),
            })
            .where(eq(bonds.id, auction.bondId));

          withoutBids++;
          console.log(`[Auction] Expired auction #${auction.id} - reserve not met (highest: $${highestBidAmount}, reserve: $${reservePrice})`);
        }
      }

      closedCount++;
    } catch (error) {
      console.error(`[Auction] Failed to close auction #${auction.id}:`, error);
    }
  }

  return {
    closedCount,
    withWinners,
    withoutBids,
  };
}

/**
 * Checks if a bid meets the reserve price
 */
export async function checkReserveMet(auctionId: number): Promise<boolean> {
  const [auction] = await db
    .select()
    .from(auctions)
    .where(eq(auctions.id, auctionId));

  if (!auction) return false;

  const bids = await db
    .select()
    .from(auctionBids)
    .where(eq(auctionBids.auctionId, auctionId))
    .orderBy(desc(auctionBids.amount))
    .limit(1);

  if (bids.length === 0) return false;

  const highestBidAmount = parseFloat(bids[0].amount);
  const reservePrice = parseFloat(auction.reservePrice);

  const reserveMet = highestBidAmount >= reservePrice;

  // Update auction status if reserve just met
  if (reserveMet && auction.status === "ACTIVE") {
    await db
      .update(auctions)
      .set({
        status: "RESERVE_MET",
        updatedAt: new Date(),
      })
      .where(eq(auctions.id, auctionId));

    console.log(`[Auction] Reserve met for auction #${auctionId} ($${highestBidAmount} >= $${reservePrice})`);
  }

  return reserveMet;
}

/**
 * Gets active auctions that are ending soon (within specified minutes)
 */
export async function getEndingSoonAuctions(withinMinutes: number = 60): Promise<typeof auctions.$inferSelect[]> {
  const now = new Date();
  const endTime = new Date(now.getTime() + withinMinutes * 60 * 1000);

  const endingSoon = await db
    .select()
    .from(auctions)
    .where(
      and(
        eq(auctions.status, "ACTIVE"),
        gte(auctions.endsAt, now),
        lt(auctions.endsAt, endTime)
      )
    )
    .orderBy(auctions.endsAt);

  return endingSoon;
}

/**
 * Cancels an auction (admin action)
 */
export async function cancelAuction(auctionId: number, reason: string): Promise<void> {
  const [auction] = await db
    .select()
    .from(auctions)
    .where(eq(auctions.id, auctionId));

  if (!auction) {
    throw new Error("Auction not found");
  }

  if (auction.status === "COMPLETED" || auction.status === "CANCELLED") {
    throw new Error("Cannot cancel auction in current status");
  }

  await db
    .update(auctions)
    .set({
      status: "CANCELLED",
      updatedAt: new Date(),
    })
    .where(eq(auctions.id, auctionId));

  // Update bond perfection status
  await db
    .update(bonds)
    .set({
      isPerfected: false,
      currentAuctionId: null,
      updatedAt: new Date(),
    })
    .where(eq(bonds.id, auction.bondId));

  // Create immutable event
  await createImmutableEvent({
    type: "AUCTION_COMPLETED",
    actorType: "ADMIN",
    entityType: "AUCTION",
    entityId: auctionId.toString(),
    payload: {
      auctionId,
      bondId: auction.bondId,
      status: "CANCELLED",
      reason,
    },
  });

  console.log(`[Auction] Cancelled auction #${auctionId}: ${reason}`);
}

/**
 * Gets auction statistics
 */
export async function getAuctionStats(): Promise<{
  totalAuctions: number;
  activeAuctions: number;
  completedAuctions: number;
  expiredAuctions: number;
  totalBids: number;
  averageBidsPerAuction: number;
}> {
  const allAuctions = await db.select().from(auctions);
  const allBids = await db.select().from(auctionBids);

  const activeAuctions = allAuctions.filter(a => a.status === "ACTIVE").length;
  const completedAuctions = allAuctions.filter(a => a.status === "COMPLETED").length;
  const expiredAuctions = allAuctions.filter(a => a.status === "EXPIRED").length;

  return {
    totalAuctions: allAuctions.length,
    activeAuctions,
    completedAuctions,
    expiredAuctions,
    totalBids: allBids.length,
    averageBidsPerAuction: allAuctions.length > 0 ? allBids.length / allAuctions.length : 0,
  };
}

/**
 * Main automation runner - should be called periodically (e.g., every minute)
 */
export async function runAuctionAutomation(): Promise<{
  started: number;
  closed: number;
  withWinners: number;
  withoutBids: number;
}> {
  console.log("[Auction] Running automation cycle...");

  const started = await startPendingAuctions();
  const { closedCount, withWinners, withoutBids } = await closeExpiredAuctions();

  console.log(`[Auction] Automation complete: ${started} started, ${closedCount} closed (${withWinners} with winners, ${withoutBids} without)`);

  return {
    started,
    closed: closedCount,
    withWinners,
    withoutBids,
  };
}
