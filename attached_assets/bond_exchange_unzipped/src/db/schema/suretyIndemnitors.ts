import {
  pgTable,
  uuid,
  numeric,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { suretyCases } from "./suretyCases";

export const suretyIndemnitors = pgTable("surety_indemnitors", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => suretyCases.id, { onDelete: "cascade" }),
  indemnitorType: text("indemnitor_type").notNull(), // PRINCIPAL_ENTITY | OWNER | SPOUSE | TRUST | AFFILIATE
  partyId: uuid("party_id").notNull(),
  ownershipPercent: numeric("ownership_percent", { precision: 5, scale: 2 }),
  isSpouse: text("is_spouse").notNull().default("NO"),
  signatureStatus: text("signature_status").notNull().default("PENDING"),
  signedAt: timestamp("signed_at", { withTimezone: true }),
});
