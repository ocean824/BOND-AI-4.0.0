import {
  pgTable,
  uuid,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { suretyCases } from "./suretyCases";

export const suretyDocuments = pgTable("surety_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => suretyCases.id, { onDelete: "cascade" }),
  docType: text("doc_type").notNull(), // GIA | COLLATERAL_AGREEMENT | TRUST_RESOLUTION | SURETY_COMMITMENT | UNDERWRITING_REPORT
  storagePath: text("storage_path").notNull(),
  eSignEnvelopeId: text("esign_envelope_id"),
  status: text("status").notNull().default("DRAFT"), // DRAFT | SENT_FOR_SIGNATURE | FULLY_EXECUTED | VOID
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
