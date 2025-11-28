import dayjs from "dayjs";
import { db, bonds, auctions } from "../db";
import { eq } from "drizzle-orm";

/**
 * Call this from your existing bond workflow whenever a bond becomes perfected
 * and should be offered on the exchange.
 */
export async function handleBondPerfected(
  bondId: string,
  reservePrice: number
) {
  const [bond] = await db.select().from(bonds).where(eq(bonds.id, bondId));

  if (!bond) {
    throw new Error("Bond not found");
  }

  const startsAt = new Date();
  const endsAt = dayjs(startsAt).add(5, "day").toDate();

  const [auction] = await db
    .insert(auctions)
    .values({
      bondId,
      reservePrice,
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
    })
    .where(eq(bonds.id, bondId));

  return auction;
}
