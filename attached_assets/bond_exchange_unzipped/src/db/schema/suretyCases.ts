import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { suretyTrusts } from "./suretyTrusts";
import { bonds } from "./bonds";
import { users } from "./users";

export type SuretyCaseStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "APPROVED"
  | "DECLINED"
  | "APPROVED_WITH_COLLATERAL"
  | "DOCS_PENDING_SIGNATURE"
  | "ACTIVE"
  | "RELEASED";

export const suretyCases = pgTable("surety_cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  bondId: uuid("bond_id")
    .notNull()
    .references(() => bonds.id, { onDelete: "cascade" }),
  suretyTrustId: uuid("surety_trust_id")
    .notNull()
    .references(() => suretyTrusts.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("DRAFT"),
  bondType: text("bond_type").notNull().default("JUDGMENT"),
  bondPenalSum: numeric("bond_penal_sum", { precision: 18, scale: 2 }).notNull(),
  principalId: uuid("principal_id"),
  principalRiskScore: numeric("principal_risk_score", { precision: 5, scale: 2 }),
  collateralRequiredAmount: numeric("collateral_required_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  collateralTypeAllowed: text("collateral_type_allowed").notNull().default("["CASH","ILOC"]"),
  indemnityRequired: text("indemnity_required").notNull().default("YES"),
  insuranceRequired: text("insurance_required").notNull().default("NO"),
  underwriterUserId: uuid("underwriter_user_id").references(() => users.id),
  decisionAt: timestamp("decision_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
