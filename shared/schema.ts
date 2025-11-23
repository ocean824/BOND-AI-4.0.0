import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, jsonb, boolean, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("analyst"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const judgments = pgTable("judgments", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  debtorName: varchar("debtor_name", { length: 255 }),
  caseNumber: varchar("case_number", { length: 255 }),
  court: varchar("court", { length: 255 }),
  jurisdiction: varchar("jurisdiction", { length: 255 }),
  judgmentAmount: decimal("judgment_amount", { precision: 18, scale: 2 }),
  judgmentDate: timestamp("judgment_date", { withTimezone: true }),
  status: varchar("status", { length: 50 }).notNull().default("uploaded"),
  fileName: varchar("file_name", { length: 500 }),
  notes: text("notes"),
  rawFields: jsonb("raw_fields"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const recoveryScores = pgTable("recovery_scores", {
  id: serial("id").primaryKey(),
  judgmentId: integer("judgment_id").notNull().references(() => judgments.id),
  score: integer("score").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  reasoning: text("reasoning"),
  modelUsed: varchar("model_used", { length: 100 }),
  factorsJson: jsonb("factors_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const priceEstimates = pgTable("price_estimates", {
  id: serial("id").primaryKey(),
  judgmentId: integer("judgment_id").notNull().references(() => judgments.id),
  scenarioName: varchar("scenario_name", { length: 50 }).notNull().default("base"),
  targetIRR: decimal("target_irr", { precision: 5, scale: 2 }).notNull(),
  discountRate: decimal("discount_rate", { precision: 5, scale: 2 }).notNull(),
  expectedRecoveryPct: decimal("expected_recovery_pct", { precision: 5, scale: 2 }).notNull(),
  recommendedPurchasePrice: decimal("recommended_purchase_price", { precision: 18, scale: 2 }).notNull(),
  scenarioJson: jsonb("scenario_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bundles = pgTable("bundles", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  metricsJson: jsonb("metrics_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bundleJudgments = pgTable("bundle_judgments", {
  id: serial("id").primaryKey(),
  bundleId: integer("bundle_id").notNull().references(() => bundles.id),
  judgmentId: integer("judgment_id").notNull().references(() => judgments.id),
  tranche: varchar("tranche", { length: 50 }).notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bonds = pgTable("bonds", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  cusip: varchar("cusip", { length: 20 }),
  isin: varchar("isin", { length: 20 }),
  ticker: varchar("ticker", { length: 20 }),
  faceValue: decimal("face_value", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  couponRate: decimal("coupon_rate", { precision: 6, scale: 3 }),
  couponType: varchar("coupon_type", { length: 50 }).default("fixed"),
  maturityDate: timestamp("maturity_date", { withTimezone: true }),
  issueDate: timestamp("issue_date", { withTimezone: true }),
  jurisdiction: varchar("jurisdiction", { length: 255 }),
  governingLaw: varchar("governing_law", { length: 255 }),
  
  bondScore: integer("bond_score"),
  riskTier: varchar("risk_tier", { length: 20 }),
  
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bondDocuments = pgTable("bond_documents", {
  id: serial("id").primaryKey(),
  bondId: integer("bond_id").notNull().references(() => bonds.id, { onDelete: "cascade" }),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  filename: varchar("filename", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 255 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storagePath: varchar("storage_path", { length: 1000 }).notNull(),
  kind: varchar("kind", { length: 20 }).notNull().default("supporting"),
  description: text("description"),
  aiSummary: text("ai_summary"),
  tags: jsonb("tags"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => chatSessions.id),
  role: varchar("role", { length: 50 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Trending topics & summaries
export const trendingTopics = pgTable("trending_topics", {
  id: serial("id").primaryKey(),
  source: varchar("source", { length: 100 }).notNull().default("news"),
  externalId: text("external_id"),
  title: text("title").notNull(),
  url: text("url"),
  category: varchar("category", { length: 100 }),
  score: decimal("score", { precision: 6, scale: 3 }).default("0"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
});

export const trendingSummaries = pgTable("trending_summaries", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull().references(() => trendingTopics.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  bulletPoints: jsonb("bullet_points").$type<string[]>().default([]),
  riskLevel: varchar("risk_level", { length: 50 }),
  sentiment: varchar("sentiment", { length: 50 }),
  relevanceScore: decimal("relevance_score", { precision: 6, scale: 3 }).default("0"),
  model: varchar("model", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  judgments: many(judgments),
  bundles: many(bundles),
  bonds: many(bonds),
  chatSessions: many(chatSessions),
}));

export const judgmentsRelations = relations(judgments, ({ one, many }) => ({
  owner: one(users, {
    fields: [judgments.ownerId],
    references: [users.id],
  }),
  recoveryScores: many(recoveryScores),
  priceEstimates: many(priceEstimates),
  bundleJudgments: many(bundleJudgments),
}));

export const recoveryScoresRelations = relations(recoveryScores, ({ one }) => ({
  judgment: one(judgments, {
    fields: [recoveryScores.judgmentId],
    references: [judgments.id],
  }),
}));

export const priceEstimatesRelations = relations(priceEstimates, ({ one }) => ({
  judgment: one(judgments, {
    fields: [priceEstimates.judgmentId],
    references: [judgments.id],
  }),
}));

export const bundlesRelations = relations(bundles, ({ one, many }) => ({
  owner: one(users, {
    fields: [bundles.ownerId],
    references: [users.id],
  }),
  bundleJudgments: many(bundleJudgments),
}));

export const bundleJudgmentsRelations = relations(bundleJudgments, ({ one }) => ({
  bundle: one(bundles, {
    fields: [bundleJudgments.bundleId],
    references: [bundles.id],
  }),
  judgment: one(judgments, {
    fields: [bundleJudgments.judgmentId],
    references: [judgments.id],
  }),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

export const bondsRelations = relations(bonds, ({ one, many }) => ({
  owner: one(users, {
    fields: [bonds.ownerId],
    references: [users.id],
  }),
  documents: many(bondDocuments),
}));

export const bondDocumentsRelations = relations(bondDocuments, ({ one }) => ({
  bond: one(bonds, {
    fields: [bondDocuments.bondId],
    references: [bonds.id],
  }),
  owner: one(users, {
    fields: [bondDocuments.ownerId],
    references: [users.id],
  }),
}));

export const trendingTopicsRelations = relations(trendingTopics, ({ many }) => ({
  summaries: many(trendingSummaries),
}));

export const trendingSummariesRelations = relations(trendingSummaries, ({ one }) => ({
  topic: one(trendingTopics, {
    fields: [trendingSummaries.topicId],
    references: [trendingTopics.id],
  }),
}));

// Insert schemas and types
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertJudgmentSchema = createInsertSchema(judgments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRecoveryScoreSchema = createInsertSchema(recoveryScores).omit({
  id: true,
  createdAt: true,
});

export const insertPriceEstimateSchema = createInsertSchema(priceEstimates).omit({
  id: true,
  createdAt: true,
});

export const insertBundleSchema = createInsertSchema(bundles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBundleJudgmentSchema = createInsertSchema(bundleJudgments).omit({
  id: true,
  addedAt: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertBondSchema = createInsertSchema(bonds, {
  name: z.string().min(1, "Bond name is required"),
  faceValue: z
    .string()
    .or(z.number())
    .transform((v) => (typeof v === "string" ? Number(v) : v))
    .refine((v) => !Number.isNaN(v), "Face value must be a number"),
  bondScore: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .nullable(),
  riskTier: z
    .enum(["low", "moderate", "high"])
    .optional()
    .nullable(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBondDocumentSchema = createInsertSchema(bondDocuments).omit({
  id: true,
  createdAt: true,
});

export const insertTrendingTopicSchema = createInsertSchema(trendingTopics).omit({
  id: true,
  fetchedAt: true,
});

export const insertTrendingSummarySchema = createInsertSchema(trendingSummaries).omit({
  id: true,
  createdAt: true,
});

// ===== REAL DATA VALIDATION SCHEMAS =====
// These schemas enforce the "real data only" policy by requiring critical fields
// and rejecting requests with incomplete data instead of allowing null/undefined values.

// Judgment must have these fields for pricing analysis
export const pricingReadyJudgmentSchema = z.object({
  judgmentAmount: z.string()
    .min(1, "Judgment amount is required for pricing analysis")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Judgment amount must be a positive number",
    }),
  debtorName: z.string()
    .min(1, "Debtor name is required"),
  caseNumber: z.string()
    .min(1, "Case number is required"),
});

// Pricing request parameters must all be provided
export const pricingInputSchema = z.object({
  targetIRR: z.number()
    .min(0, "Target IRR must be non-negative")
    .max(100, "Target IRR must be less than 100%"),
  discountRate: z.number()
    .min(0, "Discount rate must be non-negative")
    .max(100, "Discount rate must be less than 100%"),
  expectedRecoveryPct: z.number()
    .min(0, "Expected recovery percentage must be non-negative")
    .max(100, "Expected recovery percentage cannot exceed 100%"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Judgment = typeof judgments.$inferSelect;
export type InsertJudgment = z.infer<typeof insertJudgmentSchema>;

export type RecoveryScore = typeof recoveryScores.$inferSelect;
export type InsertRecoveryScore = z.infer<typeof insertRecoveryScoreSchema>;

export type PriceEstimate = typeof priceEstimates.$inferSelect;
export type InsertPriceEstimate = z.infer<typeof insertPriceEstimateSchema>;

export type Bundle = typeof bundles.$inferSelect;
export type InsertBundle = z.infer<typeof insertBundleSchema>;

export type BundleJudgment = typeof bundleJudgments.$inferSelect;
export type InsertBundleJudgment = z.infer<typeof insertBundleJudgmentSchema>;

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type Bond = typeof bonds.$inferSelect;
export type InsertBond = z.infer<typeof insertBondSchema>;

export type BondDocument = typeof bondDocuments.$inferSelect;
export type InsertBondDocument = z.infer<typeof insertBondDocumentSchema>;

export type TrendingTopic = typeof trendingTopics.$inferSelect;
export type InsertTrendingTopic = z.infer<typeof insertTrendingTopicSchema>;

export type TrendingSummary = typeof trendingSummaries.$inferSelect;
export type InsertTrendingSummary = z.infer<typeof insertTrendingSummarySchema>;

// Additional types for API responses
export type PricingScenario = {
  scenario: "base" | "optimistic" | "stressed";
  targetIRR: number;
  discountRate: number;
  expectedRecoveryPct: number;
  judgmentAmount: number;
  expectedRecoveryAmount: number;
  recommendedPurchasePrice: number;
  note?: string;
};

export type JudgmentExtractionResult = {
  debtorName: string;
  caseNumber: string;
  court: string;
  jurisdiction: string;
  judgmentAmount: number;
  judgmentDate: string;
  confidence: number;
  rawFields?: Record<string, any>;
};

export type BundleWithJudgments = Bundle & {
  judgments: (BundleJudgment & { judgment: Judgment })[];
};

export type InvestorMetrics = {
  totalJudgments: number;
  totalFaceValue: number;
  totalRecommendedPurchase: number;
  averageRecovery: number;
  trancheBreakdown: {
    senior: { count: number; faceValue: number; recommendedPurchase: number };
    mezz: { count: number; faceValue: number; recommendedPurchase: number };
    equity: { count: number; faceValue: number; recommendedPurchase: number };
  };
};
