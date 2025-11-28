import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { db, auctions, auctionBids } from "../db";
import { and, eq, lt, gt, desc } from "drizzle-orm";

export const investorAuctionsRouter = Router();

investorAuctionsRouter.get(
  "/investor/auctions",
  requireAuth(["INVESTOR"]),
  async (_req, res) => {
    const now = new Date();

    const rows = await db
      .select({
        id: auctions.id,
        status: auctions.status,
        startsAt: auctions.startsAt,
        endsAt: auctions.endsAt,
        reservePrice: auctions.reservePrice,
      })
      .from(auctions)
      .where(
        and(
          eq(auctions.status, "ACTIVE"),
          lt(auctions.startsAt, now),
          gt(auctions.endsAt, now)
        )
      );

    return res.json({ auctions: rows });
  }
);

investorAuctionsRouter.get(
  "/investor/auctions/:id",
  requireAuth(["INVESTOR"]),
  async (req, res) => {
    const { id } = req.params;

    const [auction] = await db
      .select()
      .from(auctions)
      .where(eq(auctions.id, id));

    if (!auction) {
      return res.status(404).json({ error: "Auction not found" });
    }

    const [highestBid] = await db
      .select()
      .from(auctionBids)
      .where(eq(auctionBids.auctionId, auction.id))
      .orderBy(desc(auctionBids.amount))
      .limit(1);

    return res.json({
      auction: {
        id: auction.id,
        status: auction.status,
        startsAt: auction.startsAt,
        endsAt: auction.endsAt,
        reservePrice: auction.reservePrice,
        highestBid: highestBid ? highestBid.amount : null,
      },
    });
  }
);
