import crypto from "crypto";
import { db } from "../db";
import { immutableEvents } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export type ImmutableEventType =
  | "JUDGMENT_CREATED"
  | "JUDGMENT_EXTRACTED"
  | "BOND_CREATED"
  | "BOND_PERFECTED"
  | "AUCTION_CREATED"
  | "AUCTION_COMPLETED"
  | "TRADE_CREATED"
  | "TRADE_PAID"
  | "TRADE_SETTLED"
  | "TRADE_FAILED"
  | "ASSIGNMENT_CREATED"
  | "ASSIGNMENT_TRANSFERRED"
  | "SURETY_UNDERWRITING_STARTED"
  | "SURETY_APPROVED"
  | "SURETY_DECLINED"
  | "SURETY_ACTIVATED"
  | "SURETY_RELEASED"
  | "COLLATERAL_POSTED"
  | "COLLATERAL_RELEASED"
  | "DOCUMENT_GENERATED"
  | "DOCUMENT_SIGNED"
  | "DISTRIBUTION_EXECUTED"
  | "USER_REGISTERED"
  | "USER_LOGIN"
  | "MEMBERSHIP_SUBSCRIBED"
  | "MEMBERSHIP_CANCELLED"
  | "JACE_WEBHOOK_RECEIVED"
  | "JACE_PAYMENT_CONFIRMED"
  | "JACE_INVESTOR_ONBOARDED"
  | "JACE_ONBOARDING_SUBMITTED";

export interface ImmutableEventData {
  type: ImmutableEventType;
  actorId?: number;
  actorType: "USER" | "SYSTEM" | "ADMIN" | "API";
  entityType: string;
  entityId: number | string;
  payload: Record<string, unknown>;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface EventRecord extends ImmutableEventData {
  id: number;
  eventHash: string;
  previousHash: string;
  timestamp: Date;
}

/**
 * Gets the last event hash from the database for chain continuity
 * Returns "GENESIS" if no events exist
 */
async function getLastEventHash(): Promise<string> {
  const [lastEvent] = await db
    .select({ eventHash: immutableEvents.eventHash })
    .from(immutableEvents)
    .orderBy(desc(immutableEvents.id))
    .limit(1);

  return lastEvent?.eventHash || "GENESIS";
}

/**
 * Creates an immutable event with hash chaining
 * Now uses database persistence instead of in-memory storage
 */
export async function createImmutableEvent(data: ImmutableEventData): Promise<EventRecord> {
  const timestamp = new Date();
  
  // Get the previous hash from the last event in the chain
  const previousHash = await getLastEventHash();
  
  // Create event content for hashing
  const eventContent = JSON.stringify({
    type: data.type,
    actorId: data.actorId,
    actorType: data.actorType,
    entityType: data.entityType,
    entityId: data.entityId,
    payload: data.payload,
    correlationId: data.correlationId,
    timestamp: timestamp.toISOString(),
    previousHash,
  });

  // Calculate hash (SHA-256)
  const eventHash = crypto
    .createHash("sha256")
    .update(eventContent)
    .digest("hex");

  // Insert event into database
  const [event] = await db
    .insert(immutableEvents)
    .values({
      eventType: data.type,
      actorId: data.actorId || null,
      actorType: data.actorType,
      entityType: data.entityType,
      entityId: data.entityId.toString(),
      payload: data.payload,
      correlationId: data.correlationId || null,
      eventHash,
      previousHash,
      metadata: data.metadata || {},
    })
    .returning();

  console.log(`[ImmutableEvent] ${data.type} - ${eventHash.substring(0, 16)}...`);

  return {
    id: event.id,
    type: data.type,
    actorId: event.actorId || undefined,
    actorType: event.actorType as "USER" | "SYSTEM" | "ADMIN" | "API",
    entityType: event.entityType,
    entityId: event.entityId,
    payload: event.payload as Record<string, unknown>,
    correlationId: event.correlationId || undefined,
    metadata: event.metadata as Record<string, unknown> || undefined,
    eventHash: event.eventHash,
    previousHash: event.previousHash,
    timestamp: event.createdAt,
  };
}

/**
 * Retrieves an event by ID from database
 */
export async function getEventById(eventId: number): Promise<EventRecord | null> {
  const [event] = await db
    .select()
    .from(immutableEvents)
    .where(eq(immutableEvents.id, eventId));

  if (!event) return null;

  return {
    id: event.id,
    type: event.eventType as ImmutableEventType,
    actorId: event.actorId || undefined,
    actorType: event.actorType as "USER" | "SYSTEM" | "ADMIN" | "API",
    entityType: event.entityType,
    entityId: event.entityId,
    payload: event.payload as Record<string, unknown>,
    correlationId: event.correlationId || undefined,
    metadata: event.metadata as Record<string, unknown> || undefined,
    eventHash: event.eventHash,
    previousHash: event.previousHash,
    timestamp: event.createdAt,
  };
}

/**
 * Retrieves all events for a specific entity
 */
export async function getEventsByEntity(
  entityType: string,
  entityId: number | string
): Promise<EventRecord[]> {
  const events = await db
    .select()
    .from(immutableEvents)
    .where(
      and(
        eq(immutableEvents.entityType, entityType),
        eq(immutableEvents.entityId, entityId.toString())
      )
    )
    .orderBy(immutableEvents.createdAt);

  return events.map((event) => ({
    id: event.id,
    type: event.eventType as ImmutableEventType,
    actorId: event.actorId || undefined,
    actorType: event.actorType as "USER" | "SYSTEM" | "ADMIN" | "API",
    entityType: event.entityType,
    entityId: event.entityId,
    payload: event.payload as Record<string, unknown>,
    correlationId: event.correlationId || undefined,
    metadata: event.metadata as Record<string, unknown> || undefined,
    eventHash: event.eventHash,
    previousHash: event.previousHash,
    timestamp: event.createdAt,
  }));
}

/**
 * Retrieves all events with a specific correlation ID
 */
export async function getEventsByCorrelation(correlationId: string): Promise<EventRecord[]> {
  const events = await db
    .select()
    .from(immutableEvents)
    .where(eq(immutableEvents.correlationId, correlationId))
    .orderBy(immutableEvents.createdAt);

  return events.map((event) => ({
    id: event.id,
    type: event.eventType as ImmutableEventType,
    actorId: event.actorId || undefined,
    actorType: event.actorType as "USER" | "SYSTEM" | "ADMIN" | "API",
    entityType: event.entityType,
    entityId: event.entityId,
    payload: event.payload as Record<string, unknown>,
    correlationId: event.correlationId || undefined,
    metadata: event.metadata as Record<string, unknown> || undefined,
    eventHash: event.eventHash,
    previousHash: event.previousHash,
    timestamp: event.createdAt,
  }));
}

/**
 * Retrieves all events by event type
 */
export async function getEventsByType(eventType: ImmutableEventType): Promise<EventRecord[]> {
  const events = await db
    .select()
    .from(immutableEvents)
    .where(eq(immutableEvents.eventType, eventType))
    .orderBy(immutableEvents.createdAt);

  return events.map((event) => ({
    id: event.id,
    type: event.eventType as ImmutableEventType,
    actorId: event.actorId || undefined,
    actorType: event.actorType as "USER" | "SYSTEM" | "ADMIN" | "API",
    entityType: event.entityType,
    entityId: event.entityId,
    payload: event.payload as Record<string, unknown>,
    correlationId: event.correlationId || undefined,
    metadata: event.metadata as Record<string, unknown> || undefined,
    eventHash: event.eventHash,
    previousHash: event.previousHash,
    timestamp: event.createdAt,
  }));
}

/**
 * Retrieves the entire event chain from database
 */
export async function getEventChain(): Promise<EventRecord[]> {
  const events = await db
    .select()
    .from(immutableEvents)
    .orderBy(immutableEvents.id);

  return events.map((event) => ({
    id: event.id,
    type: event.eventType as ImmutableEventType,
    actorId: event.actorId || undefined,
    actorType: event.actorType as "USER" | "SYSTEM" | "ADMIN" | "API",
    entityType: event.entityType,
    entityId: event.entityId,
    payload: event.payload as Record<string, unknown>,
    correlationId: event.correlationId || undefined,
    metadata: event.metadata as Record<string, unknown> || undefined,
    eventHash: event.eventHash,
    previousHash: event.previousHash,
    timestamp: event.createdAt,
  }));
}

/**
 * Verifies the integrity of the entire event chain
 * Checks that each event's hash is valid and properly linked
 */
export async function verifyEventChain(): Promise<{ valid: boolean; brokenAt?: number; totalEvents: number }> {
  const events = await getEventChain();
  
  if (events.length === 0) {
    return { valid: true, totalEvents: 0 };
  }

  // Verify first event has GENESIS as previous hash
  if (events[0].previousHash !== "GENESIS") {
    return { valid: false, brokenAt: events[0].id, totalEvents: events.length };
  }

  // Verify each subsequent event
  for (let i = 1; i < events.length; i++) {
    const current = events[i];
    const previous = events[i - 1];

    // Verify hash chain linkage
    if (current.previousHash !== previous.eventHash) {
      return { valid: false, brokenAt: current.id, totalEvents: events.length };
    }

    // Verify hash integrity by recalculating
    const eventContent = JSON.stringify({
      type: current.type,
      actorId: current.actorId,
      actorType: current.actorType,
      entityType: current.entityType,
      entityId: current.entityId,
      payload: current.payload,
      correlationId: current.correlationId,
      timestamp: current.timestamp.toISOString(),
      previousHash: current.previousHash,
    });

    const expectedHash = crypto
      .createHash("sha256")
      .update(eventContent)
      .digest("hex");

    if (current.eventHash !== expectedHash) {
      return { valid: false, brokenAt: current.id, totalEvents: events.length };
    }
  }

  return { valid: true, totalEvents: events.length };
}

/**
 * Generates a hash for event content (utility function)
 */
export function generateEventHash(event: Omit<EventRecord, "id" | "eventHash" | "previousHash" | "timestamp">, previousHash: string): string {
  const eventContent = JSON.stringify({
    ...event,
    timestamp: new Date().toISOString(),
    previousHash,
  });

  return crypto
    .createHash("sha256")
    .update(eventContent)
    .digest("hex");
}

/**
 * Gets event statistics for monitoring
 */
export async function getEventStats(): Promise<{
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByActor: Record<string, number>;
  recentEvents: number;
}> {
  const allEvents = await getEventChain();
  
  const eventsByType: Record<string, number> = {};
  const eventsByActor: Record<string, number> = {};
  
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let recentEvents = 0;

  for (const event of allEvents) {
    // Count by type
    eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    
    // Count by actor type
    eventsByActor[event.actorType] = (eventsByActor[event.actorType] || 0) + 1;
    
    // Count recent events
    if (event.timestamp >= oneDayAgo) {
      recentEvents++;
    }
  }

  return {
    totalEvents: allEvents.length,
    eventsByType,
    eventsByActor,
    recentEvents,
  };
}
