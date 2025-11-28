import {
  pgTable,
  uuid,
  numeric,
  boolean,
  timestamp,
  text,
} from "drizzle-orm/pg-core";

export const bonds = pgTable("bonds", {
  id: uuid("id").primaryKey().defaultRandom(),
  bondType: text("bond_type").notNull().default("OTHER"), // e.g. "JUDGMENT", "OTHER"
  faceValue: numeric("face_value", { precision: 18, scale: 2 }).notNull(),
  isPerfected: boolean("is_perfected").notNull().default(false),
  perfectedAt: timestamp("perfected_at", { withTimezone: true }),
  expectedPerfectedAt: timestamp("expected_perfected_at", {
    withTimezone: true,
  }),
  currentAuctionId: uuid("current_auction_id"),
  suretyCaseId: uuid("surety_case_id"),
  suretyStatus: text("surety_status").notNull().default("NONE"),
  suretyTrustId: uuid("surety_trust_id"),
});
