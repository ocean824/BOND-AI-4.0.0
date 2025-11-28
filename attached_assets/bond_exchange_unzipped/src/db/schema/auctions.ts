import {
  pgTable,
  uuid,
  timestamp,
  numeric,
  text,
} from "drizzle-orm/pg-core";
import { bonds } from "./bonds";

export type AuctionStatus =
  | "PENDING"
  | "ACTIVE"
  | "RESERVE_MET"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export const auctions = pgTable("auctions", {
  id: uuid("id").primaryKey().defaultRandom(),
  bondId: uuid("bond_id")
    .notNull()
    .references(() => bonds.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("PENDING"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  reservePrice: numeric("reserve_price", { precision: 18, scale: 2 }).notNull(),
  winningBidId: uuid("winning_bid_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
