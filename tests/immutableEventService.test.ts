import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../server/db';
import { immutableEvents } from '@shared/schema';
import { 
  createImmutableEvent, 
  getEventById,
  getEventsByEntity,
  verifyEventChain,
  getEventStats
} from '../server/services/immutableEventService';
import { eq } from 'drizzle-orm';

describe('ImmutableEventService', () => {
  beforeAll(async () => {
    // Clean up any existing events
    await db.delete(immutableEvents);
  });

  afterAll(async () => {
    // Clean up test events
    await db.delete(immutableEvents);
  });

  it('should create an immutable event with hash chain', async () => {
    const event = await createImmutableEvent({
      type: 'BOND_CREATED',
      actorId: 1,
      actorType: 'USER',
      entityType: 'BOND',
      entityId: '123',
      payload: {
        bondName: 'Test Bond',
        faceValue: 100000,
      },
    });

    expect(event).toBeDefined();
    expect(event.type).toBe('BOND_CREATED');
    expect(event.eventHash).toBeDefined();
    expect(event.previousHash).toBe('GENESIS');
    expect(event.payload.bondName).toBe('Test Bond');
  });

  it('should chain events correctly', async () => {
    const event1 = await createImmutableEvent({
      type: 'BOND_CREATED',
      actorType: 'USER',
      entityType: 'BOND',
      entityId: '456',
      payload: { test: 1 },
    });

    const event2 = await createImmutableEvent({
      type: 'BOND_PERFECTED',
      actorType: 'SYSTEM',
      entityType: 'BOND',
      entityId: '456',
      payload: { test: 2 },
    });

    expect(event2.previousHash).toBe(event1.eventHash);
  });

  it('should retrieve event by ID', async () => {
    const created = await createImmutableEvent({
      type: 'TRADE_CREATED',
      actorType: 'USER',
      entityType: 'TRADE',
      entityId: '789',
      payload: { amount: 50000 },
    });

    const retrieved = await getEventById(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(created.id);
    expect(retrieved?.type).toBe('TRADE_CREATED');
  });

  it('should retrieve events by entity', async () => {
    await createImmutableEvent({
      type: 'BOND_CREATED',
      actorType: 'USER',
      entityType: 'BOND',
      entityId: '999',
      payload: {},
    });

    await createImmutableEvent({
      type: 'BOND_PERFECTED',
      actorType: 'SYSTEM',
      entityType: 'BOND',
      entityId: '999',
      payload: {},
    });

    const events = await getEventsByEntity('BOND', '999');

    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0].entityId).toBe('999');
    expect(events[1].entityId).toBe('999');
  });

  it('should verify event chain integrity', async () => {
    // Create several events
    await createImmutableEvent({
      type: 'USER_REGISTERED',
      actorType: 'SYSTEM',
      entityType: 'USER',
      entityId: '1',
      payload: {},
    });

    await createImmutableEvent({
      type: 'USER_LOGIN',
      actorType: 'USER',
      entityType: 'USER',
      entityId: '1',
      payload: {},
    });

    const verification = await verifyEventChain();

    expect(verification.valid).toBe(true);
    expect(verification.totalEvents).toBeGreaterThan(0);
  });

  it('should get event statistics', async () => {
    const stats = await getEventStats();

    expect(stats.totalEvents).toBeGreaterThan(0);
    expect(stats.eventsByType).toBeDefined();
    expect(stats.eventsByActor).toBeDefined();
    expect(stats.recentEvents).toBeGreaterThanOrEqual(0);
  });
});
