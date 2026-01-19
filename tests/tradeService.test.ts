import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../server/db';
import { users, bonds, auctions, auctionBids, exchangeTrades } from '@shared/schema';
import { 
  createTradeFromAuction, 
  getTradeById, 
  updateTradeStatus,
  createSettlement 
} from '../server/services/tradeService';
import { eq } from 'drizzle-orm';

describe('TradeService', () => {
  let testUser: typeof users.$inferSelect;
  let testBond: typeof bonds.$inferSelect;
  let testAuction: typeof auctions.$inferSelect;
  let testBid: typeof auctionBids.$inferSelect;

  beforeAll(async () => {
    // Create test user
    const [user] = await db.insert(users).values({
      email: 'investor@test.com',
      password: 'hashed_password',
      name: 'Test Investor',
      role: 'investor',
    }).returning();
    testUser = user;

    // Create test bond
    const [bond] = await db.insert(bonds).values({
      ownerId: testUser.id,
      name: 'Test Bond',
      faceValue: '100000.00',
      currency: 'USD',
      status: 'active',
    }).returning();
    testBond = bond;
  });

  beforeEach(async () => {
    // Clean up previous test data
    await db.delete(exchangeTrades);
    await db.delete(auctionBids);
    await db.delete(auctions);
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(exchangeTrades);
    await db.delete(auctionBids);
    await db.delete(auctions);
    await db.delete(bonds).where(eq(bonds.id, testBond.id));
    await db.delete(users).where(eq(users.id, testUser.id));
  });

  it('should create a trade from a completed auction', async () => {
    // Create auction
    const [auction] = await db.insert(auctions).values({
      bondId: testBond.id,
      status: 'COMPLETED',
      startsAt: new Date(Date.now() - 86400000), // 1 day ago
      endsAt: new Date(Date.now() - 3600000), // 1 hour ago
      reservePrice: '80000.00',
    }).returning();
    testAuction = auction;

    // Create winning bid
    const [bid] = await db.insert(auctionBids).values({
      auctionId: auction.id,
      investorId: testUser.id,
      amount: '85000.00',
    }).returning();
    testBid = bid;

    // Update auction with winning bid
    await db.update(auctions)
      .set({ winningBidId: bid.id })
      .where(eq(auctions.id, auction.id));

    // Create trade
    const trade = await createTradeFromAuction(auction.id);

    expect(trade).toBeDefined();
    expect(trade?.bondId).toBe(testBond.id);
    expect(trade?.investorId).toBe(testUser.id);
    expect(trade?.amount).toBe('85000.00');
    expect(trade?.status).toBe('PENDING');
  });

  it('should retrieve a trade by ID', async () => {
    // Create auction and trade first
    const [auction] = await db.insert(auctions).values({
      bondId: testBond.id,
      status: 'COMPLETED',
      startsAt: new Date(Date.now() - 86400000),
      endsAt: new Date(Date.now() - 3600000),
      reservePrice: '80000.00',
    }).returning();

    const [bid] = await db.insert(auctionBids).values({
      auctionId: auction.id,
      investorId: testUser.id,
      amount: '85000.00',
    }).returning();

    await db.update(auctions)
      .set({ winningBidId: bid.id })
      .where(eq(auctions.id, auction.id));

    const createdTrade = await createTradeFromAuction(auction.id);
    expect(createdTrade).toBeDefined();

    // Retrieve trade
    const trade = await getTradeById(createdTrade!.id);

    expect(trade).toBeDefined();
    expect(trade?.id).toBe(createdTrade!.id);
    expect(trade?.amount).toBe('85000.00');
  });

  it('should update trade status', async () => {
    // Create auction and trade
    const [auction] = await db.insert(auctions).values({
      bondId: testBond.id,
      status: 'COMPLETED',
      startsAt: new Date(Date.now() - 86400000),
      endsAt: new Date(Date.now() - 3600000),
      reservePrice: '80000.00',
    }).returning();

    const [bid] = await db.insert(auctionBids).values({
      auctionId: auction.id,
      investorId: testUser.id,
      amount: '85000.00',
    }).returning();

    await db.update(auctions)
      .set({ winningBidId: bid.id })
      .where(eq(auctions.id, auction.id));

    const createdTrade = await createTradeFromAuction(auction.id);
    expect(createdTrade).toBeDefined();

    // Update status to PAID
    const updatedTrade = await updateTradeStatus(createdTrade!.id, 'PAID', {
      paymentIntentId: 'pi_test_123',
    });

    expect(updatedTrade).toBeDefined();
    expect(updatedTrade?.status).toBe('PAID');
    expect(updatedTrade?.stripePaymentIntentId).toBe('pi_test_123');
  });

  it('should not create trade without winning bid', async () => {
    // Create auction without winning bid
    const [auction] = await db.insert(auctions).values({
      bondId: testBond.id,
      status: 'ACTIVE',
      startsAt: new Date(Date.now() - 86400000),
      endsAt: new Date(Date.now() + 3600000), // Still active
      reservePrice: '80000.00',
    }).returning();

    const trade = await createTradeFromAuction(auction.id);

    expect(trade).toBeNull();
  });
});
