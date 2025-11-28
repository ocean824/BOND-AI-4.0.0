import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { db, auctions, auctionBids } from "../db";
import { eq, desc } from "drizzle-orm";

export const investorBidsRouter = Router();

interface PlaceBidBody {
  amount: number;
}

investorBidsRouter.post(
  "/investor/auctions/:id/bids",
  requireAuth(["INVESTOR"]),
  async (req, res) => {
    const investor = req.user!;
    const { id } = req.params;
    const { amount } = req.body as PlaceBidBody;

    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ error: "Bid amount must be a positive number" });
    }

    const [auction] = await db
      .select()
      .from(auctions)
      .where(eq(auctions.id, id));

    if (!auction) {
      return res.status(404).json({ error: "Auction not found" });
    }

    const now = new Date();
    if (
      auction.status !== "ACTIVE" ||
      now < auction.startsAt ||
      now > auction.endsAt
    ) {
      return res.status(400).json({ error: "Auction is not open for bidding" });
    }

    const [highestBid] = await db
      .select()
      .from(auctionBids)
      .where(eq(auctionBids.auctionId, auction.id))
      .orderBy(desc(auctionBids.amount))
      .limit(1);

    const currentHighest = highestBid ? Number(highestBid.amount) : 0;
    const minBid = currentHighest + 1;

    if (amount < minBid) {
      return res.status(400).json({
        error: `Bid must be at least ${minBid}`,
        currentHighest,
      });
    }

    const [bid] = await db
      .insert(auctionBids)
      .values({
        auctionId: auction.id,
        investorId: investor.id,
        amount,
      })
      .returning();

    const reservePrice = Number(auction.reservePrice);
    const reserveMet = amount >= reservePrice;

    if (reserveMet) {
      await db
        .update(auctions)
        .set({
          status: "COMPLETED",
          winningBidId: bid.id,
        })
        .where(eq(auctions.id, auction.id));

      return res.json({
        bid,
        message: "Reserve met. Auction completed. You are the winning bidder.",
      });
    }

    return res.json({
      bid,
      message: "Bid placed successfully.",
    });
  }
);

// List bids for the logged-in investor
investorBidsRouter.get(
  "/investor/my-bids",
  requireAuth(["INVESTOR"]),
  async (req, res) => {
    const investor = req.user!;

    const rows = await db
      .select({
        id: auctionBids.id,
        auctionId: auctionBids.auctionId,
        amount: auctionBids.amount,
        placedAt: auctionBids.placedAt,
      })
      .from(auctionBids)
      .where(eq(auctionBids.investorId, investor.id));

    return res.json({ bids: rows });
  }
);
