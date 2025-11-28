import { pgTable, uuid, text, boolean, numeric } from "drizzle-orm/pg-core";

export const suretyTrusts = pgTable("surety_trusts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  trustType: text("trust_type").notNull().default("IRREVOCABLE"), // REVOCABLE | IRREVOCABLE | OTHER
  canActAsSurety: boolean("can_act_as_surety").notNull().default(true),
  allowedBondTypes: text("allowed_bond_types").notNull().default("["JUDGMENT"]"),
  maxSingleBondLimit: numeric("max_single_bond_limit", { precision: 18, scale: 2 }).notNull(),
  aggregateBondLimit: numeric("aggregate_bond_limit", { precision: 18, scale: 2 }).notNull(),
  currentExposure: numeric("current_exposure", { precision: 18, scale: 2 }).notNull().default("0"),
  requiresInsuranceAbove: numeric("requires_insurance_above", { precision: 18, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
});
