import {
  pgTable,
  uuid,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { auctions } from "./auctions";
import { users } from "./users";

export const auctionBids = pgTable("auction_bids", {
  id: uuid("id").primaryKey().defaultRandom(),
  auctionId: uuid("auction_id")
    .notNull()
    .references(() => auctions.id, { onDelete: "cascade" }),
  investorId: uuid("investor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  placedAt: timestamp("placed_at", { withTimezone: true }).defaultNow(),
});
