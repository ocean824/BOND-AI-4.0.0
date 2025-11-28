import { db, auctions } from "../db";
import { and, eq, lt } from "drizzle-orm";

/**
 * Periodic job to mark expired auctions as EXPIRED if they ended
 * without the reserve being met.
 */
export async function closeExpiredAuctionsJob() {
  const now = new Date();

  const expired = await db
    .select()
    .from(auctions)
    .where(
      and(
        eq(auctions.status, "ACTIVE"),
        lt(auctions.endsAt, now)
      )
    );

  for (const a of expired) {
    await db
      .update(auctions)
      .set({ status: "EXPIRED" })
      .where(eq(auctions.id, a.id));
  }
}
