// Reference: javascript_database blueprint
import { 
  users, 
  type User, 
  type InsertUser, 
  judgments, 
  type Judgment, 
  type InsertJudgment,
  bundles,
  type Bundle,
  type InsertBundle,
  bundleJudgments,
  type BundleJudgment,
  type InsertBundleJudgment,
  priceEstimates,
  type PriceEstimate,
  type InsertPriceEstimate,
  chatSessions,
  type ChatSession,
  type InsertChatSession,
  chatMessages,
  type ChatMessage,
  type InsertChatMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Judgments
  getJudgments(ownerId: number): Promise<Judgment[]>;
  getJudgment(id: number): Promise<Judgment | undefined>;
  createJudgment(judgment: InsertJudgment): Promise<Judgment>;
  updateJudgment(id: number, data: Partial<InsertJudgment>): Promise<Judgment>;
  
  // Bundles
  getBundles(ownerId: number): Promise<Bundle[]>;
  getBundle(id: number): Promise<Bundle | undefined>;
  createBundle(bundle: InsertBundle): Promise<Bundle>;
  updateBundle(id: number, data: Partial<InsertBundle>): Promise<Bundle>;
  
  // Bundle Judgments
  getBundleJudgments(bundleId: number): Promise<BundleJudgment[]>;
  addJudgmentToBundle(data: InsertBundleJudgment): Promise<BundleJudgment>;
  removeJudgmentFromBundle(bundleId: number, judgmentId: number): Promise<void>;
  
  // Price Estimates
  getPriceEstimates(judgmentId: number): Promise<PriceEstimate[]>;
  createPriceEstimate(estimate: InsertPriceEstimate): Promise<PriceEstimate>;
  deletePriceEstimates(judgmentId: number, scenarios: string[]): Promise<void>;
  
  // Chat
  getChatSession(id: number): Promise<ChatSession | undefined>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatMessages(sessionId: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Judgments
  async getJudgments(ownerId: number): Promise<Judgment[]> {
    return await db.select().from(judgments).where(eq(judgments.ownerId, ownerId)).orderBy(desc(judgments.createdAt));
  }

  async getJudgment(id: number): Promise<Judgment | undefined> {
    const [judgment] = await db.select().from(judgments).where(eq(judgments.id, id));
    return judgment || undefined;
  }

  async createJudgment(judgment: InsertJudgment): Promise<Judgment> {
    const [created] = await db.insert(judgments).values(judgment).returning();
    return created;
  }

  async updateJudgment(id: number, data: Partial<InsertJudgment>): Promise<Judgment> {
    const [updated] = await db
      .update(judgments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(judgments.id, id))
      .returning();
    return updated;
  }

  // Bundles
  async getBundles(ownerId: number): Promise<Bundle[]> {
    return await db.select().from(bundles).where(eq(bundles.ownerId, ownerId)).orderBy(desc(bundles.createdAt));
  }

  async getBundle(id: number): Promise<Bundle | undefined> {
    const [bundle] = await db.select().from(bundles).where(eq(bundles.id, id));
    return bundle || undefined;
  }

  async createBundle(bundle: InsertBundle): Promise<Bundle> {
    const [created] = await db.insert(bundles).values(bundle).returning();
    return created;
  }

  async updateBundle(id: number, data: Partial<InsertBundle>): Promise<Bundle> {
    const [updated] = await db
      .update(bundles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(bundles.id, id))
      .returning();
    return updated;
  }

  // Bundle Judgments
  async getBundleJudgments(bundleId: number): Promise<BundleJudgment[]> {
    return await db
      .select()
      .from(bundleJudgments)
      .where(eq(bundleJudgments.bundleId, bundleId))
      .orderBy(desc(bundleJudgments.addedAt));
  }

  async addJudgmentToBundle(data: InsertBundleJudgment): Promise<BundleJudgment> {
    const [created] = await db.insert(bundleJudgments).values(data).returning();
    return created;
  }

  async removeJudgmentFromBundle(bundleId: number, judgmentId: number): Promise<void> {
    await db
      .delete(bundleJudgments)
      .where(
        and(
          eq(bundleJudgments.bundleId, bundleId),
          eq(bundleJudgments.judgmentId, judgmentId)
        )
      );
  }

  // Price Estimates
  async getPriceEstimates(judgmentId: number): Promise<PriceEstimate[]> {
    return await db
      .select()
      .from(priceEstimates)
      .where(eq(priceEstimates.judgmentId, judgmentId))
      .orderBy(desc(priceEstimates.createdAt));
  }

  async createPriceEstimate(estimate: InsertPriceEstimate): Promise<PriceEstimate> {
    const [created] = await db.insert(priceEstimates).values(estimate).returning();
    return created;
  }

  async deletePriceEstimates(judgmentId: number, scenarios: string[]): Promise<void> {
    await db.delete(priceEstimates).where(eq(priceEstimates.judgmentId, judgmentId));
  }

  // Chat
  async getChatSession(id: number): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session || undefined;
  }

  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    const [created] = await db.insert(chatSessions).values(session).returning();
    return created;
  }

  async getChatMessages(sessionId: number): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt);
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [created] = await db.insert(chatMessages).values(message).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
