import {
  pgTable,
  uuid,
  numeric,
  text,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { suretyCases } from "./suretyCases";

export const suretyCollateral = pgTable("surety_collateral", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => suretyCases.id, { onDelete: "cascade" }),
  requiredAmount: numeric("required_amount", { precision: 18, scale: 2 }).notNull(),
  postedAmount: numeric("posted_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  collateralType: text("collateral_type").notNull(), // CASH | ILOC
  ilocBankName: text("iloc_bank_name"),
  ilocReference: text("iloc_reference"),
  heldFrom: date("held_from"),
  releaseEligibleDate: date("release_eligible_date"),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  status: text("status").notNull().default("PENDING"), // PENDING | POSTED | HELD | RELEASED
});
